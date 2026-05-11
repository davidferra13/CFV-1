import { createServerClient } from '@/lib/db/server'
import { STAGE_WEIGHTS } from '@/lib/finance/forecast-calculator'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MonthlyForecast = {
  month: string // 'YYYY-MM'
  monthLabel: string // 'Jun 2026'
  confirmed: number // cents, events with signed contracts/deposits
  probable: number // cents, active quotes * pipeline stage probability
  projected: number // cents, historical fill based on seasonal pattern
  total: number // cents, sum of all three
  confidence: number // 0-1, how much of the forecast is backed by real data
}

export type BookingVelocityMonth = {
  month: string // 'YYYY-MM'
  monthLabel: string
  eventsBooked: number
}

export type BookingVelocity = {
  months: BookingVelocityMonth[]
  avgPerMonth: number
  trend: 'accelerating' | 'decelerating' | 'steady'
  trendPercent: number // percent change recent vs prior
}

export type SeasonalPatternMonth = {
  month: number // 1-12
  monthLabel: string
  avgRevenueCents: number
  eventCount: number
}

export type RevenueHealth = {
  currentMonthLabel: string
  actualCents: number
  targetCents: number
  pacePct: number // actual / prorated target * 100
  paceStatus: 'ahead' | 'on_track' | 'behind' | 'critical'
  daysElapsed: number
  daysInMonth: number
  projectedMonthEndCents: number
}

