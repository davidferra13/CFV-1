/**
 * Q23: Commerce Sale Guards
 *
 * The commerce module handles POS sales and refunds. Two categories of bugs
 * were found in this area (Q406, Q406 fix): voiding a sale that already has
 * processed refunds creates an inconsistent financial state. Terminal statuses
 * (voided, fully_refunded) must have no outgoing transitions.
 *
 * Tests:
 *
 * 1. SALE FSM EXISTS: lib/commerce/sale-fsm.ts defines ALLOWED_TRANSITIONS
 *    and exports canVoid(), isTerminal(), canTransition().
 *
 * 2. TERMINAL STATES: voided and fully_refunded have no outgoing transitions
 *    in ALLOWED_TRANSITIONS.
 *
 * 3. VOID GUARD: voidSale() calls canVoid() before updating status.
 *    A sale in a terminal state cannot be voided again.
 *
 * 4. REFUND BLOCK VOID: voidSale() blocks when processed refunds already exist.
 *    Voiding after a refund creates an inconsistent ledger.
 *
 * 5. TENANT SCOPING: voidSale() and sale-related queries include tenant_id.
 *    Cross-tenant void is prevented at the query level.
 *
 * 6. CONSTANTS FILE: lib/commerce/constants.ts defines TERMINAL_SALE_STATUSES
 *    as the canonical reference for terminal state checks.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q23-commerce-guards.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const SALE_FSM = resolve(process.cwd(), 'lib/commerce/sale-fsm.ts')
const SALE_ACTIONS = resolve(process.cwd(), 'lib/commerce/sale-actions.ts')
const COMMERCE_CONSTANTS = resolve(process.cwd(), 'lib/commerce/constants.ts')

test.describe('Q23: Commerce sale guards', () => {
  // -------------------------------------------------------------------------
  // Test 1: Sale FSM exports required guard functions
  // -------------------------------------------------------------------------
  test('lib/commerce/sale-fsm.ts exports canVoid, isTerminal, canTransition', () => {
    expect(existsSync(SALE_FSM), 'lib/commerce/sale-fsm.ts must exist').toBe(true)

    const src = readFileSync(SALE_FSM, 'utf-8')

    expect(
      src.includes('export function canVoid') || src.includes('export const canVoid'),
      'sale-fsm.ts must export canVoid function'
    ).toBe(true)

    expect(
      src.includes('export function isTerminal') || src.includes('export const isTerminal'),
      'sale-fsm.ts must export isTerminal function'
    ).toBe(true)

    expect(
      src.includes('export function canTransition') || src.includes('export const canTransition'),
      'sale-fsm.ts must export canTransition function'
    ).toBe(true)

    expect(
      src.includes('ALLOWED_TRANSITIONS'),
      'sale-fsm.ts must define ALLOWED_TRANSITIONS map'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Terminal states have no outgoing transitions
  // -------------------------------------------------------------------------
  test('voided and fully_refunded are terminal states (empty outgoing transitions)', () => {
    const src = readFileSync(SALE_FSM, 'utf-8')

    // voided: [] must appear in ALLOWED_TRANSITIONS
    expect(
      src.includes('voided: []'),
      'ALLOWED_TRANSITIONS must show voided as terminal (voided: [])'
    ).toBe(true)

    // fully_refunded: [] or similar
    expect(
      src.includes('fully_refunded: []'),
      'ALLOWED_TRANSITIONS must show fully_refunded as terminal (fully_refunded: [])'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: voidSale calls canVoid before status update
  // -------------------------------------------------------------------------
  test('sale-actions.ts calls canVoid before voiding a sale', () => {
    expect(existsSync(SALE_ACTIONS), 'lib/commerce/sale-actions.ts must exist').toBe(true)

    const src = readFileSync(SALE_ACTIONS, 'utf-8')

    expect(
      src.includes('canVoid('),
      'voidSale must call canVoid() to check if status allows voiding'
    ).toBe(true)

    // canVoid must be called before the .update() call
    const canVoidIdx = src.indexOf('canVoid(')
    const updateIdx = src.indexOf(".update({\n      status: 'voided'", canVoidIdx)

    expect(
      canVoidIdx > -1 && updateIdx > canVoidIdx,
      'canVoid() must be called before the status update to voided'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Void is blocked when processed refunds exist
  // -------------------------------------------------------------------------
  test('voidSale blocks when processed refunds already exist', () => {
    const src = readFileSync(SALE_ACTIONS, 'utf-8')

    // Must check commerce_refunds for existing processed refunds
    expect(
      src.includes('commerce_refunds'),
      'voidSale must check commerce_refunds table before voiding'
    ).toBe(true)

    expect(
      src.includes('Cannot void a sale that has already had refunds'),
      'voidSale must throw with descriptive error when processed refunds exist'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: voidSale scopes to tenant
  // -------------------------------------------------------------------------
  test('voidSale includes tenant_id scoping in all queries', () => {
    const src = readFileSync(SALE_ACTIONS, 'utf-8')

    // The sales query and update must be tenant-scoped
    expect(
      src.includes("eq('tenant_id'") || src.includes('.eq("tenant_id"'),
      'voidSale must scope sales query to tenant_id'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: TERMINAL_SALE_STATUSES constant is the canonical terminal reference
  // -------------------------------------------------------------------------
  test('lib/commerce/constants.ts defines TERMINAL_SALE_STATUSES', () => {
    expect(existsSync(COMMERCE_CONSTANTS), 'lib/commerce/constants.ts must exist').toBe(true)

    const src = readFileSync(COMMERCE_CONSTANTS, 'utf-8')

    expect(
      src.includes('TERMINAL_SALE_STATUSES'),
      'constants.ts must define TERMINAL_SALE_STATUSES (canonical reference for terminal state checks)'
    ).toBe(true)

    // Must include both terminal statuses
    expect(
      src.includes("'voided'") && src.includes("'fully_refunded'"),
      "TERMINAL_SALE_STATUSES must include both 'voided' and 'fully_refunded'"
    ).toBe(true)
  })
})
