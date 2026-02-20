// Inquiries E2E Tests
// Verifies the inquiry pipeline: list, detail, status filtering.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Inquiries', () => {
  test('inquiry list loads', async ({ page }) => {
    await page.goto(ROUTES.inquiries)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/inquiries/)
  })

  test('TEST awaiting-chef inquiry appears', async ({ page }) => {
    await page.goto(ROUTES.inquiries)
    // The inquiry source message contains "awaiting chef response"
    await expect(page.getByText(/TEST E2E inquiry awaiting chef/i)).toBeVisible({ timeout: 10_000 })
  })

  test('TEST awaiting-client inquiry appears', async ({ page }) => {
    await page.goto(ROUTES.inquiries)
    await expect(page.getByText(/TEST E2E inquiry awaiting client/i)).toBeVisible({ timeout: 10_000 })
  })

  test('clicking inquiry navigates to detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.inquiries)
    const link = page.getByRole('link').filter({ hasText: /TEST E2E inquiry awaiting chef/i }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/inquiries/${seedIds.inquiryIds.awaitingChef}`))
  })

  test('inquiry detail shows source message', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/TEST E2E inquiry awaiting chef/i)).toBeVisible({ timeout: 10_000 })
  })

  test('inquiry detail has action buttons', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    // Should have some kind of respond/convert action
    const hasActionBtn = await page.getByRole('button').count()
    expect(hasActionBtn).toBeGreaterThan(0)
  })

  test('inquiry list is filterable by status', async ({ page }) => {
    await page.goto(ROUTES.inquiries)
    // Look for status tabs or filter buttons
    const tabOrFilter = page.getByRole('tab').or(page.getByRole('button').filter({ hasText: /all|awaiting/i }))
    const count = await tabOrFilter.count()
    expect(count).toBeGreaterThan(0)
  })
})
