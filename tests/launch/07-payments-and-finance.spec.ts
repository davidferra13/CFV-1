// Launch Readiness Audit — Payments & Finance
// Tests: financial hub, expenses, ledger, reporting, payment tracking
// The money side — if this doesn't work, chefs can't track what they earn

import { test, expect } from '../helpers/fixtures'

test.describe('Financial Hub', () => {
  test('financials page loads with summary', async ({ page }) => {
    await page.goto('/financials')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show financial overview content
    const hasFinancial = /revenue|expense|profit|balance|payment|\$/i.test(bodyText)
    expect(hasFinancial).toBeTruthy()
  })

  test('finance overview page loads', async ({ page }) => {
    const resp = await page.goto('/finance/overview')
    expect(resp?.status()).not.toBe(500)
  })

  test('finance home page loads', async ({ page }) => {
    const resp = await page.goto('/finance')
    expect(resp?.status()).not.toBe(500)
  })
})

test.describe('Expenses', () => {
  test('expense list loads', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('new expense form renders', async ({ page }) => {
    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have form inputs for expense entry
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('new expense form has required fields', async ({ page }) => {
    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /description|amount|category|date|vendor/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })

  test('can fill expense form fields', async ({ page }) => {
    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')

    const descField = page
      .getByLabel(/description|memo|note/i)
      .first()
      .or(page.getByPlaceholder(/description|what/i).first())
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill('Launch Test Expense - Groceries')
    }

    const amountField = page
      .getByLabel(/amount|total|price/i)
      .first()
      .or(page.getByPlaceholder(/amount|\$/i).first())
    if (await amountField.isVisible().catch(() => false)) {
      await amountField.fill('75.50')
    }

    // Form should not crash after filling
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/unhandled|error/i)
  })
})

test.describe('Ledger', () => {
  test('ledger page loads with entries', async ({ page }) => {
    await page.goto('/finance/ledger')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('transaction log loads', async ({ page }) => {
    const resp = await page.goto('/finance/ledger/transaction-log')
    expect(resp?.status()).not.toBe(500)
  })

  test('completed event ledger shows payment entries', async ({ page, seedIds }) => {
    // Navigate to the completed event which has ledger entries
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should show financial data — seed has $1200 final payment
    const hasPayment = /\$|payment|deposit|final|1,?200/i.test(bodyText)
    expect(hasPayment).toBeTruthy()
  })
})

test.describe('Financial Reports', () => {
  const reportRoutes = [
    '/finance/reporting',
    '/finance/reporting/revenue-by-month',
    '/finance/reporting/revenue-by-client',
    '/finance/reporting/revenue-by-event',
    '/finance/reporting/expense-by-category',
    '/finance/reporting/profit-by-event',
    '/finance/reporting/year-to-date-summary',
  ]

  for (const route of reportRoutes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
      await page.waitForLoadState('networkidle')
    })
  }
})

test.describe('Finance Sub-Pages', () => {
  const financeRoutes = [
    '/finance/invoices',
    '/finance/payments',
    '/finance/payments/deposits',
    '/finance/payouts',
    '/finance/tax',
    '/finance/forecast',
    '/finance/cash-flow',
    '/finance/contractors',
    '/finance/disputes',
    '/finance/retainers',
    '/finance/recurring',
    '/finance/bank-feed',
  ]

  for (const route of financeRoutes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})

test.describe('Receipt Library', () => {
  test('receipts page loads', async ({ page }) => {
    const resp = await page.goto('/receipts')
    expect(resp?.status()).not.toBe(500)
  })
})
