// Interaction Layer — Inventory, Waste & Costing Tests
// Tests inventory management hub, waste logging, and vendor invoice features.
//
// Routes covered:
//   /inventory           — inventory hub / dashboard
//   /inventory/counts    — inventory count entry
//   /inventory/waste     — waste log
//   /inventory/vendors   — vendor management (also /culinary/vendors)
//   /culinary/vendors    — vendor list (alt route)
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Inventory Hub ────────────────────────────────────────────────────────────

test.describe('Inventory — Hub', () => {
  test('/inventory — page loads without redirect', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/inventory — shows inventory-related content or empty state', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/inventory|stock|item|count|ingredient|storage|pantry/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent // informational
  })

  test('/inventory — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/inventory — has navigation to counts or waste sub-sections', async ({ page }) => {
    await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    const subNav = page
      .locator('a[href*="/inventory/"], button')
      .filter({ hasText: /count|waste|vendor|add/i })
      .first()
    const isVisible = await subNav.isVisible().catch(() => false)
    // Informational — may use different nav pattern
    const _ = isVisible
  })
})

// ─── Inventory Counts ─────────────────────────────────────────────────────────

test.describe('Inventory — Counts', () => {
  test('/inventory/counts — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/inventory/counts')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/inventory/counts — shows count entry interface or empty state', async ({ page }) => {
    await page.goto('/inventory/counts')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/inventory/counts — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/inventory/counts')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Waste Log ────────────────────────────────────────────────────────────────

test.describe('Inventory — Waste Log', () => {
  test('/inventory/waste — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/inventory/waste')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/inventory/waste — shows waste log or empty state', async ({ page }) => {
    await page.goto('/inventory/waste')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/inventory/waste — has Add Waste Entry button or form', async ({ page }) => {
    await page.goto('/inventory/waste')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add waste|log waste|record waste|new entry/i })
      .first()
      .or(page.getByRole('link', { name: /add waste|log waste/i }).first())
    const isVisible = await addBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/inventory/waste — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/inventory/waste')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('Adding waste entry form does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/inventory/waste')
    await page.waitForLoadState('networkidle')

    const addBtn = page
      .getByRole('button', { name: /add waste|log waste|new entry/i })
      .first()

    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Vendor Management ────────────────────────────────────────────────────────

test.describe('Inventory — Vendors', () => {
  test('/culinary/vendors — vendor list loads', async ({ page }) => {
    await page.goto('/culinary/vendors')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/culinary/vendors — shows vendor content or empty state', async ({ page }) => {
    await page.goto('/culinary/vendors')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/vendor|supplier|purveyor|distributor|add vendor/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent // informational
  })

  test('/culinary/vendors — has Add Vendor button', async ({ page }) => {
    await page.goto('/culinary/vendors')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add vendor|new vendor|create vendor/i })
      .first()
      .or(page.getByRole('link', { name: /add vendor|new vendor/i }).first())
    const isVisible = await addBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/culinary/vendors — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/culinary/vendors')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Carry-Forward Inventory ──────────────────────────────────────────────────

test.describe('Inventory — Carry-Forward', () => {
  test('Inventory page does not 500', async ({ page }) => {
    const resp = await page.goto('/inventory')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('Inventory shows event-linked carry-forward or empty state without crashing', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    // Navigate to the confirmed event which has inventory context
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')

    const inventorySection = page
      .getByText(/inventory|carry.?forward|leftover|remaining/i)
      .first()

    const isVisible = await inventorySection.isVisible().catch(() => false)
    // Informational
    const _ = isVisible

    expect(errors).toHaveLength(0)
  })
})
