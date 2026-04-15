/**
 * Q15: Financial View Integrity
 *
 * The event_financial_summary view is the source of truth for all revenue
 * numbers shown to the chef. Two critical correctness requirements:
 *
 * 1. SOFT-DELETE FILTER: soft-deleted events (deleted_at IS NOT NULL) must
 *    be excluded from the view. Without this, deleted events inflate revenue.
 *    (Fixed in migration 20260415000003.)
 *
 * 2. NULL QUOTED PRICE: outstanding_balance_cents must be 0 (not negative)
 *    when quoted_price_cents IS NULL. TakeAChef imports have no quoted price,
 *    so GREATEST(..., 0) prevents negative balances.
 *
 * 3. TIP ISOLATION: tip_amount_cents is surfaced separately. Tips must not
 *    double-count in total_paid_cents (they are tracked via ledger entry_type='tip'
 *    which the filter explicitly excludes).
 *
 * 4. MIGRATION ORDER: the financial view migration must be applied after the
 *    base events table migration so the soft-delete column exists.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q15-financial-view.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const MIGRATIONS_DIR = resolve(process.cwd(), 'database/migrations')

function getMigrationFiles(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    return []
  }
}

test.describe('Q15: Financial view integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: Soft-delete filter migration exists and has correct WHERE clause
  // -------------------------------------------------------------------------
  test('event_financial_summary view excludes soft-deleted events', () => {
    // The fix was in migration 20260415000003
    const migrations = getMigrationFiles()
    const fixMigration = migrations.find((f) => f.includes('20260415000003'))

    expect(
      fixMigration,
      'Migration 20260415000003 (financial view soft-delete fix) must exist'
    ).toBeTruthy()

    const sql = readFileSync(join(MIGRATIONS_DIR, fixMigration!), 'utf-8')

    // View must filter deleted events
    expect(
      sql.includes('deleted_at IS NULL'),
      'Financial view migration must include WHERE e.deleted_at IS NULL'
    ).toBe(true)

    // View must be a full replacement (CREATE OR REPLACE VIEW)
    expect(
      sql.includes('CREATE OR REPLACE VIEW event_financial_summary'),
      'Migration must use CREATE OR REPLACE VIEW for event_financial_summary'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: GREATEST guard prevents negative outstanding balance
  // -------------------------------------------------------------------------
  test('financial view uses GREATEST to prevent negative outstanding_balance_cents', () => {
    const migrations = getMigrationFiles()
    const fixMigration = migrations.find((f) => f.includes('20260415000003'))
    if (!fixMigration) return

    const sql = readFileSync(join(MIGRATIONS_DIR, fixMigration), 'utf-8')

    expect(
      sql.includes('GREATEST'),
      'outstanding_balance_cents must use GREATEST(..., 0) to prevent negative values'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Tip isolation — tips excluded from total_paid_cents
  // -------------------------------------------------------------------------
  test('financial view filters out tips from total_paid_cents', () => {
    const migrations = getMigrationFiles()
    const fixMigration = migrations.find((f) => f.includes('20260415000003'))
    if (!fixMigration) return

    const sql = readFileSync(join(MIGRATIONS_DIR, fixMigration), 'utf-8')

    // The view must filter entry_type != 'tip' from total_paid calculation
    expect(
      sql.includes("entry_type != 'tip'") || sql.includes("entry_type <> 'tip'"),
      "total_paid_cents filter must exclude entry_type = 'tip'"
    ).toBe(true)

    // And tip_amount_cents must be exposed separately
    expect(
      sql.includes('tip_amount_cents'),
      'Financial view must expose tip_amount_cents as a separate column'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Installment void trigger migration exists
  // -------------------------------------------------------------------------
  test('installment void trigger migration exists', () => {
    const migrations = getMigrationFiles()
    const fixMigration = migrations.find((f) => f.includes('20260415000003'))
    if (!fixMigration) return

    const sql = readFileSync(join(MIGRATIONS_DIR, fixMigration), 'utf-8')

    expect(
      sql.includes('trg_void_installments_on_cancel'),
      'Migration must create trg_void_installments_on_cancel trigger'
    ).toBe(true)

    expect(
      sql.includes('cancelled_at'),
      'Migration must add cancelled_at to payment_plan_installments'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Finance pages load without crash
  // -------------------------------------------------------------------------
  test('finance reporting page loads without crash', async ({ page }) => {
    const response = await page.goto('/finance/reporting/profit-loss', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    expect(response?.status()).not.toBe(500)
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/application error/i)
    // Must not show a negative dollar amount as outstanding balance
    // (negative balance = GREATEST guard failing)
    expect(bodyText).not.toMatch(/-\$[0-9]/)
  })

  // -------------------------------------------------------------------------
  // Test 6: LTV trajectory includes tips in revenue calculation
  // -------------------------------------------------------------------------
  test('LTV trajectory source includes tip_amount_cents in revenue', () => {
    const ltvFile = resolve(process.cwd(), 'lib/clients/ltv-trajectory.ts')
    if (!existsSync(ltvFile)) return

    const src = readFileSync(ltvFile, 'utf-8')

    expect(
      src.includes('tip_amount_cents'),
      'ltv-trajectory.ts must include tip_amount_cents in revenue calculation'
    ).toBe(true)
  })
})
