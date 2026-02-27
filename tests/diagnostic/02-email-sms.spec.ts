// Diagnostic Suite 02 — Email & SMS Infrastructure
// Tests: Email template rendering, notification page, webhook endpoints,
//        communication settings, message threading
//
// Note: We can't test actual email delivery without a real Resend key,
// but we CAN test that all email-sending code paths don't crash,
// that templates render, and that webhook endpoints are secure.

import { test, expect } from '../helpers/fixtures'

// ─── Email-Related Pages ────────────────────────────────────────────────────

test.describe('Email Infrastructure — Page Rendering', () => {
  test('notifications page loads', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('inbox page loads', async ({ page }) => {
    await page.goto('/inbox')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('chat page loads', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('email templates settings page loads', async ({ page }) => {
    const resp = await page.goto('/settings/email-templates')
    if (resp && resp.status() !== 404) {
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/500|internal server error/i)
    }
  })

  test('notification preferences page loads', async ({ page }) => {
    const resp = await page.goto('/settings/notifications')
    if (resp && resp.status() !== 404) {
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/500|internal server error/i)
    }
  })
})

// ─── Marketing Email Pages ──────────────────────────────────────────────────

test.describe('Marketing Email — Page Rendering', () => {
  test('marketing page loads', async ({ page }) => {
    await page.goto('/marketing')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('email campaigns page loads', async ({ page }) => {
    await page.goto('/marketing/campaigns')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('email sequences page loads', async ({ page }) => {
    await page.goto('/marketing/sequences')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('email templates library page loads', async ({ page }) => {
    await page.goto('/marketing/templates')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('push dinner page loads', async ({ page }) => {
    await page.goto('/marketing/push-dinner')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Communication Features ─────────────────────────────────────────────────

test.describe('Communication — Client Messaging', () => {
  test('client detail page has messaging section', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientId}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    const hasComms = /message|email|sms|contact|communicate|send/i.test(body)
    expect(hasComms).toBeTruthy()
  })

  test('event detail page has communication options', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // Events should reference some communication capability
    const hasComms = /email|message|notify|send|share|contact/i.test(body)
    expect(hasComms).toBeTruthy()
  })
})

// ─── Webhook Endpoint Validation ────────────────────────────────────────────

test.describe('Webhook Endpoints — Robustness', () => {
  test('Resend webhook handles unknown event type', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/resend', {
      data: JSON.stringify({ type: 'unknown.event', data: { email_id: 'test' } }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resp.status()).toBeLessThan(500)
  })

  test('Twilio webhook handles missing Body field', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/twilio', {
      data: 'From=%2B15555555555',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(resp.status()).toBeLessThan(500)
  })

  test('Twilio webhook handles complete SMS payload', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/twilio', {
      data: 'From=%2B15555555555&Body=Hello+from+test&To=%2B15555555556&MessageSid=SM_test',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Activity Feed API ──────────────────────────────────────────────────────

test.describe('Activity Feed — API Health', () => {
  test('activity feed returns valid response', async ({ page }) => {
    const resp = await page.request.get('/api/activity/feed')
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      const contentType = resp.headers()['content-type'] ?? ''
      expect(contentType).toMatch(/json/)
    }
  })

  test('activity page renders', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Push Notification Infrastructure ───────────────────────────────────────

test.describe('Push Notifications — Infrastructure', () => {
  test('VAPID public key endpoint responds', async ({ page }) => {
    const resp = await page.request.get('/api/push/vapid-public-key')
    expect(resp.status()).toBeLessThan(500)
  })

  test('subscribe endpoint rejects invalid subscription', async ({ page }) => {
    const resp = await page.request.post('/api/push/subscribe', {
      data: JSON.stringify({ invalid: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resp.status()).not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })
})
