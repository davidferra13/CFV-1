'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PriceBand {
  label: string
  minPerGuestCents: number
  maxPerGuestCents: number
  quotesInBand: number
  acceptanceRate: number
  avgRevenueCents: number
  avgProfitMarginPercent: number
}

export interface ElasticityByOccasion {
  occasion: string
  priceInsensitive: boolean // high acceptance even at high prices
  elasticityScore: number // 0-100, higher = more price-sensitive
  optimalPerGuestCents: number
  acceptanceAtOptimal: number
  quotesAnalyzed: number
}

export interface PriceElasticityResult {
  priceBands: PriceBand[]
  byOccasion: ElasticityByOccasion[]
  overallElasticity: number // 0-100
  revenueMaximizingPerGuestCents: number | null
  profitMaximizingPerGuestCents: number | null
  currentAvgPerGuestCents: number
  priceIncreaseHeadroom: number // % you could raise prices before acceptance drops significantly
  insight: string | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getPriceElasticity(): Promise<PriceElasticityResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch quotes with outcomes
  const { data: quotes, error } = await db
    .from('quotes')
    .select('id, total_quoted_cents, guest_count_estimated, status, inquiry_id')
    .eq('tenant_id', tenantId)
    .in('status', ['accepted', 'rejected', 'expired'])
    .not('total_quoted_cents', 'is', null)
    .gt('total_quoted_cents', 0)

  if (error || !quotes || quotes.length < 10) return null

  // Filter to quotes with valid guest counts for per-guest analysis
  const validQuotes = quotes.filter(
    (q: any) => q.guest_count_estimated && q.guest_count_estimated > 0
  )
  if (validQuotes.length < 8) return null

  // Calculate per-guest prices
  const enriched = validQuotes.map((q: any) => ({
    ...q,
    perGuestCents: Math.round(q.total_quoted_cents / q.guest_count_estimated),
    accepted: q.status === 'accepted',
  }))

  // Sort by per-guest price
  enriched.sort((a: any, b: any) => a.perGuestCents - b.perGuestCents)

  // Fetch inquiry occasions
  const inquiryIds = [...new Set(enriched.map((q: any) => q.inquiry_id).filter(Boolean))]
  const { data: inquiriesData } =
    inquiryIds.length > 0
      ? await db.from('inquiries').select('id, occasion').in('id', inquiryIds)
      : { data: [] }

  const occasionByInquiry = new Map<string, string>()
  for (const inq of inquiriesData || []) {
    if (inq.occasion) occasionByInquiry.set(inq.id, inq.occasion)
  }

  // Also check events for occasion
  const { data: events } = await db
    .from('events')
    .select('id, occasion, inquiry_id')
    .eq('tenant_id', tenantId)
    .not('occasion', 'is', null)

  for (const ev of events || []) {
    if (ev.inquiry_id && ev.occasion && !occasionByInquiry.has(ev.inquiry_id)) {
      occasionByInquiry.set(ev.inquiry_id, ev.occasion)
    }
  }

  // Fetch expenses for profit margin on accepted quotes
  const acceptedInquiryIds = enriched
    .filter((q: any) => q.accepted)
    .map((q: any) => q.inquiry_id)
    .filter(Boolean)
  const { data: acceptedEvents } =
    acceptedInquiryIds.length > 0
      ? await db
          .from('events')
          .select('id, inquiry_id, quoted_price_cents')
          .in('inquiry_id', acceptedInquiryIds)
      : { data: [] }

  const eventIdsByInquiry = new Map<string, string>()
  for (const ev of acceptedEvents || []) {
    if (ev.inquiry_id) eventIdsByInquiry.set(ev.inquiry_id, ev.id)
  }

