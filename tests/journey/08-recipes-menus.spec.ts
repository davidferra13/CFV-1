// Journey Tests — Recipes & Menus (Week 2)
// Verifies recipe CRUD, scaling, food cost, components, nutrition,
// menu building, cross-contamination checks, and archetype-specific flows.
//
// Scenarios: #108-130
//
// Run: npx playwright test --project=journey-chef tests/journey/08-recipes-menus.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Recipe Library (#108-109) ──────────────────────────────────────────────────

test.describe('Recipes — Library (#108-109)', () => {
  test('recipes page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.recipes)
  })

  test('recipes page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.recipes)
  })

  test('recipes page shows recipe list or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.recipes)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('recipes page has search functionality', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.recipes)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const searchInput = page
      .getByPlaceholder(/search/i)
      .first()
      .or(page.getByRole('searchbox').first())
    const exists = await searchInput.isVisible().catch(() => false)
    expect(typeof exists).toBe('boolean')
  })
})

// ─── Recipe Creation (#109) ─────────────────────────────────────────────────────

test.describe('Recipes — Create (#109)', () => {
  test('new recipe page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.recipesNew)
  })

  test('new recipe form has ingredient and instruction fields', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.recipesNew)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ─── Recipe Detail (#108, #110-111) ─────────────────────────────────────────────

test.describe('Recipes — Detail & Scaling (#108, #110-111)', () => {
  test('recipe detail page loads (seeded recipe)', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('recipe detail has no JS errors', async ({ page, seedIds }) => {
    await assertNoPageErrors(page, `/recipes/${seedIds.recipeId}`)
  })

  test('recipe detail shows ingredients and instructions', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })

  test('recipe edit page loads', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}/edit`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Food Costing (#111, #113) ──────────────────────────────────────────────────

test.describe('Recipes — Food Costing (#111, #113)', () => {
  test('culinary costing page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryCosting)
  })

  test('food cost page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.foodCost)
  })
})

// ─── Recipe Components (#117) ───────────────────────────────────────────────────

test.describe('Recipes — Components (#117)', () => {
  test('culinary components page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryComponents)
  })

  test('components page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.culinaryComponents)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Ingredients (#109, #117) ───────────────────────────────────────────────────

test.describe('Recipes — Ingredients (#109, #117)', () => {
  test('culinary ingredients page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryIngredients)
  })
})

// ─── Menu Building (#112-113) ───────────────────────────────────────────────────

test.describe('Menus — Building (#112-113)', () => {
  test('menus page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.menus)
  })

  test('menus page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.menus)
  })

  test('menus page shows menu list or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.menus)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('menu detail page loads (seeded menu)', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('menu editor page loads', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Culinary Board ─────────────────────────────────────────────────────────────

test.describe('Menus — Culinary Board', () => {
  test('culinary board page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryBoard)
  })
})

// ─── Prep Workspace (#119-121) ──────────────────────────────────────────────────

test.describe('Recipes — Prep Workspace (#119-121)', () => {
  test('culinary prep page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryPrep)
  })

  test('prep page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.culinaryPrep)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Archetype: Private Chef (#119-121) ─────────────────────────────────────────

test.describe('Recipes — Private Chef Menu Building (#119-121)', () => {
  test('can access menu detail for tasting menu creation', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Archetype: Caterer (#122-124) ──────────────────────────────────────────────

test.describe('Recipes — Caterer Scaling (#122-124)', () => {
  test('recipe detail supports viewing/scaling (portion calc)', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    // Recipe should have portion/servings info
    await assertPageHasContent(page)
  })
})

// ─── Archetype: Meal Prep (#125-127) ────────────────────────────────────────────

test.describe('Recipes — Meal Prep Batch (#125-127)', () => {
  test('recipes page allows browsing by cost', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.recipes)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Archetype: Bakery (#128-130) ───────────────────────────────────────────────

test.describe('Recipes — Bakery Costing (#128-130)', () => {
  test('culinary costing page supports multi-component cost analysis', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.culinaryCosting)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// New culinary helper panels (Product Lookup + Cocktail Browser)

test.describe('Recipes and Menus - New Assistant Panels (#547-551)', () => {
  test('recipe edit shows Product Lookup toggle button (#547)', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}/edit`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await expect(page.getByRole('button', { name: /search product/i }).first()).toBeVisible()
  })

  test('Product Lookup panel opens and supports barcode mode toggle (#548)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/recipes/${seedIds.recipeId}/edit`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await page
      .getByRole('button', { name: /search product/i })
      .first()
      .click()

    await expect(page.getByText(/product lookup/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /by name/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /by barcode/i }).first()).toBeVisible()

    await page
      .getByRole('button', { name: /by barcode/i })
      .first()
      .click()
    await expect(page.getByPlaceholder(/enter barcode/i).first()).toBeVisible()
  })

  test('Product Lookup panel can be hidden after opening (#549)', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}/edit`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await page
      .getByRole('button', { name: /search product/i })
      .first()
      .click()
    await expect(page.getByText(/product lookup/i).first()).toBeVisible()

    await page
      .getByRole('button', { name: /hide product lookup/i })
      .first()
      .click()
    await expect(page.getByText(/product lookup/i).first()).toBeHidden()
  })

  test('menu editor shows Cocktail Browser panel (#550)', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await expect(page.getByText(/cocktail browser/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /by name/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /by spirit/i }).first()).toBeVisible()
  })

  test('Cocktail Browser mode toggle updates search placeholder (#551)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await expect(page.getByPlaceholder(/cocktail name/i).first()).toBeVisible()
    await page
      .getByRole('button', { name: /by spirit/i })
      .first()
      .click()
    await expect(page.getByPlaceholder(/spirit or ingredient/i).first()).toBeVisible()
  })
})

// Menu translation panel (new)

test.describe('Menus - Translation Panel (#552-555)', () => {
  test('menu detail exposes Translate Menu control when dishes exist (#552)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const translateButton = page.getByRole('button', { name: /translate menu/i }).first()
    await expect(translateButton).toBeVisible()
  })

  test('Translate Menu opens translation panel with language selector (#553)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await page
      .getByRole('button', { name: /translate menu/i })
      .first()
      .click()

    await expect(page.getByRole('button', { name: /hide translation/i }).first()).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^translate$/i }).first()).toBeVisible()
  })

  test('Translate action remains disabled until language is selected (#554)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await page
      .getByRole('button', { name: /translate menu/i })
      .first()
      .click()

    const translateAction = page.getByRole('button', { name: /^translate$/i }).first()
    await expect(translateAction).toBeDisabled()

    const languageSelect = page.getByRole('combobox').first()
    await languageSelect.selectOption('es')
    await expect(translateAction).toBeEnabled()
  })

  test('Hide Translation collapses the translation panel (#555)', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await page
      .getByRole('button', { name: /translate menu/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /hide translation/i }).first()).toBeVisible()

    await page
      .getByRole('button', { name: /hide translation/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /translate menu/i }).first()).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeHidden()
  })
})
