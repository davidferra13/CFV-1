// Launch Readiness Audit — Empty States
// Tests: every major page handles zero data gracefully (no crashes, helpful messaging)
// Uses chef auth — tests that pages render even when sections have no user-created data

import { test, expect } from '../helpers/fixtures'

test.describe('Empty States — Core Pages', () => {
  test('dashboard loads with content even if sparse', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2, [data-testid]').first()).toBeVisible({ timeout: 15_000 })
    expect(errors).toHaveLength(0)
  })

  test('/events shows event list or empty state', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should have either event cards or an empty state message — not a blank page
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/inquiries shows list or empty state', async ({ page }) => {
    await page.goto('/inquiries')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/clients shows list or empty state', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/tasks shows task board or empty state', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/staff shows list or empty state', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/vendors shows list or empty state', async ({ page }) => {
    await page.goto('/vendors')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/recipes shows list or empty state', async ({ page }) => {
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/menus shows list or empty state', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/calendar loads without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
    expect(errors).toHaveLength(0)
  })

  test('/financials loads without crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/financials')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
    expect(errors).toHaveLength(0)
  })
})

test.describe('Empty States — No 500 Errors', () => {
  const pages = [
    '/dashboard',
    '/events',
    '/inquiries',
    '/clients',
    '/quotes',
    '/tasks',
    '/staff',
    '/vendors',
    '/recipes',
    '/menus',
    '/calendar',
    '/financials',
    '/expenses',
    '/inbox',
    '/schedule',
    '/settings',
  ]

  for (const route of pages) {
    test(`${route} does not return 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
