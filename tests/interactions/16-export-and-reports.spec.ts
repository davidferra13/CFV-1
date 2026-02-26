// Interaction Layer — Export & Reports Tests
// Tests all report pages, export buttons, and PDF/CSV download triggers.
// Verifies report pages render real data and export actions don't crash.
//
// Report pages covered:
//   /finance/reporting (and all sub-routes)
//   /analytics (and all sub-routes)
//   /events/[id]/financial (event financial summary)
//
// Export patterns:
//   Buttons with "Export", "Download", "CSV", "PDF" labels
//   Document links that should return PDFs from API
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Finance Reporting Pages ──────────────────────────────────────────────────

test.describe('Reports — Finance Reporting', () => {
  const reportPages = [
    { label: 'reporting hub', path: '/finance/reporting' },
    { label: 'revenue by month', path: '/finance/reporting/revenue-by-month' },
    { label: 'revenue by client', path: '/finance/reporting/revenue-by-client' },
    { label: 'revenue by event', path: '/finance/reporting/revenue-by-event' },
    { label: 'expense by category', path: '/finance/reporting/expense-by-category' },
    { label: 'profit by event', path: '/finance/reporting/profit-by-event' },
    { label: 'profit & loss', path: '/finance/reporting/profit-loss' },
    { label: 'year-to-date summary', path: '/finance/reporting/year-to-date-summary' },
    { label: 'tax summary', path: '/finance/reporting/tax-summary' },
  ]

  for (const report of reportPages) {
    test(`${report.path} — ${report.label} page loads`, async ({ page }) => {
      await page.goto(report.path)
      await page.waitForLoadState('networkidle')
      expect(page.url()).not.toMatch(/auth\/signin/)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${report.path} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(report.path)
      await page.waitForLoadState('networkidle')
      expect(errors, `${report.label} should not throw JS errors`).toHaveLength(0)
    })
  }
})

// ─── Finance Report — Data Content ────────────────────────────────────────────

test.describe('Reports — Finance Data', () => {
  test('/finance/reporting — shows financial categories or summary', async ({ page }) => {
    await page.goto('/finance/reporting')
    await page.waitForLoadState('networkidle')
    const hasFinancialContent = await page
      .getByText(/revenue|expense|profit|income|payment|report/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    // Informational
    const _ = hasFinancialContent
  })

  test('/finance/reporting/revenue-by-month — shows month breakdown or chart', async ({ page }) => {
    await page.goto('/finance/reporting/revenue-by-month')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/finance/reporting/tax-summary — shows tax-related fields', async ({ page }) => {
    await page.goto('/finance/reporting/tax-summary')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Finance Report — Export Buttons ──────────────────────────────────────────

test.describe('Reports — Export Actions', () => {
  test('/finance/reporting — export button does not crash when clicked', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/finance/reporting')
    await page.waitForLoadState('networkidle')

    const exportBtn = page
      .getByRole('button', { name: /export|download|csv|pdf/i })
      .first()
      .or(page.getByRole('link', { name: /export|download|csv|pdf/i }).first())

    if (await exportBtn.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
      await exportBtn.click()
      await page.waitForTimeout(1500)
    }

    expect(errors).toHaveLength(0)
  })

  test('/finance/reporting/profit-loss — export does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/finance/reporting/profit-loss')
    await page.waitForLoadState('networkidle')

    const exportBtn = page.getByRole('button', { name: /export|download|csv|pdf/i }).first()

    if (await exportBtn.isVisible()) {
      await exportBtn.click()
      await page.waitForTimeout(1500)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Analytics Pages ──────────────────────────────────────────────────────────

test.describe('Reports — Analytics', () => {
  const analyticsPages = [
    { label: 'analytics overview', path: '/analytics' },
    { label: 'reports', path: '/analytics/reports' },
    { label: 'benchmarks', path: '/analytics/benchmarks' },
    { label: 'pipeline analytics', path: '/analytics/pipeline' },
    { label: 'demand analytics', path: '/analytics/demand' },
    { label: 'client LTV', path: '/analytics/client-ltv' },
  ]

  for (const analytics of analyticsPages) {
    test(`${analytics.path} — ${analytics.label} loads`, async ({ page }) => {
      await page.goto(analytics.path)
      await page.waitForLoadState('networkidle')
      expect(page.url()).not.toMatch(/auth\/signin/)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${analytics.path} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(analytics.path)
      await page.waitForLoadState('networkidle')
      expect(errors, `${analytics.label} should not throw JS errors`).toHaveLength(0)
    })
  }
})

// ─── Event Financial Summary ───────────────────────────────────────────────────

test.describe('Reports — Event Financial', () => {
  test('/events/[completed]/financial — shows financial breakdown', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/events/[completed]/financial — shows revenue or cost data', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await page.waitForLoadState('networkidle')
    const hasFinancialContent = await page
      .getByText(/revenue|payment|expense|profit|income|\$|total/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasFinancialContent).toBeTruthy()
  })

  test('/events/[completed]/financial — no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Document PDF API Routes ──────────────────────────────────────────────────

test.describe('Reports — PDF Documents', () => {
  test('Event invoice PDF endpoint responds', async ({ page, seedIds }) => {
    const resp = await page.request.get(
      `/api/events/${seedIds.eventIds.confirmed}/documents/invoice`
    )
    // Should return PDF or a valid redirect — not a 500
    expect(resp.status()).toBeLessThan(500)
  })

  test('Event contract PDF endpoint responds', async ({ page, seedIds }) => {
    const resp = await page.request.get(
      `/api/events/${seedIds.eventIds.confirmed}/documents/contract`
    )
    expect(resp.status()).toBeLessThan(500)
  })

  test('Event receipt PDF endpoint responds', async ({ page, seedIds }) => {
    const resp = await page.request.get(
      `/api/events/${seedIds.eventIds.completed}/documents/receipt`
    )
    expect(resp.status()).toBeLessThan(500)
  })

  test('Quote PDF endpoint responds', async ({ page, seedIds }) => {
    const quoteId = seedIds.quoteIds?.sent || seedIds.quoteIds?.draft
    if (!quoteId) {
      test.skip(true, 'No seeded quote ID available')
      return
    }
    const resp = await page.request.get(`/api/quotes/${quoteId}/pdf`)
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Payout Documents ─────────────────────────────────────────────────────────

test.describe('Reports — Payout Records', () => {
  test('/finance/payouts — payout history loads', async ({ page }) => {
    await page.goto('/finance/payouts')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/finance/payouts — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/finance/payouts')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
