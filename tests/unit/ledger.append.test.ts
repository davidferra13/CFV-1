/**
 * Unit tests for Ledger Append Validation Logic
 *
 * Tests the validation and idempotency logic in lib/ledger/append.ts.
 * This is P1 — bad ledger entries = wrong financial records.
 *
 * We test the pure validation logic without requiring Supabase.
 * The actual appendLedgerEntryInternal() uses Supabase, so we extract
 * and test the same validation patterns independently.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { factories } from '../helpers/factories.js'

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION LOGIC (extracted from lib/ledger/append.ts)
// ─────────────────────────────────────────────────────────────────────────────

type LedgerEntryType =
  | 'payment'
  | 'deposit'
  | 'installment'
  | 'final_payment'
  | 'tip'
  | 'refund'
  | 'adjustment'
  | 'add_on'
  | 'credit'

type PaymentMethod = 'cash' | 'venmo' | 'paypal' | 'zelle' | 'card' | 'check'

type AppendInput = {
  tenant_id: string
  client_id: string
  entry_type: LedgerEntryType
  amount_cents: number
  payment_method: PaymentMethod
  description: string
  event_id?: string | null
  transaction_reference?: string | null
  is_refund?: boolean
  created_by?: string | null
}

/**
 * Validates a ledger entry input before DB insert.
 * Mirrors the exact validation from appendLedgerEntryInternal().
 */
function validateLedgerInput(
  input: AppendInput
): { valid: true } | { valid: false; reason: string } {
  // Amount must be integer (minor units only)
  if (!Number.isInteger(input.amount_cents)) {
    return { valid: false, reason: 'Amount must be in minor units (cents, integer only)' }
  }

  // Required fields
  if (!input.tenant_id) {
    return { valid: false, reason: 'tenant_id is required' }
  }
  if (!input.client_id) {
    return { valid: false, reason: 'client_id is required' }
  }
  if (!input.description) {
    return { valid: false, reason: 'description is required' }
  }

  return { valid: true }
}

/**
 * Determines whether the Supabase client should use service role.
 * Mirrors the logic: webhook calls have created_by === null.
 */
function shouldUseServiceRole(createdBy: string | null | undefined): boolean {
  return createdBy === null
}

/**
 * Determines if a DB error represents a duplicate transaction (idempotency).
 * Mirrors the error handling in appendLedgerEntryInternal().
 */
function isDuplicateTransaction(
  errorCode: string | null,
  transactionReference: string | null | undefined
): boolean {
  return errorCode === '23505' && !!transactionReference
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Ledger Append — amount validation', () => {
  const baseInput: AppendInput = {
    tenant_id: 'tenant-1',
    client_id: 'client-1',
    entry_type: 'payment',
    amount_cents: 10000,
    payment_method: 'card',
    description: 'Test payment',
  }

  it('accepts valid integer amount', () => {
    const result = validateLedgerInput(baseInput)
    assert.equal(result.valid, true)
  })

  it('rejects fractional cents (100.50)', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: 100.5 })
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('minor units'))
  })

  it('rejects floating point (99.99)', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: 99.99 })
    assert.equal(result.valid, false)
  })

  it('accepts zero amount (for zero-dollar adjustments)', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: 0 })
    assert.equal(result.valid, true)
  })

  it('accepts negative amount (for negative adjustments)', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: -5000 })
    assert.equal(result.valid, true)
  })

  it('accepts large amounts (1M cents = $10,000)', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: 1000000 })
    assert.equal(result.valid, true)
  })

  it('rejects NaN', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: NaN })
    assert.equal(result.valid, false)
  })

  it('rejects Infinity', () => {
    const result = validateLedgerInput({ ...baseInput, amount_cents: Infinity })
    assert.equal(result.valid, false)
  })
})

