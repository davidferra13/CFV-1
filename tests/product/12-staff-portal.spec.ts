// Product Tests — Staff Portal
// Proves: Staff members can access their dedicated portal pages.
// Uses staff storageState (product-staff project).
//
// Run: npx playwright test -p product-staff

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

test.describe('Staff Portal — Core Pages', () => {
  test('staff dashboard loads', async ({ page }) => {
    await page.goto('/staff-dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('staff recipes page loads', async ({ page }) => {
    await page.goto('/staff-recipes')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('staff schedule page loads', async ({ page }) => {
    await page.goto('/staff-schedule')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('staff tasks page loads', async ({ page }) => {
    await page.goto('/staff-tasks')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('staff time page loads', async ({ page }) => {
    await page.goto('/staff-time')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('staff station page loads', async ({ page }) => {
    await page.goto('/staff-station')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('no console errors across staff portal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const staffPages = [
      '/staff-dashboard',
      '/staff-recipes',
      '/staff-schedule',
      '/staff-tasks',
      '/staff-time',
    ]

    for (const route of staffPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
    }

    expect(errors).toHaveLength(0)
  })
})
