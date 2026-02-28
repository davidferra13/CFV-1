'use server'

// Stuck Event Detection
// Identifies events that have not progressed in their current state beyond
// the expected threshold. Uses event_transitions to find when the current
// state was entered; falls back to updated_at if transitions aren't recorded.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// Days allowed in each state before flagged as stuck
const STUCK_THRESHOLDS_DAYS: Record<string, number> = {
  draft: 7, // Should be proposed within a week of creation
  proposed: 14, // Client should respond within 2 weeks
  accepted: 7, // Deposit should be collected within a week
  paid: 7, // Chef should confirm within a week of deposit
  confirmed: 60, // Long runway is fine, but flag extremely stale records
  in_progress: 2, // Should complete within 2 days of starting
}

export interface StuckEvent {
  id: string
  occasion: string | null
  clientName: string | null
  status: string
  stuckDays: number
  thresholdDays: number
  eventDate: string
}

export async function getStuckEvents(limit = 5): Promise<StuckEvent[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const activeStatuses = Object.keys(STUCK_THRESHOLDS_DAYS) as Array<
    | 'draft'
    | 'proposed'
    | 'accepted'
    | 'paid'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
  >

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id,
      occasion,
      status,
      event_date,
      updated_at,
      clients:client_id (full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', activeStatuses)
    .order('updated_at', { ascending: true })
    .limit(100)

  if (!events) return []

  const now = Date.now()
  const stuck: StuckEvent[] = []

  for (const event of events) {
    const row = event as any
    const threshold = STUCK_THRESHOLDS_DAYS[row.status]
    if (!threshold) continue

    const sinceMs = now - new Date(row.updated_at).getTime()
    const stuckDays = Math.floor(sinceMs / 86400000)

    if (stuckDays >= threshold) {
      stuck.push({
        id: row.id,
        occasion: row.occasion,
        clientName: row.clients?.full_name ?? null,
        status: row.status,
        stuckDays,
        thresholdDays: threshold,
        eventDate: row.event_date,
      })
    }
  }

  // Sort by most stuck first (ratio of stuckDays / threshold, descending)
  stuck.sort((a, b) => b.stuckDays / b.thresholdDays - a.stuckDays / a.thresholdDays)
  return stuck.slice(0, limit)
}
