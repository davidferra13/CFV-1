// Production Smoke Tests
// Verifies critical public pages load on the live production domain.
// No authentication, no data mutation, just page load verification.

import { test, expect } from '../helpers/fixtures'

const PRODUCTION_URL = 'https://app.cheflowhq.com'

test.describe('Production Smoke', () => {
  test.describe.configure({ timeout: 30_000 })

  const publicPages = [
    { path: '/', name: 'Homepage' },
    { path: '/auth/signin', name: 'Sign In' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/about', name: 'About' },
    { path: '/for-chefs', name: 'For Chefs' },
  ]

  for (const { path, name } of publicPages) {
    test(`${name} (${path}) loads without error`, async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()

      const response = await page.goto(`${PRODUCTION_URL}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      })

      expect(response).not.toBeNull()
      expect(response!.status()).toBeLessThan(400)

      const body = await page.locator('body').textContent()
      expect(body).toBeTruthy()
      expect(body!.length).toBeGreaterThan(10)

      await context.close()
    })
  }
})
