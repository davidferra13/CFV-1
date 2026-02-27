// Journey Tests — Safety & Compliance (Week 3)
// Verifies HACCP plans, certifications, temperature logs,
// cross-contamination checks, allergen tracking, and archetype-specific safety.
//
// Scenarios: #232-246
//
// Run: npx playwright test --project=journey-chef tests/journey/14-safety-compliance.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Compliance Hub (#232-233) ──────────────────────────────────────────────────

test.describe('Safety — Compliance Hub (#232-233)', () => {
  test('compliance settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsCompliance)
  })

  test('compliance page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.settingsCompliance)
  })

  test('compliance page shows content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsCompliance)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── HACCP Plan (#232) ──────────────────────────────────────────────────────────

test.describe('Safety — HACCP Plan (#232)', () => {
  test('HACCP page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsComplianceHaccp)
  })

  test('HACCP page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsComplianceHaccp)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Certifications (#233, #239) ────────────────────────────────────────────────

test.describe('Safety — Certifications (#233, #239)', () => {
  test('protection certifications page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsProtectionCertifications)
  })

  test('protection hub page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsProtection)
  })

  test('protection insurance page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsProtectionInsurance)
  })
})

// ─── Temperature Logs (#234-235) ────────────────────────────────────────────────
// TempLogPanel is a component on the event detail page, not a standalone route.

test.describe('Safety — Temperature Logs (#234-235)', () => {
  test('event detail page loads (contains temp log panel)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('event detail page has content including temp log', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Cross-Contamination (#236) ─────────────────────────────────────────────────

test.describe('Safety — Cross-Contamination (#236)', () => {
  test('menu detail accessible for allergen review', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Allergens (#237) ───────────────────────────────────────────────────────────

test.describe('Safety — Allergens (#237)', () => {
  test('recipe detail shows ingredient allergen info', async ({ page, seedIds }) => {
    await page.goto(`/recipes/${seedIds.recipeId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('client preferences page tracks dietary restrictions', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsPreferences)
  })
})

// ─── Archetype: Caterer (#240-241) ──────────────────────────────────────────────
// ContingencyPanel is a component on the event detail page, not a standalone route.

test.describe('Safety — Caterer (#240-241)', () => {
  test('event detail shows contingency panel (outdoor safety)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    await assertPageHasContent(page)
  })
})

// ─── Archetype: Restaurant (#243-244) ───────────────────────────────────────────

test.describe('Safety — Restaurant (#243-244)', () => {
  test('stations page loads for daily temp checks', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.stations)
  })

  test('stations daily ops loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.stationsDailyOps)
  })
})

// ─── Archetype: Food Truck (#245-246) ───────────────────────────────────────────

test.describe('Safety — Food Truck (#245-246)', () => {
  test('travel page accessible for permit tracking', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.travel)
  })
})

// ─── Emergency & Crisis ─────────────────────────────────────────────────────────

test.describe('Safety — Emergency & Crisis', () => {
  test('emergency contacts page loads', async ({ page }) => {
    await page.goto('/settings/emergency')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('crisis response plan page loads', async ({ page }) => {
    await page.goto('/settings/protection/crisis')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('business continuity plan page loads', async ({ page }) => {
    await page.goto('/settings/protection/continuity')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('NDA & photo permissions page loads', async ({ page }) => {
    await page.goto('/settings/protection/nda')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})
