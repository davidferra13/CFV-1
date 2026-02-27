/**
 * Unit tests for Quote State Machine
 *
 * Tests the quote lifecycle transitions: draft → sent → accepted/rejected/expired.
 * This is P2 — wrong quote state = pricing confusion and lost deals.
 *
 * We test the pure state machine logic extracted from lib/quotes/actions.ts
 * without requiring Supabase or server action runtime.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE STATE MACHINE (extracted from lib/quotes/actions.ts)
// ─────────────────────────────────────────────────────────────────────────────

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

const ALL_QUOTE_STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired']

const TERMINAL_STATES: QuoteStatus[] = ['accepted', 'rejected']

// Valid transitions (matches DB trigger)
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [], // terminal
  rejected: [], // terminal
  expired: ['draft'], // can revise and resend
}

function isValidQuoteTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

function isTerminalQuoteState(status: QuoteStatus): boolean {
  return TERMINAL_STATES.includes(status)
}

function getAllowedQuoteTransitions(from: QuoteStatus): QuoteStatus[] {
  return VALID_TRANSITIONS[from] ?? []
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE VALIDATION LOGIC (extracted from CreateQuoteSchema in actions.ts)
// ─────────────────────────────────────────────────────────────────────────────

type QuoteInput = {
  client_id: string
  pricing_model: 'per_person' | 'flat_rate' | 'custom'
  total_quoted_cents: number
  deposit_amount_cents?: number | null
  deposit_percentage?: number | null
  guest_count_estimated?: number | null
  price_per_person_cents?: number | null
}

function validateQuoteInput(input: QuoteInput): { valid: true } | { valid: false; reason: string } {
  if (!input.client_id) {
    return { valid: false, reason: 'client_id is required' }
  }

  if (!Number.isInteger(input.total_quoted_cents) || input.total_quoted_cents <= 0) {
    return { valid: false, reason: 'Total must be a positive integer (cents)' }
  }

  if (input.deposit_amount_cents != null && input.deposit_amount_cents > input.total_quoted_cents) {
    return { valid: false, reason: 'Deposit cannot exceed total' }
  }

  if (input.deposit_percentage != null) {
    if (input.deposit_percentage < 0 || input.deposit_percentage > 100) {
      return { valid: false, reason: 'Deposit percentage must be 0-100' }
    }
  }

  if (input.guest_count_estimated != null && input.guest_count_estimated <= 0) {
    return { valid: false, reason: 'Guest count must be positive' }
  }

  if (input.price_per_person_cents != null && input.price_per_person_cents <= 0) {
    return { valid: false, reason: 'Price per person must be positive' }
  }

  return { valid: true }
}

/**
 * Determines what timestamp fields to set on transition.
 * Mirrors the logic in transitionQuote().
 */
