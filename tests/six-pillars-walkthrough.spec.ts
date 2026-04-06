import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Six Pillars Happy-Path Walkthrough
 *
 * V1 Exit Criterion: "All 6 pillars pass a Playwright walkthrough (happy path)"
 *
 * Tests that every pillar's key pages load, render real content, and don't crash.
 * Uses the agent test account for authentication.
 */

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100'
const CREDS = { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }
const SSDIR = 'test-results/six-pillars'
const AUTH_STATE = 'test-results/six-pillars/.auth-state.json'

// Auth cookie header cached across tests (auth once, reuse)
let cachedSessionCookie = ''

test.beforeAll(async () => {
  fs.mkdirSync(SSDIR, { recursive: true })

  // Authenticate once via e2e endpoint
  const resp = await fetch(BASE + '/api/e2e/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDS),
  })
  if (!resp.ok) throw new Error('E2E auth failed: ' + resp.status)

  const setCookieHeader = resp.headers.get('set-cookie') || ''
  const cookieMatch = setCookieHeader.match(/((?:__Secure-)?authjs\.session-token)=([^;]+)/)
  if (!cookieMatch) throw new Error('No session cookie in e2e auth response')
  cachedSessionCookie = cookieMatch[1] + '=' + cookieMatch[2]
})

test.describe('Six Pillars Happy-Path Walkthrough', () => {
  test.use({ baseURL: BASE })

  test.beforeEach(async ({ context }) => {
    // Add cookies directly (works because dev server uses non-Secure cookies
    // when started with NEXTAUTH_URL=http://...)
    const [cookieName, cookieValue] = cachedSessionCookie.split('=', 2)
    await context.addCookies([
      {
        name: 'cookieConsent',
        value: 'declined',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: cookieName,
        value: cookieValue,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
  })

  // ---------------------------------------------------------------------------
  // Helper: navigate, wait, screenshot, assert not crashed/blank
  // ---------------------------------------------------------------------------
  async function verifyPage(page: import('@playwright/test').Page, route: string, label: string) {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(1500)
    await page.waitForTimeout(500)

    const ssName = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    await page.screenshot({ path: path.join(SSDIR, `${ssName}.png`), fullPage: true })

    // Not redirected to sign-in
    expect(page.url(), `${label}: should not redirect to sign-in`).not.toContain('/auth/signin')

    // No crash error boundary
    const crashed = await page
      .getByText('Something went wrong')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    expect(crashed, `${label}: should not show error boundary`).toBe(false)

    // Has visible content (not blank page)
    const bodyText = await page.textContent('body', { timeout: 10000 }).catch(() => '')
    const hasContent = (bodyText?.length ?? 0) > 50
    expect(
      hasContent,
      `${label}: should have visible content (got ${bodyText?.length ?? 0} chars)`
    ).toBe(true)

    return page
  }

  // =========================================================================
  // PILLAR 1: SELL (Inquiry to Booking)
  // =========================================================================

  test('SELL-01: Inquiries hub loads', async ({ page }) => {
    await verifyPage(page, '/inquiries', 'sell-01-inquiries')
  })

  test('SELL-02: New inquiry form loads', async ({ page }) => {
    await verifyPage(page, '/inquiries/new', 'sell-02-inquiry-new')
    // Should have form inputs
    const hasInput = await page
      .locator('input, textarea, select')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasInput, 'Inquiry form should have inputs').toBe(true)
  })

  test('SELL-03: Quotes hub loads', async ({ page }) => {
    await verifyPage(page, '/quotes', 'sell-03-quotes')
  })

  test('SELL-04: Events hub loads', async ({ page }) => {
    await verifyPage(page, '/events', 'sell-04-events')
  })

  // =========================================================================
  // PILLAR 2: PLAN (Menus, Calendar, Daily Ops)
  // =========================================================================

  test('PLAN-01: Calendar loads', async ({ page }) => {
    await verifyPage(page, '/calendar', 'plan-01-calendar')
  })

  test('PLAN-02: Daily ops loads', async ({ page }) => {
    await verifyPage(page, '/daily', 'plan-02-daily-ops')
  })

  test('PLAN-03: Menus hub loads', async ({ page }) => {
    await verifyPage(page, '/menus', 'plan-03-menus')
  })

  test('PLAN-04: New menu form loads', async ({ page }) => {
    await verifyPage(page, '/menus/new', 'plan-04-menu-new')
    const hasInput = await page
      .locator('input, textarea')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasInput, 'Menu form should have inputs').toBe(true)
  })

  // =========================================================================
  // PILLAR 3: COOK (Recipes, Ingredients, Prep)
  // =========================================================================

  test('COOK-01: Recipes hub loads', async ({ page }) => {
    await verifyPage(page, '/recipes', 'cook-01-recipes')
  })

  test('COOK-02: New recipe form loads', async ({ page }) => {
    await verifyPage(page, '/recipes/new', 'cook-02-recipe-new')
    const hasInput = await page
      .locator('input, textarea')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasInput, 'Recipe form should have inputs').toBe(true)
  })

  test('COOK-03: Ingredients master list loads', async ({ page }) => {
    await verifyPage(page, '/recipes/ingredients', 'cook-03-ingredients')
  })

  test('COOK-04: Costing page loads', async ({ page }) => {
    await verifyPage(page, '/culinary/costing', 'cook-04-costing')
  })

  test('COOK-05: Dish index loads', async ({ page }) => {
    await verifyPage(page, '/culinary/dish-index', 'cook-05-dish-index')
  })

  // =========================================================================
  // PILLAR 4: STOCK (Inventory, Pricing, Vendors)
  // =========================================================================

  test('STOCK-01: Price catalog loads', async ({ page }) => {
    await verifyPage(page, '/culinary/price-catalog', 'stock-01-price-catalog')
  })

  test('STOCK-02: Inventory hub loads', async ({ page }) => {
    await verifyPage(page, '/inventory', 'stock-02-inventory')
  })

  test('STOCK-03: Vendors hub loads', async ({ page }) => {
    await verifyPage(page, '/vendors', 'stock-03-vendors')
  })

  // =========================================================================
  // PILLAR 5: MONEY (Invoicing, Ledger, Tax, Reporting)
  // =========================================================================

  test('MONEY-01: Finance overview loads', async ({ page }) => {
    await verifyPage(page, '/finance', 'money-01-finance')
  })

  test('MONEY-02: Invoices hub loads', async ({ page }) => {
    await verifyPage(page, '/finance/invoices', 'money-02-invoices')
  })

  test('MONEY-03: Expenses hub loads', async ({ page }) => {
    await verifyPage(page, '/expenses', 'money-03-expenses')
  })

  test('MONEY-04: Ledger loads', async ({ page }) => {
    await verifyPage(page, '/finance/ledger', 'money-04-ledger')
  })

  test('MONEY-05: Tax center loads', async ({ page }) => {
    await verifyPage(page, '/finance/tax', 'money-05-tax')
  })

  test('MONEY-06: Reporting hub loads', async ({ page }) => {
    await verifyPage(page, '/finance/reporting', 'money-06-reporting')
  })

  // =========================================================================
  // PILLAR 6: GROW (Clients, Analytics, Public Presence)
  // =========================================================================

  test('GROW-01: Clients hub loads', async ({ page }) => {
    await verifyPage(page, '/clients', 'grow-01-clients')
  })

  test('GROW-02: Analytics hub loads', async ({ page }) => {
    await verifyPage(page, '/analytics', 'grow-02-analytics')
  })

  test('GROW-03: Reviews page loads', async ({ page }) => {
    await verifyPage(page, '/reviews', 'grow-03-reviews')
  })

  test('GROW-04: Network hub loads', async ({ page }) => {
    await verifyPage(page, '/network', 'grow-04-network')
  })

  test('GROW-05: Settings/public profile loads', async ({ page }) => {
    await verifyPage(page, '/settings/public-profile', 'grow-05-public-profile')
  })

  // =========================================================================
  // CROSS-PILLAR: Dashboard (ties everything together)
  // =========================================================================

  test('DASH-01: Dashboard loads with widgets', async ({ page }) => {
    await verifyPage(page, '/dashboard', 'dash-01-dashboard')
    // Dashboard should have multiple sections/widgets
    const sections = await page.locator('main section, main > div > div').count()
    expect(sections, 'Dashboard should have multiple sections').toBeGreaterThan(1)
  })
})