describe('Ledger Append — required fields', () => {
  const baseInput: AppendInput = {
    tenant_id: 'tenant-1',
    client_id: 'client-1',
    entry_type: 'payment',
    amount_cents: 10000,
    payment_method: 'card',
    description: 'Test payment',
  }

  it('rejects empty tenant_id', () => {
    const result = validateLedgerInput({ ...baseInput, tenant_id: '' })
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('tenant_id'))
  })

  it('rejects empty client_id', () => {
    const result = validateLedgerInput({ ...baseInput, client_id: '' })
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('client_id'))
  })

  it('rejects empty description', () => {
    const result = validateLedgerInput({ ...baseInput, description: '' })
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.reason.includes('description'))
  })
})

describe('Ledger Append — all entry types are valid', () => {
  const entryTypes: LedgerEntryType[] = [
    'payment',
    'deposit',
    'installment',
    'final_payment',
    'tip',
    'refund',
    'adjustment',
    'add_on',
    'credit',
  ]

  for (const entryType of entryTypes) {
    it(`entry_type '${entryType}' passes validation`, () => {
      const result = validateLedgerInput({
        tenant_id: 'tenant-1',
        client_id: 'client-1',
        entry_type: entryType,
        amount_cents: 5000,
        payment_method: 'cash',
        description: `Test ${entryType}`,
      })
      assert.equal(result.valid, true)
    })
  }
})

describe('Ledger Append — all payment methods are valid', () => {
  const methods: PaymentMethod[] = ['cash', 'venmo', 'paypal', 'zelle', 'card', 'check']

  for (const method of methods) {
    it(`payment_method '${method}' passes validation`, () => {
      const result = validateLedgerInput({
        tenant_id: 'tenant-1',
        client_id: 'client-1',
        entry_type: 'payment',
        amount_cents: 5000,
        payment_method: method,
        description: `Test ${method}`,
      })
      assert.equal(result.valid, true)
    })
  }
})

describe('Ledger Append — service role determination', () => {
  it('webhook entries (created_by=null) use service role', () => {
    assert.equal(shouldUseServiceRole(null), true)
  })

  it('chef entries (created_by=userId) use anon key', () => {
    assert.equal(shouldUseServiceRole('user-123'), false)
  })

  it('undefined created_by uses anon key', () => {
    assert.equal(shouldUseServiceRole(undefined), false)
  })
})

describe('Ledger Append — idempotency (duplicate detection)', () => {
  it('23505 with transaction_reference = duplicate', () => {
    assert.equal(isDuplicateTransaction('23505', 'stripe_evt_123'), true)
  })

  it('23505 without transaction_reference = NOT duplicate (regular unique violation)', () => {
    assert.equal(isDuplicateTransaction('23505', null), false)
    assert.equal(isDuplicateTransaction('23505', undefined), false)
  })

  it('non-23505 error with transaction_reference = NOT duplicate', () => {
    assert.equal(isDuplicateTransaction('42501', 'stripe_evt_123'), false)
  })

  it('null error code = NOT duplicate', () => {
    assert.equal(isDuplicateTransaction(null, 'stripe_evt_123'), false)
  })
})

describe('Ledger Append — factory-generated entries pass validation', () => {
  it('factory.ledgerEntry with defaults is valid', () => {
    const entry = factories.ledgerEntry('tenant-1', 'client-1')
    const result = validateLedgerInput({
      tenant_id: entry.tenant_id,
      client_id: entry.client_id,
      entry_type: entry.entry_type as LedgerEntryType,
      amount_cents: entry.amount_cents,
      payment_method: entry.payment_method as PaymentMethod,
      description: entry.description,
    })
    assert.equal(result.valid, true)
  })

  it('paymentFlow deposit is valid', () => {
    const flow = factories.paymentFlow('tenant-1', 'client-1', 'event-1')
    const result = validateLedgerInput({
      tenant_id: flow.deposit.tenant_id,
      client_id: flow.deposit.client_id,
      entry_type: flow.deposit.entry_type as LedgerEntryType,
      amount_cents: flow.deposit.amount_cents,
      payment_method: flow.deposit.payment_method as PaymentMethod,
      description: flow.deposit.description,
    })
    assert.equal(result.valid, true)
  })
})
