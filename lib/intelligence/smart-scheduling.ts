'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SchedulingSuggestion {
  type: 'spacing' | 'burnout' | 'prep_time' | 'day_preference' | 'capacity'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  data?: Record<string, any>
}

export interface DayOfWeekStats {
  day: string
  dayIndex: number // 0=Sun, 6=Sat
  eventCount: number
  avgRevenueCents: number
  avgRating: number | null
}

export interface SchedulingIntelligence {
  suggestions: SchedulingSuggestion[]
  dayOfWeekStats: DayOfWeekStats[]
  bestPerformanceDay: string
  highestRevenueDay: string
  avgDaysBetweenEvents: number
  optimalSpacingDays: number // recommended minimum days between events
  upcomingDensity: { date: string; eventCount: number }[] // next 30 days
  backToBackCount: number // events with 0 days between them in last 90 days
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getSchedulingIntelligence(): Promise<SchedulingIntelligence | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch events with timing and quality data
  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      event_date, event_time, quoted_price_cents, guest_count, status,
      time_prep_minutes, time_service_minutes, time_shopping_minutes,
      time_travel_minutes, time_reset_minutes
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'paid', 'in_progress'])
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 3) return null

  // Fetch AARs for quality correlation
  const { data: aars } = await supabase
    .from('after_action_reviews')
    .select('event_id, calm_rating, preparation_rating, execution_rating')
    .eq('tenant_id', tenantId)

  const aarMap = new Map<string, { calm: number; prep: number; exec: number }>()
  for (const aar of aars || []) {
    aarMap.set(aar.event_id, {
      calm: aar.calm_rating || 0,
      prep: aar.preparation_rating || 0,
      exec: aar.execution_rating || 0,
    })
  }

  // Day of week analysis
  const dayStats: Map<number, { count: number; revenueCents: number; ratings: number[] }> =
    new Map()
  for (let d = 0; d < 7; d++) dayStats.set(d, { count: 0, revenueCents: 0, ratings: [] })

  const eventDates: Date[] = []

  for (const event of events) {
    const d = new Date(event.event_date)
    const dayIndex = d.getDay()
    const bucket = dayStats.get(dayIndex)!
    bucket.count++
    bucket.revenueCents += event.quoted_price_cents || 0

    eventDates.push(d)
  }

  // Build day stats
  const dayOfWeekStats: DayOfWeekStats[] = []
  for (let d = 0; d < 7; d++) {
    const s = dayStats.get(d)!
    dayOfWeekStats.push({
      day: DAY_NAMES[d],
      dayIndex: d,
      eventCount: s.count,
      avgRevenueCents: s.count > 0 ? Math.round(s.revenueCents / s.count) : 0,
      avgRating:
        s.ratings.length > 0
          ? Math.round((s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length) * 10) / 10
          : null,
    })
  }

  // Calculate intervals between events
  const intervals: number[] = []
  const sortedDates = [...eventDates].sort((a, b) => a.getTime() - b.getTime())
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.round((sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / 86400000)
    intervals.push(diff)
  }

  const avgDaysBetween =
    intervals.length > 0 ? Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length) : 0

  // Back-to-back events (same day or next day) in last 90 days
  const ninetyDaysAgo = Date.now() - 90 * 86400000
  const recentIntervals = intervals.slice(-Math.min(intervals.length, 30))
  const backToBackCount = recentIntervals.filter((d) => d <= 1).length

  // Optimal spacing: based on average prep + recovery time
  const totalPrepMinutes = events.reduce(
    (s: number, e: any) => s + (e.time_prep_minutes || 0) + (e.time_shopping_minutes || 0),
    0
  )
  const avgPrepMinutes = events.length > 0 ? totalPrepMinutes / events.length : 0
  const optimalSpacingDays = avgPrepMinutes > 240 ? 3 : avgPrepMinutes > 120 ? 2 : 1

  // Upcoming event density (next 30 days)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'accepted'])
    .gte('event_date', new Date().toISOString().split('T')[0])
    .lte('event_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])

  const densityMap = new Map<string, number>()
  for (const e of upcomingEvents || []) {
    densityMap.set(e.event_date, (densityMap.get(e.event_date) || 0) + 1)
  }
  const upcomingDensity = Array.from(densityMap.entries())
    .map(([date, eventCount]) => ({ date, eventCount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Generate suggestions
  const suggestions: SchedulingSuggestion[] = []

  // Back-to-back warning
  if (backToBackCount >= 3) {
    suggestions.push({
      type: 'spacing',
      severity: 'warning',
      title: 'Frequent back-to-back events',
      description: `You had ${backToBackCount} back-to-back events in the last 90 days. Your average prep time (${Math.round(avgPrepMinutes)} min) suggests ${optimalSpacingDays}+ day spacing for best quality.`,
    })
  }

  // Double-booked days upcoming
  const doubleBooked = upcomingDensity.filter((d) => d.eventCount >= 2)
  if (doubleBooked.length > 0) {
    suggestions.push({
      type: 'capacity',
      severity: 'warning',
      title: `${doubleBooked.length} double-booked day${doubleBooked.length > 1 ? 's' : ''} ahead`,
      description: `You have multiple events on: ${doubleBooked.map((d) => d.date).join(', ')}. Consider if you have enough prep and recovery time.`,
    })
  }

  // Heavy upcoming week (5+ events in next 7 days)
  const next7days = upcomingDensity
    .filter((d) => new Date(d.date).getTime() <= Date.now() + 7 * 86400000)
    .reduce((s, d) => s + d.eventCount, 0)
  if (next7days >= 5) {
    suggestions.push({
      type: 'burnout',
      severity: 'critical',
      title: 'Heavy week ahead',
      description: `${next7days} events in the next 7 days. Your typical pace is ${Math.round(events.length / 52)} events/week. Consider rescheduling if possible.`,
    })
  }

  // Best performing day suggestion
  const bestDayByCount = dayOfWeekStats.reduce((a, b) => (a.eventCount > b.eventCount ? a : b))
  const bestDayByRevenue = dayOfWeekStats.reduce((a, b) =>
    a.avgRevenueCents > b.avgRevenueCents ? a : b
  )

  if (bestDayByRevenue.day !== bestDayByCount.day) {
    suggestions.push({
      type: 'day_preference',
      severity: 'info',
      title: 'Revenue vs. volume mismatch',
      description: `Your busiest day is ${bestDayByCount.day} (${bestDayByCount.eventCount} events) but highest revenue per event is ${bestDayByRevenue.day} ($${Math.round(bestDayByRevenue.avgRevenueCents / 100)}). Consider prioritizing ${bestDayByRevenue.day} bookings.`,
    })
  }

  return {
    suggestions,
    dayOfWeekStats,
    bestPerformanceDay: bestDayByCount.day,
    highestRevenueDay: bestDayByRevenue.day,
    avgDaysBetweenEvents: avgDaysBetween,
    optimalSpacingDays,
    upcomingDensity,
    backToBackCount,
  }
}
