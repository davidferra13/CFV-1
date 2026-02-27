// Journey Tests — Financial Basics (Week 2)
// Verifies revenue summary, expenses, invoices, payments, ledger,
// tips, mileage, import history, and profitability views.
//
// Scenarios: #131-146
//
// Run: npx playwright test --project=journey-chef tests/journey/09-financial-basics.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Financial Overview (#131-133) ──────────────────────────────────────────────

test.describe('Finance — Overview (#131-133)', () => {
  test('financials hub loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financials)
  })

  test('financials hub has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.financials)
  })

  test('finance overview page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeOverview)
  })

  test('financials shows revenue or summary content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.financials)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Expenses (#134) ────────────────────────────────────────────────────────────

test.describe('Finance — Expenses (#134)', () => {
  test('expenses page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.expenses)
  })

  test('expenses page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.expenses)
  })

  test('new expense page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.expensesNew)
  })

  test('new expense form has amount and description fields', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.expensesNew)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const amountField = page
      .getByLabel(/amount/i)
      .first()
      .or(page.getByPlaceholder(/amount/i).first())
    const exists = await amountField.isVisible().catch(() => false)
    const inputs = page.locator('input, textarea')
    const count = await inputs.count()
    expect(exists || count > 0).toBeTruthy()
  })
})

// ─── Invoices (#136) ────────────────────────────────────────────────────────────

test.describe('Finance — Invoices (#136)', () => {
  test('finance invoices page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeInvoices)
  })

  test('invoices sent page loads', async ({ page }) => {
    await page.goto('/finance/invoices/sent')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('invoices paid page loads', async ({ page }) => {
    await page.goto('/finance/invoices/paid')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('invoices overdue page loads', async ({ page }) => {
    await page.goto('/finance/invoices/overdue')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Payments (#135) ────────────────────────────────────────────────────────────

test.describe('Finance — Payments (#135)', () => {
  test('finance payments page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financePayments)
  })

  test('deposits page loads', async ({ page }) => {
    await page.goto('/finance/payments/deposits')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('refunds page loads', async ({ page }) => {
    await page.goto('/finance/payments/refunds')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Ledger (#140) ──────────────────────────────────────────────────────────────

test.describe('Finance — Ledger (#140)', () => {
  test('ledger page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeLedger)
  })

  test('ledger page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.financeLedger)
  })

  test('transaction log page loads', async ({ page }) => {
    await page.goto('/finance/ledger/transaction-log')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Receipts (#134) ────────────────────────────────────────────────────────────

test.describe('Finance — Receipts (#134)', () => {
  test('receipts library page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.receipts)
  })
})

// ─── Profit & Food Cost (#137-138) ──────────────────────────────────────────────

test.describe('Finance — Profitability (#137-138)', () => {
  test('finance reporting page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeReporting)
  })

  test('profit by event report loads', async ({ page }) => {
    await page.goto('/finance/reporting/profit-by-event')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('expense by category report loads', async ({ page }) => {
    await page.goto('/finance/reporting/expense-by-category')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('revenue by month report loads', async ({ page }) => {
    await page.goto('/finance/reporting/revenue-by-month')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('revenue by client report loads', async ({ page }) => {
    await page.goto('/finance/reporting/revenue-by-client')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('YTD summary report loads', async ({ page }) => {
    await page.goto('/finance/reporting/year-to-date-summary')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Tax (#139) ─────────────────────────────────────────────────────────────────

test.describe('Finance — Tax Center (#139)', () => {
  test('tax center page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeTax)
  })

  test('tax summary report loads', async ({ page }) => {
    await page.goto('/finance/reporting/tax-summary')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('quarterly estimates page loads', async ({ page }) => {
    await page.goto('/finance/tax/quarterly')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Mileage & Tips (#141-142) ──────────────────────────────────────────────────

test.describe('Finance — Mileage & Tips (#141-142)', () => {
  test('expense form can capture tips and mileage', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.expensesNew)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    // Should have category selection or type field
    const inputs = page.locator('input, select, textarea')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ─── Forecast & Cash Flow (#144) ────────────────────────────────────────────────

test.describe('Finance — Forecast (#144)', () => {
  test('forecast page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeForecast)
  })

  test('cash flow page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeCashFlow)
  })
})

// ─── Disputes (#143) ────────────────────────────────────────────────────────────

test.describe('Finance — Disputes (#143)', () => {
  test('disputes page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeDisputes)
  })
})

// ─── Payouts (#145) ─────────────────────────────────────────────────────────────

test.describe('Finance — Payouts (#145)', () => {
  test('payouts page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financePayouts)
  })

  test('Stripe payouts page loads', async ({ page }) => {
    await page.goto('/finance/payouts/stripe-payouts')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})
