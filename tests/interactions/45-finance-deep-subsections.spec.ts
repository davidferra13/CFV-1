// Interaction Layer — Finance Deep Subsections
// Covers every finance sub-route with zero prior coverage:
//   payments/deposits, payments/failed, payments/installments, payments/refunds,
//   payouts/manual-payments, payouts/reconciliation, payouts/stripe-payouts,
//   reporting (top), reporting/expense-by-category, reporting/revenue-by-month,
//   reporting/year-to-date-summary,
//   bank-feed, cash-flow, contractors, disputes, recurring, year-end, goals
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Finance Payments Sub-pages ────────────────────────────────────────────

test.describe('Finance Payments Sub-pages', () => {
  const paymentRoutes = [
    '/finance/payments/deposits',
    '/finance/payments/failed',
    '/finance/payments/installments',
    '/finance/payments/refunds',
  ]

  for (const route of paymentRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/finance/payments/deposits — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/finance/payments/deposits')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Finance Payouts Sub-pages ─────────────────────────────────────────────

test.describe('Finance Payouts Sub-pages', () => {
  const payoutRoutes = [
    '/finance/payouts/manual-payments',
    '/finance/payouts/reconciliation',
    '/finance/payouts/stripe-payouts',
  ]

  for (const route of payoutRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Finance Reporting Sub-pages ───────────────────────────────────────────

test.describe('Finance Reporting Sub-pages', () => {
  const reportingRoutes = [
    '/finance/reporting',
    '/finance/reporting/expense-by-category',
    '/finance/reporting/revenue-by-month',
    '/finance/reporting/year-to-date-summary',
  ]

  for (const route of reportingRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/finance/reporting — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/finance/reporting')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Finance Utility Pages ─────────────────────────────────────────────────

test.describe('Finance Utility Pages', () => {
  const utilityRoutes = [
    '/finance/bank-feed',
    '/finance/cash-flow',
    '/finance/contractors',
    '/finance/disputes',
    '/finance/recurring',
    '/finance/year-end',
    '/finance/goals',
  ]

  for (const route of utilityRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/finance/cash-flow — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/finance/cash-flow')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })

  test('/finance/contractors — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/finance/contractors')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── All new finance sub-routes load together ─────────────────────────────────────

test('All new finance sub-routes load without 500', async ({ page }) => {
  const routes = [
    '/finance/payments/deposits',
    '/finance/payments/failed',
    '/finance/payments/installments',
    '/finance/payments/refunds',
    '/finance/payouts/manual-payments',
    '/finance/payouts/reconciliation',
    '/finance/payouts/stripe-payouts',
    '/finance/reporting',
    '/finance/reporting/expense-by-category',
    '/finance/reporting/revenue-by-month',
    '/finance/reporting/year-to-date-summary',
    '/finance/bank-feed',
    '/finance/cash-flow',
    '/finance/contractors',
    '/finance/disputes',
    '/finance/recurring',
    '/finance/year-end',
    '/finance/goals',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
