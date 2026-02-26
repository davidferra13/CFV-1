// Interaction Layer — Client Sub-sections Tests
// Covers the full clients sub-tree beyond the main list and detail pages.
//
// Routes covered:
//   /clients/active, /clients/inactive, /clients/vip, /clients/duplicates
//   /clients/gift-cards, /clients/segments, /clients/presence
//   /clients/communication/**    — follow-ups, notes, upcoming touchpoints
//   /clients/history/**          — event history, past menus, spending history
//   /clients/insights/**         — at-risk, most frequent, top clients
//   /clients/loyalty/**          — loyalty hub, points, referrals, rewards
//   /clients/preferences/**      — allergies, dietary, dislikes, favorites
//   /clients/[id]/recurring      — recurring events for a specific client
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Client Status Views ──────────────────────────────────────────────────────

test.describe('Clients — Status Views', () => {
  const statusRoutes = [
    '/clients/active',
    '/clients/inactive',
    '/clients/vip',
    '/clients/duplicates',
    '/clients/presence',
    '/clients/segments',
    '/clients/gift-cards',
  ]

  for (const route of statusRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/clients/active — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/active')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/clients/vip — shows VIP clients or empty state', async ({ page }) => {
    await page.goto('/clients/vip')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Status views are tenant-scoped (no Chef B data)', async ({ page, seedIds }) => {
    await page.goto('/clients/active')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Client Communication ─────────────────────────────────────────────────────

test.describe('Clients — Communication', () => {
  const communicationRoutes = [
    '/clients/communication',
    '/clients/communication/follow-ups',
    '/clients/communication/notes',
    '/clients/communication/upcoming-touchpoints',
  ]

  for (const route of communicationRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/clients/communication — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/communication')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/clients/communication — shows communication content', async ({ page }) => {
    await page.goto('/clients/communication')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Client History ───────────────────────────────────────────────────────────

test.describe('Clients — History', () => {
  const historyRoutes = [
    '/clients/history',
    '/clients/history/event-history',
    '/clients/history/past-menus',
    '/clients/history/spending-history',
  ]

  for (const route of historyRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/clients/history — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/history')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/clients/history/spending-history — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/history/spending-history')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Client Insights ──────────────────────────────────────────────────────────

test.describe('Clients — Insights', () => {
  const insightRoutes = [
    '/clients/insights',
    '/clients/insights/at-risk',
    '/clients/insights/most-frequent',
    '/clients/insights/top-clients',
  ]

  for (const route of insightRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/clients/insights — shows insights or empty state', async ({ page }) => {
    await page.goto('/clients/insights')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/clients/insights — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/insights')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/clients/insights/at-risk — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/insights/at-risk')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
  })
})

// ─── Client Loyalty ───────────────────────────────────────────────────────────

test.describe('Clients — Loyalty', () => {
  const loyaltyRoutes = [
    '/clients/loyalty',
    '/clients/loyalty/points',
    '/clients/loyalty/referrals',
    '/clients/loyalty/rewards',
  ]

  for (const route of loyaltyRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/clients/loyalty — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/loyalty')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Client Preferences ───────────────────────────────────────────────────────

test.describe('Clients — Preferences', () => {
  const preferenceRoutes = [
    '/clients/preferences',
    '/clients/preferences/allergies',
    '/clients/preferences/dietary-restrictions',
    '/clients/preferences/dislikes',
    '/clients/preferences/favorite-dishes',
  ]

  for (const route of preferenceRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/clients/preferences — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/clients/preferences')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/clients/preferences/allergies — shows allergy data or empty state', async ({ page }) => {
    await page.goto('/clients/preferences/allergies')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Client Recurring Events ──────────────────────────────────────────────────

test.describe('Clients — Recurring Events', () => {
  test('/clients/[id]/recurring — seeded client recurring events load', async ({
    page,
    seedIds,
  }) => {
    const resp = await page.goto(`/clients/${seedIds.clientId}/recurring`)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/clients/[id]/recurring — shows recurring content or empty state', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/clients/${seedIds.clientId}/recurring`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/clients/[id]/recurring — no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/clients/${seedIds.clientId}/recurring`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
