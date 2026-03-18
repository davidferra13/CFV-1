'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PriceAnomaly {
  type: 'quote_outlier' | 'expense_spike' | 'margin_drop' | 'underpricing' | 'overpricing'
  severity: 'info' | 'warning' | 'alert'
  title: string
  description: string
  currentValueCents: number
  benchmarkValueCents: number
  deviationPercent: number
  relatedEventId?: string
  relatedEventDate?: string
}

export interface PricingBenchmark {
  avgPerPersonCents: number
  medianPerPersonCents: number
  avgEventValueCents: number
  avgFoodCostPercent: number
  avgExpensePercent: number
}

export interface PriceAnomalyResult {
  anomalies: PriceAnomaly[]
  benchmarks: PricingBenchmark
  recentQuoteVsHistorical: {
    recentAvgCents: number
    historicalAvgCents: number
    trend: 'rising' | 'falling' | 'stable'
    changePercent: number
  }
  highestMarginOccasion: string | null
  lowestMarginOccasion: string | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getPriceAnomalies(): Promise<PriceAnomalyResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch completed events with pricing data
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date, quoted_price_cents, guest_count, occasion, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('quoted_price_cents', 'is', null)
    .gt('quoted_price_cents', 0)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 5) return null

  // Fetch expenses grouped by event
  const eventIds = events.map((e: any) => e.id)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('event_id, amount_cents')
    .in('event_id', eventIds)

  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    expenseByEvent.set(
      exp.event_id,
      (expenseByEvent.get(exp.event_id) || 0) + (exp.amount_cents || 0)
    )
  }

  // Fetch recent quotes (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: recentQuotes } = await supabase
    .from('quotes')
    .select('total_quoted_cents, guest_count_estimated, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo)
    .not('total_quoted_cents', 'is', null)

  // Calculate benchmarks
  const perPersonPrices: number[] = []
  const eventValues: number[] = []
  const margins: number[] = []
  const occasionMargins = new Map<
    string,
    { totalRevenue: number; totalExpense: number; count: number }
  >()

  for (const event of events) {
    eventValues.push(event.quoted_price_cents)

    if (event.guest_count && event.guest_count > 0) {
      perPersonPrices.push(Math.round(event.quoted_price_cents / event.guest_count))
    }

    const eventExpense = expenseByEvent.get(event.id) || 0
    if (event.quoted_price_cents > 0) {
      const margin = ((event.quoted_price_cents - eventExpense) / event.quoted_price_cents) * 100
      margins.push(margin)

      if (event.occasion) {
        if (!occasionMargins.has(event.occasion)) {
          occasionMargins.set(event.occasion, { totalRevenue: 0, totalExpense: 0, count: 0 })
        }
        const om = occasionMargins.get(event.occasion)!
        om.totalRevenue += event.quoted_price_cents
        om.totalExpense += eventExpense
        om.count++
      }
    }
  }

  perPersonPrices.sort((a, b) => a - b)
  eventValues.sort((a, b) => a - b)

  const avgPerPerson =
    perPersonPrices.length > 0
      ? Math.round(perPersonPrices.reduce((s, p) => s + p, 0) / perPersonPrices.length)
      : 0
  const medianPerPerson =
    perPersonPrices.length > 0 ? perPersonPrices[Math.floor(perPersonPrices.length / 2)] : 0
  const avgEventValue =
    eventValues.length > 0
      ? Math.round(eventValues.reduce((s, v) => s + v, 0) / eventValues.length)
      : 0
  const avgMargin =
    margins.length > 0
      ? Math.round((margins.reduce((s, m) => s + m, 0) / margins.length) * 10) / 10
      : 0

  const totalExpenses = Array.from(expenseByEvent.values()).reduce((s, v) => s + v, 0)
  const totalRevenue = events.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0)
  const avgFoodCostPercent =
    totalRevenue > 0 ? Math.round((totalExpenses / totalRevenue) * 1000) / 10 : 0
  const avgExpensePercent = avgFoodCostPercent

  const benchmarks: PricingBenchmark = {
    avgPerPersonCents: avgPerPerson,
    medianPerPersonCents: medianPerPerson,
    avgEventValueCents: avgEventValue,
    avgFoodCostPercent,
    avgExpensePercent,
  }

  // Detect anomalies
  const anomalies: PriceAnomaly[] = []
  const stdDev = Math.sqrt(
    eventValues.reduce((s, v) => s + Math.pow(v - avgEventValue, 2), 0) / eventValues.length
  )

  // Check recent events for outliers (within last 10 events)
  const recentEvents = events.slice(-10)
  for (const event of recentEvents) {
    const deviation = event.quoted_price_cents - avgEventValue
    const deviationPercent = Math.round((deviation / avgEventValue) * 100)

    // Quote significantly below average (underpricing)
    if (deviation < -stdDev * 1.5 && Math.abs(deviationPercent) > 25) {
      anomalies.push({
        type: 'underpricing',
        severity: 'warning',
        title: `Event priced ${Math.abs(deviationPercent)}% below average`,
        description: `Event on ${event.event_date} quoted at $${Math.round(event.quoted_price_cents / 100)} vs your average of $${Math.round(avgEventValue / 100)}`,
        currentValueCents: event.quoted_price_cents,
        benchmarkValueCents: avgEventValue,
        deviationPercent,
        relatedEventId: event.id,
        relatedEventDate: event.event_date,
      })
    }

    // Quote significantly above average (might be overpricing - just info)
    if (deviation > stdDev * 2 && deviationPercent > 40) {
      anomalies.push({
        type: 'overpricing',
        severity: 'info',
        title: `Event priced ${deviationPercent}% above average`,
        description: `Event on ${event.event_date} quoted at $${Math.round(event.quoted_price_cents / 100)} vs your average of $${Math.round(avgEventValue / 100)}. If accepted, great. If rejected, consider pricing.`,
        currentValueCents: event.quoted_price_cents,
        benchmarkValueCents: avgEventValue,
        deviationPercent,
        relatedEventId: event.id,
        relatedEventDate: event.event_date,
      })
    }

    // Expense spike (food cost > 50% for this event)
    const eventExpense = expenseByEvent.get(event.id) || 0
    if (event.quoted_price_cents > 0 && eventExpense > 0) {
      const costPercent = (eventExpense / event.quoted_price_cents) * 100
      if (costPercent > 50 && costPercent > avgFoodCostPercent * 1.5) {
        anomalies.push({
          type: 'expense_spike',
          severity: 'warning',
          title: `Food cost spike: ${Math.round(costPercent)}%`,
          description: `Event on ${event.event_date} had ${Math.round(costPercent)}% food cost vs your average of ${avgFoodCostPercent}%`,
          currentValueCents: eventExpense,
          benchmarkValueCents: Math.round((event.quoted_price_cents * avgFoodCostPercent) / 100),
          deviationPercent: Math.round(costPercent - avgFoodCostPercent),
          relatedEventId: event.id,
          relatedEventDate: event.event_date,
        })
      }
    }
  }

  // Recent quotes vs historical pricing trend
  const recentQuoteValues = (recentQuotes || [])
    .map((q: any) => q.total_quoted_cents)
    .filter(Boolean)
  const recentAvg =
    recentQuoteValues.length > 0
      ? Math.round(
          recentQuoteValues.reduce((s: number, v: number) => s + v, 0) / recentQuoteValues.length
        )
      : avgEventValue
  const historicalAvg = avgEventValue
  const changePercent =
    historicalAvg > 0 ? Math.round(((recentAvg - historicalAvg) / historicalAvg) * 100) : 0
  const trend: 'rising' | 'falling' | 'stable' =
    changePercent > 5 ? 'rising' : changePercent < -5 ? 'falling' : 'stable'

  // Occasion margins
  let highestMarginOccasion: string | null = null
  let lowestMarginOccasion: string | null = null
  let highestMargin = -Infinity
  let lowestMargin = Infinity

  for (const [occasion, data] of occasionMargins.entries()) {
    if (data.count < 2) continue
    const margin =
      data.totalRevenue > 0
        ? ((data.totalRevenue - data.totalExpense) / data.totalRevenue) * 100
        : 0
    if (margin > highestMargin) {
      highestMargin = margin
      highestMarginOccasion = occasion
    }
    if (margin < lowestMargin) {
      lowestMargin = margin
      lowestMarginOccasion = occasion
    }
  }

  return {
    anomalies: anomalies.slice(0, 10),
    benchmarks,
    recentQuoteVsHistorical: {
      recentAvgCents: recentAvg,
      historicalAvgCents: historicalAvg,
      trend,
      changePercent,
    },
    highestMarginOccasion,
    lowestMarginOccasion,
  }
}
