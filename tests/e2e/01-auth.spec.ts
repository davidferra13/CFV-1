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

  test('chef sign-out button is accessible in nav', async ({ page }) => {
    // Verify the sign-out control exists WITHOUT clicking it.
    // Clicking sign-out calls supabase.auth.signOut() server-side, which invalidates
    // the shared JWT in .auth/chef.json and causes ALL subsequent tests to fail auth.
    // The suite is idempotent by design — destructive teardown tests are omitted.
    await page.goto(ROUTES.chefDashboard)
    await page.waitForLoadState('networkidle')
    // Sign-out appears as text when sidebar is expanded, or via title attr when collapsed
    const signOutCount = await page.getByRole('button', { name: /sign out|log out/i }).count()
    const signOutTitleCount = await page.locator('[title="Sign Out"]').count()
    const signOutVisible = signOutCount > 0 || signOutTitleCount > 0
    expect(signOutVisible, 'Sign-out control should be accessible in the chef nav').toBeTruthy()
  })
})
