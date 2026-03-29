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
      // Should return 404 or render a not-found page (not crash)
      expect(resp?.status()).toBe(404)
      await expect(page.locator('body')).toBeVisible()
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
    test.beforeEach(async ({ page }) => {
      await signInViaUI(page)
    })

    test('staff page loads', async ({ page }) => {
      await page.goto('/staff', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('inbox page loads', async ({ page }) => {
      await page.goto('/inbox', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('queue page loads', async ({ page }) => {
      await page.goto('/queue', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('daily ops page loads', async ({ page }) => {
      await page.goto('/daily', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('network page loads', async ({ page }) => {
      await page.goto('/network', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('menus page loads', async ({ page }) => {
      await page.goto('/menus', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('costing page loads', async ({ page }) => {
      await page.goto('/culinary/costing', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('goals page loads', async ({ page }) => {
      await page.goto('/goals', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('activity page loads', async ({ page }) => {
      await page.goto('/activity', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
    })

    test('reviews page loads', async ({ page }) => {
      await page.goto('/reviews', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page.locator('body')).toBeVisible()
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
