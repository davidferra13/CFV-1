'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export type MonthlyComparison = {
  month: number // 1-12
  monthName: string
  year1Value: number
  year2Value: number
  changePercent: number | null // null if year1 was 0
}

export type YoyRevenueResult = {
  year1: number
  year2: number
  monthly: MonthlyComparison[]
  year1Total: number // cents
  year2Total: number // cents
  totalChangePercent: number | null
}

export type YoyEventCountResult = {
  year1: number
  year2: number
  monthly: MonthlyComparison[]
  year1Total: number
  year2Total: number
  totalChangePercent: number | null
}

export type ClientGrowthMonth = {
  month: number
  monthName: string
  year1New: number
  year1Returning: number
  year2New: number
  year2Returning: number
}

export type YoyClientGrowthResult = {
  year1: number
  year2: number
  monthly: ClientGrowthMonth[]
}

export type YoyAvgEventValueResult = {
  year1: number
  year2: number
  monthly: MonthlyComparison[]
  year1Avg: number // cents
  year2Avg: number // cents
  totalChangePercent: number | null
}

export type SeasonalMonth = {
  month: number
  monthName: string
  avgEventCount: number
  avgRevenueCents: number
  totalEventCount: number
  totalRevenueCents: number
  yearsOfData: number
}

export type SeasonalTrendsResult = {
  months: SeasonalMonth[]
  peakMonth: number
  slowestMonth: number
  yearsAnalyzed: number[]
}

export type GrowthMetricsResult = {
  year: number
  previousYear: number
  revenue: { current: number; previous: number; changePercent: number | null }
  eventCount: { current: number; previous: number; changePercent: number | null }
  avgEventValue: { current: number; previous: number; changePercent: number | null }
  clientCount: { current: number; previous: number; changePercent: number | null }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
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

function calcChangePercent(prev: number, curr: number): number | null {
  if (prev === 0) return curr > 0 ? null : null // can't compute % change from 0
  return Math.round(((curr - prev) / prev) * 10000) / 100
}

function emptyMonthlyMap(): Map<number, number> {
  const m = new Map<number, number>()
  for (let i = 1; i <= 12; i++) m.set(i, 0)
  return m
}

// ─── Revenue Comparison ─────────────────────────────────────────────────────

export async function getYoyRevenue(year1: number, year2: number): Promise<YoyRevenueResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch ledger entries for both years (revenue = payments received, not refunds)
  const { data: entries, error } = await db
    .from('ledger_entries')
    .select('amount_cents, is_refund, created_at')
    .eq('tenant_id', tenantId)
    .eq('is_refund', false)
    .gte('created_at', `${Math.min(year1, year2)}-01-01`)
    .lt('created_at', `${Math.max(year1, year2) + 1}-01-01`)

  if (error) throw new Error(`Failed to fetch revenue data: ${error.message}`)

  const y1Map = emptyMonthlyMap()
  const y2Map = emptyMonthlyMap()

  for (const entry of entries ?? []) {
    const d = new Date(entry.created_at)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    if (year === year1) y1Map.set(month, (y1Map.get(month) ?? 0) + entry.amount_cents)
    if (year === year2) y2Map.set(month, (y2Map.get(month) ?? 0) + entry.amount_cents)
  }

  const monthly: MonthlyComparison[] = []
  let year1Total = 0
  let year2Total = 0

  for (let m = 1; m <= 12; m++) {
    const v1 = y1Map.get(m) ?? 0
    const v2 = y2Map.get(m) ?? 0
    year1Total += v1
    year2Total += v2
    monthly.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      year1Value: v1,
      year2Value: v2,
      changePercent: calcChangePercent(v1, v2),
    })
  }

  return {
    year1,
    year2,
    monthly,
    year1Total,
    year2Total,
    totalChangePercent: calcChangePercent(year1Total, year2Total),
  }
}

// ─── Event Count Comparison ─────────────────────────────────────────────────

