'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RevenuePerUnitStats {
  revenuePerGuestCents: number
  revenuePerHourCents: number
  revenuePerMileCents: number
  totalGuestsServed: number
  totalHoursWorked: number
  totalMilesDriven: number
  netRevenueCents: number
}

export interface RevenueByDayOfWeek {
  day: string
  dayIndex: number // 0=Sun, 1=Mon ... 6=Sat
  eventCount: number
  revenueCents: number
  avgRevenueCents: number
}

export interface RevenueByEventType {
  occasion: string
  eventCount: number
  revenueCents: number
  avgRevenueCents: number
  avgGuestCount: number
}

export interface RevenueBySeason {
  season: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  label: string
  eventCount: number
  revenueCents: number
  avgRevenueCents: number
}

export interface TrueLaborCostStats {
  ownerHoursCents: number
  staffCostCents: number
  totalLaborCents: number
  laborAsPercentOfRevenue: number
  trueNetProfitCents: number
  trueNetMarginPercent: number
}

export interface CapacityStats {
  maxEventsPerMonth: number | null
  bookedThisMonth: number
  utilization: number // 0–100 %
  demandOverflow: number // inquiries declined for capacity/date reasons
}

export interface CarryForwardStats {
  totalSavingsCents: number
  avgSavingsPerEvent: number
  eventsWithCarryForward: number
  savingsAsPercentOfFoodCost: number
}

export interface BreakEvenStats {
  estimatedFixedMonthlyCents: number
  avgEventsPerMonth: number
  breakEvenEventsPerMonth: number
  breakEvenRevenuePerEventCents: number
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SEASON_LABELS: Record<string, string> = {
  Q1: 'Jan–Mar',
  Q2: 'Apr–Jun',
  Q3: 'Jul–Sep',
  Q4: 'Oct–Dec',
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

function monthToSeason(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month <= 2) return 'Q1'
  if (month <= 5) return 'Q2'
  if (month <= 8) return 'Q3'
  return 'Q4'
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getRevenuePerUnitStats(
  startDate: string,
  endDate: string
): Promise<RevenuePerUnitStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, guest_count, mileage_miles,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at,
      reset_started_at, reset_completed_at
    `
    )
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('amount_cents, is_refund, event_id')
    .eq('tenant_id', chef.id)
    .in('entry_type', ['payment', 'deposit', 'installment', 'final_payment', 'add_on', 'credit'])

  const eventIds = new Set((events ?? []).map((e: any) => e.id))
  const netRevenue = (ledger ?? [])
    .filter((l: any) => l.event_id && eventIds.has(l.event_id))
    .reduce((sum: any, l: any) => sum + (l.is_refund ? -l.amount_cents : l.amount_cents), 0)

  let totalGuests = 0
  let totalMinutes = 0
  let totalMiles = 0

  for (const ev of events ?? []) {
    totalGuests += ev.guest_count ?? 0
    totalMiles += Number(ev.mileage_miles ?? 0)

    const addPhase = (start: string | null, end: string | null) => {
      if (start && end) {
        const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000
        if (mins > 0) totalMinutes += mins
      }
    }
    addPhase(ev.shopping_started_at, ev.shopping_completed_at)
    addPhase(ev.prep_started_at, ev.prep_completed_at)
    addPhase(ev.travel_started_at, ev.travel_completed_at)
    addPhase(ev.service_started_at, ev.service_completed_at)
    addPhase(ev.reset_started_at, ev.reset_completed_at)
  }

  const totalHours = totalMinutes / 60

  return {
    revenuePerGuestCents: totalGuests > 0 ? Math.round(netRevenue / totalGuests) : 0,
    revenuePerHourCents: totalHours > 0 ? Math.round(netRevenue / totalHours) : 0,
    revenuePerMileCents: totalMiles > 0 ? Math.round(netRevenue / totalMiles) : 0,
    totalGuestsServed: totalGuests,
    totalHoursWorked: Math.round(totalHours * 10) / 10,
    totalMilesDriven: Math.round(totalMiles * 10) / 10,
    netRevenueCents: netRevenue,
  }
}

export async function getRevenueByDayOfWeek(
  startDate: string,
  endDate: string
): Promise<RevenueByDayOfWeek[]> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, quoted_price_cents')
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  const dayMap = new Map<number, { count: number; revenue: number }>()
  for (let i = 0; i < 7; i++) dayMap.set(i, { count: 0, revenue: 0 })

  for (const ev of events ?? []) {
    const day = new Date(ev.event_date).getDay()
    const slot = dayMap.get(day)!
    slot.count++
    slot.revenue += ev.quoted_price_cents ?? 0
  }

  return Array.from(dayMap.entries()).map(([dayIndex, { count, revenue }]) => ({
    day: DAY_NAMES[dayIndex],
    dayIndex,
    eventCount: count,
    revenueCents: revenue,
    avgRevenueCents: count > 0 ? Math.round(revenue / count) : 0,
  }))
}

export async function getRevenueByEventType(
  startDate: string,
  endDate: string
): Promise<RevenueByEventType[]> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('occasion, quoted_price_cents, guest_count')
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .not('occasion', 'is', null)

  const typeMap = new Map<string, { count: number; revenue: number; guests: number }>()
  for (const ev of events ?? []) {
    const key = ev.occasion ?? 'other'
    const slot = typeMap.get(key) ?? { count: 0, revenue: 0, guests: 0 }
    slot.count++
    slot.revenue += ev.quoted_price_cents ?? 0
    slot.guests += ev.guest_count ?? 0
    typeMap.set(key, slot)
  }

  return Array.from(typeMap.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([occasion, { count, revenue, guests }]) => ({
      occasion,
      eventCount: count,
      revenueCents: revenue,
      avgRevenueCents: count > 0 ? Math.round(revenue / count) : 0,
      avgGuestCount: count > 0 ? Math.round(guests / count) : 0,
    }))
}

export async function getRevenueBySeason(): Promise<RevenueBySeason[]> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('event_date, quoted_price_cents')
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')

  const seasonMap = new Map<string, { count: number; revenue: number }>()
  for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) seasonMap.set(q, { count: 0, revenue: 0 })

  for (const ev of events ?? []) {
    const month = new Date(ev.event_date).getMonth() // 0-indexed
    const season = monthToSeason(month)
    const slot = seasonMap.get(season)!
    slot.count++
    slot.revenue += ev.quoted_price_cents ?? 0
  }

  return Array.from(seasonMap.entries()).map(([season, { count, revenue }]) => ({
    season: season as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    label: SEASON_LABELS[season],
    eventCount: count,
    revenueCents: revenue,
    avgRevenueCents: count > 0 ? Math.round(revenue / count) : 0,
  }))
}

export async function getTrueLaborCostStats(
  startDate: string,
  endDate: string
): Promise<TrueLaborCostStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  // Get owner hourly rate from preferences
  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('owner_hourly_rate_cents')
    .eq('tenant_id', chef.id)
    .single()

  const ownerRateCents = prefs?.owner_hourly_rate_cents ?? 0

  // Get completed events in period with time tracking
  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, quoted_price_cents,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at,
      reset_started_at, reset_completed_at
    `
    )
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  let totalOwnerMinutes = 0
  let totalRevenue = 0

