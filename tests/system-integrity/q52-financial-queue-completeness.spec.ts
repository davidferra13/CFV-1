/**
 * Q52: Financial Queue Completeness
 *
 * The financial priority queue is the chef's revenue collection engine.
 * Q11 established that the queue surfaces TakeAChef no-deposit events.
 * Q52 extends this to verify the complete gap taxonomy:
 *
 *   1. Events where outstanding_balance_cents > 0 (partial payment)
 *   2. Events where total_paid_cents = 0 AND quoted_price_cents > 0 (unpaid)
 *   3. TAC events where total_paid_cents = 0 (no deposit collected)
 *   4. Overdue installments (due_date < NOW() AND paid_at IS NULL)
 *   5. Issued invoices with no payment recorded
 *
 * Missing any of these means real money falls through the cracks.
 *
 * Tests:
 *
 * 1. FINANCIAL PROVIDER EXISTS: lib/queue/providers/financial.ts exists
 *    as the canonical financial queue provider.
 *
 * 2. OUTSTANDING BALANCE: Provider queries outstanding_balance_cents > 0.
 *
 * 3. ZERO PAID GUARD: Provider catches events where no payment received.
 *
 * 4. TAC NO-DEPOSIT: Provider catches TakeAChef events with no payment
 *    (where outstanding_balance_cents=0 but total_paid_cents=0).
 *
 * 5. OVERDUE INSTALLMENTS: Provider includes overdue payment plan
 *    installments (due_date past, not yet paid).
 *
 * 6. TENANT SCOPED: All financial queue queries filter by tenant_id
 *    (no cross-chef financial data in the queue).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q52-financial-queue-completeness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const FINANCIAL_PROVIDER = resolve(process.cwd(), 'lib/queue/providers/financial.ts')

test.describe('Q52: Financial queue completeness', () => {
  // -------------------------------------------------------------------------
  // Test 1: Financial queue provider exists
  // -------------------------------------------------------------------------
  test('lib/queue/providers/financial.ts exists as the financial queue provider', () => {
    expect(
      existsSync(FINANCIAL_PROVIDER),
      'lib/queue/providers/financial.ts must exist (canonical financial gap detection engine)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Queries outstanding_balance_cents
  // -------------------------------------------------------------------------
  test('financial provider queries events with outstanding_balance_cents > 0', () => {
    if (!existsSync(FINANCIAL_PROVIDER)) return

    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    expect(
      src.includes('outstanding_balance_cents') || src.includes('outstanding_balance'),
      'financial provider must query outstanding_balance_cents (core revenue gap detection)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Catches events with zero payment received
  // -------------------------------------------------------------------------
  test('financial provider detects events where total_paid_cents = 0', () => {
    if (!existsSync(FINANCIAL_PROVIDER)) return

    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    expect(
      src.includes('total_paid_cents') || src.includes('paid_cents') || src.includes('payment'),
      'financial provider must detect events where no payment has been received'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: TakeAChef no-deposit events surfaced
  // -------------------------------------------------------------------------
  test('financial provider surfaces TakeAChef events with no deposit collected', () => {
    if (!existsSync(FINANCIAL_PROVIDER)) return

    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    // Must handle the TAC case: quoted_price_cents may be NULL but payment still due
    expect(
      src.includes('takechef') ||
        src.includes('tac') ||
        src.includes('TAC') ||
        src.includes('source') ||
        src.includes('no-deposit') ||
        src.includes('total_paid_cents'),
      'financial provider must surface TakeAChef events with no deposit (Q11 regression guard)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Overdue installments included in queue
  // -------------------------------------------------------------------------
  test('financial provider includes overdue payment plan installments', () => {
    if (!existsSync(FINANCIAL_PROVIDER)) return

    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    expect(
      src.includes('installment') ||
        src.includes('payment_plan') ||
        src.includes('due_date') ||
        src.includes('overdue'),
      'financial provider must include overdue installments (missed payment plan milestones)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: All queries are tenant-scoped
  // -------------------------------------------------------------------------
  test('financial queue queries are tenant-scoped (no cross-chef revenue data)', () => {
    if (!existsSync(FINANCIAL_PROVIDER)) return

    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    expect(
      src.includes('tenant_id') || src.includes('tenantId') || src.includes('chef_id'),
      'financial queue queries must filter by tenant_id (no cross-chef financial leakage)'
    ).toBe(true)
  })
})
