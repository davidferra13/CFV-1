// Product Tests — Partner Portal
// Proves: Referral partners can access their dedicated portal pages.
// Uses partner storageState (product-partner project).
//
// Run: npx playwright test -p product-partner

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

test.describe('Partner Portal — Core Pages', () => {
  test('partner dashboard loads', async ({ page }) => {
    await page.goto('/partner/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('partner events page loads', async ({ page }) => {
    await page.goto('/partner/events')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('partner profile page loads', async ({ page }) => {
    await page.goto('/partner/profile')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('partner locations page loads', async ({ page, seedIds }) => {
    await page.goto(`/partner/locations/${seedIds.partnerLocationId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('partner preview page loads', async ({ page }) => {
    await page.goto('/partner/preview')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('no console errors across partner portal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const partnerPages = [
      '/partner/dashboard',
      '/partner/events',
      '/partner/profile',
      '/partner/preview',
    ]

    for (const route of partnerPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
    }

    expect(errors).toHaveLength(0)
  })
})
