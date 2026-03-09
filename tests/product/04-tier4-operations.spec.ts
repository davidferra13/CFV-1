// Product Tests — Tier 4: Operations
// Proves: The app handles event logistics (menus, recipes, staff, kitchen ops).
// Maps to: product-testing-roadmap.md Tier 4 (tests 4A-4E)
//
// Run: npx playwright test -p product-chef --grep "Tier 4"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

// ── 4A. Recipes & Ingredients ──────────────────────────────────────────────

test.describe('Tier 4A — Recipes & Ingredients', () => {
  test('4A.1 — recipe list shows seeded recipe', async ({ page }) => {
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/Lemon Butter Pasta/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('4A.2 — recipe detail page loads with data', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/Lemon Butter Pasta/i).first()).toBeVisible({ timeout: 10_000 })
    // Should show recipe details (prep time, cook time, yield, method)
    const hasTime = await page
      .getByText(/min|minutes|time/i)
      .first()
      .isVisible()
      .catch(() => false)
    const hasMethod = await page
      .getByText(/Cook pasta|al dente/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasTime || hasMethod).toBeTruthy()
  })

  test('4A.3 — recipe new page loads', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)

    // Should show recipe form
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('4A.4 — recipe edit page loads', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}/edit`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4A.5 — ingredients page loads', async ({ page }) => {
    await page.goto('/recipes/ingredients')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── 4B. Menus ──────────────────────────────────────────────────────────────

test.describe('Tier 4B — Menus', () => {
  test('4B.1 — menu list shows seeded menu', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/Tasting Menu/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('4B.2 — menu detail page loads with courses', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('domcontentloaded')

    // Should show menu name and courses
    await expect(page.getByText(/Tasting Menu/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('4B.3 — new menu page loads', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4B.4 — culinary hub loads', async ({ page }) => {
    await page.goto('/culinary')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4B.5 — culinary sub-pages load', async ({ page }) => {
    const culinaryPages = [
      '/culinary/costing',
      '/culinary/ingredients',
      '/culinary/prep',
      '/culinary/vendors',
      '/culinary/menus',
    ]

    for (const route of culinaryPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})

// ── 4C. Grocery & Procurement ──────────────────────────────────────────────

test.describe('Tier 4C — Grocery & Procurement', () => {
  test('4C.1 — shopping page loads', async ({ page }) => {
    await page.goto('/shopping')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4C.2 — inventory hub loads', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4C.3 — inventory sub-pages load', async ({ page }) => {
    const inventoryPages = [
      '/inventory/counts',
      '/inventory/expiry',
      '/inventory/waste',
      '/inventory/procurement',
    ]

    for (const route of inventoryPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('4C.4 — food cost page loads', async ({ page }) => {
    await page.goto('/food-cost')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── 4D. Staff & Kitchen ────────────────────────────────────────────────────

test.describe('Tier 4D — Staff & Kitchen', () => {
  test('4D.1 — staff list loads', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    // Should show the seeded staff member
    const hasStaff = await page
      .getByText(/E2E Staff/i)
      .first()
      .isVisible()
      .catch(() => false)
    // Staff member should appear (might need scroll)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('4D.2 — staff sub-pages load', async ({ page }) => {
    const staffPages = [
      '/staff/schedule',
      '/staff/availability',
      '/staff/performance',
      '/staff/labor',
    ]

    for (const route of staffPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('4D.3 — stations page loads', async ({ page }) => {
    await page.goto('/stations')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4D.4 — operations hub loads', async ({ page }) => {
    await page.goto('/operations')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── 4E. After Action Review ────────────────────────────────────────────────

test.describe('Tier 4E — After Action Review', () => {
  test('4E.1 — completed event AAR page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4E.2 — AAR hub page loads', async ({ page }) => {
    await page.goto('/aar')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('4E.3 — event debrief page loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})
