// Smart Pricing Insights - Pure math aggregations over historical quote data
// Formula > AI: no LLM needed, just database queries and arithmetic

import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PricingInsightsParams {
  tenantId: string
  eventType?: string // matches events.occasion
  guestCountRange?: [number, number]
}

export interface PricingInsights {
  status: 'ok' | 'insufficient_data'
  avgQuoteCents: number
  medianQuoteCents: number
  winRate: number // 0-100
  highestAcceptedCents: number
  lowestAcceptedCents: number
  avgPerGuestCents: number
  totalQuotes: number
  acceptedQuotes: number
  recentTrend: 'up' | 'down' | 'stable'
}

const EMPTY_INSIGHTS: PricingInsights = {
  status: 'insufficient_data',
  avgQuoteCents: 0,
  medianQuoteCents: 0,
  winRate: 0,
  highestAcceptedCents: 0,
  lowestAcceptedCents: 0,
  avgPerGuestCents: 0,
  totalQuotes: 0,
  acceptedQuotes: 0,
  recentTrend: 'stable',
}

// ─── Core Query ──────────────────────────────────────────────────────────────

export async function getPricingInsights(params: PricingInsightsParams): Promise<PricingInsights> {
  const db: any = createServerClient()
  const { tenantId, eventType, guestCountRange } = params

  // Build query: quotes joined with events for occasion/guest_count filtering
  let query = db
    .from('quotes')
    .select(
      'id, status, total_quoted_cents, guest_count_estimated, created_at, event:events(occasion, guest_count)'
    )
    .eq('tenant_id', tenantId)
    .in('status', ['sent', 'accepted', 'rejected', 'expired'])
    .is('deleted_at', null)
    .eq('is_superseded', false)

  const { data: quotes, error } = await query

  if (error) {
    console.error('[getPricingInsights] query error:', error)
    return EMPTY_INSIGHTS
  }

  if (!quotes || quotes.length === 0) {
    return EMPTY_INSIGHTS
  }

  // Post-filter by event type and guest count range (join filtering is limited in the database)
  let filtered = quotes as any[]

  if (eventType) {
    filtered = filtered.filter((q) => {
      const occasion = q.event?.occasion
      return occasion && occasion.toLowerCase() === eventType.toLowerCase()
    })
  }

  if (guestCountRange) {
    const [min, max] = guestCountRange
    filtered = filtered.filter((q) => {
      // Use the event's guest_count first, fall back to quote's guest_count_estimated
      const gc = q.event?.guest_count ?? q.guest_count_estimated
      return gc != null && gc >= min && gc <= max
    })
  }

  // Need at least 3 quotes for meaningful insights
  if (filtered.length < 3) {
    return { ...EMPTY_INSIGHTS, totalQuotes: filtered.length }
  }

  // Separate by status
  const decided = filtered.filter((q: any) =>
    ['accepted', 'rejected', 'expired'].includes(q.status)
  )
  const accepted = filtered.filter((q: any) => q.status === 'accepted')

  // All quote amounts (for avg/median)
  const allAmounts = filtered
    .map((q: any) => q.total_quoted_cents as number)
    .filter((c: number) => c > 0)
    .sort((a: number, b: number) => a - b)

  if (allAmounts.length === 0) {
    return { ...EMPTY_INSIGHTS, totalQuotes: filtered.length }
  }

  // Average
  const avgQuoteCents = Math.round(
    allAmounts.reduce((sum: number, c: number) => sum + c, 0) / allAmounts.length
  )

  // Median
  const mid = Math.floor(allAmounts.length / 2)
  const medianQuoteCents =
    allAmounts.length % 2 === 0
      ? Math.round((allAmounts[mid - 1] + allAmounts[mid]) / 2)
      : allAmounts[mid]

  // Win rate
  const winRate = decided.length > 0 ? Math.round((accepted.length / decided.length) * 100) : 0

  // Highest and lowest accepted
  const acceptedAmounts = accepted
    .map((q: any) => q.total_quoted_cents as number)
    .filter((c: number) => c > 0)
    .sort((a: number, b: number) => a - b)

  const highestAcceptedCents =
    acceptedAmounts.length > 0 ? acceptedAmounts[acceptedAmounts.length - 1] : 0
  const lowestAcceptedCents = acceptedAmounts.length > 0 ? acceptedAmounts[0] : 0

  // Average per guest (from accepted quotes with guest count data)
  const perGuestEntries = accepted
    .map((q: any) => {
      const gc = q.event?.guest_count ?? q.guest_count_estimated
      const amount = q.total_quoted_cents as number
      if (gc && gc > 0 && amount > 0) {
        return Math.round(amount / gc)
      }
      return null
    })
    .filter((v: number | null): v is number => v !== null)

  const avgPerGuestCents =
    perGuestEntries.length > 0
      ? Math.round(
          perGuestEntries.reduce((s: number, v: number) => s + v, 0) / perGuestEntries.length
        )
      : 0

  // Recent trend: compare avg of last 30% of quotes vs first 30%
  const recentTrend = computeTrend(filtered)

  return {
    status: 'ok',
    avgQuoteCents,
    medianQuoteCents,
    winRate,
    highestAcceptedCents,
    lowestAcceptedCents,
    avgPerGuestCents,
    totalQuotes: filtered.length,
    acceptedQuotes: accepted.length,
    recentTrend,
  }
}

// ─── Trend Calculation ───────────────────────────────────────────────────────

function computeTrend(quotes: any[]): 'up' | 'down' | 'stable' {
  if (quotes.length < 4) return 'stable'

  // Sort by created_at ascending
  const sorted = [...quotes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const splitPoint = Math.floor(sorted.length / 2)
  const olderHalf = sorted.slice(0, splitPoint)
  const newerHalf = sorted.slice(splitPoint)

  const avgOlder = average(olderHalf.map((q) => q.total_quoted_cents))
  const avgNewer = average(newerHalf.map((q) => q.total_quoted_cents))

  if (avgOlder === 0) return 'stable'

  const changePercent = ((avgNewer - avgOlder) / avgOlder) * 100

  // Need at least 10% change to call it a trend
  if (changePercent > 10) return 'up'
  if (changePercent < -10) return 'down'
  return 'stable'
}

function average(values: number[]): number {
  const valid = values.filter((v) => v > 0)
  if (valid.length === 0) return 0
  return valid.reduce((s, v) => s + v, 0) / valid.length
}
