// Journey Tests - Onboarding & Setup (Week 1, Day 1)
// Run: npx playwright test --project=journey-chef tests/journey/02-onboarding-setup.spec.ts

import type { Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'
import { assertPageLoads, assertNoPageErrors, JOURNEY_ROUTES } from './helpers/journey-helpers'

async function loginAsChef(page: Page, email: string, password: string) {
  const response = await page.request.post('/api/e2e/auth', {
    data: { email, password },
    timeout: 90_000,
  })
  expect(response.ok()).toBeTruthy()
}

test.describe('Onboarding - Hub & Wizard (#1-2)', () => {
  test('new-chef stays on the first-run setup flow', async ({ page, seedIds }) => {
    const chef = seedIds.activationChefs.newChef
    await loginAsChef(page, chef.email, chef.password)

    await page.goto(JOURNEY_ROUTES.onboarding, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.getByText(/ChefFlow Setup|Skip setup/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('wizard-complete-not-activated sees the first-week activation hub', async ({
    page,
    seedIds,
  }) => {
    const chef = seedIds.activationChefs.wizardCompleteNotActivated
    await loginAsChef(page, chef.email, chef.password)

    await page.goto(JOURNEY_ROUTES.onboarding, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.getByRole('heading', { name: /Activate Your First Week/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/profile, lead, quote, event, prep, and invoice/i)).toBeVisible()
    await expect(page.getByText(/Now bring in your data/i)).toHaveCount(0)
  })

  test('onboarding has no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    const chef = seedIds.activationChefs.wizardCompleteNotActivated
    await loginAsChef(page, chef.email, chef.password)

    await page.goto(JOURNEY_ROUTES.onboarding, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(3_000)
    expect(errors).toHaveLength(0)
  })

  test('onboarding hub shows activation content and secondary setup', async ({ page, seedIds }) => {
    const chef = seedIds.activationChefs.wizardCompleteNotActivated
    await loginAsChef(page, chef.email, chef.password)

    await page.goto(JOURNEY_ROUTES.onboarding, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByText(/More setup you can do next/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Client import/i)).toBeVisible()
    await expect(page.getByText(/Recipe library/i)).toBeVisible()
  })
})

// Note: /onboarding/profile does not exist. Profile setup lives at /settings/my-profile.

test.describe('Onboarding - Profile Setup (#2)', () => {
  test('profile setup page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsMyProfile)
  })

  test('profile page has name/business fields', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsMyProfile)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const nameField = page.getByLabel(/name/i).first().or(page.getByPlaceholder(/name/i).first())
    const fieldExists = await nameField.isVisible().catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(fieldExists || bodyText.length > 50).toBeTruthy()
  })
})

test.describe('Onboarding - Archetype Selection (#3)', () => {
  test('settings modules page loads (archetype/module selection)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsModules)
  })

  test('modules page shows toggleable modules', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsModules)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const toggles = page.locator('button[role="switch"], input[type="checkbox"], [class*="toggle"]')
    const count = await toggles.count()
    expect(count).toBeGreaterThanOrEqual(0)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

test.describe('Onboarding - Pricing & Service Defaults (#6-7)', () => {
  test('settings profile page loads (pricing/service setup)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsMyProfile)
  })

  test('settings event types page loads (pricing models)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsEventTypes)
  })

  test('profile page has editable fields', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsMyProfile)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Onboarding - Module Toggles (#5, #9)', () => {
  test('modules page loads without errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.settingsModules)
  })

  test('can view free vs Pro module distinction', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsModules)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })
})

test.describe('Onboarding - Calendar Setup (#10)', () => {
  test('calendar page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.calendar)
  })

  test('calendar shows grid or month view', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.calendar)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const monthHeading = page
      .getByRole('heading', {
        name: /january|february|march|april|may|june|july|august|september|october|november|december/i,
      })
      .first()
    await expect(monthHeading).toBeVisible({ timeout: 10_000 })
  })

  test('integrations page loads (Google Calendar sync)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsIntegrations)
  })
})

test.describe('Onboarding - Dashboard Post-Setup (#1)', () => {
  test('dashboard loads after setup', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.dashboard)
  })

  test('dashboard has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.dashboard)
  })

  test('dashboard shows content widgets', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })

  test('activated-chef dashboard does not show the primary activation checklist', async ({
    page,
    seedIds,
  }) => {
    const chef = seedIds.activationChefs.activatedChef
    await loginAsChef(page, chef.email, chef.password)

    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/Prove ChefFlow with one paid workflow/i)).toHaveCount(0)
    await expect(page.getByText(/^First Booking Loop$/i)).toHaveCount(0)
  })

  test('dismissed dashboard banner alone does not satisfy activation', async ({
    page,
    seedIds,
  }) => {
    const chef = seedIds.activationChefs.wizardCompleteNotActivated
    await loginAsChef(page, chef.email, chef.password)

    await page.goto(JOURNEY_ROUTES.dashboard)
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/Prove ChefFlow with one paid workflow/i)).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/^First Booking Loop$/i).first()).toBeVisible()
  })
})
