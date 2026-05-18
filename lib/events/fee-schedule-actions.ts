'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type FeeScheduleTier = {
  days_before_min: number
  days_before_max: number
  fee_type: 'percent' | 'flat'
  fee_value: number
  description?: string
}

export type FeeScheduleEntry = FeeScheduleTier & {
  id: string
  chef_id: string
  created_at: string
}

// ── Actions ────────────────────────────────────────────────────────────────

/**
 * Get the fee schedule for the current chef.
 * Returns all tiers ordered by days_before_min ascending.
 */
export async function getFeeSchedule(
  chefId?: string
): Promise<{ data: FeeScheduleEntry[]; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = chefId || user.tenantId!
    const db: any = createServerClient()

    if (tenantId !== user.tenantId) {
      return { data: [], error: 'Unauthorized' }
    }

    const { data, error } = await db
      .from('cancellation_fee_schedule')
      .select('*')
      .eq('chef_id', tenantId)
      .order('days_before_min', { ascending: true })

    if (error) return { data: [], error: error.message }
    return { data: data || [], error: null }
  } catch (err: any) {
    return { data: [], error: err.message ?? 'Failed to get fee schedule' }
  }
}

/**
 * Replace all fee schedule tiers for the current chef.
 * Deletes existing tiers and inserts new ones.
 */
export async function upsertFeeSchedule(
  tiers: FeeScheduleTier[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    // Validate tiers
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return { success: false, error: 'At least one fee tier is required' }
    }

    for (const tier of tiers) {
      if (typeof tier.days_before_min !== 'number' || tier.days_before_min < 0) {
        return { success: false, error: 'days_before_min must be >= 0' }
      }
      if (typeof tier.days_before_max !== 'number' || tier.days_before_max < tier.days_before_min) {
        return { success: false, error: 'days_before_max must be >= days_before_min' }
      }
      if (tier.fee_type !== 'percent' && tier.fee_type !== 'flat') {
        return { success: false, error: 'fee_type must be "percent" or "flat"' }
      }
      if (typeof tier.fee_value !== 'number' || tier.fee_value < 0) {
        return { success: false, error: 'fee_value must be >= 0' }
      }
    }

    // Delete existing tiers
    await db.from('cancellation_fee_schedule').delete().eq('chef_id', tenantId)

    // Insert new tiers
    const rows = tiers.map((tier) => ({
      chef_id: tenantId,
      days_before_min: tier.days_before_min,
      days_before_max: tier.days_before_max,
      fee_type: tier.fee_type,
      fee_value: tier.fee_value,
      description: tier.description || null,
    }))

    const { error: insertError } = await db.from('cancellation_fee_schedule').insert(rows)

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update fee schedule' }
  }
}

/**
 * Delete all fee schedule tiers for the current chef.
 */
export async function deleteFeeSchedule(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    const { error } = await db.from('cancellation_fee_schedule').delete().eq('chef_id', tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to delete fee schedule' }
  }
}

/**
 * Preview the reschedule fee for an event without actually rescheduling.
 * Useful for showing the client the cost before they confirm.
 */
export async function calculateRescheduleFee(
  eventId: string,
  _newDate: string
): Promise<{ fee_cents: number; tier_description: string | null; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id, event_date, original_event_date, tenant_id')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (eventErr || !event) {
      return { fee_cents: 0, tier_description: null, error: 'Event not found' }
    }

    const effectiveOriginalDate = event.original_event_date || event.event_date
    const now = new Date()
    const original = new Date(effectiveOriginalDate)
    const msPerDay = 1000 * 60 * 60 * 24
    const daysBefore = Math.floor((original.getTime() - now.getTime()) / msPerDay)

    const { data: tiers } = await db
      .from('cancellation_fee_schedule')
      .select('days_before_min, days_before_max, fee_type, fee_value, description')
      .eq('chef_id', tenantId)
      .order('days_before_min', { ascending: true })

    if (!tiers || tiers.length === 0) {
      return { fee_cents: 0, tier_description: 'No fee schedule configured' }
    }

    for (const tier of tiers) {
      if (daysBefore >= tier.days_before_min && daysBefore <= tier.days_before_max) {
        let feeCents = 0

        if (tier.fee_type === 'flat') {
          feeCents = tier.fee_value
        } else if (tier.fee_type === 'percent') {
          try {
            const { getEventFinancialSummary } = await import('@/lib/ledger/compute')
            const financials = await getEventFinancialSummary(eventId)
            const totalCents = financials?.totalPaidCents ?? 0
            feeCents = Math.round(totalCents * (tier.fee_value / 10000))
          } catch {
            feeCents = 0
          }
        }

        return { fee_cents: feeCents, tier_description: tier.description || null }
      }
    }

    return { fee_cents: 0, tier_description: 'No matching tier for this timeframe' }
  } catch (err: any) {
    return { fee_cents: 0, tier_description: null, error: err.message ?? 'Failed to calculate fee' }
  }
}
