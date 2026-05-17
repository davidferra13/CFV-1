'use server'

import { createServerClient } from '@/lib/db/server'
import { requireClient } from '@/lib/auth/get-user'
import { getClientCannabisAccessStatus } from './client-portal-guards'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const InviteGuestSchema = z.object({
  eventId: z.string().uuid(),
  guestName: z.string().min(1).max(100),
  guestEmail: z.string().email(),
  personalNote: z.string().max(500).optional(),
})

export type GuestOnboardingStatus =
  | 'invite_sent'
  | 'opened'
  | 'started'
  | 'completed'
  | 'age_pending'
  | 'cleared'
  | 'needs_review'
  | 'blocked'
  | 'declined'

export async function getHostCannabisEventGuests(eventId: string) {
  const user = await requireClient()
  const accessStatus = await getClientCannabisAccessStatus(user.id)
  if (!accessStatus.canAccessPortal) throw new Error('Cannabis access required')

  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, client_id, tenant_id, cannabis_preference')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .eq('cannabis_preference', true)
    .single()

  if (!event) throw new Error('Cannabis event not found or access denied')

  const { data: guests } = await db
    .from('event_guests')
    .select('id, full_name, email, rsvp_status, guest_token, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  const guestTokens = (guests ?? []).map((g: any) => g.guest_token).filter(Boolean)
  let profiles: any[] = []

  if (guestTokens.length > 0) {
    const { data: profileRows } = await db
      .from('guest_event_profile')
      .select(
        'guest_token, attending_status, cannabis_participation, age_confirmed, final_confirmation'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', event.tenant_id)
      .in('guest_token', guestTokens)

    profiles = profileRows ?? []
  }

  const profileByToken = Object.fromEntries(profiles.map((p: any) => [p.guest_token, p]))

  return (guests ?? []).map((guest: any) => {
    const profile = profileByToken[guest.guest_token]
    let onboardingStatus: GuestOnboardingStatus = 'invite_sent'

    if (profile) {
      if (profile.final_confirmation && profile.age_confirmed) {
        onboardingStatus = 'cleared'
      } else if (profile.final_confirmation && !profile.age_confirmed) {
        onboardingStatus = 'age_pending'
      } else if (profile.cannabis_participation) {
        onboardingStatus = 'started'
      } else {
        onboardingStatus = 'opened'
      }
    }

    if (guest.rsvp_status === 'declined') {
      onboardingStatus = 'declined'
    }

    return {
      id: guest.id,
      fullName: guest.full_name,
      email: guest.email,
      rsvpStatus: guest.rsvp_status,
      onboardingStatus,
      hasProfile: !!profile,
      ageConfirmed: profile?.age_confirmed ?? false,
      cannabisParticipation: profile?.cannabis_participation ?? null,
    }
  })
}

export async function inviteGuestToCannabisEvent(input: z.infer<typeof InviteGuestSchema>) {
  const validated = InviteGuestSchema.parse(input)
  const user = await requireClient()
  const accessStatus = await getClientCannabisAccessStatus(user.id)
  if (!accessStatus.canAccessPortal) throw new Error('Cannabis access required')

  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, client_id, tenant_id, cannabis_preference')
    .eq('id', validated.eventId)
    .eq('client_id', user.entityId)
    .eq('cannabis_preference', true)
    .single()

  if (!event) throw new Error('Cannabis event not found or access denied')

  const { data: existing } = await db
    .from('event_guests')
    .select('id')
    .eq('event_id', validated.eventId)
    .ilike('email', validated.guestEmail)
    .maybeSingle()

  if (existing) throw new Error('Guest already invited to this event')

  const guestToken = randomBytes(16).toString('hex')

  const { error } = await db.from('event_guests').insert({
    event_id: validated.eventId,
    tenant_id: event.tenant_id,
    full_name: validated.guestName,
    email: validated.guestEmail.toLowerCase(),
    guest_token: guestToken,
    rsvp_status: 'pending',
    invited_by: 'host',
    notes: validated.personalNote ?? null,
  })

  if (error) throw new Error('Failed to invite guest: ' + error.message)

  // Send onboarding email (non-blocking)
  try {
    const { data: eventDetails } = await db
      .from('events')
      .select('occasion, event_date')
      .eq('id', validated.eventId)
      .single()

    const { data: chef } = await db
      .from('chefs')
      .select('business_name, display_name')
      .eq('id', event.tenant_id)
      .single()

    const chefName = chef?.business_name || chef?.display_name || 'Your Chef'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
    const intakeUrl = `${appUrl}/guest-feedback/${guestToken}`

    const { sendCannabisGuestOnboardingEmail } = await import('@/lib/email/notifications')
    await sendCannabisGuestOnboardingEmail({
      guestEmail: validated.guestEmail.toLowerCase(),
      guestName: validated.guestName,
      chefName,
      occasion: eventDetails?.occasion || 'Cannabis Dinner',
      eventDate: eventDetails?.event_date || '',
      intakeUrl,
    })
  } catch (err) {
    console.error('[inviteGuestToCannabisEvent] Email send failed (non-blocking):', err)
  }

  revalidatePath('/my-cannabis')
  return { success: true, guestToken }
}
