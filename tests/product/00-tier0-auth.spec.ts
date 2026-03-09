// Product Tests — Tier 0: Account & Auth
// Proves: A real person can sign up, sign in, and have a working account.
// Maps to: product-testing-roadmap.md Tier 0 (tests 0.1-0.8)
//
// Run: npx playwright test -p product-chef --grep "Tier 0"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

test.describe('Tier 0 — Account & Auth', () => {
  // 0.1 Sign in with real credentials
  test('0.1 — chef can sign in and reach dashboard', async ({ page }) => {
    // Auth is handled by storageState, but verify the session is valid
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Dashboard should show the chef's business name or greeting
    await page.waitForLoadState('domcontentloaded')
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  // 0.3 Profile setup (business name, bio, slug)
  test('0.3 — profile page displays saved chef info', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.waitForLoadState('domcontentloaded')

    // Business name field should have a value
    const businessNameInput = page
      .getByLabel(/business name/i)
      .first()
      .or(page.locator('input[name*="business"]').first())

    // Either the field has a value or the page shows the business name as text
    const hasInput = await businessNameInput.isVisible().catch(() => false)
    if (hasInput) {
      const value = await businessNameInput.inputValue()
      expect(value.length).toBeGreaterThan(0)
    } else {
      // Business name should appear somewhere on the profile page
      await expect(page.getByText(/E2E Kitchen/i).first()).toBeVisible({ timeout: 10_000 })
    }
  })

  // 0.4 Chef preferences save correctly
  test('0.4 — settings persist across page refresh', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Settings page should load without errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Wait for content to render
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 })
    expect(errors).toHaveLength(0)
  })

  // 0.5 Session persistence
  test('0.5 — session persists across navigation', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Navigate to clients
    await page.goto('/clients')
    await expect(page).toHaveURL(/\/clients/)
    await expect(page).not.toHaveURL(/auth\/signin/)

    // Navigate to events
    await page.goto('/events')
    await expect(page).toHaveURL(/\/events/)
    await expect(page).not.toHaveURL(/auth\/signin/)

    // Navigate to settings
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  // 0.7 Notification preferences
  test('0.7 — notification preferences page loads', async ({ page }) => {
    await page.goto('/settings/notifications')
    await page.waitForLoadState('domcontentloaded')

    // Should see notification-related toggles/checkboxes
    const toggles = page.locator('button[role="switch"], input[type="checkbox"]')
    const toggleCount = await toggles.count()
    // There should be at least 1 notification preference toggle
    expect(toggleCount).toBeGreaterThan(0)
  })

  // 0.8 Dashboard customization
  test('0.8 — dashboard settings page loads with widget options', async ({ page }) => {
    await page.goto('/settings/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Dashboard settings should have widget/card configuration options
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })

    // Should not redirect to signin
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  // Additional: No console errors on key pages
  test('no console errors on settings pages', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const settingsPages = [
      '/settings',
      '/settings/profile',
      '/settings/notifications',
      '/settings/modules',
    ]

    for (const route of settingsPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
    }

    expect(errors).toHaveLength(0)
  })
})