export type RevenueForecastResult = {
  monthlyForecast: MonthlyForecast[]
  bookingVelocity: BookingVelocity
  seasonalPattern: SeasonalPatternMonth[]
  revenueHealth: RevenueHealth
  insights: string[]
  generatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const BOOKED_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed']
const PIPELINE_STATUSES = ['draft', 'proposed', 'accepted']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function generateRevenueForecast(
  tenantId: string,
  months: number = 6
): Promise<RevenueForecastResult> {
  const db: any = createServerClient()
  const now = new Date()
  const safeMonths = Math.max(3, Math.min(12, months))

  // Fetch all non-cancelled events and financial summaries in parallel
  const [{ data: events }, { data: financials }, { data: inquiries }] = await Promise.all([
    db
      .from('events')
      .select('id, event_date, status, quoted_price_cents, created_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .not('event_date', 'is', null),
    db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_paid_cents')
      .eq('tenant_id', tenantId),
    db
      .from('inquiries')
      .select('id, status, confirmed_budget_cents, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted']),
  ])

  // Build financial lookup
  const finMap = new Map<string, { net: number; paid: number }>()
  for (const f of financials ?? []) {
    if (f.event_id) {
      finMap.set(f.event_id, {
        net: f.net_revenue_cents ?? 0,
        paid: f.total_paid_cents ?? 0,
      })
    }
  }

  function getRevenue(event: any): number {
    const fin = finMap.get(event.id)
    if (fin?.net && fin.net > 0) return fin.net
    if (fin?.paid && fin.paid > 0) return fin.paid
    return event.quoted_price_cents || 0
  }

  // Normalize events
  const allEvents: {
    id: string
    status: string
    eventDate: string
    monthKey: string
    createdAt: string
    revenueCents: number
  }[] = (events ?? []).map((e: any) => ({
    id: e.id as string,
    status: e.status as string,
    eventDate: String(e.event_date).substring(0, 10),
    monthKey: String(e.event_date).substring(0, 7),
    createdAt: e.created_at as string,
    revenueCents: getRevenue(e),
  }))

  // ── Monthly Forecast ─────────────────────────────────────────────────────

  // Historical monthly revenue (completed events grouped by month)
  const historicalByMonth = new Map<string, number>()
  const historicalEventCountByMonth = new Map<string, number>()
  for (const e of allEvents) {
    if (e.status === 'completed') {
      historicalByMonth.set(e.monthKey, (historicalByMonth.get(e.monthKey) ?? 0) + e.revenueCents)
      historicalEventCountByMonth.set(
        e.monthKey,
        (historicalEventCountByMonth.get(e.monthKey) ?? 0) + 1
      )
    }
  }

  // Seasonal index: average revenue per calendar month (1-12)
  const monthTotals: number[][] = Array.from({ length: 12 }, () => [])
  const monthEventCounts: number[][] = Array.from({ length: 12 }, () => [])
  historicalByMonth.forEach((rev, mk) => {
    const m = parseInt(mk.split('-')[1], 10) - 1
    monthTotals[m].push(rev)
  })
  historicalEventCountByMonth.forEach((cnt, mk) => {
    const m = parseInt(mk.split('-')[1], 10) - 1
    monthEventCounts[m].push(cnt)
  })

  const seasonalAvg = monthTotals.map((values) =>
    values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0
  )
  const overallMonthlyAvg =
    seasonalAvg.filter((v) => v > 0).length > 0
      ? Math.round(
          seasonalAvg.filter((v) => v > 0).reduce((s, v) => s + v, 0) /
            seasonalAvg.filter((v) => v > 0).length
        )
      : 0

  // Build forecast for next N months
  const monthlyForecast: MonthlyForecast[] = []
  for (let i = 0; i < safeMonths; i++) {
    const forecastDate = addMonths(now, i)
    const mk = monthKey(forecastDate)
    const mIdx = forecastDate.getMonth()

    // Confirmed: booked/paid/confirmed events in this month
    const confirmedCents = allEvents
      .filter((e) => BOOKED_STATUSES.includes(e.status) && e.monthKey === mk)
      .reduce((sum, e) => sum + e.revenueCents, 0)

    // Probable: pipeline events weighted by stage probability
    const probableCents = allEvents
      .filter((e) => PIPELINE_STATUSES.includes(e.status) && e.monthKey === mk)
      .reduce((sum, e) => sum + Math.round(e.revenueCents * (STAGE_WEIGHTS[e.status] ?? 0)), 0)

    // For the current month, also include weighted inquiry value
    let inquiryProbableCents = 0
    if (i === 0) {
      inquiryProbableCents = (inquiries ?? []).reduce(
        (sum: number, inq: any) => sum + Math.round((inq.confirmed_budget_cents ?? 0) * 0.15),
        0
      )
    }

    // Projected: historical seasonal fill (only for months beyond the current one)
    // For the current month, projected is based on pace extrapolation
    let projectedCents = 0
    if (i === 0) {
      // Current month: extrapolate from actual pace
      const daysPassed = Math.max(1, now.getDate())
      const totalDays = daysInMonth(now.getFullYear(), now.getMonth() + 1)
      const actualThisMonth = allEvents
        .filter((e) => e.status === 'completed' && e.monthKey === mk)
        .reduce((sum, e) => sum + e.revenueCents, 0)
      const paceProjection = Math.round((actualThisMonth / daysPassed) * totalDays)
      projectedCents = Math.max(
        0,
        paceProjection - confirmedCents - probableCents - inquiryProbableCents
      )
    } else {
      // Future months: seasonal average minus what is already booked/probable
      const seasonalBase = seasonalAvg[mIdx] > 0 ? seasonalAvg[mIdx] : overallMonthlyAvg
      projectedCents = Math.max(0, seasonalBase - confirmedCents - probableCents)
    }

    const total = confirmedCents + probableCents + inquiryProbableCents + projectedCents
    // Confidence: higher when more revenue is backed by real bookings
    const visibleRevenue = confirmedCents + probableCents + inquiryProbableCents
    const confidence = total > 0 ? Math.min(1, Math.round((visibleRevenue / total) * 100) / 100) : 0

    monthlyForecast.push({
      month: mk,
      monthLabel: monthLabel(mk),
      confirmed: confirmedCents,
      probable: probableCents + inquiryProbableCents,
      projected: projectedCents,
      total,
      confidence,
    })
  }

  // ── Booking Velocity ───────────────────────────────────────────────────────

  const velocityMonths: BookingVelocityMonth[] = []
  for (let i = 11; i >= 0; i--) {
    const d = addMonths(now, -i)
    const mk = monthKey(d)
    const startDate = `${mk}-01`
    const endDate = `${mk}-${String(daysInMonth(d.getFullYear(), d.getMonth() + 1)).padStart(2, '0')}`

    // Count events whose created_at falls in this month (events booked in this month)
    const count = allEvents.filter((e) => {
      if (!e.createdAt) return false
      const created = String(e.createdAt).substring(0, 10)
      return created >= startDate && created <= endDate && !['cancelled'].includes(e.status)
    }).length

    velocityMonths.push({
      month: mk,
      monthLabel: monthLabel(mk),
      eventsBooked: count,
    })
  }

  const totalVelocity = velocityMonths.reduce((s, m) => s + m.eventsBooked, 0)
  const avgPerMonth =
    velocityMonths.length > 0 ? Math.round((totalVelocity / velocityMonths.length) * 10) / 10 : 0

  // Trend: compare last 3 months vs prior 3 months
  const recent3 = velocityMonths.slice(-3).reduce((s, m) => s + m.eventsBooked, 0) / 3
  const prior3 = velocityMonths.slice(-6, -3).reduce((s, m) => s + m.eventsBooked, 0) / 3
  let velocityTrend: BookingVelocity['trend'] = 'steady'
  let trendPercent = 0
  if (prior3 > 0) {
    trendPercent = Math.round(((recent3 - prior3) / prior3) * 100)
    if (trendPercent > 10) velocityTrend = 'accelerating'
    else if (trendPercent < -10) velocityTrend = 'decelerating'
  } else if (recent3 > 0) {
    trendPercent = 100
    velocityTrend = 'accelerating'
  }

  const bookingVelocity: BookingVelocity = {
    months: velocityMonths,
    avgPerMonth,
    trend: velocityTrend,
    trendPercent,
  }

  // ── Seasonal Pattern ───────────────────────────────────────────────────────

  const seasonalPattern: SeasonalPatternMonth[] = MONTH_LABELS.map((label, idx) => ({
    month: idx + 1,
    monthLabel: label,
    avgRevenueCents: seasonalAvg[idx],
    eventCount:
      monthEventCounts[idx].length > 0
        ? Math.round(
            monthEventCounts[idx].reduce((s, v) => s + v, 0) / monthEventCounts[idx].length
          )
        : 0,
  }))

  // ── Revenue Health ─────────────────────────────────────────────────────────

  const revenueHealth = await buildRevenueHealth(tenantId, db, allEvents, now, overallMonthlyAvg)

  // ── Insights ───────────────────────────────────────────────────────────────

  const insights = buildInsights(monthlyForecast, bookingVelocity, seasonalPattern, revenueHealth)

  return {
    monthlyForecast,
    bookingVelocity,
    seasonalPattern,
    revenueHealth,
    insights,
    generatedAt: now.toISOString(),
  }
}

// ─── Revenue Health ──────────────────────────────────────────────────────────

async function buildRevenueHealth(
  tenantId: string,
  db: any,
  allEvents: Array<{ status: string; monthKey: string; revenueCents: number }>,
  now: Date,
  overallMonthlyAvg: number
): Promise<RevenueHealth> {
  const currentMk = monthKey(now)
  const daysPassed = now.getDate()
  const totalDays = daysInMonth(now.getFullYear(), now.getMonth() + 1)

  // Actual revenue this month from completed events + payments received
  const actualCents = allEvents
    .filter((e) => e.monthKey === currentMk && BOOKED_STATUSES.includes(e.status))
    .reduce((sum, e) => sum + e.revenueCents, 0)

  // Try to get target from chef_preferences
  let targetCents = 0
  try {
    const { data: prefs } = await db
      .from('chef_preferences')
      .select('target_monthly_revenue_cents')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    targetCents = prefs?.target_monthly_revenue_cents ?? 0
  } catch {
    // table may not exist; fall back
  }

  // If no target set, use overall monthly average as baseline
  if (targetCents <= 0) {
    targetCents = overallMonthlyAvg > 0 ? overallMonthlyAvg : 0
  }

  // Pace calculation
  const proratedTarget = targetCents > 0 ? Math.round((targetCents * daysPassed) / totalDays) : 0
  const pacePct =
    proratedTarget > 0
      ? Math.round((actualCents / proratedTarget) * 100)
      : actualCents > 0
        ? 100
        : 0

  let paceStatus: RevenueHealth['paceStatus'] = 'on_track'
  if (pacePct >= 110) paceStatus = 'ahead'
  else if (pacePct >= 85) paceStatus = 'on_track'
  else if (pacePct >= 50) paceStatus = 'behind'
  else paceStatus = 'critical'

  const projectedMonthEndCents =
    daysPassed > 0 ? Math.round((actualCents / daysPassed) * totalDays) : 0

  return {
    currentMonthLabel: monthLabel(currentMk),
    actualCents,
    targetCents,
    pacePct,
    paceStatus,
    daysElapsed: daysPassed,
    daysInMonth: totalDays,
    projectedMonthEndCents,
  }
}

// ─── Booking Velocity (standalone) ───────────────────────────────────────────

export async function getBookingVelocity(tenantId: string): Promise<BookingVelocity> {
  const result = await generateRevenueForecast(tenantId, 3)
  return result.bookingVelocity
}

// ─── Seasonal Pattern (standalone) ───────────────────────────────────────────

export async function getSeasonalPattern(tenantId: string): Promise<SeasonalPatternMonth[]> {
  const result = await generateRevenueForecast(tenantId, 3)
  return result.seasonalPattern
}

// ─── Revenue Health (standalone) ─────────────────────────────────────────────

export async function getRevenueHealth(tenantId: string): Promise<RevenueHealth> {
  const result = await generateRevenueForecast(tenantId, 3)
  return result.revenueHealth
}

// ─── Insights Builder ────────────────────────────────────────────────────────

function buildInsights(
  forecast: MonthlyForecast[],
  velocity: BookingVelocity,
  seasonal: SeasonalPatternMonth[],
  health: RevenueHealth
): string[] {
  const insights: string[] = []

  // Pace insight
  if (health.paceStatus === 'ahead') {
    insights.push(`You are ${health.pacePct - 100}% ahead of pace for ${health.currentMonthLabel}.`)
  } else if (health.paceStatus === 'behind') {
    insights.push(
      `Revenue is ${100 - health.pacePct}% behind pace for ${health.currentMonthLabel}. Consider pushing open dates.`
    )
  } else if (health.paceStatus === 'critical') {
    insights.push(
      `Revenue is critically behind for ${health.currentMonthLabel}. Immediate action needed.`
    )
  }

  // Velocity trend
  if (velocity.trend === 'accelerating' && velocity.trendPercent > 0) {
    insights.push(`Booking rate is ${velocity.trendPercent}% above the prior quarter.`)
  } else if (velocity.trend === 'decelerating' && velocity.trendPercent < 0) {
    insights.push(
      `Booking rate has slowed ${Math.abs(velocity.trendPercent)}% compared to the prior quarter.`
    )
  }

  // Quarterly projection
  const quarterMonths = forecast.slice(0, 3)
  if (quarterMonths.length === 3) {
    const qTotal = quarterMonths.reduce((s, m) => s + m.total, 0)
    if (qTotal > 0) {
      const dollars = Math.round(qTotal / 100).toLocaleString('en-US')
      const confirmedPct = Math.round(
        (quarterMonths.reduce((s, m) => s + m.confirmed, 0) / qTotal) * 100
      )
      insights.push(
        `Next quarter projected at $${dollars}, with ${confirmedPct}% already confirmed.`
      )
    }
  }

  // Best month
  const bestSeasonal = seasonal.reduce(
    (best, m) => (m.avgRevenueCents > best.avgRevenueCents ? m : best),
    seasonal[0]
  )
  if (bestSeasonal && bestSeasonal.avgRevenueCents > 0) {
    insights.push(`Historically, ${bestSeasonal.monthLabel} is your strongest month.`)
  }

  // Low confidence warning
  const lowConfMonths = forecast.filter((m) => m.confidence < 0.3 && m.total > 0)
  if (lowConfMonths.length > 0) {
    insights.push(
      `${lowConfMonths.length} month${lowConfMonths.length > 1 ? 's' : ''} in the forecast have low confidence. More bookings will sharpen the projection.`
    )
  }

  return insights.slice(0, 5)
}
