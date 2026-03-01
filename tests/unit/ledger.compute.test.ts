/**
 * Unit tests for Ledger Computation Logic
 *
 * Tests the pure financial computation patterns used in lib/ledger/compute.ts.
 * These tests verify the math WITHOUT hitting the database — they test the
 * computation logic that runs on fetched ledger entries.
 *
 * Run: npm run test:unit
 * Run critical only: npm run test:critical
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─── Pure computation helpers (mirroring compute.ts logic) ─────────────────

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

function computeEventFinancials(
  quotedPriceCents: number,
  entries: LedgerEntry[],
  totalExpensesCents: number,
  tipAmountCents: number
) {
  const totals = computeTenantFinancials(entries)
  const outstandingBalanceCents = quotedPriceCents - totals.totalRevenueCents
  const profitCents = totals.netRevenueCents - totalExpensesCents
  const profitMargin = totals.netRevenueCents > 0 ? profitCents / totals.netRevenueCents : 0
  const foodCostPercentage =
    totals.netRevenueCents > 0 ? totalExpensesCents / totals.netRevenueCents : 0

  return {
    ...totals,
    quotedPriceCents,
    tipAmountCents,
    totalExpensesCents,
    outstandingBalanceCents,
    profitCents,
    profitMargin,
    foodCostPercentage,
  }
}

// ─── Test Group A: Financial Integrity ─────────────────────────────────────

describe('A1: Net revenue = payments - refunds', () => {
  it('computes correctly with mixed entries', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 20000, is_refund: false },
      { entry_type: 'deposit', amount_cents: 10000, is_refund: false },
      { entry_type: 'payment', amount_cents: 15000, is_refund: false },
      { entry_type: 'refund', amount_cents: -5000, is_refund: true },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRevenueCents, 45000) // 20000 + 10000 + 15000
    assert.equal(result.totalRefundsCents, 5000)
    assert.equal(result.netRevenueCents, 40000) // 45000 - 5000
  })

  it('handles no refunds', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 50000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.netRevenueCents, 50000)
    assert.equal(result.totalRefundsCents, 0)
  })

  it('handles all refunds (net zero scenario)', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 10000, is_refund: false },
      { entry_type: 'refund', amount_cents: -10000, is_refund: true },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.netRevenueCents, 0)
  })
})

describe('A2: Outstanding balance = quoted - total paid', () => {
  it('computes outstanding correctly', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'deposit', amount_cents: 10000, is_refund: false },
    ]
    const result = computeEventFinancials(50000, entries, 0, 0)
    assert.equal(result.outstandingBalanceCents, 40000) // 50000 - 10000
  })

  it('outstanding is zero when fully paid', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'deposit', amount_cents: 10000, is_refund: false },
      { entry_type: 'payment', amount_cents: 40000, is_refund: false },
    ]
    const result = computeEventFinancials(50000, entries, 0, 0)
    assert.equal(result.outstandingBalanceCents, 0)
  })
})

describe('A3: Profit margin = (revenue - expenses) / revenue', () => {
  it('computes 70% margin correctly', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 50000, is_refund: false },
    ]
    const result = computeEventFinancials(50000, entries, 15000, 0)
    assert.equal(result.profitCents, 35000) // 50000 - 15000
    assert.equal(result.profitMargin, 0.7) // 35000 / 50000
  })
})

describe('A4: Food cost % = expenses / revenue', () => {
  it('computes 30% food cost correctly', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 50000, is_refund: false },
    ]
    const result = computeEventFinancials(50000, entries, 15000, 0)
    assert.equal(result.foodCostPercentage, 0.3) // 15000 / 50000
  })
})

describe('A5: Zero revenue — no division by zero', () => {
  it('returns 0 for profit margin when revenue is 0', () => {
    const result = computeEventFinancials(50000, [], 5000, 0)
    assert.equal(result.profitMargin, 0)
    assert.equal(Number.isFinite(result.profitMargin), true)
  })

  it('returns 0 for food cost when revenue is 0', () => {
    const result = computeEventFinancials(50000, [], 5000, 0)
    assert.equal(result.foodCostPercentage, 0)
    assert.equal(Number.isFinite(result.foodCostPercentage), true)
  })
})

describe('A6: All amounts are integers (cents), never floats', () => {
  it('revenue totals are integers', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 33333, is_refund: false },
      { entry_type: 'payment', amount_cents: 16667, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(Number.isInteger(result.totalRevenueCents), true)
    assert.equal(Number.isInteger(result.netRevenueCents), true)
    assert.equal(Number.isInteger(result.totalRefundsCents), true)
    assert.equal(Number.isInteger(result.totalTipsCents), true)
  })
})

describe('A7: Tips tracked separately from revenue', () => {
  it('tips are not included in totalRevenueCents', () => {
    const entries: LedgerEntry[] = [
      { entry_type: 'payment', amount_cents: 50000, is_refund: false },
      { entry_type: 'tip', amount_cents: 5000, is_refund: false },
    ]
    const result = computeTenantFinancials(entries)
    assert.equal(result.totalRevenueCents, 50000) // tip NOT included
    assert.equal(result.totalTipsCents, 5000)
    assert.equal(result.totalWithTipsCents, 55000) // revenue + tips
  })
})
