// Journey Tests — Archetype-Specific Setup (Week 1)
// Verifies archetype-specific pages and features:
// Private Chef (kitchen profile, equipment), Caterer (staff, stations),
// Meal Prep (recurring, delivery), Restaurant (KDS, stations),
// Food Truck (locations, routes), Bakery (components, production schedule).
//
// Scenarios: #22-51, #64-80
//
// Run: npx playwright test --project=journey-chef tests/journey/06-archetype-setup.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Private Chef — Kitchen Profile & Equipment (#22-26) ────────────────────────

test.describe('Archetype: Private Chef (#22-26)', () => {
  test('culinary profile / settings profile page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsMyProfile)
  })

  test('profile has editable culinary fields', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsMyProfile)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('public profile page loads (signature dishes)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsPublicProfile)
  })

  test('client preferences page loads (dietary tracking)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsPreferences)
  })
})

// ─── Caterer — Staff & Stations (#27-31) ────────────────────────────────────────

test.describe('Archetype: Caterer (#27-31)', () => {
  test('staff management page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staff)
  })

  test('staff page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.staff)
  })

  test('stations page loads (buffet/plated setup)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.stations)
  })

  test('stations daily ops loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.stationsDailyOps)
  })

  test('staff schedule page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staffSchedule)
  })

  test('staff availability page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staffAvailability)
  })

  test('staff performance page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staffPerformance)
  })

  test('staff labor cost page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.staffLabor)
  })
})

// ─── Meal Prep Chef — Recurring & Delivery (#32-36) ─────────────────────────────

test.describe('Archetype: Meal Prep (#32-36)', () => {
  test('events page loads (recurring event management)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.events)
  })

  test('new event page loads (set up recurring)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsNew)
  })

  test('travel/routes page loads (delivery tracking)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.travel)
  })

  test('tasks page loads (weekly prep checklists)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.tasks)
  })

  test('task templates page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.tasksTemplates)
  })
})

// ─── Restaurant — KDS & Daily Ops (#37-41) ──────────────────────────────────────

test.describe('Archetype: Restaurant (#37-41)', () => {
  test('stations orders page loads (KDS)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.stationsOrders)
  })

  test('daily ops page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.daily)
  })

  test('stations waste page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.stationsWaste)
  })

  test('queue page loads (action queue)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.queue)
  })
})

// ─── Food Truck — Locations & Routes (#42-46) ───────────────────────────────────

test.describe('Archetype: Food Truck (#42-46)', () => {
  test('travel/routes page loads (location management)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.travel)
  })

  test('calendar week view loads (multi-location scheduling)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.calendarWeek)
  })

  test('activity page loads (daily tracking)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.activity)
  })
})

// ─── Bakery / Pastry — Components & Production (#47-51) ─────────────────────────

test.describe('Archetype: Bakery / Pastry (#47-51)', () => {
  test('culinary components page loads (sub-recipes)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryComponents)
  })

  test('culinary costing page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryCosting)
  })

  test('culinary prep page loads (production schedule)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryPrep)
  })

  test('culinary ingredients page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryIngredients)
  })

  test('culinary board page loads (visual menu)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.culinaryBoard)
  })
})

// ─── Event Creation (All Archetypes, #64-80) ────────────────────────────────────

test.describe('Archetype Setup — Event Creation (#64-80)', () => {
  test('event creation wizard loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsNewWizard)
  })

  test('event creation from text loads (AI)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsNewFromText)
  })

  test('events board (kanban) loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsBoard)
  })

  test('events awaiting deposit loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsAwaitingDeposit)
  })
})

// ─── Module Toggle Validation ───────────────────────────────────────────────────

test.describe('Archetype Setup — Module Toggles (#25)', () => {
  test('settings modules page shows all available modules', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsModules)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('settings navigation page loads (shortcut customization)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsNavigation)
  })
})
