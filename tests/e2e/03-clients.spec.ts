// Clients E2E Tests
// Verifies client list, detail page, and key panels.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Clients', () => {
  test('client list loads', async ({ page }) => {
    await page.goto(ROUTES.clients)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/clients/)
  })

  test('TEST client appears in list', async ({ page, seedIds }) => {
    await page.goto(ROUTES.clients)
    // Wait for streaming Suspense / data fetch to complete
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST - Alice E2E').first()).toBeVisible({ timeout: 10_000 })
  })

  test('additional test clients appear', async ({ page }) => {
    await page.goto(ROUTES.clients)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST - Bob E2E').first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking client navigates to detail page', async ({ page, seedIds }) => {
    await page.goto(ROUTES.clients)
    await page.waitForLoadState('networkidle')
    // Click the first TEST client link
    const clientLink = page.getByRole('link').filter({ hasText: 'TEST - Alice E2E' }).first()
    await clientLink.click()
    await expect(page).toHaveURL(new RegExp(`/clients/${seedIds.clientIds.primary}`))
  })

  test('client detail page loads with client name', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST - Alice E2E').first()).toBeVisible({ timeout: 10_000 })
  })

  test('client detail has email displayed', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    // Email should appear somewhere on the detail page
    const emailText = 'e2e.client.'
    await expect(page.getByText(emailText, { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/clients/new redirects to /clients (no standalone create page)', async ({ page }) => {
    // The create-client flow is inline on /clients via invitation.
    // /clients/new is intentionally a server-side redirect back to /clients.
    await page.goto('/clients/new')
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should land on /clients after redirect
    await expect(page).toHaveURL(/\/clients$/)
  })
})
