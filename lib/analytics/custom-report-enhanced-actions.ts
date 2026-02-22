// Enhanced Custom Report Server Actions
// Provides client retention rate and revenue-by-source analytics.
// Uses existing tables: events, clients, expenses

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// --- Types ---

export type ClientRetentionResult = {
  startDate: string
  endDate: string
  totalClients: number
  repeatClients: number
  retentionRatePercent: number
  averageEventsPerRepeatClient: number
}

export type RevenueBySourceEntry = {
  source: string
  revenueCents: number
  eventCount: number
  averageRevenueCents: number
}

export type RevenueBySourceResult = {
  startDate: string
  endDate: string
  sources: RevenueBySourceEntry[]
  totalRevenueCents: number
  totalEventCount: number
}

// --- Schemas ---

const DateRangeSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

// --- Helpers ---

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  const startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0] // YTD
  return { startDate, endDate }
}

// --- Actions ---

/**
 * Calculate client retention rate for a given period.
 * Retention = percentage of clients who booked more than once in the period.
 */
export async function getClientRetentionRate(
  startDate?: string,
  endDate?: string
): Promise<ClientRetentionResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const defaults = getDefaultDateRange()
  const rangeStart = parsed.startDate ?? defaults.startDate
  const rangeEnd = parsed.endDate ?? defaults.endDate

  // Fetch all non-cancelled events in the date range
  const { data: events, error } = await supabase
    .from('events')
    .select('id, client_id')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', rangeStart)
    .lte('event_date', rangeEnd)
    .not('status', 'eq', 'cancelled')

  if (error) {
    console.error('[getClientRetentionRate] Error:', error)
    throw new Error('Failed to fetch events for retention analysis')
  }

  const allEvents = events || []

  // Count events per client
  const clientEventCount = new Map<string, number>()
  for (const event of allEvents) {
    if (!event.client_id) continue
    clientEventCount.set(event.client_id, (clientEventCount.get(event.client_id) || 0) + 1)
  }

  const totalClients = clientEventCount.size
  const repeatClients = Array.from(clientEventCount.values()).filter((count) => count > 1).length

  const retentionRatePercent =
    totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0

  // Average events per repeat client
  const repeatEventCounts = Array.from(clientEventCount.values()).filter((count) => count > 1)
  const averageEventsPerRepeatClient =
    repeatEventCounts.length > 0
      ? Math.round(
          (repeatEventCounts.reduce((sum, c) => sum + c, 0) / repeatEventCounts.length) * 10
        ) / 10
      : 0

  return {
    startDate: rangeStart,
    endDate: rangeEnd,
    totalClients,
    repeatClients,
    retentionRatePercent,
    averageEventsPerRepeatClient,
  }
}

/**
 * Get revenue grouped by inquiry source / referral source.
 * Joins events with clients to extract referral_source, then sums
 * quoted price for each source category.
 */
export async function getRevenueBySource(
  startDate?: string,
  endDate?: string
): Promise<RevenueBySourceResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const parsed = DateRangeSchema.parse({ startDate, endDate })
  const defaults = getDefaultDateRange()
  const rangeStart = parsed.startDate ?? defaults.startDate
  const rangeEnd = parsed.endDate ?? defaults.endDate

  // Fetch events with client referral source
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, quoted_price_cents, client:clients(referral_source)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', rangeStart)
    .lte('event_date', rangeEnd)
    .not('status', 'eq', 'cancelled')

  if (eventsError) {
    console.error('[getRevenueBySource] Error:', eventsError)
    throw new Error('Failed to fetch events for revenue by source')
  }

  const allEvents = events || []

  // Also fetch financial summaries for actual paid amounts
  const eventIds = allEvents.map((e) => e.id)

  let paidMap = new Map<string, number>()
  if (eventIds.length > 0) {
    const { data: summaries } = await supabase
      .from('event_financial_summary')
      .select('event_id, total_paid_cents')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventIds)

    for (const s of summaries || []) {
      if (s.event_id) {
        paidMap.set(s.event_id, s.total_paid_cents ?? 0)
      }
    }
  }

  // Group by source
  const sourceMap = new Map<string, { revenueCents: number; eventCount: number }>()

  for (const event of allEvents) {
    const source = (event.client as any)?.referral_source || 'unknown'
    const revenueCents = paidMap.get(event.id) ?? event.quoted_price_cents ?? 0

    const existing = sourceMap.get(source) || { revenueCents: 0, eventCount: 0 }
    existing.revenueCents += revenueCents
    existing.eventCount += 1
    sourceMap.set(source, existing)
  }

  const sources: RevenueBySourceEntry[] = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      revenueCents: data.revenueCents,
      eventCount: data.eventCount,
      averageRevenueCents:
        data.eventCount > 0 ? Math.round(data.revenueCents / data.eventCount) : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)

  const totalRevenueCents = sources.reduce((sum, s) => sum + s.revenueCents, 0)
  const totalEventCount = sources.reduce((sum, s) => sum + s.eventCount, 0)

  return {
    startDate: rangeStart,
    endDate: rangeEnd,
    sources,
    totalRevenueCents,
    totalEventCount,
  }
}
