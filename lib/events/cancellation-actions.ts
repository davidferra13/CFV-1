'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventFinancialSummary } from '@/lib/ledger/compute'
import { revalidatePath } from 'next/cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export type CancellationTier = {
  min_days: number
  max_days: number | null
  refund_percent: number
  label: string
}

export type CancellationPolicy = {
  id: string
  chefId: string
  name: string
  isDefault: boolean
  tiers: CancellationTier[]
  gracePeriodHours: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CancellationPreview = {
  eventId: string
  eventDate: string
  eventTitle: string | null
  daysUntilEvent: number
  totalPaidCents: number
  applicableTier: CancellationTier
  refundAmountCents: number
  feeRetainedCents: number
  gracePeriodApplies: boolean
  gracePeriodExpiresAt: string | null
  policyName: string
}

export type CancellationHistoryEntry = {
  eventId: string
  eventTitle: string | null
  eventDate: string
  clientName: string | null
  cancelledAt: string
  totalPaidCents: number
  refundAmountCents: number
  feeRetainedCents: number
  tierLabel: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapPolicyRow(row: any): CancellationPolicy {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    isDefault: row.is_default,
    tiers: (typeof row.tiers === 'string'
      ? JSON.parse(row.tiers)
      : row.tiers) as CancellationTier[],
    gracePeriodHours: row.grace_period_hours,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function findApplicableTier(tiers: CancellationTier[], daysUntilEvent: number): CancellationTier {
  // Sort tiers by min_days descending so we match the highest bracket first
  const sorted = [...tiers].sort((a, b) => b.min_days - a.min_days)
  for (const tier of sorted) {
    const maxDays = tier.max_days ?? Infinity
    if (daysUntilEvent >= tier.min_days && daysUntilEvent <= maxDays) {
      return tier
    }
  }
  // Fallback: no refund (shouldn't happen with a properly configured policy)
  return { min_days: 0, max_days: null, refund_percent: 0, label: 'No matching tier' }
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((to.getTime() - from.getTime()) / msPerDay)
}

// ─── Server Actions ─────────────────────────────────────────────────────────

/**
 * Get the default cancellation policy for the current chef,
 * or a specific policy by ID. Creates a default policy if none exists.
 */
export async function getCancellationPolicy(
  policyId?: string
): Promise<{ data: CancellationPolicy | null; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    if (policyId) {
      const { data, error } = await db
        .from('cancellation_policies')
        .select('*')
        .eq('id', policyId)
        .eq('chef_id', tenantId)
        .single()

      if (error) return { data: null, error: error.message }
      return { data: mapPolicyRow(data), error: null }
    }

    // Get the default policy
    const { data, error } = await db
      .from('cancellation_policies')
      .select('*')
      .eq('chef_id', tenantId)
      .eq('is_default', true)
      .single()

    if (error && error.code === 'PGRST116') {
      // No default policy exists, create one
      const { data: newPolicy, error: createErr } = await db
        .from('cancellation_policies')
        .insert({ chef_id: tenantId })
        .select()
        .single()

      if (createErr) return { data: null, error: createErr.message }
      return { data: mapPolicyRow(newPolicy), error: null }
    }

    if (error) return { data: null, error: error.message }
    return { data: mapPolicyRow(data), error: null }
  } catch (err: any) {
    return { data: null, error: err.message ?? 'Failed to get cancellation policy' }
  }
}

/**
 * Update a cancellation policy's tiers, grace period, name, or notes.
 */
export async function updateCancellationPolicy(
  policyId: string,
  updates: {
    name?: string
    tiers?: CancellationTier[]
    gracePeriodHours?: number
    notes?: string | null
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // Validate tiers if provided
    if (updates.tiers) {
      if (!Array.isArray(updates.tiers) || updates.tiers.length === 0) {
        return { success: false, error: 'At least one cancellation tier is required.' }
      }
      for (const tier of updates.tiers) {
        if (typeof tier.min_days !== 'number' || tier.min_days < 0) {
          return { success: false, error: 'Each tier must have a valid min_days (>= 0).' }
        }
        if (tier.max_days !== null && typeof tier.max_days !== 'number') {
          return { success: false, error: 'max_days must be a number or null.' }
        }
        if (
          typeof tier.refund_percent !== 'number' ||
          tier.refund_percent < 0 ||
          tier.refund_percent > 100
        ) {
          return { success: false, error: 'refund_percent must be between 0 and 100.' }
        }
        if (!tier.label || typeof tier.label !== 'string') {
          return { success: false, error: 'Each tier must have a label.' }
        }
      }
    }

    if (
      updates.gracePeriodHours !== undefined &&
      (updates.gracePeriodHours < 0 || updates.gracePeriodHours > 720)
    ) {
      return { success: false, error: 'Grace period must be between 0 and 720 hours (30 days).' }
    }

    const updatePayload: Record<string, any> = {}
    if (updates.name !== undefined) updatePayload.name = updates.name
    if (updates.tiers !== undefined) updatePayload.tiers = updates.tiers
    if (updates.gracePeriodHours !== undefined)
      updatePayload.grace_period_hours = updates.gracePeriodHours
    if (updates.notes !== undefined) updatePayload.notes = updates.notes

    const { error } = await db
      .from('cancellation_policies')
      .update(updatePayload)
      .eq('id', policyId)
      .eq('chef_id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update cancellation policy' }
  }
}

/**
 * Calculate cancellation fee for a given event.
 * Looks at days until event, original amount paid (from ledger),
 * and applies the matching tier from the chef's default policy.
 */
export async function calculateCancellationFee(eventId: string): Promise<{
  data: {
    daysUntilEvent: number
    applicableTier: CancellationTier
    totalPaidCents: number
    refundAmountCents: number
    feeRetainedCents: number
    gracePeriodApplies: boolean
  } | null
  error: string | null
}> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // Get event details
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id, event_date, created_at')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventErr || !event) {
      return { data: null, error: eventErr?.message ?? 'Event not found' }
    }

    // Get financial summary from ledger
    const financials = await getEventFinancialSummary(eventId)
    const totalPaidCents = financials?.totalPaidCents ?? 0

    // Get default policy
    const policyResult = await getCancellationPolicy()
    if (policyResult.error || !policyResult.data) {
      return { data: null, error: policyResult.error ?? 'No cancellation policy found' }
    }

    const policy = policyResult.data
    const now = new Date()
    const eventDate = new Date(event.event_date)
    const daysUntil = daysBetween(now, eventDate)

    // Check grace period: full refund if within grace period of booking
    const bookingDate = new Date(event.created_at)
    const hoursSinceBooking = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60)
    const gracePeriodApplies = hoursSinceBooking <= policy.gracePeriodHours

    if (gracePeriodApplies) {
      return {
        data: {
          daysUntilEvent: Math.max(0, daysUntil),
          applicableTier: {
            min_days: 0,
            max_days: null,
            refund_percent: 100,
            label: 'Grace period',
          },
          totalPaidCents,
          refundAmountCents: totalPaidCents,
          feeRetainedCents: 0,
          gracePeriodApplies: true,
        },
        error: null,
      }
    }

    // Find applicable tier
    const tier = findApplicableTier(policy.tiers, Math.max(0, daysUntil))
    const refundAmountCents = Math.round(totalPaidCents * (tier.refund_percent / 100))
    const feeRetainedCents = totalPaidCents - refundAmountCents

    return {
      data: {
        daysUntilEvent: Math.max(0, daysUntil),
        applicableTier: tier,
        totalPaidCents,
        refundAmountCents,
        feeRetainedCents,
        gracePeriodApplies: false,
      },
      error: null,
    }
  } catch (err: any) {
    return { data: null, error: err.message ?? 'Failed to calculate cancellation fee' }
  }
}

