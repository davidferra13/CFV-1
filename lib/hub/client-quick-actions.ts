'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getCircleForContext, getCircleForEvent } from './circle-lookup'
import type { HubNotificationType } from './types'

// ---------------------------------------------------------------------------
// Client Quick Actions
// Structured input from clients in the Dinner Circle.
// Each action posts a notification card + optionally updates backend data.
// All actions are token-validated (no auth required).
// ---------------------------------------------------------------------------

// ─── Guest Count Update ──────────────────────────────────────────────────────

const GuestCountSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  eventId: z.string().uuid(),
  newCount: z.number().int().min(1).max(500),
  note: z.string().max(500).optional(),
})

export async function postGuestCountUpdate(
  input: z.infer<typeof GuestCountSchema>
): Promise<{ success: boolean }> {
  const validated = GuestCountSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership?.can_post) throw new Error('Not authorized to post')

  // Get current guest count for the notification card
  const { data: event } = await supabase
    .from('events')
    .select('guest_count')
    .eq('id', validated.eventId)
    .single()

  const previousCount = event?.guest_count ?? null

  // Post notification to circle
  let body = `Guest count updated to ${validated.newCount}.`
  if (validated.note) body += ` Note: ${validated.note}`

  await supabase.from('hub_messages').insert({
    group_id: validated.groupId,
    author_profile_id: profile.id,
    message_type: 'notification',
    notification_type: 'guest_count_updated' as HubNotificationType,
    body,
    source: 'circle',
    system_metadata: {
      event_id: validated.eventId,
      new_count: validated.newCount,
      previous_count: previousCount,
    },
  })

  // Trigger notification to chef (non-blocking)
  try {
    const { notifyCircleMembers } = await import('./circle-notification-actions')
    void notifyCircleMembers({
      groupId: validated.groupId,
      authorProfileId: profile.id,
      messageBody: body,
    })
  } catch {
    // Non-blocking
  }

  return { success: true }
}

// ─── Dietary Update ──────────────────────────────────────────────────────────

const DietaryUpdateSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  guestName: z.string().min(1).max(100),
  restrictions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  note: z.string().max(500).optional(),
})

export async function postDietaryUpdate(
  input: z.infer<typeof DietaryUpdateSchema>
): Promise<{ success: boolean }> {
  const validated = DietaryUpdateSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership?.can_post) throw new Error('Not authorized to post')

  // Build message body
  const parts: string[] = [`Dietary update for ${validated.guestName}.`]
  if (validated.restrictions.length > 0) {
    parts.push(`Restrictions: ${validated.restrictions.join(', ')}.`)
  }
  if (validated.allergies.length > 0) {
    parts.push(`Allergies: ${validated.allergies.join(', ')}.`)
  }
  if (validated.note) parts.push(validated.note)

  const body = parts.join(' ')

  await supabase.from('hub_messages').insert({
    group_id: validated.groupId,
    author_profile_id: profile.id,
    message_type: 'notification',
    notification_type: 'dietary_updated' as HubNotificationType,
    body,
    source: 'circle',
    system_metadata: {
      guest_name: validated.guestName,
      restrictions: validated.restrictions,
      allergies: validated.allergies,
    },
  })

  // Notify chef (non-blocking)
  try {
    const { notifyCircleMembers } = await import('./circle-notification-actions')
    void notifyCircleMembers({
      groupId: validated.groupId,
      authorProfileId: profile.id,
      messageBody: body,
    })
  } catch {
    // Non-blocking
  }

  return { success: true }
}

// ─── Running Late ────────────────────────────────────────────────────────────

const RunningLateSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  etaMinutes: z.number().int().min(1).max(180),
  message: z.string().max(500).optional(),
})

export async function postRunningLate(
  input: z.infer<typeof RunningLateSchema>
): Promise<{ success: boolean }> {
  const validated = RunningLateSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership?.can_post) throw new Error('Not authorized to post')

  const body = validated.message
    ? validated.message
    : `Running about ${validated.etaMinutes} minutes late. Sorry for the delay!`

  await supabase.from('hub_messages').insert({
    group_id: validated.groupId,
    author_profile_id: profile.id,
    message_type: 'notification',
    notification_type: 'running_late' as HubNotificationType,
    body,
    source: 'circle',
    system_metadata: {
      eta_minutes: validated.etaMinutes,
      sender_name: profile.display_name,
    },
  })

  // Running late bypasses quiet hours (urgent)
  try {
    const { notifyCircleMembers } = await import('./circle-notification-actions')
    void notifyCircleMembers({
      groupId: validated.groupId,
      authorProfileId: profile.id,
      messageBody: body,
    })
  } catch {
    // Non-blocking
  }

  return { success: true }
}

// ─── Repeat Booking Request ──────────────────────────────────────────────────

const RepeatBookingSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  preferredDate: z.string().optional(),
  sameMenu: z.boolean().default(false),
  guestCount: z.number().int().min(1).max(500).optional(),
  note: z.string().max(1000).optional(),
})

export async function postRepeatBookingRequest(
  input: z.infer<typeof RepeatBookingSchema>
): Promise<{ success: boolean }> {
  const validated = RepeatBookingSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership?.can_post) throw new Error('Not authorized to post')

  const parts: string[] = [`${profile.display_name} would like to book again!`]
  if (validated.preferredDate) parts.push(`Preferred date: ${validated.preferredDate}.`)
  if (validated.guestCount) parts.push(`${validated.guestCount} guests.`)
  if (validated.sameMenu) parts.push('Same menu as last time.')
  if (validated.note) parts.push(validated.note)

  const body = parts.join(' ')

  await supabase.from('hub_messages').insert({
    group_id: validated.groupId,
    author_profile_id: profile.id,
    message_type: 'notification',
    notification_type: 'repeat_booking_request' as HubNotificationType,
    body,
    source: 'circle',
    system_metadata: {
      preferred_date: validated.preferredDate ?? null,
      same_menu: validated.sameMenu,
      guest_count: validated.guestCount ?? null,
    },
  })

  // Notify chef (non-blocking)
  try {
    const { notifyCircleMembers } = await import('./circle-notification-actions')
    void notifyCircleMembers({
      groupId: validated.groupId,
      authorProfileId: profile.id,
      messageBody: body,
    })
  } catch {
    // Non-blocking
  }

  return { success: true }
}
