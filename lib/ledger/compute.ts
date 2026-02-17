// Ledger Computation - Derive Financial State from Ledger
// NEVER store balances/status - always compute from ledger entries

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Get event financial summary (computed via the event_financial_summary view)
 */
export async function getEventFinancialSummary(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getEventFinancialSummary] Error:', error)
    return null
  }

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
    paymentStatus: data.payment_status
  }
}

/**
 * Get tenant-wide financial totals (computed from ledger)
 */
export async function getTenantFinancialSummary() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('entry_type, amount_cents, is_refund')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getTenantFinancialSummary] Error:', error)
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
    totalWithTipsCents: totalRevenue + totalTips - totalRefunds
  }
}