/**
 * Get a full cancellation preview for the confirmation dialog.
 * Includes event details, applicable tier, and amounts.
 */
export async function getEventCancellationPreview(eventId: string): Promise<{
  data: CancellationPreview | null
  error: string | null
}> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // Get event with details
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id, occasion, event_date, created_at')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventErr || !event) {
      return { data: null, error: eventErr?.message ?? 'Event not found' }
    }

    // Calculate fee
    const feeResult = await calculateCancellationFee(eventId)
    if (feeResult.error || !feeResult.data) {
      return { data: null, error: feeResult.error ?? 'Failed to calculate fee' }
    }

    // Get policy name
    const policyResult = await getCancellationPolicy()

    // Grace period expiry
    const bookingDate = new Date(event.created_at)
    const gracePeriodHours = policyResult.data?.gracePeriodHours ?? 48
    const gracePeriodExpiry = new Date(bookingDate.getTime() + gracePeriodHours * 60 * 60 * 1000)

    return {
      data: {
        eventId: event.id,
        eventDate: event.event_date,
        eventTitle: event.occasion,
        daysUntilEvent: feeResult.data.daysUntilEvent,
        totalPaidCents: feeResult.data.totalPaidCents,
        applicableTier: feeResult.data.applicableTier,
        refundAmountCents: feeResult.data.refundAmountCents,
        feeRetainedCents: feeResult.data.feeRetainedCents,
        gracePeriodApplies: feeResult.data.gracePeriodApplies,
        gracePeriodExpiresAt: gracePeriodExpiry.toISOString(),
        policyName: policyResult.data?.name ?? 'Standard Policy',
      },
      error: null,
    }
  } catch (err: any) {
    return { data: null, error: err.message ?? 'Failed to get cancellation preview' }
  }
}

