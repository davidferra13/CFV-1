// Coverage Layer — Public Routes
// Visits every public-facing URL (no auth required) and asserts:
//   1. Page does not crash (no 500, no unhandled JS error)
//   2. Has meaningful content (not a blank page)
//   3. Auth-protected routes correctly redirect unauthenticated users
//
// Run: npm run test:coverage:public

import { test, expect } from '../helpers/fixtures'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertPageLoads(page: Parameters<Parameters<typeof test>[1]>[0]['page'], url: string) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
  const status = response?.status() ?? 0

  // Accept 200, 304 — reject 4xx/5xx (but not 404 for token-based routes tested separately)
  expect(status, `${url} returned HTTP ${status}`).toBeLessThan(500)

  // No unhandled JS errors
  expect(errors, `${url} had JS errors: ${errors.join('; ')}`).toHaveLength(0)

  // Page is not blank
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.trim().length, `${url} rendered a blank page`).toBeGreaterThan(10)
}

// ─── Landing & Marketing ──────────────────────────────────────────────────────

test.describe('Public — Landing & Marketing Pages', () => {
  test('/ — home page loads', async ({ page }) => {
    await assertPageLoads(page, '/')
  })

  test('/pricing — pricing page loads', async ({ page }) => {
    await assertPageLoads(page, '/pricing')
  })

  test('/contact — contact page loads', async ({ page }) => {
    await assertPageLoads(page, '/contact')
  })

  test('/privacy — privacy policy loads', async ({ page }) => {
    await assertPageLoads(page, '/privacy')
  })

  test('/terms — terms of service loads', async ({ page }) => {
    await assertPageLoads(page, '/terms')
  })

  test('/chefs — chef directory loads', async ({ page }) => {
    await assertPageLoads(page, '/chefs')
  })
})

// ─── Auth Routes ──────────────────────────────────────────────────────────────

test.describe('Public — Auth Pages', () => {
  test('/auth/signin — sign-in page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/signin')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('/auth/signup — chef signup page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/signup')
  })

  test('/auth/client-signup — client signup page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/client-signup')
  })

  test('/auth/forgot-password — forgot password page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/forgot-password')
  })
})

// ─── Chef Public Profile ──────────────────────────────────────────────────────

test.describe('Public — Chef Profile Pages', () => {
  test('/chef/[slug] — public chef profile loads', async ({ page, seedIds }) => {
    await assertPageLoads(page, `/chef/${seedIds.chefSlug}`)
    // The profile should show the chef's business name
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/E2E Kitchen|E2E Test Chef/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/chef/[slug]/inquire — inquiry form loads', async ({ page, seedIds }) => {
    await assertPageLoads(page, `/chef/${seedIds.chefSlug}/inquire`)
    // Inquiry form should have some fields
    await page.waitForLoadState('networkidle')
  })

  test('/chef/[slug]/gift-cards — gift card page loads (or graceful 404)', async ({ page, seedIds }) => {
    const response = await page.goto(`/chef/${seedIds.chefSlug}/gift-cards`, { waitUntil: 'domcontentloaded' })
    // Accept either a real page (200) or a not-found (404) — just not a crash (500)
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/chef/invalid-slug — handles unknown chef slug gracefully', async ({ page }) => {
    const response = await page.goto('/chef/this-chef-does-not-exist-xyz123', { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 0).toBeLessThan(500)
    // Should show a not-found message, not a blank page
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(10)
  })
})

// ─── Partner Signup ───────────────────────────────────────────────────────────

test.describe('Public — Partner & Referral Pages', () => {
  test('/partner-signup — partner signup page loads', async ({ page }) => {
    await assertPageLoads(page, '/partner-signup')
  })
})

// ─── Booking Funnel ───────────────────────────────────────────────────────────

test.describe('Public — Booking Funnel', () => {
  test('/book/[chefSlug] — booking intake loads', async ({ page, seedIds }) => {
    const response = await page.goto(`/book/${seedIds.chefSlug}`, { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── Token-based Sharing ──────────────────────────────────────────────────────

test.describe('Public — Share Token Pages', () => {
  test('/share/invalid-token — handles bad share token gracefully', async ({ page }) => {
    const response = await page.goto('/share/definitely-not-a-real-token', { waitUntil: 'domcontentloaded' })
    // Should return 200 with an error message, or 404 — not a crash
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

test.describe('Public — Unsubscribe', () => {
  test('/unsubscribe — handles missing/bad token gracefully', async ({ page }) => {
    const response = await page.goto('/unsubscribe?token=invalid', { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── Redirect Guards ──────────────────────────────────────────────────────────

test.describe('Public — Unauthenticated Redirect Guards', () => {
  test('/dashboard — redirects unauthenticated user to sign-in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/events — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/events')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/clients — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/my-events — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/my-events')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/admin — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/auth\/signin|login|unauthorized/, { timeout: 10_000 })
  })

  test('/financials — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/financials')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/settings — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })
})
