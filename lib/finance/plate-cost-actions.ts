'use server'

// Plate Cost Actions - server actions for true cost-per-plate analysis.
// Formula > AI: all calculations are pure math, zero LLM dependency.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  groupExpensesByCategory,
  calculatePlateCostFromTotals,
  type PlateCostResult,
  type EventExpenseRow,
} from './plate-cost-calculator'

// ── Types ──────────────────────────────────────────────────────────────

export interface EventPlateCostRow {
  eventId: string
  eventName: string
  eventDate: string | null
  clientName: string | null
  guestCount: number
  costPerPlateCents: number
  revenuePerPlateCents: number
  totalCostCents: number
  totalRevenueCents: number
  marginPercent: number
  breakdown: PlateCostResult['breakdown']
}

export interface PlateCostSummary {
  avgCostPerPlateCents: number
  avgMarginPercent: number
  avgRevenuePerPlateCents: number
  totalEvents: number
  bestEvent: EventPlateCostRow | null
  worstEvent: EventPlateCostRow | null
  events: EventPlateCostRow[]
}

// ── Single Event Plate Cost ────────────────────────────────────────────

export async function getEventPlateCost(eventId: string): Promise<EventPlateCostRow | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch event details, financial summary, and expenses in parallel
  const [eventRes, financialRes, expensesRes] = await Promise.all([
    db
      .from('events')
      .select('id, event_date, occasion, guest_count, client_id, clients(full_name)')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('event_financial_summary')
      .select('net_revenue_cents, total_expenses_cents')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('expenses')
      .select('category, amount_cents')
      .eq('tenant_id', tenantId)
      .eq('event_id', eventId)
      .limit(10_000),
  ])

  if (eventRes.error || financialRes.error) return null

  const evt = eventRes.data
  const fin = financialRes.data
  const expenses: EventExpenseRow[] = expensesRes.data || []
  const guestCount = evt.guest_count ?? 0

  if (guestCount <= 0) return null

  const revenueCents = fin.net_revenue_cents ?? 0
  const grouped = groupExpensesByCategory(expenses)

  // If no categorized expenses but we have total_expenses_cents from ledger,
  // use that as the "Other" category so the plate cost still reflects reality
  const totalGrouped = Array.from(grouped.values()).reduce((s, v) => s + v, 0)
  const ledgerExpenses = fin.total_expenses_cents ?? 0
  if (totalGrouped === 0 && ledgerExpenses > 0) {
    grouped.set('Other', ledgerExpenses)
  } else if (ledgerExpenses > totalGrouped && totalGrouped > 0) {
    // Uncategorized gap between ledger total and itemized expenses
    const gap = ledgerExpenses - totalGrouped
    if (gap > 0) {
      grouped.set('Other', (grouped.get('Other') || 0) + gap)
    }
  }

  const result = calculatePlateCostFromTotals(grouped, guestCount, revenueCents)

  return {
    eventId: evt.id,
    eventName: evt.occasion ?? 'Untitled Event',
    eventDate: evt.event_date ?? null,
    clientName: evt.clients?.full_name ?? null,
    guestCount,
    costPerPlateCents: result.costPerPlateCents,
    revenuePerPlateCents: result.revenuePerPlateCents,
    totalCostCents: result.totalCostCents,
    totalRevenueCents: revenueCents,
    marginPercent: result.marginPercent,
    breakdown: result.breakdown,
  }
}

// ── Aggregate Plate Cost Summary ───────────────────────────────────────

