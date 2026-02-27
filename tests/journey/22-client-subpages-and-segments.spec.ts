// Journey Tests - Client Subpages and Segments
// Adds deeper client workflow coverage for preferences, history,
// insights, segmentation, and recurring services.
//
// Scenarios: #351-364
//
// Run: npx playwright test --project=journey-chef tests/journey/22-client-subpages-and-segments.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Client Deep Links - Preferences (#351-354)', () => {
  test('allergies preferences page loads (#351)', async ({ page }) => {
    await assertPageLoads(page, '/clients/preferences/allergies')
  })

  test('dietary restrictions preferences page loads (#352)', async ({ page }) => {
    await assertPageLoads(page, '/clients/preferences/dietary-restrictions')
  })

  test('dislikes preferences page loads (#353)', async ({ page }) => {
    await assertPageLoads(page, '/clients/preferences/dislikes')
  })

  test('favorite dishes preferences page has content (#354)', async ({ page }) => {
    await page.goto('/clients/preferences/favorite-dishes')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Client Deep Links - History and Insights (#355-359)', () => {
  test('event history page loads (#355)', async ({ page }) => {
    await assertPageLoads(page, '/clients/history/event-history')
  })

  test('past menus history page loads (#356)', async ({ page }) => {
    await assertPageLoads(page, '/clients/history/past-menus')
  })

  test('spending history page loads (#357)', async ({ page }) => {
    await assertPageLoads(page, '/clients/history/spending-history')
  })

  test('at-risk insights page loads (#358)', async ({ page }) => {
    await assertPageLoads(page, '/clients/insights/at-risk')
  })

  test('top clients insights page has content (#359)', async ({ page }) => {
    await page.goto('/clients/insights/top-clients')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Client Deep Links - Segmentation (#360-362)', () => {
  test('segments page loads (#360)', async ({ page }) => {
    await assertPageLoads(page, '/clients/segments')
  })

  test('presence page has no page errors (#361)', async ({ page }) => {
    await assertNoPageErrors(page, '/clients/presence')
  })

  test('duplicates page has content (#362)', async ({ page }) => {
    await page.goto('/clients/duplicates')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Client Deep Links - Recurring Service with Seed IDs (#363-364)', () => {
  test('primary client recurring service page loads (#363)', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}/recurring`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('secondary client recurring service page has form controls (#364)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/clients/${seedIds.clientIds.secondary}/recurring`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const controls = page.locator('input, textarea, select, button')
    expect(await controls.count()).toBeGreaterThan(0)
  })
})

test.describe('Client Deep Links - Baseline Route Check', () => {
  test('base client preferences route remains reachable', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsPreferences)
  })
})
