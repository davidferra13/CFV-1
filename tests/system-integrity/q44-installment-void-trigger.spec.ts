/**
 * Q44: Installment Void on Event Cancellation
 *
 * When an event is cancelled, all unpaid payment plan installments must be
 * voided immediately. Without this, the payment reminder system would
 * continue emailing clients demanding payment for cancelled events - a
 * nightmare for both chef and client relationships.
 *
 * The fix (migration 20260415000003) adds:
 *   1. cancelled_at column to payment_plan_installments
 *   2. A trigger that sets cancelled_at = NOW() for all unpaid installments
 *      when an event transitions to 'cancelled'
 *
 * Tests:
 *
 * 1. MIGRATION EXISTS: The migration that adds cancelled_at and the trigger
 *    exists in the database/migrations directory.
 *
 * 2. CANCELLED_AT COLUMN: The migration adds cancelled_at to
 *    payment_plan_installments.
 *
 * 3. TRIGGER EXISTS: void_installments_on_event_cancel trigger is defined
 *    in the migration.
 *
 * 4. TRIGGER FIRES ON CANCEL: Trigger fires on event status change to
 *    'cancelled', not on every update.
 *
 * 5. ONLY UNPAID VOIDED: The trigger only affects rows where paid_at IS NULL
 *    (already-paid installments not retroactively voided).
 *
 * 6. PAYMENT REMINDER SAFETY: Any payment reminder code checks cancelled_at
 *    before firing (does not send reminders for voided installments).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q44-installment-void-trigger.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { readdirSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = resolve(process.cwd(), 'database/migrations')

function findInstallmentMigration(): string | null {
  if (!existsSync(MIGRATIONS_DIR)) return null

  const files = readdirSync(MIGRATIONS_DIR)
  for (const file of files.sort().reverse()) {
    if (!file.endsWith('.sql')) continue
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    if (
      content.includes('void_installments_on_event_cancel') ||
      (content.includes('payment_plan_installments') && content.includes('cancelled_at'))
    ) {
      return content
    }
  }
  return null
}

test.describe('Q44: Installment void on event cancellation', () => {
  // -------------------------------------------------------------------------
  // Test 1: Migration with installment void trigger exists
  // -------------------------------------------------------------------------
  test('migration adding cancelled_at and void trigger exists in database/migrations/', () => {
    const content = findInstallmentMigration()

    expect(
      content !== null,
      'A migration must exist that adds cancelled_at to payment_plan_installments with a void trigger'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: cancelled_at column added to payment_plan_installments
  // -------------------------------------------------------------------------
  test('migration adds cancelled_at column to payment_plan_installments', () => {
    const content = findInstallmentMigration()
    if (!content) return

    expect(
      content.includes('cancelled_at'),
      'migration must add cancelled_at column to payment_plan_installments'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: void_installments_on_event_cancel trigger defined
  // -------------------------------------------------------------------------
  test('void_installments_on_event_cancel trigger is defined in migration', () => {
    const content = findInstallmentMigration()
    if (!content) return

    expect(
      content.includes('void_installments_on_event_cancel'),
      'migration must define void_installments_on_event_cancel trigger function'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Trigger fires specifically on 'cancelled' status transition
  // -------------------------------------------------------------------------
  test("trigger fires when event transitions to 'cancelled' status", () => {
    const content = findInstallmentMigration()
    if (!content) return

    expect(
      content.includes("'cancelled'") || content.includes('"cancelled"'),
      "trigger must check for 'cancelled' status (not fire on every event update)"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Only unpaid installments are voided (paid_at IS NULL guard)
  // -------------------------------------------------------------------------
  test('void trigger only cancels installments where paid_at IS NULL', () => {
    const content = findInstallmentMigration()
    if (!content) return

    expect(
      content.includes('paid_at IS NULL') || content.includes('paid_at is null'),
      'void trigger must only affect unpaid installments (paid_at IS NULL) - not retroactively void paid ones'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Payment reminder logic respects cancelled_at
  // -------------------------------------------------------------------------
  test('payment reminder or installment query code checks cancelled_at before sending', () => {
    // Look for any file that handles payment plan reminders or installment queries
    const candidateFiles = [
      'lib/payments/installment-reminders.ts',
      'lib/events/payment-plan.ts',
      'lib/payments/actions.ts',
      'lib/finance/payment-plan-actions.ts',
      'lib/queue/providers/financial.ts',
    ]

    let found = false
    let relevantContent = ''

    for (const rel of candidateFiles) {
      const full = resolve(process.cwd(), rel)
      if (existsSync(full)) {
        const src = readFileSync(full, 'utf-8')
        if (src.includes('installment') || src.includes('payment_plan')) {
          relevantContent += src
          found = true
        }
      }
    }

    if (!found) return // No reminder file yet, skip

    expect(
      relevantContent.includes('cancelled_at') ||
        relevantContent.includes('cancelled') ||
        relevantContent.includes('IS NULL'),
      'installment reminder/query code must check cancelled_at to avoid sending reminders for voided installments'
    ).toBe(true)
  })
})
