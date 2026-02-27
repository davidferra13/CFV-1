// Journey Tests - Communications and Triage Routes
// Adds deeper checks for inbox triage, inquiry variants,
// chat paths, and notification surfaces.
//
// Scenarios: #427-440
//
// Run: npx playwright test --project=journey-chef tests/journey/27-communications-and-triage-routes.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Communication Routes - Inbox Triage (#427-431)', () => {
  test('inbox triage route loads (#427)', async ({ page }) => {
    await assertPageLoads(page, '/inbox/triage')
  })

  test('inbox history scan route loads (#428)', async ({ page }) => {
    await assertPageLoads(page, '/inbox/history-scan')
  })

  test('inbox root route has no page errors (#429)', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.inbox)
  })

  test('inbox triage route has content (#430)', async ({ page }) => {
    await page.goto('/inbox/triage')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('chat route remains reachable (#431)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.chat)
  })
})

test.describe('Communication Routes - Inquiry Variants (#432-435)', () => {
  test('inquiries menu-drafting route loads (#432)', async ({ page }) => {
    await assertPageLoads(page, '/inquiries/menu-drafting')
  })

  test('inquiries sent-to-client route loads (#433)', async ({ page }) => {
    await assertPageLoads(page, '/inquiries/sent-to-client')
  })

  test('inquiries awaiting-client route remains reachable (#434)', async ({ page }) => {
    await assertPageLoads(page, '/inquiries/awaiting-client-reply')
  })

  test('new inquiries route has input controls (#435)', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.inquiriesNew)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const controls = page.locator('input, textarea, select, button')
    expect(await controls.count()).toBeGreaterThan(0)
  })
})

test.describe('Communication Routes - Notifications and Activity (#436-440)', () => {
  test('notifications route loads (#436)', async ({ page }) => {
    await assertPageLoads(page, '/notifications')
  })

  test('activity route loads (#437)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.activity)
  })

  test('schedule route loads (#438)', async ({ page }) => {
    await assertPageLoads(page, '/schedule')
  })

  test('chat route has content (#439)', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.chat)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('activity route has content (#440)', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.activity)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Communication Routes - Dynamic Thread and Call Coverage (#496-498)', () => {
  test('call detail route is reachable from calls list (#496)', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const callLink = page.locator('a[href^="/calls/"]').first()
    if ((await callLink.count()) === 0) return

    await callLink.click()
    await page.waitForLoadState('domcontentloaded')
    await assertPageHasContent(page)
  })

  test('call edit route is reachable from call detail when available (#497)', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const callLink = page.locator('a[href^="/calls/"]').first()
    if ((await callLink.count()) === 0) return
    await callLink.click()
    await page.waitForLoadState('domcontentloaded')

    const editLink = page.locator('a[href$="/edit"]').first()
    if ((await editLink.count()) === 0) return

    await editLink.click()
    await page.waitForLoadState('domcontentloaded')
    await assertPageHasContent(page)
  })

  test('inbox triage thread route is reachable from triage list (#498)', async ({ page }) => {
    await page.goto('/inbox/triage')
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const triageThreadLink = page.locator('a[href^="/inbox/triage/"]').first()
    if ((await triageThreadLink.count()) === 0) return

    await triageThreadLink.click()
    await page.waitForLoadState('domcontentloaded')
    await assertPageHasContent(page)
  })
})
