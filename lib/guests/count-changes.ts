'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'
import { getServiceConfigForTenant } from '@/lib/chef/service-config-internal'
import { createChefNotification } from '@/lib/notifications/chef-actions'
import { createClientNotification } from '@/lib/notifications/client-actions'
import {
  clientGetOrCreateConversation,
  getOrCreateConversation,
  sendChatMessage,
} from '@/lib/chat/actions'
import {
  calculateGuestCountPricing,
  evaluateGuestCountChangePolicy,
  hasMaterialGuestCountDrift,
} from './count-change-logic'

const CHANGE_STATUSES = ['pending', 'approved', 'rejected'] as const

export type GuestCountChangeStatus = (typeof CHANGE_STATUSES)[number]

export type GuestCountChange = {
  id: string
  event_id: string
  tenant_id: string
  previous_count: number
  new_count: number
  requested_by: string
  requested_by_role: 'chef' | 'client'
  status: GuestCountChangeStatus
  price_impact_cents: number | null
  surcharge_applied: boolean
  surcharge_cents: number
  acknowledged_by_client: boolean
  acknowledged_at: string | null
  applied: boolean
  applied_at: string | null
  notes: string | null
  review_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export type GuestCountChangePricing = {
  priceImpactCents: number
  surchargeApplied: boolean
  surchargeCents: number
  totalDeltaCents: number
  protectedByCustomTotal: boolean
}

export type GuestCountChangePolicy = {
  canRequest: boolean
  hasDeadline: boolean
  deadlineDays: number | null
  cutoffAt: string | null
  summary: string
  reason: string | null
}

export type ClientGuestCountChangeCenter = {
  policy: GuestCountChangePolicy
  pendingRequest: GuestCountChange | null
  history: GuestCountChange[]
}

type GuestCountEventRecord = {
  id: string
  tenant_id: string
  client_id: string | null
  inquiry_id: string | null
  status: string
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  guest_count_confirmed: boolean | null
  quoted_price_cents: number | null
  pricing_model: string | null
  override_kind: string | null
  price_per_person_cents: number | null
}

const ChefGuestCountChangeSchema = z.object({
  eventId: z.string().uuid(),
  newCount: z.number().int().min(1).max(500),
  notes: z.string().max(500).optional(),
})

const ClientGuestCountChangeSchema = z.object({
  eventId: z.string().uuid(),
  newCount: z.number().int().min(1).max(500),
  notes: z.string().max(500).optional(),
})

const ReviewGuestCountChangeSchema = z.object({
  changeId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().max(500).optional(),
})

function normalizeChangeStatus(row: Record<string, any>): GuestCountChangeStatus {
  if (CHANGE_STATUSES.includes(row.status as GuestCountChangeStatus)) {
    return row.status as GuestCountChangeStatus
  }

  return row.applied ? 'approved' : 'pending'
}

function mapGuestCountChangeRow(row: Record<string, any>): GuestCountChange {
  return {
    id: String(row.id),
    event_id: String(row.event_id),
    tenant_id: String(row.tenant_id),
    previous_count: Number(row.previous_count ?? 0),
    new_count: Number(row.new_count ?? 0),
    requested_by: String(row.requested_by),
    requested_by_role:
      row.requested_by_role === 'chef'
        ? 'chef'
        : ('client' as GuestCountChange['requested_by_role']),
    status: normalizeChangeStatus(row),
    price_impact_cents:
      typeof row.price_impact_cents === 'number'
        ? row.price_impact_cents
        : row.price_impact_cents == null
          ? null
          : Number(row.price_impact_cents),
    surcharge_applied: Boolean(row.surcharge_applied),
    surcharge_cents:
      typeof row.surcharge_cents === 'number'
        ? row.surcharge_cents
        : row.surcharge_cents == null
          ? 0
          : Number(row.surcharge_cents),
    acknowledged_by_client: Boolean(row.acknowledged_by_client),
    acknowledged_at: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : null,
    applied: Boolean(row.applied),
    applied_at: typeof row.applied_at === 'string' ? row.applied_at : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    review_notes: typeof row.review_notes === 'string' ? row.review_notes : null,
    reviewed_by: typeof row.reviewed_by === 'string' ? row.reviewed_by : null,
    reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    created_at: String(row.created_at),
  }
}

function formatGuestCountDelta(previousCount: number, newCount: number): string {
  return `${previousCount} -> ${newCount} guests`
}

function formatPriceDelta(pricing: GuestCountChangePricing): string {
  if (pricing.protectedByCustomTotal) {
    return 'Price remains unchanged because this booking uses a custom total.'
  }

  if (pricing.totalDeltaCents === 0) {
    return 'No automatic price change is expected from this update.'
  }

  const direction = pricing.totalDeltaCents > 0 ? '+' : '-'
  const total = `$${(Math.abs(pricing.totalDeltaCents) / 100).toFixed(2)}`
  return `Estimated price change: ${direction}${total}.`
}

function buildClientRequestChatBody(params: {
  occasion: string | null
  previousCount: number
  newCount: number
  pricing: GuestCountChangePricing
  notes?: string | null
}): string {
  const lines = [
    `Booking change request for "${params.occasion || 'event'}".`,
    `Guest count: ${formatGuestCountDelta(params.previousCount, params.newCount)}.`,
    formatPriceDelta(params.pricing),
  ]

  if (params.notes) {
    lines.push(`Client note: ${params.notes}`)
  }

  return lines.join('\n')
}

function buildChefDecisionChatBody(params: {
  occasion: string | null
  previousCount: number
  newCount: number
  decision: 'approved' | 'rejected'
  pricing: GuestCountChangePricing
  reviewNotes?: string | null
}): string {
  const lines = [
    `Guest count change ${params.decision} for "${params.occasion || 'event'}".`,
    `Requested change: ${formatGuestCountDelta(params.previousCount, params.newCount)}.`,
  ]

  if (params.decision === 'approved') {
    lines.push(formatPriceDelta(params.pricing))
  }

  if (params.reviewNotes) {
    lines.push(`Chef note: ${params.reviewNotes}`)
  }

  return lines.join('\n')
}

function buildApprovedEventUpdate(
  event: GuestCountEventRecord,
  nextCount: number,
  pricing: GuestCountChangePricing,
  previousCount: number
) {
  const update: Record<string, unknown> = {
    guest_count: nextCount,
    guest_count_confirmed: true,
  }

  if (
    !pricing.protectedByCustomTotal &&
    event.pricing_model === 'per_person' &&
    pricing.totalDeltaCents !== 0
  ) {
    update.quoted_price_cents = Math.max(
      0,
      (event.quoted_price_cents ?? 0) + pricing.totalDeltaCents
    )
  }

  if (hasMaterialGuestCountDrift(previousCount, nextCount)) {
    update.scope_drift_acknowledged = false
    update.scope_drift_acknowledged_at = null
  }

  return update
}

async function syncInquiryGuestCount(db: any, event: GuestCountEventRecord, newCount: number) {
  if (!event.inquiry_id) return

  await db.from('inquiries').update({ confirmed_guest_count: newCount }).eq('id', event.inquiry_id)
}

function revalidateGuestCountPaths(eventId: string, tenantId: string) {
  revalidatePath('/my-events')
  revalidatePath('/my-bookings')
  revalidatePath('/my-chat')
  revalidatePath(`/my-events/${eventId}`)
  revalidatePath('/dashboard')
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  invalidateRemyContextCache(tenantId)

  // Bust DB-cached grocery price quotes so they regenerate with new guest count
  try {
    const db: any = createServerClient()
    db.from('grocery_price_quotes')
      .delete()
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('status', 'complete')
      .then(() => {})
      .catch((err: any) =>
        console.error('[guest-count] grocery cache bust failed (non-blocking):', err)
      )
  } catch {
    // non-blocking
  }
}

async function getEventForClientMutation(
  eventId: string,
  clientId: string
): Promise<GuestCountEventRecord | null> {
  const db: any = createServerClient()

  const { data } = await db
    .from('events')
    .select(
      'id, tenant_id, client_id, inquiry_id, status, occasion, event_date, guest_count, guest_count_confirmed, quoted_price_cents, pricing_model, override_kind, price_per_person_cents'
    )
    .eq('id', eventId)
    .eq('client_id', clientId)
    .single()

  return (data as GuestCountEventRecord | null) ?? null
}

async function getEventForChefMutation(
  eventId: string,
  tenantId: string
): Promise<GuestCountEventRecord | null> {
  const db: any = createServerClient()

  const { data } = await db
    .from('events')
    .select(
      'id, tenant_id, client_id, inquiry_id, status, occasion, event_date, guest_count, guest_count_confirmed, quoted_price_cents, pricing_model, override_kind, price_per_person_cents'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  return (data as GuestCountEventRecord | null) ?? null
}

async function getPendingGuestCountChangeForEvent(
  eventId: string
): Promise<GuestCountChange | null> {
  const db: any = createServerClient()
  const { data } = await db
    .from('guest_count_changes')
    .select('*')
    .eq('event_id', eventId)
    .eq('requested_by_role', 'client')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  const row = Array.isArray(data) ? data[0] : null
  return row ? mapGuestCountChangeRow(row) : null
}

export async function getLatestPendingClientGuestCountChangeMap(
  eventIds: string[]
): Promise<Map<string, GuestCountChange>> {
  if (eventIds.length === 0) return new Map()

  const db: any = createServerClient()
  const { data, error } = await db
    .from('guest_count_changes')
    .select('*')
    .in('event_id', eventIds)
    .eq('requested_by_role', 'client')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[guest-count] Failed to load pending change map:', error.message)
    return new Map()
  }

  const map = new Map<string, GuestCountChange>()
  for (const row of data ?? []) {
    const eventId = String(row.event_id)
    if (!map.has(eventId)) {
      map.set(eventId, mapGuestCountChangeRow(row))
    }
  }
  return map
}

async function loadGuestCountHistory(
  eventId: string,
  tenantId: string
): Promise<GuestCountChange[]> {
  const db: any = createServerClient()

  const { data, error } = await db
    .from('guest_count_changes')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[guest-count] Failed to load history:', error.message)
    return []
  }

  return (data ?? []).map((row: any) => mapGuestCountChangeRow(row))
}

