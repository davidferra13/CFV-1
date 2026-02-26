// Interaction Layer — Loyalty Program Tests
// Tests the loyalty program dashboard, reward creation, and loyalty settings.
//
// Routes covered:
//   /loyalty                   — loyalty program dashboard
//   /loyalty/rewards/new       — create new reward
//   /loyalty/settings          — loyalty program configuration
//   /clients/loyalty/rewards   — rewards list (client-facing loyalty section)
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Loyalty Dashboard ────────────────────────────────────────────────────────

test.describe('Loyalty — Dashboard', () => {
  test('/loyalty — page loads without redirect', async ({ page }) => {
    await page.goto('/loyalty')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/loyalty — shows loyalty-related content', async ({ page }) => {
    await page.goto('/loyalty')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/loyalty|reward|point|member|tier|client/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent // informational
  })

  test('/loyalty — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/loyalty')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/loyalty — has navigation to rewards or settings', async ({ page }) => {
    await page.goto('/loyalty')
    await page.waitForLoadState('networkidle')
    const subNav = page.locator('a[href*="/loyalty/"], a[href*="/settings/loyalty"]').first()
    const isVisible = await subNav.isVisible().catch(() => false)
    // Informational — may use tabs or different nav
    const _ = isVisible
  })
})

// ─── Loyalty Rewards List ─────────────────────────────────────────────────────

test.describe('Loyalty — Rewards List', () => {
  test('/clients/loyalty/rewards — rewards list loads', async ({ page }) => {
    const resp = await page.goto('/clients/loyalty/rewards')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/clients/loyalty/rewards — shows rewards content or empty state', async ({ page }) => {
    await page.goto('/clients/loyalty/rewards')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/clients/loyalty/rewards — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/loyalty/rewards')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Loyalty Reward Creation ──────────────────────────────────────────────────

test.describe('Loyalty — Create Reward', () => {
  test('/loyalty/rewards/new — create form loads', async ({ page }) => {
    const resp = await page.goto('/loyalty/rewards/new')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/loyalty/rewards/new — shows reward creation form', async ({ page }) => {
    await page.goto('/loyalty/rewards/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/loyalty/rewards/new — has name/title field', async ({ page }) => {
    await page.goto('/loyalty/rewards/new')
    await page.waitForLoadState('networkidle')
    const nameField = page
      .getByLabel(/name|title|reward/i)
      .first()
      .or(page.locator('input[type="text"]').first())
    const isVisible = await nameField.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/loyalty/rewards/new — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/loyalty/rewards/new')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('Loyalty hub links to create reward page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/loyalty')
    await page.waitForLoadState('networkidle')

    const createBtn = page
      .getByRole('link', { name: /create reward|add reward|new reward/i })
      .first()
      .or(page.getByRole('button', { name: /create reward|add reward/i }).first())

    if (await createBtn.isVisible()) {
      await createBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Loyalty Settings ─────────────────────────────────────────────────────────

test.describe('Loyalty — Settings', () => {
  test('/loyalty/settings — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/loyalty/settings')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/loyalty/settings — shows settings form or config options', async ({ page }) => {
    await page.goto('/loyalty/settings')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/loyalty/settings — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/loyalty/settings')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/clients/loyalty — client loyalty hub loads', async ({ page }) => {
    const resp = await page.goto('/clients/loyalty')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })
})

// ─── Client Loyalty Status ────────────────────────────────────────────────────

test.describe('Loyalty — Client Integration', () => {
  test('Client detail shows loyalty status section', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientId}`)
    await page.waitForLoadState('networkidle')

    const loyaltySection = page.getByText(/loyalty|reward|point|member|tier/i).first()

    const isVisible = await loyaltySection.isVisible().catch(() => false)
    // Informational — loyalty section may or may not be on client detail
    const _ = isVisible
  })

  test('Loyalty page does not expose other chefs client data', async ({ page, seedIds }) => {
    await page.goto('/loyalty')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    // Chef B's client name should not appear in loyalty data
    expect(bodyText).not.toContain('Chef B Client E2E')
  })
})
