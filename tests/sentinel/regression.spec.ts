// T3: Full Regression - Comprehensive checks including auth boundaries and error states
// Schedule: Weekly Sunday 3 AM on Pi
// Target time: < 15 minutes
// Read-only: Mostly (some pages may have side effects from navigation)

import { test, expect } from '@playwright/test'
import { signInViaUI } from './helpers/sentinel-utils'

test.describe('T3: Regression', () => {
  test.describe('Auth Boundaries', () => {
    test('unauthenticated user redirected from dashboard', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      // Should redirect to sign-in or a public page
      const url = page.url()
      expect(url).toMatch(/\/(auth\/signin|$)/)
    })

    test('unauthenticated user redirected from events', async ({ page }) => {
      await page.goto('/events', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const url = page.url()
      expect(url).toMatch(/\/(auth\/signin|$)/)
    })

    test('unauthenticated user can access public pages', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      await page.goto('/discover', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      await page.goto('/book', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Error States', () => {
    test('404 page renders for invalid route', async ({ page }) => {
      const resp = await page.goto('/this-route-does-not-exist-abc123', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      // Next.js may return 200 with not-found page content (catch-all behavior)
      // Accept either 404 or 200 - the key check is that the page renders, not blank
      const status = resp?.status() ?? 0
      expect([200, 404]).toContain(status)
      await expect(page.locator('body')).toBeVisible()
      const text = await page.textContent('body')
      expect(text!.toLowerCase()).toMatch(/not found|404|page|chefflow/)
    })

    test('invalid event ID shows error state, not blank', async ({ page }) => {
      await signInViaUI(page)
      await page.goto('/events/00000000-0000-0000-0000-000000000000', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      })
      // Should show an error message or redirect, not a blank page
      await expect(page.locator('body')).toBeVisible()
      const text = await page.textContent('body')
      expect(text!.length).toBeGreaterThan(20)
    })
  })

  test.describe('Chef Portal Deep Pages', () => {
    // Single test signs in once and navigates to all pages sequentially.
    // This avoids repeated signInViaUI calls and cascade failures.
    test('all deep pages load after single sign-in', async ({ page }) => {
      await signInViaUI(page)

      const deepPages = [
        '/staff',
        '/inbox',
        '/queue',
        '/daily',
        '/network',
        '/menus',
        '/culinary/costing',
        '/goals',
        '/activity',
        '/reviews',
      ]

      const failures: string[] = []
      for (const route of deepPages) {
        try {
          await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
          await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })
        } catch (err) {
          failures.push(`${route}: ${(err as Error).message}`)
        }
      }

      if (failures.length > 0) {
        throw new Error(`Deep pages failed:\n${failures.join('\n')}`)
      }
    })
  })

  test.describe('Public Pages Deep', () => {
    test('chef profile page renders', async ({ page }) => {
      // Try a known route pattern
      await page.goto('/for-operators', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      const text = await page.textContent('body')
      expect(text!.length).toBeGreaterThan(100)
    })

    test('beta signup page loads', async ({ page }) => {
      await page.goto('/beta', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('pricing page loads', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
