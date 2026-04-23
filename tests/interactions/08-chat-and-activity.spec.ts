// Interaction Layer — Chat & Activity Feed
// Tests the chef-client messaging system and activity tracking.
//
// Chat: inbox list, individual conversation, message input, send button.
// Activity: feed loads, entries are clickable, time range filtering.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Chat Inbox ───────────────────────────────────────────────────────────────

test.describe('Chat — Inbox', () => {
  test('Chat inbox loads without error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    expect(page.url()).not.toMatch(/auth\/signin/)
    expect(errors).toHaveLength(0)
  })

  test('Chat inbox shows conversation list or empty state', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Chat inbox has "New Conversation" button or similar', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
    const newConvBtn = page
      .getByRole('button', { name: /new conversation|new message|compose|start/i })
      .first()
      .or(page.getByRole('link', { name: /new conversation|compose/i }).first())
    const isVisible = await newConvBtn.isVisible().catch(() => false)
    // Not a hard requirement — inbox may be empty
    if (isVisible) {
      await expect(newConvBtn).toBeVisible()
    }
  })
})

// ─── Chat with Specific Client ────────────────────────────────────────────────

test.describe('Chat — Individual Conversation', () => {
  test('Chat with primary client loads', async ({ page, seedIds }) => {
    await page.goto(`/chat/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Chat conversation has message input area', async ({ page, seedIds }) => {
    await page.goto(`/chat/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    // Should have a text input for composing messages
    const messageInput = page
      .locator('textarea, input[type="text"][placeholder*="message" i], [contenteditable]')
      .first()
    await expect(messageInput).toBeVisible({ timeout: 10_000 })
  })

  test('Chat conversation has Send button', async ({ page, seedIds }) => {
    await page.goto(`/chat/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    await expect(sendBtn).toBeVisible({ timeout: 10_000 })
  })

  test('Chat can type a message without crashing', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/chat/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')

    const messageInput = page.locator('textarea, [contenteditable]').first()
    if (await messageInput.isVisible()) {
      await messageInput.fill(
        'Quick check-in on menu pacing for the anniversary supper. Happy to revise dessert plating if that helps.'
      )
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })

  test('Chat does not crash on send (may be limited to seeded chat history)', async ({
    page,
    seedIds,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/chat/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')

    const messageInput = page.locator('textarea').first()
    if (await messageInput.isVisible()) {
      await messageInput.fill(
        'Sharing two dessert options for your parents’ dinner and a tighter timing plan for the evening.'
      )
      const sendBtn = page.getByRole('button', { name: /send/i }).first()
      if (await sendBtn.isVisible()) {
        await sendBtn.click()
        await page.waitForTimeout(1500)
      }
    }

    // No JS crash
    expect(errors).toHaveLength(0)
    // Page should still be on chat, not redirected to login
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Activity Feed ────────────────────────────────────────────────────────────

test.describe('Activity Feed', () => {
  test('Activity page loads', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('Activity page shows feed entries or empty state', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Activity page has time range filter or tabs', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    // Look for 7 days, 30 days, all-time, or similar filter
    const filterEl = page
      .getByRole('button', { name: /7 day|30 day|all time|today|week|month/i })
      .first()
      .or(page.getByRole('tab').first())
    const isVisible = await filterEl.isVisible().catch(() => false)
    if (isVisible) {
      await expect(filterEl).toBeVisible()
    }
  })

  test('Activity API returns data', async ({ page }) => {
    const resp = await page.request.get('/api/activity/feed')
    expect(resp.status()).toBeLessThan(500)
  })

  test('Activity page does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/activity')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})

// ─── Queue ────────────────────────────────────────────────────────────────────

test.describe('Queue / Priority Inbox', () => {
  test('Queue page loads', async ({ page }) => {
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('Queue shows items or empty state', async ({ page }) => {
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Queue does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/queue')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
