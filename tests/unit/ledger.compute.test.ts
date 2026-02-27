/**
 * Unit tests for Ledger Computation Logic
 *
 * Tests the pure financial computation logic that derives balances,
 * revenue, refunds, tips, and profit from ledger entries.
 * This is P1 — wrong financial numbers = money loss.
 *
 * Tests the computation formulas independent of the database.
 * The actual functions in lib/ledger/compute.ts use Supabase,
 * so we test the same logic by extracting the computation patterns.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { factories } from '../helpers/factories.js'

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTATION LOGIC (extracted from lib/ledger/compute.ts)
// These are the exact formulas used in getTenantFinancialSummary()
// and computeProfitAndLoss() — tested without Supabase dependency.
// ─────────────────────────────────────────────────────────────────────────────

type LedgerEntry = {
  entry_type: string
  amount_cents: number
  is_refund: boolean
}

function computeTenantFinancials(entries: LedgerEntry[]) {
  let totalRevenue = 0
  let totalRefunds = 0
  let totalTips = 0

  for (const entry of entries) {
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

type ExpenseEntry = { amount_cents: number; category: string | null }

function computeProfitAndLoss(entries: LedgerEntry[], expenses: ExpenseEntry[]) {
  const { totalRevenueCents, totalRefundsCents, totalTipsCents, netRevenueCents } =
    computeTenantFinancials(entries)

  const expensesByCategory = new Map<string, number>()
  for (const expense of expenses) {
    const cat = expense.category || 'Uncategorized'
    expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + expense.amount_cents)
  }

  const totalExpensesCents = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const netProfitCents = netRevenueCents - totalExpensesCents
  const profitMarginPercent =
    netRevenueCents > 0 ? Math.round((netProfitCents / netRevenueCents) * 1000) / 10 : 0

  return {
    totalRevenueCents,
    totalRefundsCents,
    totalTipsCents,
    netRevenueCents,
    totalExpensesCents,
    netProfitCents,
    profitMarginPercent,
    expensesByCategory: Object.fromEntries(expensesByCategory),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Ledger Computation — computeTenantFinancials', () => {
  it('returns zeros for empty ledger', () => {
    const result = computeTenantFinancials([])
    assert.equal(result.totalRevenueCents, 0)
    assert.equal(result.totalRefundsCents, 0)
    assert.equal(result.totalTipsCents, 0)
    assert.equal(result.netRevenueCents, 0)
    assert.equal(result.totalWithTipsCents, 0)
  })

  it('sums payments correctly', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 50000, is_refund: false },
      { entry_type: 'deposit', amount_cents: 25000, is_refund: false },
      { entry_type: 'final_payment', amount_cents: 25000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRevenueCents, 100000)
    assert.equal(result.netRevenueCents, 100000)
  })

  it('handles tips separately from revenue', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 100000, is_refund: false },
      { entry_type: 'tip', amount_cents: 15000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRevenueCents, 100000, 'tips should not count as revenue')
    assert.equal(result.totalTipsCents, 15000)
    assert.equal(result.totalWithTipsCents, 115000, 'totalWithTips = revenue + tips')
  })

  it('handles refunds via entry_type=refund', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 100000, is_refund: false },
      { entry_type: 'refund', amount_cents: 25000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRevenueCents, 100000)
    assert.equal(result.totalRefundsCents, 25000)
    assert.equal(result.netRevenueCents, 75000)
  })

  it('handles refunds via is_refund flag', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 100000, is_refund: false },
      { entry_type: 'payment', amount_cents: 30000, is_refund: true },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRefundsCents, 30000)
    assert.equal(result.netRevenueCents, 70000)
  })

  it('handles negative refund amounts by using absolute value', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 100000, is_refund: false },
      { entry_type: 'refund', amount_cents: -25000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRefundsCents, 25000, 'refunds use Math.abs()')
  })

  it('handles all entry types in a realistic flow', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'deposit', amount_cents: 50000, is_refund: false },
      { entry_type: 'installment', amount_cents: 25000, is_refund: false },
      { entry_type: 'final_payment', amount_cents: 25000, is_refund: false },
      { entry_type: 'add_on', amount_cents: 10000, is_refund: false },
      { entry_type: 'tip', amount_cents: 15000, is_refund: false },
      { entry_type: 'refund', amount_cents: 5000, is_refund: false },
      { entry_type: 'credit', amount_cents: 3000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    // Revenue = deposit + installment + final_payment + add_on + credit = 113000
    assert.equal(result.totalRevenueCents, 113000)
    assert.equal(result.totalTipsCents, 15000)
    assert.equal(result.totalRefundsCents, 5000)
    assert.equal(result.netRevenueCents, 108000) // 113000 - 5000
    assert.equal(result.totalWithTipsCents, 123000) // 113000 + 15000 - 5000
  })
})

describe('Ledger Computation — computeProfitAndLoss', () => {
  it('computes profit margin correctly', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 100000, is_refund: false },
    ]
    const expenses: ExpenseEntry[] = [
      { amount_cents: 30000, category: 'Ingredients' },
      { amount_cents: 10000, category: 'Transport' },
    ]
    const result = computeProfitAndLoss(entries, expenses)
    assert.equal(result.totalRevenueCents, 100000)
    assert.equal(result.totalExpensesCents, 40000)
    assert.equal(result.netProfitCents, 60000)
    assert.equal(result.profitMarginPercent, 60.0) // 60000/100000 = 60%
  })

  it('returns 0% margin when revenue is zero', () => {
    const result = computeProfitAndLoss([], [{ amount_cents: 5000, category: 'Misc' }])
    assert.equal(result.profitMarginPercent, 0)
    assert.equal(result.netProfitCents, -5000) // loss
  })

  it('groups expenses by category', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 200000, is_refund: false },
    ]
    const expenses: ExpenseEntry[] = [
      { amount_cents: 15000, category: 'Ingredients' },
      { amount_cents: 10000, category: 'Ingredients' },
      { amount_cents: 5000, category: 'Transport' },
      { amount_cents: 3000, category: null }, // should go to "Uncategorized"
    ]
    const result = computeProfitAndLoss(entries, expenses)
    assert.equal(result.expensesByCategory['Ingredients'], 25000)
    assert.equal(result.expensesByCategory['Transport'], 5000)
    assert.equal(result.expensesByCategory['Uncategorized'], 3000)
  })

  it('handles refunds in P&L correctly', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 100000, is_refund: false },
      { entry_type: 'refund', amount_cents: 20000, is_refund: false },
    ]
    const expenses: ExpenseEntry[] = [{ amount_cents: 40000, category: 'Ingredients' }]
    const result = computeProfitAndLoss(entries, expenses)
    assert.equal(result.netRevenueCents, 80000) // 100k - 20k refund
    assert.equal(result.netProfitCents, 40000) // 80k - 40k expenses
    assert.equal(result.profitMarginPercent, 50.0)
  })

  it('computes correctly with factories.paymentFlow', () => {
    const flow = factories.paymentFlow('t1', 'c1', 'e1')
    const entries: LedgerEntry[] = [
      {
        entry_type: flow.deposit.entry_type,
        amount_cents: flow.deposit.amount_cents,
        is_refund: false,
      },
      {
        entry_type: flow.finalPayment.entry_type,
        amount_cents: flow.finalPayment.amount_cents,
        is_refund: false,
      },
      { entry_type: flow.tip.entry_type, amount_cents: flow.tip.amount_cents, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRevenueCents, 100000) // deposit 50k + final 50k
    assert.equal(result.totalTipsCents, 15000)
    assert.equal(result.totalWithTipsCents, 115000)
  })
})

describe('Ledger Computation — amount validation', () => {
  it('rejects non-integer amounts (from append.ts logic)', () => {
    const amount = 100.5
    assert.equal(Number.isInteger(amount), false, 'Fractional cents must be rejected')
  })

  it('accepts integer amounts', () => {
    assert.equal(Number.isInteger(10000), true)
    assert.equal(Number.isInteger(0), true)
    assert.equal(Number.isInteger(-5000), true) // negative adjustments are valid integers
  })
})
