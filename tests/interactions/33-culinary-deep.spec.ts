// Interaction Layer — Culinary Deep Tests
// Covers the full culinary sub-tree: components, costing, ingredients,
// menus (culinary view), prep, and recipes (culinary view).
//
// Routes covered:
//   /culinary                    — culinary hub
//   /culinary/components/**      — ferments, garnishes, sauces, stocks, shared
//   /culinary/costing/**         — food cost, menu costing, recipe costing
//   /culinary/ingredients/**     — ingredient library, seasonal, vendor notes
//   /culinary/menus/**           — approved, drafts, scaling, substitutions, templates
//   /culinary/prep/**            — prep hub, shopping list, timeline
//   /culinary/recipes/**         — recipes, dietary flags, drafts, seasonal, tags
//   /culinary/vendors            — already tested in file 24
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Culinary Hub ─────────────────────────────────────────────────────────────

test.describe('Culinary — Hub', () => {
  test('/culinary — page loads without redirect', async ({ page }) => {
    await page.goto('/culinary')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/culinary — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Components ───────────────────────────────────────────────────────────────

test.describe('Culinary — Components', () => {
  const componentRoutes = [
    '/culinary/components',
    '/culinary/components/ferments',
    '/culinary/components/garnishes',
    '/culinary/components/sauces',
    '/culinary/components/stocks',
    '/culinary/components/shared-elements',
  ]

  for (const route of componentRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/culinary/components — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/components')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Costing ──────────────────────────────────────────────────────────────────

test.describe('Culinary — Costing', () => {
  const costingRoutes = [
    '/culinary/costing',
    '/culinary/costing/food-cost',
    '/culinary/costing/menu',
    '/culinary/costing/recipe',
  ]

  for (const route of costingRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/culinary/costing — shows costing data or empty state', async ({ page }) => {
    await page.goto('/culinary/costing')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/culinary/costing — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/costing')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Ingredients ──────────────────────────────────────────────────────────────

test.describe('Culinary — Ingredients', () => {
  const ingredientRoutes = [
    '/culinary/ingredients',
    '/culinary/ingredients/seasonal-availability',
    '/culinary/ingredients/vendor-notes',
  ]

  for (const route of ingredientRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/culinary/ingredients — shows ingredient content or empty state', async ({ page }) => {
    await page.goto('/culinary/ingredients')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/culinary/ingredients — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/ingredients')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Culinary Menus ───────────────────────────────────────────────────────────

test.describe('Culinary — Menus', () => {
  const menuRoutes = [
    '/culinary/menus',
    '/culinary/menus/approved',
    '/culinary/menus/drafts',
    '/culinary/menus/scaling',
    '/culinary/menus/substitutions',
    '/culinary/menus/templates',
  ]

  for (const route of menuRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/culinary/menus — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/menus')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/culinary/menus/[id] — seeded menu detail loads', async ({ page, seedIds }) => {
    const resp = await page.goto(`/culinary/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })
})

// ─── Prep ─────────────────────────────────────────────────────────────────────

test.describe('Culinary — Prep', () => {
  const prepRoutes = [
    '/culinary/prep',
    '/culinary/prep/shopping',
    '/culinary/prep/timeline',
  ]

  for (const route of prepRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/culinary/prep — shows prep content or empty state', async ({ page }) => {
    await page.goto('/culinary/prep')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/culinary/prep — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/prep')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Culinary Recipes ─────────────────────────────────────────────────────────

test.describe('Culinary — Recipes', () => {
  const recipeRoutes = [
    '/culinary/recipes',
    '/culinary/recipes/dietary-flags',
    '/culinary/recipes/drafts',
    '/culinary/recipes/seasonal-notes',
    '/culinary/recipes/tags',
  ]

  for (const route of recipeRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/culinary/recipes — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/recipes')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/culinary/recipes/[id] — seeded recipe detail loads', async ({ page, seedIds }) => {
    const resp = await page.goto(`/culinary/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })
})
