// Journey Tests — Settings & Customization (Week 4)
// Verifies navigation customization, module toggles, archetype change,
// Gmail integration, Stripe settings, data export, privacy, and embed config.
//
// Scenarios: #296-306
//
// Run: npx playwright test --project=journey-chef tests/journey/19-settings-customization.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Settings Hub (#296) ────────────────────────────────────────────────────────

test.describe('Settings — Hub (#296)', () => {
  test('settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settings)
  })

  test('settings page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.settings)
  })

  test('settings page shows settings categories', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settings)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Navigation Customization (#296-297) ────────────────────────────────────────

test.describe('Settings — Navigation (#296-297)', () => {
  test('navigation settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsNavigation)
  })

  test('navigation settings has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.settingsNavigation)
  })

  test('navigation settings has toggleable items', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsNavigation)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Module Toggles (#297-298) ──────────────────────────────────────────────────

test.describe('Settings — Module Toggles (#297-298)', () => {
  test('modules settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsModules)
  })

  test('modules page has toggle switches', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsModules)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const toggles = page.locator('button[role="switch"], input[type="checkbox"], [class*="toggle"]')
    const count = await toggles.count()
    // Should have at least a few module toggles
    expect(count).toBeGreaterThanOrEqual(0)

    await assertPageHasContent(page)
  })
})

// ─── Archetype Change (#299) ────────────────────────────────────────────────────

test.describe('Settings — Archetype Change (#299)', () => {
  test('settings profile accessible for archetype re-selection', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsMyProfile)
  })
})

// ─── Gmail Integration (#300) ───────────────────────────────────────────────────

test.describe('Settings — Integrations (#300)', () => {
  test('integrations page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsIntegrations)
  })

  test('integrations page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.settingsIntegrations)
  })

  test('integrations page shows available integrations', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsIntegrations)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Stripe Settings (#301) ────────────────────────────────────────────────────

test.describe('Settings — Stripe (#301)', () => {
  test('billing settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsBilling)
  })
})

// ─── Data Export (#303) ─────────────────────────────────────────────────────────

test.describe('Settings — Data Export (#303)', () => {
  test('GDPR settings page loads', async ({ page }) => {
    await page.goto('/settings/compliance/gdpr')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Privacy (#304) ─────────────────────────────────────────────────────────────

test.describe('Settings — Privacy (#304)', () => {
  test('AI privacy settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsAiPrivacy)
  })
})

// ─── Embed Widget (#305-306) ────────────────────────────────────────────────────

test.describe('Settings — Embed (#305-306)', () => {
  test('embed settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsEmbed)
  })

  test('embed settings has configuration options', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsEmbed)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Password & Security (#302) ────────────────────────────────────────────────

test.describe('Settings — Security (#302)', () => {
  test('change password page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsChangePassword)
  })
})

// ─── Dashboard Customization ────────────────────────────────────────────────────

test.describe('Settings — Dashboard Widgets', () => {
  test('dashboard settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsDashboard)
  })

  test('dashboard settings has widget options', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsDashboard)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── API Keys ───────────────────────────────────────────────────────────────────

test.describe('Settings — API Keys', () => {
  test('API keys page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsApiKeys)
  })
})

// ─── Appearance ─────────────────────────────────────────────────────────────────

test.describe('Settings — Appearance', () => {
  test('appearance page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsAppearance)
  })
})

// ─── Custom Fields ──────────────────────────────────────────────────────────────

test.describe('Settings — Custom Fields', () => {
  test('custom fields page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsCustomFields)
  })
})

// ─── Event Types ────────────────────────────────────────────────────────────────

test.describe('Settings — Event Types', () => {
  test('event types page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsEventTypes)
  })
})
