'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────

export type EventMargin = {
  eventId: string
  revenueCents: number
  expensesCents: number
  profitCents: number
  marginPercent: number
  foodCostPercent: number
  perGuestRevenueCents: number | null
  perGuestCostCents: number | null
  guestCount: number | null
  occasion: string | null
  eventDate: string | null
  clientName: string | null
}

export type ClientLifetimeMargin = {
  clientId: string
  clientName: string
  totalEvents: number
  totalRevenueCents: number
  totalExpensesCents: number
  totalProfitCents: number
  avgMarginPercent: number
  avgEventValueCents: number
  firstEventDate: string | null
  lastEventDate: string | null
}

export type MonthlyMarginSummary = {
  month: string // YYYY-MM
  label: string // "Jan 2026"
  eventCount: number
  totalRevenueCents: number
  totalExpensesCents: number
  profitCents: number
  marginPercent: number
  bestEvent: { id: string; occasion: string | null; marginPercent: number } | null
  worstEvent: { id: string; occasion: string | null; marginPercent: number } | null
}

export type ProfitDashboardData = {
  ytdRevenueCents: number
  ytdExpensesCents: number
  ytdProfitCents: number
  ytdMarginPercent: number
  currentMonthRevenueCents: number
  currentMonthExpensesCents: number
  currentMonthProfitCents: number
  lastMonthRevenueCents: number
  lastMonthExpensesCents: number
  lastMonthProfitCents: number
  revenueChangePercent: number | null
  topClientsByRevenue: Array<{
    clientId: string
    clientName: string
    totalRevenueCents: number
    eventCount: number
  }>
  lowMarginEvents: Array<{
    eventId: string
    occasion: string | null
    eventDate: string | null
    clientName: string | null
    revenueCents: number
    expensesCents: number
    marginPercent: number
  }>
  monthlyTrend: MonthlyMarginSummary[]
}

// ── Helpers ────────────────────────────────────────────────────────────

function calcMargin(revenue: number, expenses: number): number {
  if (revenue <= 0) return 0
  return Math.round(((revenue - expenses) / revenue) * 1000) / 10
}

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

function monthLabel(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
}

// ── Server Actions ─────────────────────────────────────────────────────

/**
 * Per-event margin breakdown.
 * Revenue and expenses come from the event_financial_summary view (ledger-derived).
 * Guest count and event metadata come from the events table.
 */
export async function getEventMargin(eventId: string): Promise<EventMargin | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [financialRes, eventRes] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    db
      .from('events')
      .select('id, event_date, occasion, guest_count, client_id, clients(full_name)')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
  ])

  if (financialRes.error || eventRes.error) return null

  const fin = financialRes.data
  const evt = eventRes.data

  const revenue = fin.net_revenue_cents ?? 0
  const expenses = fin.total_expenses_cents ?? 0
  const profit = revenue - expenses
  const guestCount = evt.guest_count ?? null

  return {
    eventId,
    revenueCents: revenue,
    expensesCents: expenses,
    profitCents: profit,
    marginPercent: calcMargin(revenue, expenses),
    foodCostPercent: fin.food_cost_percentage ?? 0,
    perGuestRevenueCents: guestCount ? Math.round(revenue / guestCount) : null,
    perGuestCostCents: guestCount ? Math.round(expenses / guestCount) : null,
    guestCount,
    occasion: evt.occasion ?? null,
    eventDate: evt.event_date ?? null,
    clientName: evt.clients?.full_name ?? null,
  }
}

/**
 * Lifetime margin for a single client across all their events.
 */