  for (const ev of events ?? []) {
    totalRevenue += ev.quoted_price_cents ?? 0
    const addPhase = (start: string | null, end: string | null) => {
      if (start && end) {
        const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000
        if (mins > 0 && mins < 1440) totalOwnerMinutes += mins // cap at 24h to filter bad data
      }
    }
    addPhase(ev.shopping_started_at, ev.shopping_completed_at)
    addPhase(ev.prep_started_at, ev.prep_completed_at)
    addPhase(ev.travel_started_at, ev.travel_completed_at)
    addPhase(ev.service_started_at, ev.service_completed_at)
    addPhase(ev.reset_started_at, ev.reset_completed_at)
  }

  const ownerHoursCents =
    ownerRateCents > 0 ? Math.round((totalOwnerMinutes / 60) * ownerRateCents) : 0

  // Staff costs in period
  const eventIds = (events ?? []).map((e: any) => e.id)
  let staffCostCents = 0
  if (eventIds.length > 0) {
    const { data: staff } = await supabase
      .from('event_staff_assignments')
      .select('pay_amount_cents')
      .in('event_id', eventIds)
      .eq('status', 'completed')
      .not('pay_amount_cents', 'is', null)

    staffCostCents = (staff ?? []).reduce((sum: any, s: any) => sum + (s.pay_amount_cents ?? 0), 0)
  }

  // Expenses (non-labor)
  let totalExpenses = 0
  if (eventIds.length > 0) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .in('event_id', eventIds)
      .eq('is_business', true)

