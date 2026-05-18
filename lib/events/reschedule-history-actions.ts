'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type RescheduleHistoryEntry = {
  id: string
  event_id: string
  original_date: string
  new_date: string
  initiated_by: 'chef' | 'client'
  reason: string | null
  fee_cents: number
  fee_waived: boolean
  fee_waive_reason: string | null
  staff_notified: boolean
  vendor_notified: boolean
  client_notified: boolean
  created_at: string
}

// ── Actions ────────────────────────────────────────────────────────────────

/**
 * Get reschedule history for an event.
 * Returns all reschedule records ordered by most recent first.
 */
export async function getRescheduleHistory(
  eventId: string
): Promise<{ data: RescheduleHistoryEntry[]; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()

    const { data, error } = await db
      .from('event_reschedules')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) return { data: [], error: error.message }
    return { data: data || [], error: null }
  } catch (err: any) {
    return { data: [], error: err.message ?? 'Failed to get reschedule history' }
  }
}

/**
 * Get all reschedules across all events for the current chef.
 * Useful for a global reschedule audit view.
 */
export async function getAllReschedules(opts?: {
  limit?: number
}): Promise<{ data: (RescheduleHistoryEntry & { occasion?: string })[]; error: string | null }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient()
    const limit = opts?.limit ?? 50

    const { data, error } = await db
      .from('event_reschedules')
      .select('*, events!inner(occasion)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { data: [], error: error.message }

    const mapped = (data || []).map((row: any) => ({
      ...row,
      occasion: row.events?.occasion ?? null,
    }))

    return { data: mapped, error: null }
  } catch (err: any) {
    return { data: [], error: err.message ?? 'Failed to get reschedule history' }
  }
}
