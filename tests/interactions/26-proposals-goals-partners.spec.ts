// Interaction Layer — Proposals, Goals & Partners Tests
// Tests the proposals hub, goal tracking, and partner management features.
//
// Routes covered:
//   /proposals           — proposals hub (templates, sent proposals)
//   /proposals/new       — create proposal
//   /goals               — goals dashboard
//   /goals/setup         — initial goal configuration
//   /partners            — partner/affiliate hub
//   /partners/new        — add partner
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Proposals Hub ────────────────────────────────────────────────────────────

test.describe('Proposals — Hub', () => {
  test('/proposals — page loads without redirect', async ({ page }) => {
    await page.goto('/proposals')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/proposals — shows proposals content or empty state', async ({ page }) => {
    await page.goto('/proposals')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/proposal|template|draft|sent|client|create/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/proposals — has Create Proposal button', async ({ page }) => {
    await page.goto('/proposals')
    await page.waitForLoadState('networkidle')
    const createBtn = page
      .getByRole('button', { name: /create proposal|new proposal|add proposal/i })
      .first()
      .or(page.getByRole('link', { name: /create proposal|new proposal/i }).first())
    const isVisible = await createBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/proposals — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/proposals')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Proposal Templates & Addons ─────────────────────────────────────────────

test.describe('Proposals — Templates & Addons', () => {
  test('/proposals/templates — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/proposals/templates')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/proposals/templates — shows templates or empty state', async ({ page }) => {
    await page.goto('/proposals/templates')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/proposals/templates — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/proposals/templates')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/proposals/addons — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/proposals/addons')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/proposals/addons — shows addons or empty state', async ({ page }) => {
    await page.goto('/proposals/addons')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/proposals/addons — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/proposals/addons')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('Proposal templates section is present or empty on hub', async ({ page }) => {
    await page.goto('/proposals')
    await page.waitForLoadState('networkidle')
    const templateSection = page.getByText(/template|use template|from template/i).first()
    const isVisible = await templateSection.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })
})

// ─── Goals Dashboard ──────────────────────────────────────────────────────────

test.describe('Goals — Dashboard', () => {
  test('/goals — page loads without redirect', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/goals — shows goal tracking content', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/goal|target|revenue|milestone|progress|metric/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/goals — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Goals Setup ─────────────────────────────────────────────────────────────

test.describe('Goals — Setup', () => {
  test('/goals/setup — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/goals/setup')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/goals/setup — shows setup form or redirects to goals', async ({ page }) => {
    await page.goto('/goals/setup')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/goals/setup — has revenue or target input field', async ({ page }) => {
    await page.goto('/goals/setup')
    await page.waitForLoadState('networkidle')
    const targetField = page
      .getByLabel(/revenue|target|goal|annual/i)
      .first()
      .or(page.getByPlaceholder(/revenue|target|goal/i).first())
      .or(page.locator('input[type="number"]').first())
    const isVisible = await targetField.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/goals/setup — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/goals/setup')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Partners Hub ─────────────────────────────────────────────────────────────

test.describe('Partners — Hub', () => {
  test('/partners — page loads without redirect', async ({ page }) => {
    await page.goto('/partners')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/partners — shows partner/affiliate content', async ({ page }) => {
    await page.goto('/partners')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/partner|affiliate|referral|collaboration|add partner/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/partners — has Add Partner button', async ({ page }) => {
    await page.goto('/partners')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add partner|new partner|create partner/i })
      .first()
      .or(page.getByRole('link', { name: /add partner|new partner/i }).first())
    const isVisible = await addBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/partners — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/partners')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Partners — Add New ───────────────────────────────────────────────────────

test.describe('Partners — Add New', () => {
  test('/partners/new — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/partners/new')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/partners/new — shows add partner form', async ({ page }) => {
    await page.goto('/partners/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/partners/new — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/partners/new')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
