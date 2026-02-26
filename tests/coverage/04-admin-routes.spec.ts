// Coverage Layer — Admin Routes
// Visits every admin-panel URL authenticated as the platform admin.
// Requires ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in .env.local.
// If not set, all tests are skipped gracefully (admin.json will have empty cookies).
//
// Run: npm run test:coverage (includes admin project)

import { test, expect } from '../helpers/fixtures'
import { readFileSync } from 'fs'

// ─── Skip guard ───────────────────────────────────────────────────────────────
// If admin credentials are not configured, all tests in this file skip.

function adminAuthConfigured(): boolean {
  try {
    const raw = readFileSync('.auth/admin.json', 'utf-8')
    const state = JSON.parse(raw)
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function assertAdminPageLoads(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string
) {
  test.skip(
    !adminAuthConfigured(),
    'Admin credentials not configured — set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in .env.local'
  )

  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
  const status = response?.status() ?? 0

  expect(status, `[admin] ${url} returned HTTP ${status}`).toBeLessThan(500)
  expect(errors, `[admin] ${url} had JS errors: ${errors.join('; ')}`).toHaveLength(0)

  const currentUrl = page.url()
  expect(currentUrl, `[admin] ${url} redirected to login`).not.toMatch(/auth\/signin/)

  const bodyText = await page.locator('body').innerText()
  expect(bodyText.trim().length, `[admin] ${url} rendered blank`).toBeGreaterThan(10)
}

// ─── Admin Pages ──────────────────────────────────────────────────────────────

test.describe('Admin — Core Dashboard', () => {
  test('/admin — platform overview', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin')
  })
})

test.describe('Admin — Users & Chefs', () => {
  test('/admin/users — all chef accounts', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/users')
  })
})

test.describe('Admin — Platform Data', () => {
  test('/admin/clients — all clients across platform', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/clients')
  })

  test('/admin/events — all events across platform', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/events')
  })
})

test.describe('Admin — Analytics & Finance', () => {
  test('/admin/analytics — platform analytics', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/analytics')
  })

  test('/admin/financials — platform revenue/GMV', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/financials')
  })

  test('/admin/reconciliation — payment reconciliation', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/reconciliation')
  })
})

test.describe('Admin — Operations', () => {
  test('/admin/communications — broadcast messages', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/communications')
  })

  test('/admin/audit — audit log', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/audit')
  })

  test('/admin/feedback — user feedback', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/feedback')
  })

  test('/admin/system — system health', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/system')
  })

  test('/admin/presence — live user sessions', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/presence')
  })

  test('/admin/flags — feature flags', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/flags')
  })

  test('/admin/referral-partners — referral partner network', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/referral-partners')
  })
})
