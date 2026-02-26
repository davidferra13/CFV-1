// Launch Readiness Audit — Public Pages
// Tests: landing page, pricing, privacy, terms, contact, chef directory, auth pages
// No authentication — these are what potential customers see first

import { test, expect } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'

test.describe('Landing Page', () => {
  test('loads with title and hero content', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(ROUTES.home)
    await expect(page).toHaveTitle(/ChefFlow/i)
    // Hero section should have a heading
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
    // Should have CTAs (sign up, pricing, or similar)
    const ctaLinks = page.getByRole('link', { name: /sign up|get started|pricing|try free/i })
    const ctaCount = await ctaLinks.count()
    expect(ctaCount).toBeGreaterThanOrEqual(1)

    expect(errors).toHaveLength(0)
  })
})

test.describe('Pricing Page', () => {
  test('loads with pricing information', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(ROUTES.pricing)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    // Should mention price
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/\$29|\$\d+/i)

    expect(errors).toHaveLength(0)
  })
})

test.describe('Privacy Page', () => {
  test('loads with privacy content', async ({ page }) => {
    await page.goto(ROUTES.privacy)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).toContain('privacy')
  })
})

test.describe('Terms Page', () => {
  test('loads with terms content', async ({ page }) => {
    await page.goto(ROUTES.terms)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).toContain('terms')
  })
})

test.describe('Contact Page', () => {
  test('renders contact form with all fields', async ({ page }) => {
    await page.goto(ROUTES.contact)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    // Form fields (custom Input component has no htmlFor linkage — use name attrs)
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    // Submit button
    await expect(
      page.getByRole('button', { name: /send message|submit|contact/i }).first()
    ).toBeVisible()
  })
})

test.describe('Chef Directory', () => {
  test('/chefs loads and shows chef cards or empty state', async ({ page }) => {
    const resp = await page.goto('/chefs')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should have content — either chef cards or an empty state message
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

test.describe('Chef Public Profile', () => {
  test('chef profile page loads for seed chef', async ({ page }) => {
    // Read seed IDs to get chef slug
    const fs = await import('fs')
    const seedRaw = fs.readFileSync('.auth/seed-ids.json', 'utf-8')
    const seedIds = JSON.parse(seedRaw)
    const resp = await page.goto(`/chef/${seedIds.chefSlug}`)
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

test.describe('Auth Pages', () => {
  test('sign-in page renders form', async ({ page }) => {
    await page.goto(ROUTES.signIn)
    // Custom Input component has no htmlFor linkage — use type selectors
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  })

  test('sign-up page renders form', async ({ page }) => {
    await page.goto(ROUTES.signUp)
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create account|sign up|register/i }).first()
    ).toBeVisible()
  })
})

test.describe('No Server Errors on Public Pages', () => {
  const publicRoutes = [
    ROUTES.home,
    ROUTES.pricing,
    ROUTES.privacy,
    ROUTES.terms,
    ROUTES.contact,
    ROUTES.signIn,
    ROUTES.signUp,
  ]

  for (const route of publicRoutes) {
    test(`${route} returns 200 (not 500)`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
