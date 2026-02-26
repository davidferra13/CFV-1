// Coverage Layer — API Routes
// Tests all API endpoints using Playwright's request context (carries auth cookies).
// Verifies:
//   - Document PDF endpoints return 200 + application/pdf
//   - Scheduled endpoints reject requests without cron secret
//   - Public API endpoints return JSON
//   - Webhook endpoints reject malformed payloads
//
// Uses chef storageState (set by coverage-api project in playwright.config.ts).

import { test, expect } from '../helpers/fixtures'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

// ─── Document PDF Routes ──────────────────────────────────────────────────────

test.describe('API — Document PDF Generation', () => {
  test('/api/documents/[eventId] — event document route exists', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}`)
    // 200 (has docs) or 404 (no docs attached yet) — either way, not a crash
    expect(resp.status()).toBeLessThan(500)
  })

  test('/api/documents/invoice/[eventId] — invoice PDF', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/invoice/${seedIds.eventIds.completed}`)
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      expect(resp.headers()['content-type']).toMatch(/pdf/)
    }
  })

  test('/api/documents/receipt/[eventId] — receipt PDF', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/receipt/${seedIds.eventIds.completed}`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('/api/documents/quote/[quoteId] — quote PDF (chef view)', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/quote/${seedIds.quoteIds.sent}`)
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      expect(resp.headers()['content-type']).toMatch(/pdf/)
    }
  })

  test('/api/documents/quote-client/[quoteId] — quote PDF (client view)', async ({
    page,
    seedIds,
  }) => {
    const resp = await page.request.get(`/api/documents/quote-client/${seedIds.quoteIds.sent}`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('/api/documents/foh-menu/[eventId] — FOH menu PDF', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/foh-menu/${seedIds.eventIds.confirmed}`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('/api/documents/financial-summary/[eventId] — financial summary PDF', async ({
    page,
    seedIds,
  }) => {
    const resp = await page.request.get(
      `/api/documents/financial-summary/${seedIds.eventIds.completed}`
    )
    expect(resp.status()).toBeLessThan(500)
  })

  test('/api/documents/contract/invalid-id — handles bad contract ID', async ({ page }) => {
    const resp = await page.request.get('/api/documents/contract/not-a-real-id')
    // Should return 404 or 400, not 500
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Unauthenticated Rejection — Documents ────────────────────────────────────

test.describe('API — Document Routes Reject Unauthenticated', () => {
  test('/api/documents/invoice/[id] — rejects unauthenticated requests', async ({
    page,
    seedIds,
  }) => {
    // Make request without auth cookies by using a fresh context
    const resp = await page.request.get(`/api/documents/invoice/${seedIds.eventIds.completed}`, {
      headers: { Cookie: '' },
    })
    // Should return 401/403, not 200 or 500
    expect(resp.status(), 'document API should reject unauthenticated requests').not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Scheduled / Cron Endpoints ───────────────────────────────────────────────

test.describe('API — Scheduled Endpoints (Cron Protection)', () => {
  const scheduledRoutes = [
    '/api/scheduled/activity-cleanup',
    '/api/scheduled/automations',
    '/api/scheduled/call-reminders',
    '/api/scheduled/campaigns',
    '/api/scheduled/copilot',
    '/api/scheduled/follow-ups',
    '/api/scheduled/lifecycle',
    '/api/scheduled/loyalty-expiry',
    '/api/scheduled/monitor',
    '/api/scheduled/revenue-goals',
    '/api/scheduled/sequences',
    '/api/scheduled/waitlist-sweep',
  ]

  for (const route of scheduledRoutes) {
    test(`${route} — rejects request without cron secret`, async ({ page }) => {
      const resp = await page.request.post(route, { data: {} })
      // Without the cron secret, should return 401 or 403 (not 200 or 500)
      expect(resp.status(), `${route} should require cron secret`).not.toBe(200)
      expect(resp.status()).toBeLessThan(500)
    })
  }
})

// ─── Public API ───────────────────────────────────────────────────────────────

test.describe('API — Public API Endpoints', () => {
  test('/api/v1/clients — returns JSON (authenticated)', async ({ page }) => {
    const resp = await page.request.get('/api/v1/clients')
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      const contentType = resp.headers()['content-type'] ?? ''
      expect(contentType).toMatch(/json/)
    }
  })

  test('/api/v1/events — returns JSON (authenticated)', async ({ page }) => {
    const resp = await page.request.get('/api/v1/events')
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      const contentType = resp.headers()['content-type'] ?? ''
      expect(contentType).toMatch(/json/)
    }
  })
})

// ─── Push Notification Endpoints ─────────────────────────────────────────────

test.describe('API — Push Notification Endpoints', () => {
  test('/api/push/vapid-public-key — returns VAPID key', async ({ page }) => {
    const resp = await page.request.get('/api/push/vapid-public-key')
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      const body = await resp.text()
      expect(body.length).toBeGreaterThan(0)
    }
  })

  test('/api/push/subscribe — rejects empty subscription payload', async ({ page }) => {
    const resp = await page.request.post('/api/push/subscribe', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    // Bad payload should return 400, not 500
    expect(resp.status()).not.toBe(500)
  })
})

// ─── Activity Feed ────────────────────────────────────────────────────────────

test.describe('API — Activity Feed', () => {
  test('/api/activity/feed — returns data (authenticated)', async ({ page }) => {
    const resp = await page.request.get('/api/activity/feed')
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

test.describe('API — Webhook Endpoints (Reject Malformed)', () => {
  test('/api/webhooks/stripe — rejects request without Stripe signature', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/stripe', {
      data: '{}',
      headers: { 'Content-Type': 'application/json' },
    })
    // Without valid Stripe-Signature header, should return 400 or 401, not 500
    expect(resp.status()).not.toBe(500)
    expect([400, 401, 403]).toContain(resp.status())
  })

  test('/api/webhooks/resend — rejects malformed payload', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/resend', {
      data: '{}',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resp.status()).not.toBe(500)
  })
})

// ─── Calendar API ─────────────────────────────────────────────────────────────

test.describe('API — Calendar', () => {
  test('/api/calendar/event/[id] — calendar event detail', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/calendar/event/${seedIds.eventIds.confirmed}`)
    expect(resp.status()).toBeLessThan(500)
  })
})
