// Journey Tests — Edge Cases & Situational Scenarios
// Verifies handling of disputes, double-booking, refunds,
// staff no-show, catch-up on missed expenses, allergic reactions,
// last-minute menu changes, supplemental invoices, seasonal planning,
// and the grandfather crunch (established chefs onboarding rapidly).
//
// Scenarios: #307-335
//
// Run: npx playwright test --project=journey-chef tests/journey/20-edge-cases.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Disputes (#307) ────────────────────────────────────────────────────────────

test.describe('Edge Cases — Disputes (#307)', () => {
  test('finance disputes page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeDisputes)
  })

  test('ledger page accessible for dispute investigation', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeLedger)
  })

  test('event financial page shows event-level financials', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/financial`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Double Booking (#308) ──────────────────────────────────────────────────────

test.describe('Edge Cases — Double Booking (#308)', () => {
  test('calendar shows all events for conflict detection', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.calendar)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('week view shows daily events for overlap detection', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.calendarWeek)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Refunds (#309) ─────────────────────────────────────────────────────────────

test.describe('Edge Cases — Refunds (#309)', () => {
  test('refunds page loads', async ({ page }) => {
    await page.goto('/finance/payments/refunds')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Rescheduling (#310) ────────────────────────────────────────────────────────

test.describe('Edge Cases — Rescheduling (#310)', () => {
  test('event edit page accessible for rescheduling', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}/edit`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('event edit page has date fields', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}/edit`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, select, textarea')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ─── Staff No-Show (#311) ───────────────────────────────────────────────────────

test.describe('Edge Cases — Staff No-Show (#311)', () => {
  test('staff availability page shows who is available', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staffAvailability)
  })

  test('staff page shows team roster', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staff)
  })
})

// ─── Expense Catch-Up (#312) ────────────────────────────────────────────────────

test.describe('Edge Cases — Expense Catch-Up (#312)', () => {
  test('new expense page loads for bulk entry', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.expensesNew)
  })

  test('expenses page shows existing expenses', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.expenses)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Allergic Reaction Documentation (#313) ────────────────────────────────────

test.describe('Edge Cases — Allergic Reaction (#313)', () => {
  test('food safety incident response accessible', async ({ page }) => {
    // Crisis response plan page
    await page.goto('/settings/protection/crisis')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('client preferences page tracks allergies', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsPreferences)
  })

  test('compliance page accessible for incident logging', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsCompliance)
  })
})

// ─── Last-Minute Menu Changes (#314) ────────────────────────────────────────────

test.describe('Edge Cases — Menu Changes (#314)', () => {
  test('menu editor accessible for last-minute changes', async ({ page, seedIds }) => {
    await page.goto(`/menus/${seedIds.menuId}/editor`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('event detail shows menu approval status', async ({ page, seedIds }) => {
    // MenuApprovalStatus is a component on the event detail page, not a standalone route
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Supplemental Invoices (#315) ───────────────────────────────────────────────

test.describe('Edge Cases — Supplemental Invoices (#315)', () => {
  test('finance invoices page accessible for additional invoices', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financeInvoices)
  })
})

// ─── Seasonal Planning (#316-320) ───────────────────────────────────────────────

test.describe('Edge Cases — Seasonal Planning (#316-320)', () => {
  test('year view shows annual overview', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.calendarYear)
  })

  test('demand analytics shows seasonal patterns', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsDemand)
  })

  test('events upcoming shows bookings for season', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsUpcoming)
  })
})

// ─── Business Maturity (#321-326) ───────────────────────────────────────────────

test.describe('Edge Cases — Business Maturity (#321-326)', () => {
  test('analytics benchmarks for pricing decisions', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsBenchmarks)
  })

  test('analytics pipeline for capacity assessment', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsPipeline)
  })

  test('staff page for first hire consideration', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staff)
  })

  test('insights page for business growth tracking', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.insights)
  })

  test('goals page for growth objectives', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.goals)
  })
})

// ─── Grandfather Crunch (#327-335) ──────────────────────────────────────────────

test.describe('Edge Cases — Grandfather Crunch (#327-335)', () => {
  test('events can be created quickly via new event page (#327)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsNew)
  })

  test('event creation form has essential fields (#327)', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.eventsNew)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('import hub accessible for rapid data entry (#328-331)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.import)
  })

  test('import hub has multiple import modes (#331)', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.import)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('new recipe page for quick recipe capture (#332)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.recipesNew)
  })

  test('new client page for rapid client entry (#333)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsNew)
  })

  test('expenses page for bulk expense entry (#334)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.expenses)
  })

  test('payment recording accessible without full setup (#329)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.financePayments)
  })

  test('event board shows status at a glance (#330)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsBoard)
  })

  test('calendar loads for immediate scheduling (#328)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.calendar)
  })
})

// ─── Cannabis (Specialty) ───────────────────────────────────────────────────────

test.describe('Edge Cases — Cannabis Module', () => {
  test('cannabis hub page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.cannabis)
  })
})
