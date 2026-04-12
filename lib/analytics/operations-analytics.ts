'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComplianceStats {
  onTimeStartRate: number // service_started_at <= serve_time %
  receiptSubmissionRate: number // receipt uploaded within 24h of event %
  kitchenComplianceRate: number // reset_complete = true %
  menuDeviationRate: number // events with actual_menu_deviations %
  tempLogComplianceRate: number // events with ≥1 temp log %
  dietaryAccommodationRate: number // events with dietary restrictions %
}

export interface TimePhaseStats {
  phase: string
  avgMinutes: number
  minMinutes: number
  maxMinutes: number
  totalMinutes: number
  eventCount: number
}

export interface WasteStats {
  totalFoodSpendCents: number
  leftoverCarriedForwardCents: number
  netFoodCostCents: number
  wastePercent: number // leftover carried forward / food spend
  eventsWithLeftovers: number
}

export interface CulinaryOperationsStats {
  avgCoursesPerEvent: number
  avgGuestsPerEvent: number
  mostCommonOccasion: string
  dietaryRestrictionFrequency: Array<{ restriction: string; count: number; percent: number }>
}

export interface EffectiveHourlyRateByMonth {
  month: string
  avgHourlyRateCents: number
  eventCount: number
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

function phaseMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  return mins > 0 && mins < 1440 ? mins : null
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getComplianceStats(
  startDate?: string,
  endDate?: string
): Promise<ComplianceStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('events')
    .select(
      `
      id, serve_time, service_started_at,
      reset_complete, actual_menu_deviations,
      dietary_restrictions,
      event_date
    `
    )
    .eq('tenant_id', chef.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')

  if (startDate) query = query.gte('event_date', startDate)
  if (endDate) query = query.lte('event_date', endDate)

  const { data: events } = await query
  const total = events?.length ?? 0

  if (total === 0) {
    return {
      onTimeStartRate: 0,
      receiptSubmissionRate: 0,
      kitchenComplianceRate: 0,
      menuDeviationRate: 0,
      tempLogComplianceRate: 0,
      dietaryAccommodationRate: 0,
    }
  }

  // On-time start: service_started_at <= serve_time (same date)
  let onTimeCount = 0
  let kitchenCompliantCount = 0
  let menuDeviationCount = 0
  let dietaryCount = 0

  for (const ev of events ?? []) {
    if (ev.service_started_at && ev.serve_time) {
      // serve_time is a time string HH:MM; combine with event_date for comparison
      const serveDateTime = new Date(`${ev.event_date}T${ev.serve_time}`)
      const actualStart = new Date(ev.service_started_at)
      if (actualStart <= serveDateTime) onTimeCount++
    }

    if (ev.reset_complete) kitchenCompliantCount++
    if (ev.actual_menu_deviations) menuDeviationCount++
    if ((ev.dietary_restrictions ?? []).length > 0) dietaryCount++
  }

  // Receipt within 24h: check expenses table
  const eventIds = (events ?? []).map((e: any) => e.id)
  let receiptUploaded = 0
  if (eventIds.length > 0) {
    const { data: expenses } = await db
      .from('expenses')
      .select('event_id, created_at, receipt_uploaded')
      .in('event_id', eventIds)
      .eq('receipt_uploaded', true)

    // Get unique events that had at least one receipt uploaded
    const uploadedEventIds = new Set((expenses ?? []).map((e: any) => e.event_id))
    receiptUploaded = uploadedEventIds.size
  }

  // Temp log compliance
  let tempLogCount = 0
  if (eventIds.length > 0) {
    const { data: tempLogs } = await db
      .from('event_temp_logs')
      .select('event_id')
      .in('event_id', eventIds)

    const loggedEventIds = new Set((tempLogs ?? []).map((t: any) => t.event_id))
    tempLogCount = loggedEventIds.size
  }

  return {
    onTimeStartRate: pct(onTimeCount, total),
    receiptSubmissionRate: pct(receiptUploaded, total),
    kitchenComplianceRate: pct(kitchenCompliantCount, total),
    menuDeviationRate: pct(menuDeviationCount, total),
    tempLogComplianceRate: pct(tempLogCount, total),
    dietaryAccommodationRate: pct(dietaryCount, total),
  }
}

export async function getTimePhaseStats(
  startDate?: string,
  endDate?: string
): Promise<TimePhaseStats[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('events')
    .select(
      `
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at,
      reset_started_at, reset_completed_at,
      event_date
    `
    )
    .eq('tenant_id', chef.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')

  if (startDate) query = query.gte('event_date', startDate)
  if (endDate) query = query.lte('event_date', endDate)

  const { data: events } = await query

  type PhaseConfig = {
    key: string
    label: string
    start: keyof NonNullable<typeof events>[number]
    end: keyof NonNullable<typeof events>[number]
  }

  const phases: PhaseConfig[] = [
    {
      key: 'shopping',
      label: 'Shopping',
      start: 'shopping_started_at',
      end: 'shopping_completed_at',
    },
    { key: 'prep', label: 'Prep', start: 'prep_started_at', end: 'prep_completed_at' },
    { key: 'travel', label: 'Travel', start: 'travel_started_at', end: 'travel_completed_at' },
    { key: 'service', label: 'Service', start: 'service_started_at', end: 'service_completed_at' },
    { key: 'reset', label: 'Reset/Cleanup', start: 'reset_started_at', end: 'reset_completed_at' },
  ]

  return phases.map(({ label, start, end }) => {
    const durations = (events ?? [])
      .map((ev: any) => phaseMinutes(ev[start] as string | null, ev[end] as string | null))
      .filter((d: any): d is number => d !== null)

    if (durations.length === 0) {
      return {
        phase: label,
        avgMinutes: 0,
        minMinutes: 0,
        maxMinutes: 0,
        totalMinutes: 0,
        eventCount: 0,
      }
    }

    const total = durations.reduce((a: any, b: any) => a + b, 0)
    return {
      phase: label,
      avgMinutes: Math.round(total / durations.length),
      minMinutes: Math.round(Math.min(...durations)),
      maxMinutes: Math.round(Math.max(...durations)),
      totalMinutes: Math.round(total),
      eventCount: durations.length,
    }
  })
}

export async function getWasteStats(startDate: string, endDate: string): Promise<WasteStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, leftover_value_carried_forward_cents')
    .eq('tenant_id', chef.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  const eventIds = (events ?? []).map((e: any) => e.id)
  const leftoverTotal = (events ?? []).reduce(
    (s: any, e: any) => s + (e.leftover_value_carried_forward_cents ?? 0),
    0
  )
  const eventsWithLeftovers = (events ?? []).filter(
    (e: any) => (e.leftover_value_carried_forward_cents ?? 0) > 0
  ).length

  let foodSpend = 0
  if (eventIds.length > 0) {
    const { data: expenses } = await db
      .from('expenses')
      .select('amount_cents')
      .in('event_id', eventIds)
      .in('category', ['groceries', 'alcohol', 'specialty_items'])
      .eq('is_business', true)

    foodSpend = (expenses ?? []).reduce((s: any, e: any) => s + e.amount_cents, 0)
  }

  return {
    totalFoodSpendCents: foodSpend,
    leftoverCarriedForwardCents: leftoverTotal,
    netFoodCostCents: foodSpend - leftoverTotal,
    wastePercent: pct(leftoverTotal, foodSpend),
    eventsWithLeftovers,
  }
}

export async function getCulinaryOperationsStats(): Promise<CulinaryOperationsStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, guest_count, occasion, dietary_restrictions')
    .eq('tenant_id', chef.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')

  const total = events?.length ?? 0
  const totalGuests = (events ?? []).reduce((s: any, e: any) => s + (e.guest_count ?? 0), 0)
  const avgGuests = total > 0 ? Math.round((totalGuests / total) * 10) / 10 : 0

  // Most common occasion
  const occasionCounts = new Map<string, number>()
  for (const ev of events ?? []) {
    if (ev.occasion) occasionCounts.set(ev.occasion, (occasionCounts.get(ev.occasion) ?? 0) + 1)
  }
  const topOccasion =
    Array.from(occasionCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'N/A'

  // Dietary restriction frequency
  const restrictionCounts = new Map<string, number>()
  for (const ev of events ?? []) {
    for (const r of ev.dietary_restrictions ?? []) {
      restrictionCounts.set(r, (restrictionCounts.get(r) ?? 0) + 1)
    }
  }
  const dietaryFrequency = Array.from(restrictionCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([restriction, count]) => ({ restriction, count, percent: pct(count, total) }))

  // Avg courses per event (from dishes table via menus)
  const eventIds = (events ?? []).map((e: any) => e.id)
  let avgCourses = 0
  if (eventIds.length > 0) {
    const { data: menus } = await db
      .from('menus')
      .select('event_id, dishes(id)')
      .in('event_id', eventIds)
      .not('event_id', 'is', null)

    if (menus?.length) {
      const totalDishes = (menus ?? []).reduce(
        (s: any, m: any) => s + (Array.isArray(m.dishes) ? m.dishes.length : 0),
        0
      )
      avgCourses = Math.round((totalDishes / menus.length) * 10) / 10
    }
  }

  return {
    avgCoursesPerEvent: avgCourses,
    avgGuestsPerEvent: avgGuests,
    mostCommonOccasion: topOccasion,
    dietaryRestrictionFrequency: dietaryFrequency,
  }
}

export async function getEffectiveHourlyRateByMonth(): Promise<EffectiveHourlyRateByMonth[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: events } = await db
    .from('events')
    .select(
      `
      id, event_date, quoted_price_cents,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at,
      reset_started_at, reset_completed_at
    `
    )
    .eq('tenant_id', chef.tenantId!)
    .eq('is_demo', false)
    .eq('status', 'completed')
    .gte('event_date', oneYearAgo.toISOString().slice(0, 10))

  const monthMap = new Map<string, { revenue: number; minutes: number; count: number }>()

  for (const ev of events ?? []) {
    const month = ev.event_date.slice(0, 7) // YYYY-MM
    const slot = monthMap.get(month) ?? { revenue: 0, minutes: 0, count: 0 }
    slot.revenue += ev.quoted_price_cents ?? 0
    slot.count++

    const addPhase = (s: string | null, e: string | null) => {
      const m = phaseMinutes(s, e)
      if (m) slot.minutes += m
    }
    addPhase(ev.shopping_started_at, ev.shopping_completed_at)
    addPhase(ev.prep_started_at, ev.prep_completed_at)
    addPhase(ev.travel_started_at, ev.travel_completed_at)
    addPhase(ev.service_started_at, ev.service_completed_at)
    addPhase(ev.reset_started_at, ev.reset_completed_at)

    monthMap.set(month, slot)
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { revenue, minutes, count }]) => ({
      month,
      avgHourlyRateCents:
        minutes > 0 ? Math.round(((revenue / (minutes / 60)) * count) / count) : 0,
      eventCount: count,
    }))
}
