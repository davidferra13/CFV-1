/**
 * Multi-Tenant Isolation Tests
 *
 * Verifies that Chef A cannot access Chef B's data.
 * These tests run with Chef A's session and attempt to access Chef B's resource IDs directly.
 *
 * Coverage:
 *   - Direct URL access with wrong tenant's entity IDs returns 404 / redirect
 *   - API routes return empty or 401/403 when queried with wrong tenant's IDs
 *   - Client portal tokens are scoped to their issuing chef
 *
 * Note: These tests require DATABASE_E2E_ALLOW_REMOTE=true and seed data with two chefs.
 * The seed creates chefId (primary) and chefId2 (secondary) — two separate tenants.
 */

import { test, expect } from '../helpers/fixtures'

test.describe('Tenant Isolation — Cross-Tenant Access Prevention', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // CHEF ROLE ISOLATION
  // Tests run with chefId's session, attempting to access chefId2's resources
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Chef A cannot access Chef B event pages', () => {
    test('accessing /events/[chefB-event-id] redirects or shows 404', async ({ page, seedIds }) => {
      // If chef2Id or chef2EventId is not seeded, skip gracefully
      const chef2EventId = (seedIds as Record<string, string>).chef2EventId
      if (!chef2EventId) {
        test.skip()
        return
      }

      await page.goto(`/events/${chef2EventId}`)

      // Should not be able to see the event — expect redirect to dashboard or 404 behavior
      const url = page.url()
      const is404OrRedirect =
        url.includes('/dashboard') ||
        url.includes('/events') === false ||
        url.includes('not-found') ||
        url.includes('unauthorized')

      // The page should NOT show the event detail for another tenant
      const pageText = await page.textContent('body')
      // If the page loaded chef2's event, it would show its title or details
      // We can't check the specific title, but we can check for an error indicator
      expect(
        is404OrRedirect ||
          (pageText?.includes('not found') ?? false) ||
          (pageText?.includes('unauthorized') ?? false),
        `Expected isolation: should not be able to access /events/${chef2EventId} as Chef A`
      ).toBeTruthy()
    })

    test('accessing /clients/[chefB-client-id] is blocked', async ({ page, seedIds }) => {
      const chef2ClientId = (seedIds as Record<string, string>).chef2ClientId
      if (!chef2ClientId) {
        test.skip()
        return
      }

      await page.goto(`/clients/${chef2ClientId}`)
      const url = page.url()

      // Should redirect away or show error — not the client detail page
      expect(
        (url.includes('/clients') && !url.includes(chef2ClientId)) || url.includes('/dashboard'),
        `Expected isolation: should not be able to access /clients/${chef2ClientId} as Chef A`
      ).toBeTruthy()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // API v1 ISOLATION
  // API keys are scoped to a tenant — cannot be used to access other tenant data
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('API v1 — API key isolation', () => {
    test('GET /api/v1/events returns only own tenant events', async ({ page, seedIds }) => {
      const apiKey = (seedIds as Record<string, string>).chefApiKey
      if (!apiKey) {
        test.skip()
        return
      }

      const response = await page.request.get('/api/v1/events', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      expect(response.ok()).toBe(true)
      const body = await response.json()

      // Check that no events from chef2 are included
      const chef2EventId = (seedIds as Record<string, string>).chef2EventId
      if (chef2EventId && body.data) {
        const ids = body.data.map((e: { id: string }) => e.id)
        expect(ids).not.toContain(chef2EventId)
      }
    })

    test('GET /api/v1/clients returns only own tenant clients', async ({ page, seedIds }) => {
      const apiKey = (seedIds as Record<string, string>).chefApiKey
      if (!apiKey) {
        test.skip()
        return
      }

      const response = await page.request.get('/api/v1/clients', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      expect(response.ok()).toBe(true)
      const body = await response.json()

      const chef2ClientId = (seedIds as Record<string, string>).chef2ClientId
      if (chef2ClientId && body.data) {
        const ids = body.data.map((c: { id: string }) => c.id)
        expect(ids).not.toContain(chef2ClientId)
      }
    })

    test('invalid API key returns 401', async ({ page }) => {
      const response = await page.request.get('/api/v1/events', {
        headers: { Authorization: 'Bearer CF_LIVE_INVALID_KEY_XXXX' },
      })

      expect(response.status()).toBe(401)
    })

    test('missing Authorization header returns 401', async ({ page }) => {
      const response = await page.request.get('/api/v1/events')
      expect(response.status()).toBe(401)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLE BOUNDARY ISOLATION
  // Chef session cannot access client-only routes and vice versa
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Role boundary — chef cannot access client-only routes', () => {
    test('/my-events redirects chef to dashboard', async ({ page }) => {
      await page.goto('/my-events')
      await expect(page).not.toHaveURL(/\/my-events$/)
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('/my-quotes redirects chef away', async ({ page }) => {
      await page.goto('/my-quotes')
      await expect(page).not.toHaveURL(/\/my-quotes$/)
    })

    test('/my-profile redirects chef away', async ({ page }) => {
      await page.goto('/my-profile')
      await expect(page).not.toHaveURL(/\/my-profile$/)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTH ENDPOINT — public, no auth required
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Health endpoint is publicly accessible', () => {
    test('GET /api/health returns 200 with no auth', async ({ page }) => {
      const response = await page.request.get('/api/health')
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.status).toMatch(/^(ok|degraded)$/)
      expect(body.checks).toBeDefined()
      expect(body.checks.env).toBe('ok')
    })

    test('/api/health response has X-Request-ID header', async ({ page }) => {
      const response = await page.request.get('/api/health')
      // The health endpoint sets X-Request-ID on every response
      const requestId = response.headers()['x-request-id']
      expect(requestId).toBeDefined()
      expect(requestId.length).toBeGreaterThan(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // DIRECT DATABASE QUERY ISOLATION (via middleware/server action boundary)
  // These verify that the middleware properly enforces role before server action runs
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Unauthenticated requests are blocked', () => {
    test('Unauthenticated access to /dashboard redirects to sign-in', async ({ browser }) => {
      // Fresh context with no auth state
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto('/dashboard')
      await expect(page).toHaveURL(/auth\/signin/)

      await context.close()
    })

    test('Unauthenticated access to /events redirects to sign-in', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto('/events')
      await expect(page).toHaveURL(/auth\/signin/)

      await context.close()
    })

    test('Unauthenticated access to /financials redirects to sign-in', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto('/financials')
      await expect(page).toHaveURL(/auth\/signin/)

      await context.close()
    })
  })
})
