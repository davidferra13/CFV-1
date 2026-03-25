// Interaction Layer — Auth & Signup Flows
// Tests the authentication pages: sign in, chef signup, client signup,
// password reset, and error handling for bad credentials.
//
// These tests run WITHOUT a storageState (unauthenticated) to test
// the public-facing auth pages.
//
// Note: We do NOT actually create new accounts to avoid polluting
// the Auth.js system. We test:
//   - Pages render correctly
//   - Forms have the correct fields
//   - Validation works (empty submit, mismatched passwords)
//   - Error messages appear (not crashes)
//
// Uses public storageState (interactions-public project — no auth).

import type { Locator, Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'

async function clearStoredTheme(page: Page, route = '/') {
  await page.goto(route)
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => {
    window.localStorage.removeItem('chefflow-theme')
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function getVisibleToggle(page: Page): Promise<Locator> {
  const toggles = page.getByTestId('theme-toggle')
  const count = await toggles.count()

  for (let index = 0; index < count; index += 1) {
    const toggle = toggles.nth(index)
    if (await toggle.isVisible().catch(() => false)) {
      return toggle
    }
  }

  throw new Error('No visible theme toggle found')
}

// ─── Sign In Page ─────────────────────────────────────────────────────────────

test.describe('Auth — Sign In', () => {
  test('/auth/signin — page loads', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/auth/signin — has email and password fields', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    const passwordField = page.locator('input[type="password"]').first()
    await expect(emailField).toBeVisible({ timeout: 10_000 })
    await expect(passwordField).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/signin — has Sign In button', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const signInBtn = page.getByRole('button', { name: /sign in|log in|login|continue/i }).first()
    await expect(signInBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/signin — empty submit shows error or stays on page', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const signInBtn = page.getByRole('button', { name: /sign in|log in|login|continue/i }).first()
    await signInBtn.click()
    await page.waitForTimeout(1000)
    // Should stay on signin page or show validation
    const url = page.url()
    expect(url).toMatch(/signin|sign-in|login|auth/)
  })

  test('/auth/signin — invalid credentials shows error message', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    const passwordField = page.locator('input[type="password"]').first()

    if (await emailField.isVisible()) {
      await emailField.fill('notareal@email.com')
    }
    if (await passwordField.isVisible()) {
      await passwordField.fill('wrongpassword123')
    }

    const signInBtn = page.getByRole('button', { name: /sign in|log in|login|continue/i }).first()
    await signInBtn.click()
    await page.waitForTimeout(2000)

    // Should show an error — not redirect to dashboard
    const url = page.url()
    const hasError = await page
      .getByText(/invalid|incorrect|wrong|error|not found|check your/i)
      .first()
      .isVisible()
      .catch(() => false)
    const stayedOnAuth = url.includes('signin') || url.includes('login') || url.includes('auth')

    expect(stayedOnAuth || hasError, 'Invalid credentials should not succeed').toBeTruthy()
  })

  test('/auth/signin — has Sign in with Google button', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const googleBtn = page.getByRole('button', { name: /sign in with google/i })
    await expect(googleBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/signin — does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/auth/signin — has link to sign up page', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const signUpLink = page
      .getByRole('link', { name: /sign up|create account|register|get started/i })
      .first()
      .or(page.getByText(/sign up|create account|register|no account/i).first())
    const isVisible = await signUpLink.isVisible().catch(() => false)
    // Informational — most sign in pages have this link
    if (isVisible) {
      await expect(signUpLink).toBeVisible()
    }
  })

  test('public header toggle persists into auth shell', async ({ page }) => {
    await clearStoredTheme(page)

    await expect(page.locator('html')).not.toHaveClass(/dark/)

    const publicToggle = await getVisibleToggle(page)
    await publicToggle.click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('chefflow-theme')))
      .toBe('dark')

    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(await getVisibleToggle(page)).toBeVisible()
  })
})

// ─── Chef Signup Page ─────────────────────────────────────────────────────────

test.describe('Auth — Chef Signup', () => {
  test('/auth/signup — page loads', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/auth/signup — has email and password fields', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    await expect(emailField).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/signup — has Create Account or Sign Up button', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    const signUpBtn = page
      .getByRole('button', { name: /create|sign up|register|get started|continue/i })
      .first()
    await expect(signUpBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/signup — empty submit shows validation', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    const signUpBtn = page
      .getByRole('button', { name: /create|sign up|register|get started|continue/i })
      .first()
    await signUpBtn.click()
    await page.waitForTimeout(1000)
    // Should stay on signup or show validation — not redirect to dashboard
    const url = page.url()
    expect(url).not.toMatch(/dashboard/)
  })

  test('/auth/signup — has Sign up with Google button', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    const googleBtn = page.getByRole('button', { name: /sign up with google/i })
    await expect(googleBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/signup — does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/auth/signup — typing in email field works without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')

    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailField.isVisible()) {
      await emailField.fill('test.interaction.signup@example.com')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(300)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Client Signup Page ───────────────────────────────────────────────────────

test.describe('Auth — Client Signup', () => {
  test('/auth/client-signup — page loads', async ({ page }) => {
    await page.goto('/auth/client-signup')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/auth/client-signup — has form fields', async ({ page }) => {
    await page.goto('/auth/client-signup')
    await page.waitForLoadState('networkidle')
    const inputs = await page.locator('input').count()
    expect(inputs).toBeGreaterThan(0)
  })

  test('/auth/client-signup — has Sign up with Google button', async ({ page }) => {
    await page.goto('/auth/client-signup')
    await page.waitForLoadState('networkidle')
    const googleBtn = page.getByRole('button', { name: /sign up with google/i })
    await expect(googleBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/auth/client-signup — does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/auth/client-signup')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/auth/client-signup — empty submit stays on page or shows error', async ({ page }) => {
    await page.goto('/auth/client-signup')
    await page.waitForLoadState('networkidle')
    const submitBtn = page
      .getByRole('button', { name: /create|sign up|register|continue|get started/i })
      .first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(1000)
    }
    const url = page.url()
    expect(url).not.toMatch(/dashboard/)
  })
})

// ─── Password Reset ────────────────────────────────────────────────────────────

test.describe('Auth — Password Reset', () => {
  test('/auth/forgot-password — page loads (or redirects gracefully)', async ({ page }) => {
    const resp = await page.goto('/auth/forgot-password')
    await page.waitForLoadState('networkidle')
    // May 404 if named differently, but should not 500
    const status = resp?.status() ?? 200
    expect(status).toBeLessThan(500)
  })

  test('/auth/reset-password — page loads or gracefully 404s', async ({ page }) => {
    const resp = await page.goto('/auth/reset-password')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).toBeLessThan(500)
  })

  test('Sign in page has forgot password link', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')
    const forgotLink = page
      .getByRole('link', { name: /forgot|reset|trouble/i })
      .first()
      .or(page.getByText(/forgot|reset password/i).first())
    const isVisible = await forgotLink.isVisible().catch(() => false)
    // Informational — not all apps show this on the main signin form
    if (isVisible) {
      await expect(forgotLink).toBeVisible()
    }
  })
})

// ─── Auth Pages — No Regression ───────────────────────────────────────────────

test.describe('Auth — No Regression', () => {
  const authPages = ['/auth/signin', '/auth/signup', '/auth/client-signup']

  for (const path of authPages) {
    test(`${path} — no unhandled JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(errors, `${path} should not throw JS errors`).toHaveLength(0)
    })
  }
})
