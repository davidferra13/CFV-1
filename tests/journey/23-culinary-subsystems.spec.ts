// Journey Tests - Culinary Subsystems
// Adds coverage for deeper culinary pages: prep lanes, components,
// costing branches, ingredient intelligence, and culinary menu/recipe views.
//
// Scenarios: #365-378
//
// Run: npx playwright test --project=journey-chef tests/journey/23-culinary-subsystems.spec.ts

import { test } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Culinary Subsystems - Hub and Prep (#365-368)', () => {
  test('culinary hub page loads (#365)', async ({ page }) => {
    await assertPageLoads(page, '/culinary')
  })

  test('culinary prep page has no page errors (#366)', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.culinaryPrep)
  })

  test('prep timeline page loads (#367)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/prep/timeline')
  })

  test('prep shopping page has content (#368)', async ({ page }) => {
    await page.goto('/culinary/prep/shopping')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Culinary Subsystems - Components (#369-372)', () => {
  test('sauces component page loads (#369)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/components/sauces')
  })

  test('stocks component page loads (#370)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/components/stocks')
  })

  test('garnishes component page loads (#371)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/components/garnishes')
  })

  test('ferments component page has content (#372)', async ({ page }) => {
    await page.goto('/culinary/components/ferments')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Culinary Subsystems - Costing and Ingredients (#373-376)', () => {
  test('food-cost route loads (#373)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/costing/food-cost')
  })

  test('menu costing route loads (#374)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/costing/menu')
  })

  test('recipe costing route loads (#375)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/costing/recipe')
  })

  test('ingredient vendor notes route has content (#376)', async ({ page }) => {
    await page.goto('/culinary/ingredients/vendor-notes')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Culinary Subsystems - Menus and Recipes (#377-378)', () => {
  test('culinary menu templates route loads (#377)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/menus/templates')
  })

  test('culinary recipe tags route has content (#378)', async ({ page }) => {
    await page.goto('/culinary/recipes/tags')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Culinary Subsystems - Additional Coverage (#506)', () => {
  test('my-kitchen route loads (#506)', async ({ page }) => {
    await assertPageLoads(page, '/culinary/my-kitchen')
  })
})
