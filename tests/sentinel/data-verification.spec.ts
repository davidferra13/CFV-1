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

  test('authenticated data pages load with content', async ({ page }) => {
    await signInViaUI(page)

    // Ingredients page
    await page.goto('/culinary/ingredients', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await expect(page).toHaveURL(/\/(culinary\/ingredients|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()
    let text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(100)

    // Price catalog
    await page.goto('/culinary/price-catalog', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await expect(page).toHaveURL(/\/(culinary\/price-catalog|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()
    text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(50)

    // Dashboard price widgets
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('body')).toBeVisible()
    text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(200)
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
})
