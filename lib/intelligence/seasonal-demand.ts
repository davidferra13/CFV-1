'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyDemandPattern {
  month: number // 1-12
  monthName: string
  avgEvents: number
  avgRevenueCents: number
  topOccasion: string | null
  avgGuestCount: number
}

export interface SeasonalPeak {
  monthName: string
  month: number
  strength: 'peak' | 'strong' | 'average' | 'slow'
  eventsDelta: number // % above/below annual average
}

export interface SeasonalDemandForecast {
  patterns: MonthlyDemandPattern[]
  peaks: SeasonalPeak[]
  busiestMonth: string
  slowestMonth: string
  peakSeasonMonths: string[] // months significantly above average
  slowSeasonMonths: string[] // months significantly below average
  nextMonthForecast: {
    month: string
    expectedEvents: number
    expectedRevenueCents: number
    historicalBasis: string // e.g. "Based on 3 years of March data"
  }
  yearsOfData: number
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getSeasonalDemandForecast(): Promise<SeasonalDemandForecast | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch all completed events (need historical depth for seasonal patterns)
  const { data: events, error } = await db
    .from('events')
    .select('event_date, quoted_price_cents, guest_count, occasion, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid'])
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 3) return null

  // Determine data span in years
  const dates = events.map((e: any) => new Date(e.event_date))
  const earliest = dates[0]
  const latest = dates[dates.length - 1]
  const yearsOfData = Math.max(1, (latest.getTime() - earliest.getTime()) / (365.25 * 86400000))

  // Aggregate by month (1-12)
  const monthBuckets: Map<
    number,
    { events: number; revenueCents: number; guests: number; occasions: Map<string, number> }
  > = new Map()
  for (let m = 1; m <= 12; m++) {
    monthBuckets.set(m, { events: 0, revenueCents: 0, guests: 0, occasions: new Map() })
  }

  for (const event of events) {
    const d = new Date(event.event_date)
    const month = d.getMonth() + 1
    const bucket = monthBuckets.get(month)!
    bucket.events++
    bucket.revenueCents += event.quoted_price_cents || 0
    bucket.guests += event.guest_count || 0
    if (event.occasion) {
      bucket.occasions.set(event.occasion, (bucket.occasions.get(event.occasion) || 0) + 1)
    }
  }

  // Build monthly patterns (normalized by years of data)
  const patterns: MonthlyDemandPattern[] = []
  for (let m = 1; m <= 12; m++) {
    const bucket = monthBuckets.get(m)!
    const topOccasion =
      bucket.occasions.size > 0
        ? Array.from(bucket.occasions.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : null

    patterns.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      avgEvents: Math.round((bucket.events / yearsOfData) * 10) / 10,
      avgRevenueCents: Math.round(bucket.revenueCents / yearsOfData),
      topOccasion,
      avgGuestCount: bucket.events > 0 ? Math.round(bucket.guests / bucket.events) : 0,
    })
  }

  // Calculate annual average events per month
  const totalEvents = events.length
  const avgEventsPerMonth = totalEvents / (yearsOfData * 12)

  // Classify each month's strength
  const peaks: SeasonalPeak[] = patterns.map((p) => {
    const delta =
      avgEventsPerMonth > 0
        ? Math.round(((p.avgEvents - avgEventsPerMonth) / avgEventsPerMonth) * 100)
        : 0

    let strength: SeasonalPeak['strength']
    if (delta >= 30) strength = 'peak'
    else if (delta >= 10) strength = 'strong'
    else if (delta >= -20) strength = 'average'
    else strength = 'slow'

    return { monthName: p.monthName, month: p.month, strength, eventsDelta: delta }
  })

  // Find busiest and slowest months
  const sorted = [...patterns].sort((a, b) => b.avgEvents - a.avgEvents)
  const busiestMonth = sorted[0].monthName
  const slowestMonth = sorted[sorted.length - 1].monthName

  const peakSeasonMonths = peaks
    .filter((p) => p.strength === 'peak' || p.strength === 'strong')
    .map((p) => p.monthName)
  const slowSeasonMonths = peaks.filter((p) => p.strength === 'slow').map((p) => p.monthName)

  // Forecast next month
  const now = new Date()
  const nextMonth = ((now.getMonth() + 1) % 12) + 1
  const nextPattern = patterns.find((p) => p.month === nextMonth)!
  const dataPointsForMonth = monthBuckets.get(nextMonth)!.events

  return {
    patterns,
    peaks,
    busiestMonth,
    slowestMonth,
    peakSeasonMonths,
    slowSeasonMonths,
    nextMonthForecast: {
      month: nextPattern.monthName,
      expectedEvents: Math.round(nextPattern.avgEvents),
      expectedRevenueCents: nextPattern.avgRevenueCents,
      historicalBasis: `Based on ${dataPointsForMonth} ${nextPattern.monthName} events across ${Math.round(yearsOfData * 10) / 10} years`,
    },
    yearsOfData: Math.round(yearsOfData * 10) / 10,
  }
}
