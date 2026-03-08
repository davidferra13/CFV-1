'use server'

// Revenue Per Hour Analysis
// Calculates a chef's REAL effective hourly rate by dividing event revenue
// by ALL hours worked (shopping, prep, driving, cooking, cleanup),
// not just service time. Uses existing time tracking columns on events
// and the event_financial_summary view for revenue data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export type HoursBreakdown = {
  shopping: number
  prep: number
  driving: number
  cooking: number
  cleanup: number
}

export type EventRevenuePerHour = {
  eventId: string
  eventName: string
  date: string
  revenueCents: number
  totalHours: number
  perHourCents: number
  breakdown: HoursBreakdown
}

export type MonthlyTrend = {
  month: string // YYYY-MM
  label: string // "Jan 2026"
  avgPerHourCents: number
  eventCount: number
}

export type RevenuePerHourResult = {
  totalRevenueCents: number
  totalHours: number
  revenuePerHourCents: number
  cookingOnlyHours: number
  cookingOnlyPerHourCents: number
  nonCookingPercent: number
  breakdown: HoursBreakdown
  byEvent: EventRevenuePerHour[]
  trend: MonthlyTrend[]
  eventsWithTimeData: number
  eventsWithoutTimeData: number
}

export type EventRevenuePerHourResult = {
  revenueCents: number
  breakdown: HoursBreakdown
  totalHours: number
  effectiveHourlyRateCents: number
  cookingOnlyRateCents: number
  averageRateCents: number | null
  comparisonPercent: number | null
}

