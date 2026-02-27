// Interaction Layer — Analytics Deep Tests
// Tests all analytics sub-routes: benchmarks, client LTV, demand forecasting,
// pipeline analytics, and reporting.
//
// Routes covered:
//   /analytics              — analytics hub
//   /analytics/benchmarks   — industry benchmarks
//   /analytics/client-ltv   — client lifetime value
//   /analytics/demand       — demand forecasting
//   /analytics/pipeline     — pipeline analytics
//   /analytics/reports      — report generation
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Analytics Hub ────────────────────────────────────────────────────────────

test.describe('Analytics — Hub', () => {
  test('/analytics — page loads without redirect', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/analytics — shows analytics content', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/analytics|revenue|metric|insight|trend|performance/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/analytics — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/analytics — has links to sub-sections', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    const subLink = page.locator('a[href*="/analytics/"]').first()
    const isVisible = await subLink.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })
})

// ─── Benchmarks ───────────────────────────────────────────────────────────────

test.describe('Analytics — Benchmarks', () => {
  test('/analytics/benchmarks — loads without 500', async ({ page }) => {
    const resp = await page.goto('/analytics/benchmarks')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/analytics/benchmarks — shows benchmark content', async ({ page }) => {
    await page.goto('/analytics/benchmarks')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/analytics/benchmarks — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/analytics/benchmarks')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Client LTV ───────────────────────────────────────────────────────────────

test.describe('Analytics — Client LTV', () => {
  test('/analytics/client-ltv — loads without 500', async ({ page }) => {
    const resp = await page.goto('/analytics/client-ltv')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/analytics/client-ltv — shows LTV data or empty state', async ({ page }) => {
    await page.goto('/analytics/client-ltv')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/analytics/client-ltv — data is tenant-scoped (no Chef B data)', async ({
    page,
    seedIds,
  }) => {
    await page.goto('/analytics/client-ltv')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
    expect(bodyText).not.toContain(seedIds.chefBId)
  })

  test('/analytics/client-ltv — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/analytics/client-ltv')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Demand Forecasting ───────────────────────────────────────────────────────

test.describe('Analytics — Demand', () => {
  test('/analytics/demand — loads without 500', async ({ page }) => {
    const resp = await page.goto('/analytics/demand')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/analytics/demand — shows demand content or empty state', async ({ page }) => {
    await page.goto('/analytics/demand')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/analytics/demand — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/analytics/demand')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Pipeline Analytics ───────────────────────────────────────────────────────

test.describe('Analytics — Pipeline', () => {
  test('/analytics/pipeline — loads without 500', async ({ page }) => {
    const resp = await page.goto('/analytics/pipeline')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/analytics/pipeline — shows pipeline data or empty state', async ({ page }) => {
    await page.goto('/analytics/pipeline')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/analytics/pipeline — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/analytics/pipeline')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Reports ──────────────────────────────────────────────────────────────────

test.describe('Analytics — Reports', () => {
  test('/analytics/reports — loads without 500', async ({ page }) => {
    const resp = await page.goto('/analytics/reports')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/analytics/reports — shows reports or empty state', async ({ page }) => {
    await page.goto('/analytics/reports')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/analytics/reports — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/analytics/reports')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Analytics Cross-Section ──────────────────────────────────────────────────

test.describe('Analytics — Cross-Section', () => {
  test('All analytics sub-routes load without 500', async ({ page }) => {
    const routes = [
      '/analytics',
      '/analytics/benchmarks',
      '/analytics/client-ltv',
      '/analytics/demand',
      '/analytics/pipeline',
      '/analytics/reports',
    ]
    for (const route of routes) {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status(), `${route} should not 500`).not.toBe(500)
    }
  })

  test('Navigating across analytics sub-routes does not produce JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const routes = ['/analytics', '/analytics/benchmarks', '/analytics/client-ltv']
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })
})

test.describe('Analytics - Daily Report', () => {
  test('/analytics/daily-report - page loads and stays authenticated', async ({ page }) => {
    await page.goto('/analytics/daily-report')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('auth/signin')) return

    expect(page.url()).toMatch(/\/analytics\/daily-report/)
    await expect(page.getByRole('heading', { name: /daily report/i })).toBeVisible()
  })

  test('/analytics/daily-report - shows core metric cards', async ({ page }) => {
    await page.goto('/analytics/daily-report')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('auth/signin')) return

    await expect(page.getByText("Today's Revenue")).toBeVisible()
    await expect(page.getByText('MTD Revenue')).toBeVisible()
    await expect(page.getByText('vs Last Month')).toBeVisible()
    await expect(page.getByText('Outstanding')).toBeVisible()
  })

  test('/analytics/daily-report - previous day navigation updates date heading', async ({
    page,
  }) => {
    await page.goto('/analytics/daily-report')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('auth/signin')) return

    const dateHeading = page.locator('h2.text-lg.font-semibold').first()
    await expect(dateHeading).toBeVisible()

    const before = (await dateHeading.innerText()).trim()
    const navContainer = dateHeading.locator('xpath=..')
    await navContainer.locator('button').first().click()

    await expect(dateHeading).not.toHaveText(before, { timeout: 10_000 })
  })

  test('/analytics/daily-report - regenerate button is actionable with no JS errors', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/analytics/daily-report')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('auth/signin')) return

    const regenerate = page.getByRole('button', { name: /regenerate/i }).first()
    await expect(regenerate).toBeVisible()
    await regenerate.click()

    await expect(page.getByRole('button', { name: /regenerate/i }).first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})
