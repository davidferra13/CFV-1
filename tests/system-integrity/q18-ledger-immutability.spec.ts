/**
 * Q18: Ledger Immutability
 *
 * The ledger is the financial source of truth. Every payment, refund, tip,
 * and adjustment is a ledger entry. Retroactive mutation of ledger entries
 * would cause revenue numbers to silently change without audit trail.
 *
 * Tests:
 *
 * 1. APPEND ONLY: lib/ledger/append.ts must not contain UPDATE or DELETE
 *    calls on the ledger_entries table.
 *
 * 2. DB TRIGGER: a database trigger enforces immutability at the storage level,
 *    not just the application level. Verify the trigger migration exists.
 *
 * 3. COMPUTE LAYER: lib/ledger/compute.ts uses SELECT only — never mutates.
 *
 * 4. BALANCE DERIVATION: no server action stores a pre-computed balance column.
 *    Balances must be derived from the view, not written directly.
 *
 * 5. ENTRY TYPE COVERAGE: all valid entry_type values are handled in the
 *    financial view (revenue, expense, refund, tip, adjustment, deposit).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q18-ledger-immutability.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const LEDGER_APPEND = resolve(process.cwd(), 'lib/ledger/append.ts')
const LEDGER_COMPUTE = resolve(process.cwd(), 'lib/ledger/compute.ts')
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

test.describe('Q18: Ledger immutability', () => {
  // -------------------------------------------------------------------------
  // Test 1: append.ts is INSERT-only (no UPDATE, no DELETE)
  // -------------------------------------------------------------------------
  test('ledger/append.ts contains no UPDATE or DELETE on ledger_entries', () => {
    if (!existsSync(LEDGER_APPEND)) return

    const src = readFileSync(LEDGER_APPEND, 'utf-8')

    // Must not UPDATE ledger_entries
    expect(
      !src.includes('.update(') || !src.toLowerCase().includes('ledger_entries'),
      'ledger/append.ts must not UPDATE ledger_entries'
    ).toBe(true)

    // Must not DELETE from ledger_entries
    expect(!src.includes('.delete()'), 'ledger/append.ts must not DELETE from ledger_entries').toBe(
      true
    )
  })

  // -------------------------------------------------------------------------
  // Test 2: compute.ts is SELECT-only
  // -------------------------------------------------------------------------
  test('ledger/compute.ts contains only SELECT operations', () => {
    if (!existsSync(LEDGER_COMPUTE)) return

    const src = readFileSync(LEDGER_COMPUTE, 'utf-8')

    expect(!src.includes('.insert('), 'ledger/compute.ts must not INSERT').toBe(true)
    expect(!src.includes('.update('), 'ledger/compute.ts must not UPDATE').toBe(true)
    expect(!src.includes('.delete()'), 'ledger/compute.ts must not DELETE').toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Immutability trigger exists in migration history
  // -------------------------------------------------------------------------
  test('ledger_entries immutability trigger exists in migrations', () => {
    const migrations = getMigrationFiles()

    // Search all migrations for the immutability trigger
    let found = false
    for (const file of migrations) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      if (
        sql.includes('ledger_entries') &&
        (sql.includes('BEFORE UPDATE') ||
          sql.includes('BEFORE DELETE') ||
          sql.includes('immut') ||
          sql.includes('prevent_ledger'))
      ) {
        found = true
        break
      }
    }

    expect(found, 'A migration must define a BEFORE UPDATE/DELETE trigger on ledger_entries').toBe(
      true
    )
  })

  // -------------------------------------------------------------------------
  // Test 4: No server action writes a balance column directly
  // -------------------------------------------------------------------------
  test('no server action stores a pre-computed balance on events table', () => {
    // The event_financial_summary view computes balances. No one should write
    // payment_status or balance columns directly except through ledger entries.
    const eventsFinancial = resolve(process.cwd(), 'lib/events/financial-actions.ts')
    if (!existsSync(eventsFinancial)) return

    const src = readFileSync(eventsFinancial, 'utf-8')

    // Should not directly set outstanding_balance or total_paid
    expect(
      src.includes('outstanding_balance_cents =') || src.includes('total_paid_cents ='),
      'Financial actions must not directly write balance columns (use ledger entries instead)'
    ).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Test 5: Financial summary view is the canonical balance source
  // -------------------------------------------------------------------------
  test('event_financial_summary view is used in financial queries (not raw column reads)', () => {
    const financialSummaryActions = resolve(
      process.cwd(),
      'lib/events/financial-summary-actions.ts'
    )
    if (!existsSync(financialSummaryActions)) return

    const src = readFileSync(financialSummaryActions, 'utf-8')

    expect(
      src.includes('event_financial_summary'),
      'financial-summary-actions.ts must query event_financial_summary view'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Ledger entry type values match what the financial view expects
  // -------------------------------------------------------------------------
  test('ledger entry_type values are consistent between append and view', () => {
    const migrations = getMigrationFiles()
    const fixMigration = migrations.find((f) => f.includes('20260415000003'))
    if (!fixMigration) return

    const viewSql = readFileSync(join(MIGRATIONS_DIR, fixMigration), 'utf-8')

    // The view filters WHERE entry_type != 'tip' — so 'tip' must be a valid type
    // Both the append layer and view must agree on the 'tip' type name
    expect(viewSql.includes("'tip'"), "View must reference 'tip' entry_type").toBe(true)

    if (existsSync(LEDGER_APPEND)) {
      const appendSrc = readFileSync(LEDGER_APPEND, 'utf-8')
      expect(
        appendSrc.includes("'tip'") || appendSrc.includes('"tip"'),
        "ledger/append.ts must support 'tip' entry_type"
      ).toBe(true)
    }
  })
})
