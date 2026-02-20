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
    await expect(page.getByText('TEST - Alice E2E')).toBeVisible({ timeout: 10_000 })
  })

  test('additional test clients appear', async ({ page }) => {
    await page.goto(ROUTES.clients)
    await expect(page.getByText('TEST - Bob E2E')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking client navigates to detail page', async ({ page, seedIds }) => {
    await page.goto(ROUTES.clients)
    // Click the first TEST client link
    const clientLink = page.getByRole('link').filter({ hasText: 'TEST - Alice E2E' }).first()
    await clientLink.click()
    await expect(page).toHaveURL(new RegExp(`/clients/${seedIds.clientIds.primary}`))
  })

  test('client detail page loads with client name', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST - Alice E2E')).toBeVisible({ timeout: 10_000 })
  })

  test('client detail has email displayed', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    // Email should appear somewhere on the detail page
    const emailText = `e2e.client.`
    await expect(page.getByText(emailText, { exact: false })).toBeVisible({ timeout: 10_000 })
  })

  test('/clients/new page renders create form', async ({ page }) => {
    await page.goto('/clients/new')
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Form should have a name or email field
    const nameOrEmail = page.getByLabel(/full name|name|email/i).first()
    await expect(nameOrEmail).toBeVisible({ timeout: 10_000 })
  })
})
