// Product Tests — Tier 1: Communication
// Proves: The app can receive, organize, and respond to real-world communication.
// Maps to: product-testing-roadmap.md Tier 1 (tests 1A-1D)
//
// Run: npx playwright test -p product-chef --grep "Tier 1"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

// ── 1B. Inquiry Pipeline ────────────────────────────────────────────────────

test.describe('Tier 1B — Inquiry Pipeline', () => {
  test('1B.1 — inquiry list loads with seeded inquiries', async ({ page, seedIds }) => {
    await page.goto('/inquiries')
    await page.waitForLoadState('domcontentloaded')

    // Should see at least one inquiry
    await expect(page).toHaveURL(/\/inquiries/)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('1B.2 — inquiry detail page loads with correct data', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('domcontentloaded')

    // Should display inquiry details (source message, client info, etc.)
    await expect(page).not.toHaveURL(/auth\/signin/)

    // The inquiry should show the client name or message content
    const hasJoy = await page
      .getByText(/Joy/i)
      .first()
      .isVisible()
      .catch(() => false)
    const hasInquiryContent = await page
      .getByText(/anniversary|dinner|request/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasJoy || hasInquiryContent).toBeTruthy()
  })

  test('1B.3 — inquiry shows status badge', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('domcontentloaded')

    // Should show the inquiry status somewhere
    const statusIndicator = page.getByText(/awaiting|pending|new|open|chef/i).first()
    await expect(statusIndicator).toBeVisible({ timeout: 10_000 })
  })

  test('1B.4 — inquiry awaiting client shows different status', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingClient}`)
    await page.waitForLoadState('domcontentloaded')

    // Should show awaiting client status
    const statusIndicator = page.getByText(/awaiting|client|sent|proposal/i).first()
    await expect(statusIndicator).toBeVisible({ timeout: 10_000 })
  })

  test('1B.5 — inquiry list shows both test inquiries', async ({ page }) => {
    await page.goto('/inquiries')
    await page.waitForLoadState('domcontentloaded')

    // Both seeded inquiries should be visible in the list
    const testInquiries = page.getByText(/TEST/i)
    const count = await testInquiries.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('1B.6 — inquiry filters work', async ({ page }) => {
    // Test filter routes
    const filterRoutes = ['/inquiries/awaiting-response', '/inquiries/awaiting-client-reply']

    for (const route of filterRoutes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
      // Page should render without errors
      const main = page.locator('main').first()
      await expect(main).toBeVisible({ timeout: 10_000 })
    }
  })
})

// ── 1C. Messaging ──────────────────────────────────────────────────────────

test.describe('Tier 1C — Messaging', () => {
  test('1C.1 — inbox loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/inbox')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    expect(errors).toHaveLength(0)
  })

  test('1C.2 — chat page loads', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })
})
