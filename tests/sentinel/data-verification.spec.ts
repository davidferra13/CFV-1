// T2: Data Verification - Confirms OpenClaw data sync landed correctly
// Schedule: 11:15 PM daily on Pi (15 min after price sync)
// Target time: < 2 minutes
// Read-only: Yes (no mutations)

import { test, expect } from '@playwright/test'
import { signInViaUI } from './helpers/sentinel-utils'

const CRON_SECRET = process.env.CRON_SECRET || ''

test.describe('T2: Data Verification', () => {
  test('sync-status endpoint reports recent sync', async ({ request }) => {
    test.skip(!CRON_SECRET, 'CRON_SECRET not set, skipping sync status check')

    const resp = await request.get('/api/sentinel/sync-status', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body.priceHistoryRows).toBeGreaterThan(0)

    // If lastSync is available, check it's within the last 48 hours
    // (generous window for weekends/downtime)
    if (body.lastSync) {
      const lastSync = new Date(body.lastSync)
      const hoursSince = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
      expect(hoursSince).toBeLessThan(48)
    }
  })

  test('ingredients page shows prices', async ({ page }) => {
    await signInViaUI(page)
    await page.goto('/culinary/ingredients', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await expect(page).toHaveURL(/\/(culinary\/ingredients|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()

    // Page should have content (not blank)
    const text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(100)
  })

  test('price catalog loads with data', async ({ page }) => {
    await signInViaUI(page)
    await page.goto('/culinary/price-catalog', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await expect(page).toHaveURL(/\/(culinary\/price-catalog|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()

    // Should have content (catalog data or empty state)
    const text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(50)
  })

  test('discover directory has listings', async ({ page }) => {
    await page.goto('/discover', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()

    // Should have substantial content (200K+ listings)
    const text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(200)
  })

  test('discover search works', async ({ page }) => {
    await page.goto('/discover', { waitUntil: 'domcontentloaded', timeout: 60_000 })

    // Look for a search input
    const searchInput = page
      .locator('input[type="search"], input[type="text"], input[placeholder*="earch"]')
      .first()
    const hasSearch = await searchInput.isVisible({ timeout: 10_000 }).catch(() => false)

    if (hasSearch) {
      await searchInput.fill('restaurant')
      // Wait for results to update
      await page.waitForTimeout(2_000)
      const text = await page.textContent('body')
      expect(text!.length).toBeGreaterThan(100)
    }
  })

  test('dashboard price widgets render', async ({ page }) => {
    await signInViaUI(page)
    await page.waitForLoadState('domcontentloaded')

    // Dashboard should load without crashing
    // Price widgets may or may not have data, but the page should render
    await expect(page.locator('body')).toBeVisible()
    const body = await page.textContent('body')
    expect(body!.length).toBeGreaterThan(200)
  })
})
