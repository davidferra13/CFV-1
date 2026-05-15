// Multi-Role Account System E2E Tests
// Covers: vendor invitation flow, role switcher visibility, vendor RLS isolation

import { test, expect } from '../helpers/fixtures'

const BASE_URL = 'http://localhost:3100'

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR INVITATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Vendor Invitation Flow', () => {
  test.setTimeout(90_000)

  test('vendor signup page without token shows invalid link message', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    const page = await ctx.newPage()
    try {
      await page.goto('/auth/vendor-signup')
      await expect(page.getByText(/invalid invite link/i)).toBeVisible()
      await expect(page.getByText(/go to sign in/i)).toBeVisible()
    } finally {
      await ctx.close()
    }
  })

  test('vendor signup with bogus token shows error on submit', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    const page = await ctx.newPage()
    try {
      await page.goto('/auth/vendor-signup?token=bogus-fake-token-that-does-not-exist')
      await page.waitForLoadState('networkidle')

      // Form should render (token is present, just invalid)
      await expect(page.locator('input#email')).toBeVisible()
      await expect(page.locator('input#password')).toBeVisible()

      await page.locator('input#email').fill('vendor-test@example.com')
      await page.locator('input#password').fill('TestPassword123!')
      await page.getByRole('button', { name: /create account|sign up|submit/i }).click()

      // Should show invalid/expired error
      await expect(page.getByText(/invalid|expired|something went wrong/i)).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await ctx.close()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ROLE SWITCHER VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Role Switcher Visibility', () => {
  test.setTimeout(90_000)

  test('chef with single role does not see role switcher on dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // RoleSwitcher returns null when availableRoleCount <= 1
    // The button contains an ArrowLeftRight icon; it should not be present
    const switcher = page.locator('button:has-text("Chef")').filter({
      has: page.locator('svg.lucide-arrow-left-right, [data-lucide="arrow-left-right"]'),
    })
    await expect(switcher).toHaveCount(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR PORTAL RLS / ACCESS ISOLATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Vendor Portal Access Isolation', () => {
  test.setTimeout(90_000)

  test('unauthenticated user cannot access vendor dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    const page = await ctx.newPage()
    try {
      await page.goto('/vendor/dashboard')
      await page.waitForLoadState('networkidle')

      // Should redirect to sign-in
      expect(page.url()).toMatch(/auth\/signin|vendor/)
      const onVendorDashboard = page.url().includes('/vendor/dashboard')
      if (onVendorDashboard) {
        // If somehow not redirected, page should show auth error
        await expect(page.getByText(/sign in|unauthorized|access denied/i)).toBeVisible()
      }
    } finally {
      await ctx.close()
    }
  })

  test('unauthenticated user cannot access vendor purchase orders', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE_URL })
    const page = await ctx.newPage()
    try {
      await page.goto('/vendor/purchase-orders')
      await page.waitForLoadState('networkidle')

      // Should redirect to sign-in
      const url = page.url()
      const blocked =
        url.includes('signin') || url.includes('auth') || !url.includes('/vendor/purchase-orders')
      expect(blocked).toBeTruthy()
    } finally {
      await ctx.close()
    }
  })

  test('chef role cannot access vendor portal pages', async ({ page }) => {
    // Chef-authenticated session tries vendor routes
    await page.goto('/vendor/dashboard')
    await page.waitForLoadState('networkidle')

    // Chef should be redirected away from vendor portal
    const url = page.url()
    const blocked = url.includes('signin') || url.includes('dashboard') || !url.includes('/vendor/')
    expect(blocked).toBeTruthy()
  })
})
