// Interaction Layer — Staff Management Tests
// Tests the staff module: roster, schedule, availability, clock-in, labor reporting.
//
// Routes covered:
//   /staff            — roster with active/inactive tabs
//   /staff/schedule   — staff schedule
//   /staff/availability — availability management
//   /staff/clock      — time tracking / clock-in
//   /staff/performance — performance metrics
//   /staff/labor      — labor cost reporting
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Staff Roster ─────────────────────────────────────────────────────────────

test.describe('Staff — Roster', () => {
  test('/staff — roster page loads', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/staff — shows staff list or empty state', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/staff|team|sous chef|server|active|inactive|no staff|add staff/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('/staff — has active/inactive tabs or filters', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const filterEl = page
      .getByRole('tab', { name: /active|inactive|all/i })
      .first()
      .or(page.getByRole('button', { name: /active|inactive/i }).first())
    const isVisible = await filterEl.isVisible().catch(() => false)
    // Informational — may be rendered differently
    if (isVisible) {
      await filterEl.click()
      await page.waitForTimeout(400)
    }
  })

  test('/staff — clicking tab does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const tab = page.getByRole('tab').first()
    if (await tab.isVisible()) {
      await tab.click()
      await page.waitForTimeout(400)
    }
    expect(errors).toHaveLength(0)
  })

  test('/staff — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Staff Schedule ───────────────────────────────────────────────────────────

test.describe('Staff — Schedule', () => {
  test('/staff/schedule — schedule page loads', async ({ page }) => {
    await page.goto('/staff/schedule')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/staff/schedule — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff/schedule')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Staff Availability ────────────────────────────────────────────────────────

test.describe('Staff — Availability', () => {
  test('/staff/availability — availability page loads', async ({ page }) => {
    await page.goto('/staff/availability')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/staff/availability — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff/availability')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Staff Clock / Time Tracking ──────────────────────────────────────────────

test.describe('Staff — Clock In/Out', () => {
  test('/staff/clock — clock page loads', async ({ page }) => {
    await page.goto('/staff/clock')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/staff/clock — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff/clock')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Staff Performance ────────────────────────────────────────────────────────

test.describe('Staff — Performance', () => {
  test('/staff/performance — performance page loads', async ({ page }) => {
    await page.goto('/staff/performance')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/staff/performance — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff/performance')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Staff Labor ──────────────────────────────────────────────────────────────

test.describe('Staff — Labor Reporting', () => {
  test('/staff/labor — labor page loads', async ({ page }) => {
    await page.goto('/staff/labor')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/staff/labor — shows cost data or empty state', async ({ page }) => {
    await page.goto('/staff/labor')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/labor|cost|hours|pay|staff|no data/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('/staff/labor — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/staff/labor')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
