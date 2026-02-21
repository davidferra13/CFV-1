// Interaction Layer — Quote Flows
// Tests the full quote lifecycle:
//   - Quote creation (chef)
//   - Quote send (chef)
//   - Quote viewing as client
//   - Quote accept/reject (client)
//
// Uses chef storageState by default (interactions-chef project).
// Client-specific tests are in the interactions-client project.

import { test, expect } from '../helpers/fixtures'

// ─── Quote List States ────────────────────────────────────────────────────────

test.describe('Quote Flows — List by Status', () => {
  test('draft quote appears in /quotes/draft', async ({ page, seedIds }) => {
    await page.goto('/quotes/draft')
    await page.waitForLoadState('networkidle')
    // Draft quote is named "TEST Quote (draft)"
    await expect(page.getByText(/TEST Quote.*draft/i)).toBeVisible({ timeout: 10_000 })
  })

  test('sent quote appears in /quotes/sent', async ({ page, seedIds }) => {
    await page.goto('/quotes/sent')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/TEST Quote.*sent/i)).toBeVisible({ timeout: 10_000 })
  })

  test('accepted quote appears in /quotes/accepted', async ({ page, seedIds }) => {
    await page.goto('/quotes/accepted')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/TEST Quote.*accepted/i)).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Quote Detail Pages ───────────────────────────────────────────────────────

test.describe('Quote Flows — Detail Pages', () => {
  test('draft quote detail shows total amount ($740)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await page.waitForLoadState('networkidle')
    // Draft quote was seeded at 74000 cents = $740.00
    await expect(page.getByText(/\$740|\$740\.00|740/)).toBeVisible({ timeout: 10_000 })
  })

  test('sent quote detail shows total amount ($930)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('networkidle')
    // Sent quote was seeded at 93000 cents = $930.00
    await expect(page.getByText(/\$930|\$930\.00|930/)).toBeVisible({ timeout: 10_000 })
  })

  test('accepted quote detail shows total amount ($500)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.accepted}`)
    await page.waitForLoadState('networkidle')
    // Accepted quote was seeded at 50000 cents = $500.00
    await expect(page.getByText(/\$500|\$500\.00|500/)).toBeVisible({ timeout: 10_000 })
  })

  test('draft quote detail shows quote status badge', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/draft/i)).toBeVisible({ timeout: 10_000 })
  })

  test('sent quote detail shows sent status badge', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/sent/i)).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Quote Edit ───────────────────────────────────────────────────────────────

test.describe('Quote Flows — Edit', () => {
  test('draft quote edit page loads', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}/edit`)
    await page.waitForLoadState('networkidle')
    // Edit page should have form inputs
    const inputs = await page.locator('input, textarea, select').count()
    expect(inputs).toBeGreaterThan(0)
  })
})

// ─── Quote Creation ───────────────────────────────────────────────────────────

test.describe('Quote Flows — Creation', () => {
  test('/quotes/new — form renders', async ({ page }) => {
    await page.goto('/quotes/new')
    await page.waitForLoadState('networkidle')
    // Should have form fields
    const inputs = await page.locator('input, textarea, select').count()
    expect(inputs, 'Quote creation form should have inputs').toBeGreaterThan(0)
  })
})

// ─── Quote Actions (Chef) ─────────────────────────────────────────────────────

test.describe('Quote Flows — Chef Actions', () => {
  test('draft quote detail has "Send Quote" button', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await page.waitForLoadState('networkidle')
    const sendBtn = page.getByRole('button', { name: /send quote|send to client/i }).first()
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  })

  test('accepted quote detail shows no send button (already final)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.accepted}`)
    await page.waitForLoadState('networkidle')
    // Accepted quote should not have a "send" action
    const sendBtn = page.getByRole('button', { name: /^send quote$/i })
    await expect(sendBtn).not.toBeVisible()
  })
})
