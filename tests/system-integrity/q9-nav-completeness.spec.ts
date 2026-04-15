/**
 * Q9: Navigation Completeness
 *
 * Every link rendered in the chef sidebar must resolve to a real page (not 404/500).
 * Failure = a nav link that takes the user to a dead end.
 */
import { test, expect } from '@playwright/test'

// Canonical nav links — every href that can appear in the chef sidebar.
// Admin links intentionally excluded (tested separately in isolation-tests).
// Links requiring a specific entity ID excluded (those are Q2 domain).
const NAV_LINKS = [
  // Core
  '/dashboard',
  '/inbox',
  // Pipeline
  '/events',
  '/calendar',
  '/inquiries',
  '/quotes',
  '/proposals',
  // Clients
  '/clients',
  '/clients/communication/follow-ups',
  '/clients/insights/top-clients',
  '/clients/loyalty',
  // Culinary
  '/culinary',
  '/culinary/recipes',
  '/menus',
  '/culinary/price-catalog',
  '/culinary/costing',
  '/culinary/prep',
  '/culinary/prep/shopping',
  // Finance
  '/finance',
  '/finance/invoices',
  '/expenses',
  '/finance/reporting/profit-loss',
  // Operations
  '/briefing',
  '/stations/daily-ops',
  '/staff',
  '/tasks',
  // More Tools
  '/marketing',
  '/social',
  '/network',
  '/analytics',
  // Settings (always-visible, non-module-gated)
  '/settings',
  '/settings/modules',
]

test.describe('Navigation completeness', () => {
  for (const href of NAV_LINKS) {
    test(`nav link resolves: ${href}`, async ({ page }) => {
      const response = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      // A nav link must never land on 404 or 500
      if (response) {
        expect(response.status(), `${href} returned ${response.status()}`).not.toBe(500)

        expect(response.status(), `${href} returned 404 — dead nav link`).not.toBe(404)
      }

      // Must not be a blank page — title required
      const title = await page.title()
      expect(title.trim(), `${href} renders blank page`).not.toBe('')
    })
  }
})
