// Journey Tests - Growth and Pipeline Routes
// Adds deeper checks for leads segmentation, prospecting workflows,
// and growth surfaces around proposals and reputation.
//
// Scenarios: #411-426
//
// Run: npx playwright test --project=journey-chef tests/journey/26-growth-and-pipeline-routes.spec.ts

import { test } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Growth Routes - Leads Segments (#411-415)', () => {
  test('qualified leads route loads (#411)', async ({ page }) => {
    await assertPageLoads(page, '/leads/qualified')
  })

  test('contacted leads route loads (#412)', async ({ page }) => {
    await assertPageLoads(page, '/leads/contacted')
  })

  test('converted leads route loads (#413)', async ({ page }) => {
    await assertPageLoads(page, '/leads/converted')
  })

  test('archived leads route loads (#414)', async ({ page }) => {
    await assertPageLoads(page, '/leads/archived')
  })

  test('base leads route has no page errors (#415)', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.leads)
  })
})

test.describe('Growth Routes - Prospecting (#416-420)', () => {
  test('prospecting queue route loads (#416)', async ({ page }) => {
    await assertPageLoads(page, '/prospecting/queue')
  })

  test('prospecting scripts route loads (#417)', async ({ page }) => {
    await assertPageLoads(page, '/prospecting/scripts')
  })

  test('prospecting scrub route loads (#418)', async ({ page }) => {
    await assertPageLoads(page, '/prospecting/scrub')
  })

  test('base prospecting route remains reachable (#419)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.prospecting)
  })

  test('prospecting queue route has content (#420)', async ({ page }) => {
    await page.goto('/prospecting/queue')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Growth Routes - Proposals and Reputation (#421-426)', () => {
  test('proposal addons route loads (#421)', async ({ page }) => {
    await assertPageLoads(page, '/proposals/addons')
  })

  test('proposal templates route loads (#422)', async ({ page }) => {
    await assertPageLoads(page, '/proposals/templates')
  })

  test('guest leads route loads (#423)', async ({ page }) => {
    await assertPageLoads(page, '/guest-leads')
  })

  test('guest analytics route loads (#424)', async ({ page }) => {
    await assertPageLoads(page, '/guest-analytics')
  })

  test('reviews route has content (#425)', async ({ page }) => {
    await page.goto('/reviews')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('reputation mentions route has content (#426)', async ({ page }) => {
    await page.goto('/reputation/mentions')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Growth Routes - Marketing Detail Coverage (#494-495)', () => {
  test('new push-dinner campaign route loads (#494)', async ({ page }) => {
    await assertPageLoads(page, '/marketing/push-dinners/new')
  })

  test('marketing detail route is reachable from marketing list (#495)', async ({ page }) => {
    await page.goto('/marketing')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const marketingDetailLink = page.locator('a[href^="/marketing/"]').first()
    if ((await marketingDetailLink.count()) === 0) return

    await marketingDetailLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})
