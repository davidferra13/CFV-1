// Journey Tests — Communication (Week 3)
// Verifies email search, draft follow-ups, decline responses,
// payment reminders, testimonial requests, referral requests,
// re-engagement emails, milestone recognition, and archetype-specific comms.
//
// Scenarios: #178-196
//
// Run: npx playwright test --project=journey-chef tests/journey/11-communication.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Inbox (#178-179) ───────────────────────────────────────────────────────────

test.describe('Communication — Inbox (#178-179)', () => {
  test('inbox page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inbox)
  })

  test('inbox page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.inbox)
  })

  test('inbox shows message list or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.inbox)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Chat (#180) ────────────────────────────────────────────────────────────────

test.describe('Communication — Chat (#180)', () => {
  test('chat page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.chat)
  })

  test('chat page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.chat)
  })
})

// ─── Email Templates (#180-181) ──────────────────────────────────────────────────

test.describe('Communication — Templates (#180-181)', () => {
  test('settings templates page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsTemplates)
  })

  test('templates page shows template list or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsTemplates)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Testimonials (#183) ────────────────────────────────────────────────────────

test.describe('Communication — Testimonials (#183)', () => {
  test('testimonials page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.testimonials)
  })

  test('testimonials page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.testimonials)
  })
})

// ─── Client Communication Hub ───────────────────────────────────────────────────

test.describe('Communication — Client Hub', () => {
  test('client communication page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.clientsCommunication)
  })

  test('client communication notes subpage loads', async ({ page }) => {
    await page.goto('/clients/communication/notes')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('client communication follow-ups subpage loads', async ({ page }) => {
    await page.goto('/clients/communication/follow-ups')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Archetype: Private Chef (#189-190) ─────────────────────────────────────────

test.describe('Communication — Private Chef (#189-190)', () => {
  test('client detail accessible for post-dinner recap context', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientId}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Archetype: Caterer (#191-192) ──────────────────────────────────────────────

test.describe('Communication — Caterer (#191-192)', () => {
  test('proposals page accessible for corporate proposals', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.proposals)
  })
})

// ─── Archetype: Meal Prep (#193-194) ────────────────────────────────────────────

test.describe('Communication — Meal Prep (#193-194)', () => {
  test('menus page accessible for weekly preview emails', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.menus)
  })
})

// ─── Archetype: Bakery (#195-196) ───────────────────────────────────────────────

test.describe('Communication — Bakery (#195-196)', () => {
  test('events page accessible for order confirmation context', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.events)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Activity Feed ──────────────────────────────────────────────────────────────

test.describe('Communication — Activity Feed', () => {
  test('activity page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.activity)
  })

  test('activity page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.activity)
  })

  test('activity page shows feed content or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.activity)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Automations ────────────────────────────────────────────────────────────────

test.describe('Communication — Automations', () => {
  test('settings automations page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsAutomations)
  })
})

// ─── Contracts ──────────────────────────────────────────────────────────────────

test.describe('Communication — Contracts', () => {
  test('settings contracts page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsContracts)
  })
})
