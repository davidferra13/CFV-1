'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildEventFoodCostTruth,
  buildRangeFoodCostTruth,
  sumFoodExpenseCents,
} from '@/lib/finance/food-cost-truth'
import type {
  EventFoodCostTruth,
  FoodCostTruthSource,
  RangeFoodCostTruth,
  RevenueBasis,
} from '@/lib/finance/food-cost-truth-types'

type EventRow = {
  id: string
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  quoted_price_cents: number | null
  estimated_food_cost_cents: number | null
  leftover_value_received_cents: number | null
  leftover_value_carried_forward_cents: number | null
}

type RangeInput = {
  startDate: string
  endDate: string
  basis: RevenueBasis
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
}

async function getProjectedFoodCostCents(
  db: any,
  eventId: string,
  tenantId: string,
  fallbackEstimatedCents: number | null
): Promise<{ projectedFoodCostCents: number | null; sources: FoodCostTruthSource[] }> {
  const sources: FoodCostTruthSource[] = []
  const { data: menuRows, error: menuError } = await db
    .from('menu_cost_summary')
    .select('total_recipe_cost_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(20)

  if (menuError) throw new Error('Failed to load menu food cost')

  const menuCostCents = ((menuRows ?? []) as any[]).reduce(
    (sum, row) => sum + (numberOrNull(row.total_recipe_cost_cents) ?? 0),
    0
  )
  if (menuCostCents > 0) {
    sources.push('menu_cost_summary')
    return { projectedFoodCostCents: menuCostCents, sources }
  }

  try {
    const { data: rpcCost } = await db.rpc('compute_projected_food_cost_cents', {
      p_event_id: eventId,
    })
    const projectedFoodCostCents = numberOrNull(rpcCost)
    if (projectedFoodCostCents != null) {
      sources.push('projected_food_cost_rpc')
      return { projectedFoodCostCents, sources }
    }
  } catch (err) {
    console.error('[food-cost-truth] projected food cost RPC failed', err)
  }

  const projectedFoodCostCents = numberOrNull(fallbackEstimatedCents)
  if (projectedFoodCostCents != null) {
    sources.push('event_estimated_food_cost')
  }
  return { projectedFoodCostCents, sources }
}

async function getEventFoodCostTruthInternal(
  db: any,
  tenantId: string,
  event: EventRow
): Promise<EventFoodCostTruth> {
  const [projected, expensesResult, financialResult] = await Promise.all([
    getProjectedFoodCostCents(db, event.id, tenantId, event.estimated_food_cost_cents),
    db
      .from('expenses')
      .select('category, amount_cents, is_business')
      .eq('event_id', event.id)
      .eq('tenant_id', tenantId)
      .limit(10_000),
    db
      .from('event_financial_summary')
      .select('net_revenue_cents, total_paid_cents, tip_amount_cents, quoted_price_cents')
      .eq('event_id', event.id)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ])

  if (expensesResult.error) throw new Error('Failed to load event food expenses')
  if (financialResult.error) throw new Error('Failed to load event revenue')

  const sources = [...projected.sources]
  const actualFoodCostCents = sumFoodExpenseCents(expensesResult.data ?? [])
  if (actualFoodCostCents > 0) sources.push('event_expenses')

  const leftoverInCents = numberOrNull(event.leftover_value_received_cents) ?? 0
  const leftoverOutCents = numberOrNull(event.leftover_value_carried_forward_cents) ?? 0
  const netFoodCostCents =
    actualFoodCostCents > 0 ? actualFoodCostCents - leftoverInCents - leftoverOutCents : null

  const financial = financialResult.data
  let revenueCents = numberOrNull(financial?.net_revenue_cents)
  let revenueBasis: RevenueBasis | null = revenueCents == null ? null : 'collected_revenue'
  if (revenueCents != null) sources.push('ledger_entries')

  if (revenueCents == null) {
    revenueCents = numberOrNull(event.quoted_price_cents ?? financial?.quoted_price_cents)
    revenueBasis = revenueCents == null ? null : 'quoted_price'
  }

  return buildEventFoodCostTruth({
    eventId: event.id,
    eventName: event.occasion || `Event ${event.event_date ?? event.id.slice(0, 8)}`,
    eventDate: event.event_date,
    guestCount: event.guest_count,
    projectedFoodCostCents: projected.projectedFoodCostCents,
    actualFoodCostCents: actualFoodCostCents > 0 ? actualFoodCostCents : null,
    netFoodCostCents,
    revenueCents,
    revenueBasis,
    sources,
  })
}

export async function getEventFoodCostTruth(eventId: string): Promise<EventFoodCostTruth | null> {
  if (!eventId) throw new Error('Event id is required')
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, quoted_price_cents, estimated_food_cost_cents, leftover_value_received_cents, leftover_value_carried_forward_cents'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) throw new Error('Failed to load event')
  if (!event) return null

  return getEventFoodCostTruthInternal(db, user.tenantId!, event as EventRow)
}

export async function getRecentEventFoodCostTruth(limit = 20): Promise<EventFoodCostTruth[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const boundedLimit = Math.max(1, Math.min(Math.round(limit), 50))

  const { data: events, error } = await db
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, quoted_price_cents, estimated_food_cost_cents, leftover_value_received_cents, leftover_value_carried_forward_cents'
    )
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'in_progress'])
    .order('event_date', { ascending: false })
    .limit(boundedLimit)

  if (error) throw new Error('Failed to load recent events for food cost truth')

  const rows = ((events ?? []) as EventRow[]).map((event) =>
    getEventFoodCostTruthInternal(db, user.tenantId!, event)
  )
  const truth = await Promise.all(rows)
  return truth.sort((a, b) => {
    const aComplete = a.dataState === 'complete' ? 0 : 1
    const bComplete = b.dataState === 'complete' ? 0 : 1
    return aComplete - bComplete
  })
}

