// Interaction Layer — Network and Social Deep Coverage
// Covers routes with zero prior coverage:
//   /network/[chefId], /network/channels/[slug],
//   /social/connections, /social/settings,
//   /social/planner/[month], /social/posts/[id]
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Network — Chef Profile View ───────────────────────────────────────────────────────────────────────

test.describe('Network — Chef Profile View', () => {
  test('/network/[chefId] — own profile loads without 500', async ({ page, seedIds }) => {
    const resp = await page.goto(`/network/${seedIds.chefId}`)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/network/[chefId] — shows profile content', async ({ page, seedIds }) => {
    await page.goto(`/network/${seedIds.chefId}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/network/[chefId] — no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`/network/${seedIds.chefId}`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
// ─── Network — Channels ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('Network — Channels', () => {
  test('/network — navigate to first channel without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/network')
    await page.waitForLoadState('networkidle')

    const firstChannel = page.locator('a[href*="/network/channels/"]').first()
    if (await firstChannel.isVisible()) {
      await firstChannel.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/network\/channels\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Social — Connections and Settings ─────────────────────────────────────────────────────────────────────────────────

test.describe('Social — Connections and Settings', () => {
  const socialRoutes = ['/social/connections', '/social/settings']

  for (const route of socialRoutes) {
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

// ─── Social — Planner with Month ──────────────────────────────────────────────────────────────────────────────────────────

test.describe('Social — Planner Month View', () => {
  test('/social/planner/[month] — current month loads without 500', async ({ page }) => {
    // Use a fixed month format (YYYY-MM)
    const resp = await page.goto('/social/planner/2026-02')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/social/planner/[month] — shows planner content', async ({ page }) => {
    await page.goto('/social/planner/2026-02')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/social/planner/[month] — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/social/planner/2026-02')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/social/planner — navigate to next month without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/social/planner')
    await page.waitForLoadState('networkidle')

    const nextBtn = page.getByRole('button', { name: /next|forward|>/i }).first()

    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(300)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Social — Posts Detail ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

test.describe('Social — Post Detail', () => {
  test('/social — navigate to first post without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/social')
    await page.waitForLoadState('networkidle')

    const firstPost = page.locator('a[href*="/social/posts/"]').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/social\/posts\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })

  test('/social/vault — navigate to first post without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/social/vault')
    await page.waitForLoadState('networkidle')

    const firstPost = page.locator('a[href*="/social/posts/"]').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/social\/posts\//)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── All network and social routes load together ───────────────────────────────────────────────────────────────

test('All network and social routes load without 500', async ({ page, seedIds }) => {
  const routes = [
    '/network',
    `/network/${seedIds.chefId}`,
    '/network/notifications',
    '/network/saved',
    '/social',
    '/social/connections',
    '/social/planner',
    '/social/planner/2026-02',
    '/social/settings',
    '/social/vault',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
