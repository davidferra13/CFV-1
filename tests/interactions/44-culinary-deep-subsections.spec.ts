// Interaction Layer — Culinary Deep Subsections
// Covers every culinary sub-route with zero prior coverage:
//   costing/food-cost, costing/menu, costing/recipe,
//   components/ferments, components/garnishes, components/sauces,
//   components/shared-elements, components/stocks,
//   ingredients/seasonal-availability, ingredients/vendor-notes,
//   menus/approved, menus/drafts, menus/scaling, menus/substitutions,
//   recipes/drafts, recipes/dietary-flags, recipes/seasonal-notes, recipes/tags,
//   prep/shopping, prep/timeline,
//   inventory/food-cost, inventory/vendor-invoices
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Culinary Costing Sub-pages ──────────────────

test.describe('Culinary Costing Sub-pages', () => {
  const routes = [
    '/culinary/costing/food-cost',
    '/culinary/costing/menu',
    '/culinary/costing/recipe',
  ]

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Culinary Components Sub-pages ───────────────

test.describe('Culinary Components Sub-pages', () => {
  const routes = [
    '/culinary/components/ferments',
    '/culinary/components/garnishes',
    '/culinary/components/sauces',
    '/culinary/components/shared-elements',
    '/culinary/components/stocks',
  ]

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Culinary Ingredients Sub-pages ──────────────

test.describe('Culinary Ingredients Sub-pages', () => {
  const routes = [
    '/culinary/ingredients/seasonal-availability',
    '/culinary/ingredients/vendor-notes',
  ]

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Culinary Menu Filter Views ──────────────────

test.describe('Culinary Menu Filter Views', () => {
  const routes = [
    '/culinary/menus/approved',
    '/culinary/menus/drafts',
    '/culinary/menus/scaling',
    '/culinary/menus/substitutions',
  ]

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Culinary Recipe Filter Views ────────────────

test.describe('Culinary Recipe Filter Views', () => {
  const routes = [
    '/culinary/recipes/drafts',
    '/culinary/recipes/dietary-flags',
    '/culinary/recipes/seasonal-notes',
    '/culinary/recipes/tags',
  ]

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Culinary Prep Sub-pages ─────────────────────

test.describe('Culinary Prep Sub-pages', () => {
  const routes = ['/culinary/prep/shopping', '/culinary/prep/timeline']

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Inventory Sub-pages ─────────────────────────

test.describe('Inventory Sub-pages', () => {
  const routes = ['/inventory/food-cost', '/inventory/vendor-invoices']

  for (const route of routes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/inventory/vendor-invoices — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/inventory/vendor-invoices')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── All culinary deep sub-routes load together ───────────────────────────────────────

test('All culinary deep sub-routes load without 500', async ({ page }) => {
  const routes = [
    '/culinary/costing/food-cost',
    '/culinary/costing/menu',
    '/culinary/costing/recipe',
    '/culinary/components/ferments',
    '/culinary/components/garnishes',
    '/culinary/components/sauces',
    '/culinary/components/shared-elements',
    '/culinary/components/stocks',
    '/culinary/ingredients/seasonal-availability',
    '/culinary/ingredients/vendor-notes',
    '/culinary/menus/approved',
    '/culinary/menus/drafts',
    '/culinary/menus/scaling',
    '/culinary/menus/substitutions',
    '/culinary/recipes/drafts',
    '/culinary/recipes/dietary-flags',
    '/culinary/recipes/seasonal-notes',
    '/culinary/recipes/tags',
    '/culinary/prep/shopping',
    '/culinary/prep/timeline',
    '/inventory/food-cost',
    '/inventory/vendor-invoices',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
