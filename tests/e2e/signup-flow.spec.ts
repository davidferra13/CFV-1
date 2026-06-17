// Sign-Up Flow E2E Tests
// Verifies sign-in page loads, chef sign-up link works, sign-up form has
// required fields, and form validation prevents empty submissions.
//
// These tests run WITHOUT a storageState (unauthenticated) to test the
// public-facing auth pages. We do NOT create accounts to avoid polluting
// the Auth.js system.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Sign-Up Flow', () => {
  test('sign-in page loads with email and password fields', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(ROUTES.signIn)
    await page.waitForLoadState('networkidle')

    // Email and password inputs are visible
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10_000 })

    // Sign In button is visible
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    await context.close()
  })

  test('chef sign-up link navigates to registration form', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(ROUTES.signIn)
    await page.waitForLoadState('networkidle')

    // Click the "Chef sign up" link
    const chefSignUpLink = page.getByRole('link', { name: /chef sign up/i })
    await expect(chefSignUpLink).toBeVisible({ timeout: 10_000 })
    await chefSignUpLink.click()

    // Should navigate to /auth/signup
    await expect(page).toHaveURL(/\/auth\/signup/)
    await page.waitForLoadState('networkidle')

    // Chef Sign Up card title should be visible
    await expect(page.getByText('Chef Sign Up')).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('sign-up form has required fields', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(ROUTES.signUp)
    await page.waitForLoadState('networkidle')

    // Email field
    const emailField = page.locator('input[type="email"]').first()
    await expect(emailField).toBeVisible({ timeout: 10_000 })

    // Password field
    const passwordField = page.locator('input[type="password"]').first()
    await expect(passwordField).toBeVisible({ timeout: 10_000 })

    // Business name / name field
    const nameField = page.getByLabel(/name|business/i).first()
    await expect(nameField).toBeVisible({ timeout: 10_000 })

    // Create Account button
    const submitBtn = page.getByRole('button', { name: /create account/i })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('empty form submission triggers validation and stays on page', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(ROUTES.signUp)
    await page.waitForLoadState('networkidle')

    // Click Create Account without filling any fields
    const submitBtn = page.getByRole('button', { name: /create account/i })
    await submitBtn.click()
    await page.waitForTimeout(1000)

    // Should stay on the signup page (not redirect to dashboard or onboarding)
    const url = page.url()
    expect(url).toMatch(/\/auth\/signup/)
    expect(url).not.toMatch(/dashboard|onboarding/)

    await context.close()
  })
})
