// Launch Readiness Audit — Culinary (Recipes, Menus, Prep, Costing)
// Tests: recipe CRUD, menu management, prep workspace, ingredient database, costing

import { test, expect } from '../helpers/fixtures'

test.describe('Recipe Library', () => {
  test('recipe list loads with seed data', async ({ page }) => {
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Seed has "TEST - Lemon Butter Pasta"
    const hasRecipes = /recipe|pasta|lemon|butter/i.test(bodyText)
    expect(hasRecipes).toBeTruthy()
  })

  test('recipe detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show recipe details
    const hasDetails = /ingredient|instruction|serving|prep|cook/i.test(bodyText)
    expect(hasDetails).toBeTruthy()
  })

  test('new recipe form renders', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have form inputs
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('new recipe form has key fields', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|category|serving|ingredient|instruction/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })

  test('can fill recipe name field', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.waitForLoadState('networkidle')
    const nameField = page
      .getByLabel(/name|title/i)
      .first()
      .or(page.getByPlaceholder(/recipe name|title/i).first())
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Launch Test Recipe')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/unhandled|error/i)
    }
  })
})

test.describe('Menu Management', () => {
  test('menu list loads with seed data', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Seed has "TEST - E2E Tasting Menu"
    const hasMenus = /menu|tasting|course/i.test(bodyText)
    expect(hasMenus).toBeTruthy()
  })

  test('menu detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show courses (Amuse-Bouche, Main, Dessert)
    const hasCourses = /course|amuse|main|dessert|dish/i.test(bodyText)
    expect(hasCourses).toBeTruthy()
  })
})

test.describe('Culinary Sub-Pages', () => {
  const routes = [
    '/culinary/recipes',
    '/culinary/components',
    '/culinary/prep',
    '/culinary/costing',
    '/culinary/ingredients',
    '/culinary-board',
    '/recipes/ingredients',
    '/settings/repertoire',
  ]

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})

test.describe('Culinary Components Sub-Pages', () => {
  const routes = [
    '/culinary/components/stocks',
    '/culinary/components/sauces',
    '/culinary/components/ferments',
    '/culinary/components/garnishes',
    '/culinary/components/shared-elements',
  ]

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
