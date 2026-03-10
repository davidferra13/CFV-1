import { test, expect } from '@playwright/test'
import { ROUTES } from '../helpers/test-utils'
import { TEST_BASE_URL } from '../helpers/runtime-base-url'

function getCanonicalSiteOrigin(): string {
  const fallback = TEST_BASE_URL
  const candidate = process.env.NEXT_PUBLIC_SITE_URL || fallback
  try {
    return new URL(candidate).origin
  } catch {
    return fallback
  }
}

async function captureGoogleAuthorizeRequestUrl(
  page: import('@playwright/test').Page,
  buttonName: RegExp
): Promise<string> {
  const [authorizeRequest] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().includes('/auth/v1/authorize') && req.url().includes('provider=google')
    ),
    page.getByRole('button', { name: buttonName }).click(),
  ])
  return authorizeRequest.url()
}

test.describe('Google OAuth callback origin', () => {
  test.describe.configure({ timeout: 120_000 })

  test('sign-in flow uses canonical callback origin', async ({ page }) => {
    await page.goto(ROUTES.signIn)
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()

    const authorizeUrl = await captureGoogleAuthorizeRequestUrl(page, /sign in with google/i)
    const redirectTo = new URL(authorizeUrl).searchParams.get('redirect_to')

    expect(redirectTo, 'Google OAuth authorize request must include redirect_to').toBeTruthy()
    const callbackUrl = new URL(redirectTo!)
    expect(callbackUrl.origin).toBe(getCanonicalSiteOrigin())
    expect(callbackUrl.pathname).toBe('/auth/callback')
  })

  test('sign-up flow uses canonical callback origin', async ({ page }) => {
    await page.goto(ROUTES.signUp)
    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible()

    const authorizeUrl = await captureGoogleAuthorizeRequestUrl(page, /sign up with google/i)
    const redirectTo = new URL(authorizeUrl).searchParams.get('redirect_to')

    expect(redirectTo, 'Google OAuth authorize request must include redirect_to').toBeTruthy()
    const callbackUrl = new URL(redirectTo!)
    expect(callbackUrl.origin).toBe(getCanonicalSiteOrigin())
    expect(callbackUrl.pathname).toBe('/auth/callback')
  })
})
