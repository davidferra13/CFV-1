'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventIntelligenceContext {
  // Profitability projection
  profitabilityProjection: {
    expectedMarginPercent: number
    confidenceLevel: 'high' | 'medium' | 'low'
    similarEventsCount: number
    avgMarginForSimilar: number
    bestMarginPercent: number
    worstMarginPercent: number
  } | null
  // Price comparison
  priceComparison: {
    perGuestCents: number
    isAboveAverage: boolean
    percentFromAvg: number // positive = above, negative = below
    avgPerGuestCents: number
  } | null
  // Post-event suggestions (for completed/in_progress events)
  postEventActions: string[]
  // Key insights
  insights: string[]
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getEventIntelligenceContext(params: {
  eventId: string
  guestCount: number | null
  occasion: string | null
  quotedPriceCents: number | null
  status: string
  eventDate: string | null
}): Promise<EventIntelligenceContext | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const [eventsRes, expensesRes, thisExpensesRes] = await Promise.all([
    // Historical completed events for comparison
    db
      .from('events')
      .select('id, guest_count, occasion, quoted_price_cents, event_date, service_style, status')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'confirmed', 'paid'])
      .not('quoted_price_cents', 'is', null)
      .gt('quoted_price_cents', 0)
      .neq('id', params.eventId)
      .order('event_date', { ascending: false })
      .limit(100),
    // Historical expense totals for margin calc
    db
      .from('event_financial_summary')
      .select('event_id, total_expense_cents, total_income_cents, profit_margin_percent')
      .eq('tenant_id', tenantId)
      .limit(100),
    // This event's expenses
    db
      .from('event_financial_summary')
      .select('total_expense_cents, total_income_cents, profit_margin_percent')
      .eq('event_id', params.eventId)
      .single(),
  ])

  const events = eventsRes.data || []
  const financials = expensesRes.data || []
  const thisFinancials = thisExpensesRes.data

  if (events.length < 3) return null

  const financialMap = new Map<string, any>(financials.map((f: any) => [f.event_id, f]))
  const insights: string[] = []

  // ─── Profitability Projection ───
  let profitabilityProjection: EventIntelligenceContext['profitabilityProjection'] = null

  // Find similar events by guest count + occasion
  const similar = events.filter((e: any) => {
    if (!params.guestCount || !e.guest_count) return true // include all if no guest count
    const guestRatio =
      Math.min(e.guest_count, params.guestCount) / Math.max(e.guest_count, params.guestCount)
    const occasionMatch =
      !params.occasion || !e.occasion
        ? true
        : e.occasion?.toLowerCase().includes(params.occasion.toLowerCase()) ||
          params.occasion.toLowerCase().includes(e.occasion?.toLowerCase() || '')
    return guestRatio >= 0.4 || occasionMatch
  })

  const similarWithMargins = similar
    .map((e: any) => {
      const fin = financialMap.get(e.id)
      if (!fin || fin.profit_margin_percent == null) return null
      return { ...e, marginPercent: fin.profit_margin_percent }
    })
    .filter(Boolean) as Array<{ marginPercent: number; [key: string]: any }>

  if (similarWithMargins.length >= 3) {
    const margins = similarWithMargins.map((e) => e.marginPercent).sort((a, b) => a - b)
    const avg = Math.round(margins.reduce((s, m) => s + m, 0) / margins.length)

    profitabilityProjection = {
      expectedMarginPercent: avg,
      confidenceLevel:
        similarWithMargins.length >= 10
          ? 'high'
          : similarWithMargins.length >= 5
            ? 'medium'
            : 'low',
      similarEventsCount: similarWithMargins.length,
      avgMarginForSimilar: avg,
      bestMarginPercent: margins[margins.length - 1],
      worstMarginPercent: margins[0],
    }

    if (avg >= 50) insights.push(`Strong margin history (${avg}%) for similar events`)
    else if (avg < 25) insights.push(`Low margins (${avg}%) on similar events - review pricing`)
  }

  // ─── Price Comparison ───
  let priceComparison: EventIntelligenceContext['priceComparison'] = null

  if (params.quotedPriceCents && params.guestCount && params.guestCount > 0) {
    const thisPerGuest = Math.round(params.quotedPriceCents / params.guestCount)

    const eventsWithGuests = events.filter((e: any) => e.guest_count > 0)
    if (eventsWithGuests.length >= 3) {
      const allPerGuest = eventsWithGuests.map((e: any) =>
        Math.round(e.quoted_price_cents / e.guest_count)
      )
      const avgPerGuest = Math.round(
        allPerGuest.reduce((s: number, v: number) => s + v, 0) / allPerGuest.length
      )
      const percentFromAvg =
        avgPerGuest > 0 ? Math.round(((thisPerGuest - avgPerGuest) / avgPerGuest) * 100) : 0

      priceComparison = {
        perGuestCents: thisPerGuest,
        isAboveAverage: thisPerGuest > avgPerGuest,
        percentFromAvg,
        avgPerGuestCents: avgPerGuest,
      }

      if (percentFromAvg > 30)
        insights.push(`Priced ${percentFromAvg}% above your average - premium event`)
      else if (percentFromAvg < -30)
        insights.push(`Priced ${Math.abs(percentFromAvg)}% below average - consider adjusting`)
    }
  }

  // ─── Post-Event Actions ───
  const postEventActions: string[] = []

  if (params.status === 'completed' || params.status === 'in_progress') {
    // Check if payment collected
    if (thisFinancials) {
      const income = thisFinancials.total_income_cents || 0
      const quoted = params.quotedPriceCents || 0
      if (quoted > 0 && income < quoted * 0.9) {
        postEventActions.push('Collect remaining payment - outstanding balance detected')
      }
    }

    // Check if AAR exists
    const { count: aarCount } = await db
      .from('after_action_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', params.eventId)

    if (!aarCount || aarCount === 0) {
      postEventActions.push('Write After Action Review - capture lessons while fresh')
    }

    // Check if review was requested
    const { count: reviewCount } = await db
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', params.eventId)

    if (!reviewCount || reviewCount === 0) {
      postEventActions.push('Request client feedback - build your reputation')
    }

    // Suggest rebooking
    postEventActions.push('Discuss next event with the client while rapport is high')
  }

  // ─── Timing Insight ───
  if (params.eventDate) {
    const daysUntil = Math.round((new Date(params.eventDate).getTime() - Date.now()) / 86400000)
    if (daysUntil > 0 && daysUntil <= 3) {
      insights.push(`Event in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} - final prep window`)
    } else if (daysUntil > 3 && daysUntil <= 7) {
      insights.push(`${daysUntil} days out - confirm details with client`)
    }
  }

  return {
    profitabilityProjection,
    priceComparison,
    postEventActions,
    insights,
  }
}
