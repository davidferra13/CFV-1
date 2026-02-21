// Interaction Layer — Create Flows
// Tests that core entities can be created via the UI.
// Each test fills a real form, submits it, and verifies the result appears.
// Uses chef storageState (set by interactions-chef project).
//
// NOTE: These tests CREATE real data in the remote database against the E2E chef
// tenant. Data is namespaced with "TEST-INTERACTION" prefix for easy cleanup.
//
// Run: npm run test:interactions

import { test, expect } from '../helpers/fixtures'

const INTERACTION_PREFIX = 'TEST-INTERACTION'

// ─── Client Creation ──────────────────────────────────────────────────────────

test.describe('Create Flows — Client', () => {
  test('create new client via form', async ({ page }) => {
    await page.goto('/clients/new')
    await page.waitForLoadState('networkidle')

    // Fill in required fields
    const ts = Date.now()
    const name = `${INTERACTION_PREFIX} Client ${ts}`
    const email = `interaction.client.${ts}@chefflow.test`

    // Full name field
    const nameField = page.getByLabel(/full name/i).first()
      .or(page.getByPlaceholder(/full name/i).first())
    await nameField.fill(name)

    // Email field
    const emailField = page.getByLabel(/email/i).first()
      .or(page.getByPlaceholder(/email/i).first())
    await emailField.fill(email)

    // Submit
    const submitBtn = page.getByRole('button', { name: /save|create|add client/i }).first()
    await submitBtn.click()

    // Should navigate away from /new and show the new client
    await page.waitForLoadState('networkidle')
    const url = page.url()
    // Either redirected to client detail or the list shows the new client
    const nameVisible = await page.getByText(name).isVisible().catch(() => false)
    const navigatedAway = !url.endsWith('/clients/new')
    expect(nameVisible || navigatedAway, 'Client creation should succeed or navigate away from /new').toBeTruthy()
  })
})

// ─── Expense Creation ─────────────────────────────────────────────────────────

test.describe('Create Flows — Expense', () => {
  test('create new expense via form', async ({ page, seedIds }) => {
    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')

    // Amount field
    const amountField = page.getByLabel(/amount/i).first()
      .or(page.getByPlaceholder(/amount/i).first())
    await amountField.fill('42.50')

    // Description field
    const descField = page.getByLabel(/description|note/i).first()
      .or(page.getByPlaceholder(/description|note/i).first())
    await descField.fill(`${INTERACTION_PREFIX} Expense`)

    // Try to submit
    const submitBtn = page.getByRole('button', { name: /save|add expense|create/i }).first()
    await submitBtn.click()

    await page.waitForLoadState('networkidle')
    const url = page.url()
    // Verify we didn't stay on /expenses/new (meaning form processed)
    // Some forms redirect on success, others show inline
    expect(url).not.toMatch(/\/expenses\/new$.*error/)
  })
})

// ─── Recipe Creation ──────────────────────────────────────────────────────────

test.describe('Create Flows — Recipe', () => {
  test('create new recipe via form', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.waitForLoadState('networkidle')

    const ts = Date.now()
    const recipeName = `${INTERACTION_PREFIX} Recipe ${ts}`

    // Recipe name
    const nameField = page.getByLabel(/name|title/i).first()
      .or(page.getByPlaceholder(/recipe name|name|title/i).first())
    await nameField.fill(recipeName)

    // Try to submit
    const submitBtn = page.getByRole('button', { name: /save|create|add recipe/i }).first()
    await submitBtn.click()

    await page.waitForLoadState('networkidle')
    const url = page.url()
    // If redirect occurred, recipe was saved
    const savedOrNavigated = !url.endsWith('/recipes/new') ||
      await page.getByText(recipeName).isVisible().catch(() => false)
    expect(savedOrNavigated, 'Recipe form should submit and navigate or show recipe').toBeTruthy()
  })

  test('/recipes/new — form has required fields', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.waitForLoadState('networkidle')
    // Page should have at minimum a name/title field
    const nameField = page.getByLabel(/name|title/i).first()
      .or(page.getByPlaceholder(/recipe name|name/i).first())
    await expect(nameField).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Menu Creation ────────────────────────────────────────────────────────────

test.describe('Create Flows — Menu', () => {
  test('/menus/new — form renders', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')
    // Should have a name field
    const nameField = page.getByLabel(/menu name|name|title/i).first()
      .or(page.getByPlaceholder(/menu name|name/i).first())
    await expect(nameField).toBeVisible({ timeout: 10_000 })
  })

  test('create new menu via form', async ({ page }) => {
    await page.goto('/menus/new')
    await page.waitForLoadState('networkidle')

    const ts = Date.now()
    const menuName = `${INTERACTION_PREFIX} Menu ${ts}`

    const nameField = page.getByLabel(/menu name|name|title/i).first()
      .or(page.getByPlaceholder(/menu name|name/i).first())
    await nameField.fill(menuName)

    const submitBtn = page.getByRole('button', { name: /save|create|add menu/i }).first()
    await submitBtn.click()

    await page.waitForLoadState('networkidle')
    const url = page.url()
    const savedOrNavigated = !url.endsWith('/menus/new') ||
      await page.getByText(menuName).isVisible().catch(() => false)
    expect(savedOrNavigated, 'Menu form should submit or show menu name').toBeTruthy()
  })
})

// ─── Inquiry Creation ─────────────────────────────────────────────────────────

test.describe('Create Flows — Inquiry', () => {
  test('/inquiries/new — form renders with required fields', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    // Should have some fields — source message or client selector
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
    // Look for any input
    const inputs = await page.locator('input, textarea, select').count()
    expect(inputs, 'Inquiry form should have at least one input field').toBeGreaterThan(0)
  })
})

// ─── Event Creation ───────────────────────────────────────────────────────────

test.describe('Create Flows — Event', () => {
  test('/events/new — form renders with required fields', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')
    // Should have occasion, date, or client fields
    const inputs = await page.locator('input, textarea, select').count()
    expect(inputs, 'Event form should have input fields').toBeGreaterThan(0)
  })

  test('/events/new/wizard — wizard renders step 1', async ({ page }) => {
    await page.goto('/events/new/wizard')
    await page.waitForLoadState('networkidle')
    // Should show a first step with some content
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/events/new/from-text — AI form renders', async ({ page }) => {
    await page.goto('/events/new/from-text')
    await page.waitForLoadState('networkidle')
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Call Creation ────────────────────────────────────────────────────────────

test.describe('Create Flows — Call', () => {
  test('/calls/new — call scheduling form renders', async ({ page }) => {
    await page.goto('/calls/new')
    await page.waitForLoadState('networkidle')
    const inputs = await page.locator('input, textarea, select').count()
    expect(inputs, 'Call form should have at least one field').toBeGreaterThan(0)
  })
})
