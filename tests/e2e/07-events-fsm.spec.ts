// Events FSM E2E Tests
// Verifies that the correct transition buttons appear for each event state.
// Does NOT test actual state transitions (those mutate DB state permanently
// and would break the idempotent seed). Instead, verifies the UI surface.

import { test, expect } from '../helpers/fixtures'

test.describe('Events — FSM State UI', () => {
  test('draft event shows "Propose" transition button', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    // Look for propose or send to client button
    const proposeBtn = page
      .getByRole('button', { name: /propose|send to client|request approval/i })
      .first()
    await expect(proposeBtn).toBeVisible({ timeout: 10_000 })
  })

  test('proposed event does NOT show "Propose" button (already proposed)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.proposed}`)
    await page.waitForLoadState('networkidle')
    const proposeBtn = page.getByRole('button', { name: /^propose$/i })
    await expect(proposeBtn).not.toBeVisible()
  })

  test('paid event shows "Confirm" transition button', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.paid}`)
    await page.waitForLoadState('networkidle')
    const confirmBtn = page.getByRole('button', { name: /confirm/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
  })

  test('confirmed event shows "Start Service" transition button', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const startBtn = page.getByRole('button', { name: /start service|begin service|in.progress/i }).first()
    await expect(startBtn).toBeVisible({ timeout: 10_000 })
  })

  test('completed event shows no active transition buttons', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    // Terminal state — should not have propose/confirm/start buttons
    const proposeBtn = page.getByRole('button', { name: /^propose$/i })
    const confirmBtn = page.getByRole('button', { name: /^confirm$/i })
    await expect(proposeBtn).not.toBeVisible()
    await expect(confirmBtn).not.toBeVisible()
  })

  test('draft event has a "Cancel Event" option', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    // Cancel should be available on non-terminal states
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first()
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 })
  })

  test('paid event status badge reads "paid" or equivalent', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.paid}`)
    await expect(page.getByText(/paid/i)).toBeVisible({ timeout: 10_000 })
  })
})
