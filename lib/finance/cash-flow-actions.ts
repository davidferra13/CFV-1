'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type CashFlowPeriod = {
  label: string
  startDate: string
  endDate: string
  confirmedIncomeCents: number
  projectedIncomeCents: number
  confirmedExpenseCents: number
  projectedExpenseCents: number
  netCents: number
}

export type CashFlowForecast = {
  periods: CashFlowPeriod[]
  totalConfirmedInCents: number
  totalProjectedInCents: number
  totalConfirmedOutCents: number
  totalProjectedOutCents: number
  /** Running cash position per period (cumulative net from start) */
  runningBalanceCents: number[]
  /** First period where running balance drops below threshold, or null */
  warningPeriod: { label: string; balanceCents: number } | null
}

export type WhatIfScenario = {
  baselineNetCents: number
  adjustedNetCents: number
  deltaCents: number
  description: string
}

// ─── Helpers ─────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function periodLabel(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ─── Actions ─────────────────────────────────────────────────────

export async function getCashFlowForecast(days: 30 | 60 | 90 = 30): Promise<CashFlowForecast> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const endDate = addDays(today, days)

  // Get confirmed events (paid/confirmed status) with amounts
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date, status, total_amount_cents')
    .eq('chef_id', user.tenantId!)
    .gte('event_date', today)
    .lte('event_date', endDate)

  // Get proposed/accepted events as projected income
  const confirmedEvents = (events || []).filter((e: any) =>
    ['paid', 'confirmed', 'in_progress'].includes(e.status)
  )
  const projectedEvents = (events || []).filter((e: any) =>
    ['proposed', 'accepted'].includes(e.status)
  )

  // Get recurring invoices
  const { data: recurring } = await supabase
    .from('recurring_invoices')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .lte('next_send_date', endDate)

  // Get upcoming expenses (from expenses table)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_cents, expense_date')
    .eq('chef_id', user.tenantId!)
    .gte('expense_date', today)
    .lte('expense_date', endDate)

  // Build periods (divide into weeks for 30 days, bi-weekly for 60/90)
  const periodDays = days <= 30 ? 7 : 14
  const periods: CashFlowPeriod[] = []
  let cursor = today

  while (cursor < endDate) {
    const periodEnd =
      addDays(cursor, periodDays - 1) < endDate ? addDays(cursor, periodDays - 1) : endDate

    const periodConfirmedIncome = confirmedEvents
      .filter((e: any) => e.event_date >= cursor && e.event_date <= periodEnd)
      .reduce((sum: number, e: any) => sum + ((e as any).total_amount_cents || 0), 0)

    const periodProjectedIncome = projectedEvents
      .filter((e: any) => e.event_date >= cursor && e.event_date <= periodEnd)
      .reduce((sum: number, e: any) => sum + ((e as any).total_amount_cents || 0), 0)

    const periodRecurring = (recurring || [])
      .filter((r: any) => r.next_send_date >= cursor && r.next_send_date <= periodEnd)
      .reduce((sum: number, r: any) => sum + (r.amount_cents || 0), 0)

    const periodExpenses = (expenses || [])
      .filter((e: any) => (e as any).expense_date >= cursor && (e as any).expense_date <= periodEnd)
      .reduce((sum: number, e: any) => sum + ((e as any).amount_cents || 0), 0)

    const confirmedIn = periodConfirmedIncome + periodRecurring
    const projectedIn = periodProjectedIncome
    const confirmedOut = periodExpenses
    const projectedOut = 0

    periods.push({
      label: periodLabel(cursor, periodEnd),
      startDate: cursor,
      endDate: periodEnd,
      confirmedIncomeCents: confirmedIn,
      projectedIncomeCents: projectedIn,
      confirmedExpenseCents: confirmedOut,
      projectedExpenseCents: projectedOut,
      netCents: confirmedIn + projectedIn - confirmedOut - projectedOut,
    })

    cursor = addDays(periodEnd, 1)
  }

  // Compute running balance (cumulative net cash position)
  const runningBalanceCents: number[] = []
  let cumulative = 0
  for (const p of periods) {
    cumulative += p.netCents
    runningBalanceCents.push(cumulative)
  }

  // Warning: find first period where running balance drops below $500 (50000 cents)
  const WARNING_THRESHOLD_CENTS = 50000
  let warningPeriod: { label: string; balanceCents: number } | null = null
  for (let i = 0; i < periods.length; i++) {
    if (runningBalanceCents[i] < WARNING_THRESHOLD_CENTS) {
      warningPeriod = { label: periods[i].label, balanceCents: runningBalanceCents[i] }
      break
    }
  }

  return {
    periods,
    totalConfirmedInCents: periods.reduce((s, p) => s + p.confirmedIncomeCents, 0),
    totalProjectedInCents: periods.reduce((s, p) => s + p.projectedIncomeCents, 0),
    totalConfirmedOutCents: periods.reduce((s, p) => s + p.confirmedExpenseCents, 0),
    totalProjectedOutCents: periods.reduce((s, p) => s + p.projectedExpenseCents, 0),
    runningBalanceCents,
    warningPeriod,
  }
}

export async function getWhatIfScenario(params: {
  additionalRevenueCents?: number
  additionalExpenseCents?: number
  cancelledEventIds?: string[]
  description: string
}): Promise<WhatIfScenario> {
  const forecast = await getCashFlowForecast(30)
  const baselineNetCents =
    forecast.totalConfirmedInCents +
    forecast.totalProjectedInCents -
    forecast.totalConfirmedOutCents -
    forecast.totalProjectedOutCents

  let adjustedNetCents = baselineNetCents
  adjustedNetCents += params.additionalRevenueCents || 0
  adjustedNetCents -= params.additionalExpenseCents || 0

  // If events are cancelled, reduce income
  if (params.cancelledEventIds?.length) {
    const user = await requireChef()
    const supabase: any = createServerClient()

    const { data: cancelled } = await supabase
      .from('events')
      .select('total_amount_cents')
      .eq('chef_id', user.tenantId!)
      .in('id', params.cancelledEventIds)

    const cancelledAmount = (cancelled || []).reduce(
      (s: number, e: any) => s + ((e as any).total_amount_cents || 0),
      0
    )
    adjustedNetCents -= cancelledAmount
  }

  return {
    baselineNetCents,
    adjustedNetCents,
    deltaCents: adjustedNetCents - baselineNetCents,
    description: params.description,
  }
}