export async function getYoyEventCount(year1: number, year2: number): Promise<YoyEventCountResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Count events by month for both years (exclude drafts and cancelled)
  const { data: events, error } = await db
    .from('events')
    .select('event_date, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("draft","cancelled")')
    .gte('event_date', `${Math.min(year1, year2)}-01-01`)
    .lt('event_date', `${Math.max(year1, year2) + 1}-01-01`)

  if (error) throw new Error(`Failed to fetch event data: ${error.message}`)

  const y1Map = emptyMonthlyMap()
  const y2Map = emptyMonthlyMap()

  for (const evt of events ?? []) {
    const d = new Date(evt.event_date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    if (year === year1) y1Map.set(month, (y1Map.get(month) ?? 0) + 1)
    if (year === year2) y2Map.set(month, (y2Map.get(month) ?? 0) + 1)
  }

  const monthly: MonthlyComparison[] = []
  let year1Total = 0
  let year2Total = 0

  for (let m = 1; m <= 12; m++) {
    const v1 = y1Map.get(m) ?? 0
    const v2 = y2Map.get(m) ?? 0
    year1Total += v1
    year2Total += v2
    monthly.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      year1Value: v1,
      year2Value: v2,
      changePercent: calcChangePercent(v1, v2),
    })
  }

  return {
    year1,
    year2,
    monthly,
    year1Total,
    year2Total,
    totalChangePercent: calcChangePercent(year1Total, year2Total),
  }
}

// ─── Client Growth Comparison ───────────────────────────────────────────────

export async function getYoyClientGrowth(
  year1: number,
  year2: number
): Promise<YoyClientGrowthResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch all events with client info for both years
  const { data: events, error } = await db
    .from('events')
    .select('event_date, client_id, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("draft","cancelled")')
    .gte('event_date', `${Math.min(year1, year2)}-01-01`)
    .lt('event_date', `${Math.max(year1, year2) + 1}-01-01`)
    .order('event_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch client growth data: ${error.message}`)

  // Also fetch events before year1 to know which clients are "returning"
  const { data: priorEvents } = await db
    .from('events')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("draft","cancelled")')
    .lt('event_date', `${Math.min(year1, year2)}-01-01`)

  const priorClients = new Set((priorEvents ?? []).map((e: any) => e.client_id))

  // Track which clients have been seen before in chronological order
  const seenClients = new Set(priorClients)

  // Group events by year and month
  type MonthData = { newClients: Set<string>; returningClients: Set<string> }
  const y1Months = new Map<number, MonthData>()
  const y2Months = new Map<number, MonthData>()
  for (let i = 1; i <= 12; i++) {
    y1Months.set(i, { newClients: new Set(), returningClients: new Set() })
    y2Months.set(i, { newClients: new Set(), returningClients: new Set() })
  }

  // Process events in chronological order
  for (const evt of events ?? []) {
    const d = new Date(evt.event_date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const target = year === year1 ? y1Months : y2Months
    const data = target.get(month)!

    if (seenClients.has(evt.client_id)) {
      data.returningClients.add(evt.client_id)
    } else {
      data.newClients.add(evt.client_id)
      seenClients.add(evt.client_id)
    }
  }

  const monthly: ClientGrowthMonth[] = []
  for (let m = 1; m <= 12; m++) {
    const y1 = y1Months.get(m)!
    const y2 = y2Months.get(m)!
    monthly.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      year1New: y1.newClients.size,
      year1Returning: y1.returningClients.size,
      year2New: y2.newClients.size,
      year2Returning: y2.returningClients.size,
    })
  }

  return { year1, year2, monthly }
}

// ─── Average Event Value Comparison ─────────────────────────────────────────

