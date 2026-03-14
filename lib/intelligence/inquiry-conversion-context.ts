'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InquiryConversionContext {
  // How this inquiry compares to past ones
  conversionLikelihood: number // 0-100
  conversionLabel: 'very likely' | 'likely' | 'possible' | 'unlikely'
  similarInquiriesCount: number
  similarConvertedCount: number
  avgDaysToConvert: number | null
  // Pricing context based on similar converted inquiries
  pricingBenchmark: {
    medianTotalCents: number
    medianPerGuestCents: number
    rangeLowCents: number
    rangeHighCents: number
    dataPoints: number
  } | null
  // Pipeline position
  pipelinePosition: {
    totalOpen: number
    thisRank: number // 1 = highest priority among open
    estimatedPipelineValueCents: number
  }
  // Factors driving the assessment
  factors: string[]
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getInquiryConversionContext(params: {
  inquiryId: string
  guestCount: number | null
  occasion: string | null
  budgetCents: number | null
  channel: string
  createdAt: string
}): Promise<InquiryConversionContext | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const [historicalRes, openRes] = await Promise.all([
    // All past inquiries (converted + declined/expired) for conversion rate
    supabase
      .from('inquiries')
      .select(
        'id, status, channel, confirmed_guest_count, confirmed_occasion, confirmed_budget_cents, created_at, updated_at, converted_to_event_id'
      )
      .eq('tenant_id', tenantId)
      .in('status', ['converted', 'declined', 'expired'])
      .order('created_at', { ascending: false })
      .limit(200),
    // Current open inquiries for pipeline context
    supabase
      .from('inquiries')
      .select('id, confirmed_budget_cents, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_response', 'awaiting_chef', 'awaiting_client', 'quoted']),
  ])

  const historical = historicalRes.data || []
  const openInquiries = openRes.data || []

  if (historical.length < 5) return null

  const factors: string[] = []

  // ─── Score Similarity ───
  const scored = historical.map((h: any) => {
    let similarity = 0

    // Channel match
    if (h.channel === params.channel) similarity += 20

    // Guest count similarity
    if (params.guestCount && h.confirmed_guest_count) {
      const ratio =
        Math.min(params.guestCount, h.confirmed_guest_count) /
        Math.max(params.guestCount, h.confirmed_guest_count)
      if (ratio >= 0.5) similarity += ratio * 30
    }

    // Occasion match
    if (params.occasion && h.confirmed_occasion) {
      const a = params.occasion.toLowerCase()
      const b = h.confirmed_occasion.toLowerCase()
      if (a === b) similarity += 25
      else if (a.includes(b) || b.includes(a)) similarity += 12
    }

    // Budget proximity
    if (params.budgetCents && h.confirmed_budget_cents) {
      const ratio =
        Math.min(params.budgetCents, h.confirmed_budget_cents) /
        Math.max(params.budgetCents, h.confirmed_budget_cents)
      if (ratio >= 0.5) similarity += ratio * 15
    }

    return { ...h, similarity }
  })

  // Filter to similar inquiries (similarity > 15, or fall back to all)
  let similar = scored.filter((s: any) => s.similarity > 15)
  if (similar.length < 5) similar = scored

  const converted = similar.filter((s: any) => s.status === 'converted')
  const conversionRate = Math.round((converted.length / similar.length) * 100)

  // Conversion label
  let conversionLabel: InquiryConversionContext['conversionLabel'] = 'unlikely'
  if (conversionRate >= 60) conversionLabel = 'very likely'
  else if (conversionRate >= 40) conversionLabel = 'likely'
  else if (conversionRate >= 20) conversionLabel = 'possible'

  // Build factors
  if (params.channel === 'referral' || params.channel === 'website') {
    const channelConverted = similar.filter(
      (s: any) => s.channel === params.channel && s.status === 'converted'
    )
    if (channelConverted.length > 0) {
      factors.push(
        `${params.channel} inquiries convert ${Math.round((channelConverted.length / similar.filter((s: any) => s.channel === params.channel).length) * 100)}% of the time`
      )
    }
  }
  if (params.guestCount) {
    factors.push(`${similar.length} similar inquiries found for ~${params.guestCount} guests`)
  }
  if (conversionRate >= 50) {
    factors.push(`Strong conversion history (${conversionRate}%)`)
  } else if (conversionRate < 25) {
    factors.push(`Low historical conversion rate (${conversionRate}%)`)
  }

  // Average days to convert
  const conversionTimes = converted
    .map((c: any) => {
      const days = Math.round(
        (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000
      )
      return days > 0 && days < 180 ? days : null
    })
    .filter((d: number | null): d is number => d !== null)
  const avgDaysToConvert =
    conversionTimes.length >= 3
      ? Math.round(
          conversionTimes.reduce((s: number, d: number) => s + d, 0) / conversionTimes.length
        )
      : null

  if (avgDaysToConvert) {
    factors.push(`Similar inquiries convert in ~${avgDaysToConvert} days on average`)
  }

  // ─── Pricing Benchmark ───
  let pricingBenchmark: InquiryConversionContext['pricingBenchmark'] = null
  if (params.guestCount && params.guestCount > 0) {
    // Get converted events with pricing
    const convertedEventIds = converted.map((c: any) => c.converted_to_event_id).filter(Boolean)

    if (convertedEventIds.length >= 3) {
      const { data: events } = await supabase
        .from('events')
        .select('quoted_price_cents, guest_count')
        .in('id', convertedEventIds)
        .not('quoted_price_cents', 'is', null)
        .gt('quoted_price_cents', 0)
        .not('guest_count', 'is', null)
        .gt('guest_count', 0)

      if (events && events.length >= 3) {
        const perGuest = events
          .map((e: any) => Math.round(e.quoted_price_cents / e.guest_count))
          .sort((a: number, b: number) => a - b)
        const totals = events
          .map((e: any) => e.quoted_price_cents)
          .sort((a: number, b: number) => a - b)

        pricingBenchmark = {
          medianPerGuestCents: perGuest[Math.floor(perGuest.length / 2)],
          medianTotalCents: totals[Math.floor(totals.length / 2)],
          rangeLowCents: perGuest[0],
          rangeHighCents: perGuest[perGuest.length - 1],
          dataPoints: events.length,
        }
      }
    }
  }

  // ─── Pipeline Position ───
  // Simple priority: budget * recency
  const now = Date.now()
  const rankedOpen = openInquiries
    .map((o: any) => ({
      id: o.id,
      score:
        (o.confirmed_budget_cents || 0) +
        (1 / Math.max(1, (now - new Date(o.created_at).getTime()) / 3600000)) * 10000,
    }))
    .sort((a: any, b: any) => b.score - a.score)

  const thisRank = rankedOpen.findIndex((o: any) => o.id === params.inquiryId) + 1
  const estimatedPipelineValueCents = openInquiries.reduce(
    (s: number, o: any) => s + (o.confirmed_budget_cents || 0),
    0
  )

  return {
    conversionLikelihood: conversionRate,
    conversionLabel,
    similarInquiriesCount: similar.length,
    similarConvertedCount: converted.length,
    avgDaysToConvert,
    pricingBenchmark,
    pipelinePosition: {
      totalOpen: openInquiries.length,
      thisRank: thisRank || openInquiries.length,
      estimatedPipelineValueCents,
    },
    factors,
  }
}
