// Interaction Layer — Multi-Tenant Isolation Tests (SECURITY CRITICAL)
// Verifies that Chef A (the E2E test chef) CANNOT access Chef B's data,
// even when using Chef B's IDs directly in the URL.
//
// This is the most important security test in the suite.
// A failure here means a real tenant data leak exists in production.
//
// Setup required: seedIds.chefBEventId and seedIds.chefBClientId are
// populated by the Chef B seed in e2e-seed.ts.
//
// Uses chef storageState (.auth/chef.json = Chef A session).
// The isolation-tests Playwright project uses this file.

import { test, expect } from '../helpers/fixtures'

// ─── Event Isolation ──────────────────────────────────────────────────────────

test.describe('Multi-Tenant Isolation — Events', () => {
  test('Chef A cannot view Chef B event detail page', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.chefBEventId}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    const url = page.url()

    const isBlocked =
      status === 404 ||
      status === 403 ||
      !url.includes(seedIds.chefBEventId) ||
      (await page
        .getByText(/not found|not authorized|access denied|doesn't exist/i)
        .first()
        .isVisible()
        .catch(() => false))

    expect(isBlocked, `Chef A must not see Chef B's event (${seedIds.chefBEventId})`).toBeTruthy()
  })

  test('Chef A cannot access Chef B event DOP page', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.chefBEventId}/dop`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    expect(status).not.toBe(200)
    // Should 404, 403, or redirect away
    const url = page.url()
    const isBlocked = status !== 200 || !url.includes(seedIds.chefBEventId)
    expect(isBlocked, "Chef A should not reach Chef B's DOP page").toBeTruthy()
  })

  test('Chef A cannot access Chef B event financial page', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.chefBEventId}/financial`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    const url = page.url()
    const isBlocked = status === 404 || status === 403 || !url.includes(seedIds.chefBEventId)
    expect(isBlocked, "Chef A should not reach Chef B's financial page").toBeTruthy()
  })

  test('Chef A cannot access Chef B event close-out', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.chefBEventId}/close-out`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    const url = page.url()
    const isBlocked = status === 404 || status === 403 || !url.includes(seedIds.chefBEventId)
    expect(isBlocked, "Chef A should not reach Chef B's close-out wizard").toBeTruthy()
  })

  test('Chef A cannot access Chef B event AAR', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.chefBEventId}/aar`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    const url = page.url()
    const isBlocked = status === 404 || status === 403 || !url.includes(seedIds.chefBEventId)
    expect(isBlocked, "Chef A should not reach Chef B's AAR page").toBeTruthy()
  })

  test('Chef B event data is NOT visible in Chef A events list', async ({ page, seedIds }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    // Chef B's event is named "TEST Chef B Private Dinner"
    const chefBEventText = await page
      .getByText('Chef B Private Dinner')
      .first()
      .isVisible()
      .catch(() => false)
    expect(chefBEventText, "Chef B's event should not appear in Chef A's events list").toBeFalsy()
  })
})

// ─── Client Isolation ─────────────────────────────────────────────────────────

