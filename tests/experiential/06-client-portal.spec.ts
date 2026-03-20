// Experiential Verification: Client Portal
//
// Walks every major client-facing page and verifies continuous visual feedback.
// Client portal has fewer pages but each one is customer-facing, so blank
// screens or errors are especially damaging to trust.

import { test, expect } from '@playwright/test'
import { navigateAndVerify, assertNotBlank, dismissOverlays } from './helpers/experiential-utils'

const CLIENT_ROUTES = {
  myEvents: '/my-events',
  myQuotes: '/my-quotes',
  myChat: '/my-chat',
  myProfile: '/my-profile',
  myRewards: '/my-rewards',
  bookNow: '/book-now',
}

test.describe('Client Portal Navigation', () => {
  test.setTimeout(120_000)

  test('every client route shows content or empty state, never blank', async ({
    page,
  }, testInfo) => {
    const results: { route: string; status: string }[] = []

    // Establish session
    await page.goto('/my-events', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await dismissOverlays(page)

    for (const [name, route] of Object.entries(CLIENT_ROUTES)) {
      try {
        const { settled } = await navigateAndVerify(page, route, `client-${name}`, testInfo)
        await dismissOverlays(page)
        results.push({ route, status: settled.hasError ? 'ERROR' : 'OK' })
      } catch (err) {
        results.push({
          route,
          status: `FAIL: ${(err as Error).message.slice(0, 100)}`,
        })
      }
    }

    const failures = results.filter((r) => r.status.startsWith('FAIL'))

    const summary = [
      '# Client Portal Experiential Report',
      '',
      ...results.map((r) => `- [${r.status}] ${r.route}`),
    ].join('\n')

    await testInfo.attach('client-portal-report', {
      body: Buffer.from(summary),
      contentType: 'text/markdown',
    })

    expect(failures, `${failures.length} client routes showed blank screens`).toHaveLength(0)
  })

  test('my-events detail page renders for existing event', async ({ page }, testInfo) => {
    await page.goto('/my-events', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await dismissOverlays(page)

    const eventLink = page.locator('a[href*="/my-events/"]').first()
    const hasEvent = await eventLink.isVisible().catch(() => false)

    if (!hasEvent) {
      test.skip(true, 'No client events in test data')
      return
    }

    await eventLink.click()
    await page.waitForTimeout(300)
    await assertNotBlank(page, 'client-event-detail-immediate', testInfo)

    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
    await assertNotBlank(page, 'client-event-detail-settled', testInfo)
  })
})
