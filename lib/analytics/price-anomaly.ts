// Intelligence Hub - Price Anomaly Detection
// Detects when quoted prices deviate >20% from historical average
// for similar event types and guest count ranges.
// Pure math, no AI. Formula > AI.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface PriceAnomaly {
  eventId: string
  eventDate: string
  occasion: string | null
  guestCount: number
  quotedPriceCents: number
  historicalAvgCents: number
  deviationPercent: number // positive = above average, negative = below
  direction: 'above' | 'below'
  sampleSize: number // how many historical events were used for comparison
}

export interface PriceAnomalyReport {
  anomalies: PriceAnomaly[]
  totalEventsAnalyzed: number
  anomalyCount: number
  avgDeviationPercent: number
  generatedAt: string
}

// Guest count buckets for comparison: 1-10, 11-25, 26-50, 51-100, 100+
function getGuestBucket(count: number): [number, number] {
  if (count <= 10) return [1, 10]
  if (count <= 25) return [11, 25]
  if (count <= 50) return [26, 50]
  if (count <= 100) return [51, 100]
  return [101, 9999]
}

// ============================================
// ACTIONS
// ============================================

/**
 * Detect price anomalies across all events.
 * Compares each event's quoted total against the historical average
 * for events with the same occasion type and similar guest count.
 * Flags events that deviate more than 20% from the historical norm.
 *
 * @param thresholdPercent - minimum deviation to flag (default: 20)
 */
export async function detectPriceAnomalies(thresholdPercent = 20): Promise<PriceAnomalyReport> {
  const user = await requirePro('intelligence-hub')
  const supabase = createServerClient()

  // Get all events with their financial data
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, occasion, guest_count, status')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed'])
    .order('event_date')

  if (!events?.length) {
    return {
      anomalies: [],
      totalEventsAnalyzed: 0,
      anomalyCount: 0,
      avgDeviationPercent: 0,
      generatedAt: new Date().toISOString(),
    }
  }

  // Get quote totals for all events
  const eventIds = events.map((e) => e.id)
  const { data: quotes } = await supabase
    .from('quotes')
    .select('event_id, total_cents')
    .in('event_id', eventIds)
    .not('total_cents', 'is', null)

  if (!quotes?.length) {
    return {
      anomalies: [],
      totalEventsAnalyzed: events.length,
      anomalyCount: 0,
      avgDeviationPercent: 0,
      generatedAt: new Date().toISOString(),
    }
  }

  // Build a map of event_id -> quote total
  const quoteMap = new Map<string, number>()
  for (const q of quotes) {
    // If multiple quotes for same event, use the latest (highest total in array)
    const existing = quoteMap.get(q.event_id)
    if (!existing || q.total_cents > existing) {
      quoteMap.set(q.event_id, q.total_cents)
    }
  }

  // Group events by (occasion, guest_bucket) for historical comparison
  type GroupKey = string
  function makeKey(occasion: string | null, guestCount: number): GroupKey {
    const bucket = getGuestBucket(guestCount)
    return `${(occasion ?? 'unknown').toLowerCase()}|${bucket[0]}-${bucket[1]}`
  }

  const groups = new Map<GroupKey, number[]>()
  for (const e of events) {
    const price = quoteMap.get(e.id)
    if (price == null) continue
    const key = makeKey(e.occasion, e.guest_count)
    const list = groups.get(key) ?? []
    list.push(price)
    groups.set(key, list)
  }

  // Calculate averages per group
  const groupAvg = new Map<GroupKey, { avg: number; count: number }>()
  for (const [key, prices] of groups) {
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    groupAvg.set(key, { avg, count: prices.length })
  }

  // Find anomalies
  const anomalies: PriceAnomaly[] = []
  for (const e of events) {
    const price = quoteMap.get(e.id)
    if (price == null) continue

    const key = makeKey(e.occasion, e.guest_count)
    const group = groupAvg.get(key)
    if (!group || group.count < 2) continue // need at least 2 events to compare

    const deviationPercent = Math.round(((price - group.avg) / group.avg) * 100)
    if (Math.abs(deviationPercent) >= thresholdPercent) {
      anomalies.push({
        eventId: e.id,
        eventDate: e.event_date,
        occasion: e.occasion,
        guestCount: e.guest_count,
        quotedPriceCents: price,
        historicalAvgCents: group.avg,
        deviationPercent,
        direction: deviationPercent > 0 ? 'above' : 'below',
        sampleSize: group.count,
      })
    }
  }

  // Sort by absolute deviation (biggest outliers first)
  anomalies.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent))

  const avgDeviation =
    anomalies.length > 0
      ? Math.round(
          anomalies.reduce((s, a) => s + Math.abs(a.deviationPercent), 0) / anomalies.length
        )
      : 0

  return {
    anomalies,
    totalEventsAnalyzed: events.length,
    anomalyCount: anomalies.length,
    avgDeviationPercent: avgDeviation,
    generatedAt: new Date().toISOString(),
  }
}
