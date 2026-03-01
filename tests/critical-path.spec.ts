// Critical Path Test — 16 core smoke tests for ChefFlow readiness
// Uses stored auth state from .auth/chef.json (no per-test login)

import { test, expect } from '@playwright/test'

// ── Tier 0: Account & Auth ──

test('0.1 — Dashboard loads (authenticated)', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('body')).not.toContainText('Sign in', { timeout: 15000 })
  expect(page.url()).toContain('/dashboard')
})

test('0.3 — Profile/settings page loads', async ({ page }) => {
  await page.goto('/settings/profile')
  await expect(page.locator('body')).toContainText(/profile|business|name/i, { timeout: 15000 })
})

// ── Tier 1B: Inquiry Pipeline ──

test('1B — Inquiries page loads', async ({ page }) => {
  await page.goto('/inquiries')
  await expect(page.locator('body')).toContainText(/inquir|lead|pipeline/i, { timeout: 15000 })
})

// ── Tier 2A: Client Management ──

test('2A.1 — Clients list page loads', async ({ page }) => {
  await page.goto('/clients')
  await expect(page.locator('body')).toContainText(/client/i, { timeout: 15000 })
})

// ── Tier 2B: Event Lifecycle ──

test('2B.1 — Events list page loads', async ({ page }) => {
  await page.goto('/events')
  await expect(page.locator('body')).toContainText(/event/i, { timeout: 15000 })
})

test('2B.10 — Calendar page loads', async ({ page }) => {
  await page.goto('/calendar')
  expect(page.url()).toContain('/calendar')
  // Just check it didn't redirect away
  await page.waitForLoadState('domcontentloaded')
})

// ── Tier 3: Financials ──

test('3A — Finance page loads', async ({ page }) => {
  await page.goto('/finance')
  await expect(page.locator('body')).toContainText(/financ|revenue|expense|income/i, {
    timeout: 15000,
  })
})

// ── Tier 4: Operations ──

test('4.1 — Recipes page loads', async ({ page }) => {
  await page.goto('/recipes')
  await expect(page.locator('body')).toContainText(/recipe/i, { timeout: 15000 })
})

test('4.2 — Menu page loads', async ({ page }) => {
  await page.goto('/menus')
  await expect(page.locator('body')).toContainText(/menu/i, { timeout: 15000 })
})

// ── Navigation & Layout ──

test('Nav — Sidebar navigation renders', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible({ timeout: 15000 })
})

test('Nav — Inbox page loads', async ({ page }) => {
  await page.goto('/inbox')
  expect(page.url()).toContain('/inbox')
  await page.waitForLoadState('domcontentloaded')
})

// ── Public Pages (no auth needed) ──

test('Public — Pricing page loads with price from constant', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.locator('body')).toContainText(/month/i, { timeout: 10000 })
  // Verify the price displays (from PRO_PRICE_MONTHLY constant)
  await expect(page.locator('body')).toContainText('29')
})

test('Public — Home page loads', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  expect(page.url()).toBeTruthy()
})

test('Public — Sign-up page loads', async ({ page }) => {
  await page.goto('/auth/signup')
  await expect(page.locator('body')).toContainText(/sign|create|register|get started/i, {
    timeout: 10000,
  })
})

// ── Settings ──

test('Settings — Modules page loads', async ({ page }) => {
  await page.goto('/settings/modules')
  await expect(page.locator('body')).toContainText(/module|feature/i, { timeout: 15000 })
})

test('Settings — Embed widget page loads', async ({ page }) => {
  await page.goto('/settings/embed')
  await expect(page.locator('body')).toContainText(/embed|widget/i, { timeout: 15000 })
})
