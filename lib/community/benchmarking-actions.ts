// Chef Community - Peer Benchmarking Server Actions
// Anonymous aggregate stats across all chefs on the platform.
// Only shows aggregated data; never exposes individual chef information.
// Pure database queries and math, no AI.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface PeerBenchmark {
  metric: string
  yourValue: number
  platformMedian: number
  platformAvg: number
  platformP25: number // 25th percentile
  platformP75: number // 75th percentile
  percentileRank: number // where you fall (0-100, higher is better)
  unit: string // "cents", "count", "percent", etc.
}

export interface BenchmarkReport {
  benchmarks: PeerBenchmark[]
  totalChefsInPool: number
  generatedAt: string
  disclaimer: string
}

export interface EventTypeBenchmark {
  eventType: string
  avgPriceCents: number
  avgGuestCount: number
  eventCount: number
}

// ============================================
// HELPERS
// ============================================

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function percentileRank(values: number[], myValue: number): number {
  if (!values.length) return 50
  const below = values.filter(v => v < myValue).length
  return Math.round((below / values.length) * 100)
}

function avg(values: number[]): number {
  if (!values.length) return 0
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

// Minimum number of chefs required to show benchmarks (privacy threshold)
const MIN_CHEFS_FOR_BENCHMARKS = 3

// ============================================
// ACTIONS
// ============================================

/**
 * Get peer benchmarking report comparing the current chef to platform aggregates.
 * Only returns data when enough chefs exist to maintain anonymity (min 3).
 * All data is aggregated; individual chef data is never exposed.
 */
export async function getPeerBenchmarks(): Promise<BenchmarkReport> {
  const user = await requirePro('community')
  const supabase = createServerClient()

  const disclaimer = 'All benchmarks are anonymous aggregates across participating chefs. ' +
    'No individual chef data is shared. Minimum 3 chefs required for any metric.'

  // Get all chefs (we need aggregate stats)
  const { data: allChefs } = await (supabase as any)
    .from('chefs')
    .select('id')

  const totalChefs = allChefs?.length ?? 0

  if (totalChefs < MIN_CHEFS_FOR_BENCHMARKS) {
    return {
      benchmarks: [],
      totalChefsInPool: totalChefs,
      generatedAt: new Date().toISOString(),
      disclaimer: disclaimer + ' Not enough chefs on the platform yet for benchmarking.',
    }
  }

  const chefIds = (allChefs ?? []).map((c: any) => c.id) as string[]

  // Gather per-chef metrics
  const chefMetrics = new Map<string, {
    eventCount: number
    avgEventPriceCents: number
    avgGuestCount: number
    totalRevenueCents: number
    completedEvents: number
  }>()

  // Get completed events per chef with quote totals
  const { data: events } = await (supabase as any)
    .from('events')
    .select('tenant_id, guest_count, status')
    .in('tenant_id', chefIds)
    .eq('status', 'completed')

  // Get quote totals per event tenant
  const { data: quotes } = await (supabase as any)
    .from('quotes')
    .select('tenant_id, total_cents')
    .in('tenant_id', chefIds)
    .not('total_cents', 'is', null)

  // Aggregate events per chef
  for (const e of events ?? []) {
    const existing = chefMetrics.get(e.tenant_id) ?? {
      eventCount: 0,
      avgEventPriceCents: 0,
      avgGuestCount: 0,
      totalRevenueCents: 0,
      completedEvents: 0,
    }
    existing.completedEvents++
    existing.avgGuestCount += e.guest_count ?? 0
    chefMetrics.set(e.tenant_id, existing)
  }

  // Aggregate quotes per chef
  const chefQuoteTotals = new Map<string, number[]>()
  for (const q of quotes ?? []) {
    const list = chefQuoteTotals.get(q.tenant_id) ?? []
    list.push(q.total_cents)
    chefQuoteTotals.set(q.tenant_id, list)
  }

  // Calculate per-chef averages
  for (const [chefId, metrics] of chefMetrics) {
    if (metrics.completedEvents > 0) {
      metrics.avgGuestCount = Math.round(metrics.avgGuestCount / metrics.completedEvents)
    }
    const quotePrices = chefQuoteTotals.get(chefId) ?? []
    if (quotePrices.length > 0) {
      metrics.avgEventPriceCents = avg(quotePrices)
      metrics.totalRevenueCents = quotePrices.reduce((a, b) => a + b, 0)
    }
    metrics.eventCount = metrics.completedEvents
  }

  // Get current chef's metrics
  const myMetrics = chefMetrics.get(user.tenantId!) ?? {
    eventCount: 0,
    avgEventPriceCents: 0,
    avgGuestCount: 0,
    totalRevenueCents: 0,
    completedEvents: 0,
  }

  // Build benchmark arrays from all chefs
  const allEventCounts = Array.from(chefMetrics.values()).map(m => m.eventCount)
  const allAvgPrices = Array.from(chefMetrics.values())
    .filter(m => m.avgEventPriceCents > 0)
    .map(m => m.avgEventPriceCents)
  const allAvgGuests = Array.from(chefMetrics.values())
    .filter(m => m.avgGuestCount > 0)
    .map(m => m.avgGuestCount)
  const allRevenues = Array.from(chefMetrics.values())
    .filter(m => m.totalRevenueCents > 0)
    .map(m => m.totalRevenueCents)

  const benchmarks: PeerBenchmark[] = []

  // Benchmark: Total completed events
  if (allEventCounts.length >= MIN_CHEFS_FOR_BENCHMARKS) {
    benchmarks.push({
      metric: 'Completed Events',
      yourValue: myMetrics.eventCount,
      platformMedian: median(allEventCounts),
      platformAvg: avg(allEventCounts),
      platformP25: percentile(allEventCounts, 25),
      platformP75: percentile(allEventCounts, 75),
      percentileRank: percentileRank(allEventCounts, myMetrics.eventCount),
      unit: 'count',
    })
  }

  // Benchmark: Average event price
  if (allAvgPrices.length >= MIN_CHEFS_FOR_BENCHMARKS) {
    benchmarks.push({
      metric: 'Average Event Price',
      yourValue: myMetrics.avgEventPriceCents,
      platformMedian: median(allAvgPrices),
      platformAvg: avg(allAvgPrices),
      platformP25: percentile(allAvgPrices, 25),
      platformP75: percentile(allAvgPrices, 75),
      percentileRank: percentileRank(allAvgPrices, myMetrics.avgEventPriceCents),
      unit: 'cents',
    })
  }

  // Benchmark: Average guest count
  if (allAvgGuests.length >= MIN_CHEFS_FOR_BENCHMARKS) {
    benchmarks.push({
      metric: 'Average Guest Count',
      yourValue: myMetrics.avgGuestCount,
      platformMedian: median(allAvgGuests),
      platformAvg: avg(allAvgGuests),
      platformP25: percentile(allAvgGuests, 25),
      platformP75: percentile(allAvgGuests, 75),
      percentileRank: percentileRank(allAvgGuests, myMetrics.avgGuestCount),
      unit: 'count',
    })
  }

  // Benchmark: Total revenue
  if (allRevenues.length >= MIN_CHEFS_FOR_BENCHMARKS) {
    benchmarks.push({
      metric: 'Total Revenue',
      yourValue: myMetrics.totalRevenueCents,
      platformMedian: median(allRevenues),
      platformAvg: avg(allRevenues),
      platformP25: percentile(allRevenues, 25),
      platformP75: percentile(allRevenues, 75),
      percentileRank: percentileRank(allRevenues, myMetrics.totalRevenueCents),
      unit: 'cents',
    })
  }

  return {
    benchmarks,
    totalChefsInPool: totalChefs,
    generatedAt: new Date().toISOString(),
    disclaimer,
  }
}

/**
 * Get anonymous event type benchmarks (average price and guest count by occasion).
 * Shows what the platform average looks like for different event types.
 */
export async function getEventTypeBenchmarks(): Promise<EventTypeBenchmark[]> {
  const user = await requirePro('community')
  const supabase = createServerClient()

  // Get all completed events with quotes across all chefs
  const { data: events } = await (supabase as any)
    .from('events')
    .select('id, occasion, guest_count')
    .eq('status', 'completed')
    .not('occasion', 'is', null)

  if (!events?.length) return []

  // Get quotes for these events
  const eventIds = events.map((e: any) => e.id)
  const { data: quotes } = await (supabase as any)
    .from('quotes')
    .select('event_id, total_cents')
    .in('event_id', eventIds)
    .not('total_cents', 'is', null)

  const quoteMap = new Map<string, number>()
  for (const q of quotes ?? []) {
    quoteMap.set(q.event_id, q.total_cents)
  }

  // Group by occasion type
  const byType = new Map<string, { prices: number[]; guests: number[] }>()
  for (const e of events) {
    const occasion = (e.occasion ?? 'other').toLowerCase()
    const price = quoteMap.get(e.id)
    const entry = byType.get(occasion) ?? { prices: [], guests: [] }
    if (price != null) entry.prices.push(price)
    entry.guests.push(e.guest_count ?? 0)
    byType.set(occasion, entry)
  }

  // Only include types with enough data (min 3 events for anonymity)
  return Array.from(byType.entries())
    .filter(([, data]) => data.prices.length >= MIN_CHEFS_FOR_BENCHMARKS)
    .map(([eventType, data]) => ({
      eventType,
      avgPriceCents: avg(data.prices),
      avgGuestCount: avg(data.guests),
      eventCount: data.prices.length,
    }))
    .sort((a, b) => b.eventCount - a.eventCount)
}
