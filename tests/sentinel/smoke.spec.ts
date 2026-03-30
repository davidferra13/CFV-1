// T0: Smoke Tests - Site alive, sign-in works, dashboard renders, public pages respond
// Schedule: Every 4 hours on Pi
// Target time: < 60 seconds
// Read-only: Yes (no mutations)

import { test, expect } from '@playwright/test'
import { signInViaUI, measurePageLoad } from './helpers/sentinel-utils'

// Response time budgets (ms) - fail if page takes longer
const BUDGET = {
  public: 5_000, // Public pages should load within 5s
  authenticated: 8_000, // Auth pages within 8s (includes server-side data fetch)
  api: 2_000, // API endpoints within 2s
}

test.describe('T0: Smoke', () => {
  test('health endpoint responds', async ({ request }) => {
    const start = Date.now()
    const resp = await request.get('/api/sentinel/health')
    const elapsed = Date.now() - start
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.ok).toBe(true)
    expect(body.buildId).toBeTruthy()
    expect(body.timestamp).toBeTruthy()
    expect(elapsed).toBeLessThan(BUDGET.api)
  })

  test('SSL certificate is valid', async ({ request }) => {
    // Verify HTTPS works and cert is not expired
    const resp = await request.get('https://app.cheflowhq.com/api/sentinel/health', {
      timeout: 10_000,
    })
    expect(resp.status()).toBe(200)
  })

  test('homepage loads within budget', async ({ page }) => {
    const { durationMs } = await measurePageLoad(page, '/')
    await expect(page.locator('body')).toBeVisible()
    const text = await page.textContent('body')
    expect(text).toContain('ChefFlow')
    expect(durationMs).toBeLessThan(BUDGET.public)
  })

  test('discover page loads with listings', async ({ page }) => {
    const { durationMs } = await measurePageLoad(page, '/discover')
    await expect(page.locator('body')).toBeVisible()
    const text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(100)
    expect(durationMs).toBeLessThan(BUDGET.public)
  })

  test('sign-in page renders', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('agent can sign in', async ({ page }) => {
    await signInViaUI(page)
    const url = page.url()
    expect(url).toMatch(/\/(dashboard|onboarding|my-events|admin)/)
  })

  test('dashboard loads after sign-in', async ({ page }) => {
    await signInViaUI(page)
    // Dashboard should have visible content (not blank)
    await expect(page.locator('body')).toBeVisible()
    const styledElements = await page
      .locator('[class*="bg-"], [class*="text-"], nav, header')
      .count()
    expect(styledElements).toBeGreaterThan(0)
  })

  test('events page loads', async ({ page }) => {
    await signInViaUI(page)
    await page.goto('/events', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/\/(events|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('clients page loads', async ({ page }) => {
    await signInViaUI(page)
    await page.goto('/clients', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/\/(clients|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('inquiries page loads', async ({ page }) => {
    await signInViaUI(page)
    await page.goto('/inquiries', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/\/(inquiries|onboarding|dashboard)/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('book page loads (public)', async ({ page }) => {
    await page.goto('/book', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    const text = await page.textContent('body')
    expect(text!.length).toBeGreaterThan(50)
  })
})
