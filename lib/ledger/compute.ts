// Ledger Computation - Derive Financial State from Ledger
// NEVER store balances/status - always compute from ledger entries

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Get event financial summary (computed from ledger)
 * Uses the event_financial_summary VIEW
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
    expectedTotalCents: data.expected_total_cents,
    expectedDepositCents: data.expected_deposit_cents,
    collectedCents: data.collected_cents,
    balanceCents: data.collected_cents - data.expected_total_cents,
    isFullyPaid: data.is_fully_paid,
    isDepositPaid: data.is_deposit_paid
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
    .select('entry_type, amount_cents')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getTenantFinancialSummary] Error:', error)
    throw new Error('Failed to compute tenant financials')
  }

  // Compute totals from ledger
  let totalRevenue = 0
  let totalRefunds = 0
  let totalPayouts = 0

  for (const entry of entries) {
    switch (entry.entry_type) {
      case 'charge_succeeded':
        totalRevenue += entry.amount_cents
        break
      case 'refund_succeeded':
        totalRefunds += Math.abs(entry.amount_cents)
        break
      case 'payout_paid':
        totalPayouts += entry.amount_cents
        break
    }
  }

  return {
    totalRevenueCents: totalRevenue,
    totalRefundsCents: totalRefunds,
    totalPayoutsCents: totalPayouts,
    netRevenueCents: totalRevenue - totalRefunds,
    pendingPayoutCents: totalRevenue - totalRefunds - totalPayouts
  }
}

/**
 * Format cents to currency string (for display)
 */
export function formatCurrency(cents: number, currency = 'USD'): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(dollars)
}
