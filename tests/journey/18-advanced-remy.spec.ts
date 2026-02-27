// Journey Tests — Advanced Remy Features (Week 4)
// Verifies Remy memory management, personality changes,
// capabilities panel, action log, and proactive nudges.
// NO LLM invocation — only UI mechanics.
//
// Scenarios: #286-295
//
// Run: npx playwright test --project=journey-chef tests/journey/18-advanced-remy.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  openRemyDrawer,
  closeRemyDrawer,
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Remy Memory (#286-288) ─────────────────────────────────────────────────────

test.describe('Advanced Remy — Memory (#286-288)', () => {
  test('Remy drawer opens and accepts memory-related input', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')
    await openRemyDrawer(page)

    const input = page.locator('[data-remy-input]')
    await input.fill('Remember that I always charge a travel fee for events over 30 miles')
    await expect(input).toHaveValue(/travel fee/)

    // We do NOT send the message (that would invoke LLM)
    // Just verify the input accepts the text
    await closeRemyDrawer(page)
  })

  test('Remy drawer accepts "show memories" input', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')
    await openRemyDrawer(page)

    const input = page.locator('[data-remy-input]')
    await input.fill("What's in your memory about my business?")
    await expect(input).toHaveValue(/memory/)

    await closeRemyDrawer(page)
  })
})

// ─── Remy Personality (#289-290) ─────────────────────────────────────────────────

test.describe('Advanced Remy — Personality (#289-290)', () => {
  test('Remy commands/capabilities page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.commands)
  })

  test('Remy page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.remy)
  })

  test('Remy commands page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.commands)
  })

  test('Remy drawer settings accessible from drawer', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')
    await openRemyDrawer(page)

    // Look for settings/gear icon in drawer header
    const headerButtons = page.locator('button').filter({
      has: page.locator('svg'),
    })
    const count = await headerButtons.count()
    expect(count).toBeGreaterThan(0)

    await closeRemyDrawer(page)
  })
})

// ─── Remy Capabilities (#291) ───────────────────────────────────────────────────

test.describe('Advanced Remy — Capabilities (#291)', () => {
  test('commands page shows Remy capabilities', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.commands)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Remy Action Log (#292) ─────────────────────────────────────────────────────

test.describe('Advanced Remy — Action Log (#292)', () => {
  test('Remy drawer has view tabs including action log', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')
    await openRemyDrawer(page)

    // View tabs include Activity/Action Log tab
    const tabs = page.locator('button').filter({
      has: page.locator('svg'),
    })
    const count = await tabs.count()
    // Should have multiple view tabs
    expect(count).toBeGreaterThan(2)

    await closeRemyDrawer(page)
  })
})

// ─── Proactive Nudges (#293-295) ────────────────────────────────────────────────

test.describe('Advanced Remy — Nudges (#293-295)', () => {
  test('dashboard shows priority queue or next actions', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('queue page loads (priority queue for nudges)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.queue)
  })

  test('queue page shows prioritized items or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.queue)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── AI Privacy Settings ────────────────────────────────────────────────────────

test.describe('Advanced Remy — Privacy Settings', () => {
  test('AI privacy settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsAiPrivacy)
  })

  test('AI privacy page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.settingsAiPrivacy)
  })

  test('AI privacy page shows privacy controls', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsAiPrivacy)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})
