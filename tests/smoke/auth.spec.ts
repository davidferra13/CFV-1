// Auth Smoke Tests
// Validates core auth flows work end-to-end

import { test, expect } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'

test.describe('Authentication', () => {
  test('home page loads', async ({ page }) => {
    await page.goto(ROUTES.home)
    await expect(page).toHaveTitle(/ChefFlow/i)
  })

  test('sign-in page renders', async ({ page }) => {
    await page.goto(ROUTES.signIn)
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('sign-up page renders', async ({ page }) => {
    await page.goto(ROUTES.signUp)
    await expect(page.getByLabel('Email')).toBeVisible()
  })

  test('unauthenticated user redirected from chef dashboard', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    // Should redirect to sign-in
    await page.waitForURL(/auth\/signin|\/$/i, { timeout: 5000 })
    const url = page.url()
    expect(url).toMatch(/auth\/signin|\/$/i)
  })

  test('public pages accessible without auth', async ({ page }) => {
    await page.goto(ROUTES.pricing)
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})
