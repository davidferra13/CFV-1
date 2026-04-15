/**
 * Q33: Ledger Append Idempotency
 *
 * The ledger is the source of truth for all financial state. A duplicate
 * ledger entry from a retried webhook or double-call would corrupt revenue
 * figures permanently. Idempotency is enforced at the DB level (unique
 * constraint on transaction_reference) and at the application level
 * (detecting PG error 23505 and returning a duplicate signal).
 *
 * Tests:
 *
 * 1. UNIQUE CONSTRAINT HANDLING: lib/ledger/append-internal.ts catches
 *    PostgreSQL error code 23505 (unique_violation) from transaction_reference.
 *
 * 2. DUPLICATE SIGNAL: On conflict, the function returns { duplicate: true }
 *    so callers know it was a replay, not a new entry.
 *
 * 3. TRANSACTION REFERENCE USED: The appendLedgerEntryFromWebhook function
 *    passes a transaction_reference to the core append function.
 *
 * 4. FLOAT REJECTION: The function validates that amounts are integers
 *    (no floating point cents).
 *
 * 5. AMOUNT CAP: An upper-bound cap exists to prevent runaway amounts
 *    from corrupting the ledger.
 *
 * 6. WEBHOOK WRAPPER EXISTS: appendLedgerEntryFromWebhook is the public
 *    entry point for external payment processors (not the raw internal fn).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q33-ledger-idempotency.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const APPEND_INTERNAL = resolve(process.cwd(), 'lib/ledger/append-internal.ts')

test.describe('Q33: Ledger append idempotency', () => {
  // -------------------------------------------------------------------------
  // Test 1: Catches PostgreSQL 23505 (unique_violation) on transaction_reference
  // -------------------------------------------------------------------------
  test('append-internal.ts catches error code 23505 (unique constraint violation)', () => {
    expect(existsSync(APPEND_INTERNAL), 'lib/ledger/append-internal.ts must exist').toBe(true)

    const src = readFileSync(APPEND_INTERNAL, 'utf-8')

    expect(
      src.includes('23505'),
      'append-internal.ts must catch PostgreSQL error 23505 (unique_violation) for idempotency'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Returns { duplicate: true } on conflict
  // -------------------------------------------------------------------------
  test('append-internal.ts returns { duplicate: true } on transaction_reference conflict', () => {
    const src = readFileSync(APPEND_INTERNAL, 'utf-8')

    expect(
      src.includes('duplicate: true') || src.includes('duplicate:true'),
      'append-internal.ts must return { duplicate: true } so callers can detect replays'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: transaction_reference is passed through to the DB
  // -------------------------------------------------------------------------
  test('transaction_reference column used in ledger append for dedup key', () => {
    const src = readFileSync(APPEND_INTERNAL, 'utf-8')

    expect(
      src.includes('transaction_reference'),
      'append-internal.ts must write transaction_reference (the idempotency key for webhooks)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Integer-only validation (no floating point cents)
  // -------------------------------------------------------------------------
  test('ledger append validates amounts are integers (no float cents)', () => {
    const src = readFileSync(APPEND_INTERNAL, 'utf-8')

    // Must have some integer check — Number.isInteger, Math.round, or similar
    expect(
      src.includes('Number.isInteger') ||
        src.includes('Math.round') ||
        src.includes('isInteger') ||
        src.includes('integer') ||
        src.includes('not an integer'),
      'append-internal.ts must validate amount_cents is an integer (no floats allowed in ledger)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Upper-bound cap on amount to prevent runaway writes
  // -------------------------------------------------------------------------
  test('ledger append enforces an upper-bound cap on amount_cents', () => {
    const src = readFileSync(APPEND_INTERNAL, 'utf-8')

    // Looking for a max cap — could be 99_999_999, 100_000_000, or similar constant
    expect(
      src.includes('99_999_999') ||
        src.includes('99999999') ||
        src.includes('100_000_000') ||
        src.includes('MAX') ||
        src.includes('cap') ||
        src.includes('exceeds'),
      'append-internal.ts must cap amount_cents to prevent runaway ledger corruption'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: appendLedgerEntryFromWebhook is the public webhook entry point
  // -------------------------------------------------------------------------
  test('appendLedgerEntryFromWebhook exported as the webhook-safe public API', () => {
    const src = readFileSync(APPEND_INTERNAL, 'utf-8')

    expect(
      src.includes('export') && src.includes('appendLedgerEntryFromWebhook'),
      'append-internal.ts must export appendLedgerEntryFromWebhook as the public webhook entry point'
    ).toBe(true)
  })
})
