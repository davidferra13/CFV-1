// Launch Readiness Audit — Auth & Security
// Tests: sign-in, sign-out, role boundaries, multi-tenant isolation

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Auth — Sign In', () => {
  test('sign-in page renders email and password fields', async ({ page }) => {
    await page.goto(ROUTES.signIn)
    // Custom Input component has no htmlFor linkage — use type selectors
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  })

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto(ROUTES.signIn)
    await page.locator('input[type="email"]').fill('nobody@example.com')
    await page.locator('input[type="password"]').fill('WrongPassword123!')
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()
    // Should show an error — not redirect to dashboard
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/auth\/signin/)
    const errorText = page.getByText(/invalid|incorrect|error|failed/i).first()
    await expect(errorText).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Auth — Role Boundaries', () => {
  // These tests use the chef storage state (authenticated as chef)
  test('chef can access /dashboard', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('chef is redirected from /my-events (client-only)', async ({ page }) => {
    await page.goto(ROUTES.clientEvents)
    await page.waitForURL(/(?!\/my-events)/, { timeout: 10_000 })
    // Chef should NOT be on /my-events
    const url = page.url()
    expect(url).not.toContain('/my-events')
  })

  test('chef is redirected from /my-quotes (client-only)', async ({ page }) => {
    await page.goto(ROUTES.myQuotes)
    await page.waitForURL(/(?!\/my-quotes)/, { timeout: 10_000 })
    const url = page.url()
    expect(url).not.toContain('/my-quotes')
  })
})

test.describe('Auth — Unauthenticated Boundaries', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('unauthenticated user redirected from /dashboard', async ({ page }) => {
    await page.goto(ROUTES.chefDashboard)
    await page.waitForURL(/auth\/signin|^\/$/, { timeout: 15_000 })
    const url = page.url()
    expect(url.includes('/dashboard')).toBeFalsy()
  })

  test('unauthenticated user redirected from /events', async ({ page }) => {
    await page.goto(ROUTES.events)
    await page.waitForURL(/auth\/signin|^\/$/, { timeout: 15_000 })
    const url = page.url()
    expect(url.includes('/events')).toBeFalsy()
  })

  test('unauthenticated user redirected from /clients', async ({ page }) => {
    await page.goto(ROUTES.clients)
    await page.waitForURL(/auth\/signin|^\/$/, { timeout: 15_000 })
    const url = page.url()
    expect(url.includes('/clients')).toBeFalsy()
  })
})

test.describe('Security — Multi-Tenant Isolation', () => {
  // Chef A (authenticated via storageState) tries to access Chef B's data
  test('Chef A cannot access Chef B event detail', async ({ page, seedIds }) => {
    const chefBEventUrl = `/events/${seedIds.chefBEventId}`
    const resp = await page.goto(chefBEventUrl)
    // Should get 403/404/redirect — NOT a 200 with Chef B's data
    const status = resp?.status() ?? 0
    const url = page.url()
    const is403or404 = status === 403 || status === 404
    const wasRedirected = !url.includes(seedIds.chefBEventId)
    const bodyText = await page.locator('body').innerText()
    const hasErrorMessage = /not found|access denied|forbidden|unauthorized|no permission/i.test(
      bodyText
    )
    expect(is403or404 || wasRedirected || hasErrorMessage).toBeTruthy()
  })

  test('Chef A cannot access Chef B client detail', async ({ page, seedIds }) => {
    const chefBClientUrl = `/clients/${seedIds.chefBClientId}`
    const resp = await page.goto(chefBClientUrl)
    const status = resp?.status() ?? 0
    const url = page.url()
    const is403or404 = status === 403 || status === 404
    const wasRedirected = !url.includes(seedIds.chefBClientId)
    const bodyText = await page.locator('body').innerText()
    const hasErrorMessage = /not found|access denied|forbidden|unauthorized|no permission/i.test(
      bodyText
    )
    expect(is403or404 || wasRedirected || hasErrorMessage).toBeTruthy()
  })
})
