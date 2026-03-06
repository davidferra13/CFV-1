'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklyLoad {
  weekStart: string
  eventCount: number
  totalMinutes: number
  totalRevenueCents: number
  utilizationPercent: number // of assumed max capacity
}

export interface CapacityBottleneck {
  type: 'time' | 'events' | 'overlap' | 'burnout_risk'
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
}

export interface MonthlyCapacity {
  month: string
  eventCount: number
  totalMinutes: number
  totalRevenueCents: number
  avgEventsPerWeek: number
  peakWeekEvents: number
  daysOff: number
}

export interface CapacityCeilingResult {
  weeklyLoads: WeeklyLoad[] // last 12 weeks
  monthlyCapacity: MonthlyCapacity[]
  bottlenecks: CapacityBottleneck[]
  maxEventsPerWeek: number // historical max
  avgEventsPerWeek: number
  avgMinutesPerEvent: number
  currentUtilization: number // % of max
  theoreticalMaxEventsPerMonth: number
  theoreticalMaxRevenueCents: number
  capacityHeadroom: number // % room to grow before hitting ceiling
  busiestMonth: string | null
  slowestMonth: string | null
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getCapacityCeiling(): Promise<CapacityCeilingResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const twelveMonthsAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]

  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      id, event_date, quoted_price_cents, status,
      time_shopping_minutes, time_prep_minutes, time_service_minutes,
      time_travel_minutes, time_reset_minutes
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])
    .gte('event_date', twelveMonthsAgo)
    .order('event_date', { ascending: true })

  if (error || !events || events.length < 5) return null

  const getTotalMinutes = (e: any) =>
    (e.time_shopping_minutes || 0) +
    (e.time_prep_minutes || 0) +
    (e.time_service_minutes || 0) +
    (e.time_travel_minutes || 0) +
    (e.time_reset_minutes || 0)

  // ─── Weekly Loads (last 12 weeks) ───

  const now = Date.now()
  const weeklyMap = new Map<string, { events: number; minutes: number; revenue: number }>()

  for (const event of events) {
    const d = new Date(event.event_date)
    // ISO week start (Monday)
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7))
    const weekKey = monday.toISOString().split('T')[0]

    if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, { events: 0, minutes: 0, revenue: 0 })
    const w = weeklyMap.get(weekKey)!
    w.events++
    w.minutes += getTotalMinutes(event)
    w.revenue += event.quoted_price_cents || 0
  }

  // Find historical max for utilization calculation
  const allWeekEvents = Array.from(weeklyMap.values()).map((w) => w.events)
  const maxEventsPerWeek = Math.max(...allWeekEvents, 1)
  const avgEventsPerWeek =
    allWeekEvents.length > 0
      ? Math.round((allWeekEvents.reduce((s, e) => s + e, 0) / allWeekEvents.length) * 10) / 10
      : 0

  // Recent 12 weeks
  const sortedWeeks = Array.from(weeklyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const recentWeeks = sortedWeeks.slice(-12)

  const weeklyLoads: WeeklyLoad[] = recentWeeks.map(([weekStart, w]) => ({
    weekStart,
    eventCount: w.events,
    totalMinutes: w.minutes,
    totalRevenueCents: w.revenue,
    utilizationPercent: Math.round((w.events / maxEventsPerWeek) * 100),
  }))

  // ─── Monthly Capacity ───

  const monthlyMap = new Map<
    string,
    {
      events: number
      minutes: number
      revenue: number
      weekEvents: Map<string, number>
      eventDates: Set<string>
    }
  >()

  for (const event of events) {
    const d = new Date(event.event_date)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7))
    const weekKey = monday.toISOString().split('T')[0]

    if (!monthlyMap.has(monthKey))
      monthlyMap.set(monthKey, {
        events: 0,
        minutes: 0,
        revenue: 0,
        weekEvents: new Map(),
        eventDates: new Set(),
      })
    const m = monthlyMap.get(monthKey)!
    m.events++
    m.minutes += getTotalMinutes(event)
    m.revenue += event.quoted_price_cents || 0
    m.weekEvents.set(weekKey, (m.weekEvents.get(weekKey) || 0) + 1)
    m.eventDates.add(event.event_date)
  }

  const monthlyCapacity: MonthlyCapacity[] = Array.from(monthlyMap.entries())
    .map(([month, m]) => {
      const weeksInMonth = m.weekEvents.size || 1
      const peakWeek = Math.max(...Array.from(m.weekEvents.values()))
      const daysInMonth = new Date(
        parseInt(month.split('-')[0]),
        parseInt(month.split('-')[1]),
        0
      ).getDate()
      const daysOff = daysInMonth - m.eventDates.size

      return {
        month,
        eventCount: m.events,
        totalMinutes: m.minutes,
        totalRevenueCents: m.revenue,
        avgEventsPerWeek: Math.round((m.events / weeksInMonth) * 10) / 10,
        peakWeekEvents: peakWeek,
        daysOff,
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))

  // ─── Bottleneck Detection ───

  const bottlenecks: CapacityBottleneck[] = []

  // Time bottleneck
  const avgMinutes =
    events.filter((e: any) => getTotalMinutes(e) > 0).length > 0
      ? Math.round(
          events
            .filter((e: any) => getTotalMinutes(e) > 0)
            .reduce((s: number, e: any) => s + getTotalMinutes(e), 0) /
            events.filter((e: any) => getTotalMinutes(e) > 0).length
        )
      : 0

  if (avgMinutes > 480) {
    // more than 8 hours avg per event
    bottlenecks.push({
      type: 'time',
      title: 'Events consuming full days',
      description: `Average event takes ${Math.round(avgMinutes / 60)} hours. This limits you to one event per day.`,
      severity: 'warning',
    })
  }

  // Overlap bottleneck
  const dateCounts = new Map<string, number>()
  for (const event of events) {
    dateCounts.set(event.event_date, (dateCounts.get(event.event_date) || 0) + 1)
  }
  const multiEventDays = Array.from(dateCounts.values()).filter((c) => c > 1).length
  if (multiEventDays > 0) {
    bottlenecks.push({
      type: 'overlap',
      title: `${multiEventDays} days with multiple events`,
      description: 'Multi-event days increase burnout risk and prep complexity.',
      severity: multiEventDays > 5 ? 'warning' : 'info',
    })
  }

  // Peak week burnout risk
  const peakWeekCounts = Array.from(weeklyMap.values()).map((w) => w.events)
  const heavyWeeks = peakWeekCounts.filter((c) => c >= 5).length
  if (heavyWeeks > 0) {
    bottlenecks.push({
      type: 'burnout_risk',
      title: `${heavyWeeks} weeks with 5+ events`,
      description: 'Sustained high-volume weeks increase burnout risk.',
      severity: heavyWeeks > 3 ? 'critical' : 'warning',
    })
  }

  // Max events bottleneck
  const recentMonths = monthlyCapacity.slice(-3)
  const recentAvgPerMonth =
    recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.eventCount, 0) / recentMonths.length
      : 0
  const peakMonthEvents = Math.max(...monthlyCapacity.map((m) => m.eventCount), 0)

  if (recentAvgPerMonth > 0 && recentAvgPerMonth >= peakMonthEvents * 0.9) {
    bottlenecks.push({
      type: 'events',
      title: 'Operating near peak capacity',
      description: `Recent average ${Math.round(recentAvgPerMonth)} events/month vs historical peak of ${peakMonthEvents}. Limited room to grow.`,
      severity: 'critical',
    })
  }

  // ─── Theoretical Max ───

  // Assume max is 1.2x the historical peak month (slightly beyond what's been achieved)
  const theoreticalMax = Math.ceil(peakMonthEvents * 1.2)
  const avgRevenuePerEvent =
    events.length > 0
      ? Math.round(
          events.reduce((s: number, e: any) => s + (e.quoted_price_cents || 0), 0) / events.length
        )
      : 0
  const theoreticalMaxRevenue = theoreticalMax * avgRevenuePerEvent

  const currentUtilization =
    peakMonthEvents > 0 ? Math.round((recentAvgPerMonth / peakMonthEvents) * 100) : 0

  const headroom = Math.max(0, 100 - currentUtilization)

  // Busiest / slowest
  const sortedMonths = [...monthlyCapacity].sort((a, b) => b.eventCount - a.eventCount)
  const busiest = sortedMonths.length > 0 ? sortedMonths[0].month : null
  const slowest = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1].month : null

  return {
    weeklyLoads,
    monthlyCapacity,
    bottlenecks,
    maxEventsPerWeek,
    avgEventsPerWeek,
    avgMinutesPerEvent: avgMinutes,
    currentUtilization,
    theoreticalMaxEventsPerMonth: theoreticalMax,
    theoreticalMaxRevenueCents: theoreticalMaxRevenue,
    capacityHeadroom: headroom,
    busiestMonth: busiest,
    slowestMonth: slowest,
  }
}