export async function getYoyAvgEventValue(
  year1: number,
  year2: number
): Promise<YoyAvgEventValueResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch events with quoted prices
  const { data: events, error } = await db
    .from('events')
    .select('event_date, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("draft","cancelled")')
    .not('quoted_price_cents', 'is', null)
    .gte('event_date', `${Math.min(year1, year2)}-01-01`)
    .lt('event_date', `${Math.max(year1, year2) + 1}-01-01`)

  if (error) throw new Error(`Failed to fetch avg event value data: ${error.message}`)

  const y1Map = emptyMonthlyMap()
  const y2Map = emptyMonthlyMap()
  const y1Count = emptyMonthlyMap()
  const y2Count = emptyMonthlyMap()

  for (const evt of events ?? []) {
    const d = new Date(evt.event_date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const price = evt.quoted_price_cents ?? 0
    if (year === year1) {
      y1Map.set(month, (y1Map.get(month) ?? 0) + price)
      y1Count.set(month, (y1Count.get(month) ?? 0) + 1)
    }
    if (year === year2) {
      y2Map.set(month, (y2Map.get(month) ?? 0) + price)
      y2Count.set(month, (y2Count.get(month) ?? 0) + 1)
    }
  }

  const monthly: MonthlyComparison[] = []
  let y1TotalValue = 0
  let y2TotalValue = 0
  let y1TotalCount = 0
  let y2TotalCount = 0

  for (let m = 1; m <= 12; m++) {
    const c1 = y1Count.get(m) ?? 0
    const c2 = y2Count.get(m) ?? 0
    const v1 = c1 > 0 ? Math.round((y1Map.get(m) ?? 0) / c1) : 0
    const v2 = c2 > 0 ? Math.round((y2Map.get(m) ?? 0) / c2) : 0
    y1TotalValue += y1Map.get(m) ?? 0
    y2TotalValue += y2Map.get(m) ?? 0
    y1TotalCount += c1
    y2TotalCount += c2
    monthly.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      year1Value: v1,
      year2Value: v2,
      changePercent: calcChangePercent(v1, v2),
    })
  }

  const year1Avg = y1TotalCount > 0 ? Math.round(y1TotalValue / y1TotalCount) : 0
  const year2Avg = y2TotalCount > 0 ? Math.round(y2TotalValue / y2TotalCount) : 0

  return {
    year1,
    year2,
    monthly,
    year1Avg,
    year2Avg,
    totalChangePercent: calcChangePercent(year1Avg, year2Avg),
  }
}

// ─── Seasonal Trends ────────────────────────────────────────────────────────

export async function getSeasonalTrends(yearsBack: number = 3): Promise<SeasonalTrendsResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const currentYear = new Date().getFullYear()
  const startYear = currentYear - yearsBack + 1

  // Fetch events
  const { data: events, error: evtError } = await db
    .from('events')
    .select('event_date, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("draft","cancelled")')
    .gte('event_date', `${startYear}-01-01`)
    .lte('event_date', `${currentYear}-12-31`)

  if (evtError) throw new Error(`Failed to fetch seasonal event data: ${evtError.message}`)

  // Fetch revenue
  const { data: ledger, error: ledgerError } = await db
    .from('ledger_entries')
    .select('amount_cents, is_refund, created_at')
    .eq('tenant_id', tenantId)
    .eq('is_refund', false)
    .gte('created_at', `${startYear}-01-01`)
    .lte('created_at', `${currentYear}-12-31`)

  if (ledgerError) throw new Error(`Failed to fetch seasonal revenue data: ${ledgerError.message}`)

  // Track which years have data
  const yearsWithData = new Set<number>()

  // Aggregate event counts by month
  const monthEventCounts = emptyMonthlyMap()
  for (const evt of events ?? []) {
    const d = new Date(evt.event_date)
    const month = d.getMonth() + 1
    monthEventCounts.set(month, (monthEventCounts.get(month) ?? 0) + 1)
    yearsWithData.add(d.getFullYear())
  }

  // Aggregate revenue by month
  const monthRevenue = emptyMonthlyMap()
  for (const entry of ledger ?? []) {
    const d = new Date(entry.created_at)
    const month = d.getMonth() + 1
    monthRevenue.set(month, (monthRevenue.get(month) ?? 0) + entry.amount_cents)
    yearsWithData.add(d.getFullYear())
  }

  const numYears = Math.max(yearsWithData.size, 1)
  const yearsAnalyzed = Array.from(yearsWithData).sort()

  let peakMonth = 1
  let peakCount = 0
  let slowestMonth = 1
  let slowestCount = Infinity

  const months: SeasonalMonth[] = []
  for (let m = 1; m <= 12; m++) {
    const totalEvents = monthEventCounts.get(m) ?? 0
    const totalRevenue = monthRevenue.get(m) ?? 0
    const avgEvents = Math.round((totalEvents / numYears) * 10) / 10
    const avgRevenue = Math.round(totalRevenue / numYears)

    if (totalEvents > peakCount) {
      peakCount = totalEvents
      peakMonth = m
    }
    if (totalEvents < slowestCount) {
      slowestCount = totalEvents
      slowestMonth = m
    }

    months.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      avgEventCount: avgEvents,
      avgRevenueCents: avgRevenue,
      totalEventCount: totalEvents,
      totalRevenueCents: totalRevenue,
      yearsOfData: numYears,
    })
  }

  return { months, peakMonth, slowestMonth, yearsAnalyzed }
}

