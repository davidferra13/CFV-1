'use server'

// Booking Seasonality Analysis
// Groups a chef's historical events by calendar month to identify peak and quiet periods.
// Used on the dashboard Business Snapshot section and as a context hint in the inquiry pipeline.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type MonthSeasonality = {
  month: number // 1-12
  monthName: string // 'Jan', 'Feb', etc.
  shortName: string // 'J', 'F', etc. — for compact sparkline labels
  eventCount: number
  avgRevenueCents: number | null // average paid amount across events in this month
}

export type UpcomingSeasonSignal = {
  month: number
  monthName: string
  monthsAway: number // 1 = next month, 2 = month after, etc.
}

export type BookingSeasonality = {
  months: MonthSeasonality[] // all 12 months (0 counts for months with no data)
  peakMonths: number[] // month numbers (1-12) of the top 3 busiest months
  quietMonths: number[] // month numbers (1-12) of the 3 quietest months (with data)
  upcomingPeak: UpcomingSeasonSignal | null // next peak month within the next 5 months
  upcomingQuiet: UpcomingSeasonSignal | null // next quiet month within the next 5 months
  totalEventsAnalyzed: number
  yearsOfData: number
  hasEnoughData: boolean // true when 3+ months have data and 5+ events total
}

// ── Constants ──────────────────────────────────────────────────────────────────

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
const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// ── Server Action ──────────────────────────────────────────────────────────────

export async function getBookingSeasonality(): Promise<BookingSeasonality> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch all completed + in-progress events (i.e., real bookings, not drafts)
  // supabase because amount_paid_cents is not yet in the generated types
  const { data: events } = await supabase
    .from('events')
    .select('event_date, amount_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'in_progress', 'confirmed', 'paid', 'accepted'])
    .not('event_date', 'is', null)

  const empty = buildEmpty()

  if (!events || events.length === 0) {
    return empty
  }

  // Group by month (1-12) across all years
  const byMonth = new Map<
    number,
    { count: number; revenueSum: number; revenueCount: number; years: Set<number> }
  >()
  for (let m = 1; m <= 12; m++) {
    byMonth.set(m, { count: 0, revenueSum: 0, revenueCount: 0, years: new Set() })
  }

  for (const event of events) {
    if (!event.event_date) continue
    const d = new Date(event.event_date + 'T12:00:00Z')
    const month = d.getUTCMonth() + 1 // 1-12
    const year = d.getUTCFullYear()
    const entry = byMonth.get(month)!
    entry.count++
    entry.years.add(year)
    if (event.amount_paid_cents && event.amount_paid_cents > 0) {
      entry.revenueSum += event.amount_paid_cents
      entry.revenueCount++
    }
  }

  // Build the 12-month array
  const months: MonthSeasonality[] = []
  const allYears = new Set<number>()

  for (let m = 1; m <= 12; m++) {
    const entry = byMonth.get(m)!
    entry.years.forEach((y) => allYears.add(y))
    months.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      shortName: MONTH_SHORT[m - 1],
      eventCount: entry.count,
      avgRevenueCents:
        entry.revenueCount > 0 ? Math.round(entry.revenueSum / entry.revenueCount) : null,
    })
  }

  const totalEventsAnalyzed = events.length
  const yearsOfData = allYears.size
  const monthsWithData = months.filter((m) => m.eventCount > 0)
  const hasEnoughData = monthsWithData.length >= 3 && totalEventsAnalyzed >= 5

  if (!hasEnoughData) {
    return {
      months,
      peakMonths: [],
      quietMonths: [],
      upcomingPeak: null,
      upcomingQuiet: null,
      totalEventsAnalyzed,
      yearsOfData,
      hasEnoughData: false,
    }
  }

  // Peak = top 3 months by event count (among months with data)
  const sorted = [...monthsWithData].sort((a, b) => b.eventCount - a.eventCount)
  const peakMonths = sorted.slice(0, Math.min(3, sorted.length)).map((m) => m.month)

  // Quiet = bottom 3 months by event count (among months with data, excluding peak)
  const nonPeak = sorted.filter((m) => !peakMonths.includes(m.month))
  const quietMonths = nonPeak.slice(-Math.min(3, nonPeak.length)).map((m) => m.month)

  // Look ahead 1–5 months to detect upcoming peak or quiet window
  const today = new Date()
  const currentMonth = today.getMonth() + 1 // 1-12

  let upcomingPeak: UpcomingSeasonSignal | null = null
  let upcomingQuiet: UpcomingSeasonSignal | null = null

  for (let ahead = 1; ahead <= 5; ahead++) {
    const m = ((currentMonth - 1 + ahead) % 12) + 1 // wrap around

    if (!upcomingPeak && peakMonths.includes(m)) {
      upcomingPeak = { month: m, monthName: MONTH_NAMES[m - 1], monthsAway: ahead }
    }
    if (!upcomingQuiet && quietMonths.includes(m)) {
      upcomingQuiet = { month: m, monthName: MONTH_NAMES[m - 1], monthsAway: ahead }
    }

    if (upcomingPeak && upcomingQuiet) break
  }

  return {
    months,
    peakMonths,
    quietMonths,
    upcomingPeak,
    upcomingQuiet,
    totalEventsAnalyzed,
    yearsOfData,
    hasEnoughData,
  }
}

