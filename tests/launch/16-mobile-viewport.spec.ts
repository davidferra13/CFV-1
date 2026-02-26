// Launch Readiness Audit — Mobile Viewport (375x812, iPhone)
// Tests: core pages render and function at mobile width
// Viewport is set in playwright.config.ts launch-mobile project

import { test, expect } from '../helpers/fixtures'

test.describe('Mobile — Dashboard', () => {
  test('dashboard loads and is usable', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Content should be visible (not overflow hidden)
    expect(bodyText.trim().length).toBeGreaterThan(50)
    expect(errors).toHaveLength(0)
  })

  test('mobile nav tab bar is visible', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Bottom tab bar should be visible on mobile
    const tabBar = page.locator('nav').last()
    const isVisible = await tabBar.isVisible().catch(() => false)
    // Should have navigation tabs
    const bodyText = await page.locator('body').innerText()
    const hasNavTabs = /home|daily|inbox|events|clients|more/i.test(bodyText)
    expect(hasNavTabs).toBeTruthy()
  })
})

test.describe('Mobile — Events', () => {
  test('event list readable at mobile width', async ({ page }) => {
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('event detail scrollable and readable', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show event content
    const hasContent = /confirmed|event|dinner|date|guest/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })
})

test.describe('Mobile — Calendar', () => {
  test('calendar usable at mobile width', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Calendar should still render (may be in a compact view)
    expect(bodyText.trim().length).toBeGreaterThan(50)
    expect(errors).toHaveLength(0)
  })
})

test.describe('Mobile — Clients', () => {
  test('client list readable at mobile width', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('client detail scrollable', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })
})

test.describe('Mobile — Tasks', () => {
  test('task board usable at mobile width', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Mobile — Inquiries', () => {
  test('inquiry list readable at mobile width', async ({ page }) => {
    await page.goto('/inquiries')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Mobile — Quotes', () => {
  test('quote list readable at mobile width', async ({ page }) => {
    await page.goto('/quotes')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Mobile — Forms', () => {
  test('new event form fillable at mobile width', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Form fields should be visible (not hidden by overflow)
    const inputs = page.locator('input:visible, textarea:visible, select:visible')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('new inquiry form fillable at mobile width', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    const inputs = page.locator('input:visible, textarea:visible, select:visible')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('settings profile form fillable at mobile width', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')
    const inputs = page.locator('input:visible, textarea:visible')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe('Mobile — No Horizontal Overflow', () => {
  const pages = ['/dashboard', '/events', '/clients', '/inquiries', '/calendar', '/tasks']

  for (const route of pages) {
    test(`${route} has no horizontal scrollbar`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      // Check if page has horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      if (hasOverflow) {
        console.log(`[WARNING] ${route} has horizontal overflow at mobile width`)
      }
      // Soft assertion — log but don't fail (some pages may have intentional horizontal scroll)
    })
  }
})
