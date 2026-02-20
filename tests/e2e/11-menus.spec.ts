// Menus E2E Tests
// Verifies menu list, menu detail, and course structure.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Menus', () => {
  test('menus page loads', async ({ page }) => {
    await page.goto(ROUTES.menus)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/menus/)
  })

  test('TEST menu appears in list', async ({ page }) => {
    await page.goto(ROUTES.menus)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST - E2E Tasting Menu')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking menu navigates to detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.menus)
    const link = page.getByRole('link').filter({ hasText: 'TEST - E2E Tasting Menu' }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/menus/${seedIds.menuId}`))
  })

  test('menu detail shows name', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST - E2E Tasting Menu')).toBeVisible({ timeout: 10_000 })
  })

  test('menu detail shows course structure', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    // Should show at least one of the seeded courses
    await expect(page.getByText(/Amuse-Bouche|Main Course|Dessert/)).toBeVisible({ timeout: 10_000 })
  })

  test('no unhandled error on menu detail', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
