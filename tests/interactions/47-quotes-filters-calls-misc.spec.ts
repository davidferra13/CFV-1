// Interaction Layer — Quote Filter Views, Call Detail, Goals History
// Covers routes with zero prior coverage:
//   /quotes/expired, /quotes/rejected, /quotes/viewed,
//   /calls/[id], /calls/[id]/edit,
//   /goals/[id]/history
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

test.describe('Quote Filter Views', () => {
  const quoteFilterRoutes = ['/quotes/expired', '/quotes/rejected', '/quotes/viewed']

  for (const route of quoteFilterRoutes) {
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

  test('/quotes/expired — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/quotes/expired')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

test('All quote filter routes load without 500', async ({ page }) => {
  const routes = [
    '/quotes',
    '/quotes/draft',
    '/quotes/sent',
    '/quotes/accepted',
    '/quotes/rejected',
    '/quotes/expired',
    '/quotes/viewed',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})

test.describe('Call Detail and Edit', () => {
  test('/calls/[id] — open first call detail without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/calls')
    await page.waitForLoadState('networkidle')

    const firstCall = page.locator("a[href*='/calls/']").first()
    if (await firstCall.isVisible()) {
      await firstCall.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/calls\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })

  test('/calls/[id] — call detail shows call information', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('networkidle')

    const firstCall = page.locator("a[href*='/calls/']").first()
    if (await firstCall.isVisible()) {
      await firstCall.click()
      await page.waitForLoadState('networkidle')

      const hasContent = await page
        .getByText(/call|duration|notes|client|date/i)
        .first()
        .isVisible()
        .catch(() => false)
      expect(hasContent, 'page should display relevant content').toBeTruthy()
    }
  })

  test('/calls/[id]/edit — edit call form loads without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/calls')
    await page.waitForLoadState('networkidle')

    // Try to find an edit link directly
    const editLink = page.locator("a[href*='/calls/'][href*='/edit']").first()
    if (await editLink.isVisible()) {
      await editLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/calls\/.*\/edit\//)
    } else {
      // Navigate to call detail first, then find edit
      const firstCall = page.locator("a[href*='/calls/']").first()
      if (await firstCall.isVisible()) {
        await firstCall.click()
        await page.waitForLoadState('networkidle')
        const editBtn = page.getByRole('link', { name: /edit/i }).first()
        if (await editBtn.isVisible()) {
          await editBtn.click()
          await page.waitForLoadState('networkidle')
        }
      }
    }

    expect(errors).toHaveLength(0)
  })
})

test.describe('Goals — History Sub-page', () => {
  test('/goals/[id]/history — navigate from goals list without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Find any goal link and append /history
    const firstGoal = page.locator("a[href*='/goals/']").first()
    if (await firstGoal.isVisible()) {
      const href = await firstGoal.getAttribute('href')
      if (href && !href.includes('/setup')) {
        const historyUrl = href.replace(/\/$/, '') + '/history'
        const resp = await page.goto(historyUrl)
        await page.waitForLoadState('networkidle')
        expect(resp?.status()).not.toBe(500)
        const bodyText = await page.locator('body').innerText()
        expect(bodyText.trim().length).toBeGreaterThan(20)
      }
    }

    expect(errors).toHaveLength(0)
  })

  test('/goals/[id]/history — no JS errors on history view', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const firstGoal = page.locator("a[href*='/goals/']").first()
    if (await firstGoal.isVisible()) {
      const href = await firstGoal.getAttribute('href')
      if (href && !href.includes('/setup')) {
        await page.goto(href.replace(/\/$/, '') + '/history')
        await page.waitForLoadState('networkidle')
      }
    }

    expect(errors).toHaveLength(0)
  })

  test('/goals — goals list is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})
