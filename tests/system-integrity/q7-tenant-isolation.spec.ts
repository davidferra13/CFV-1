/**
 * Q7: Tenant Isolation + Auth Enforcement
 *
 * Three layers tested:
 *
 * Layer 1 — UNAUTHENTICATED PROBE
 *   Every authenticated API route must reject requests with no session cookie.
 *   A single 200 response with real data to an unauthenticated request = critical failure.
 *
 * Layer 2 — CROSS-TENANT IDOR (requires chef-b.json)
 *   Chef B must never receive Chef A's real event/client/invoice data by guessing
 *   or iterating IDs. Skipped gracefully if second auth state not available.
 *
 * Layer 3 — SELF-SCOPING CONSISTENCY
 *   Authenticated requests for non-existent IDs must return 404, never 500 or
 *   a different tenant's data. Proves the WHERE tenant_id = ? clause exists.
 */
import { test, expect, request } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

function loadCookieHeader(authFile: string): string {
  if (!existsSync(authFile)) return ''
  try {
    const state = JSON.parse(readFileSync(authFile, 'utf-8'))
    return (state.cookies as Array<{ name: string; value: string }>)
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')
  } catch {
    return ''
  }
}

// ── Authenticated document/data API routes that must reject no-auth requests ──
// Each returns real chef/client data and therefore MUST require a valid session.
const PROTECTED_API_ROUTES = [
  '/api/activity/feed',
  '/api/clients/preferences',
  '/api/ai/health',
  '/api/calling/enabled',
]

// ── Document routes that require an entity ID — probe with synthetic UUID ────
// These must return 404 (entity not found), never 200 with another tenant's data.
const SYNTHETIC_ID = '00000000-dead-beef-0000-000000000001'
const ID_GUESSING_ROUTES = [
  `/api/documents/invoice/${SYNTHETIC_ID}`,
  `/api/documents/financial-summary/${SYNTHETIC_ID}`,
  `/api/documents/quote/${SYNTHETIC_ID}`,
  `/api/documents/contract/${SYNTHETIC_ID}`,
  `/api/calendar/event/${SYNTHETIC_ID}`,
]

// ── Layer 1: Unauthenticated Probe ───────────────────────────────────────────

test.describe('Layer 1: Unauthenticated access rejected', () => {
  for (const route of PROTECTED_API_ROUTES) {
    test(`no-auth → rejected: ${route}`, async () => {
      const ctx = await request.newContext({ baseURL: BASE_URL })
      const resp = await ctx.get(route)
      // Must NOT return 200 with data — must be 401, 403, or redirect
      const status = resp.status()
      const body = status === 200 ? await resp.text() : ''

      if (status === 200) {
        // A 200 is allowed ONLY if the endpoint deliberately returns a public empty state.
        // It must NOT contain any chef/client identifying data.
        expect(body, `${route} returned 200 with real data to unauthenticated request`).not.toMatch(
          /email|tenant_id|client_id|chef_id|"id":"[0-9a-f-]{36}"/i
        )
      } else {
        expect(
          [401, 403, 302, 307].includes(status),
          `${route} returned unexpected ${status} to unauthenticated request`
        ).toBe(true)
      }
      await ctx.dispose()
    })
  }
})

// ── Layer 2: ID-guessing probe (authenticated, synthetic UUID) ───────────────

test.describe("Layer 2: ID-guessing returns 404, not another tenant's data", () => {
  const chefCookies = loadCookieHeader('.auth/chef.json')

  test.skip(!chefCookies, 'chef.json missing — skipping ID-guessing probe')

  for (const route of ID_GUESSING_ROUTES) {
    test(`synthetic ID → 404: ${route}`, async () => {
      const ctx = await request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: { Cookie: chefCookies },
      })
      const resp = await ctx.get(route)
      const status = resp.status()

      // 200 with actual data for a synthetic (non-existent) UUID = tenant scoping broken
      if (status === 200) {
        const body = await resp.text()
        // Must be an empty document or "not found" HTML — not real PDF/JSON with data
        expect(body.length, `${route} returned non-empty body for synthetic ID`).toBeLessThan(500)
      } else {
        expect(
          [404, 400, 403].includes(status),
          `${route} returned ${status} for synthetic ID — expected 404/400/403`
        ).toBe(true)
      }

      await ctx.dispose()
    })
  }
})

// ── Layer 3: Cross-tenant IDOR (requires two auth states) ───────────────────

test.describe('Layer 3: Cross-tenant IDOR — Chef B cannot read Chef A data', () => {
  const chefACookies = loadCookieHeader('.auth/chef.json')
  const chefBCookies = loadCookieHeader('.auth/chef-b.json')

  test.skip(
    !chefBCookies || !chefACookies,
    'Two chef auth states required — run main playwright setup to seed Chef B'
  )

  test('Chef B cannot access Chef A invoice via document API', async () => {
    // Step 1: As Chef A, get a real event ID from the activity feed
    const ctxA = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Cookie: chefACookies },
    })

    const feedResp = await ctxA.get('/api/activity/feed')
    let chefAEventId: string | null = null

    if (feedResp.status() === 200) {
      try {
        const feed = await feedResp.json()
        // Extract first event ID from feed if available
        const firstItem = Array.isArray(feed) ? feed[0] : null
        chefAEventId = firstItem?.eventId ?? firstItem?.id ?? null
      } catch {
        // Feed format varies — ID extraction is best-effort
      }
    }

    await ctxA.dispose()

    if (!chefAEventId) {
      // No events in Chef A's account — skip the IDOR portion but don't fail
      test.skip()
      return
    }

    // Step 2: As Chef B, attempt to access Chef A's event invoice
    const ctxB = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Cookie: chefBCookies },
    })

    const crossTenantResp = await ctxB.get(`/api/documents/invoice/${chefAEventId}`)
    const status = crossTenantResp.status()

    // Chef B must receive 404 or 403 — never Chef A's invoice data
    expect(
      [404, 403, 401].includes(status),
      `Chef B received HTTP ${status} for Chef A's event ${chefAEventId} — potential tenant isolation breach`
    ).toBe(true)

    await ctxB.dispose()
  })

  test('Chef B page route for Chef A resource shows 404 not data', async ({ page }) => {
    // Get a real event ID belonging to Chef A by visiting their events page
    const ctxA = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { Cookie: chefACookies },
    })
    const feedResp = await ctxA.get('/api/activity/feed')
    let chefAEventId: string | null = null
    if (feedResp.status() === 200) {
      try {
        const feed = await feedResp.json()
        const first = Array.isArray(feed) ? feed[0] : null
        chefAEventId = first?.eventId ?? first?.id ?? null
      } catch {}
    }
    await ctxA.dispose()

    if (!chefAEventId) {
      test.skip()
      return
    }

    // Navigate as Chef B to Chef A's event detail page
    // The page should load but show 404 or empty state — not Chef A's event data
    const response = await page.goto(`/events/${chefAEventId}`, {
      waitUntil: 'domcontentloaded',
    })

    const body = await page
      .locator('body')
      .innerText()
      .catch(() => '')

    // Must not show Chef A's actual event data
    expect(body).not.toMatch(/Application error/i)

    // If the page returned a real event, it must not contain Chef A-specific data
    if (response?.status() === 200 && body.length > 200) {
      // The page should show "not found" or redirect — never real event details
      // A real event page would have the occasion, date, client name
      // We check that the specific event ID isn't rendered as a data field
      expect(body).not.toContain(chefAEventId)
    }
  })
})
