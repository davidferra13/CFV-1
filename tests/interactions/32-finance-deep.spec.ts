// Interaction Layer — Finance Deep Tests
// Covers the full finance sub-tree: overview, invoices, payments, payouts,
// ledger, expenses, reporting, recurring, forecasting, and tax.
//
// Routes covered (50+ finance pages):
//   /finance/overview/**   — revenue summary, cash flow, outstanding payments
//   /finance/invoices/**   — all invoice status views
//   /finance/payments/**   — deposits, refunds, failed, installments
//   /finance/payouts/**    — Stripe payouts, manual, reconciliation
//   /finance/ledger/**     — ledger, adjustments, transaction log
//   /finance/expenses/**   — by category
//   /finance/reporting/**  — P&L, revenue reports, tax summary
//   /finance/forecast      — cash flow forecast
//   /finance/recurring     — recurring revenue
//   /finance/bank-feed     — bank feed
//   /finance/cash-flow     — cash flow overview
//   /finance/contractors   — contractor payments
//   /finance/disputes      — disputed payments
//   /finance/goals         — financial goals
//   /finance/year-end      — year-end summary
//   /finance/tax/**        — tax and quarterly
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Finance Overview ─────────────────────────────────────────────────────────

test.describe('Finance — Overview', () => {
  test('/finance/overview — loads without 500', async ({ page }) => {
    const resp = await page.goto('/finance/overview')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/overview — shows revenue or summary content', async ({ page }) => {
    await page.goto('/finance/overview')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/finance/overview — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/overview')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/finance/overview/revenue-summary — loads', async ({ page }) => {
    const resp = await page.goto('/finance/overview/revenue-summary')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/overview/cash-flow — loads', async ({ page }) => {
    const resp = await page.goto('/finance/overview/cash-flow')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/overview/outstanding-payments — loads', async ({ page }) => {
    const resp = await page.goto('/finance/overview/outstanding-payments')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })
})

// ─── Invoices ─────────────────────────────────────────────────────────────────

test.describe('Finance — Invoices', () => {
  const invoiceRoutes = [
    '/finance/invoices',
    '/finance/invoices/draft',
    '/finance/invoices/sent',
    '/finance/invoices/paid',
    '/finance/invoices/overdue',
    '/finance/invoices/cancelled',
    '/finance/invoices/refunded',
  ]

  for (const route of invoiceRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/finance/invoices — shows invoices or empty state', async ({ page }) => {
    await page.goto('/finance/invoices')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/finance/invoices — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/invoices')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Payments ─────────────────────────────────────────────────────────────────

test.describe('Finance — Payments', () => {
  const paymentRoutes = [
    '/finance/payments',
    '/finance/payments/deposits',
    '/finance/payments/refunds',
    '/finance/payments/failed',
    '/finance/payments/installments',
  ]

  for (const route of paymentRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/finance/payments — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Payouts ──────────────────────────────────────────────────────────────────

test.describe('Finance — Payouts', () => {
  const payoutRoutes = [
    '/finance/payouts',
    '/finance/payouts/stripe-payouts',
    '/finance/payouts/manual-payments',
    '/finance/payouts/reconciliation',
  ]

  for (const route of payoutRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/finance/payouts — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/payouts')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Ledger ───────────────────────────────────────────────────────────────────

test.describe('Finance — Ledger', () => {
  test('/finance/ledger — loads without 500', async ({ page }) => {
    const resp = await page.goto('/finance/ledger')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/ledger — shows ledger entries or empty state', async ({ page }) => {
    await page.goto('/finance/ledger')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/finance/ledger — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/ledger')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/finance/ledger/adjustments — loads', async ({ page }) => {
    const resp = await page.goto('/finance/ledger/adjustments')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/ledger/transaction-log — loads', async ({ page }) => {
    const resp = await page.goto('/finance/ledger/transaction-log')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('Ledger data is tenant-scoped (no Chef B data)', async ({ page, seedIds }) => {
    await page.goto('/finance/ledger')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Expenses ─────────────────────────────────────────────────────────────────

test.describe('Finance — Expenses', () => {
  const expenseRoutes = [
    '/finance/expenses',
    '/finance/expenses/food-ingredients',
    '/finance/expenses/labor',
    '/finance/expenses/marketing',
    '/finance/expenses/miscellaneous',
    '/finance/expenses/rentals-equipment',
    '/finance/expenses/software',
    '/finance/expenses/travel',
  ]

  for (const route of expenseRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/finance/expenses — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/expenses')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Reporting ────────────────────────────────────────────────────────────────

test.describe('Finance — Reporting', () => {
  const reportingRoutes = [
    '/finance/reporting',
    '/finance/reporting/profit-loss',
    '/finance/reporting/revenue-by-month',
    '/finance/reporting/revenue-by-client',
    '/finance/reporting/revenue-by-event',
    '/finance/reporting/profit-by-event',
    '/finance/reporting/expense-by-category',
    '/finance/reporting/tax-summary',
    '/finance/reporting/year-to-date-summary',
  ]

  for (const route of reportingRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/finance/reporting — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/reporting')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/finance/reporting/profit-loss — shows P&L data or empty state', async ({ page }) => {
    await page.goto('/finance/reporting/profit-loss')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Financial Utilities ──────────────────────────────────────────────────────

test.describe('Finance — Utilities', () => {
  const utilityRoutes = [
    '/finance/bank-feed',
    '/finance/cash-flow',
    '/finance/contractors',
    '/finance/disputes',
    '/finance/forecast',
    '/finance/goals',
    '/finance/recurring',
    '/finance/year-end',
  ]

  for (const route of utilityRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/finance/forecast — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/forecast')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Tax ──────────────────────────────────────────────────────────────────────

test.describe('Finance — Tax', () => {
  test('/finance/tax — loads without 500', async ({ page }) => {
    const resp = await page.goto('/finance/tax')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/tax/quarterly — loads', async ({ page }) => {
    const resp = await page.goto('/finance/tax/quarterly')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/tax/year-end — loads', async ({ page }) => {
    const resp = await page.goto('/finance/tax/year-end')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/finance/tax — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance/tax')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
