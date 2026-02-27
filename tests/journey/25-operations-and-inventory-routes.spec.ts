// Journey Tests - Operations and Inventory Routes
// Adds route and content checks for operational controls and
// inventory management pages used in day-to-day execution.
//
// Scenarios: #395-410
//
// Run: npx playwright test --project=journey-chef tests/journey/25-operations-and-inventory-routes.spec.ts

import { test } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Operations Routes (#395-399)', () => {
  test('operations hub page loads (#395)', async ({ page }) => {
    await assertPageLoads(page, '/operations')
  })

  test('operations equipment page loads (#396)', async ({ page }) => {
    await assertPageLoads(page, '/operations/equipment')
  })

  test('operations kitchen rentals page loads (#397)', async ({ page }) => {
    await assertPageLoads(page, '/operations/kitchen-rentals')
  })

  test('daily operations route remains reachable (#398)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.daily)
  })

  test('tasks route has no page errors (#399)', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.tasks)
  })
})

test.describe('Inventory Routes - Core (#400-405)', () => {
  test('inventory hub page loads (#400)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inventory)
  })

  test('inventory audits page loads (#401)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/audits')
  })

  test('new inventory audit page loads (#402)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/audits/new')
  })

  test('inventory counts page loads (#403)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/counts')
  })

  test('inventory locations page has content (#404)', async ({ page }) => {
    await page.goto('/inventory/locations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('inventory transactions page has content (#405)', async ({ page }) => {
    await page.goto('/inventory/transactions')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Inventory Routes - Purchasing and Costing (#406-410)', () => {
  test('purchase orders page loads (#406)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/purchase-orders')
  })

  test('new purchase order page loads (#407)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/purchase-orders/new')
  })

  test('vendor invoices page loads (#408)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/vendor-invoices')
  })

  test('inventory food-cost page loads (#409)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/food-cost')
  })

  test('staff meals inventory page has content (#410)', async ({ page }) => {
    await page.goto('/inventory/staff-meals')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})