export async function getPlateCostSummary(): Promise<PlateCostSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch all events with guest counts (only those with guests > 0 are useful)
  const { data: events, error: eventsErr } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, client_id, clients(full_name), status')
    .eq('tenant_id', tenantId)
    .gt('guest_count', 0)
    .order('event_date', { ascending: false })
    .limit(10_000)

  if (eventsErr || !events || events.length === 0) {
    return {
      avgCostPerPlateCents: 0,
      avgMarginPercent: 0,
      avgRevenuePerPlateCents: 0,
      totalEvents: 0,
      bestEvent: null,
      worstEvent: null,
      events: [],
    }
  }

  const eventIds = events.map((e: any) => e.id)

  // Fetch financials and expenses for all events in parallel
  const [financialsRes, expensesRes] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_expenses_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds),
    db
      .from('expenses')
      .select('event_id, category, amount_cents')
      .eq('tenant_id', tenantId)
      .in('event_id', eventIds)
      .limit(50_000),
  ])

  // Build financial lookup
  const finMap = new Map<string, { revenue: number; expenses: number }>()
  for (const f of financialsRes.data || []) {
    finMap.set(f.event_id, {
      revenue: f.net_revenue_cents ?? 0,
      expenses: f.total_expenses_cents ?? 0,
    })
  }

  // Build expense lookup grouped by event
  const expenseMap = new Map<string, EventExpenseRow[]>()
  for (const exp of expensesRes.data || []) {
    if (!exp.event_id) continue
    if (!expenseMap.has(exp.event_id)) {
      expenseMap.set(exp.event_id, [])
    }
    expenseMap.get(exp.event_id)!.push({
      category: exp.category,
      amount_cents: exp.amount_cents,
    })
  }

  // Calculate plate cost for each event
  const rows: EventPlateCostRow[] = []

  for (const evt of events) {
    const guestCount = evt.guest_count ?? 0
    if (guestCount <= 0) continue

    const fin = finMap.get(evt.id)
    const revenueCents = fin?.revenue ?? 0
    const ledgerExpenses = fin?.expenses ?? 0
    const eventExpenses = expenseMap.get(evt.id) || []

    const grouped = groupExpensesByCategory(eventExpenses)

    // Fill gap from ledger if needed
    const totalGrouped = Array.from(grouped.values()).reduce((s, v) => s + v, 0)
    if (totalGrouped === 0 && ledgerExpenses > 0) {
      grouped.set('Other', ledgerExpenses)
    } else if (ledgerExpenses > totalGrouped && totalGrouped > 0) {
      const gap = ledgerExpenses - totalGrouped
      if (gap > 0) {
        grouped.set('Other', (grouped.get('Other') || 0) + gap)
      }
    }

    const result = calculatePlateCostFromTotals(grouped, guestCount, revenueCents)

    rows.push({
      eventId: evt.id,
      eventName: evt.occasion ?? 'Untitled Event',
      eventDate: evt.event_date ?? null,
      clientName: evt.clients?.full_name ?? null,
      guestCount,
      costPerPlateCents: result.costPerPlateCents,
      revenuePerPlateCents: result.revenuePerPlateCents,
      totalCostCents: result.totalCostCents,
      totalRevenueCents: revenueCents,
      marginPercent: result.marginPercent,
      breakdown: result.breakdown,
    })
  }

  // Compute summary stats
  const totalEvents = rows.length
  const avgCostPerPlateCents =
    totalEvents > 0
      ? Math.round(rows.reduce((s, r) => s + r.costPerPlateCents, 0) / totalEvents)
      : 0
  const avgRevenuePerPlateCents =
    totalEvents > 0
      ? Math.round(rows.reduce((s, r) => s + r.revenuePerPlateCents, 0) / totalEvents)
      : 0
  const avgMarginPercent =
    totalEvents > 0
      ? Math.round((rows.reduce((s, r) => s + r.marginPercent, 0) / totalEvents) * 10) / 10
      : 0

  // Best/worst by margin
  let bestEvent: EventPlateCostRow | null = null
  let worstEvent: EventPlateCostRow | null = null

  for (const row of rows) {
    if (!bestEvent || row.marginPercent > bestEvent.marginPercent) bestEvent = row
    if (!worstEvent || row.marginPercent < worstEvent.marginPercent) worstEvent = row
  }

  return {
    avgCostPerPlateCents,
    avgMarginPercent,
    avgRevenuePerPlateCents,
    totalEvents,
    bestEvent,
    worstEvent,
    events: rows,
  }
}
