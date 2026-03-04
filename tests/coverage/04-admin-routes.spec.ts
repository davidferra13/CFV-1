// Coverage Layer â€” Admin Routes
// Visits every admin-panel URL authenticated as the platform admin.
// Requires ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in .env.local.
// If not set, all tests are skipped gracefully (admin.json will have empty cookies).
//
// Run: npm run test:coverage (includes admin project)

import { test, expect } from '../helpers/fixtures'
import { readFileSync } from 'fs'

async function gotoAdminPage(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string
) {
  let lastResponse: Awaited<ReturnType<typeof page.goto>> = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      lastResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      const status = lastResponse?.status() ?? 0
      if (status >= 500 && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      const redirectedToSignIn = /auth\/signin/i.test(page.url())
      if (redirectedToSignIn && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      return lastResponse
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const retryable = /ERR_ABORTED|ERR_CONNECTION|timeout|frame was detached/i.test(message)
      if (!retryable || attempt === 2) throw error
      await page.waitForTimeout(400)
    }
  }
  return lastResponse
}

// â”€â”€â”€ Skip guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const ADMIN_AUTH_REQUIRED = process.env.COVERAGE_REQUIRE_ADMIN === 'true'

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function assertAdminPageLoads(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string
) {
  const hasAdminAuth = adminAuthConfigured()
  if (ADMIN_AUTH_REQUIRED) {
    expect(
      hasAdminAuth,
      'Admin coverage is required. Configure ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in .env.local.'
    ).toBeTruthy()
  } else {
    test.skip(
      !hasAdminAuth,
      'Admin credentials not configured - set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in .env.local'
    )
  }

  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  const response = await gotoAdminPage(page, url)
  const status = response?.status() ?? 0

  expect(status, `[admin] ${url} returned HTTP ${status}`).toBeLessThan(500)
  expect(errors, `[admin] ${url} had JS errors: ${errors.join('; ')}`).toHaveLength(0)

  const currentUrl = page.url()
  expect(currentUrl, `[admin] ${url} redirected to login`).not.toMatch(/auth\/signin/)

  const bodyText = await page.locator('body').innerText()
  expect(bodyText.trim().length, `[admin] ${url} rendered blank`).toBeGreaterThan(10)
}

// â”€â”€â”€ Admin Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Admin â€” Core Dashboard', () => {
  test('/admin â€” platform overview', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin')
  })
})

test.describe('Admin â€” Users & Chefs', () => {
  test('/admin/users â€” all chef accounts', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/users')
  })
})

test.describe('Admin â€” Platform Data', () => {
  test('/admin/clients â€” all clients across platform', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/clients')
  })

  test('/admin/events â€” all events across platform', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/events')
  })
})

test.describe('Admin â€” Analytics & Finance', () => {
  test('/admin/analytics â€” platform analytics', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/analytics')
  })

  test('/admin/financials â€” platform revenue/GMV', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/financials')
  })

  test('/admin/reconciliation â€” payment reconciliation', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/reconciliation')
  })
})

test.describe('Admin â€” Operations', () => {
  test('/admin/communications â€” broadcast messages', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/communications')
  })

  test('/admin/audit â€” audit log', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/audit')
  })

  test('/admin/feedback â€” user feedback', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/feedback')
  })

  test('/admin/system â€” system health', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/system')
  })

  test('/admin/presence â€” live user sessions', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/presence')
  })

  test('/admin/flags â€” feature flags', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/flags')
  })

  test('/admin/referral-partners â€” referral partner network', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/referral-partners')
  })
})

test.describe('Admin - Experience & Directory', () => {
  test('/admin/animations - animation preview tooling', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/animations')
  })

  test('/admin/cannabis - cannabis admin controls', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/cannabis')
  })

  test('/admin/directory - chef directory management', async ({ page }) => {
    await assertAdminPageLoads(page, '/admin/directory')
  })
})

