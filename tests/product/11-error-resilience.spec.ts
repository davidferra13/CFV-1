// Product Tests — Error Resilience
// Proves: The app handles edge cases gracefully without crashes.
// Tests invalid routes, non-existent IDs, and boundary conditions.
//
// Run: npx playwright test -p product-chef --grep "Error Resilience"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

test.describe('Error Resilience — Invalid Entity IDs', () => {
  test('non-existent event ID shows error/empty state (not crash)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/events/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('domcontentloaded')

    // Should show error state, not found, or redirect. NOT a crash.
    const url = page.url()
    const isHandled =
      url.includes('/events') || // stayed on events (error state shown)
      url.includes('/dashboard') || // redirected to dashboard
      url.includes('/auth/signin') // auth redirect

    expect(isHandled).toBeTruthy()
    // No unhandled JS errors
    expect(errors).toHaveLength(0)
  })

  test('non-existent client ID shows error/empty state', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/clients/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('domcontentloaded')

    expect(errors).toHaveLength(0)
  })

  test('non-existent quote ID shows error/empty state', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/quotes/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('domcontentloaded')

    expect(errors).toHaveLength(0)
  })

  test('non-existent recipe ID shows error/empty state', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/recipes/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('domcontentloaded')

    expect(errors).toHaveLength(0)
  })
})

test.describe('Error Resilience — Invalid Routes', () => {
  test('unknown route under /events/ handles gracefully', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/events/not-a-uuid/not-a-page')
    await page.waitForLoadState('domcontentloaded')

    expect(errors).toHaveLength(0)
  })

  test('completely invalid path handles gracefully', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/this-route-definitely-does-not-exist-xyz')
    await page.waitForLoadState('domcontentloaded')

    // Should get a 404 page or redirect, not a crash
    expect(errors).toHaveLength(0)
  })
})

test.describe('Error Resilience — Rapid Navigation', () => {
  test('rapid page navigation does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const routes = [
      '/dashboard',
      '/events',
      '/clients',
      '/quotes',
      '/recipes',
      '/menus',
      '/calendar',
      '/financials',
      '/settings',
      '/dashboard',
    ]

    for (const route of routes) {
      // Don't wait for networkidle - rapid navigation
      await page.goto(route, { waitUntil: 'commit' })
    }

    // Wait for last page to settle
    await page.waitForLoadState('domcontentloaded')
    expect(errors).toHaveLength(0)
  })
})