export async function requestGuestCountChange(
  input: z.infer<typeof ChefGuestCountChangeSchema>
): Promise<{ success: boolean; changeId?: string; priceImpact?: number; error?: string }> {
  const user = await requireChef()
  const parsed = ChefGuestCountChangeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const event = await getEventForChefMutation(parsed.data.eventId, user.entityId!)
  if (!event) return { success: false, error: 'Event not found.' }

  const previousCount = event.guest_count ?? 0
  const newCount = parsed.data.newCount

  if (previousCount === newCount) {
    return { success: false, error: 'Guest count is already set to this number.' }
  }

  const pricing = calculateGuestCountPricing({
    previousCount,
    newCount,
    eventDate: event.event_date,
    quotedPriceCents: event.quoted_price_cents,
    pricingModel: event.pricing_model,
    overrideKind: event.override_kind,
    pricePerPersonCents: event.price_per_person_cents,
  })

  const db: any = createServerClient()
  const now = new Date().toISOString()

  const { data: change, error: insertError } = await db
    .from('guest_count_changes')
    .insert({
      event_id: parsed.data.eventId,
      tenant_id: user.entityId,
      previous_count: previousCount,
      new_count: newCount,
      requested_by: user.id,
      requested_by_role: 'chef',
      status: 'approved',
      price_impact_cents: pricing.priceImpactCents,
      surcharge_applied: pricing.surchargeApplied,
      surcharge_cents: pricing.surchargeCents,
      notes: parsed.data.notes ?? null,
      reviewed_by: user.id,
      reviewed_at: now,
      applied: true,
      applied_at: now,
    })
    .select('id')
    .single()

  if (insertError || !change) {
    console.error('[guest-count] Insert failed:', insertError?.message)
    return { success: false, error: 'Failed to record change.' }
  }

  const { error: eventUpdateError } = await db
    .from('events')
    .update(buildApprovedEventUpdate(event, newCount, pricing, previousCount))
    .eq('id', parsed.data.eventId)
    .eq('tenant_id', user.entityId)

  if (eventUpdateError) {
    console.error('[guest-count] Event update failed:', eventUpdateError.message)
    return { success: false, error: 'Failed to update event guest count.' }
  }

  await syncInquiryGuestCount(db, event, newCount).catch((error: unknown) => {
    console.error('[guest-count] Inquiry sync failed (non-blocking):', error)
  })

  if (event.client_id) {
    void createClientNotification({
      tenantId: user.entityId!,
      clientId: event.client_id,
      category: 'event',
      action: 'guest_count_changed',
      title: 'Guest count updated',
      body: `Your chef updated the guest count to ${newCount}.`,
      actionUrl: `/my-events/${parsed.data.eventId}#booking-change-center`,
      eventId: parsed.data.eventId,
      metadata: {
        previous_count: previousCount,
        new_count: newCount,
        total_delta_cents: pricing.totalDeltaCents,
      },
    })
  }

  revalidateGuestCountPaths(parsed.data.eventId, user.entityId!)
  return { success: true, changeId: change.id, priceImpact: pricing.priceImpactCents }
}

