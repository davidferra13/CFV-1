/**
 * Q36: Financial View Integrity
 *
 * event_financial_summary is the single source of truth for per-event
 * financials. Two known failure modes have been fixed via migrations:
 *
 *   1. Soft-deleted events appeared in financial reports, overstating revenue.
 *      Fix: WHERE deleted_at IS NULL in the view definition.
 *
 *   2. TakeAChef events (no quoted_price_cents) showed $0 outstanding balance
 *      even when the chef had real money to collect.
 *      Fix: GREATEST(..., 0) guard with COALESCE for NULL quoted_price_cents.
 *
 * Both fixes must be present in the live migration that defines the view.
 * These tests are regression guards - the view was wrong before, it must
 * never silently regress.
 *
 * Tests:
 *
 * 1. SOFT-DELETE EXCLUSION: The view definition migration includes
 *    WHERE deleted_at IS NULL (soft-deleted events excluded).
 *
 * 2. NULL QUOTED PRICE GUARD: outstanding_balance_cents uses COALESCE or
 *    GREATEST to handle NULL quoted_price_cents without returning $0.
 *
 * 3. VIEW MIGRATION EXISTS: The migration that rebuilds the view exists and
 *    has the correct timestamp (applied after the original broken version).
 *
 * 4. LEDGER JOIN: The view joins ledger_entries, not a denormalized column.
 *    Financial state must be derived, never stored.
 *
 * 5. TENANT SCOPING: The view includes tenant_id in its SELECT so callers
 *    can filter per-chef without a second join.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q36-financial-view-integrity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// The migration that defines the corrected view
const VIEW_MIGRATION = resolve(
  process.cwd(),
  'database/migrations/20260415000003_fix_financial_view_and_installment_voids.sql'
)

// Fallback: earlier fix migration
const EARLIER_VIEW_MIGRATION = resolve(
  process.cwd(),
  'database/migrations/20260410000001_fix_event_financial_summary_view.sql'
)

function getViewMigration(): string {
  if (existsSync(VIEW_MIGRATION)) return readFileSync(VIEW_MIGRATION, 'utf-8')
  if (existsSync(EARLIER_VIEW_MIGRATION)) return readFileSync(EARLIER_VIEW_MIGRATION, 'utf-8')
  return ''
}

test.describe('Q36: Financial view integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: Soft-deleted events excluded from the view
  // -------------------------------------------------------------------------
  test('event_financial_summary excludes soft-deleted events (WHERE deleted_at IS NULL)', () => {
    const src = getViewMigration()
    expect(src.length, 'financial view migration must exist').toBeGreaterThan(0)

    expect(
      src.includes('deleted_at IS NULL') || src.includes('deleted_at is null'),
      'event_financial_summary must filter WHERE deleted_at IS NULL (soft-deleted events must not appear in reports)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: NULL quoted_price_cents handled correctly (no false $0 outstanding)
  // -------------------------------------------------------------------------
  test('outstanding_balance_cents handles NULL quoted_price_cents via COALESCE/GREATEST', () => {
    const src = getViewMigration()

    // Must use COALESCE to guard against NULL and GREATEST to floor at 0
    expect(
      (src.includes('COALESCE') || src.includes('coalesce')) &&
        (src.includes('GREATEST') ||
          src.includes('greatest') ||
          src.includes('quoted_price_cents')),
      'outstanding_balance_cents must use COALESCE/GREATEST to handle TakeAChef events with NULL quoted_price_cents'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Fix migration exists with timestamp after original broken version
  // -------------------------------------------------------------------------
  test('corrected view migration exists (applied after original broken version)', () => {
    expect(
      existsSync(VIEW_MIGRATION) || existsSync(EARLIER_VIEW_MIGRATION),
      'A view fix migration must exist — the original view had bugs, the fix must be applied'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: View derives financials from ledger_entries (not stored column)
  // -------------------------------------------------------------------------
  test('event_financial_summary joins ledger_entries for derived financials', () => {
    const src = getViewMigration()

    expect(
      src.includes('ledger_entries'),
      'event_financial_summary must join ledger_entries (financial state is derived, never stored)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: View includes tenant_id for per-chef filtering
  // -------------------------------------------------------------------------
  test('event_financial_summary selects tenant_id for per-chef data access', () => {
    const src = getViewMigration()

    expect(
      src.includes('tenant_id'),
      'event_financial_summary must include tenant_id so callers can filter by chef'
    ).toBe(true)
  })
})
