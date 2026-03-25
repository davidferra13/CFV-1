'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuotePricingSuggestion {
  suggestedPerGuestCents: number
  suggestedTotalCents: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  historicalRange: { minCents: number; maxCents: number }
  acceptanceRateAtSuggested: number | null
  similarEvents: number // how many past events this is based on
  breakdown: {
    basedOnOccasion: boolean
    basedOnGuestCount: boolean
    basedOnSeason: boolean
    basedOnServiceStyle: boolean
  }
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getSmartQuoteSuggestion(params: {
  guestCount: number
  occasion?: string | null
  serviceStyle?: string | null
}): Promise<QuotePricingSuggestion | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const { guestCount, occasion, serviceStyle } = params

  if (!guestCount || guestCount <= 0) return null

  // Fetch historical accepted quotes and completed events
  const [quotesRes, eventsRes] = await Promise.all([
    db
      .from('quotes')
      .select('id, total_quoted_cents, guest_count_estimated, status, inquiry_id')
      .eq('tenant_id', tenantId)
      .in('status', ['accepted', 'rejected', 'expired'])
      .not('total_quoted_cents', 'is', null)
      .gt('total_quoted_cents', 0)
      .not('guest_count_estimated', 'is', null)
      .gt('guest_count_estimated', 0),
    db
      .from('events')
      .select('id, quoted_price_cents, guest_count, occasion, service_style, event_date, status')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'confirmed', 'paid', 'accepted'])
      .not('quoted_price_cents', 'is', null)
      .gt('quoted_price_cents', 0)
      .not('guest_count', 'is', null)
      .gt('guest_count', 0),
  ])

  const quotes = quotesRes.data || []
  const events = eventsRes.data || []

  if (events.length < 3 && quotes.length < 3) return null

  // Build per-guest price dataset from events (more reliable than quotes)
  const dataPoints = events.map((e: any) => ({
    perGuestCents: Math.round(e.quoted_price_cents / e.guest_count),
    totalCents: e.quoted_price_cents,
    guestCount: e.guest_count,
    occasion: e.occasion?.toLowerCase() || null,
    serviceStyle: e.service_style?.toLowerCase() || null,
    month: new Date(e.event_date).getMonth() + 1,
  }))

  // Score similarity of each data point to the current query
  const scored = dataPoints.map((dp: any) => {
    let score = 0
    const matchFlags = {
      basedOnOccasion: false,
      basedOnGuestCount: false,
      basedOnSeason: false,
      basedOnServiceStyle: false,
    }

    // Guest count similarity (most important - within 50% range)
    const guestRatio = Math.min(dp.guestCount, guestCount) / Math.max(dp.guestCount, guestCount)
    if (guestRatio >= 0.5) {
      score += guestRatio * 40
      matchFlags.basedOnGuestCount = true
    }

    // Occasion match
    if (occasion && dp.occasion) {
      if (dp.occasion === occasion.toLowerCase()) {
        score += 30
        matchFlags.basedOnOccasion = true
      } else if (
        dp.occasion.includes(occasion.toLowerCase()) ||
        occasion.toLowerCase().includes(dp.occasion)
      ) {
        score += 15
        matchFlags.basedOnOccasion = true
      }
    }

    // Service style match
    if (serviceStyle && dp.serviceStyle) {
      if (dp.serviceStyle === serviceStyle.toLowerCase()) {
        score += 15
        matchFlags.basedOnServiceStyle = true
      }
    }

    // Season match
    const currentMonth = new Date().getMonth() + 1
    const currentSeason = getSeason(currentMonth)
    const dpSeason = getSeason(dp.month)
    if (currentSeason === dpSeason) {
      score += 10
      matchFlags.basedOnSeason = true
    }

    return { ...dp, score, matchFlags }
  })

  // Filter to relevant matches (score > 20) and sort by relevance
  const relevant = scored
    .filter((s: any) => s.score > 20)
    .sort((a: any, b: any) => b.score - a.score)

  if (relevant.length < 2) {
    // Fall back to all events
    if (dataPoints.length < 3) return null
    const allPerGuest = dataPoints
      .map((dp: any) => dp.perGuestCents)
      .sort((a: number, b: number) => a - b)
    const median = allPerGuest[Math.floor(allPerGuest.length / 2)]
    return {
      suggestedPerGuestCents: median,
      suggestedTotalCents: median * guestCount,
      confidence: 'low',
      reasoning: `Based on your overall average of $${Math.round(median / 100)}/guest across ${dataPoints.length} events`,
      historicalRange: { minCents: allPerGuest[0], maxCents: allPerGuest[allPerGuest.length - 1] },
      acceptanceRateAtSuggested: null,
      similarEvents: dataPoints.length,
      breakdown: {
        basedOnOccasion: false,
        basedOnGuestCount: false,
        basedOnSeason: false,
        basedOnServiceStyle: false,
      },
    }
  }

  // Calculate weighted average per-guest price
  const totalWeight = relevant.reduce((s: number, r: any) => s + r.score, 0)
  const weightedPerGuest = Math.round(
    relevant.reduce((s: number, r: any) => s + r.perGuestCents * r.score, 0) / totalWeight
  )

  // Calculate range
  const perGuestValues = relevant
    .map((r: any) => r.perGuestCents)
    .sort((a: number, b: number) => a - b)
  const minCents = perGuestValues[0]
  const maxCents = perGuestValues[perGuestValues.length - 1]

  // Determine confidence
  const topMatch = relevant[0]
  let confidence: QuotePricingSuggestion['confidence'] = 'low'
  if (relevant.length >= 5 && topMatch.score > 60) confidence = 'high'
  else if (relevant.length >= 3 && topMatch.score > 40) confidence = 'medium'

  // Acceptance rate at this price point (from quotes data)
  let acceptanceRate: number | null = null
  if (quotes.length >= 5) {
    const nearPrice = quotes.filter((q: any) => {
      const qPerGuest = Math.round(q.total_quoted_cents / q.guest_count_estimated)
      return Math.abs(qPerGuest - weightedPerGuest) < weightedPerGuest * 0.25
    })
    if (nearPrice.length >= 3) {
      const accepted = nearPrice.filter((q: any) => q.status === 'accepted').length
      acceptanceRate = Math.round((accepted / nearPrice.length) * 100)
    }
  }

  // Build reasoning
  const matchTypes: string[] = []
  const flags = relevant[0].matchFlags
  if (flags.basedOnOccasion) matchTypes.push(`${occasion} events`)
  if (flags.basedOnGuestCount) matchTypes.push(`~${guestCount} guests`)
  if (flags.basedOnSeason) matchTypes.push('current season')
  if (flags.basedOnServiceStyle && serviceStyle) matchTypes.push(serviceStyle)
  const reasoning =
    matchTypes.length > 0
      ? `Based on ${relevant.length} similar events (${matchTypes.join(', ')}). Range: $${Math.round(minCents / 100)}-$${Math.round(maxCents / 100)}/guest.`
      : `Based on ${relevant.length} comparable events.`

  // Aggregate breakdown from top matches
  const breakdown = {
    basedOnOccasion: relevant.some((r: any) => r.matchFlags.basedOnOccasion),
    basedOnGuestCount: relevant.some((r: any) => r.matchFlags.basedOnGuestCount),
    basedOnSeason: relevant.some((r: any) => r.matchFlags.basedOnSeason),
    basedOnServiceStyle: relevant.some((r: any) => r.matchFlags.basedOnServiceStyle),
  }

  return {
    suggestedPerGuestCents: weightedPerGuest,
    suggestedTotalCents: weightedPerGuest * guestCount,
    confidence,
    reasoning,
    historicalRange: { minCents, maxCents },
    acceptanceRateAtSuggested: acceptanceRate,
    similarEvents: relevant.length,
    breakdown,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSeason(month: number): string {
  if (month <= 2 || month === 12) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'fall'
}
