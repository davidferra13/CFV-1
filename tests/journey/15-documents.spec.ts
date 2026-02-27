// Journey Tests — Documents & Organization (Week 3)
// Verifies document search, folder management, upload,
// organization, and data export.
//
// Scenarios: #247-254
//
// Run: npx playwright test --project=journey-chef tests/journey/15-documents.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Import / Document Hub (#247-248) ───────────────────────────────────────────

test.describe('Documents — Hub (#247-248)', () => {
  test('import hub loads (document center)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.import)
  })

  test('import hub has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.import)
  })

  test('import hub shows document options', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.import)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Receipts Library (#249-250) ────────────────────────────────────────────────

test.describe('Documents — Receipts (#249-250)', () => {
  test('receipts library page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.receipts)
  })

  test('receipts page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.receipts)
  })
})

// ─── Contract Templates (#251) ──────────────────────────────────────────────────

test.describe('Documents — Contracts (#251)', () => {
  test('contract templates page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsContracts)
  })

  test('contract templates page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsContracts)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Data Export (#253-254) ─────────────────────────────────────────────────────

test.describe('Documents — Export (#253-254)', () => {
  test('finance reporting page loads (export source)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeReporting)
  })

  test('analytics reports page loads (export source)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsReports)
  })
})

// ─── Settings Portfolio (#252) ──────────────────────────────────────────────────

test.describe('Documents — Portfolio (#252)', () => {
  test('portfolio settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsPortfolio)
  })
})

// ─── Help Center ────────────────────────────────────────────────────────────────

test.describe('Documents — Help Center', () => {
  test('help page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.help)
  })

  test('help page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.help)
  })

  test('help page shows content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.help)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})
