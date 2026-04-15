/**
 * Q1: Zero-Data Bootstrap
 *
 * Every major chef page must load without a 500 error or application crash,
 * even when the chef's account has no data (new account state).
 *
 * Failure = page shows "Application error", "Internal Server Error", or returns
 * HTTP 500. Success = page renders (even an empty state is fine).
 */
import { test, expect } from '@playwright/test'

// All primary chef routes — one per nav group plus key sub-pages.
// Skipped: routes that require a specific ID (handled by Q2 mutation loop).
const CHEF_ROUTES = [
  '/dashboard',
  '/inbox',
  '/events',
  '/calendar',
  '/inquiries',
  '/quotes',
  '/clients',
  '/culinary',
  '/culinary/recipes',
  '/culinary/price-catalog',
  '/culinary/costing',
  '/culinary/prep',
  '/culinary/prep/shopping',
  '/menus',
  '/finance',
  '/finance/invoices',
  '/expenses',
  '/finance/reporting/profit-loss',
  '/finance/retainers',
  '/finance/tax/year-end',
  '/briefing',
  '/staff',
  '/staff/schedule',
  '/staff/availability',
  '/tasks',
  '/marketing',
  '/analytics',
  '/network',
  '/vendors',
  '/travel',
  '/settings',
  '/settings/modules',
  '/clients/preferences',
  '/clients/segments',
]

for (const route of CHEF_ROUTES) {
  test(`should load without crash: ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // HTTP level: must not be a server error
    // (Auth redirects to /sign-in return 200/302, not 500)
    if (response) {
      expect(response.status(), `${route} returned HTTP ${response.status()}`).not.toBe(500)
    }

    // DOM level: must not contain Next.js error overlay text
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText, `${route} shows application error`).not.toMatch(
      /Application error|Internal Server Error|unhandled.*error/i
    )

    // Must not be an empty blank page (at minimum a title or nav must exist)
    const title = await page.title()
    expect(title.trim(), `${route} has no page title`).not.toBe('')
  })
}
