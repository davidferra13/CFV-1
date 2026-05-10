// Interaction Layer — Network and Social Deep Coverage
// Covers routes with zero prior coverage:
//   /network/[chefId], /network/channels/[slug],
//   /marketing/social/connections, /marketing/social/settings,
//   /marketing/social/[month], /marketing/social/posts/[id]
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
  const socialRoutes = ['/marketing/social/connections', '/marketing/social/settings']

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
  test('/marketing/social/[month] — current month loads without 500', async ({ page }) => {
    // Use a fixed month format (YYYY-MM)
    const resp = await page.goto('/marketing/social/2026-02')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/marketing/social/[month] — shows planner content', async ({ page }) => {
    await page.goto('/marketing/social/2026-02')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/marketing/social/[month] — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/marketing/social/2026-02')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/marketing/social — navigate to next month without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/marketing/social')
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
  test('/marketing/social — navigate to first post without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/marketing/social')
    await page.waitForLoadState('networkidle')

    const firstPost = page.locator('a[href*="/marketing/social/posts/"]').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/marketing\/social\/posts\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })

  test('/content/vault — navigate to first post without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/content/vault')
    await page.waitForLoadState('networkidle')

    const firstPost = page.locator('a[href*="/marketing/social/posts/"]').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/marketing\/social\/posts\//)
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
    '/marketing/social',
    '/marketing/social/connections',
    '/marketing/social',
    '/marketing/social/2026-02',
    '/marketing/social/settings',
    '/content/vault',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
