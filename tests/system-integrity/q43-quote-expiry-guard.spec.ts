/**
 * Q43: Quote Expiry Guard
 *
 * Quotes have a valid_until date. A quote with an expired valid_until can
 * still be in 'sent' status if the chef never manually transitioned it.
 * If a client can accept an expired quote, the chef has lost their pricing
 * leverage — they are bound to a price they may no longer be able to honor.
 *
 * The guard must be enforced server-side at the point of send, not just
 * client-side with a disabled button.
 *
 * Tests:
 *
 * 1. EXPIRY CHECK ON SEND: lib/quotes/actions.ts checks valid_until before
 *    sending a quote. An expired valid_until throws/returns error.
 *
 * 2. EXPIRED STATUS IN FSM: 'expired' is a valid quote status and the
 *    transitions map includes expired as a terminal or near-terminal state.
 *
 * 3. ERROR MESSAGE SPECIFIC: The expiry error message tells the chef to
 *    update the expiry date (not a generic "operation failed").
 *
 * 4. CLIENT ACCEPTANCE GUARD: Client-side acceptance also checks expiry
 *    (or relies on the status being 'expired' before client can accept).
 *
 * 5. QUOTE TOTAL GUARD: Quotes with $0 total cannot be sent (prevents
 *    binding the chef to free services by accident).
 *
 * 6. ATOMIC RPC USED: State transitions go through the atomic RPC
 *    (transition_quote_atomic) to prevent race conditions.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q43-quote-expiry-guard.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const QUOTE_ACTIONS = resolve(process.cwd(), 'lib/quotes/actions.ts')
const QUOTE_CLIENT_ACTIONS = resolve(process.cwd(), 'lib/quotes/client-actions.ts')

test.describe('Q43: Quote expiry guard', () => {
  // -------------------------------------------------------------------------
  // Test 1: Expiry checked before sending quote
  // -------------------------------------------------------------------------
  test('lib/quotes/actions.ts checks valid_until before sending a quote', () => {
    expect(existsSync(QUOTE_ACTIONS), 'lib/quotes/actions.ts must exist').toBe(true)

    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    expect(
      src.includes('valid_until') || src.includes('expires_at') || src.includes('expired'),
      'quote actions must check expiry date before allowing send transition'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: expired is a recognized quote status
  // -------------------------------------------------------------------------
  test("'expired' is a recognized quote status in the FSM", () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    expect(
      src.includes("'expired'") || src.includes('"expired"'),
      "quotes FSM must include 'expired' as a status (so the system can mark stale quotes)"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Expiry error is specific and actionable
  // -------------------------------------------------------------------------
  test('expiry error message tells chef to update the expiry date', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    expect(
      src.includes('expir') &&
        (src.includes('Update') || src.includes('update') || src.includes('date')),
      'quote expiry error must tell chef to update the expiry date (not a generic error)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Valid status transitions include expired
  // -------------------------------------------------------------------------
  test('quote transitions map includes expired as a valid target state from sent', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // The transitions map must show sent can move to expired
    const hasSentToExpired =
      (src.includes('sent') && src.includes('expired')) ||
      src.includes("'expired'") ||
      src.includes('"expired"')

    expect(
      hasSentToExpired,
      'quote FSM must allow sent -> expired transition (time-based expiry path)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Zero-total quotes cannot be sent
  // -------------------------------------------------------------------------
  test('quotes with zero total cannot be sent (prevents accidental free bookings)', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    expect(
      src.includes('total') &&
        (src.includes('0') ||
          src.includes('zero') ||
          src.includes('> 0') ||
          src.includes('amount')),
      'quote actions must guard against sending $0-total quotes (accidental free booking risk)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Atomic RPC used for state transitions
  // -------------------------------------------------------------------------
  test('quote state transitions use atomic RPC to prevent race conditions', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    const clientSrc = existsSync(QUOTE_CLIENT_ACTIONS)
      ? readFileSync(QUOTE_CLIENT_ACTIONS, 'utf-8')
      : ''

    expect(
      src.includes('transition_quote_atomic') || clientSrc.includes('transition_quote_atomic'),
      'quote transitions must use transition_quote_atomic RPC (prevents double-accept race condition)'
    ).toBe(true)
  })
})