export async function requestClientGuestCountChange(
  input: z.infer<typeof ClientGuestCountChangeSchema>
): Promise<{ success: boolean; changeId?: string; error?: string }> {
  const user = await requireClient()
  const parsed = ClientGuestCountChangeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const event = await getEventForClientMutation(parsed.data.eventId, user.entityId!)
  if (!event) return { success: false, error: 'Event not found.' }

  const previousCount = event.guest_count ?? 0
  const newCount = parsed.data.newCount

  if (previousCount === newCount) {
    return { success: false, error: 'Guest count is already set to this number.' }
  }

  const pendingRequest = await getPendingGuestCountChangeForEvent(event.id)
  const serviceConfig = await getServiceConfigForTenant(event.tenant_id)
  const policy = evaluateGuestCountChangePolicy({
    eventStatus: event.status,
    eventDate: event.event_date,
    hasDeadline: Boolean(serviceConfig.has_guest_count_deadline),
    deadlineDays: serviceConfig.guest_count_deadline_days,
    hasPendingRequest: Boolean(pendingRequest),
  })

  if (!policy.canRequest) {
    return { success: false, error: policy.reason ?? 'Guest-count changes are unavailable.' }
  }

  const pricing = calculateGuestCountPricing({
    previousCount,
    newCount,
    eventDate: event.event_date,
    quotedPriceCents: event.quoted_price_cents,
    pricingModel: event.pricing_model,
    overrideKind: event.override_kind,
    pricePerPersonCents: event.price_per_person_cents,
  })

  const db = createServerClient({ admin: true })
  const { data: change, error: insertError } = await db
    .from('guest_count_changes')
    .insert({
      event_id: parsed.data.eventId,
      tenant_id: event.tenant_id,
      previous_count: previousCount,
      new_count: newCount,
      requested_by: user.id,
      requested_by_role: 'client',
      status: 'pending',
      price_impact_cents: pricing.priceImpactCents,
      surcharge_applied: pricing.surchargeApplied,
      surcharge_cents: pricing.surchargeCents,
      notes: parsed.data.notes ?? null,
      applied: false,
    })
    .select('id')
    .single()

  if (insertError || !change) {
    console.error('[guest-count] Client request insert failed:', insertError?.message)
    return { success: false, error: 'Failed to submit guest-count request.' }
  }

  try {
    const conversationResult = await clientGetOrCreateConversation({
      context_type: 'event',
      event_id: parsed.data.eventId,
    })
    await sendChatMessage({
      conversation_id: conversationResult.conversation.id,
      message_type: 'text',
      body: buildClientRequestChatBody({
        occasion: event.occasion,
        previousCount,
        newCount,
        pricing,
        notes: parsed.data.notes ?? null,
      }),
    })
  } catch (error) {
    console.error('[guest-count] Client request chat failed (non-blocking):', error)
  }

  void createChefNotification({
    tenantId: event.tenant_id,
    category: 'event',
    action: 'guest_count_changed',
    title: 'Guest count change requested',
    body: `A client requested ${formatGuestCountDelta(previousCount, newCount)}.`,
    actionUrl: `/events/${parsed.data.eventId}?tab=money`,
    eventId: parsed.data.eventId,
    metadata: {
      previous_count: previousCount,
      new_count: newCount,
      total_delta_cents: pricing.totalDeltaCents,
      request_id: change.id,
    },
  })

  revalidateGuestCountPaths(parsed.data.eventId, event.tenant_id)
  return { success: true, changeId: change.id }
}

