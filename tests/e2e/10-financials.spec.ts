// Financials E2E Tests
// Verifies the financial dashboard, expense list, and expense creation.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Financials', () => {
  test('financials page loads', async ({ page }) => {
    await page.goto(ROUTES.financials)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/financials/)
  })

  test('financials shows revenue or summary section', async ({ page }) => {
    await page.goto(ROUTES.financials)
    await page.waitForLoadState('networkidle')
    // Look for any financial label
    const revenueEl = page.getByText(/revenue|earnings|income|net/i).first()
    await expect(revenueEl).toBeVisible({ timeout: 10_000 })
  })

  test('expenses page loads', async ({ page }) => {
    await page.goto(ROUTES.expenses)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/expenses/)
  })

  test('TEST expenses appear on expenses page', async ({ page }) => {
    await page.goto(ROUTES.expenses)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST - Whole Foods groceries')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('TEST - Linen rental')).toBeVisible({ timeout: 10_000 })
  })

  test('expense totals display correctly', async ({ page }) => {
    await page.goto(ROUTES.expenses)
    await page.waitForLoadState('networkidle')
    // $187.50 = 18750 cents
    await expect(page.getByText(/187\.50|187,50/)).toBeVisible({ timeout: 10_000 })
  })

  test('new expense form is accessible', async ({ page }) => {
    // Navigate to expenses and look for a new expense button/link
    await page.goto(ROUTES.expenses)
    const addBtn = page.getByRole('link', { name: /add expense|new expense/i })
      .or(page.getByRole('button', { name: /add expense|new expense/i }))
    if (await addBtn.count() > 0) {
      await addBtn.first().click()
      // Should land on an expense form
      const categoryField = page.getByLabel(/category/i).first()
      await expect(categoryField).toBeVisible({ timeout: 10_000 })
    } else {
      test.info().annotations.push({ type: 'note', description: 'No "Add Expense" button found — may use inline form' })
    }
  })
})
