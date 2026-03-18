'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuoteConfidenceScore {
  confidencePercent: number // predicted acceptance likelihood
  level: 'very_high' | 'high' | 'moderate' | 'low'
  factors: string[]
  historicalAcceptanceRate: number
  pricePosition: 'below_avg' | 'at_avg' | 'above_avg' | 'premium'
  suggestedPriceRangeCents: { low: number; mid: number; high: number }
  similarQuotesCount: number
}

export interface QuoteConfidenceIntelligence {
  overallAcceptanceRate: number
  avgTimeToDecisionDays: number
  acceptedAvgCents: number
  rejectedAvgCents: number
  expiredCount: number
  byPricingModel: { model: string; acceptanceRate: number; count: number }[]
  byOccasion: { occasion: string; acceptanceRate: number; avgQuoteCents: number; count: number }[]
  sweetSpot: { minCents: number; maxCents: number; acceptanceRate: number } | null
  recentTrend: 'improving' | 'stable' | 'declining'
}

// ─── Score for a specific quote ──────────────────────────────────────────────

export async function getQuoteConfidence(
  quotedCents: number,
  guestCount: number,
  occasion?: string
): Promise<QuoteConfidenceScore | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, total_quoted_cents, guest_count_estimated, status, pricing_model, created_at')
    .eq('tenant_id', tenantId)
    .in('status', ['accepted', 'rejected', 'expired'])

  if (error || !quotes || quotes.length < 5) return null

  // Find similar quotes (similar price per person range)
  const perPerson = guestCount > 0 ? quotedCents / guestCount : quotedCents
  const allPerPerson = quotes
    .filter(
      (q: any) => q.guest_count_estimated && q.guest_count_estimated > 0 && q.total_quoted_cents
    )
    .map((q: any) => ({
      ...q,
      perPerson: q.total_quoted_cents / q.guest_count_estimated,
    }))

  // Similar = within 30% of per-person price
  const similar = allPerPerson.filter(
    (q: any) => q.perPerson >= perPerson * 0.7 && q.perPerson <= perPerson * 1.3
  )

  const pool = similar.length >= 5 ? similar : allPerPerson
  const accepted = pool.filter((q: any) => q.status === 'accepted')
  const rejected = pool.filter((q: any) => q.status === 'rejected' || q.status === 'expired')
  const acceptanceRate = pool.length > 0 ? Math.round((accepted.length / pool.length) * 100) : 50

  // Price position
  const avgAcceptedPP =
    accepted.length > 0
      ? accepted.reduce((s: number, q: any) => s + q.perPerson, 0) / accepted.length
      : perPerson
  const ratio = avgAcceptedPP > 0 ? perPerson / avgAcceptedPP : 1

  let pricePosition: QuoteConfidenceScore['pricePosition']
  if (ratio < 0.85) pricePosition = 'below_avg'
  else if (ratio <= 1.15) pricePosition = 'at_avg'
  else if (ratio <= 1.4) pricePosition = 'above_avg'
  else pricePosition = 'premium'

  // Confidence calculation
  const factors: string[] = []
  let confidence = 50

  // Price position factor
  if (pricePosition === 'below_avg') {
    confidence += 20
    factors.push('Priced below your typical accepted range')
  } else if (pricePosition === 'at_avg') {
    confidence += 10
    factors.push('Priced in your sweet spot')
  } else if (pricePosition === 'above_avg') {
    confidence -= 5
    factors.push('Priced above average - may face pushback')
  } else {
    confidence -= 15
    factors.push('Premium pricing - lower historical acceptance')
  }

  // Historical rate factor
  if (acceptanceRate >= 70) {
    confidence += 15
    factors.push(`${acceptanceRate}% of similar quotes were accepted`)
  } else if (acceptanceRate >= 50) {
    confidence += 5
    factors.push(`${acceptanceRate}% acceptance on similar quotes`)
  } else {
    confidence -= 10
    factors.push(`Only ${acceptanceRate}% acceptance on similar quotes`)
  }

  // Data volume factor
  if (similar.length >= 10) {
    confidence += 5
    factors.push(`Based on ${similar.length} similar quotes`)
  } else if (similar.length < 3) {
    confidence -= 5
    factors.push('Limited data for comparison')
  }

  confidence = Math.max(5, Math.min(95, confidence))

  const level: QuoteConfidenceScore['level'] =
    confidence >= 75
      ? 'very_high'
      : confidence >= 55
        ? 'high'
        : confidence >= 35
          ? 'moderate'
          : 'low'

  // Suggested price range
  const acceptedValues = accepted.map((q: any) => q.perPerson).sort((a: number, b: number) => a - b)
  const low =
    acceptedValues.length > 0
      ? Math.round(acceptedValues[Math.floor(acceptedValues.length * 0.25)] * guestCount)
      : Math.round(quotedCents * 0.85)
  const mid =
    acceptedValues.length > 0
      ? Math.round(acceptedValues[Math.floor(acceptedValues.length * 0.5)] * guestCount)
      : quotedCents
  const high =
    acceptedValues.length > 0
      ? Math.round(acceptedValues[Math.floor(acceptedValues.length * 0.75)] * guestCount)
      : Math.round(quotedCents * 1.15)

  return {
    confidencePercent: confidence,
    level,
    factors,
    historicalAcceptanceRate: acceptanceRate,
    pricePosition,
    suggestedPriceRangeCents: { low, mid, high },
    similarQuotesCount: similar.length,
  }
}

// ─── Overall quote intelligence ──────────────────────────────────────────────