export async function reviewGuestCountChange(
  input: z.infer<typeof ReviewGuestCountChangeSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = ReviewGuestCountChangeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input.' }

  const db: any = createServerClient()
  const { data: row, error: loadError } = await db
    .from('guest_count_changes')
    .select('*')
    .eq('id', parsed.data.changeId)
    .eq('tenant_id', user.entityId)
    .single()

  if (loadError || !row) {
    console.error('[guest-count] Review load failed:', loadError?.message)
    return { success: false, error: 'Guest-count request not found.' }
  }

  const change = mapGuestCountChangeRow(row)

  if (change.requested_by_role !== 'client') {
    return { success: false, error: 'Only client requests can be reviewed here.' }
  }

  if (change.status !== 'pending') {
    return { success: false, error: 'This guest-count request has already been reviewed.' }
  }

  const event = await getEventForChefMutation(change.event_id, user.entityId!)
  if (!event) {
    return { success: false, error: 'Event not found.' }
  }

  if ((event.guest_count ?? 0) !== change.previous_count) {
    return {
      success: false,
      error:
        'The event guest count changed after this request was submitted. Ask the client to resubmit.',
    }
  }

  const pricing = calculateGuestCountPricing({
    previousCount: change.previous_count,
    newCount: change.new_count,
    eventDate: event.event_date,
    quotedPriceCents: event.quoted_price_cents,
    pricingModel: event.pricing_model,
    overrideKind: event.override_kind,
    pricePerPersonCents: event.price_per_person_cents,
  })

  const now = new Date().toISOString()
  const reviewNotes = parsed.data.reviewNotes?.trim() || null

  if (parsed.data.decision === 'approved') {
    const { error: changeUpdateError } = await db
      .from('guest_count_changes')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: now,
        review_notes: reviewNotes,
        price_impact_cents: pricing.priceImpactCents,
        surcharge_applied: pricing.surchargeApplied,
        surcharge_cents: pricing.surchargeCents,
        applied: true,
        applied_at: now,
      })
      .eq('id', change.id)
      .eq('tenant_id', user.entityId)

    if (changeUpdateError) {
      console.error('[guest-count] Review approve update failed:', changeUpdateError.message)
      return { success: false, error: 'Failed to approve the guest-count request.' }
    }

    const { error: eventUpdateError } = await db
      .from('events')
      .update(buildApprovedEventUpdate(event, change.new_count, pricing, change.previous_count))
      .eq('id', change.event_id)
      .eq('tenant_id', user.entityId)

    if (eventUpdateError) {
      console.error('[guest-count] Review approve event update failed:', eventUpdateError.message)
      return { success: false, error: 'Failed to apply the guest-count change.' }
    }

    await syncInquiryGuestCount(db, event, change.new_count).catch((error: unknown) => {
      console.error('[guest-count] Inquiry sync failed after approval (non-blocking):', error)
    })
  } else {
    const { error: rejectError } = await db
      .from('guest_count_changes')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: now,
        review_notes: reviewNotes,
        applied: false,
        applied_at: null,
      })
      .eq('id', change.id)
      .eq('tenant_id', user.entityId)

    if (rejectError) {
      console.error('[guest-count] Review reject update failed:', rejectError.message)
      return { success: false, error: 'Failed to reject the guest-count request.' }
    }
  }

  if (event.client_id) {
    try {
      const conversation = await getOrCreateConversation({
        client_id: event.client_id,
        context_type: 'event',
        event_id: event.id,
      })
      await sendChatMessage({
        conversation_id: conversation.conversation.id,
        message_type: 'text',
        body: buildChefDecisionChatBody({
          occasion: event.occasion,
          previousCount: change.previous_count,
          newCount: change.new_count,
          decision: parsed.data.decision,
          pricing,
          reviewNotes,
        }),
      })
    } catch (error) {
      console.error('[guest-count] Chef review chat failed (non-blocking):', error)
    }

    void createClientNotification({
      tenantId: event.tenant_id,
      clientId: event.client_id,
      category: 'event',
      action: 'guest_count_changed',
      title:
        parsed.data.decision === 'approved'
          ? 'Guest count change approved'
          : 'Guest count change declined',
      body:
        parsed.data.decision === 'approved'
          ? `Your chef approved ${formatGuestCountDelta(change.previous_count, change.new_count)}.`
          : `Your chef declined the requested guest-count change.`,
      actionUrl: `/my-events/${change.event_id}#booking-change-center`,
      eventId: change.event_id,
      metadata: {
        previous_count: change.previous_count,
        new_count: change.new_count,
        decision: parsed.data.decision,
        total_delta_cents: pricing.totalDeltaCents,
        request_id: change.id,
      },
    })
  }

  revalidateGuestCountPaths(change.event_id, event.tenant_id)
  return { success: true }
}

export async function getGuestCountHistory(eventId: string): Promise<GuestCountChange[]> {
  const user = await requireChef()
  return loadGuestCountHistory(eventId, user.entityId!)
}

export async function getClientGuestCountChangeCenter(
  eventId: string
): Promise<ClientGuestCountChangeCenter> {
  const user = await requireClient()
  const event = await getEventForClientMutation(eventId, user.entityId!)

  if (!event) {
    throw new Error('Event not found')
  }

  const [history, pendingRequest, serviceConfig] = await Promise.all([
    loadGuestCountHistory(eventId, event.tenant_id),
    getPendingGuestCountChangeForEvent(eventId),
    getServiceConfigForTenant(event.tenant_id),
  ])

  return {
    policy: evaluateGuestCountChangePolicy({
      eventStatus: event.status,
      eventDate: event.event_date,
      hasDeadline: Boolean(serviceConfig.has_guest_count_deadline),
      deadlineDays: serviceConfig.guest_count_deadline_days,
      hasPendingRequest: Boolean(pendingRequest),
    }),
    pendingRequest,
    history,
  }
}
