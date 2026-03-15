'use server'

// Revenue Forecasting - server actions for booked + pipeline revenue projections.
// Formula > AI: all calculations are deterministic weighted pipeline math.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  STAGE_WEIGHTS,
  STAGE_LABELS,
  weightByStage,
  calculateSeasonalIndex,
  projectNextMonths,
  type MonthlyDataPoint,
} from './forecast-calculator'

// -- Types --

export type MonthlyForecastEntry = {
  month: string // "2026-04"
  bookedRevenueCents: number // confirmed/paid events
  pipelineRevenueCents: number // proposed/accepted (weighted by likelihood)
  historicalAvgCents: number // same month last year or trailing avg
}

export type QuarterlyForecast = {
  q1: number
  q2: number
  q3: number
  q4: number
}

export type PipelineStageBreakdown = {
  stage: string
  label: string
  count: number
  totalCents: number
  weightedCents: number
  probability: number
}

export type PipelineValue = {
  totalCents: number
  weightedCents: number
  byStage: PipelineStageBreakdown[]
}

export type SeasonalEntry = {
  month: number
  avgRevenueCents: number
}

export type RevenueForecast = {
  currentMonthActual: number
  currentMonthProjected: number
  monthlyForecast: MonthlyForecastEntry[]
  quarterlyForecast: QuarterlyForecast
  pipelineValue: PipelineValue
  seasonalPattern: SeasonalEntry[]
  dataMonthsAvailable: number
}

export type YoYComparison = {
  year1: number
  year2: number
  months: Array<{
    month: number
    label: string
    year1Cents: number
    year2Cents: number
    growthPercent: number | null
  }>
  year1TotalCents: number
  year2TotalCents: number
  ytdGrowthPercent: number | null
}

// -- Helpers --

const BOOKED_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed']
const PIPELINE_STATUSES = ['draft', 'proposed', 'accepted']
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7) // "YYYY-MM"
}

function getQuarter(month: string): number {
  const m = parseInt(month.split('-')[1], 10)
  return Math.ceil(m / 4) // Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12
}

function getQuarterFromMonth(m: number): number {
  return Math.ceil(m / 3)
}

// -- Server Actions --

/**
 * Get comprehensive revenue forecast with booked, pipeline, and historical data.
 * @param months Number of months to forecast ahead (default 6)
 */