    totalExpenses = (expenses ?? []).reduce((sum: any, e: any) => sum + e.amount_cents, 0)
  }

  const totalLaborCents = ownerHoursCents + staffCostCents
  const trueNetProfit = totalRevenue - totalExpenses - totalLaborCents

  return {
    ownerHoursCents,
    staffCostCents,
    totalLaborCents,
    laborAsPercentOfRevenue: pct(totalLaborCents, totalRevenue),
    trueNetProfitCents: trueNetProfit,
    trueNetMarginPercent: pct(trueNetProfit, totalRevenue),
  }
}

export async function getCapacityStats(month: string): Promise<CapacityStats> {
  // month = YYYY-MM
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('max_events_per_month')
    .eq('tenant_id', chef.id)
    .single()

  const maxEvents = prefs?.max_events_per_month ?? null

  const startDate = `${month}-01`
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)

  const { count: booked } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .not('status', 'in', '("cancelled")')

  const bookedCount = booked ?? 0
  const utilization = maxEvents ? pct(bookedCount, maxEvents) : 0

  // Declined inquiries due to date/capacity conflict
  const { count: overflow } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
    .eq('status', 'declined')
    .in('decline_reason', ['wrong_date'])
    .gte('created_at', `${month}-01`)
    .lte('created_at', `${month}-31`)

  return {
    maxEventsPerMonth: maxEvents,
    bookedThisMonth: bookedCount,
    utilization,
    demandOverflow: overflow ?? 0,
  }
}

export async function getCarryForwardStats(
  startDate: string,
  endDate: string
): Promise<CarryForwardStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('leftover_value_carried_forward_cents, leftover_value_received_cents, id')
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', startDate)
    .lte('event_date', endDate)

  const eventsWithCarry = (events ?? []).filter(
    (e: any) => (e.leftover_value_received_cents ?? 0) > 0
  )
  const totalSavings = eventsWithCarry.reduce(
    (sum: any, e: any) => sum + (e.leftover_value_received_cents ?? 0),
    0
  )

  // Total food cost in period
  const eventIds = (events ?? []).map((e: any) => e.id)
  let totalFoodCost = 0
  if (eventIds.length > 0) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .in('event_id', eventIds)
      .in('category', ['groceries', 'alcohol', 'specialty_items'])
      .eq('is_business', true)

    totalFoodCost = (expenses ?? []).reduce((sum: any, e: any) => sum + e.amount_cents, 0)
  }

  return {
    totalSavingsCents: totalSavings,
    avgSavingsPerEvent:
      eventsWithCarry.length > 0 ? Math.round(totalSavings / eventsWithCarry.length) : 0,
    eventsWithCarryForward: eventsWithCarry.length,
    savingsAsPercentOfFoodCost: pct(totalSavings, totalFoodCost),
  }
}

export async function getBreakEvenStats(): Promise<BreakEvenStats> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  // Estimate fixed costs: last 3 months avg of non-event expenses
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: nonEventExpenses } = await supabase
    .from('expenses')
    .select('amount_cents')
    .eq('tenant_id', chef.id)
    .is('event_id', null)
    .gte('expense_date', threeMonthsAgo.toISOString().slice(0, 10))

  const totalFixed = (nonEventExpenses ?? []).reduce((s: any, e: any) => s + e.amount_cents, 0)
  const avgMonthlyFixed = Math.round(totalFixed / 3)

  // Average events per month (last 12 months)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { count: eventsYtd } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', oneYearAgo.toISOString().slice(0, 10))

  const avgEventsPerMonth = Math.round(((eventsYtd ?? 0) / 12) * 10) / 10

  // Average revenue per event
  const { data: revenueData } = await supabase
    .from('events')
    .select('quoted_price_cents')
    .eq('tenant_id', chef.id)
    .eq('status', 'completed')
    .gte('event_date', oneYearAgo.toISOString().slice(0, 10))
    .not('quoted_price_cents', 'is', null)

  const avgRevenue = revenueData?.length
    ? Math.round(
        revenueData.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0) /
          revenueData.length
      )
    : 0

  // Break-even: how many events per month cover fixed costs
  const breakEvenEvents = avgRevenue > 0 ? Math.ceil(avgMonthlyFixed / avgRevenue) : 0

  return {
    estimatedFixedMonthlyCents: avgMonthlyFixed,
    avgEventsPerMonth,
    breakEvenEventsPerMonth: breakEvenEvents,
    breakEvenRevenuePerEventCents: avgRevenue,
  }
}