  const eventIds = Array.from(eventIdsByInquiry.values())
  const { data: expenses } =
    eventIds.length > 0
      ? await db.from('expenses').select('event_id, amount_cents').in('event_id', eventIds)
      : { data: [] }

  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    expenseByEvent.set(
      exp.event_id,
      (expenseByEvent.get(exp.event_id) || 0) + (exp.amount_cents || 0)
    )
  }

  // ─── Price Bands ───

  const allPerGuest = enriched.map((q: any) => q.perGuestCents)
  const minPG = Math.min(...allPerGuest)
  const maxPG = Math.max(...allPerGuest)
  const range = maxPG - minPG
  const bandCount = Math.min(5, Math.max(3, Math.floor(enriched.length / 5)))
  const bandSize = Math.ceil(range / bandCount)

  const priceBands: PriceBand[] = []
  for (let i = 0; i < bandCount; i++) {
    const low = minPG + i * bandSize
    const high = i === bandCount - 1 ? maxPG + 1 : minPG + (i + 1) * bandSize
    const inBand = enriched.filter((q: any) => q.perGuestCents >= low && q.perGuestCents < high)
    if (inBand.length === 0) continue

    const accepted = inBand.filter((q: any) => q.accepted)
    const acceptanceRate = Math.round((accepted.length / inBand.length) * 100)
    const avgRevenue = Math.round(
      inBand.reduce((s: number, q: any) => s + q.total_quoted_cents, 0) / inBand.length
    )

    // Profit margin for accepted in band
    let avgMargin = 0
    const acceptedWithExpenses = accepted.filter((q: any) => {
      const eventId = eventIdsByInquiry.get(q.inquiry_id)
      return eventId
    })
    if (acceptedWithExpenses.length > 0) {
      const margins = acceptedWithExpenses.map((q: any) => {
        const eventId = eventIdsByInquiry.get(q.inquiry_id)!
        const expense = expenseByEvent.get(eventId) || 0
        return q.total_quoted_cents > 0
          ? ((q.total_quoted_cents - expense) / q.total_quoted_cents) * 100
          : 0
      })
      avgMargin = Math.round(margins.reduce((s: number, m: number) => s + m, 0) / margins.length)
    }

    priceBands.push({
      label: `$${Math.round(low / 100)}-$${Math.round(high / 100)}/guest`,
      minPerGuestCents: low,
      maxPerGuestCents: high,
      quotesInBand: inBand.length,
      acceptanceRate,
      avgRevenueCents: avgRevenue,
      avgProfitMarginPercent: avgMargin,
    })
  }

  // ─── Elasticity by Occasion ───

  const occasionQuotes = new Map<
    string,
    { perGuest: number[]; accepted: number[]; total: number }
  >()
  for (const q of enriched) {
    const occasion = q.inquiry_id ? occasionByInquiry.get(q.inquiry_id) || null : null
    if (!occasion) continue
    if (!occasionQuotes.has(occasion))
      occasionQuotes.set(occasion, { perGuest: [], accepted: [], total: 0 })
    const o = occasionQuotes.get(occasion)!
    o.perGuest.push(q.perGuestCents)
    o.accepted.push(q.accepted ? 1 : 0)
    o.total++
  }

  const byOccasion: ElasticityByOccasion[] = Array.from(occasionQuotes.entries())
    .filter(([, o]) => o.total >= 3)
    .map(([occasion, o]) => {
      // Simple elasticity: correlation between price and rejection
      // Split into halves by price, compare acceptance rates
      const sorted = o.perGuest
        .map((pg, i) => ({ pg, accepted: o.accepted[i] }))
        .sort((a, b) => a.pg - b.pg)
      const mid = Math.floor(sorted.length / 2)
      const lowerHalf = sorted.slice(0, mid)
      const upperHalf = sorted.slice(mid)

      const lowerAcceptance =
        lowerHalf.length > 0 ? lowerHalf.filter((s) => s.accepted).length / lowerHalf.length : 0
      const upperAcceptance =
        upperHalf.length > 0 ? upperHalf.filter((s) => s.accepted).length / upperHalf.length : 0

      const dropoff = lowerAcceptance - upperAcceptance
      const elasticityScore = Math.max(0, Math.min(100, Math.round(dropoff * 100)))
      const priceInsensitive = elasticityScore < 15

      // Optimal = per-guest price of accepted quotes (median)
      const acceptedPGs = sorted
        .filter((s) => s.accepted)
        .map((s) => s.pg)
        .sort((a, b) => a - b)
      const optimal = acceptedPGs.length > 0 ? acceptedPGs[Math.floor(acceptedPGs.length / 2)] : 0
      const acceptanceAtOptimal =
        o.total > 0 ? Math.round((o.accepted.filter((a) => a).length / o.total) * 100) : 0

      return {
        occasion,
        priceInsensitive,
        elasticityScore,
        optimalPerGuestCents: optimal,
        acceptanceAtOptimal,
        quotesAnalyzed: o.total,
      }
    })
    .sort((a, b) => b.elasticityScore - a.elasticityScore)

  // ─── Overall Elasticity ───

  // Same approach globally
  const mid = Math.floor(enriched.length / 2)
  const lowerHalf = enriched.slice(0, mid)
  const upperHalf = enriched.slice(mid)
  const lowerAcc = lowerHalf.filter((q: any) => q.accepted).length / Math.max(lowerHalf.length, 1)
  const upperAcc = upperHalf.filter((q: any) => q.accepted).length / Math.max(upperHalf.length, 1)
  const overallElasticity = Math.max(0, Math.min(100, Math.round((lowerAcc - upperAcc) * 100)))

  // Current average
  const currentAvg = Math.round(
    allPerGuest.reduce((s: number, v: number) => s + v, 0) / allPerGuest.length
  )

  // Revenue maximizing: band with highest (acceptance * avg revenue)
  const revMax =
    priceBands.length > 0
      ? [...priceBands].sort(
          (a, b) => b.acceptanceRate * b.avgRevenueCents - a.acceptanceRate * a.avgRevenueCents
        )[0]
      : null
  const revMaxPG = revMax
    ? Math.round((revMax.minPerGuestCents + revMax.maxPerGuestCents) / 2)
    : null

  // Profit maximizing: band with highest (acceptance * margin * revenue)
  const profMax =
    priceBands.length > 0
      ? [...priceBands].sort(
          (a, b) =>
            b.acceptanceRate * b.avgProfitMarginPercent * b.avgRevenueCents -
            a.acceptanceRate * a.avgProfitMarginPercent * a.avgRevenueCents
        )[0]
      : null
  const profMaxPG = profMax
    ? Math.round((profMax.minPerGuestCents + profMax.maxPerGuestCents) / 2)
    : null

  // Price increase headroom: how far above current can you go before acceptance < 50%
  const aboveCurrent = priceBands.filter((b) => b.minPerGuestCents >= currentAvg)
  const firstLowAcceptance = aboveCurrent.find((b) => b.acceptanceRate < 50)
  const headroom = firstLowAcceptance
    ? Math.round(((firstLowAcceptance.minPerGuestCents - currentAvg) / currentAvg) * 100)
    : aboveCurrent.length > 0
      ? 20
      : 0 // default if all bands above current still have >50% acceptance

  // Insight
  let insight: string | null = null
  if (overallElasticity < 20) {
    insight =
      'Your clients are price-insensitive. You likely have room to raise prices without losing bookings.'
  } else if (overallElasticity > 60) {
    insight =
      'Clients are highly price-sensitive. Small price increases significantly reduce acceptance rates.'
  } else {
    insight = `Moderate price sensitivity (${overallElasticity}/100). Targeted price increases on select occasions may work.`
  }

  return {
    priceBands,
    byOccasion,
    overallElasticity,
    revenueMaximizingPerGuestCents: revMaxPG,
    profitMaximizingPerGuestCents: profMaxPG,
    currentAvgPerGuestCents: currentAvg,
    priceIncreaseHeadroom: headroom,
    insight,
  }
}
