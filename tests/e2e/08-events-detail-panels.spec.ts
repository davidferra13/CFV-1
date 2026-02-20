// Event Detail Panels E2E Tests
// Verifies that the sub-pages and panels on the event detail page load.

import { test, expect } from '../helpers/fixtures'

test.describe('Events — Detail Panels and Sub-pages', () => {
  test('/events/[id]/pack — packing list page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/pack`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/packing|pack list/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/financial — financial summary loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/financial|revenue|payment/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/receipts — receipt digitization page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/receipts`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Page should load without crashing
    await expect(page.getByText(/not found|500/i)).not.toBeVisible()
  })

  test('/events/[id]/debrief — post-event debrief loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/debrief|post.event|after.action/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/invoice — invoice page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/invoice`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/invoice/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/events/[id]/travel — travel page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/travel`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/not found|500/i)).not.toBeVisible()
  })

  test('event detail main page renders staff panel', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    // Staff panel should be rendered (even if empty)
    await expect(page.getByText(/staff|team/i)).toBeVisible({ timeout: 10_000 })
  })

  test('event detail main page renders menu approval section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/menu/i)).toBeVisible({ timeout: 10_000 })
  })

  test('event detail main page renders contingency section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/contingency|backup|plan/i)).toBeVisible({ timeout: 10_000 })
  })
})