export async function getRevenueForecast(months = 6): Promise<RevenueForecast> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  // Fetch all events with financial data (not cancelled)
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, status, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .not('event_date', 'is', null)

  const allEvents = events || []

  // Fetch financial summaries for completed/revenue events
  const { data: financials } = await supabase
    .from('event_financial_summary')
    .select('event_id, net_revenue_cents, quoted_price_cents, total_paid_cents')
    .eq('tenant_id', tenantId)

  const finMap = new Map<string, any>()
  for (const f of financials || []) {
    if (f.event_id) finMap.set(f.event_id, f)
  }

  // Helper to get revenue for an event (prefer actual from view, fall back to quoted)
  function getEventRevenue(evt: any): number {
    const fin = finMap.get(evt.id)
    if (fin?.net_revenue_cents != null && fin.net_revenue_cents > 0) {
      return fin.net_revenue_cents
    }
    if (fin?.total_paid_cents != null && fin.total_paid_cents > 0) {
      return fin.total_paid_cents
    }
    return evt.quoted_price_cents || 0
  }

  // 1. Current month actual (completed events this month)
  const currentMonthCompleted = allEvents.filter(
    (e: any) => e.status === 'completed' && e.event_date >= monthStart && e.event_date <= monthEnd
  )
  const currentMonthActual = currentMonthCompleted.reduce(
    (sum: number, e: any) => sum + getEventRevenue(e),
    0
  )

  // 2. Current month projected (booked/confirmed events this month, not yet completed)
  const currentMonthBooked = allEvents.filter(
    (e: any) =>
      BOOKED_STATUSES.includes(e.status) &&
      e.status !== 'completed' &&
      e.event_date >= monthStart &&
      e.event_date <= monthEnd
  )
  const currentMonthProjected =
    currentMonthActual +
    currentMonthBooked.reduce(
      (sum: number, e: any) => sum + weightByStage(getEventRevenue(e), e.status),
      0
    )

  // 3. Build historical monthly data for seasonal patterns
  const historicalByMonth: Record<string, number> = {}
  for (const e of allEvents) {
    if (e.status === 'completed' && e.event_date) {
      const key = getMonthKey(e.event_date)
      historicalByMonth[key] = (historicalByMonth[key] || 0) + getEventRevenue(e)
    }
  }

  const historicalData: MonthlyDataPoint[] = Object.entries(historicalByMonth)
    .map(([month, revenueCents]) => ({ month, revenueCents }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const seasonalIndex = calculateSeasonalIndex(historicalData)

  // 4. Build monthly forecast (next N months)
  const forecastMonths: MonthlyForecastEntry[] = []

  // Calculate trailing average for historical reference
  const trailingWindow = historicalData.slice(-6)
  const trailingAvg =
    trailingWindow.length > 0
      ? trailingWindow.reduce((s, d) => s + d.revenueCents, 0) / trailingWindow.length
      : 0

  // Include current month + next N months
  let fYear = now.getFullYear()
  let fMonth = now.getMonth() + 1

  for (let i = 0; i <= months; i++) {
    const monthKey = `${fYear}-${String(fMonth).padStart(2, '0')}`

    // Booked revenue for this month (confirmed/paid/in_progress)
    const bookedEvents = allEvents.filter(
      (e: any) => BOOKED_STATUSES.includes(e.status) && getMonthKey(e.event_date) === monthKey
    )
    const bookedRevenueCents = bookedEvents.reduce(
      (sum: number, e: any) => sum + getEventRevenue(e),
      0
    )

    // Pipeline revenue for this month (weighted)
    const pipelineEvents = allEvents.filter(
      (e: any) => PIPELINE_STATUSES.includes(e.status) && getMonthKey(e.event_date) === monthKey
    )
    const pipelineRevenueCents = pipelineEvents.reduce(
      (sum: number, e: any) => sum + weightByStage(getEventRevenue(e), e.status),
      0
    )

    // Historical average for this month
    const monthIdx = fMonth - 1
    const historicalAvgCents =
      trailingAvg > 0 ? Math.round(trailingAvg * seasonalIndex[monthIdx]) : 0

    forecastMonths.push({
      month: monthKey,
      bookedRevenueCents,
      pipelineRevenueCents,
      historicalAvgCents,
    })

    fMonth++
    if (fMonth > 12) {
      fMonth = 1
      fYear++
    }
  }

  // 5. Quarterly aggregation
  const quarterTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const fm of forecastMonths) {
    const q = getQuarterFromMonth(parseInt(fm.month.split('-')[1], 10))
    quarterTotals[q] += fm.bookedRevenueCents + fm.pipelineRevenueCents
  }

  const quarterlyForecast: QuarterlyForecast = {
    q1: quarterTotals[1],
    q2: quarterTotals[2],
    q3: quarterTotals[3],
    q4: quarterTotals[4],
  }

  // 6. Pipeline value breakdown by stage
  const futureEvents = allEvents.filter(
    (e: any) => e.event_date >= monthStart && PIPELINE_STATUSES.includes(e.status)
  )

  const stageMap: Record<string, { count: number; totalCents: number }> = {}
  for (const status of [
    ...PIPELINE_STATUSES,
    ...BOOKED_STATUSES.filter((s) => s !== 'completed'),
  ]) {
    stageMap[status] = { count: 0, totalCents: 0 }
  }

  const allFutureNonCompleted = allEvents.filter(
    (e: any) => e.event_date >= monthStart && e.status !== 'completed' && e.status !== 'cancelled'
  )

  for (const e of allFutureNonCompleted) {
    if (!stageMap[e.status]) {
      stageMap[e.status] = { count: 0, totalCents: 0 }
    }
    stageMap[e.status].count++
    stageMap[e.status].totalCents += getEventRevenue(e)
  }

  const byStage: PipelineStageBreakdown[] = Object.entries(stageMap)
    .filter(([_, v]) => v.count > 0)
    .map(([stage, v]) => ({
      stage,
      label: STAGE_LABELS[stage] || stage,
      count: v.count,
      totalCents: v.totalCents,
      weightedCents: Math.round(v.totalCents * (STAGE_WEIGHTS[stage] ?? 0)),
      probability: STAGE_WEIGHTS[stage] ?? 0,
    }))
    .sort((a, b) => b.probability - a.probability)

  const pipelineValue: PipelineValue = {
    totalCents: byStage.reduce((s, b) => s + b.totalCents, 0),
    weightedCents: byStage.reduce((s, b) => s + b.weightedCents, 0),
    byStage,
  }

  // 7. Seasonal pattern (12-month averages)
  const seasonalPattern: SeasonalEntry[] = seasonalIndex.map((idx, i) => ({
    month: i + 1,
    avgRevenueCents: Math.round(trailingAvg * idx),
  }))

  return {
    currentMonthActual,
    currentMonthProjected,
    monthlyForecast: forecastMonths,
    quarterlyForecast,
    pipelineValue,
    seasonalPattern,
    dataMonthsAvailable: historicalData.length,
  }
}