export type RevenuePerHourBenchmark = {
  current30DayCents: number | null
  previous30DayCents: number | null
  percentChange: number | null
  bestEvent: { name: string; rateCents: number; eventId: string } | null
  worstEvent: { name: string; rateCents: number; eventId: string } | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type EventTimeRow = {
  id: string
  occasion: string | null
  event_date: string
  status: string
  time_shopping_minutes: number | null
  time_prep_minutes: number | null
  time_travel_minutes: number | null
  time_service_minutes: number | null
  time_reset_minutes: number | null
  client: { full_name: string } | null
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

function buildBreakdown(row: EventTimeRow): HoursBreakdown {
  return {
    shopping: minutesToHours(row.time_shopping_minutes ?? 0),
    prep: minutesToHours(row.time_prep_minutes ?? 0),
    driving: minutesToHours(row.time_travel_minutes ?? 0),
    cooking: minutesToHours(row.time_service_minutes ?? 0),
    cleanup: minutesToHours(row.time_reset_minutes ?? 0),
  }
}

function totalFromBreakdown(b: HoursBreakdown): number {
  return Math.round((b.shopping + b.prep + b.driving + b.cooking + b.cleanup) * 100) / 100
}

function hasTimeData(row: EventTimeRow): boolean {
  return (
    (row.time_shopping_minutes ?? 0) > 0 ||
    (row.time_prep_minutes ?? 0) > 0 ||
    (row.time_travel_minutes ?? 0) > 0 ||
    (row.time_service_minutes ?? 0) > 0 ||
    (row.time_reset_minutes ?? 0) > 0
  )
}

function eventDisplayName(row: EventTimeRow): string {
  const clientName = (row.client as any)?.full_name ?? 'Client'
  const occasion = row.occasion ?? 'Event'
  return `${occasion} - ${clientName}`
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7) // YYYY-MM
}

// ─── getRevenuePerHour ──────────────────────────────────────────────────────

export async function getRevenuePerHour(
  dateRange: '30d' | '90d' | 'year' | 'all' = '30d'
): Promise<RevenuePerHourResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Build date filter
  const now = new Date()
  let startDate: string | null = null
  if (dateRange === '30d') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  } else if (dateRange === '90d') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  } else if (dateRange === 'year') {
    startDate = `${now.getFullYear()}-01-01`
  }

  // Fetch completed events with time data
  let query = supabase
    .from('events')
    .select(`
      id, occasion, event_date, status,
      time_shopping_minutes, time_prep_minutes, time_travel_minutes,
      time_service_minutes, time_reset_minutes,
      client:clients(full_name)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('event_date', { ascending: false })

  if (startDate) {
    query = query.gte('event_date', startDate)
  }

  const { data: events, error: eventsError } = await query

  if (eventsError) {
    console.error('[getRevenuePerHour] Events query error:', eventsError)
    throw new Error('Failed to fetch events for revenue per hour')
  }

  if (!events || events.length === 0) {
    return {
      totalRevenueCents: 0,
      totalHours: 0,
      revenuePerHourCents: 0,
      cookingOnlyHours: 0,
      cookingOnlyPerHourCents: 0,
      nonCookingPercent: 0,
      breakdown: { shopping: 0, prep: 0, driving: 0, cooking: 0, cleanup: 0 },
      byEvent: [],
      trend: [],
      eventsWithTimeData: 0,
      eventsWithoutTimeData: 0,
    }
  }

  // Fetch financial data for all these events
  const eventIds = events.map(e => e.id)
  const { data: financials } = await supabase
    .from('event_financial_summary')
    .select('event_id, total_paid_cents, tip_amount_cents, quoted_price_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const financialMap = new Map<string, { revenueCents: number }>()
  for (const f of financials ?? []) {
    const paid = f.total_paid_cents ?? 0
    const tip = f.tip_amount_cents ?? 0
    financialMap.set(f.event_id, { revenueCents: paid + tip })
  }

  // Process events
  const typedEvents = events as unknown as EventTimeRow[]
  const byEvent: EventRevenuePerHour[] = []
  const totalBreakdown: HoursBreakdown = { shopping: 0, prep: 0, driving: 0, cooking: 0, cleanup: 0 }
  let totalRevenueCents = 0
  let totalHours = 0
  let eventsWithTimeData = 0
  let eventsWithoutTimeData = 0

  // Monthly aggregation
  const monthlyMap = new Map<string, { totalCents: number; totalHours: number; count: number; label: string }>()

  for (const event of typedEvents) {
    const financial = financialMap.get(event.id)
    const revenueCents = financial?.revenueCents ?? 0
    const breakdown = buildBreakdown(event)
    const eventTotalHours = totalFromBreakdown(breakdown)

    if (!hasTimeData(event)) {
      eventsWithoutTimeData++
      continue
    }

    eventsWithTimeData++
    totalRevenueCents += revenueCents
    totalHours += eventTotalHours

    totalBreakdown.shopping += breakdown.shopping
    totalBreakdown.prep += breakdown.prep
    totalBreakdown.driving += breakdown.driving
    totalBreakdown.cooking += breakdown.cooking
    totalBreakdown.cleanup += breakdown.cleanup

    const perHourCents = eventTotalHours > 0 ? Math.round(revenueCents / eventTotalHours) : 0

    byEvent.push({
      eventId: event.id,
      eventName: eventDisplayName(event),
      date: event.event_date,
      revenueCents,
      totalHours: eventTotalHours,
      perHourCents,
      breakdown,
    })

    // Monthly trend aggregation
    const monthKey = getMonthKey(event.event_date)
    const existing = monthlyMap.get(monthKey)
    if (existing) {
      existing.totalCents += revenueCents
      existing.totalHours += eventTotalHours
      existing.count++
    } else {
      monthlyMap.set(monthKey, {
        totalCents: revenueCents,
        totalHours: eventTotalHours,
        count: 1,
        label: getMonthLabel(event.event_date),
      })
    }
  }

  // Build trend sorted by month ascending
  const trend: MonthlyTrend[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: data.label,
      avgPerHourCents: data.totalHours > 0 ? Math.round(data.totalCents / data.totalHours) : 0,
      eventCount: data.count,
    }))

  const revenuePerHourCents = totalHours > 0 ? Math.round(totalRevenueCents / totalHours) : 0
  const cookingOnlyHours = totalBreakdown.cooking
  const cookingOnlyPerHourCents = cookingOnlyHours > 0
    ? Math.round(totalRevenueCents / cookingOnlyHours)
    : 0
  const nonCookingHours = totalHours - cookingOnlyHours
  const nonCookingPercent = totalHours > 0
    ? Math.round((nonCookingHours / totalHours) * 100)
    : 0

  return {
    totalRevenueCents,
    totalHours: Math.round(totalHours * 100) / 100,
    revenuePerHourCents,
    cookingOnlyHours: Math.round(cookingOnlyHours * 100) / 100,
    cookingOnlyPerHourCents,
    nonCookingPercent,
    breakdown: {
      shopping: Math.round(totalBreakdown.shopping * 100) / 100,
      prep: Math.round(totalBreakdown.prep * 100) / 100,
      driving: Math.round(totalBreakdown.driving * 100) / 100,
      cooking: Math.round(totalBreakdown.cooking * 100) / 100,
      cleanup: Math.round(totalBreakdown.cleanup * 100) / 100,
    },
    byEvent,
    trend,
    eventsWithTimeData,
    eventsWithoutTimeData,
  }
}

// ─── getEventRevenuePerHour ─────────────────────────────────────────────────

export async function getEventRevenuePerHour(
  eventId: string
): Promise<EventRevenuePerHourResult | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch single event time data
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, status,
      time_shopping_minutes, time_prep_minutes, time_travel_minutes,
      time_service_minutes, time_reset_minutes,
      client:clients(full_name)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const typedEvent = event as unknown as EventTimeRow

  // Get financial data
  const { data: financial } = await supabase
    .from('event_financial_summary')
    .select('total_paid_cents, tip_amount_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const revenueCents = (financial?.total_paid_cents ?? 0) + (financial?.tip_amount_cents ?? 0)
  const breakdown = buildBreakdown(typedEvent)
  const totalHours = totalFromBreakdown(breakdown)

  const effectiveHourlyRateCents = totalHours > 0 ? Math.round(revenueCents / totalHours) : 0
  const cookingOnlyRateCents = breakdown.cooking > 0 ? Math.round(revenueCents / breakdown.cooking) : 0

  // Get average rate across all completed events for comparison
  const overallData = await getRevenuePerHour('all').catch(() => null)
  const averageRateCents = overallData && overallData.revenuePerHourCents > 0
    ? overallData.revenuePerHourCents
    : null
  const comparisonPercent = averageRateCents && effectiveHourlyRateCents > 0
    ? Math.round(((effectiveHourlyRateCents - averageRateCents) / averageRateCents) * 100)
    : null

  return {
    revenueCents,
    breakdown,
    totalHours,
    effectiveHourlyRateCents,
    cookingOnlyRateCents,
    averageRateCents,
    comparisonPercent,
  }
}

// ─── getRevenuePerHourBenchmark ─────────────────────────────────────────────

export async function getRevenuePerHourBenchmark(): Promise<RevenuePerHourBenchmark> {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch all completed events with time data in the last 60 days
  const { data: events } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, status,
      time_shopping_minutes, time_prep_minutes, time_travel_minutes,
      time_service_minutes, time_reset_minutes,
      client:clients(full_name)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', sixtyDaysAgo)
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) {
    return {
      current30DayCents: null,
      previous30DayCents: null,
      percentChange: null,
      bestEvent: null,
      worstEvent: null,
    }
  }

  const eventIds = events.map(e => e.id)
  const { data: financials } = await supabase
    .from('event_financial_summary')
    .select('event_id, total_paid_cents, tip_amount_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const financialMap = new Map<string, number>()
  for (const f of financials ?? []) {
    financialMap.set(f.event_id, (f.total_paid_cents ?? 0) + (f.tip_amount_cents ?? 0))
  }

  const typedEvents = events as unknown as EventTimeRow[]

  let current30Revenue = 0
  let current30Hours = 0
  let prev30Revenue = 0
  let prev30Hours = 0
  let bestEvent: RevenuePerHourBenchmark['bestEvent'] = null
  let worstEvent: RevenuePerHourBenchmark['worstEvent'] = null

  for (const event of typedEvents) {
    if (!hasTimeData(event)) continue

    const revenue = financialMap.get(event.id) ?? 0
    const breakdown = buildBreakdown(event)
    const hours = totalFromBreakdown(breakdown)
    if (hours <= 0) continue

    const rate = Math.round(revenue / hours)
    const name = eventDisplayName(event)

    if (event.event_date >= thirtyDaysAgo) {
      current30Revenue += revenue
      current30Hours += hours
    } else {
      prev30Revenue += revenue
      prev30Hours += hours
    }

    if (!bestEvent || rate > bestEvent.rateCents) {
      bestEvent = { name, rateCents: rate, eventId: event.id }
    }
    if (!worstEvent || rate < worstEvent.rateCents) {
      worstEvent = { name, rateCents: rate, eventId: event.id }
    }
  }

  const current30DayCents = current30Hours > 0 ? Math.round(current30Revenue / current30Hours) : null
  const previous30DayCents = prev30Hours > 0 ? Math.round(prev30Revenue / prev30Hours) : null

  const percentChange = current30DayCents && previous30DayCents
    ? Math.round(((current30DayCents - previous30DayCents) / previous30DayCents) * 100)
    : null

  return {
    current30DayCents,
    previous30DayCents,
    percentChange,
    bestEvent,
    worstEvent,
  }
}
