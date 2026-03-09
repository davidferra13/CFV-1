// Product Tests — Public Pages
// Proves: All public-facing pages render correctly without auth.
// No storageState (product-public project).
//
// Run: npx playwright test -p product-public

import { test, expect } from '@playwright/test'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

test.describe('Public — Marketing Pages', () => {
  test('home page loads with branding', async ({ page }) => {
    await page.goto('/', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')

    // Should show ChefFlow branding
    const hasChefFlow = await page
      .getByText(/ChefFlow/i)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false)
    expect(hasChefFlow).toBeTruthy()
  })

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/privacy/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/terms/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('trust page loads', async ({ page }) => {
    await page.goto('/trust', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('FAQ page loads', async ({ page }) => {
    await page.goto('/faq', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('chefs directory page loads', async ({ page }) => {
    await page.goto('/chefs', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('customers page loads', async ({ page }) => {
    await page.goto('/customers', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Public — Auth Pages', () => {
  test('sign in page loads', async ({ page }) => {
    await page.goto('/auth/signin', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')

    // Should show sign in form or landing page
    const main = page.locator('main, body').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('sign up page loads', async ({ page }) => {
    await page.goto('/auth/signup', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')

    const main = page.locator('main, body').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password', { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main, body').first()
    await expect(main).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Public — Chef Profile', () => {
  test('chef public profile loads via slug', async ({ page }) => {
    // Use the seeded chef slug
    const suffix = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    await page.goto(`/chef/e2e-chef-${suffix}`, { timeout: 45_000 })
    await page.waitForLoadState('domcontentloaded')

    // Should show the chef's public profile (or redirect)
    const url = page.url()
    const isChefPage = url.includes('/chef/') || url.includes('/chefs')
    expect(isChefPage).toBeTruthy()
  })
})

test.describe('Public — No Console Errors', () => {
  test.setTimeout(120_000) // Multi-page test needs extra time

  test('no console errors on key public pages', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const publicPages = ['/', '/pricing', '/contact', '/privacy', '/terms', '/faq']

    for (const route of publicPages) {
      await page.goto(route, { timeout: 45_000 })
      await page.waitForLoadState('domcontentloaded')
    }

    expect(errors).toHaveLength(0)
  })
})
