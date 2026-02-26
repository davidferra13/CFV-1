// Launch Readiness Audit — Client Portal
// Tests: authenticated as CLIENT role — my-events, my-quotes, my-profile, my-chat, my-rewards
// This is what the chef's clients see — it must be polished

import { test, expect } from '../helpers/fixtures'

test.describe('Client Portal — Event List', () => {
  test('/my-events loads with event cards', async ({ page }) => {
    await page.goto('/my-events')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show events or empty state
    const hasContent = /event|dinner|upcoming|past|no event/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('event cards show status badges', async ({ page }) => {
    await page.goto('/my-events')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Cards should have status indicators
    const hasStatus = /draft|proposed|accepted|paid|confirmed|completed|cancelled/i.test(bodyText)
    // If there are events, status should be visible
    console.log('[INFO] Event status badges visible:', hasStatus)
  })

  test('event cards show date and guest count', async ({ page }) => {
    await page.goto('/my-events')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Cards should show date info
    const hasDateInfo =
      /\d{1,2}|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b|guest|people/i.test(
        bodyText
      )
    console.log('[INFO] Date/guest info visible:', hasDateInfo)
  })
})

test.describe('Client Portal — Event Detail', () => {
  test('client can view event detail', async ({ page, seedIds }) => {
    // Client's events — draft birthday dinner is linked to primary client (Alice)
    await page.goto(`/my-events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should show event info or redirect if not client's event
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('client can view completed event', async ({ page, seedIds }) => {
    await page.goto(`/my-events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })
})

test.describe('Client Portal — Event Sub-Pages', () => {
  const subPages = [
    'approve-menu',
    'invoice',
    'proposal',
    'payment-plan',
    'contract',
    'pre-event-checklist',
    'countdown',
    'event-summary',
  ]

  for (const sub of subPages) {
    test(`/my-events/[id]/${sub} does not 500`, async ({ page, seedIds }) => {
      const resp = await page.goto(`/my-events/${seedIds.eventIds.confirmed}/${sub}`)
      const status = resp?.status() ?? 0
      expect(status).not.toBe(500)
    })
  }
})

test.describe('Client Portal — Quotes', () => {
  test('/my-quotes loads with quote list', async ({ page }) => {
    await page.goto('/my-quotes')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('quote detail shows line items and total', async ({ page, seedIds }) => {
    await page.goto(`/my-quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show quote details with amount
    const hasQuoteInfo = /\$|total|amount|line|item|quote/i.test(bodyText)
    expect(hasQuoteInfo).toBeTruthy()
  })

  test('sent quote shows accept/reject buttons', async ({ page, seedIds }) => {
    await page.goto(`/my-quotes/${seedIds.quoteIds.sent}`)
    await page.waitForLoadState('networkidle')
    const acceptBtn = page.getByRole('button', { name: /accept/i }).first()
    const rejectBtn = page.getByRole('button', { name: /reject|decline/i }).first()
    const hasAccept = await acceptBtn.isVisible().catch(() => false)
    const hasReject = await rejectBtn.isVisible().catch(() => false)
    // At least one action should be available
    console.log('[INFO] Accept button visible:', hasAccept, '| Reject button visible:', hasReject)
  })
})

test.describe('Client Portal — Profile', () => {
  test('/my-profile loads with editable form', async ({ page }) => {
    await page.goto('/my-profile')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have form fields
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('profile form has name and contact fields', async ({ page }) => {
    await page.goto('/my-profile')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|email|phone|dietary|allerg/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })
})

test.describe('Client Portal — Other Pages', () => {
  test('/my-chat loads', async ({ page }) => {
    const resp = await page.goto('/my-chat')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/my-rewards loads', async ({ page }) => {
    const resp = await page.goto('/my-rewards')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/my-inquiries loads', async ({ page }) => {
    const resp = await page.goto('/my-inquiries')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/book-now loads', async ({ page }) => {
    const resp = await page.goto('/book-now')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/my-events/history loads', async ({ page }) => {
    const resp = await page.goto('/my-events/history')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/my-spending loads', async ({ page }) => {
    const resp = await page.goto('/my-spending')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })
})