/**
 * Year-over-year revenue comparison.
 */
export async function getRevenueComparison(year1: number, year2: number): Promise<YoYComparison> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch completed events for both years
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, status, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', `${Math.min(year1, year2)}-01-01`)
    .lte('event_date', `${Math.max(year1, year2)}-12-31`)

  // Fetch financial summaries
  const eventIds = (events || []).map((e: any) => e.id)
  let finMap = new Map<string, any>()

  if (eventIds.length > 0) {
    const { data: financials } = await supabase
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_paid_cents')
      .in('event_id', eventIds)

    for (const f of financials || []) {
      if (f.event_id) finMap.set(f.event_id, f)
    }
  }

  function getRevenue(evt: any): number {
    const fin = finMap.get(evt.id)
    if (fin?.net_revenue_cents != null && fin.net_revenue_cents > 0) return fin.net_revenue_cents
    if (fin?.total_paid_cents != null && fin.total_paid_cents > 0) return fin.total_paid_cents
    return evt.quoted_price_cents || 0
  }

  // Group by year and month
  const byYearMonth: Record<string, number> = {}
  for (const e of events || []) {
    const key = getMonthKey(e.event_date)
    byYearMonth[key] = (byYearMonth[key] || 0) + getRevenue(e)
  }

  const months = []
  let year1Total = 0
  let year2Total = 0

  for (let m = 1; m <= 12; m++) {
    const key1 = `${year1}-${String(m).padStart(2, '0')}`
    const key2 = `${year2}-${String(m).padStart(2, '0')}`
    const y1Cents = byYearMonth[key1] || 0
    const y2Cents = byYearMonth[key2] || 0

    year1Total += y1Cents
    year2Total += y2Cents

    let growthPercent: number | null = null
    if (y1Cents > 0) {
      growthPercent = Math.round(((y2Cents - y1Cents) / y1Cents) * 100)
    } else if (y2Cents > 0) {
      growthPercent = 100 // went from 0 to something
    }

    months.push({
      month: m,
      label: MONTH_LABELS[m - 1],
      year1Cents: y1Cents,
      year2Cents: y2Cents,
      growthPercent,
    })
  }

  return {
    year1,
    year2,
    months,
    year1TotalCents: year1Total,
    year2TotalCents: year2Total,
    ytdGrowthPercent:
      year1Total > 0
        ? Math.round(((year2Total - year1Total) / year1Total) * 100)
        : year2Total > 0
          ? 100
          : null,
  }
}
