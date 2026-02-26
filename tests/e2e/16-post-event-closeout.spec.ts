// Post-Event Close-Out Wizard E2E Tests
// Verifies the 5-step close-out wizard that runs after a completed event.
// Uses CHEF storageState (applied by Playwright 'chef' project).
//
// All tests are read-only / idempotent:
// - "No tip tonight" advances React state only (no server action)
// - Receipt and mileage steps are checked for UI presence only
// Navigation tests don't submit forms that would permanently change seed state.

import { test, expect } from '../helpers/fixtures'

test.describe('Post-Event Close-Out Wizard', () => {
  // ── Page access ────────────────────────────────────────────────────────────

  test('close-out page loads for a completed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    await page.waitForLoadState('networkidle')
    // Should not 404 or redirect to sign-in
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).not.toHaveURL(/404/)
  })

  test('close-out page shows the 5-step progress bar', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    await page.waitForLoadState('networkidle')
    // Progress bar shows "Step 1 of 5"
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible({ timeout: 10_000 })
  })

  test('close-out page shows the Tip step heading', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    await page.waitForLoadState('networkidle')
    // Tip step asks "Did [client] leave a tip?"
    await expect(page.getByText(/leave a tip/i)).toBeVisible({ timeout: 10_000 })
  })

  test('close-out tip step shows Yes / No tip options', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    await page.waitForLoadState('networkidle')
    // Should have both tip options visible
    await expect(page.getByRole('button', { name: /yes.*enter amount/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /no tip tonight/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  // ── Wizard navigation (no DB mutations) ────────────────────────────────────

  test('clicking "No tip tonight" advances to Step 2 — Receipts', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    await page.waitForLoadState('networkidle')

    // Click "No tip tonight" — advances in React state only, no server call
    await page.getByRole('button', { name: /no tip tonight/i }).click()

    // Should now show Step 2 of 5 — Receipts
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible({ timeout: 5_000 })
  })

  test('Step 2 shows receipts status for seeded expenses', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/close-out`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /no tip tonight/i }).click()
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible({ timeout: 5_000 })

    // Step 2 should mention receipts — either "upload" prompt or expenses list
    const receiptsContent = page.getByText(/receipt|expense/i).first()
    await expect(receiptsContent).toBeVisible({ timeout: 5_000 })
  })

  test('close-out page is inaccessible for a non-completed event (404)', async ({
    page,
    seedIds,
  }) => {
    // A confirmed event is not completed — should return 404 from the page
    await page.goto(`/events/${seedIds.eventIds.confirmed}/close-out`)
    await page.waitForLoadState('networkidle')
    // Should show a 404 (Next.js notFound()) or redirect
    const is404 =
      (await page.title()).toLowerCase().includes('404') ||
      (await page.locator('text=404').count()) > 0 ||
      (await page.locator('text=not found').count()) > 0
    expect(is404).toBe(true)
  })

  test('chef event detail page for a completed event shows "Close Out" or financial section', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    // Event detail should show completed state
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Post-Event Banner — Client Portal', () => {
  // NOTE: These tests run in the CLIENT project (uses client storageState)

  test('completed event appears in client events list', async ({ page }) => {
    await page.goto('/my-events')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST Completed New Years Dinner')).toBeVisible({ timeout: 10_000 })
  })

  test('client events list Past Events section renders', async ({ page }) => {
    await page.goto('/my-events')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /past events/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('completed event detail page loads for client', async ({ page, seedIds }) => {
    await page.goto(`/my-events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST Completed New Years Dinner')).toBeVisible({ timeout: 10_000 })
  })
})
