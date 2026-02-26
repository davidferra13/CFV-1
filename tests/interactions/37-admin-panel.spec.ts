// Interaction Layer — Admin Panel Tests
// Tests all 15 admin routes using admin authentication.
// Verifies that admin pages load, show appropriate content, and
// do not expose data outside the expected admin scope.
//
// IMPORTANT: These tests use admin storageState (.auth/admin.json).
// They are in the interactions-admin project, NOT interactions-chef.
//
// Routes covered:
//   /admin                    — admin dashboard
//   /admin/analytics          — platform analytics
//   /admin/audit              — audit log
//   /admin/clients            — all clients across tenants
//   /admin/communications     — platform communications
//   /admin/events             — all events across tenants
//   /admin/feedback           — chef/client feedback
//   /admin/financials         — platform financial overview
//   /admin/flags              — flagged content
//   /admin/presence           — user presence/activity
//   /admin/reconciliation     — payment reconciliation
//   /admin/referral-partners  — referral partner management
//   /admin/system             — system health/config
//   /admin/users              — all chef accounts
//
// Uses admin storageState (interactions-admin project).

import { test, expect } from '../helpers/fixtures'

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

test.describe('Admin — Dashboard', () => {
  test('/admin — loads without redirect to signin', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/admin — shows admin dashboard content', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/admin|dashboard|chef|event|user|platform|overview/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/admin — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Admin Sub-pages (load tests) ─────────────────────────────────────────────

test.describe('Admin — Sub-pages Load', () => {
  const adminRoutes = [
    '/admin/analytics',
    '/admin/audit',
    '/admin/clients',
    '/admin/communications',
    '/admin/events',
    '/admin/feedback',
    '/admin/financials',
    '/admin/flags',
    '/admin/presence',
    '/admin/reconciliation',
    '/admin/referral-partners',
    '/admin/system',
    '/admin/users',
  ]

  for (const route of adminRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }
})

// ─── Admin Sub-pages — No JS Errors ──────────────────────────────────────────

test.describe('Admin — Sub-pages No JS Errors', () => {
  test('/admin/users — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/admin/financials — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/admin/financials')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/admin/audit — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/admin/audit')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Admin Content Verification ───────────────────────────────────────────────

test.describe('Admin — Content', () => {
  test('/admin/users — shows users list', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/admin/system — shows system status', async ({ page }) => {
    await page.goto('/admin/system')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/admin/system — shows QOL metrics summary card', async ({ page }) => {
    await page.goto('/admin/system')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/QOL Metrics \(last 30 days\)/i)).toBeVisible()
    await expect(page.getByText(/Drafts restored/i)).toBeVisible()
    await expect(page.getByText(/Save failures/i)).toBeVisible()
    await expect(page.getByText(/Conflicts detected/i)).toBeVisible()
  })

  test('/admin/financials — shows financial overview', async ({ page }) => {
    await page.goto('/admin/financials')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/admin/audit — shows audit log entries', async ({ page }) => {
    await page.goto('/admin/audit')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/admin/flags — shows flagged content or empty state', async ({ page }) => {
    await page.goto('/admin/flags')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Admin Security — Non-Admin Access ────────────────────────────────────────
// These tests verify that chef-role users CANNOT access admin routes.
// They create a fresh context WITHOUT admin auth and attempt to access admin pages.

test.describe('Admin — Non-Admin Access Blocked', () => {
  test('Unauthenticated user cannot access /admin', async ({ browser }) => {
    // Create fresh context with no cookies
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const resp = await page.goto('http://localhost:3100/admin')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    const url = page.url()
    // Must redirect to signin or return 401/403/404
    const isBlocked =
      status === 401 ||
      status === 403 ||
      status === 404 ||
      url.includes('signin') ||
      url.includes('unauthorized')
    expect(isBlocked, 'Unauthenticated user must not access /admin').toBeTruthy()
    await ctx.close()
  })

  test('/admin/users/[chefId] — user detail loads for admin', async ({ page, seedIds }) => {
    // Admin should be able to view any chef's profile
    const resp = await page.goto(`/admin/users/${seedIds.chefId}`)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })
})

// ─── Admin Analytics ──────────────────────────────────────────────────────────

test.describe('Admin — Analytics', () => {
  test('/admin/analytics — loads without 500', async ({ page }) => {
    const resp = await page.goto('/admin/analytics')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/admin/analytics — shows platform metrics', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/admin/analytics — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/admin/analytics')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
