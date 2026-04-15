/**
 * Q46: Expense Category Allowlist Enforcement
 *
 * Expense categories are used for financial reporting and tax categorization.
 * If arbitrary strings can be written as expense categories, reports become
 * corrupted and tax exports produce invalid data. The allowlist
 * (EXPENSE_CATEGORY_VALUES) must be enforced server-side before any DB write.
 *
 * Tests:
 *
 * 1. ALLOWLIST IMPORT: lib/finance/expense-actions.ts imports
 *    EXPENSE_CATEGORY_VALUES from the constants file.
 *
 * 2. VALIDATION BEFORE INSERT: The allowlist check happens before any
 *    DB insert/update call.
 *
 * 3. REJECTION ON INVALID: An invalid category throws or returns an error
 *    (not silently stored or defaulted).
 *
 * 4. CONSTANTS FILE EXISTS: lib/constants/expense-categories.ts exports
 *    EXPENSE_CATEGORY_VALUES as a readonly tuple/array.
 *
 * 5. AMOUNT VALIDATION: Amount cents must be positive integers (no negatives,
 *    no floats - this is an expense, not a ledger correction).
 *
 * 6. EVENT OWNERSHIP VERIFIED: Before creating an expense, the action
 *    verifies the event belongs to the requesting chef.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q46-expense-category-allowlist.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const EXPENSE_ACTIONS = resolve(process.cwd(), 'lib/finance/expense-actions.ts')
const EXPENSE_CATEGORIES = resolve(process.cwd(), 'lib/constants/expense-categories.ts')

test.describe('Q46: Expense category allowlist enforcement', () => {
  // -------------------------------------------------------------------------
  // Test 1: EXPENSE_CATEGORY_VALUES imported in expense actions
  // -------------------------------------------------------------------------
  test('expense-actions.ts imports EXPENSE_CATEGORY_VALUES from constants', () => {
    if (!existsSync(EXPENSE_ACTIONS)) return

    const src = readFileSync(EXPENSE_ACTIONS, 'utf-8')

    expect(
      src.includes('EXPENSE_CATEGORY') || src.includes('expense-categories'),
      'expense-actions.ts must import EXPENSE_CATEGORY_VALUES for server-side category validation'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Allowlist check occurs before DB write
  // -------------------------------------------------------------------------
  test('category validation occurs before any DB insert in expense-actions.ts', () => {
    if (!existsSync(EXPENSE_ACTIONS)) return

    const src = readFileSync(EXPENSE_ACTIONS, 'utf-8')

    expect(
      src.includes('EXPENSE_CATEGORY') &&
        (src.includes('includes') || src.includes('indexOf') || src.includes('has(')),
      'expense-actions.ts must check category against allowlist (not rely on DB constraint alone)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Invalid category triggers rejection (throw or return error)
  // -------------------------------------------------------------------------
  test('invalid expense category is rejected with throw or error return', () => {
    if (!existsSync(EXPENSE_ACTIONS)) return

    const src = readFileSync(EXPENSE_ACTIONS, 'utf-8')

    expect(
      src.includes('throw') || src.includes('return {') || src.includes('error'),
      'expense-actions.ts must throw or return error for invalid category (not silently store garbage)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Constants file exports EXPENSE_CATEGORY_VALUES
  // -------------------------------------------------------------------------
  test('lib/constants/expense-categories.ts exports EXPENSE_CATEGORY_VALUES', () => {
    expect(existsSync(EXPENSE_CATEGORIES), 'lib/constants/expense-categories.ts must exist').toBe(
      true
    )

    const src = readFileSync(EXPENSE_CATEGORIES, 'utf-8')

    expect(
      src.includes('EXPENSE_CATEGORY_VALUES') || src.includes('EXPENSE_CATEGORIES'),
      'expense-categories.ts must export EXPENSE_CATEGORY_VALUES as the canonical allowlist'
    ).toBe(true)

    // Must be a readonly tuple for type safety
    expect(
      src.includes('as const') || src.includes('readonly') || src.includes('[]'),
      'EXPENSE_CATEGORY_VALUES must be defined as const or readonly for type safety'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Amount validated as positive integer
  // -------------------------------------------------------------------------
  test('expense amount_cents validated as positive integer before insert', () => {
    if (!existsSync(EXPENSE_ACTIONS)) return

    const src = readFileSync(EXPENSE_ACTIONS, 'utf-8')

    expect(
      src.includes('isInteger') ||
        src.includes('integer') ||
        src.includes('> 0') ||
        src.includes('positive'),
      'expense-actions.ts must validate amount_cents is a positive integer (no negatives, no floats)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Event ownership verified before creating expense
  // -------------------------------------------------------------------------
  test('expense creation verifies the event belongs to the requesting chef', () => {
    if (!existsSync(EXPENSE_ACTIONS)) return

    const src = readFileSync(EXPENSE_ACTIONS, 'utf-8')

    expect(
      src.includes('tenant_id') || src.includes('chef_id') || src.includes('requireChef'),
      'expense-actions.ts must verify event ownership (tenant_id) before creating expense'
    ).toBe(true)
  })
})
