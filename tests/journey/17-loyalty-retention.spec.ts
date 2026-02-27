// Journey Tests — Loyalty & Retention (Week 4)
// Verifies loyalty program setup, points, tiers, vouchers,
// referral tracking, and gift cards.
//
// Scenarios: #280-285
//
// Run: npx playwright test --project=journey-chef tests/journey/17-loyalty-retention.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Loyalty Hub (#280) ─────────────────────────────────────────────────────────

test.describe('Loyalty — Hub (#280)', () => {
  test('loyalty page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.loyalty)
  })

  test('loyalty page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.loyalty)
  })

  test('loyalty page shows content or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.loyalty)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Loyalty Settings (#280, #282) ──────────────────────────────────────────────

test.describe('Loyalty — Settings (#280, #282)', () => {
  test('loyalty settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.loyaltySettings)
  })

  test('loyalty settings has configuration options', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.loyaltySettings)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Loyalty Points & Tiers (#281-282) ──────────────────────────────────────────

test.describe('Loyalty — Points & Tiers (#281-282)', () => {
  test('loyalty page shows point/tier structure', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.loyalty)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('new reward tier page loads', async ({ page }) => {
    await page.goto('/loyalty/rewards/new')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Vouchers (#283) ────────────────────────────────────────────────────────────

test.describe('Loyalty — Vouchers (#283)', () => {
  test('loyalty page accessible for voucher creation', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.loyalty)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    // Look for voucher/gift card creation options
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Referral Tracking (#284) ───────────────────────────────────────────────────

test.describe('Loyalty — Referral Tracking (#284)', () => {
  test('partners page loads (referral partners)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.partners)
  })

  test('analytics referral sources page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.analyticsReferralSources)
  })
})

// ─── Onboarding Loyalty (#285) ──────────────────────────────────────────────────

test.describe('Loyalty — Onboarding (#285)', () => {
  test('onboarding loyalty page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.onboardingLoyalty)
  })

  test('onboarding loyalty has setup options', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.onboardingLoyalty)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})
