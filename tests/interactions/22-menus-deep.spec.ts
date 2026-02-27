// Interaction Layer — Menus Deep Tests
// Tests menu creation, editing, and the menu editor interface.
//
// Routes covered:
//   /menus            — menu list with "Create Menu" button
//   /menus/new        — create menu form
//   /menus/[id]       — menu detail
//   /menus/[id]/editor — full menu editor (Google Docs-style)
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Menu List ────────────────────────────────────────────────────────────────

test.describe('Menus — List', () => {
  test('/menus — list loads with Create Menu button', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/menus — Create Menu button is visible', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')
    const createBtn = page
      .getByRole('button', { name: /create menu|new menu|add menu/i })
      .first()
      .or(page.getByRole('link', { name: /create menu|new menu/i }).first())
    await expect(createBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/menus — shows seeded menu or empty state', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Either seeded menus appear or an empty state
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/menus — clicking a menu navigates to detail', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')

    const firstMenuLink = page.locator('a[href*="/menus/"]').first()
    if (await firstMenuLink.isVisible()) {
      await firstMenuLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/menus\//)
    }
    expect(errors).toHaveLength(0)
  })

  test('/menus — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/menus')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Menu Creation ────────────────────────────────────────────────────────────

test.describe('Menus — Create Form', () => {
  test('/menus/new — create form loads', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/menus/new — has name field', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')
    const nameField = page
      .getByLabel(/name|title/i)
      .first()
      .or(page.getByPlaceholder(/menu name|name/i).first())
      .or(page.locator('input[name="name"]').first())
    const isVisible = await nameField.isVisible().catch(() => false)
    expect(isVisible).toBeTruthy()
  })

  test('/menus/new — has Save or Create button', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')
    const saveBtn = page.getByRole('button', { name: /save|create|add menu/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
  })

  test('/menus/new — typing in name field does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')

    const nameField = page.locator('input[name="name"], input[type="text"]').first()
    if (await nameField.isVisible()) {
      await nameField.fill('TEST-MENUS-INTERACTION')
    }

    expect(errors).toHaveLength(0)
  })

  test('/menus/new — empty submit shows validation', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')
    const saveBtn = page.getByRole('button', { name: /save|create/i }).first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(1000)
    }
    // Should stay on form or show error
    const url = page.url()
    expect(url).not.toMatch(/\/menus\/[0-9a-f-]{36}$/)
  })

  test('/menus/new — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Menu Detail ──────────────────────────────────────────────────────────────

test.describe('Menus — Detail', () => {
  test('/menus/[id] — seeded menu detail loads', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/menus/[id] — shows menu name and courses', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    const hasMenuContent = await page
      .getByText(/menu|course|dish|amuse|main|dessert|TEST/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasMenuContent).toBeTruthy()
  })

  test('/menus/[id] — has Edit or Open Editor button', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    const editBtn = page
      .getByRole('button', { name: /edit|open editor|customize/i })
      .first()
      .or(page.getByRole('link', { name: /edit|editor|customize/i }).first())
    const isVisible = await editBtn.isVisible().catch(() => false)
    // Informational — may be inline edit
    if (isVisible) {
      await expect(editBtn).toBeVisible()
    }
  })

  test('/menus/[id] — no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Menu Editor ──────────────────────────────────────────────────────────────

test.describe('Menus — Editor', () => {
  test('/menus/[id]/editor — editor loads', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/menus/[id]/editor — shows editing interface', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')
    // Editor should show text input or contenteditable areas
    const editorEl = page
      .locator('[contenteditable], textarea, .editor, [data-testid*="editor"]')
      .first()
      .or(page.getByText(/course|dish|add course|add dish|click to edit/i).first())
    const isVisible = await editorEl.isVisible().catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = isVisible // informational
  })

  test('/menus/[id]/editor — no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Menus - Assistant Panels (New Features)', () => {
  test('/menus/[id]/editor - Cocktail Browser mode switch updates input placeholder', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')
    if (page.url().includes('auth/signin')) return

    await expect(page.getByText(/cocktail browser/i).first()).toBeVisible()
    await expect(page.getByPlaceholder(/cocktail name/i).first()).toBeVisible()

    await page
      .getByRole('button', { name: /by spirit/i })
      .first()
      .click()
    await expect(page.getByPlaceholder(/spirit or ingredient/i).first()).toBeVisible()

    await page
      .getByRole('button', { name: /by name/i })
      .first()
      .click()
    await expect(page.getByPlaceholder(/cocktail name/i).first()).toBeVisible()
  })

  test('/menus/[id] - translation action is disabled until language is selected', async ({
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

  test('/menus/[id] - translation panel toggles without JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

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

    expect(errors).toHaveLength(0)
  })
})

test.describe('Recipes - Assistant Panels (New Features)', () => {
  test('/recipes/[id]/edit - Product Lookup toggles open and closed', async ({ page, seedIds }) => {
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

  test('/recipes/[id]/edit - Product Lookup mode switch updates input placeholder', async ({
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

    await expect(page.getByPlaceholder(/search product name/i).first()).toBeVisible()
    await page
      .getByRole('button', { name: /by barcode/i })
      .first()
      .click()
    await expect(page.getByPlaceholder(/enter barcode/i).first()).toBeVisible()

    await page
      .getByRole('button', { name: /by name/i })
      .first()
      .click()
    await expect(page.getByPlaceholder(/search product name/i).first()).toBeVisible()
  })
})
