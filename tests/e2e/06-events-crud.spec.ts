// Events CRUD E2E Tests
// Verifies event list, filtering, detail load, new event form, edit form.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Events — List and CRUD', () => {
  test('events list loads', async ({ page }) => {
    await page.goto(ROUTES.events)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/events/)
  })

  test('all 5 TEST events appear in list', async ({ page }) => {
    await page.goto(ROUTES.events)
    // Wait for list to load
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Draft Birthday Dinner')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('TEST Proposed Anniversary')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('TEST Paid Tasting')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('TEST Confirmed Wedding Dinner')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('TEST Completed New Years Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking event navigates to detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.events)
    const link = page.getByRole('link').filter({ hasText: 'TEST Draft Birthday Dinner' }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/events/${seedIds.eventIds.draft}`))
  })

  test('draft event detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST Draft Birthday Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('completed event detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST Completed New Years Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('confirmed event shows correct status badge', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await expect(page.getByText(/confirmed/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/events/new page renders form', async ({ page }) => {
    await page.goto(ROUTES.eventsNew)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Form should have occasion or date field
    const field = page.getByLabel(/occasion|date|client/i).first()
    await expect(field).toBeVisible({ timeout: 10_000 })
  })

  test('edit event page loads for draft event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}/edit`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should not show an error page
    await expect(page.getByText(/not found|error/i)).not.toBeVisible()
  })
})
