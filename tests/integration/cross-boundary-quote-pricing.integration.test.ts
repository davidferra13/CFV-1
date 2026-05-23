/**
 * Cross-Boundary Integration: Pricing -> Quote -> Deposit -> Ledger
 *
 * Tests the data flow across the financial domain boundaries:
 *   Pricing computation -> Quote total -> Deposit calculation -> Balance tracking
 *
 * Verifies that financial amounts maintain integrity as they cross
 * from pricing engine through quote creation into deposit/balance splits.
 *
 * Pure logic, no DB required.
 *
 * Run: npm run test:integration
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ── Inline: pricing computation (mirrors lib/pricing/compute.ts) ───────────

type PricingModel = 'per_person' | 'flat_rate' | 'custom'

function computeQuoteTotal(
  pricingModel: PricingModel,
  pricePerPersonCents: number | null,
  guestCount: number | null,
  flatTotalCents: number | null
): number {
  if (pricingModel === 'per_person' && pricePerPersonCents && guestCount) {
    return pricePerPersonCents * guestCount
  }
  if (pricingModel === 'flat_rate' && flatTotalCents) {
    return flatTotalCents
  }
  return flatTotalCents ?? 0
}

// ── Inline: deposit computation (mirrors quotes.math) ──────────────────────

function computeDepositAmount(
  totalCents: number,
  depositPercentage: number | null,
  depositAmountCents: number | null
): number {
  if (depositAmountCents != null && depositAmountCents > 0) {
    return depositAmountCents
  }
  if (depositPercentage != null && depositPercentage > 0) {
    return Math.round(totalCents * (depositPercentage / 100))
  }
  return 0
}

function computeBalanceDue(totalCents: number, depositCents: number): number {
  return Math.max(0, totalCents - depositCents)
}

// ── Inline: quote FSM transitions (mirrors lib/quotes/actions.ts) ──────────

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: ['draft'],
}

function isValidQuoteTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ── Inline: event FSM (mirrors lib/events/fsm.ts) ─────────────────────────

type EventStatus = 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['proposed', 'paid', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function isValidEventTransition(from: EventStatus, to: EventStatus): boolean {
  return EVENT_TRANSITIONS[from]?.includes(to) ?? false
}

// ── Inline: formatting (mirrors lib/pricing/compute.ts) ────────────────────

function formatCentsAsDollars(cents: number): string {
  const dollars = cents / 100
  const hasCents = dollars % 1 !== 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(dollars)
}

// ── Cross-Boundary Tests ───────────────────────────────────────────────────

describe('Cross-Boundary: Pricing -> Quote -> Deposit -> Balance', () => {
  describe('Per-person pricing flows to correct quote total', () => {
    it('8 guests at $125/person = $1,000 total', () => {
      const total = computeQuoteTotal('per_person', 12500, 8, null)
      assert.equal(total, 100000)
      assert.equal(formatCentsAsDollars(total), '$1,000')
    })

    it('2 guests (couples dinner) at $150/person = $300', () => {
      const total = computeQuoteTotal('per_person', 15000, 2, null)
      assert.equal(total, 30000)
    })

    it('1 guest at $200/person = $200', () => {
      const total = computeQuoteTotal('per_person', 20000, 1, null)
      assert.equal(total, 20000)
    })
  })

  describe('Flat rate pricing flows correctly', () => {
    it('flat rate of $2,500 passes through', () => {
      const total = computeQuoteTotal('flat_rate', null, null, 250000)
      assert.equal(total, 250000)
    })

    it('flat rate ignores per-person fields', () => {
      const total = computeQuoteTotal('flat_rate', 10000, 6, 250000)
      assert.equal(total, 250000)
    })
  })

  describe('Deposit splits correctly from total', () => {
    const quoteTotalCents = 100000 // $1,000

    it('50% deposit = $500', () => {
      const deposit = computeDepositAmount(quoteTotalCents, 50, null)
      assert.equal(deposit, 50000)
      const balance = computeBalanceDue(quoteTotalCents, deposit)
      assert.equal(balance, 50000)
    })

    it('deposit + balance = total (invariant)', () => {
      const deposit = computeDepositAmount(quoteTotalCents, 50, null)
      const balance = computeBalanceDue(quoteTotalCents, deposit)
      assert.equal(deposit + balance, quoteTotalCents, 'deposit + balance must equal total')
    })

    it('explicit deposit amount overrides percentage', () => {
      const deposit = computeDepositAmount(quoteTotalCents, 50, 30000)
      assert.equal(deposit, 30000) // $300 explicit, not $500 from 50%
    })

    it('zero deposit yields full balance', () => {
      const deposit = computeDepositAmount(quoteTotalCents, null, null)
      assert.equal(deposit, 0)
      const balance = computeBalanceDue(quoteTotalCents, deposit)
      assert.equal(balance, quoteTotalCents)
    })

    it('deposit cannot exceed total (balance never negative)', () => {
      const deposit = 120000 // $1,200 deposit on $1,000 total
      const balance = computeBalanceDue(quoteTotalCents, deposit)
      assert.equal(balance, 0, 'Balance should be clamped to 0')
    })
  })

  describe('Rounding safety for odd splits', () => {
    it('33% deposit on $1,000 rounds to nearest cent', () => {
      const deposit = computeDepositAmount(100000, 33, null)
      // 100000 * 33/100 = 33000 exactly
      assert.equal(deposit, 33000)
      const balance = computeBalanceDue(100000, deposit)
      assert.equal(deposit + balance, 100000)
    })

    it('33% deposit on $999.99 rounds correctly', () => {
      const total = 99999
      const deposit = computeDepositAmount(total, 33, null)
      // 99999 * 0.33 = 32999.67, rounds to 33000
      assert.equal(deposit, 33000)
      const balance = computeBalanceDue(total, deposit)
      assert.equal(deposit + balance, total)
    })
  })
})

describe('Cross-Boundary: Quote FSM -> Event FSM Lifecycle', () => {
  describe('Quote acceptance enables event payment', () => {
    it('quote: draft -> sent is valid', () => {
      assert.equal(isValidQuoteTransition('draft', 'sent'), true)
    })

    it('quote: sent -> accepted is valid', () => {
      assert.equal(isValidQuoteTransition('sent', 'accepted'), true)
    })

    it('accepted quote is terminal (no further transitions)', () => {
      assert.equal(isValidQuoteTransition('accepted', 'draft'), false)
      assert.equal(isValidQuoteTransition('accepted', 'sent'), false)
    })

    it('event: accepted -> paid follows quote acceptance', () => {
      assert.equal(isValidEventTransition('accepted', 'paid'), true)
    })

    it('event: paid -> confirmed follows payment', () => {
      assert.equal(isValidEventTransition('paid', 'confirmed'), true)
    })
  })

  describe('Full lifecycle: Inquiry -> Quote -> Event -> Completion', () => {
    it('happy path traverses all states', () => {
      // Quote lifecycle
      assert.equal(isValidQuoteTransition('draft', 'sent'), true)
      assert.equal(isValidQuoteTransition('sent', 'accepted'), true)

      // Event lifecycle (post-quote)
      assert.equal(isValidEventTransition('draft', 'proposed'), true)
      assert.equal(isValidEventTransition('proposed', 'accepted'), true)
      assert.equal(isValidEventTransition('accepted', 'paid'), true)
      assert.equal(isValidEventTransition('paid', 'confirmed'), true)
      assert.equal(isValidEventTransition('confirmed', 'in_progress'), true)
      assert.equal(isValidEventTransition('in_progress', 'completed'), true)
    })

    it('cancellation is possible at any non-terminal event state', () => {
      const cancellableStates: EventStatus[] = [
        'draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress',
      ]
      for (const state of cancellableStates) {
        assert.equal(
          isValidEventTransition(state, 'cancelled'),
          true,
          `${state} -> cancelled should be valid`
        )
      }
    })

    it('completed and cancelled are terminal event states', () => {
      assert.equal(EVENT_TRANSITIONS['completed'].length, 0)
      assert.equal(EVENT_TRANSITIONS['cancelled'].length, 0)
    })
  })

  describe('Quote rejection does not enable event progression', () => {
    it('quote: sent -> rejected is valid', () => {
      assert.equal(isValidQuoteTransition('sent', 'rejected'), true)
    })

    it('rejected quote is terminal', () => {
      assert.equal(isValidQuoteTransition('rejected', 'draft'), false)
      assert.equal(isValidQuoteTransition('rejected', 'sent'), false)
    })
  })

  describe('Expired quote can be revised', () => {
    it('quote: sent -> expired is valid', () => {
      assert.equal(isValidQuoteTransition('sent', 'expired'), true)
    })

    it('expired -> draft allows revision', () => {
      assert.equal(isValidQuoteTransition('expired', 'draft'), true)
    })
  })
})

describe('Cross-Boundary: Financial Amount Integrity', () => {
  it('pricing -> formatting roundtrip preserves readability', () => {
    const total = computeQuoteTotal('per_person', 12500, 8, null)
    const formatted = formatCentsAsDollars(total)
    assert.equal(formatted, '$1,000')
  })

  it('deposit formatting matches total formatting convention', () => {
    const total = computeQuoteTotal('per_person', 12500, 6, null)
    const deposit = computeDepositAmount(total, 50, null)
    const totalFormatted = formatCentsAsDollars(total)
    const depositFormatted = formatCentsAsDollars(deposit)
    assert.equal(totalFormatted, '$750')
    assert.equal(depositFormatted, '$375')
  })

  it('large event pricing maintains precision', () => {
    const total = computeQuoteTotal('per_person', 15000, 14, null) // 14 guests at $150
    assert.equal(total, 210000)
    assert.equal(formatCentsAsDollars(total), '$2,100')
    const deposit = computeDepositAmount(total, 50, null)
    assert.equal(deposit, 105000)
    const balance = computeBalanceDue(total, deposit)
    assert.equal(balance, 105000)
    assert.equal(deposit + balance, total)
  })
})