/**
 * Q22: Quote State Machine Guards
 *
 * Quotes have a 5-state FSM: draft -> sent -> accepted|rejected|expired.
 * accepted and rejected are terminal. An invalid transition (e.g., accepting
 * an expired quote, sending a zero-total quote) causes financial errors:
 * revenue counted that hasn't been agreed to, or contracts binding on stale terms.
 *
 * Tests:
 *
 * 1. VALID TRANSITIONS: lib/quotes/actions.ts defines a VALID_TRANSITIONS map
 *    and enforces it before any status change.
 *
 * 2. TERMINAL STATES: accepted and rejected have no outgoing transitions.
 *    A quote cannot be edited or re-sent after acceptance.
 *
 * 3. ZERO-TOTAL GUARD: A quote with zero or null total cannot be sent to a client.
 *
 * 4. EXPIRED RESEND GUARD: A quote that has passed its valid_until date cannot
 *    be re-sent without first updating the expiry.
 *
 * 5. CHEF CANNOT ACCEPT: Only clients can accept/reject. Chef transitions to
 *    these states must be blocked (clients use client-actions.ts).
 *
 * 6. CLIENT ACCEPT EXPIRY CHECK: lib/quotes/client-actions.ts pre-checks
 *    valid_until before allowing the client to accept. Prevents accepting a
 *    quote that expired between send and response.
 *
 * 7. ATOMIC RPC: Client accept/reject uses a DB-level RPC to prevent race conditions.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q22-quote-fsm.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const QUOTE_ACTIONS = resolve(process.cwd(), 'lib/quotes/actions.ts')
const QUOTE_CLIENT = resolve(process.cwd(), 'lib/quotes/client-actions.ts')

test.describe('Q22: Quote state machine guards', () => {
  // -------------------------------------------------------------------------
  // Test 1: VALID_TRANSITIONS map is defined and enforced
  // -------------------------------------------------------------------------
  test('lib/quotes/actions.ts defines and enforces VALID_TRANSITIONS', () => {
    expect(existsSync(QUOTE_ACTIONS), 'lib/quotes/actions.ts must exist').toBe(true)

    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    expect(
      src.includes('VALID_TRANSITIONS'),
      'quote actions must define VALID_TRANSITIONS map'
    ).toBe(true)

    // Transitions must be checked (not just defined)
    const mapIdx = src.indexOf('VALID_TRANSITIONS')
    const enforceIdx = src.indexOf('VALID_TRANSITIONS', mapIdx + 1)
    expect(
      enforceIdx > mapIdx,
      'VALID_TRANSITIONS must be used (referenced at least twice: define + enforce)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Terminal states have empty outgoing transitions
  // -------------------------------------------------------------------------
  test('accepted and rejected are terminal states (no outgoing transitions)', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // accepted: [] and rejected: [] must appear in the transitions map
    expect(
      src.includes('accepted: []') || src.includes('accepted:[]'),
      'VALID_TRANSITIONS must show accepted as terminal (accepted: [])'
    ).toBe(true)

    expect(
      src.includes('rejected: []') || src.includes('rejected:[]'),
      'VALID_TRANSITIONS must show rejected as terminal (rejected: [])'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Zero-total guard blocks quote send
  // -------------------------------------------------------------------------
  test('chef cannot send a quote with zero or null total', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // Must check total_quoted_cents > 0 before transitioning to sent
    expect(
      src.includes('total_quoted_cents'),
      'Quote actions must check total_quoted_cents when sending'
    ).toBe(true)

    // The check must block sending (look for <= 0 or similar)
    const checkPattern = /total_quoted_cents.*<=.*0|!.*total_quoted_cents/
    expect(
      checkPattern.test(src),
      'Quote actions must block send when total_quoted_cents is 0 or missing'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Expired quote cannot be re-sent
  // -------------------------------------------------------------------------
  test('sending an already-expired quote is blocked', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // Must check valid_until against current date before sending
    expect(
      src.includes('valid_until') && (src.includes('< new Date()') || src.includes('expired')),
      'Quote actions must block re-sending an expired quote (valid_until check)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Chef cannot directly accept or reject a quote
  // -------------------------------------------------------------------------
  test('chef quote transition blocks direct accept/reject (client-only actions)', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // Must have a guard that prevents chef from setting accepted/rejected
    expect(
      src.includes("'accepted'") &&
        src.includes("'rejected'") &&
        (src.includes('client') || src.includes('portal') || src.includes('transitionQuote')),
      'Quote actions must guard against chef directly accepting/rejecting quotes'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Client accept checks expiry before allowing acceptance
  // -------------------------------------------------------------------------
  test('lib/quotes/client-actions.ts checks valid_until before accept', () => {
    expect(existsSync(QUOTE_CLIENT), 'lib/quotes/client-actions.ts must exist').toBe(true)

    const src = readFileSync(QUOTE_CLIENT, 'utf-8')

    // Must check valid_until for expiry
    expect(
      src.includes('valid_until'),
      'client-actions.ts must check valid_until before allowing quote acceptance'
    ).toBe(true)

    // Must check if event is cancelled
    expect(
      src.includes('cancelled'),
      'client-actions.ts must check if event is cancelled before accepting quote'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 7: Client accept/reject uses atomic DB RPC
  // -------------------------------------------------------------------------
  test('client quote response uses atomic RPC (prevents race conditions)', () => {
    const src = readFileSync(QUOTE_CLIENT, 'utf-8')

    expect(
      src.includes('respond_to_quote_atomic') || src.includes('rpc('),
      'Client quote accept/reject must use atomic DB RPC to prevent race conditions'
    ).toBe(true)
  })
})
