// Journey Tests - Finance Deep Routes
// Adds nested finance coverage for overview slices, invoice statuses,
// payment statuses, payout workflows, and tax/planning pages.
//
// Scenarios: #379-394
//
// Run: npx playwright test --project=journey-chef tests/journey/24-finance-deep-routes.spec.ts

import { test } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Finance Deep Routes - Overview Slices (#379-382)', () => {
  test('finance hub route loads (#379)', async ({ page }) => {
    await assertPageLoads(page, '/finance')
  })

  test('cash-flow overview route loads (#380)', async ({ page }) => {
    await assertPageLoads(page, '/finance/overview/cash-flow')
  })

  test('outstanding payments overview route loads (#381)', async ({ page }) => {
    await assertPageLoads(page, '/finance/overview/outstanding-payments')
  })

  test('revenue summary overview route has no page errors (#382)', async ({ page }) => {
    await assertNoPageErrors(page, '/finance/overview/revenue-summary')
  })
})

test.describe('Finance Deep Routes - Invoice States (#383-386)', () => {
  test('base invoices route loads (#383)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeInvoices)
  })

  test('draft invoices route loads (#384)', async ({ page }) => {
    await assertPageLoads(page, '/finance/invoices/draft')
  })

  test('cancelled invoices route loads (#385)', async ({ page }) => {
    await assertPageLoads(page, '/finance/invoices/cancelled')
  })

  test('refunded invoices route has content (#386)', async ({ page }) => {
    await page.goto('/finance/invoices/refunded')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Finance Deep Routes - Payments and Payouts (#387-390)', () => {
  test('failed payments route loads (#387)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payments/failed')
  })

  test('installments payments route loads (#388)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payments/installments')
  })

  test('manual payouts route loads (#389)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payouts/manual-payments')
  })

  test('payout reconciliation route has content (#390)', async ({ page }) => {
    await page.goto('/finance/payouts/reconciliation')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Finance Deep Routes - Planning and Tax (#391-394)', () => {
  test('sales-tax settings route loads (#391)', async ({ page }) => {
    await assertPageLoads(page, '/finance/sales-tax/settings')
  })

  test('sales-tax remittances route loads (#392)', async ({ page }) => {
    await assertPageLoads(page, '/finance/sales-tax/remittances')
  })

  test('break-even planning route loads (#393)', async ({ page }) => {
    await assertPageLoads(page, '/finance/planning/break-even')
  })

  test('year-end route has content (#394)', async ({ page }) => {
    await page.goto('/finance/year-end')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Finance Deep Routes - Payroll and Tax Extensions (#481-485)', () => {
  test('payroll hub route loads (#481)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payroll')
  })

  test('payroll run route loads (#482)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payroll/run')
  })

  test('payroll employees route loads (#483)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payroll/employees')
  })

  test('payroll W2 route loads (#484)', async ({ page }) => {
    await assertPageLoads(page, '/finance/payroll/w2')
  })

  test('tax 1099-NEC route has content (#485)', async ({ page }) => {
    await page.goto('/finance/tax/1099-nec')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})
