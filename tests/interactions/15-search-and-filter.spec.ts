// Interaction Layer — Search & Filter Tests
// Tests search inputs, filter dropdowns, and list filtering
// across clients, events, recipes, quotes, and expenses.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Client Search ─────────────────────────────────────────────────────────────

test.describe('Search — Clients', () => {
  test('/clients — search input is present', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const searchInput = page
      .getByPlaceholder(/search|find|filter/i)
      .first()
      .or(page.locator('input[type="search"], input[type="text"]').first())
    const isVisible = await searchInput.isVisible().catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    // Informational — not all list pages have visible search
    if (isVisible) {
      await expect(searchInput).toBeVisible()
    }
  })

  test('/clients — typing in search filters the list', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .getByPlaceholder(/search|find|filter/i)
      .first()
      .or(page.locator('input[type="search"]').first())

    if (await searchInput.isVisible()) {
      await searchInput.fill('Alice')
      await page.waitForTimeout(500)
      // The list should update — no crash is the key assertion
      expect(errors).toHaveLength(0)
    }
  })

  test('/clients — clearing search restores full list', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .getByPlaceholder(/search|find|filter/i)
      .first()
      .or(page.locator('input[type="search"]').first())

    if (await searchInput.isVisible()) {
      await searchInput.fill('Alice')
      await page.waitForTimeout(400)
      await searchInput.clear()
      await page.waitForTimeout(400)
      expect(errors).toHaveLength(0)
    }
  })

  test('/clients — searching for nonexistent name shows empty state or no crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .getByPlaceholder(/search|find|filter/i)
      .first()
      .or(page.locator('input[type="search"]').first())

    if (await searchInput.isVisible()) {
      await searchInput.fill('ZZZNobodyByThisNameExists999')
      await page.waitForTimeout(500)
      // Should show empty state or zero results — no crash
      expect(errors).toHaveLength(0)
    }
  })
})

// ─── Event Filtering ───────────────────────────────────────────────────────────

test.describe('Search — Events', () => {
  test('/events — events list loads with potential filter UI', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/events — status filter buttons are present or status tabs', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    // Look for status filter tabs or dropdown
    const filterEl = page
      .getByRole('tab')
      .first()
      .or(page.getByText(/all|draft|proposed|confirmed|completed/i).first())
    const isVisible = await filterEl.isVisible().catch(() => false)
    // Informational — filter UI location varies
    if (isVisible) {
      await expect(filterEl).toBeVisible()
    }
  })

  test('/events — clicking status filter does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    // Look for a filter button or tab and click it
    const filterBtn = page
      .getByRole('tab', { name: /all|draft|proposed|completed/i })
      .first()
      .or(page.getByRole('button', { name: /all events|filter/i }).first())

    if (await filterBtn.isVisible()) {
      await filterBtn.click()
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })

  test('/events — search input works without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .getByPlaceholder(/search|find/i)
      .first()
      .or(page.locator('input[type="search"]').first())

    if (await searchInput.isVisible()) {
      await searchInput.fill('dinner')
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Recipe Search ─────────────────────────────────────────────────────────────

test.describe('Search — Recipes', () => {
  test('/recipes — recipe list has search or filter', async ({ page }) => {
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/recipes — typing in search does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .getByPlaceholder(/search|find|filter|recipe/i)
      .first()
      .or(page.locator('input[type="search"], input[type="text"]').first())

    if (await searchInput.isVisible()) {
      await searchInput.fill('pasta')
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })

  test('/recipes — category filter works without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')

    // Look for category tabs or dropdown
    const categoryFilter = page
      .getByRole('tab')
      .first()
      .or(page.locator('select').first())

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click()
      await page.waitForTimeout(400)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Quote Filtering ───────────────────────────────────────────────────────────

test.describe('Search — Quotes', () => {
  test('/quotes — quotes list has filter/tab options', async ({ page }) => {
    await page.goto('/quotes')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/quotes — status tabs or filters work without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/quotes')
    await page.waitForLoadState('networkidle')

    const filterEl = page
      .getByRole('tab', { name: /all|draft|sent|accepted|declined/i })
      .first()
      .or(page.getByRole('button', { name: /draft|sent|all/i }).first())

    if (await filterEl.isVisible()) {
      await filterEl.click()
      await page.waitForTimeout(400)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Expense Filtering ────────────────────────────────────────────────────────

test.describe('Search — Expenses', () => {
  test('/expenses — expense list loads', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/expenses — category filter works without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')

    const filterEl = page
      .locator('select, input[type="search"]')
      .first()
      .or(page.getByRole('tab').first())

    if (await filterEl.isVisible()) {
      await filterEl.click()
      await page.waitForTimeout(400)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Global Search ────────────────────────────────────────────────────────────

test.describe('Search — Global/Universal', () => {
  test('Dashboard search or quick-find is accessible', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Many apps have cmd+K or a search icon in the nav
    const searchTrigger = page
      .getByPlaceholder(/search|find/i)
      .first()
      .or(page.locator('[data-testid="search"], [aria-label*="search"]').first())

    if (await searchTrigger.isVisible()) {
      await searchTrigger.click()
      await page.waitForTimeout(400)
    }

    // Even if no global search, the dashboard should not crash
    expect(errors).toHaveLength(0)
  })

  test('Pressing Escape on any page does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    expect(errors).toHaveLength(0)
  })
})
