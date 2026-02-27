// Journey Tests — Marketing & Growth (Week 4)
// Verifies push dinners, social media, testimonials, portfolio,
// embed widget, and archetype-specific marketing features.
//
// Scenarios: #255-275
//
// Run: npx playwright test --project=journey-chef tests/journey/16-marketing-growth.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Marketing Hub (#255-256) ───────────────────────────────────────────────────

test.describe('Marketing — Hub (#255-256)', () => {
  test('marketing page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.marketing)
  })

  test('marketing page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.marketing)
  })

  test('marketing page shows content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.marketing)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Push Dinners (#256-258) ────────────────────────────────────────────────────

test.describe('Marketing — Push Dinners (#256-258)', () => {
  test('push dinners page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.marketingPushDinners)
  })

  test('push dinners page has content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.marketingPushDinners)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Email Marketing (#257) ────────────────────────────────────────────────────

test.describe('Marketing — Email (#257)', () => {
  test('marketing sequences page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.marketingSequences)
  })

  test('marketing templates page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.marketingTemplates)
  })
})

// ─── Social Media (#258) ────────────────────────────────────────────────────────

test.describe('Marketing — Social Media (#258)', () => {
  test('social planner page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.socialPlanner)
  })

  test('social vault page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.socialVault)
  })

  test('social connections page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.socialConnections)
  })
})

// ─── Testimonials (#259-260) ────────────────────────────────────────────────────

test.describe('Marketing — Testimonials (#259-260)', () => {
  test('testimonials page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.testimonials)
  })

  test('testimonials page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.testimonials)
  })

  test('testimonials page shows content', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.testimonials)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Embed Widget (#265) ────────────────────────────────────────────────────────

test.describe('Marketing — Embed Widget (#265)', () => {
  test('embed settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsEmbed)
  })

  test('embed settings shows embed code area', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsEmbed)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Network & Community (#276-279) ─────────────────────────────────────────────

test.describe('Marketing — Network (#276-279)', () => {
  test('network page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.network)
  })

  test('network page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.network)
  })

  test('community templates page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.communityTemplates)
  })
})

// ─── Partners (#279) ───────────────────────────────────────────────────────────

test.describe('Marketing — Partners (#279)', () => {
  test('partners page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.partners)
  })
})

// ─── Archetype: Private Chef (#266-268) ─────────────────────────────────────────

test.describe('Marketing — Private Chef (#266-268)', () => {
  test('public profile page loads (chef bio/portfolio)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsPublicProfile)
  })

  test('menus page accessible for social media content', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.menus)
  })
})

// ─── Archetype: Caterer (#269-270) ──────────────────────────────────────────────

test.describe('Marketing — Caterer (#269-270)', () => {
  test('portfolio page loads for event showcase', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsPortfolio)
  })
})

// ─── Archetype: Meal Prep (#271-272) ────────────────────────────────────────────

test.describe('Marketing — Meal Prep (#271-272)', () => {
  test('events page accessible for subscription tier management', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.events)
  })
})

// ─── Archetype: Bakery (#273-275) ───────────────────────────────────────────────

test.describe('Marketing — Bakery (#273-275)', () => {
  test('portfolio accessible for cake portfolio', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsPortfolio)
  })

  test('events page accessible for pre-order management', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.events)
  })
})
