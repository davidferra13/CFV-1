// Public Pages E2E Tests
// No auth applied. Verifies public-facing pages are accessible without login.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Public Pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto(ROUTES.home)
    await expect(page).not.toHaveURL(/auth\/signin/)
    const title = await page.title()
    expect(title).toMatch(/ChefFlow/i)
  })

  test('pricing page is accessible without auth', async ({ page }) => {
    await page.goto(ROUTES.pricing)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/pricing|plan|price/i)).toBeVisible({ timeout: 10_000 })
  })

  test('contact page is accessible without auth', async ({ page }) => {
    await page.goto(ROUTES.contact)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/contact|get in touch|reach out/i)).toBeVisible({ timeout: 10_000 })
  })

  test('privacy policy is accessible without auth', async ({ page }) => {
    await page.goto(ROUTES.privacy)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/privacy/i)).toBeVisible({ timeout: 10_000 })
  })

  test('terms of service is accessible without auth', async ({ page }) => {
    await page.goto(ROUTES.terms)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText(/terms/i)).toBeVisible({ timeout: 10_000 })
  })

  test('chef public profile is accessible', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Profile should display chef name or business name
    await expect(page.getByText(/TEST - E2E Kitchen|E2E Test Chef/i)).toBeVisible({ timeout: 10_000 })
  })

  test('chef public profile inquiry form loads', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should have a form with name/email fields
    const nameOrEmail = page.getByLabel(/name|email/i).first()
    await expect(nameOrEmail).toBeVisible({ timeout: 10_000 })
  })

  test('invalid share token handles gracefully', async ({ page }) => {
    await page.goto('/share/invalid-token-12345')
    // Should render a not-found or error state — not a 500 crash
    await expect(page.getByText(/internal server error|500/i)).not.toBeVisible()
  })
})
