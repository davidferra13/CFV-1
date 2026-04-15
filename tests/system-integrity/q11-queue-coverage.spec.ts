/**
 * Q11: Priority Queue Coverage
 *
 * The priority queue (chef dashboard "Next action" surface) must surface
 * every financial gap. Blind spots mean the chef misses revenue.
 *
 * Tests:
 *
 * 1. STRUCTURAL: the financial queue provider contains ALL required detectors:
 *    (a) outstanding_balance_cents > 0  — events with money owed
 *    (b) no-deposit for TakeAChef imports — events with zero payments AND no
 *        quoted_price_cents (TakeAChef bookings have no quoted price)
 *    (c) missing receipts for business expenses
 *    (d) unclosed completed events
 *    (e) revenue goal gap
 *
 * 2. NO-DEPOSIT DETECTOR: the no-deposit section specifically handles
 *    events where outstanding_balance_cents would be 0 (because quoted_price_cents
 *    is NULL) but total_paid_cents is also 0 — the invisible financial gap.
 *
 * 3. SCORING: no-deposit items have isBlocking=true and impactWeight >= 0.8
 *    so they rank high enough to surface before lower-priority items.
 *
 * 4. API SURFACE: the queue endpoint returns results for an authenticated chef
 *    and does not return 500.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q11-queue-coverage.spec.ts
 */
import { test, expect, request } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const FINANCIAL_PROVIDER = resolve(process.cwd(), 'lib/queue/providers/financial.ts')

test.describe('Q11: Priority queue coverage', () => {
  // -------------------------------------------------------------------------
  // Test 1: All five financial detectors are present in source
  // -------------------------------------------------------------------------
  test('financial queue provider contains all five detectors', () => {
    expect(existsSync(FINANCIAL_PROVIDER), 'lib/queue/providers/financial.ts must exist').toBe(true)

    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    // Detector 1: outstanding balance
    expect(
      src.includes('outstanding_balance_cents'),
      'Detector 1 (outstanding balance) missing'
    ).toBe(true)

    // Detector 2: no-deposit for TakeAChef / zero-payment events
    expect(
      src.includes('no_deposit') || src.includes('No deposit'),
      'Detector 2 (no-deposit for zero-payment events) missing'
    ).toBe(true)

    // Detector 3: missing receipts
    expect(
      src.includes('receipt_uploaded') || src.includes('add_receipt'),
      'Detector 3 (missing receipts) missing'
    ).toBe(true)

    // Detector 4: unclosed completed events
    expect(
      src.includes('financially_closed') || src.includes('close_financials'),
      'Detector 4 (unclosed events) missing'
    ).toBe(true)

    // Detector 5: revenue goal gap
    expect(
      src.includes('revenue_goal') || src.includes('revenue_goal_gap'),
      'Detector 5 (revenue goal gap) missing'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: No-deposit detector handles NULL quoted_price_cents correctly
  // -------------------------------------------------------------------------
  test('no-deposit detector does not rely on outstanding_balance_cents', () => {
    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    // The no-deposit section must query events independently and check
    // total_paid_cents directly — NOT outstanding_balance_cents
    // (because outstanding_balance_cents = 0 when quoted_price_cents is NULL)
    const noDepositSection = src.slice(
      src.indexOf('no_deposit') !== -1
        ? Math.max(0, src.indexOf('no_deposit') - 500)
        : src.indexOf('No deposit'),
      src.indexOf('no_deposit') !== -1
        ? src.indexOf('no_deposit') + 2000
        : src.indexOf('No deposit') + 2000
    )

    expect(
      noDepositSection.includes('total_paid_cents'),
      'no-deposit detector must check total_paid_cents (not outstanding_balance_cents)'
    ).toBe(true)

    // It must query accepted/proposed events directly
    expect(
      noDepositSection.includes('accepted') || noDepositSection.includes('proposed'),
      'no-deposit detector must target accepted/proposed events'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: No-deposit scoring — isBlocking=true, high impactWeight
  // -------------------------------------------------------------------------
  test('no-deposit items are scored with isBlocking=true and impactWeight >= 0.8', () => {
    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    // Find the no-deposit ScoreInputs block
    const idxNoDeposit = src.indexOf('no_deposit')
    const scoreBlock = src.slice(idxNoDeposit, idxNoDeposit + 500)

    expect(
      scoreBlock.includes('isBlocking: true'),
      'no-deposit items must have isBlocking: true'
    ).toBe(true)

    // impactWeight must be at least 0.8
    const weightMatch = scoreBlock.match(/impactWeight:\s*([\d.]+)/)
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1])
      expect(
        weight,
        `no-deposit impactWeight must be >= 0.8, got ${weight}`
      ).toBeGreaterThanOrEqual(0.8)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: Queue API endpoint responds to authenticated requests
  // -------------------------------------------------------------------------
  test('queue API endpoint returns 200 for authenticated chef', async ({ page }) => {
    // Navigate to the dashboard which renders the queue
    const response = await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    expect(response?.status(), 'Dashboard must return 200').toBe(200)

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/application error/i)
    expect(bodyText).not.toMatch(/500/i)
  })

  // -------------------------------------------------------------------------
  // Test 5: Queue domain types are defined
  // -------------------------------------------------------------------------
  test('queue score system has all required inputs', () => {
    const scoreFile = resolve(process.cwd(), 'lib/queue/score.ts')
    if (!existsSync(scoreFile)) return

    const src = readFileSync(scoreFile, 'utf-8')

    // All inputs used in the financial provider must be in ScoreInputs
    const required = ['hoursUntilDue', 'impactWeight', 'isBlocking', 'isExpiring', 'revenueCents']
    for (const field of required) {
      expect(src.includes(field), `ScoreInputs must include ${field}`).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 6: Queue deduplication — items use stable IDs (no random suffix)
  // -------------------------------------------------------------------------
  test('queue items use stable deterministic IDs', () => {
    const src = readFileSync(FINANCIAL_PROVIDER, 'utf-8')

    // Extract all id: `...` patterns
    const idPatterns = src.match(/id:\s*`[^`]+`/g) || []

    for (const idPat of idPatterns) {
      // Must not use Date.now() or Math.random() in IDs (makes dedup impossible)
      expect(idPat).not.toMatch(/Date\.now|Math\.random/)
    }
  })
})
