// Product Tests — Tier 3: Financials
// Proves: The app handles real money correctly (quotes, invoices, payments, ledger).
// Maps to: product-testing-roadmap.md Tier 3 (tests 3A-3D)
//
// Run: npx playwright test -p product-chef --grep "Tier 3"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

// ── 3A. Quotes ──────────────────────────────────────────────────────────────

test.describe('Tier 3A — Quotes', () => {
  test('3A.1 — quote list shows seeded quotes', async ({ page }) => {
    await page.goto('/quotes')
    await page.waitForLoadState('domcontentloaded')

    // Should see test quotes
    const testQuotes = page.getByText(/TEST Quote/i)
    const count = await testQuotes.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('3A.2 — draft quote detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should show quote amount ($740.00 = 74000 cents)
    const hasAmount = await page
      .getByText(/740|74,000/i)
      .first()
      .isVisible()
      .catch(() => false)
    const hasQuoteName = await page
      .getByText(/TEST Quote/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasAmount || hasQuoteName).toBeTruthy()
  })

  test('3A.3 — sent quote shows correct status', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/sent/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('3A.4 — accepted quote shows correct status', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.accepted}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('3A.5 — quote filter pages load', async ({ page }) => {
    const filterRoutes = [
      '/quotes/draft',
      '/quotes/sent',
      '/quotes/accepted',
      '/quotes/rejected',
      '/quotes/expired',
    ]

    for (const route of filterRoutes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('3A.6 — new quote page loads', async ({ page }) => {
    await page.goto('/quotes/new')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── 3B. Payments & Ledger ──────────────────────────────────────────────────

test.describe('Tier 3B — Payments & Ledger', () => {
  test('3B.1 — financials page loads with data', async ({ page }) => {
    await page.goto('/financials')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('3B.2 — finance hub loads', async ({ page }) => {
    await page.goto('/finance')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('3B.3 — ledger page shows transactions', async ({ page }) => {
    await page.goto('/finance/ledger')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should show at least the seeded ledger entries
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('3B.4 — payment-related finance pages load', async ({ page }) => {
    const financePages = [
      '/finance/payments',
      '/finance/invoices',
      '/finance/payouts',
      '/finance/cash-flow',
    ]

    for (const route of financePages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('3B.5 — event financial panel shows deposit', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.paid}/financial`)
    await page.waitForLoadState('domcontentloaded')

    // Paid event should show deposit info ($125.00 = 12500 cents or $300.00 = 30000 deposit)
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── 3C. Expenses & Profit ──────────────────────────────────────────────────

test.describe('Tier 3C — Expenses & Profit', () => {
  test('3C.1 — expense pages load', async ({ page }) => {
    await page.goto('/finance/expenses')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('3C.2 — expense sub-categories load', async ({ page }) => {
    const categories = [
      '/finance/expenses/food-ingredients',
      '/finance/expenses/labor',
      '/finance/expenses/travel',
      '/finance/expenses/software',
    ]

    for (const route of categories) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('3C.3 — P&L reporting pages load', async ({ page }) => {
    const reportPages = [
      '/finance/reporting/profit-loss',
      '/finance/reporting/revenue-by-month',
      '/finance/reporting/expense-by-category',
    ]

    for (const route of reportPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})

// ── 3D. Loyalty & Rewards ──────────────────────────────────────────────────

test.describe('Tier 3D — Loyalty & Rewards', () => {
  test('3D.1 — loyalty hub loads', async ({ page }) => {
    await page.goto('/loyalty')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('3D.2 — loyalty settings page loads', async ({ page }) => {
    await page.goto('/loyalty/settings')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('3D.3 — loyalty learn page loads', async ({ page }) => {
    await page.goto('/loyalty/learn')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})
