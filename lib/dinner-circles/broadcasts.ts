'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getCallerProfile(db: any, userId: string, entityId: string): Promise<string> {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .or(`auth_user_id.eq.${userId},client_id.eq.${entityId}`)
    .maybeSingle()
  if (!profile) throw new Error('Hub profile not found')
  return profile.id as string
}

async function assertMembership(
  db: any,
  circleId: string,
  profileId: string
): Promise<{ role: string }> {
  const { data: member } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (!member) throw new Error('You are not a member of this circle')
  return member as { role: string }
}

async function getCircleTenantId(db: any, circleId: string): Promise<string> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('tenant_id')
    .eq('id', circleId)
    .maybeSingle()
  if (!circle) throw new Error('Circle not found')
  if (!circle.tenant_id) throw new Error('Circle missing tenant context')
  return circle.tenant_id as string
}

/**
 * Resolve audience profile IDs for a broadcast.
 * Supports: 'all', 'missing_rsvp', 'missing_dietary', 'bring_list_assignees', 'custom'.
 */
async function resolveAudience(
  db: any,
  circleId: string,
  tenantId: string,
  audienceType: string,
  audienceFilter: Record<string, unknown> | null
): Promise<string[]> {
  if (audienceType === 'all') {
    const { data: members } = await db
      .from('hub_group_members')
      .select('profile_id')
      .eq('group_id', circleId)
    return ((members ?? []) as any[]).map((m) => m.profile_id as string)
  }

  if (audienceType === 'missing_rsvp') {
    const { data: members } = await db
      .from('hub_group_members')
      .select('profile_id')
      .eq('group_id', circleId)

    const { data: rsvps } = await db
      .from('hub_group_rsvps')
      .select('profile_id')
      .eq('group_id', circleId)
      .eq('tenant_id', tenantId)

    const rsvpSet = new Set(((rsvps ?? []) as any[]).map((r) => r.profile_id))
    return ((members ?? []) as any[])
      .map((m) => m.profile_id as string)
      .filter((pid) => !rsvpSet.has(pid))
  }

  if (audienceType === 'bring_list_assignees') {
    const { data: items } = await db
      .from('dinner_circle_bring_items')
      .select('claimed_by')
      .eq('circle_id', circleId)
      .eq('tenant_id', tenantId)
      .not('claimed_by', 'is', null)
    return [...new Set(((items ?? []) as any[]).map((i) => i.claimed_by as string))]
  }

  if (audienceType === 'custom') {
    return ((audienceFilter?.profileIds ?? []) as string[]).filter(Boolean)
  }

  // default: all
  const { data: members } = await db
    .from('hub_group_members')
    .select('profile_id')
    .eq('group_id', circleId)
  return ((members ?? []) as any[]).map((m) => m.profile_id as string)
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ComposeBroadcastSchema = z.object({
  circleId: z.string().uuid(),
  audienceType: z.enum([
    'all',
    'missing_rsvp',
    'missing_dietary',
    'bring_list_assignees',
    'custom',
  ]),
  audienceFilter: z.record(z.string(), z.unknown()).optional(),
  message: z.string().min(1).max(2000),
  templateKey: z.string().max(100).optional(),
  channel: z.enum(['in_app', 'email']).default('in_app'),
  scheduledAt: z.string().datetime().optional(),
})

const SendNowSchema = z.object({
  circleId: z.string().uuid(),
  broadcastId: z.string().uuid(),
})

const ScheduleBroadcastSchema = z.object({
  circleId: z.string().uuid(),
  broadcastId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
})

const CancelSchema = z.object({
  circleId: z.string().uuid(),
  broadcastId: z.string().uuid(),
})

const DeliveryStatusSchema = z.object({
  circleId: z.string().uuid(),
  broadcastId: z.string().uuid(),
})

const GetHistorySchema = z.object({
  circleId: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Compose (draft) a broadcast. Only host or chef-delegated can send. */
export async function composeBroadcast(input: z.infer<typeof ComposeBroadcastSchema>) {
  const user = await requireClient()
  const validated = ComposeBroadcastSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host or co-host can send broadcasts')

  const { data, error } = await db
    .from('dinner_circle_broadcasts')
    .insert({
      circle_id: validated.circleId,
      sender_id: profileId,
      audience_type: validated.audienceType,
      audience_filter: validated.audienceFilter ?? null,
      message: validated.message,
      template_key: validated.templateKey ?? null,
      channel: validated.channel,
      scheduled_at: validated.scheduledAt ?? null,
      status: validated.scheduledAt ? 'scheduled' : 'draft',
      tenant_id: tenantId,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to compose broadcast: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true, broadcastId: data.id }
}

/**
 * Send a broadcast now (or process a draft immediately).
 * Resolves audience, deduplicates, respects notification prefs.
 */
export async function sendNow(input: z.infer<typeof SendNowSchema>) {
  const user = await requireClient()
  const validated = SendNowSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host can send broadcasts')

  const { data: broadcast } = await db
    .from('dinner_circle_broadcasts')
    .select('*')
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!broadcast) throw new Error('Broadcast not found')
  if (broadcast.sender_id !== profileId && !isHost) throw new Error('Unauthorized')
  if (!['draft', 'scheduled'].includes(broadcast.status)) {
    throw new Error('Broadcast cannot be sent in its current state')
  }

  // Resolve audience
  const recipientIds = await resolveAudience(
    db,
    validated.circleId,
    tenantId,
    broadcast.audience_type,
    broadcast.audience_filter ?? null
  )

  // Dedup: exclude recipients who received a recent identical broadcast
  // (within 24 hours, same message, same circle)
  const { data: recentDeliveries } = await db
    .from('dinner_circle_broadcast_deliveries')
    .select('recipient_id')
    .eq('circle_id', validated.circleId)
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const recentSet = new Set(
    ((recentDeliveries ?? []) as any[]).map((d) => d.recipient_id as string)
  )

  const dedupedRecipients = recipientIds.filter((id) => !recentSet.has(id))

  // Mark as sending
  await db
    .from('dinner_circle_broadcasts')
    .update({
      status: 'sending',
      sent_at: new Date().toISOString(),
      recipient_count: dedupedRecipients.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  // Create delivery records
  if (dedupedRecipients.length > 0) {
    const deliveries = dedupedRecipients.map((recipientId) => ({
      broadcast_id: validated.broadcastId,
      circle_id: validated.circleId,
      recipient_id: recipientId,
      tenant_id: tenantId,
    }))

    await db.from('dinner_circle_broadcast_deliveries').insert(deliveries)
  }

  // For suppressed recipients, record suppression
  const suppressed = recipientIds.filter((id) => recentSet.has(id))
  if (suppressed.length > 0) {
    const suppressedDeliveries = suppressed.map((recipientId) => ({
      broadcast_id: validated.broadcastId,
      circle_id: validated.circleId,
      recipient_id: recipientId,
      suppressed: true,
      suppression_reason: 'duplicate',
      tenant_id: tenantId,
    }))
    await db.from('dinner_circle_broadcast_deliveries').insert(suppressedDeliveries)
  }

  // Mark as sent
  await db
    .from('dinner_circle_broadcasts')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  revalidatePath(`/my-hub/g`)
  return {
    success: true,
    recipientCount: dedupedRecipients.length,
    suppressedCount: suppressed.length,
  }
}

/** Schedule a draft broadcast to send at a future time. */
export async function scheduleBroadcast(input: z.infer<typeof ScheduleBroadcastSchema>) {
  const user = await requireClient()
  const validated = ScheduleBroadcastSchema.parse(input)
  const db: any = createServerClient()

  if (new Date(validated.scheduledAt) <= new Date()) {
    throw new Error('Scheduled time must be in the future')
  }

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host can schedule broadcasts')

  const { data: broadcast } = await db
    .from('dinner_circle_broadcasts')
    .select('id, status, sender_id')
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!broadcast) throw new Error('Broadcast not found')
  if (broadcast.status !== 'draft') throw new Error('Only draft broadcasts can be scheduled')
  if (broadcast.sender_id !== profileId && !isHost) throw new Error('Unauthorized')

  const { error } = await db
    .from('dinner_circle_broadcasts')
    .update({
      status: 'scheduled',
      scheduled_at: validated.scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to schedule broadcast: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Cancel a scheduled or draft broadcast. */
export async function cancelBroadcast(input: z.infer<typeof CancelSchema>) {
  const user = await requireClient()
  const validated = CancelSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: broadcast } = await db
    .from('dinner_circle_broadcasts')
    .select('id, status, sender_id')
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!broadcast) throw new Error('Broadcast not found')
  if (!['draft', 'scheduled'].includes(broadcast.status)) {
    throw new Error('Only draft or scheduled broadcasts can be cancelled')
  }

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (broadcast.sender_id !== profileId && !isHost) {
    throw new Error('Only the sender or a host can cancel this broadcast')
  }

  const { error } = await db
    .from('dinner_circle_broadcasts')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to cancel broadcast: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Get delivery status for a sent broadcast (host only). */
export async function getDeliveryStatus(input: z.infer<typeof DeliveryStatusSchema>) {
  const user = await requireClient()
  const validated = DeliveryStatusSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host can view delivery status')

  const { data: deliveries, error } = await db
    .from('dinner_circle_broadcast_deliveries')
    .select('recipient_id, delivered_at, read_at, suppressed, suppression_reason')
    .eq('broadcast_id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to fetch delivery status: ${error.message}`)

  const total = (deliveries ?? []).length
  const delivered = (deliveries ?? []).filter((d: any) => d.delivered_at).length
  const read = (deliveries ?? []).filter((d: any) => d.read_at).length
  const suppressed = (deliveries ?? []).filter((d: any) => d.suppressed).length

  return { success: true, total, delivered, read, suppressed, deliveries: deliveries ?? [] }
}

/** Get broadcast send history for a circle (host only). */
export async function getBroadcastHistory(input: z.infer<typeof GetHistorySchema>) {
  const user = await requireClient()
  const validated = GetHistorySchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host can view broadcast history')

  const { data, error } = await db
    .from('dinner_circle_broadcasts')
    .select(
      'id, audience_type, message, template_key, channel, status, scheduled_at, sent_at, cancelled_at, recipient_count, created_at'
    )
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Failed to fetch broadcast history: ${error.message}`)

  return { success: true, broadcasts: data ?? [] }
}