export async function getClientLifetimeMargin(
  clientId: string
): Promise<ClientLifetimeMargin | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get client name
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientErr) return null

  // Get all events for this client with financial summaries
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, event_date')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })
    .limit(10_000)

  if (eventsErr || !events || events.length === 0) {
    return {
      clientId,
      clientName: client.full_name,
      totalEvents: 0,
      totalRevenueCents: 0,
      totalExpensesCents: 0,
      totalProfitCents: 0,
      avgMarginPercent: 0,
      avgEventValueCents: 0,
      firstEventDate: null,
      lastEventDate: null,
    }
  }

  const eventIds = events.map((e: any) => e.id)

  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, net_revenue_cents, total_expenses_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const finMap = new Map<string, { revenue: number; expenses: number }>()
  for (const f of financials || []) {
    finMap.set(f.event_id, {
      revenue: f.net_revenue_cents ?? 0,
      expenses: f.total_expenses_cents ?? 0,
    })
  }

  let totalRevenue = 0
  let totalExpenses = 0

  for (const eid of eventIds) {
    const f = finMap.get(eid)
    if (f) {
      totalRevenue += f.revenue
      totalExpenses += f.expenses
    }
  }

  const totalProfit = totalRevenue - totalExpenses
  const eventCount = events.length

  return {
    clientId,
    clientName: client.full_name,
    totalEvents: eventCount,
    totalRevenueCents: totalRevenue,
    totalExpensesCents: totalExpenses,
    totalProfitCents: totalProfit,
    avgMarginPercent: calcMargin(totalRevenue, totalExpenses),
    avgEventValueCents: eventCount > 0 ? Math.round(totalRevenue / eventCount) : 0,
    firstEventDate: events[0]?.event_date ?? null,
    lastEventDate: events[events.length - 1]?.event_date ?? null,
  }
}

/**
 * Monthly margin summaries for a given year (or a specific month).
 */
export async function getMonthlyMargins(
  year: number,
  month?: number
): Promise<MonthlyMarginSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = month ? `${year}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`
  const endDate = month ? `${year}-${String(month).padStart(2, '0')}-31` : `${year}-12-31`

  // Get events in range
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, event_date, occasion')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })
    .limit(10_000)

  if (eventsErr || !events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, net_revenue_cents, total_expenses_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  const finMap = new Map<string, { revenue: number; expenses: number }>()
  for (const f of financials || []) {
    finMap.set(f.event_id, {
      revenue: f.net_revenue_cents ?? 0,
      expenses: f.total_expenses_cents ?? 0,
    })
  }

  // Group by month
  const monthBuckets = new Map<
    string,
    {
      events: Array<{ id: string; occasion: string | null; revenue: number; expenses: number }>
    }
  >()

  for (const evt of events) {
    const yyyymm = (evt.event_date as string).slice(0, 7)
    if (!monthBuckets.has(yyyymm)) {
      monthBuckets.set(yyyymm, { events: [] })
    }
    const f = finMap.get(evt.id) ?? { revenue: 0, expenses: 0 }
    monthBuckets.get(yyyymm)!.events.push({
      id: evt.id,
      occasion: evt.occasion ?? null,
      revenue: f.revenue,
      expenses: f.expenses,
    })
  }

  const results: MonthlyMarginSummary[] = []

  for (const [yyyymm, bucket] of Array.from(monthBuckets.entries()).sort()) {
    let totalRev = 0
    let totalExp = 0
    let bestEvent: MonthlyMarginSummary['bestEvent'] = null
    let worstEvent: MonthlyMarginSummary['worstEvent'] = null

    for (const e of bucket.events) {
      totalRev += e.revenue
      totalExp += e.expenses
      const m = calcMargin(e.revenue, e.expenses)
      if (!bestEvent || m > bestEvent.marginPercent) {
        bestEvent = { id: e.id, occasion: e.occasion, marginPercent: m }
      }
      if (!worstEvent || m < worstEvent.marginPercent) {
        worstEvent = { id: e.id, occasion: e.occasion, marginPercent: m }
      }
    }

    results.push({
      month: yyyymm,
      label: monthLabel(yyyymm),
      eventCount: bucket.events.length,
      totalRevenueCents: totalRev,
      totalExpensesCents: totalExp,
      profitCents: totalRev - totalExp,
      marginPercent: calcMargin(totalRev, totalExp),
      bestEvent,
      worstEvent,
    })
  }

  return results
}

/**
 * Aggregated profit dashboard: YTD, month-over-month, top clients, low-margin events.
 */
