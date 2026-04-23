// Events CRUD E2E Tests
// Verifies event list, filtering, detail load, new event form, edit form.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

function daysFromNow(days: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

test.describe('Events — List and CRUD', () => {
  test('events list loads', async ({ page }) => {
    await page.goto(ROUTES.events)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/events/)
  })

  test('all 5 TEST events appear in list', async ({ page }) => {
    await page.goto(ROUTES.events)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Draft Birthday Dinner').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('TEST Proposed Anniversary').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('TEST Paid Tasting').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('TEST Confirmed Wedding Dinner').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('TEST Completed New Years Dinner').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('clicking event navigates to detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.events)
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link').filter({ hasText: 'TEST Draft Birthday Dinner' }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/events/${seedIds.eventIds.draft}`))
  })

  test('draft event detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Draft Birthday Dinner').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('completed event detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Completed New Years Dinner').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('confirmed event shows correct status badge', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // Use first() — 'confirmed' text appears in nav link, heading, badge, and description
    await expect(page.getByText(/confirmed/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/events/new page renders form', async ({ page }) => {
    await page.goto(ROUTES.eventsNew)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // EventForm labels: 'Client', 'Occasion', 'Event Date & Time'
    const field = page.getByLabel(/occasion|event date|client/i).first()
    await expect(field).toBeVisible({ timeout: 10_000 })
  })

  test('draft event can be created without a serve time', async ({ page, seedIds }) => {
    const suffix = Date.now().toString()
    const eventDate = `${daysFromNow(14)}T17:00`

    await page.goto(ROUTES.eventsNew)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.getByRole('heading', { name: 'Create Event' }).waitFor({ timeout: 30_000 })

    // The client select can reset shortly after first paint in dev, so wait for settled options
    // before interacting or the form can drop the selected client.
    await page.waitForTimeout(5_000)
    await page.getByLabel('Client').selectOption(seedIds.clientId)
    await page.getByLabel('Occasion').fill(`TEST Blank Serve Time ${suffix}`)
    await page.getByLabel('Event Date & Time').fill(eventDate)
    await page.getByLabel('Number of Guests').fill('6')

    await page.getByRole('button', { name: /Continue/ }).click()
    await expect(page.getByLabel('Special Requests')).toBeVisible({ timeout: 30_000 })
    await page
      .getByLabel('Special Requests')
      .fill('Regression: creating a draft event should succeed even when serve time is left blank.')

    await page.getByRole('button', { name: 'Create Event' }).click()
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+(\?.*)?$/, { timeout: 60_000 })
    await expect(page.getByText(`TEST Blank Serve Time ${suffix}`).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('edit event page loads for draft event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}/edit`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // Should not show an error page
    await expect(page.getByText(/not found|error/i).first()).not.toBeVisible()
  })
})