// ── Holiday Year-Over-Year Comparison ──────────────────────────────────────────

export type HolidayYearStat = {
  year: number
  eventCount: number
  totalRevenueCents: number
  avgRevenueCents: number | null
}

export type HolidayYoYRow = {
  holidayName: string
  years: HolidayYearStat[]
  trend: 'up' | 'down' | 'flat' | 'new'
}

/**
 * For the top chef-relevant holidays, compare event counts and revenue
 * across the past 3 calendar years (matched within ±21 days of each holiday).
 */
export async function getHolidayYearOverYear(): Promise<HolidayYoYRow[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Import lazily to avoid circular deps at module load time
  const { HOLIDAYS } = await import('@/lib/holidays/constants')
  const { getHolidayDate } = await import('@/lib/holidays/upcoming')

  const now = new Date()
  const currentYear = now.getFullYear()
  const yearsToCheck = [currentYear - 2, currentYear - 1, currentYear]
  const WINDOW_DAYS = 21

  // Fetch all events for the past ~3 years
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(currentYear - 3)

  const { data: events } = await supabase
    .from('events')
    .select('event_date, amount_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .gte('event_date', threeYearsAgo.toISOString().slice(0, 10))
    .not('event_date', 'is', null)

  if (!events || events.length === 0) return []

  // Only analyze high-relevance holidays (the ones that drive real bookings)
  const targetHolidays = HOLIDAYS.filter((h) => h.chefRelevance === 'high')

  const rows: HolidayYoYRow[] = []

  for (const holiday of targetHolidays) {
    const yearStats: HolidayYearStat[] = []

    for (const year of yearsToCheck) {
      const hDate = getHolidayDate(holiday, year)
      if (!hDate) continue

      const windowStart = new Date(hDate)
      windowStart.setDate(windowStart.getDate() - WINDOW_DAYS)
      const windowEnd = new Date(hDate)
      windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS)

      const windowStartStr = windowStart.toISOString().slice(0, 10)
      const windowEndStr = windowEnd.toISOString().slice(0, 10)

      const matchingEvents = (events as any[]).filter((e: any) => {
        return e.event_date >= windowStartStr && e.event_date <= windowEndStr
      })

      const eventCount = matchingEvents.length
      const totalRevenueCents = matchingEvents.reduce(
        (sum: number, e: any) => sum + (e.amount_paid_cents || 0),
        0
      )
      const avgRevenueCents = eventCount > 0 ? Math.round(totalRevenueCents / eventCount) : null

      yearStats.push({ year, eventCount, totalRevenueCents, avgRevenueCents })
    }

    // Skip holidays with zero bookings across all years
    const totalEvents = yearStats.reduce((s, y) => s + y.eventCount, 0)
    if (totalEvents === 0) continue

    // Calculate trend: compare most recent year to previous year
    const currentYearStat = yearStats.find((y) => y.year === currentYear)
    const prevYearStat = yearStats.find((y) => y.year === currentYear - 1)

    let trend: HolidayYoYRow['trend'] = 'flat'
    if (!prevYearStat || prevYearStat.eventCount === 0) {
      trend = currentYearStat && currentYearStat.eventCount > 0 ? 'new' : 'flat'
    } else if (currentYearStat && currentYearStat.eventCount > prevYearStat.eventCount) {
      trend = 'up'
    } else if (currentYearStat && currentYearStat.eventCount < prevYearStat.eventCount) {
      trend = 'down'
    }

    rows.push({ holidayName: holiday.name, years: yearStats, trend })
  }

  // Sort by total revenue descending
  return rows.sort((a, b) => {
    const aRev = a.years.reduce((s, y) => s + y.totalRevenueCents, 0)
    const bRev = b.years.reduce((s, y) => s + y.totalRevenueCents, 0)
    return bRev - aRev
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildEmpty(): BookingSeasonality {
  const months: MonthSeasonality[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: MONTH_NAMES[i],
    shortName: MONTH_SHORT[i],
    eventCount: 0,
    avgRevenueCents: null,
  }))
  return {
    months,
    peakMonths: [],
    quietMonths: [],
    upcomingPeak: null,
    upcomingQuiet: null,
    totalEventsAnalyzed: 0,
    yearsOfData: 0,
    hasEnoughData: false,
  }
}