export async function getRangeFoodCostTruth(input: RangeInput): Promise<RangeFoodCostTruth> {
  const user = await requireChef()
  const db: any = createServerClient()
  if (!input.startDate || !input.endDate) throw new Error('Date range is required')
  if (input.basis === 'service_day_sales' || input.basis === 'quoted_price') {
    throw new Error(`Unsupported range revenue basis: ${input.basis}`)
  }

  if (input.basis === 'daily_revenue') {
    const [revenueResult, invoiceResult] = await Promise.all([
      db
        .from('daily_revenue')
        .select('total_revenue_cents')
        .eq('chef_id', user.tenantId!)
        .gte('date', input.startDate)
        .lte('date', input.endDate),
      db
        .from('vendor_invoices')
        .select('total_cents')
        .eq('chef_id', user.tenantId!)
        .gte('invoice_date', input.startDate)
        .lte('invoice_date', input.endDate),
    ])
    if (revenueResult.error) throw new Error('Failed to load daily revenue')
    if (invoiceResult.error) throw new Error('Failed to load vendor invoices')

    const revenueCents = (revenueResult.data ?? []).reduce(
      (sum: number, row: any) => sum + (numberOrNull(row.total_revenue_cents) ?? 0),
      0
    )
    const actualFoodCostCents = (invoiceResult.data ?? []).reduce(
      (sum: number, row: any) => sum + (numberOrNull(row.total_cents) ?? 0),
      0
    )

    return buildRangeFoodCostTruth({
      startDate: input.startDate,
      endDate: input.endDate,
      actualFoodCostCents,
      revenueCents,
      revenueBasis: 'daily_revenue',
      eventCount: 0,
      sources: ['daily_revenue', 'vendor_invoices'],
    })
  }

  const [expenseResult, ledgerResult] = await Promise.all([
    db
      .from('expenses')
      .select('category, amount_cents, is_business')
      .eq('tenant_id', user.tenantId!)
      .gte('expense_date', input.startDate)
      .lte('expense_date', input.endDate)
      .limit(50_000),
    db
      .from('ledger_entries')
      .select('entry_type, amount_cents, is_refund')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', input.startDate)
      .lte('created_at', `${input.endDate}T23:59:59Z`)
      .limit(50_000),
  ])
  if (expenseResult.error) throw new Error('Failed to load range food expenses')
  if (ledgerResult.error) throw new Error('Failed to load range ledger revenue')

  const actualFoodCostCents = sumFoodExpenseCents(expenseResult.data ?? [])
  const revenueCents = (ledgerResult.data ?? []).reduce((sum: number, entry: any) => {
    if (entry.is_refund || entry.entry_type === 'refund') return sum - Math.abs(entry.amount_cents)
    if (entry.entry_type === 'tip') return sum
    return sum + (numberOrNull(entry.amount_cents) ?? 0)
  }, 0)

  return buildRangeFoodCostTruth({
    startDate: input.startDate,
    endDate: input.endDate,
    actualFoodCostCents,
    revenueCents,
    revenueBasis: input.basis === 'collected_revenue' ? 'collected_revenue' : 'ledger_revenue',
    eventCount: 0,
    sources: ['event_expenses', 'ledger_entries'],
  })
}
