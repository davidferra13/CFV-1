// Ledger Computation - Derive Financial State from Ledger
// NEVER store balances/status - always compute from ledger entries

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { log } from '@/lib/logger'
import { dateToMonthString } from '@/lib/utils/format'

/**
 * Get event financial summary (computed via the event_financial_summary view)
 */
export async function getEventFinancialSummary(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    log.ledger.error('getEventFinancialSummary failed', { error })
    throw new Error('Failed to load event financial summary')
  }

  if (!data) return null

  return {
    eventId: data.event_id,
    quotedPriceCents: data.quoted_price_cents ?? 0,
    totalPaidCents: data.total_paid_cents ?? 0,
    totalRefundedCents: data.total_refunded_cents ?? 0,
    totalExpensesCents: data.total_expenses_cents ?? 0,
    tipAmountCents: data.tip_amount_cents ?? 0,
    netRevenueCents: data.net_revenue_cents ?? 0,
    outstandingBalanceCents: data.outstanding_balance_cents ?? 0,
    profitCents: data.profit_cents ?? 0,
    profitMargin: data.profit_margin ?? 0,
    foodCostPercentage: data.food_cost_percentage ?? 0,
    paymentStatus: data.payment_status,
  }
}

/**
 * Get tenant-wide financial totals (computed from ledger)
 */
export async function getTenantFinancialSummary() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Use DB-side aggregation to avoid pulling all rows into JS memory.
  // This scales to any number of ledger entries without OOM risk.
  const { data: agg, error } = await db.rpc('compute_tenant_financial_summary', {
    p_tenant_id: user.tenantId!,
  })

  // Fallback: if RPC doesn't exist yet, use the JS loop (bounded)
  if (error?.code === '42883' || error?.message?.includes('does not exist')) {
    const { data: entries, error: fallbackErr } = await db
      .from('ledger_entries')
      .select('entry_type, amount_cents, is_refund')
      .eq('tenant_id', user.tenantId!)
      .limit(50_000)

    if (fallbackErr) {
      log.ledger.error('getTenantFinancialSummary failed', { error: fallbackErr })
      throw new Error('Failed to compute tenant financials')
    }

    let totalRevenue = 0
    let totalRefunds = 0
    let totalTips = 0

    for (const entry of entries ?? []) {
      if (entry.is_refund || entry.entry_type === 'refund') {
        totalRefunds += Math.abs(entry.amount_cents)
      } else if (entry.entry_type === 'tip') {
        totalTips += entry.amount_cents
      } else {
        totalRevenue += entry.amount_cents
      }
    }

    return {
      totalRevenueCents: totalRevenue,
      totalRefundsCents: totalRefunds,
      totalTipsCents: totalTips,
      netRevenueCents: totalRevenue - totalRefunds,
      totalWithTipsCents: totalRevenue + totalTips - totalRefunds,
    }
  }

  if (error) {
    log.ledger.error('getTenantFinancialSummary failed', { error })
    throw new Error('Failed to compute tenant financials')
  }

  const row = Array.isArray(agg) ? agg[0] : agg
  const totalRevenue = row?.total_revenue_cents ?? 0
  const totalRefunds = row?.total_refunds_cents ?? 0
  const totalTips = row?.total_tips_cents ?? 0

  return {
    totalRevenueCents: totalRevenue,
    totalRefundsCents: totalRefunds,
    totalTipsCents: totalTips,
    netRevenueCents: totalRevenue - totalRefunds,
    totalWithTipsCents: totalRevenue + totalTips - totalRefunds,
  }
}

/**
 * Compute YTD carry-forward inventory savings
 * (sum of leftover_value_received_cents across all events this year)
 */
export async function getYtdCarryForwardSavings() {
  const user = await requireChef()
  const db: any = createServerClient()

  const yearStart = `${new Date().getFullYear()}-01-01`

  const { data, error } = await db
    .from('events')
    .select('leftover_value_received_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', yearStart)
    .not('leftover_value_received_cents', 'is', null)
    .gt('leftover_value_received_cents', 0)

  if (error) {
    log.ledger.error('getYtdCarryForwardSavings failed', { error })
    throw new Error('Failed to load carry-forward savings')
  }

  return (data || []).reduce((sum: any, e: any) => sum + (e.leftover_value_received_cents ?? 0), 0)
}

/**
 * Compute full Profit & Loss for a given calendar year
 */
export async function computeProfitAndLoss(year: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  // Revenue from ledger (capped at 50K entries per year - prevents memory exhaustion)
  const { data: ledgerEntries, error: ledgerError } = await db
    .from('ledger_entries')
    .select('entry_type, amount_cents, created_at, received_at, is_refund')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59Z')
    .limit(50_000)

  if (ledgerError) {
    log.ledger.error('computeProfitAndLoss ledger query failed', { error: ledgerError })
    throw new Error('Failed to load ledger entries for P&L')
  }

  // Expenses (capped at 50K per year)
  const { data: expenses, error: expenseError } = await db
    .from('expenses')
    .select('amount_cents, category, description, expense_date')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .limit(50_000)

  if (expenseError) {
    log.ledger.error('computeProfitAndLoss expense query failed', { error: expenseError })
    throw new Error('Failed to load expenses for P&L')
  }

  const entries = ledgerEntries || []
  const allExpenses = expenses || []

  // Revenue calculation
  let totalRevenueCents = 0
  let totalRefundsCents = 0
  let totalTipsCents = 0

  for (const entry of entries) {
    if (entry.is_refund || entry.entry_type === 'refund') {
      totalRefundsCents += Math.abs(entry.amount_cents)
    } else if (entry.entry_type === 'tip') {
      totalTipsCents += entry.amount_cents
    } else {
      totalRevenueCents += entry.amount_cents
    }
  }

  const netRevenueCents = totalRevenueCents - totalRefundsCents

  // Expense breakdown by category
  const expensesByCategory = new Map<string, number>()
  for (const expense of allExpenses) {
    const cat = expense.category || 'Uncategorized'
    expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + expense.amount_cents)
  }

  const totalExpensesCents = allExpenses.reduce((s: any, e: any) => s + e.amount_cents, 0)
  const netProfitCents = netRevenueCents - totalExpensesCents
  const profitMarginPercent =
    netRevenueCents > 0 ? Math.round((netProfitCents / netRevenueCents) * 1000) / 10 : 0

  // Monthly revenue breakdown - use received_at (when payment was received) when available,
  // fall back to created_at. Convert to local time to avoid UTC midnight rollover.
  const monthlyRevenue = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.is_refund && entry.entry_type !== 'refund') {
      const raw = entry.received_at ?? entry.created_at
      const month = dateToMonthString(raw instanceof Date ? raw : new Date(raw as string))
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + entry.amount_cents)
    }
  }

  return {
    year,
    totalRevenueCents,
    totalRefundsCents,
    totalTipsCents,
    netRevenueCents,
    totalExpensesCents,
    netProfitCents,
    profitMarginPercent,
    expensesByCategory: Object.fromEntries(expensesByCategory),
    monthlyRevenue: Object.fromEntries(monthlyRevenue),
  }
}
