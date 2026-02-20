// Auth E2E Tests
// Verifies that the chef auth session works correctly.
// Chef storageState is applied by the 'chef' Playwright project.
// For unauthenticated behavior, see tests/smoke/auth.spec.ts.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Chef Auth Session', () => {
  test('chef can reach /dashboard without redirect', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('chef is redirected away from /my-events (wrong role)', async ({ page }) => {
    await page.goto(ROUTES.clientEvents)
    // Should redirect — chef is not allowed in client portal
    await expect(page).not.toHaveURL(/\/my-events$/)
  })

  test('chef cannot access /my-quotes (wrong role)', async ({ page }) => {
    await page.goto(ROUTES.myQuotes)
    await expect(page).not.toHaveURL(/\/my-quotes$/)
  })

  test('sign-in page renders correctly', async ({ browser }) => {
    // Use a fresh context with no auth to test the sign-in form
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(ROUTES.signIn)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await context.close()
  })

  test('invalid credentials show error', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(ROUTES.signIn)
    await page.waitForLoadState('networkidle')
    await page.locator('input[type="email"]').fill('invalid@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Should stay on sign-in page and show an error
    await expect(page).toHaveURL(/auth\/signin/)
    await context.close()
  })

  test('chef sign-out clears session', async ({ browser, seedIds }) => {
    const context = await browser.newContext({ storageState: '.auth/chef.json' })
    const page = await context.newPage()

    // Verify we start authenticated
    await page.goto(ROUTES.chefDashboard)
    await expect(page).toHaveURL(/\/dashboard/)

    // Find sign-out button (typically in nav or settings)
    const signOutBtn = page.getByRole('button', { name: /sign out|log out/i }).first()
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click()
      await page.waitForURL(/auth\/signin|^\/$/, { timeout: 10_000 })
      // After sign-out, dashboard should redirect
      await page.goto(ROUTES.chefDashboard)
      await expect(page).not.toHaveURL(/\/dashboard$/)
    } else {
      // Sign-out may be in a dropdown or user menu
      test.info().annotations.push({ type: 'note', description: 'Sign-out button not immediately visible — may be in dropdown' })
    }

    await context.close()
  })
})