// ─── Growth Metrics ─────────────────────────────────────────────────────────

export async function getGrowthMetrics(year: number): Promise<GrowthMetricsResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const previousYear = year - 1

  // Fetch revenue for both years
  const { data: ledger, error: ledgerError } = await db
    .from('ledger_entries')
    .select('amount_cents, is_refund, created_at')
    .eq('tenant_id', tenantId)
    .eq('is_refund', false)
    .gte('created_at', `${previousYear}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)

  if (ledgerError) throw new Error(`Failed to fetch growth revenue data: ${ledgerError.message}`)

  // Fetch events for both years
  const { data: events, error: evtError } = await db
    .from('events')
    .select('event_date, client_id, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("draft","cancelled")')
    .gte('event_date', `${previousYear}-01-01`)
    .lt('event_date', `${year + 1}-01-01`)

  if (evtError) throw new Error(`Failed to fetch growth event data: ${evtError.message}`)

  // Revenue
  let currRevenue = 0
  let prevRevenue = 0
  for (const entry of ledger ?? []) {
    const y = new Date(entry.created_at).getFullYear()
    if (y === year) currRevenue += entry.amount_cents
    if (y === previousYear) prevRevenue += entry.amount_cents
  }

  // Events + clients + avg value
  let currEventCount = 0
  let prevEventCount = 0
  let currValueSum = 0
  let prevValueSum = 0
  const currClients = new Set<string>()
  const prevClients = new Set<string>()

  for (const evt of events ?? []) {
    const y = new Date(evt.event_date).getFullYear()
    if (y === year) {
      currEventCount++
      currClients.add(evt.client_id)
      currValueSum += evt.quoted_price_cents ?? 0
    }
    if (y === previousYear) {
      prevEventCount++
      prevClients.add(evt.client_id)
      prevValueSum += evt.quoted_price_cents ?? 0
    }
  }

  const currAvgValue = currEventCount > 0 ? Math.round(currValueSum / currEventCount) : 0
  const prevAvgValue = prevEventCount > 0 ? Math.round(prevValueSum / prevEventCount) : 0

  return {
    year,
    previousYear,
    revenue: {
      current: currRevenue,
      previous: prevRevenue,
      changePercent: calcChangePercent(prevRevenue, currRevenue),
    },
    eventCount: {
      current: currEventCount,
      previous: prevEventCount,
      changePercent: calcChangePercent(prevEventCount, currEventCount),
    },
    avgEventValue: {
      current: currAvgValue,
      previous: prevAvgValue,
      changePercent: calcChangePercent(prevAvgValue, currAvgValue),
    },
    clientCount: {
      current: currClients.size,
      previous: prevClients.size,
      changePercent: calcChangePercent(prevClients.size, currClients.size),
    },
  }
}
