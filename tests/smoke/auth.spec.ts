// Auth Smoke Tests
// Validates core auth flows work end-to-end
//
// NOTE: The <Input> component renders <label> without htmlFor association,
// so we use input[type] selectors rather than getByLabel.

import { test, expect } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'

test.describe('Authentication', () => {
  test.describe.configure({ timeout: 90_000 })

  test('home page loads', async ({ page }) => {
    await page.goto(ROUTES.home)
    await expect(page).toHaveTitle(/ChefFlow/i)
  })

  test('sign-in page renders email and password fields', async ({ page }) => {
    await page.goto(ROUTES.signIn, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 60_000 })
  })

  test('sign-in page has submit button', async ({ page }) => {
    await page.goto(ROUTES.signIn)
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })

  test('sign-up page renders email field', async ({ page }) => {
    await page.goto(ROUTES.signUp, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 60_000 })
  })

  test('unauthenticated user redirected from chef dashboard', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    await page.waitForURL(/auth\/signin|\/$/i, { timeout: 60_000 })
    const url = page.url()
    expect(url).toMatch(/auth\/signin|\/$/i)
  })

  test('public pages accessible without auth', async ({ page }) => {
    test.slow()
    await page.goto(ROUTES.pricing, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByRole('heading', { name: /choose the tier/i })).toBeVisible({
      timeout: 60_000,
    })
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})
