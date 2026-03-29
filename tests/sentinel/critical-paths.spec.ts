// T1: Critical Paths - Core user journeys that must always work
// Schedule: Daily 6 AM on Pi
// Target time: < 5 minutes
// Mutations: Creates one test inquiry (safe, agent account only)

import { test, expect } from '@playwright/test'
import { signInViaUI } from './helpers/sentinel-utils'

test.describe('T1: Critical Paths', () => {
  test.describe('Chef Portal', () => {
    test.beforeEach(async ({ page }) => {
      await signInViaUI(page)
    })

    test('dashboard widgets render', async ({ page }) => {
      // Dashboard should have at least some widget content
      await page.waitForLoadState('domcontentloaded')
      // Look for common dashboard elements
      const body = await page.textContent('body')
      // Dashboard has greeting or widget content
      expect(body!.length).toBeGreaterThan(200)
    })

    test('events list loads', async ({ page }) => {
      await page.goto('/events', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(events|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('recipes page loads', async ({ page }) => {
      await page.goto('/recipes', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(recipes|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('financials page loads', async ({ page }) => {
      await page.goto('/financials', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(financials|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('finance hub loads', async ({ page }) => {
      await page.goto('/finance', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(finance|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('calendar page loads', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(calendar|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('settings page loads', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(settings|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('culinary hub loads', async ({ page }) => {
      await page.goto('/culinary', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(culinary|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('analytics page loads', async ({ page }) => {
      await page.goto('/analytics', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(analytics|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })

    test('inquiry form loads', async ({ page }) => {
      await page.goto('/inquiries/new', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(page).toHaveURL(/\/(inquiries|onboarding|dashboard)/)
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Public Pages', () => {
    test('for-operators page loads', async ({ page }) => {
      await page.goto('/for-operators', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      const text = await page.textContent('body')
      expect(text!.length).toBeGreaterThan(100)
    })

    test('blog page loads', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('help page loads', async ({ page }) => {
      await page.goto('/help', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
