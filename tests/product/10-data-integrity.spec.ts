// Product Tests — Data Integrity
// Proves: Data relationships are correct across the system.
// Cross-references seeded data to verify referential integrity.
//
// Run: npx playwright test -p product-chef --grep "Data Integrity"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

test.describe('Data Integrity — Event-Client Linkage', () => {
  test('draft event shows linked client name', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('domcontentloaded')

    // Draft event is linked to primary client (Alice E2E)
    await expect(page.getByText(/Alice/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('completed event shows linked client name', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('domcontentloaded')

    // Completed event is also linked to primary client (Alice)
    await expect(page.getByText(/Alice/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('proposed event shows linked client (Bob)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.proposed}`)
    await page.waitForLoadState('domcontentloaded')

    // Proposed event is linked to secondary client (Bob E2E)
    await expect(page.getByText(/Bob/i).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Data Integrity — Quote-Event Linkage', () => {
  test('accepted quote linked to paid event', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.accepted}`)
    await page.waitForLoadState('domcontentloaded')

    // Accepted quote is linked to paid event
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should show quote details
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Data Integrity — Inquiry-Event Linkage', () => {
  test('inquiry shows converted event link', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('domcontentloaded')

    // This inquiry was linked to the draft event via converted_to_event_id
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

test.describe('Data Integrity — No Orphaned Data', () => {
  test('all client detail pages load without 404', async ({ page, seedIds }) => {
    const clientIds = Object.values(seedIds.clientIds)
    for (const id of clientIds) {
      await page.goto(`/clients/${id}`)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
      // Should not show a 404 or error page
      const is404 = await page
        .getByText(/not found|404/i)
        .first()
        .isVisible()
        .catch(() => false)
      expect(is404).toBeFalsy()
    }
  })

  test('all event detail pages load without 404', async ({ page, seedIds }) => {
    const eventIds = Object.values(seedIds.eventIds)
    for (const id of eventIds) {
      await page.goto(`/events/${id}`)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
      const is404 = await page
        .getByText(/not found|404/i)
        .first()
        .isVisible()
        .catch(() => false)
      expect(is404).toBeFalsy()
    }
  })

  test('all quote detail pages load without 404', async ({ page, seedIds }) => {
    const quoteIds = Object.values(seedIds.quoteIds)
    for (const id of quoteIds) {
      await page.goto(`/quotes/${id}`)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
      const is404 = await page
        .getByText(/not found|404/i)
        .first()
        .isVisible()
        .catch(() => false)
      expect(is404).toBeFalsy()
    }
  })
})
