// Ledger Computation - Derive Financial State from Ledger
// NEVER store balances/status - always compute from ledger entries

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

/**
 * Get event financial summary (computed via the event_financial_summary view)
 */
export async function getEventFinancialSummary(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  // Hard limit to prevent memory exhaustion - a single tenant should never have
  // more than 50K ledger entries. If they do, this caps the computation.
  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('entry_type, amount_cents, is_refund')
    .eq('tenant_id', user.tenantId!)
    .limit(50_000)

  if (error) {
    log.ledger.error('getTenantFinancialSummary failed', { error })
    throw new Error('Failed to compute tenant financials')
  }

  // Compute totals from ledger entries using new entry types
  let totalRevenue = 0
  let totalRefunds = 0
  let totalTips = 0

  for (const entry of entries) {
    if (entry.is_refund || entry.entry_type === 'refund') {
      totalRefunds += Math.abs(entry.amount_cents)
    } else if (entry.entry_type === 'tip') {
      totalTips += entry.amount_cents
    } else {
      // payment, deposit, installment, final_payment, add_on, credit
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

/**
 * Compute YTD carry-forward inventory savings
 * (sum of leftover_value_received_cents across all events this year)
 */
export async function getYtdCarryForwardSavings() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const yearStart = `${new Date().getFullYear()}-01-01`

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  // Revenue from ledger (capped at 50K entries per year - prevents memory exhaustion)
  const { data: ledgerEntries, error: ledgerError } = await supabase
    .from('ledger_entries')
    .select('entry_type, amount_cents, created_at, is_refund')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')
    .limit(50_000)

  if (ledgerError) {
    log.ledger.error('computeProfitAndLoss ledger query failed', { error: ledgerError })
    throw new Error('Failed to load ledger entries for P&L')
  }

  // Expenses (capped at 50K per year)
  const { data: expenses, error: expenseError } = await supabase
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

  // Monthly revenue breakdown
  const monthlyRevenue = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.is_refund && entry.entry_type !== 'refund') {
      const month = (entry.created_at as string).slice(0, 7)
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
