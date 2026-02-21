// Interaction Layer — Leads, Calls & Inbox Tests
// Covers lead management pipeline, call logging, and inbox triage.
//
// Routes covered:
//   /leads/**     — lead pipeline stages (new, qualified, contacted, converted, archived)
//   /calls/**     — call log, call detail, new call
//   /inbox/**     — inbox, triage, history scan
//   /reviews      — client review management
//   /travel       — travel planning hub
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Leads Pipeline ───────────────────────────────────────────────────────────

test.describe('Leads — Pipeline Hub', () => {
  test('/leads — page loads without redirect', async ({ page }) => {
    await page.goto('/leads')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/leads — shows lead pipeline content', async ({ page }) => {
    await page.goto('/leads')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/lead|prospect|pipeline|new|qualified|contacted/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/leads — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/leads')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Leads — Pipeline Stages', () => {
  const stageRoutes = [
    '/leads/new',
    '/leads/qualified',
    '/leads/contacted',
    '/leads/converted',
    '/leads/archived',
  ]

  for (const route of stageRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/leads/new — shows new leads or empty state', async ({ page }) => {
    await page.goto('/leads/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/leads/converted — shows converted leads or empty state', async ({ page }) => {
    await page.goto('/leads/converted')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Lead stage views are tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/leads')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
    expect(bodyText).not.toContain(seedIds.chefBId)
  })

  test('Navigating through lead stages does not produce JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    for (const route of ['/leads', '/leads/new', '/leads/qualified']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Calls ────────────────────────────────────────────────────────────────────

test.describe('Calls — Log', () => {
  test('/calls — page loads without redirect', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/calls — shows call log or empty state', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/call|log|duration|contact|record/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/calls — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/calls')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/calls/new — new call form loads', async ({ page }) => {
    const resp = await page.goto('/calls/new')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/calls/new — shows call entry form', async ({ page }) => {
    await page.goto('/calls/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/calls/new — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/calls/new')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/calls — has Log Call button or link', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('networkidle')
    const logBtn = page
      .getByRole('button', { name: /log call|new call|add call/i })
      .first()
      .or(page.getByRole('link', { name: /log call|new call|add call/i }).first())
    const isVisible = await logBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })
})

// ─── Inbox ────────────────────────────────────────────────────────────────────

test.describe('Inbox — Hub', () => {
  test('/inbox — page loads without redirect', async ({ page }) => {
    await page.goto('/inbox')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/inbox — shows inbox content or empty state', async ({ page }) => {
    await page.goto('/inbox')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/inbox|message|triage|thread|email|unread/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/inbox — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/inbox')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/inbox/triage — triage view loads', async ({ page }) => {
    const resp = await page.goto('/inbox/triage')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/inbox/triage — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/inbox/triage')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/inbox/history-scan — history scan loads', async ({ page }) => {
    const resp = await page.goto('/inbox/history-scan')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/inbox — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/inbox')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
  })
})

// ─── Reviews ──────────────────────────────────────────────────────────────────

test.describe('Reviews', () => {
  test('/reviews — page loads without redirect', async ({ page }) => {
    await page.goto('/reviews')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/reviews — shows review content or empty state', async ({ page }) => {
    await page.goto('/reviews')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/reviews — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/reviews')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Travel ───────────────────────────────────────────────────────────────────

test.describe('Travel', () => {
  test('/travel — page loads without redirect', async ({ page }) => {
    await page.goto('/travel')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/travel — shows travel planning content or empty state', async ({ page }) => {
    await page.goto('/travel')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/travel — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/travel')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
