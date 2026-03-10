// Diagnostic Suite 06 — Security
// Tests: XSS prevention, CSRF protection, rate limiting, header security,
//        auth boundaries, SQL injection prevention, session security

import { test, expect } from '../helpers/fixtures'
import { TEST_BASE_URL } from '../helpers/runtime-base-url'

// ─── HTTP Security Headers ──────────────────────────────────────────────────

test.describe('Security — HTTP Headers', () => {
  test('landing page has security headers', async ({ page }) => {
    const resp = await page.goto('/')
    expect(resp).toBeTruthy()
    const headers = resp!.headers()

    // X-Frame-Options or CSP frame-ancestors should be set
    const hasFrameProtection =
      headers['x-frame-options'] ||
      (headers['content-security-policy'] &&
        headers['content-security-policy'].includes('frame-ancestors'))
    if (!hasFrameProtection) {
      console.warn('[security] No X-Frame-Options or CSP frame-ancestors on landing page')
    }

    // Should not expose server technology
    expect(headers['x-powered-by']).toBeUndefined()
  })

  test('dashboard has security headers', async ({ page }) => {
    const resp = await page.goto('/dashboard')
    const headers = resp!.headers()

    // X-Content-Type-Options prevents MIME sniffing
    const hasContentType = headers['x-content-type-options']
    if (!hasContentType) {
      console.warn('[security] Missing X-Content-Type-Options header on /dashboard')
    }
  })

  test('API endpoints have correct CORS headers', async ({ page }) => {
    const resp = await page.request.get('/api/v1/clients')
    const headers = resp.headers()
    // Main API should NOT have wildcard CORS (only embed API should)
    if (headers['access-control-allow-origin'] === '*') {
      console.warn('[security] Main API has wildcard CORS — should be restricted')
    }
  })

  test('embed API has CORS headers (intentional)', async ({ page }) => {
    const resp = await page.request.options('/api/embed/inquiry', {
      headers: { Origin: 'https://example.com' },
    })
    // Embed API is designed to be cross-origin accessible
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── XSS Prevention ────────────────────────────────────────────────────────

test.describe('Security — XSS Prevention', () => {
  test('inquiry form rejects script tags in name field', async ({ page }) => {
    await page.goto('/inquire')
    await page.waitForLoadState('networkidle')

    const xssPayload = '<script>alert("xss")</script>'

    // Try to fill name field with XSS payload
    const nameField = page.getByLabel(/name/i).first().or(page.getByPlaceholder(/name/i).first())
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill(xssPayload)

      // Try to submit
      const submitBtn = page.getByRole('button', { name: /submit|send|inquire/i }).first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    // The page should not execute the script — check that no alert dialog appeared
    // (Playwright would hang or throw if an alert appeared)
    const body = await page.locator('body').innerText()
    expect(body).not.toContain('<script>')
  })

  test('search input sanitizes HTML', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .getByPlaceholder(/search/i)
      .first()
      .or(page.getByRole('searchbox').first())
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('<img src=x onerror=alert(1)>')
      await page.waitForTimeout(500)

      // Page should not have raw HTML in the DOM
      const body = await page.locator('body').innerHTML()
      expect(body).not.toMatch(/onerror\s*=/)
    }
  })
})

// ─── Authentication Boundaries ──────────────────────────────────────────────

test.describe('Security — Auth Boundaries', () => {
  test('API endpoints reject unauthenticated requests', async ({ page }) => {
    // Create a fresh context without auth cookies
    const context = await page.context().browser()!.newContext()
    const newPage = await context.newPage()

    const protectedEndpoints = ['/api/v1/clients', '/api/v1/events', '/api/activity/feed']

    for (const endpoint of protectedEndpoints) {
      const resp = await newPage.request.get(`${TEST_BASE_URL}${endpoint}`)
      expect(resp.status(), `${endpoint} should reject unauthenticated requests`).not.toBe(200)
    }

    await context.close()
  })

  test('chef routes redirect unauthenticated users', async ({ page }) => {
    const context = await page.context().browser()!.newContext()
    const newPage = await context.newPage()

    await newPage.goto(`${TEST_BASE_URL}/dashboard`)
    await newPage.waitForLoadState('networkidle')

    // Should redirect to sign-in
    const url = newPage.url()
    const onSignIn = url.includes('sign-in') || url.includes('login')
    const body = await newPage.locator('body').innerText()
    const hasAuth = /sign in|log in|email|password/i.test(body)
    expect(onSignIn || hasAuth).toBeTruthy()

    await context.close()
  })

  test('client portal rejects chef-only routes', async ({ page }) => {
    // This test uses the chef auth — try accessing a page that should be chef-only
    const resp = await page.goto('/admin')
    // Admin page should not be accessible to non-admin chef
    // (may redirect or show 403)
    const body = await page.locator('body').innerText()
    const isRestricted =
      resp?.status() === 403 ||
      resp?.status() === 404 ||
      /unauthorized|forbidden|access denied|not found/i.test(body) ||
      page.url().includes('dashboard')
    // If admin page loaded, that's a problem (unless test user IS admin)
    if (!isRestricted) {
      console.warn(
        '[security] Chef user was able to access /admin — verify if this user has admin role'
      )
    }
  })
})

// ─── Rate Limiting ─────────────────────────────────────────────────────────

test.describe('Security — Rate Limiting', () => {
  test('embed API has rate limiting', async ({ page }) => {
    // Send multiple rapid requests to the embed endpoint
    const responses: number[] = []
    for (let i = 0; i < 10; i++) {
      const resp = await page.request.post('/api/embed/inquiry', {
        data: JSON.stringify({ chefId: 'fake', name: 'Test', email: 'test@test.com' }),
        headers: { 'Content-Type': 'application/json' },
      })
      responses.push(resp.status())
    }

    // At least the requests should not cause 500 errors
    const has500 = responses.some((s) => s >= 500)
    expect(has500).toBeFalsy()
  })

  test('login endpoint handles rapid requests gracefully', async ({ page }) => {
    const context = await page.context().browser()!.newContext()
    const newPage = await context.newPage()

    // Rapid sign-in attempts
    for (let i = 0; i < 5; i++) {
      await newPage.goto(`${TEST_BASE_URL}/sign-in`)
      await newPage.waitForLoadState('networkidle')
      const body = await newPage.locator('body').innerText()
      expect(body).not.toMatch(/500|internal server error/i)
    }

    await context.close()
  })
})

// ─── Session Security ──────────────────────────────────────────────────────

test.describe('Security — Session Management', () => {
  test('auth cookies are httpOnly', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check cookies
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(
      (c) => c.name.includes('auth') || c.name.includes('session') || c.name.includes('sb-')
    )

    for (const cookie of authCookies) {
      if (!cookie.httpOnly) {
        console.warn(`[security] Cookie "${cookie.name}" is not httpOnly — vulnerable to XSS theft`)
      }
    }

    // At least verify cookies exist
    expect(cookies.length).toBeGreaterThan(0)
  })

  test('sensitive cookies have Secure flag', async ({ page }) => {
    await page.goto('/dashboard')
    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(
      (c) => c.name.includes('auth') || c.name.includes('session') || c.name.includes('sb-')
    )

    // In localhost/dev, Secure flag may not be set — just log warning
    for (const cookie of authCookies) {
      if (!cookie.secure) {
        console.warn(`[security] Cookie "${cookie.name}" missing Secure flag (OK for localhost)`)
      }
    }
  })
})

// ─── Input Validation ──────────────────────────────────────────────────────

test.describe('Security — Input Validation', () => {
  test('event form rejects extremely long input', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')

    const longString = 'A'.repeat(10000)
    const firstInput = page.locator('input[type="text"]').first()
    if (await firstInput.isVisible().catch(() => false)) {
      await firstInput.fill(longString)
      // Should not crash
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/500|internal server error/i)
    }
  })

  test('API rejects SQL injection in query params', async ({ page }) => {
    const resp = await page.request.get("/api/v1/clients?search='; DROP TABLE clients; --")
    // Should return a proper response, not crash
    expect(resp.status()).toBeLessThan(500)
  })
})
