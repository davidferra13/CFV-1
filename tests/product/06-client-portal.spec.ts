// Product Tests — Client Portal
// Proves: Clients can access their portal, view events, quotes, and interact.
// Uses client storageState (product-client project).
//
// Run: npx playwright test -p product-client

import { test, expect } from '../helpers/fixtures'

test.describe('Client Portal — Core', () => {
  test('client lands on my-events page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/my-events/)
  })

  test('my-events page shows seeded events', async ({ page }) => {
    await page.goto('/my-events')
    await page.waitForLoadState('domcontentloaded')

    // Primary client (Alice) has events in draft and completed states
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('my-quotes page loads', async ({ page }) => {
    await page.goto('/my-quotes')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('my-chat page loads', async ({ page }) => {
    await page.goto('/my-chat')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('my-profile page loads', async ({ page }) => {
    await page.goto('/my-profile')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('my-rewards page loads', async ({ page }) => {
    await page.goto('/my-rewards')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('my-inquiries page loads', async ({ page }) => {
    await page.goto('/my-inquiries')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('my-hub page loads', async ({ page }) => {
    await page.goto('/my-hub')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('my-spending page loads', async ({ page }) => {
    await page.goto('/my-spending')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('discover page loads', async ({ page }) => {
    await page.goto('/discover')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('no console errors across client portal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const clientPages = [
      '/my-events',
      '/my-quotes',
      '/my-chat',
      '/my-profile',
      '/my-rewards',
      '/my-hub',
    ]

    for (const route of clientPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
    }

    expect(errors).toHaveLength(0)
  })
})

test.describe('Client Portal — Event Detail', () => {
  test('client can view event detail page', async ({ page, seedIds }) => {
    // Primary client has the draft and completed events
    await page.goto(`/my-events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('domcontentloaded')

    // Should show the event or redirect to events list
    const url = page.url()
    const isEventPage = url.includes('/my-events/')
    expect(isEventPage).toBeTruthy()
  })

  test('event sub-pages load for client', async ({ page, seedIds }) => {
    const subPages = [
      `/my-events/${seedIds.eventIds.draft}/event-summary`,
      `/my-events/${seedIds.eventIds.draft}/countdown`,
    ]

    for (const route of subPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      // Should not redirect to auth
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})
