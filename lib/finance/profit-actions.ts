'use server'

// Server actions for Financial Clarity Dashboard.
// Wraps profit-calculator functions with auth gates and tenant scoping.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  calculateEventProfit,
  calculateMonthlyProfit,
  calculateProfitTrend,
  type EventProfit,
  type ProfitAtAGlanceData,
} from './profit-calculator'

/**
 * Dashboard "at a glance" summary: monthly profit, trend, YTD.
 * Auth-gated and tenant-scoped.
 */
export async function getProfitAtAGlance(): Promise<ProfitAtAGlanceData> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Fetch current month data and trend in parallel
  const [monthly, trend] = await Promise.all([
    calculateMonthlyProfit(currentMonth),
    calculateProfitTrend(),
  ])

  // YTD: fetch all events this year
  const ytdStart = `${year}-01-01`
  const ytdEnd = `${year}-12-31`

  const { data: ytdEvents } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('event_date', ytdStart)
    .lte('event_date', ytdEnd)
    .limit(1000)

  const ytdEventIds = (ytdEvents || []).map((e: any) => e.id)
  let ytdRevenueCents = 0
  let ytdCostCents = 0

  if (ytdEventIds.length > 0) {
    const [finRes, expRes, laborRes] = await Promise.all([
      db
        .from('event_financial_summary')
        .select('total_paid_cents, tip_amount_cents')
        .eq('tenant_id', tenantId)
        .in('event_id', ytdEventIds),
      db
        .from('expenses')
        .select('amount_cents')
        .eq('tenant_id', tenantId)
        .eq('is_business', true)
        .gte('expense_date', ytdStart)
        .lte('expense_date', ytdEnd),
      db
        .from('event_staff_assignments')
        .select('pay_amount_cents')
        .eq('chef_id', tenantId)
        .in('event_id', ytdEventIds),
    ])

    for (const f of finRes?.data || []) {
      ytdRevenueCents += (f.total_paid_cents ?? 0) + (f.tip_amount_cents ?? 0)
    }
    for (const exp of expRes?.data || []) {
      ytdCostCents += exp.amount_cents ?? 0
    }
    for (const l of laborRes?.data || []) {
      ytdCostCents += l.pay_amount_cents ?? 0
    }
  }

  const hasData = monthly.revenueCents > 0 || monthly.totalCostCents > 0
    || ytdRevenueCents > 0 || ytdCostCents > 0

  return {
    monthlyProfitCents: monthly.netProfitCents,
    monthlyRevenueCents: monthly.revenueCents,
    monthlyCostCents: monthly.totalCostCents,
    eventCount: monthly.eventCount,
    avgProfitPerEventCents: monthly.avgProfitPerEventCents,
    trend,
    ytdProfitCents: ytdRevenueCents - ytdCostCents,
    ytdRevenueCents,
    ytdCostCents,
    ytdEventCount: ytdEventIds.length,
    hasData,
  }
}

/**
 * Per-event P&L breakdown. Auth-gated with tenant check.
 */
export async function getEventPnL(eventId: string): Promise<EventProfit | null> {
  if (!eventId) return null
  // calculateEventProfit already calls requireChef() internally
  return calculateEventProfit(eventId)
}

/**
 * Clarity page data: monthly summary + per-event list + highlights.
 */
export async function getFinancialClarityData(): Promise<{
  atAGlance: ProfitAtAGlanceData
  recentEvents: EventProfit[]
  mostProfitable: EventProfit | null
  leastProfitable: EventProfit | null
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get at-a-glance data
  const atAGlance = await getProfitAtAGlance()

  // Get recent events with financial summaries (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const lookbackDate = sixMonthsAgo.toISOString().slice(0, 10)

  const { data: events } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, client_id, clients(full_name)')
    .eq('tenant_id', tenantId)
    .gte('event_date', lookbackDate)
    .order('event_date', { ascending: false })
    .limit(50)

  const eventList = events || []

  // Get financial summaries for these events
  const eventIds = eventList.map((e: any) => e.id)
  const finMap = new Map<string, { revenue: number; expenses: number }>()

  if (eventIds.length > 0) {
    const [finRes, expRes] = await Promise.all([
      db
        .from('event_financial_summary')
        .select('event_id, total_paid_cents, tip_amount_cents, total_expenses_cents')
        .eq('tenant_id', tenantId)
        .in('event_id', eventIds),
      db
        .from('expenses')
        .select('event_id, amount_cents, is_business')
        .eq('tenant_id', tenantId)
        .eq('is_business', true)
        .in('event_id', eventIds),
    ])

    for (const f of finRes?.data || []) {
      const rev = (f.total_paid_cents ?? 0) + (f.tip_amount_cents ?? 0)
      finMap.set(f.event_id, { revenue: rev, expenses: 0 })
    }

    for (const exp of expRes?.data || []) {
      if (!exp.event_id) continue
      const existing = finMap.get(exp.event_id) || { revenue: 0, expenses: 0 }
      existing.expenses += exp.amount_cents ?? 0
      finMap.set(exp.event_id, existing)
    }
  }

  const recentEvents: EventProfit[] = eventList
    .map((evt: any) => {
      const fin = finMap.get(evt.id)
      const revenueCents = fin?.revenue ?? 0
      const totalCostCents = fin?.expenses ?? 0
      const netProfitCents = revenueCents - totalCostCents
      const marginPercent = revenueCents > 0
        ? Math.round(((revenueCents - totalCostCents) / revenueCents) * 1000) / 10
        : 0

      return {
        eventId: evt.id,
        revenueCents,
        foodCostCents: 0,
        travelCostCents: 0,
        suppliesCostCents: 0,
        laborCostCents: 0,
        otherCostCents: totalCostCents,
        totalCostCents,
        netProfitCents,
        marginPercent,
        eventDate: evt.event_date ?? null,
        occasion: evt.occasion ?? null,
        clientName: evt.clients?.full_name ?? null,
        guestCount: evt.guest_count ?? null,
      }
    })
    .filter((e: EventProfit) => e.revenueCents > 0 || e.totalCostCents > 0)

  let mostProfitable: EventProfit | null = null
  let leastProfitable: EventProfit | null = null

  for (const evt of recentEvents) {
    if (evt.revenueCents <= 0) continue
    if (!mostProfitable || evt.netProfitCents > mostProfitable.netProfitCents) {
      mostProfitable = evt
    }
    if (!leastProfitable || evt.netProfitCents < leastProfitable.netProfitCents) {
      leastProfitable = evt
    }
  }

  return {
    atAGlance,
    recentEvents,
    mostProfitable,
    leastProfitable,
  }
}
