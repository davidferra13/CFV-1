// Interaction Layer — Client Deep Subsections
// Covers every client sub-route that had zero coverage:
//   history/event-history, history/past-menus,
//   preferences/dietary-restrictions, preferences/dislikes, preferences/favorite-dishes,
//   loyalty/points, loyalty/referrals,
//   communication/follow-ups, communication/notes, communication/upcoming-touchpoints,
//   insights/at-risk, insights/most-frequent, insights/top-clients,
//   duplicates, gift-cards, presence, segments
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Client History Sub-pages ─────────────────────────────────────────────────

test.describe('Client History — Sub-pages', () => {
  const historyRoutes = ['/clients/history/event-history', '/clients/history/past-menus']

  for (const route of historyRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/clients/history/event-history — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/history/event-history')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })

  test('/clients/history/past-menus — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/history/past-menus')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Client Preferences Sub-pages ────────────────────────────────────────────

test.describe('Client Preferences — Sub-pages', () => {
  const prefRoutes = [
    '/clients/preferences/dietary-restrictions',
    '/clients/preferences/dislikes',
    '/clients/preferences/favorite-dishes',
  ]

  for (const route of prefRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Client Loyalty Sub-pages ─────────────────────────────────────────────────

test.describe('Client Loyalty — Sub-pages', () => {
  const loyaltyRoutes = ['/clients/loyalty/points', '/clients/loyalty/referrals']

  for (const route of loyaltyRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/clients/loyalty/points — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/loyalty/points')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Client Communication Sub-pages ──────────────────────────────────────────

test.describe('Client Communication — Sub-pages', () => {
  const commRoutes = [
    '/clients/communication/follow-ups',
    '/clients/communication/notes',
    '/clients/communication/upcoming-touchpoints',
  ]

  for (const route of commRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/clients/communication/follow-ups — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/communication/follow-ups')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Client Insights Sub-pages ────────────────────────────────────────────────

test.describe('Client Insights — Sub-pages', () => {
  const insightRoutes = [
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

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/clients/insights/top-clients — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/insights/top-clients')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Client Management Pages ──────────────────────────────────────────────────

test.describe('Client Management Pages', () => {
  const mgmtRoutes = [
    '/clients/duplicates',
    '/clients/gift-cards',
    '/clients/presence',
    '/clients/segments',
  ]

  for (const route of mgmtRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })

    test(`${route} — shows content or empty state`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    })

    test(`${route} — no JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(errors).toHaveLength(0)
    })
  }

  test('/clients/segments — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/clients/segments')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── All new client sub-routes load together ──────────────────────────────────

test('All new client sub-routes load without 500', async ({ page }) => {
  const routes = [
    '/clients/history/event-history',
    '/clients/history/past-menus',
    '/clients/preferences/dietary-restrictions',
    '/clients/preferences/dislikes',
    '/clients/preferences/favorite-dishes',
    '/clients/loyalty/points',
    '/clients/loyalty/referrals',
    '/clients/communication/follow-ups',
    '/clients/communication/notes',
    '/clients/communication/upcoming-touchpoints',
    '/clients/insights/at-risk',
    '/clients/insights/most-frequent',
    '/clients/insights/top-clients',
    '/clients/duplicates',
    '/clients/gift-cards',
    '/clients/presence',
    '/clients/segments',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
