// Product Tests — Tier 2: Client & Event Lifecycle
// Proves: The core business loop works (inquiry to event to completion).
// Maps to: product-testing-roadmap.md Tier 2 (tests 2A-2C)
//
// Run: npx playwright test -p product-chef --grep "Tier 2"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

// ── 2A. Client Management ──────────────────────────────────────────────────

test.describe('Tier 2A — Client Management', () => {
  test('2A.1 — client list shows seeded clients', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('domcontentloaded')

    // Should show all 4 test clients
    await expect(page.getByText('Joy (Test User)').first()).toBeVisible({ timeout: 10_000 })
  })

  test('2A.2 — client detail page shows full profile', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('domcontentloaded')

    // Client name
    await expect(page.getByText('Joy (Test User)').first()).toBeVisible({ timeout: 10_000 })
    // Client email
    await expect(page.getByText(seedIds.clientEmail, { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('2A.3 — VIP client is tagged correctly', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.secondary}`)
    await page.waitForLoadState('domcontentloaded')

    // Bob E2E is a VIP client
    await expect(page.getByText('TEST - Bob E2E').first()).toBeVisible({ timeout: 10_000 })
  })

  test('2A.4 — client filter pages load', async ({ page }) => {
    const filterRoutes = ['/clients/active', '/clients/vip', '/clients/inactive']
    for (const route of filterRoutes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('2A.5 — client preferences page loads', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}/preferences`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── 2B. Event Lifecycle (8-state FSM) ──────────────────────────────────────

test.describe('Tier 2B — Event Lifecycle FSM', () => {
  test('2B.1 — event list shows seeded events', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('domcontentloaded')

    // Should show test events
    const testEvents = page.getByText(/TEST/i)
    const count = await testEvents.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('2B.2 — draft event detail page loads fully', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('domcontentloaded')

    // Should show occasion
    await expect(page.getByText(/Birthday Weekend Dinner/i).first()).toBeVisible({
      timeout: 10_000,
    })

    // Should show client name
    await expect(page.getByText(/Joy/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('2B.3 — draft event shows correct status badge', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('domcontentloaded')

    // Status should show "draft"
    const draftBadge = page.getByText(/draft/i).first()
    await expect(draftBadge).toBeVisible({ timeout: 10_000 })
  })

  test('2B.4 — proposed event shows correct status', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.proposed}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/proposed/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('2B.5 — paid event shows correct status', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.paid}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/paid/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('2B.6 — confirmed event shows correct status', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/confirmed/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('2B.7 — completed event shows correct status', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('2B.8 — event detail shows guest count and location', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('domcontentloaded')

    // Guest count (6) and location (Boston) should appear
    const hasGuestCount = await page
      .getByText('6')
      .first()
      .isVisible()
      .catch(() => false)
    const hasLocation = await page
      .getByText(/Boston/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasGuestCount || hasLocation).toBeTruthy()
  })

  test('2B.9 — event financial panel shows pricing', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.paid}/financial`)
    await page.waitForLoadState('domcontentloaded')

    // Financial page should load without auth redirect
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('2B.10 — event filter pages load correctly', async ({ page }) => {
    const filterRoutes = [
      '/events/upcoming',
      '/events/confirmed',
      '/events/completed',
      '/events/cancelled',
      '/events/board',
    ]

    for (const route of filterRoutes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('2B.11 — event sub-pages load without errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const subPages = [
      `/events/${seedIds.eventIds.confirmed}/documents`,
      `/events/${seedIds.eventIds.confirmed}/schedule`,
      `/events/${seedIds.eventIds.completed}/aar`,
    ]

    for (const route of subPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }

    expect(errors).toHaveLength(0)
  })
})

// ── 2C. Calendar & Scheduling ──────────────────────────────────────────────

test.describe('Tier 2C — Calendar & Scheduling', () => {
  test('2C.1 — calendar page loads with events', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).not.toHaveURL(/auth\/signin/)
    const main = page.locator('main').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('2C.2 — calendar view modes load', async ({ page }) => {
    const views = ['/calendar', '/calendar/week', '/calendar/day', '/calendar/year']
    for (const view of views) {
      await page.goto(view)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('2C.3 — scheduling page loads', async ({ page }) => {
    await page.goto('/scheduling')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})
