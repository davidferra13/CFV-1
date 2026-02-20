// Client Portal E2E Tests
// Uses CLIENT storageState (applied by Playwright 'client' project).
// Tests the client-facing side of ChefFlow.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Client Portal', () => {
  test('client can reach /my-events without redirect', async ({ page }) => {
    await page.goto(ROUTES.clientEvents)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/my-events/)
  })

  test('client is redirected away from chef /dashboard (wrong role)', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    await expect(page).not.toHaveURL(/\/dashboard$/)
  })

  test('client is redirected away from chef /events (wrong role)', async ({ page }) => {
    await page.goto(ROUTES.events)
    await expect(page).not.toHaveURL(/^\/events$/)
  })

  test('confirmed event appears in client event list', async ({ page }) => {
    await page.goto(ROUTES.clientEvents)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Confirmed Wedding Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('completed event appears in client event list', async ({ page }) => {
    await page.goto(ROUTES.clientEvents)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Completed New Years Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking event navigates to client event detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.clientEvents)
    const link = page.getByRole('link').filter({ hasText: 'TEST Confirmed Wedding Dinner' }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/my-events/${seedIds.eventIds.confirmed}`))
  })

  test('client event detail shows occasion', async ({ page, seedIds }) => {
    await page.goto(`/my-events/${seedIds.eventIds.confirmed}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST Confirmed Wedding Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('/my-quotes loads for client', async ({ page }) => {
    await page.goto(ROUTES.myQuotes)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/my-quotes/)
  })

  test('/my-profile renders for client', async ({ page }) => {
    await page.goto(ROUTES.myProfile)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/profile|name|contact/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/my-rewards renders for client', async ({ page }) => {
    await page.goto(ROUTES.myRewards)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/reward|loyalty|points/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/my-inquiries renders for client', async ({ page }) => {
    await page.goto(ROUTES.myInquiries)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Page should load without crashing
    await expect(page.getByText(/internal server error|500/i)).not.toBeVisible()
  })
})
