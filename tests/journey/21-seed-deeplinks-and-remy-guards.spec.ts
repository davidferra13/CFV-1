// Journey Tests - Seed Deep Links and Remy Guardrails
// Extends the first-month journey with seeded dynamic route checks
// and Remy drawer safety assertions (no message sends).
//
// Scenarios: #336-350
//
// Run: npx playwright test --project=journey-chef tests/journey/21-seed-deeplinks-and-remy-guards.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  openRemyDrawer,
  closeRemyDrawer,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Journey Extension - Seeded Pipeline Deep Links (#336-340)', () => {
  test('inquiry detail loads for awaiting-chef record (#336)', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('inquiry detail has content for awaiting-client record (#337)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingClient}`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('draft quote detail page loads (#338)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('sent quote edit page loads (#339)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.sent}/edit`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('accepted quote detail has form controls or content (#340)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.accepted}`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea, select')
    const inputCount = await inputs.count()
    if (inputCount > 0) {
      expect(inputCount).toBeGreaterThan(0)
    } else {
      await assertPageHasContent(page)
    }
  })
})

test.describe('Journey Extension - Seeded Client Segments (#341-344)', () => {
  test('primary seeded client page loads (#341)', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('secondary seeded client page loads (#342)', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.secondary}`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('dormant seeded client page has content (#343)', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.dormant}`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('standard seeded client page has editable controls (#344)', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.standard}`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const controls = page.locator('input, textarea, select, button')
    const controlCount = await controls.count()
    expect(controlCount).toBeGreaterThan(0)
  })
})

test.describe('Journey Extension - Event and Finance Regression Baseline (#345-348)', () => {
  test('confirmed event invoice page loads (#345)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/invoice`)
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('confirmed event receipts page has content (#346)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/receipts`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('finance overview has no page errors (#347)', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.financeOverview)
  })

  test('events board still loads in regression sweep (#348)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.eventsBoard)
  })
})

test.describe('Journey Extension - Remy Drawer Guardrails (#349-350)', () => {
  test('Remy drawer opens on inquiry detail and accepts text (#349)', async ({ page, seedIds }) => {
    await page.goto(`/inquiries/${seedIds.inquiryIds.awaitingChef}`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await openRemyDrawer(page)
    const input = page.locator('[data-remy-input]')
    await input.fill('Summarize follow-up tasks for this inquiry')
    await expect(input).toHaveValue(/follow-up tasks/i)
    await closeRemyDrawer(page)
  })

  test('Remy drawer opens on quote detail and accepts text (#350)', async ({ page, seedIds }) => {
    await page.goto(`/quotes/${seedIds.quoteIds.draft}`)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await openRemyDrawer(page)
    const input = page.locator('[data-remy-input]')
    await input.fill('Draft a concise timeline for this quote')
    await expect(input).toHaveValue(/timeline/i)
    await closeRemyDrawer(page)
  })
})