export async function getProfitDashboard(): Promise<ProfitDashboardData> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const ytdStart = `${year}-01-01`
  const ytdEnd = `${year}-12-31`

  // Current month boundaries
  const cmStart = `${year}-${String(currentMonth).padStart(2, '0')}-01`
  const cmEnd = `${year}-${String(currentMonth).padStart(2, '0')}-31`

  // Last month boundaries
  const lmDate = new Date(year, currentMonth - 2, 1)
  const lmYear = lmDate.getFullYear()
  const lmMonth = lmDate.getMonth() + 1
  const lmStart = `${lmYear}-${String(lmMonth).padStart(2, '0')}-01`
  const lmEnd = `${lmYear}-${String(lmMonth).padStart(2, '0')}-31`

  // Fetch all YTD events with client names
  const { data: ytdEvents } = await db
    .from('events')
    .select('id, event_date, occasion, client_id, clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', ytdStart)
    .lte('event_date', ytdEnd)
    .order('event_date', { ascending: true })
    .limit(10_000)

  const events = ytdEvents || []
  const eventIds = events.map((e: any) => e.id)

  // Fetch financials for all YTD events
  let finMap = new Map<string, { revenue: number; expenses: number }>()
  if (eventIds.length > 0) {
    const { data: financials } = await db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_expenses_cents')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventIds)

    for (const f of financials || []) {
      finMap.set(f.event_id, {
        revenue: f.net_revenue_cents ?? 0,
        expenses: f.total_expenses_cents ?? 0,
      })
    }
  }

  // ── YTD totals ──
  let ytdRevenue = 0
  let ytdExpenses = 0
  for (const f of finMap.values()) {
    ytdRevenue += f.revenue
    ytdExpenses += f.expenses
  }

  // ── Current month vs last month ──
  let cmRevenue = 0,
    cmExpenses = 0
  let lmRevenue = 0,
    lmExpenses = 0

  for (const evt of events) {
    const f = finMap.get(evt.id)
    if (!f) continue
    const d = evt.event_date as string
    if (d >= cmStart && d <= cmEnd) {
      cmRevenue += f.revenue
      cmExpenses += f.expenses
    }
    if (d >= lmStart && d <= lmEnd) {
      lmRevenue += f.revenue
      lmExpenses += f.expenses
    }
  }

  const revenueChangePercent =
    lmRevenue > 0 ? Math.round(((cmRevenue - lmRevenue) / lmRevenue) * 1000) / 10 : null

  // ── Top 5 clients by revenue ──
  const clientRevMap = new Map<string, { name: string; revenue: number; count: number }>()
  for (const evt of events) {
    if (!evt.client_id) continue
    const f = finMap.get(evt.id)
    if (!f) continue
    const existing = clientRevMap.get(evt.client_id)
    if (existing) {
      existing.revenue += f.revenue
      existing.count += 1
    } else {
      clientRevMap.set(evt.client_id, {
        name: evt.clients?.full_name ?? 'Unknown',
        revenue: f.revenue,
        count: 1,
      })
    }
  }

  const topClientsByRevenue = Array.from(clientRevMap.entries())
    .map(([clientId, data]) => ({
      clientId,
      clientName: data.name,
      totalRevenueCents: data.revenue,
      eventCount: data.count,
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
    .slice(0, 5)

  // ── Low-margin events (below 20%) ──
  const lowMarginEvents = events
    .map((evt: any) => {
      const f = finMap.get(evt.id)
      if (!f || f.revenue <= 0) return null
      const margin = calcMargin(f.revenue, f.expenses)
      if (margin >= 20) return null
      return {
        eventId: evt.id,
        occasion: evt.occasion ?? null,
        eventDate: evt.event_date ?? null,
        clientName: evt.clients?.full_name ?? null,
        revenueCents: f.revenue,
        expensesCents: f.expenses,
        marginPercent: margin,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.marginPercent - b.marginPercent)
    .slice(0, 5) as ProfitDashboardData['lowMarginEvents']

  // ── Monthly trend (reuse logic) ──
  const monthlyTrend = await getMonthlyMargins(year)

  return {
    ytdRevenueCents: ytdRevenue,
    ytdExpensesCents: ytdExpenses,
    ytdProfitCents: ytdRevenue - ytdExpenses,
    ytdMarginPercent: calcMargin(ytdRevenue, ytdExpenses),
    currentMonthRevenueCents: cmRevenue,
    currentMonthExpensesCents: cmExpenses,
    currentMonthProfitCents: cmRevenue - cmExpenses,
    lastMonthRevenueCents: lmRevenue,
    lastMonthExpensesCents: lmExpenses,
    lastMonthProfitCents: lmRevenue - lmExpenses,
    revenueChangePercent,
    topClientsByRevenue,
    lowMarginEvents,
    monthlyTrend,
  }
}
