import { test, expect } from '@playwright/test'

test.describe('Website-first signup button hardening', () => {
  test.describe.configure({ timeout: 120_000 })

  test('blocks submit on short password before any network mutation', async ({ page }) => {
    let signUpPostCount = 0

    await page.route('**/*', async (route) => {
      const request = route.request()
      const headers = request.headers()
      const isSignUpPost =
        request.method() === 'POST' &&
        (request.url().includes('/auth/signup') || Boolean(headers['next-action']))

      if (isSignUpPost) {
        signUpPostCount += 1
      }

      await route.continue()
    })

    await page.goto('/auth/signup')
    await page.locator('input[type="email"]').fill('website.signup.button@chefflow.test')
    await page.locator('input[type="password"]').fill('short')
    await page.getByRole('button', { name: /create account with email/i }).click()

    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible()
    await page.waitForTimeout(500)
    expect(signUpPostCount).toBe(0)
  })

  test('surfaces actionable error and recovers button state on transport failure', async ({
    page,
  }) => {
    let blockedRequest = false

    await page.route('**/*', async (route) => {
      const request = route.request()
      const headers = request.headers()
      const isSignUpPost =
        request.method() === 'POST' &&
        (request.url().includes('/auth/signup') || Boolean(headers['next-action']))

      if (isSignUpPost && !blockedRequest) {
        blockedRequest = true
        await route.abort('failed')
        return
      }

      await route.continue()
    })

    await page.goto('/auth/signup')
    await page.locator('input[type="email"]').fill('website.signup.network@chefflow.test')
    await page.locator('input[type="password"]').fill('WebsiteSignup!2026')
    await page
      .locator('input[type="text"]')
      .first()
      .fill('Website Signup Reliability')

    const submitButton = page.getByRole('button', { name: /create account with email/i })
    await submitButton.click()

    const expectedError =
      'Connection issue while creating your account. Please check your network and try again.'
    await expect(page.getByText(expectedError)).toBeVisible()
    await expect(submitButton).toBeEnabled()

    const bodyText = (await page.locator('body').innerText()).toLowerCase()
    expect(bodyText).not.toContain('failed to fetch')
    expect(blockedRequest).toBeTruthy()
  })

  test('hides Google signup for invitation-token client flow', async ({ page }) => {
    await page.goto('/auth/client-signup?token=invalid-token')
    await expect(page.getByRole('button', { name: /sign up with google/i })).toHaveCount(0)
  })
})
