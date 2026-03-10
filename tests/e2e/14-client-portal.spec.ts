// Client Portal E2E Tests
// Uses CLIENT storageState (applied by Playwright 'client' project).
// Tests the client-facing side of ChefFlow.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'
import { CLIENT_TOUR } from '../../lib/onboarding/tour-config'
import {
  primeCleanTourState,
  resetTourProgress,
  runGroundedTour,
} from '../helpers/onboarding-grounding'

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

  test('completed owned event appears in client event list', async ({ page }) => {
    await page.goto(ROUTES.clientEvents)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('link', { name: /view receipt/i }).first(),
      'Expected at least one completed event action for the seeded client'
    ).toBeVisible({ timeout: 10_000 })
  })

  test('draft event is hidden from client event list', async ({ page, seedIds }) => {
    await page.goto(ROUTES.clientEvents)
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`a[href="/my-events/${seedIds.eventIds.draft}"]`)).toHaveCount(0)
  })

  test('clicking completed event navigates to client event detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.clientEvents)
    const link = page.locator(`a[href="/my-events/${seedIds.eventIds.completed}"]`).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/my-events/${seedIds.eventIds.completed}`))
  })

  test('client event detail shows owned event content', async ({ page, seedIds }) => {
    await page.goto(`/my-events/${seedIds.eventIds.completed}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(
      page.getByRole('heading', { name: /TEST Completed New Years Dinner/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('/my-quotes loads for client', async ({ page }) => {
    await page.goto(ROUTES.myQuotes)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/my-quotes/)
  })

  test('/my-profile renders for client', async ({ page }) => {
    await page.goto(ROUTES.myProfile)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/my-rewards renders for client', async ({ page }) => {
    await page.goto(ROUTES.myRewards)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByRole('heading', { name: /^rewards$/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/my-inquiries renders for client', async ({ page }) => {
    await page.goto(ROUTES.myInquiries)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Page should load without crashing
    await expect(page.getByText(/internal server error|500/i)).not.toBeVisible()
  })

  test('client onboarding stays grounded to the live client portal', async ({ page, seedIds }) => {
    test.setTimeout(180_000)
    await resetTourProgress(seedIds.clientAuthId)
    await primeCleanTourState(page, 'client')
    await runGroundedTour(page, CLIENT_TOUR, ROUTES.clientEvents)
  })
})
