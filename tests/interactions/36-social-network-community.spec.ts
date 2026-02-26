// Interaction Layer — Social, Network & Community Tests
// Tests social media planner, chef network, and community features.
//
// Routes covered:
//   /social                    — social media hub
//   /social/connections        — social connections
//   /social/planner            — content planner
//   /social/settings           — social media settings
//   /social/vault              — content vault
//   /network                   — chef network hub
//   /network/notifications     — network notifications
//   /network/saved             — saved network content
//   /community/templates       — community template library
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Social Hub ───────────────────────────────────────────────────────────────

test.describe('Social — Hub', () => {
  test('/social — page loads without redirect', async ({ page }) => {
    await page.goto('/social')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/social — shows social content or empty state', async ({ page }) => {
    await page.goto('/social')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/social|post|content|instagram|planner|schedule/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/social — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/social')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Social — Sub-pages', () => {
  const socialRoutes = [
    '/social/connections',
    '/social/planner',
    '/social/settings',
    '/social/vault',
  ]

  for (const route of socialRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/social/planner — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/social/planner')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/social/vault — shows vault content or empty state', async ({ page }) => {
    await page.goto('/social/vault')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Social data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/social')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Network ──────────────────────────────────────────────────────────────────

test.describe('Network — Hub', () => {
  test('/network — page loads without redirect', async ({ page }) => {
    await page.goto('/network')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/network — shows network content or empty state', async ({ page }) => {
    await page.goto('/network')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/network|chef|connect|channel|follow|community/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/network — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/network')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Network — Sub-pages', () => {
  const networkRoutes = ['/network/notifications', '/network/saved']

  for (const route of networkRoutes) {
    test(`${route} — loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status()).not.toBe(500)
    })
  }

  test('/network/notifications — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/network/notifications')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/network/saved — shows saved content or empty state', async ({ page }) => {
    await page.goto('/network/saved')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Community ────────────────────────────────────────────────────────────────

test.describe('Community — Templates', () => {
  test('/community/templates — page loads without 500', async ({ page }) => {
    const resp = await page.goto('/community/templates')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/community/templates — shows templates or empty state', async ({ page }) => {
    await page.goto('/community/templates')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/community/templates — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/community/templates')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Cross-Section: Social → Network Navigation ───────────────────────────────

test.describe('Social/Network — Cross-Section', () => {
  test('Navigating social sub-sections does not produce JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    for (const route of ['/social', '/social/planner', '/network']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })

  test('All social/network routes return non-500 status', async ({ page }) => {
    const routes = [
      '/social',
      '/social/connections',
      '/social/planner',
      '/social/vault',
      '/social/settings',
      '/network',
      '/network/notifications',
      '/network/saved',
      '/community/templates',
    ]
    for (const route of routes) {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status(), `${route} should not 500`).not.toBe(500)
    }
  })
})
