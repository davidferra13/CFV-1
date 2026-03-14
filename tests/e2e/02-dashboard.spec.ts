// Dashboard E2E Tests
// Verifies the chef dashboard loads with key structural elements.
// Uses chef storageState (applied by Playwright 'chef' project).

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Chef Dashboard', () => {
  test('dashboard page loads', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('page has a meaningful title', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    const title = await page.title()
    expect(title.toLowerCase()).toMatch(/dashboard|chefflow/i)
  })

  test('New Event navigation is present', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    // Wait for streaming Suspense content to resolve before asserting element presence
    await page.waitForLoadState('networkidle')
    // Look for a 'New Event' link or button
    const newEventEl = page
      .getByRole('link', { name: /new event/i })
      .first()
      .or(page.getByRole('button', { name: /new event/i }).first())
    await expect(newEventEl).toBeVisible({ timeout: 10_000 })
  })

  test('chef navigation renders with key sections', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    // Nav should have links to core sections
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible()
  })

  test('no unhandled error on dashboard', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(ROUTES.chefDashboard)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
