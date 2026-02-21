// Event Detail Panels E2E Tests
// Verifies that the sub-pages and panels on the event detail page load.

import { test, expect } from '../helpers/fixtures'

test.describe('Events — Detail Panels and Sub-pages', () => {
  test('/events/[id]/pack — packing list page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/pack`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/packing|pack list/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/financial — financial summary loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // "financial", "revenue", or "payment" text appears in the page heading/content
    await expect(page.getByText(/financial|revenue|payment/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/events/[id]/receipts — receipt digitization page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/receipts`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // Page should load without crashing
    await expect(page.getByText(/not found|500/i).first()).not.toBeVisible()
  })

  test('/events/[id]/debrief — post-event debrief loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/debrief|post.event|after.action/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/events/[id]/invoice — invoice page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/invoice`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/invoice/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/travel — travel page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/travel`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    // Travel page just needs to not crash — may be empty if no travel data
    await expect(page.getByText(/not found|500/i).first()).not.toBeVisible()
  })

  test('event detail main page renders staff panel', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // Scope to main content to avoid matching sidebar nav links
    const staffText = page
      .locator('main')
      .getByText(/staff|team/i)
      .first()
    await expect(staffText).toBeVisible({ timeout: 10_000 })
  })

  test('event detail main page renders menu approval section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // "Menu" appears in page body — scoped to main to avoid sidebar nav match
    const menuText = page.locator('main').getByText(/menu/i).first()
    await expect(menuText).toBeVisible({ timeout: 10_000 })
  })

  test('event detail main page renders contingency section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // Contingency/backup plan section
    await expect(page.getByText(/contingency|backup|plan/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