export async function getQuoteIntelligence(): Promise<QuoteConfidenceIntelligence | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(
      'id, total_quoted_cents, guest_count_estimated, status, pricing_model, sent_at, accepted_at, rejected_at, created_at, inquiry_id'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error || !quotes || quotes.length < 5) return null

  // Fetch inquiry occasions
  const inquiryIds = [...new Set(quotes.map((q: any) => q.inquiry_id).filter(Boolean))]
  const { data: inquiries } =
    inquiryIds.length > 0
      ? await supabase.from('inquiries').select('id, confirmed_date').in('id', inquiryIds)
      : { data: [] }

  // Fetch events for occasion data
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, inquiry_id')
    .eq('tenant_id', tenantId)
    .not('occasion', 'is', null)

  const occasionByInquiry = new Map<string, string>()
  for (const event of events || []) {
    if (event.inquiry_id && event.occasion) occasionByInquiry.set(event.inquiry_id, event.occasion)
  }

  const decided = quotes.filter((q: any) => ['accepted', 'rejected', 'expired'].includes(q.status))
  const accepted = decided.filter((q: any) => q.status === 'accepted')
  const rejected = decided.filter((q: any) => q.status === 'rejected')
  const expired = decided.filter((q: any) => q.status === 'expired')

  const overallAcceptanceRate =
    decided.length > 0 ? Math.round((accepted.length / decided.length) * 100) : 0

  // Time to decision
  const decisionTimes: number[] = []
  for (const q of decided) {
    if (q.sent_at && (q.accepted_at || q.rejected_at)) {
      const end = q.accepted_at || q.rejected_at
      const days = (new Date(end).getTime() - new Date(q.sent_at).getTime()) / 86400000
      if (days > 0 && days < 60) decisionTimes.push(days)
    }
  }
  const avgTimeToDecision =
    decisionTimes.length > 0
      ? Math.round((decisionTimes.reduce((s, d) => s + d, 0) / decisionTimes.length) * 10) / 10
      : 0

  // Accepted vs rejected avg
  const acceptedAvg =
    accepted.length > 0
      ? Math.round(
          accepted.reduce((s: number, q: any) => s + (q.total_quoted_cents || 0), 0) /
            accepted.length
        )
      : 0
  const rejectedAvg =
    rejected.length > 0
      ? Math.round(
          rejected.reduce((s: number, q: any) => s + (q.total_quoted_cents || 0), 0) /
            rejected.length
        )
      : 0

  // By pricing model
  const modelMap = new Map<string, { accepted: number; total: number }>()
  for (const q of decided) {
    const model = q.pricing_model || 'unknown'
    if (!modelMap.has(model)) modelMap.set(model, { accepted: 0, total: 0 })
    const m = modelMap.get(model)!
    m.total++
    if (q.status === 'accepted') m.accepted++
  }
  const byPricingModel = Array.from(modelMap.entries())
    .map(([model, m]) => ({
      model,
      acceptanceRate: Math.round((m.accepted / m.total) * 100),
      count: m.total,
    }))
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)

  // By occasion
  const occasionStats = new Map<string, { accepted: number; total: number; totalCents: number }>()
  for (const q of decided) {
    const occasion = q.inquiry_id ? occasionByInquiry.get(q.inquiry_id) || null : null
    if (!occasion) continue
    if (!occasionStats.has(occasion))
      occasionStats.set(occasion, { accepted: 0, total: 0, totalCents: 0 })
    const o = occasionStats.get(occasion)!
    o.total++
    o.totalCents += q.total_quoted_cents || 0
    if (q.status === 'accepted') o.accepted++
  }
  const byOccasion = Array.from(occasionStats.entries())
    .filter(([, o]) => o.total >= 2)
    .map(([occasion, o]) => ({
      occasion,
      acceptanceRate: Math.round((o.accepted / o.total) * 100),
      avgQuoteCents: Math.round(o.totalCents / o.total),
      count: o.total,
    }))
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)

  // Sweet spot (price range with highest acceptance)
  const acceptedPrices = accepted
    .map((q: any) => q.total_quoted_cents)
    .filter(Boolean)
    .sort((a: number, b: number) => a - b)
  let sweetSpot = null
  if (acceptedPrices.length >= 5) {
    const q25 = acceptedPrices[Math.floor(acceptedPrices.length * 0.25)]
    const q75 = acceptedPrices[Math.floor(acceptedPrices.length * 0.75)]
    const inRange = decided.filter(
      (q: any) => q.total_quoted_cents >= q25 && q.total_quoted_cents <= q75
    )
    const inRangeAccepted = inRange.filter((q: any) => q.status === 'accepted')
    sweetSpot = {
      minCents: q25,
      maxCents: q75,
      acceptanceRate:
        inRange.length > 0 ? Math.round((inRangeAccepted.length / inRange.length) * 100) : 0,
    }
  }

  // Trend (last 20 vs prior 20)
  const recent20 = decided.slice(-20)
  const prior20 = decided.slice(-40, -20)
  const recentRate =
    recent20.length > 0
      ? recent20.filter((q: any) => q.status === 'accepted').length / recent20.length
      : 0
  const priorRate =
    prior20.length > 0
      ? prior20.filter((q: any) => q.status === 'accepted').length / prior20.length
      : 0
  const recentTrend: QuoteConfidenceIntelligence['recentTrend'] =
    recentRate > priorRate * 1.1
      ? 'improving'
      : recentRate < priorRate * 0.9
        ? 'declining'
        : 'stable'

  return {
    overallAcceptanceRate,
    avgTimeToDecisionDays: avgTimeToDecision,
    acceptedAvgCents: acceptedAvg,
    rejectedAvgCents: rejectedAvg,
    expiredCount: expired.length,
    byPricingModel,
    byOccasion,
    sweetSpot,
    recentTrend,
  }
}