function getTransitionTimestampFields(toStatus: QuoteStatus): Record<string, boolean | string> {
  const now = new Date().toISOString()
  const fields: Record<string, boolean | string> = {}

  if (toStatus === 'sent') {
    fields.sent_at = now
  } else if (toStatus === 'accepted') {
    fields.accepted_at = now
    fields.snapshot_frozen = 'true' // pricing locked
  } else if (toStatus === 'rejected') {
    fields.rejected_at = now
  } else if (toStatus === 'expired') {
    fields.expired_at = now
  }

  return fields
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

describe('Quote FSM — valid transitions', () => {
  const validPaths: [QuoteStatus, QuoteStatus][] = [
    ['draft', 'sent'],
    ['sent', 'accepted'],
    ['sent', 'rejected'],
    ['sent', 'expired'],
    ['expired', 'draft'], // revise and resend
  ]

  for (const [from, to] of validPaths) {
    it(`${from} → ${to} should be valid`, () => {
      assert.equal(isValidQuoteTransition(from, to), true)
    })
  }
})

describe('Quote FSM — invalid transitions', () => {
  const invalidPaths: [QuoteStatus, QuoteStatus][] = [
    // Can't skip states
    ['draft', 'accepted'],
    ['draft', 'rejected'],
    ['draft', 'expired'],
    // Can't go backwards from sent
    ['sent', 'draft'],
    // Terminal states block all transitions
    ['accepted', 'draft'],
    ['accepted', 'sent'],
    ['accepted', 'rejected'],
    ['accepted', 'expired'],
    ['rejected', 'draft'],
    ['rejected', 'sent'],
    ['rejected', 'accepted'],
    ['rejected', 'expired'],
    // Expired can only go back to draft (not forward)
    ['expired', 'sent'],
    ['expired', 'accepted'],
    ['expired', 'rejected'],
    // Self-transitions
    ['draft', 'draft'],
    ['sent', 'sent'],
    ['accepted', 'accepted'],
    ['rejected', 'rejected'],
    ['expired', 'expired'],
  ]

  for (const [from, to] of invalidPaths) {
    it(`${from} → ${to} should be INVALID`, () => {
      assert.equal(isValidQuoteTransition(from, to), false)
    })
  }
})

describe('Quote FSM — terminal states', () => {
  it('accepted is terminal', () => {
    assert.equal(isTerminalQuoteState('accepted'), true)
  })

  it('rejected is terminal', () => {
    assert.equal(isTerminalQuoteState('rejected'), true)
  })

  it('draft is NOT terminal', () => {
    assert.equal(isTerminalQuoteState('draft'), false)
  })

  it('sent is NOT terminal', () => {
    assert.equal(isTerminalQuoteState('sent'), false)
  })

  it('expired is NOT terminal (can revise)', () => {
    assert.equal(isTerminalQuoteState('expired'), false)
  })
})

describe('Quote FSM — terminal states block all transitions', () => {
  for (const terminal of TERMINAL_STATES) {
    for (const target of ALL_QUOTE_STATUSES) {
      it(`${terminal} → ${target} should be INVALID`, () => {
        assert.equal(isValidQuoteTransition(terminal, target), false)
      })
    }
  }
})

describe('Quote FSM — getAllowedQuoteTransitions', () => {
  it('draft can only go to sent', () => {
    const allowed = getAllowedQuoteTransitions('draft')
    assert.deepEqual(allowed, ['sent'])
  })

  it('sent has 3 possible outcomes', () => {
    const allowed = getAllowedQuoteTransitions('sent')
    assert.equal(allowed.length, 3)
    assert.ok(allowed.includes('accepted'))
    assert.ok(allowed.includes('rejected'))
    assert.ok(allowed.includes('expired'))
  })

  it('expired can only go back to draft', () => {
    assert.deepEqual(getAllowedQuoteTransitions('expired'), ['draft'])
  })

  it('accepted has 0 transitions', () => {
    assert.equal(getAllowedQuoteTransitions('accepted').length, 0)
  })

  it('rejected has 0 transitions', () => {
    assert.equal(getAllowedQuoteTransitions('rejected').length, 0)
  })
})

describe('Quote FSM — completeness check', () => {
  it('every status has an entry in VALID_TRANSITIONS', () => {
    for (const status of ALL_QUOTE_STATUSES) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(VALID_TRANSITIONS, status),
        `Missing entry for status: ${status}`
      )
    }
  })

  it('all target states are valid statuses', () => {
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of targets) {
        assert.ok(
          ALL_QUOTE_STATUSES.includes(to as QuoteStatus),
          `Invalid target '${to}' in VALID_TRANSITIONS['${from}']`
        )
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — QUOTE INPUT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('Quote Validation — total_quoted_cents', () => {
  const base: QuoteInput = {
    client_id: 'client-1',
    pricing_model: 'flat_rate',
    total_quoted_cents: 100000,
  }

  it('accepts valid total', () => {
    assert.equal(validateQuoteInput(base).valid, true)
  })

  it('rejects zero total', () => {
    const result = validateQuoteInput({ ...base, total_quoted_cents: 0 })
    assert.equal(result.valid, false)
  })

  it('rejects negative total', () => {
    const result = validateQuoteInput({ ...base, total_quoted_cents: -5000 })
    assert.equal(result.valid, false)
  })

  it('rejects fractional total', () => {
    const result = validateQuoteInput({ ...base, total_quoted_cents: 99.99 })
    assert.equal(result.valid, false)
  })
})

describe('Quote Validation — deposit constraints', () => {
  const base: QuoteInput = {
    client_id: 'client-1',
    pricing_model: 'flat_rate',
    total_quoted_cents: 100000,
  }

  it('deposit can equal total (100% deposit)', () => {
    const result = validateQuoteInput({ ...base, deposit_amount_cents: 100000 })
    assert.equal(result.valid, true)
  })

  it('deposit cannot exceed total', () => {
    const result = validateQuoteInput({ ...base, deposit_amount_cents: 200000 })
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('Deposit'))
  })

  it('deposit percentage must be 0-100', () => {
    assert.equal(validateQuoteInput({ ...base, deposit_percentage: 50 }).valid, true)
    assert.equal(validateQuoteInput({ ...base, deposit_percentage: 0 }).valid, true)
    assert.equal(validateQuoteInput({ ...base, deposit_percentage: 100 }).valid, true)
    assert.equal(validateQuoteInput({ ...base, deposit_percentage: -1 }).valid, false)
    assert.equal(validateQuoteInput({ ...base, deposit_percentage: 101 }).valid, false)
  })
})

describe('Quote Validation — guest count and pricing', () => {
  const base: QuoteInput = {
    client_id: 'client-1',
    pricing_model: 'per_person',
    total_quoted_cents: 100000,
  }

  it('guest count must be positive', () => {
    assert.equal(validateQuoteInput({ ...base, guest_count_estimated: 50 }).valid, true)
    assert.equal(validateQuoteInput({ ...base, guest_count_estimated: 0 }).valid, false)
    assert.equal(validateQuoteInput({ ...base, guest_count_estimated: -1 }).valid, false)
  })

  it('price per person must be positive', () => {
    assert.equal(validateQuoteInput({ ...base, price_per_person_cents: 5000 }).valid, true)
    assert.equal(validateQuoteInput({ ...base, price_per_person_cents: 0 }).valid, false)
    assert.equal(validateQuoteInput({ ...base, price_per_person_cents: -100 }).valid, false)
  })

  it('null guest count and price_per_person are allowed', () => {
    assert.equal(validateQuoteInput({ ...base, guest_count_estimated: null }).valid, true)
    assert.equal(validateQuoteInput({ ...base, price_per_person_cents: null }).valid, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — TRANSITION SIDE EFFECTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Quote Transition — timestamp fields', () => {
  it('sent sets sent_at', () => {
    const fields = getTransitionTimestampFields('sent')
    assert.ok('sent_at' in fields)
    assert.ok(!('accepted_at' in fields))
  })

  it('accepted sets accepted_at and freezes pricing snapshot', () => {
    const fields = getTransitionTimestampFields('accepted')
    assert.ok('accepted_at' in fields)
    assert.equal(fields.snapshot_frozen, 'true')
  })

  it('rejected sets rejected_at', () => {
    const fields = getTransitionTimestampFields('rejected')
    assert.ok('rejected_at' in fields)
    assert.ok(!('snapshot_frozen' in fields))
  })

  it('expired sets expired_at', () => {
    const fields = getTransitionTimestampFields('expired')
    assert.ok('expired_at' in fields)
  })

  it('draft sets no timestamps', () => {
    const fields = getTransitionTimestampFields('draft')
    assert.equal(Object.keys(fields).length, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — FULL LIFECYCLE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

describe('Quote Lifecycle — happy path', () => {
  it('full lifecycle: draft → sent → accepted', () => {
    assert.equal(isValidQuoteTransition('draft', 'sent'), true)
    assert.equal(isValidQuoteTransition('sent', 'accepted'), true)
    assert.equal(isTerminalQuoteState('accepted'), true)
  })

  it('rejection lifecycle: draft → sent → rejected', () => {
    assert.equal(isValidQuoteTransition('draft', 'sent'), true)
    assert.equal(isValidQuoteTransition('sent', 'rejected'), true)
    assert.equal(isTerminalQuoteState('rejected'), true)
  })

  it('revision lifecycle: draft → sent → expired → draft → sent → accepted', () => {
    assert.equal(isValidQuoteTransition('draft', 'sent'), true)
    assert.equal(isValidQuoteTransition('sent', 'expired'), true)
    assert.equal(isValidQuoteTransition('expired', 'draft'), true)
    assert.equal(isValidQuoteTransition('draft', 'sent'), true)
    assert.equal(isValidQuoteTransition('sent', 'accepted'), true)
  })
})
