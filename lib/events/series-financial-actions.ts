'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ──────────────────────────────────────────────────────────

export type SeriesFinancialSummary = {
  seriesId: string
  seriesName: string
  eventCount: number
  completedCount: number
  totalRevenueCents: number
  totalExpenseCents: number
  totalProfitCents: number
  avgMarginPercent: number | null
  avgPerGuestCents: number | null
  totalGuests: number
  events: Array<{
    id: string
    occasion: string | null
    event_date: string | null
    status: string | null
    guest_count: number | null
    revenue_cents: number
    expense_cents: number
    profit_cents: number
    margin_percent: number | null
  }>
}

// ─── Query ──────────────────────────────────────────────────────────

export async function getSeriesFinancialSummary(
  seriesId: string
): Promise<SeriesFinancialSummary | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: series } = await db
    .from('event_series')
    .select('id, name')
    .eq('id', seriesId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!series) return null

  // Get all events in this series
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, guest_count')
    .eq('event_series_id', seriesId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })

  const eventList = events ?? []
  if (eventList.length === 0) {
    return {
      seriesId: series.id,
      seriesName: series.name,
      eventCount: 0,
      completedCount: 0,
      totalRevenueCents: 0,
      totalExpenseCents: 0,
      totalProfitCents: 0,
      avgMarginPercent: null,
      avgPerGuestCents: null,
      totalGuests: 0,
      events: [],
    }
  }

  const eventIds = eventList.map((e: any) => e.id)

  // Get financial summaries from the view
  const { data: financials } = await db
    .from('event_financial_summary')
    .select('event_id, total_revenue_cents, total_expense_cents, net_profit_cents')
    .in('event_id', eventIds)

  const financialMap = new Map<string, any>((financials ?? []).map((f: any) => [f.event_id, f]))

  // Also get ticket revenue
  const { data: ticketRevenue } = await db
    .from('event_tickets')
    .select('event_id, total_cents')
    .in('event_id', eventIds)
    .eq('payment_status', 'paid')

  const ticketRevenueMap = new Map<string, number>()
  for (const t of ticketRevenue ?? []) {
    ticketRevenueMap.set(
      t.event_id,
      (ticketRevenueMap.get(t.event_id) ?? 0) + (Number(t.total_cents) || 0)
    )
  }

  let totalRevenue = 0
  let totalExpense = 0
  let totalGuests = 0
  let completedCount = 0

  const eventSummaries = eventList.map((e: any) => {
    const fin = financialMap.get(e.id)
    const tRev = ticketRevenueMap.get(e.id) ?? 0

    // Use ledger revenue if available, otherwise ticket revenue
    const revCents = Number(fin?.total_revenue_cents) || tRev
    const expCents = Number(fin?.total_expense_cents) || 0
    const profitCents = revCents - expCents
    const margin = revCents > 0 ? Math.round((profitCents / revCents) * 100) : null

    totalRevenue += revCents
    totalExpense += expCents
    totalGuests += Number(e.guest_count) || 0
    if (e.status === 'completed') completedCount++

    return {
      id: e.id,
      occasion: e.occasion,
      event_date: e.event_date,
      status: e.status,
      guest_count: e.guest_count,
      revenue_cents: revCents,
      expense_cents: expCents,
      profit_cents: profitCents,
      margin_percent: margin,
    }
  })

  const totalProfit = totalRevenue - totalExpense

  return {
    seriesId: series.id,
    seriesName: series.name,
    eventCount: eventList.length,
    completedCount,
    totalRevenueCents: totalRevenue,
    totalExpenseCents: totalExpense,
    totalProfitCents: totalProfit,
    avgMarginPercent: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : null,
    avgPerGuestCents: totalGuests > 0 ? Math.round(totalRevenue / totalGuests) : null,
    totalGuests,
    events: eventSummaries,
  }
}

export async function getAllSeriesFinancials(): Promise<SeriesFinancialSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: allSeries } = await db
    .from('event_series')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  const results: SeriesFinancialSummary[] = []
  for (const s of allSeries ?? []) {
    const summary = await getSeriesFinancialSummary(s.id)
    if (summary && summary.eventCount > 0) {
      results.push(summary)
    }
  }

  return results
}
