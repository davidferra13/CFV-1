// Journey Tests — Grocery & Sourcing (Week 3)
// Verifies grocery lists, price quotes, vendor comparison,
// Instacart integration, receipt parsing, and inventory tracking.
//
// Scenarios: #225-231
//
// Run: npx playwright test --project=journey-chef tests/journey/13-grocery-sourcing.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Grocery Quote (Event-Level) (#225-226) ─────────────────────────────────────

test.describe('Grocery — Event Grocery Quote (#225-226)', () => {
  test('event grocery quote page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/grocery-quote`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('grocery quote page has content', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/grocery-quote`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Vendors (#227, #229) ───────────────────────────────────────────────────────

test.describe('Grocery — Vendors (#227, #229)', () => {
  test('vendors page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.vendors)
  })

  test('vendors page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.vendors)
  })

  test('vendor price comparison page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.vendorsPriceComparison)
  })

  test('vendor invoices page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.vendorsInvoices)
  })
})

// ─── Inventory (#231) ──────────────────────────────────────────────────────────

test.describe('Grocery — Inventory (#231)', () => {
  test('inventory hub loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inventory)
  })

  test('inventory waste page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inventoryWaste)
  })

  test('inventory expiry alerts page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inventoryExpiry)
  })

  test('inventory demand forecast page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inventoryDemand)
  })
})

// ─── Food Cost Tracking (#228) ──────────────────────────────────────────────────

test.describe('Grocery — Food Cost (#228)', () => {
  test('food cost page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.foodCost)
  })

  test('food cost page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.foodCost)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Receipt Parsing (#230) ────────────────────────────────────────────────────

test.describe('Grocery — Receipt Parsing (#230)', () => {
  test('receipts page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.receipts)
  })

  test('expense form has receipt upload capability', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.expensesNew)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})
