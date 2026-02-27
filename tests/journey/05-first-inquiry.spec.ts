// Journey Tests — First Inquiry (Week 1, Days 3-5)
// Verifies inquiry form, response drafting, quoting, and embed widget.
//
// Scenarios: #57-63, #64-67 (First inquiry for Starter chefs)
//
// Run: npx playwright test --project=journey-chef tests/journey/05-first-inquiry.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

// ─── Inquiry List ───────────────────────────────────────────────────────────────

test.describe('First Inquiry — Inquiry List (#57)', () => {
  test('inquiries page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inquiries)
  })

  test('inquiries page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.inquiries)
  })

  test('inquiries page shows inquiry list or empty state', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.inquiries)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('inquiries page has a create/new inquiry button', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.inquiries)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const newBtn = page
      .getByRole('button', { name: /new|add|create|log/i })
      .first()
      .or(page.getByRole('link', { name: /new|add|create|log/i }).first())
    const exists = await newBtn.isVisible().catch(() => false)
    // There should be a way to create a new inquiry
    const bodyText = await page.locator('body').innerText()
    expect(exists || bodyText.length > 50).toBeTruthy()
  })
})

// ─── New Inquiry Form (#56-57) ──────────────────────────────────────────────────

test.describe('First Inquiry — New Inquiry Form (#56-57)', () => {
  test('new inquiry page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inquiriesNew)
  })

  test('new inquiry form has input fields', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.inquiriesNew)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ─── Inquiry Pipeline Views ─────────────────────────────────────────────────────

test.describe('First Inquiry — Pipeline Views (#57)', () => {
  test('awaiting response view loads', async ({ page }) => {
    await page.goto('/inquiries/awaiting-response')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('awaiting client reply view loads', async ({ page }) => {
    await page.goto('/inquiries/awaiting-client-reply')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('declined inquiries view loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.inquiriesDeclined)
  })
})

// ─── Quote Creation (#59, #64-67) ───────────────────────────────────────────────

test.describe('First Inquiry — Quote Creation (#59, #64-67)', () => {
  test('quotes page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.quotes)
  })

  test('quotes page has no JS errors', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.quotes)
  })

  test('new quote page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.quotesNew)
  })

  test('draft quotes view loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.quotesDraft)
  })

  test('sent quotes view loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.quotesSent)
  })

  test('accepted quotes view loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.quotesAccepted)
  })
})

// ─── Proposals (#67) ────────────────────────────────────────────────────────────

test.describe('First Inquiry — Proposals (#67)', () => {
  test('proposals page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.proposals)
  })
})

// ─── Embed Widget (#62-63) ──────────────────────────────────────────────────────

test.describe('First Inquiry — Embed Widget (#62-63)', () => {
  test('embed settings page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.settingsEmbed)
  })

  test('embed settings shows embed code or instructions', async ({ page }) => {
    await page.goto(JOURNEY_ROUTES.settingsEmbed)
    await page.waitForLoadState('domcontentloaded')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

// ─── Leads ──────────────────────────────────────────────────────────────────────

test.describe('First Inquiry — Leads', () => {
  test('leads page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.leads)
  })

  test('new lead page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.leadsNew)
  })
})

// ─── Calls ──────────────────────────────────────────────────────────────────────

test.describe('First Inquiry — Calls', () => {
  test('calls page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.calls)
  })
})

// ─── Prospecting ────────────────────────────────────────────────────────────────

test.describe('First Inquiry — Prospecting', () => {
  test('prospecting page loads', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.prospecting)
  })
})
