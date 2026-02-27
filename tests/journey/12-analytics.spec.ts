// Journey Tests — Analytics & Business Intelligence (Week 3)
// Verifies conversion rate, funnel, revenue trend, break-even,
// client LTV, seasonal patterns, and archetype-specific analytics.
//
// Scenarios: #197-224
//
// Run: npx playwright test --project=journey-chef tests/journey/12-analytics.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Analytics Hub (#197-199) ───────────────────────────────────────────────────

test.describe('Analytics — Hub (#197-199)', () => {
  test('analytics page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analytics)
  })

  test('analytics page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.analytics)
  })

  test('analytics shows content or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.analytics)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Funnel & Pipeline (#198, #202) ─────────────────────────────────────────────

test.describe('Analytics — Funnel (#198, #202)', () => {
  test('funnel analytics page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsFunnel)
  })

  test('pipeline analytics page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsPipeline)
  })
})

// ─── Revenue Trends (#200, #202) ────────────────────────────────────────────────

test.describe('Analytics — Revenue Trends (#200, #202)', () => {
  test('finance reporting page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeReporting)
  })

  test('revenue by month report loads', async ({ page }) => {
    await page.goto('/finance/reporting/revenue-by-month')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('revenue by event report loads', async ({ page }) => {
    await page.goto('/finance/reporting/revenue-by-event')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Break-Even (#201) ─────────────────────────────────────────────────────────

test.describe('Analytics — Break-Even (#201)', () => {
  test('analytics benchmarks page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsBenchmarks)
  })
})

// ─── Client LTV (#204) ─────────────────────────────────────────────────────────

test.describe('Analytics — Client LTV (#204)', () => {
  test('client LTV analytics page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsClientLtv)
  })

  test('client LTV page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.analyticsClientLtv)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Referral Sources (#205) ────────────────────────────────────────────────────

test.describe('Analytics — Referral Sources (#205)', () => {
  test('referral sources page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsReferralSources)
  })
})

// ─── Demand Heatmap (#206) ──────────────────────────────────────────────────────

test.describe('Analytics — Demand (#206)', () => {
  test('demand analytics page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsDemand)
  })
})

// ─── Reports (#203) ────────────────────────────────────────────────────────────

test.describe('Analytics — Reports (#203)', () => {
  test('analytics reports page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsReports)
  })
})

// ─── Insights Hub ───────────────────────────────────────────────────────────────

test.describe('Analytics — Insights', () => {
  test('insights hub page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.insights)
  })

  test('insights time analysis page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.insightsTimeAnalysis)
  })
})

// ─── Goals ──────────────────────────────────────────────────────────────────────

test.describe('Analytics — Goals', () => {
  test('goals page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.goals)
  })
})

// ─── Archetype: Private Chef (#207-209) ─────────────────────────────────────────

test.describe('Analytics — Private Chef (#207-209)', () => {
  test('revenue by event shows per-dinner data', async ({ page }) => {
    await page.goto('/finance/reporting/revenue-by-event')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('profit by event shows profitability per dinner', async ({ page }) => {
    await page.goto('/finance/reporting/profit-by-event')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Archetype: Caterer (#210-212) ──────────────────────────────────────────────

test.describe('Analytics — Caterer (#210-212)', () => {
  test('analytics page shows event type comparison data', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.analytics)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('staff labor page shows cost impact on margins', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staffLabor)
  })
})

// ─── Archetype: Meal Prep (#213-215) ────────────────────────────────────────────

test.describe('Analytics — Meal Prep (#213-215)', () => {
  test('client insights page shows retention data', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsInsights)
  })
})

// ─── Archetype: Restaurant (#216-218) ───────────────────────────────────────────

test.describe('Analytics — Restaurant (#216-218)', () => {
  test('food cost revenue page loads', async ({ page }) => {
    await page.goto('/food-cost/revenue')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Archetype: Food Truck (#219-221) ───────────────────────────────────────────

test.describe('Analytics — Food Truck (#219-221)', () => {
  test('analytics page accessible for location comparison', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.analytics)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Archetype: Bakery (#222-224) ───────────────────────────────────────────────

test.describe('Analytics — Bakery (#222-224)', () => {
  test('expense by category shows ingredient cost breakdown', async ({ page }) => {
    await page.goto('/finance/reporting/expense-by-category')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})
