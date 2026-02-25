import { test, expect } from '@playwright/test'

test.describe('Authentication network resilience', () => {
  test('sign-in shows actionable message on transport failure', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    await page.locator('input[type="email"]').fill('agent@chefflow.test')
    await page.locator('input[type="password"]').fill('AgentChefFlow!2026')

    let blockedRequest = false
    await page.route('**/*', async (route) => {
      const req = route.request()
      const headers = req.headers()
      const isSignInPost =
        req.method() === 'POST' &&
        (req.url().includes('/auth/signin') || Boolean(headers['next-action']))

      if (isSignInPost && !blockedRequest) {
        blockedRequest = true
        await route.abort('failed')
        return
      }

      await route.continue()
    })

    await page.getByRole('button', { name: /^sign in$/i }).click()
    const errorText =
      'Connection issue while signing in. Please confirm the app server is running and try again.'
    await expect(page.getByText(errorText)).toBeVisible()
    const bodyText = (await page.locator('body').innerText()).toLowerCase()
    expect(bodyText).not.toContain('failed to fetch')
    expect(blockedRequest).toBeTruthy()
  })

  test('agent account can sign in without fetch transport error', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    await page.locator('input[type="email"]').fill('agent@chefflow.test')
    await page.locator('input[type="password"]').fill('AgentChefFlow!2026')
    await page.getByRole('button', { name: /^sign in$/i }).click()

    await page.waitForURL(/\/(dashboard|my-events|onboarding|auth\/role-selection|admin)/, {
      timeout: 30_000,
    })

    const url = page.url().toLowerCase()
    const bodyText = (await page.locator('body').innerText()).toLowerCase()
    expect(url).not.toContain('/auth/signin')
    expect(bodyText).not.toContain('failed to fetch')
    expect(bodyText).not.toContain('connection issue while signing in')
  })
})
