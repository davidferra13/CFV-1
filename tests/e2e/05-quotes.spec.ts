// Quotes E2E Tests
// Verifies quote list, detail, and status visibility.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Quotes', () => {
  test('quotes list loads', async ({ page }) => {
    await page.goto(ROUTES.quotes)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/quotes/)
  })

  test('TEST draft quote appears', async ({ page }) => {
    await page.goto(ROUTES.quotes)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/TEST Quote (draft)/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('TEST sent quote appears', async ({ page }) => {
    await page.goto(ROUTES.quotes)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/TEST Quote (sent)/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('TEST accepted quote appears', async ({ page }) => {
    await page.goto(ROUTES.quotes)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/TEST Quote (accepted)/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a quote navigates to detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.quotes)
    await page.waitForLoadState('networkidle')
    const link = page
      .getByRole('link')
      .filter({ hasText: /TEST Quote (draft)/i })
      .first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/quotes/${seedIds.quoteIds.draft}`))
  })

  test('quote detail shows total amount', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // $740.00 = 74000 cents
    await expect(page.getByText(/740/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/quotes/new renders quote form', async ({ page }) => {
    await page.goto('/quotes/new')
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // QuoteForm labels: "Client", "Quote Name", "Total Quoted Amount ($)"
    const field = page.getByLabel(/client|quote name|total quoted/i).first()
    await expect(field).toBeVisible({ timeout: 10_000 })
  })
})