/**
 * Get cancellation history: all cancelled events with fee details.
 * Recalculates fees based on the event date vs cancellation date.
 */
export async function getCancellationHistory(): Promise<{
  data: CancellationHistoryEntry[]
  error: string | null
}> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // Get all cancelled events
    const { data: events, error: eventsErr } = await db
      .from('events')
      .select(
        `
        id,
        occasion,
        event_date,
        cancelled_at,
        updated_at,
        client_id,
        clients!inner(full_name)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'cancelled')
      .order('cancelled_at', { ascending: false })
      .limit(100)

    if (eventsErr) return { data: [], error: eventsErr.message }
    if (!events || events.length === 0) return { data: [], error: null }

    // Get default policy for tier labels
    const policyResult = await getCancellationPolicy()
    const tiers = policyResult.data?.tiers ?? []

    const history: CancellationHistoryEntry[] = []

    for (const event of events) {
      // Get financial data from ledger
      const financials = await getEventFinancialSummary(event.id)
      const totalPaidCents = financials?.totalPaidCents ?? 0
      const totalRefundedCents = financials?.totalRefundedCents ?? 0

      // Use cancelled_at (set atomically during cancellation) instead of updated_at
      // which can drift if the event row is touched by migrations or admin fixes
      const cancelDate = new Date(event.cancelled_at || event.updated_at)
      const eventDate = new Date(event.event_date)
      const daysBeforeEvent = daysBetween(cancelDate, eventDate)

      const tier = findApplicableTier(tiers, Math.max(0, daysBeforeEvent))
      const feeRetainedCents = totalPaidCents - totalRefundedCents

      const client = event.clients as any
      const clientName = client?.full_name ?? null

      history.push({
        eventId: event.id,
        eventTitle: event.occasion,
        eventDate: event.event_date,
        clientName,
        cancelledAt: event.cancelled_at || event.updated_at,
        totalPaidCents,
        refundAmountCents: totalRefundedCents,
        feeRetainedCents,
        tierLabel: tier.label,
      })
    }

    return { data: history, error: null }
  } catch (err: any) {
    return { data: [], error: err.message ?? 'Failed to get cancellation history' }
  }
}
