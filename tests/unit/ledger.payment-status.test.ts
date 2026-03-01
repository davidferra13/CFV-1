/**
 * Unit tests for Payment Status Derivation
 *
 * Tests the logic that determines payment_status from ledger entries.
 * Mirrors the Postgres trigger logic in update_event_payment_status_on_ledger_insert.
 *
 * Run: npm run test:unit
 * Run critical only: npm run test:critical
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type PaymentStatus = 'unpaid' | 'deposit_paid' | 'partial' | 'paid' | 'refunded'

/**
 * Pure function mirroring the Postgres trigger logic.
 * Given payment totals, derive the payment status.
 */
function derivePaymentStatus(
  quotedPriceCents: number,
  totalPaidCents: number,
  depositAmountCents: number | null,
  hasRefund: boolean
): PaymentStatus {
  if (hasRefund) return 'refunded'
  if (totalPaidCents === 0) return 'unpaid'
  if (totalPaidCents >= quotedPriceCents) return 'paid'
  if (
    depositAmountCents &&
    totalPaidCents >= depositAmountCents &&
    totalPaidCents < quotedPriceCents
  ) {
    return 'deposit_paid'
  }
  if (totalPaidCents > 0 && totalPaidCents < quotedPriceCents) return 'partial'
  return 'unpaid'
}

describe('A8: Unpaid when no ledger entries exist', () => {
  it('returns unpaid for zero payments', () => {
    const status = derivePaymentStatus(50000, 0, 10000, false)
    assert.equal(status, 'unpaid')
  })

  it('returns unpaid for zero payments even without deposit requirement', () => {
    const status = derivePaymentStatus(50000, 0, null, false)
    assert.equal(status, 'unpaid')
  })
})

describe('A9: deposit_paid when deposit covered but balance outstanding', () => {
  it('returns deposit_paid when exact deposit amount paid', () => {
    const status = derivePaymentStatus(50000, 10000, 10000, false)
    assert.equal(status, 'deposit_paid')
  })

  it('returns deposit_paid when more than deposit but less than total', () => {
    const status = derivePaymentStatus(50000, 25000, 10000, false)
    assert.equal(status, 'deposit_paid')
  })
})

describe('A10: Paid when total_paid >= quoted_price', () => {
  it('returns paid when exactly matched', () => {
    const status = derivePaymentStatus(50000, 50000, 10000, false)
    assert.equal(status, 'paid')
  })

  it('returns paid when overpaid', () => {
    const status = derivePaymentStatus(50000, 55000, 10000, false)
    assert.equal(status, 'paid')
  })

  it('returns refunded when refund exists', () => {
    const status = derivePaymentStatus(50000, 50000, 10000, true)
    assert.equal(status, 'refunded')
  })
})

describe('Payment status edge cases', () => {
  it('partial when some paid but less than deposit', () => {
    const status = derivePaymentStatus(50000, 5000, 10000, false)
    assert.equal(status, 'partial')
  })

  it('partial when no deposit defined and some paid', () => {
    const status = derivePaymentStatus(50000, 25000, null, false)
    assert.equal(status, 'partial')
  })
})