test.describe('Multi-Tenant Isolation — Clients', () => {
  test('Chef A cannot view Chef B client detail page', async ({ page, seedIds }) => {
    const resp = await page.goto(`/clients/${seedIds.chefBClientId}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    const url = page.url()
    const isBlocked = status === 404 || status === 403 || !url.includes(seedIds.chefBClientId)
    expect(isBlocked, `Chef A must not see Chef B's client (${seedIds.chefBClientId})`).toBeTruthy()
  })

  test('Chef B client is NOT visible in Chef A clients list', async ({ page, seedIds }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    // Chef B's client is named "TEST - Chef B Client E2E"
    const chefBClientText = await page
      .getByText('Chef B Client E2E')
      .first()
      .isVisible()
      .catch(() => false)
    expect(
      chefBClientText,
      "Chef B's client should not appear in Chef A's clients list"
    ).toBeFalsy()
  })
})

// ─── API Isolation ────────────────────────────────────────────────────────────

test.describe('Multi-Tenant Isolation — API Endpoints', () => {
  test('Chef A cannot fetch Chef B event document via API', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/events/${seedIds.chefBEventId}/documents/invoice`)
    // Should return 404 or 403 — NOT a 200 with Chef B's data
    expect(resp.status()).not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })

  test('Chef A cannot fetch Chef B event receipt via API', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/financial-summary/${seedIds.chefBEventId}`)
    expect(resp.status()).not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })

  test('/api/v1/events returns only Chef A events (not Chef B)', async ({ page, seedIds }) => {
    const resp = await page.request.get('/api/v1/events')
    if (resp.status() !== 200) {
      // API may not be implemented — skip this assertion
      expect(resp.status()).toBeLessThan(500)
      return
    }

    const body = await resp.json().catch(() => null)
    if (!body) return

    const events = Array.isArray(body) ? body : (body.events ?? body.data ?? [])
    const chefBEventFound = events.some((e: { id?: string }) => e.id === seedIds.chefBEventId)
    expect(chefBEventFound, "Chef A's events API should not return Chef B's event").toBeFalsy()
  })

  test('/api/v1/clients returns only Chef A clients (not Chef B)', async ({ page, seedIds }) => {
    const resp = await page.request.get('/api/v1/clients')
    if (resp.status() !== 200) {
      expect(resp.status()).toBeLessThan(500)
      return
    }

    const body = await resp.json().catch(() => null)
    if (!body) return

    const clients = Array.isArray(body) ? body : (body.clients ?? body.data ?? [])
    const chefBClientFound = clients.some((c: { id?: string }) => c.id === seedIds.chefBClientId)
    expect(chefBClientFound, "Chef A's clients API should not return Chef B's client").toBeFalsy()
  })
})

// ─── Dashboard Isolation ──────────────────────────────────────────────────────

test.describe('Multi-Tenant Isolation — Dashboard', () => {
  test('Chef A dashboard does not show Chef B data', async ({ page, seedIds }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()

    // Chef B's identifiable data should not appear on Chef A's dashboard
    const chefBDataVisible =
      bodyText.includes('Chef B Client E2E') ||
      bodyText.includes('Chef B Private Dinner') ||
      bodyText.includes(seedIds.chefBId)

    expect(chefBDataVisible, "Chef A's dashboard should not show Chef B's data").toBeFalsy()
  })

  test('Chef A finance page does not include Chef B transactions', async ({ page, seedIds }) => {
    await page.goto('/finance')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    const chefBDataVisible = bodyText.includes(seedIds.chefBId)
    expect(
      chefBDataVisible,
      "Chef A's finance page should not reference Chef B's tenant ID"
    ).toBeFalsy()
  })
})

// ─── No Errors During Isolation Attempts ──────────────────────────────────────

test.describe('Multi-Tenant Isolation — No Server Errors', () => {
  test('All Chef B URL access attempts return structured errors, not 500s', async ({
    page,
    seedIds,
  }) => {
    const chefBUrls = [
      `/events/${seedIds.chefBEventId}`,
      `/events/${seedIds.chefBEventId}/dop`,
      `/events/${seedIds.chefBEventId}/financial`,
      `/clients/${seedIds.chefBClientId}`,
    ]

    for (const url of chefBUrls) {
      const resp = await page.goto(url)
      const status = resp?.status() ?? 0
      expect(status, `${url} should not return a 500 server error`).not.toBe(500)
    }
  })

  test('Accessing Chef B data does not corrupt Chef A session', async ({ page, seedIds }) => {
    // Try to access Chef B's event
    await page.goto(`/events/${seedIds.chefBEventId}`)
    await page.waitForLoadState('networkidle')

    // Then navigate to Chef A's own events — session must still work
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})
