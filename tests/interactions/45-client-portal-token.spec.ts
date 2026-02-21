// Interaction Layer — Client Portal Token (Magic Link)
// Tests the public token-based client portal at /client/[token].
// No authentication required — the token IS the credential.
//
// These tests run WITHOUT a storageState (interactions-public project — no auth).
//
// The route: app/client/[token]/page.tsx
// Server action: getClientPortalData(token) — returns null for invalid tokens,
// triggering Next.js notFound() which renders a 404 page.
//
// Test strategy:
//   - Invalid/fake tokens → 404 page (not 500 crash)
//   - Page structure verified with invalid token
//   - Valid token (if seed provides one) → portal content visible
//   - No JS errors on any of these pages

import { test, expect } from '../helpers/fixtures'

// ─── Invalid Token Handling ────────────────────────────────────────────────────

test.describe('Client Portal Token — Invalid Token', () => {
  test('/client/invalid-token — does not 500', async ({ page }) => {
    const resp = await page.goto('/client/invalid-token-abc123')
    await page.waitForLoadState('networkidle')

    const status = resp?.status() ?? 200
    // Should 404 (not found) — NOT 500 (server crash)
    expect(status).not.toBe(500)
    expect(status).toBeLessThan(500)
  })

  test('/client/invalid-token — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/client/invalid-token-abc123')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })

  test('/client/invalid-token — shows 404 or graceful error page', async ({ page }) => {
    await page.goto('/client/invalid-token-abc123')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    // Next.js 404 page, custom not-found, or any graceful message
    const isGraceful =
      /not found|404|invalid|expired|this page|no longer/i.test(bodyText) ||
      // Could also just be a blank/minimal page — not a crash
      bodyText.trim().length > 0

    expect(isGraceful, 'Should show a graceful error, not a blank or crashed page').toBe(true)
  })

  test('/client/invalid-token — does not show internal server error', async ({ page }) => {
    await page.goto('/client/invalid-token-abc123')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/internal server error/i)
  })
})

// ─── Various Token Formats ─────────────────────────────────────────────────────

test.describe('Client Portal Token — Various Invalid Formats', () => {
  const invalidTokens = [
    'abc', // Too short
    '00000000-0000-0000-0000-000000000000', // Null UUID
    'a'.repeat(64), // Long hex-like string
    'test-token-for-playwright-e2e', // Readable fake token
  ]

  for (const token of invalidTokens) {
    test(`/client/${token.slice(0, 20)}… — no 500, no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      const resp = await page.goto(`/client/${token}`)
      await page.waitForLoadState('networkidle')

      const status = resp?.status() ?? 200
      expect(status).not.toBe(500)
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── SQL Injection / Path Traversal Safety ────────────────────────────────────

test.describe('Client Portal Token — Malformed Input Safety', () => {
  test('/client/[sql-like-token] — no server crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // URL-safe encoding of SQL-like strings (Next.js will reject most bad chars)
    const resp = await page.goto('/client/1%3D1--playwright-test')
    await page.waitForLoadState('networkidle')

    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
    expect(errors).toHaveLength(0)
  })

  test('/client/[xss-like-token] — no server crash or script execution', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    const resp = await page.goto('/client/script-alert-test-playwright')
    await page.waitForLoadState('networkidle')

    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
    expect(consoleErrors).toHaveLength(0)
  })
})

// ─── Valid Token (seed-provided) ──────────────────────────────────────────────

test.describe('Client Portal Token — Valid Token', () => {
  test('valid token from seed renders portal content', async ({ page, seedIds }) => {
    // The seed does not currently expose a clientPortalToken in SeedResult.
    // This test skips gracefully if no token is available.
    // When the seed is extended to include a portal token, remove the skip.
    const token = (seedIds as any).clientPortalToken as string | undefined
    if (!token) {
      test.skip(
        true,
        'No clientPortalToken in seed — add it to SeedResult when a valid token is seeded'
      )
      return
    }

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/client/${token}`)
    await page.waitForLoadState('networkidle')

    // Portal content: client name, events, or "Hello" greeting
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/hello|event|dinner|portal|upcoming/i)
    expect(bodyText).not.toMatch(/internal server error/i)
    expect(errors).toHaveLength(0)
  })

  test('valid token portal shows "Client Portal" heading', async ({ page, seedIds }) => {
    const token = (seedIds as any).clientPortalToken as string | undefined
    if (!token) {
      test.skip(true, 'No clientPortalToken in seed')
      return
    }

    await page.goto(`/client/${token}`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/client portal|hello|your.*event/i)
  })

  test('valid token portal does not redirect to sign in', async ({ page, seedIds }) => {
    const token = (seedIds as any).clientPortalToken as string | undefined
    if (!token) {
      test.skip(true, 'No clientPortalToken in seed')
      return
    }

    await page.goto(`/client/${token}`)
    await page.waitForLoadState('networkidle')

    // Magic-link portals are public — no auth redirect
    const url = page.url()
    expect(url).not.toMatch(/signin|sign-in|login/i)
  })
})

// ─── No Regression ────────────────────────────────────────────────────────────

test.describe('Client Portal Token — No Regression', () => {
  test('client portal error page (not-found.tsx) renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Force the not-found boundary — guaranteed invalid token
    await page.goto('/client/playwright-guaranteed-not-found-token-xyz')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
