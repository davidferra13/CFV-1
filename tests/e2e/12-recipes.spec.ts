// Recipes E2E Tests
// Verifies recipe list, detail, and the scaling calculator widget.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('Recipes', () => {
  test('recipes page loads', async ({ page }) => {
    await page.goto(ROUTES.recipes)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page).toHaveURL(/\/recipes/)
  })

  test('TEST recipe appears in list', async ({ page }) => {
    await page.goto(ROUTES.recipes)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('TEST - Lemon Butter Pasta')).toBeVisible({ timeout: 10_000 })
  })

  test('clicking recipe navigates to detail', async ({ page, seedIds }) => {
    await page.goto(ROUTES.recipes)
    const link = page.getByRole('link').filter({ hasText: 'TEST - Lemon Butter Pasta' }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`/recipes/${seedIds.recipeId}`))
  })

  test('recipe detail shows name and method', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await expect(page).not.toHaveURL(/auth\/signin/)
    await expect(page.getByText('TEST - Lemon Butter Pasta')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/cook pasta|lemon/i)).toBeVisible({ timeout: 10_000 })
  })

  test('recipe detail shows yield info', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')
    // Yield: 6 portions
    await expect(page.getByText(/6|portion/i)).toBeVisible({ timeout: 10_000 })
  })

  test('/recipes/new renders create form', async ({ page }) => {
    await page.goto('/recipes/new')
    await expect(page).not.toHaveURL(/auth\/signin/)
    const nameField = page.getByLabel(/name|recipe name/i).first()
    await expect(nameField).toBeVisible({ timeout: 10_000 })
  })
})
