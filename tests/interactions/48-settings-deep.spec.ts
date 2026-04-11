// Interaction Layer - Settings Deep Coverage
// Covers default settings sub-pages with zero prior coverage:
//   appearance, contracts, custom-fields, delete-account (load only),
//   event-types, highlights, journal, journal/[id], portfolio,
//   repertoire, repertoire/[id], stripe-connect, templates
//
// NOTE: /settings/delete-account is loaded but the delete action is NEVER clicked.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

const settingsRoutes = [
  '/settings/appearance',
  '/settings/contracts',
  '/settings/custom-fields',
  '/settings/event-types',
  '/settings/highlights',
  '/settings/journal',
  '/settings/portfolio',
  '/settings/repertoire',
  '/settings/stripe-connect',
  '/settings/templates',
]

for (const route of settingsRoutes) {
  test(`${route} - loads without 500`, async ({ page }) => {
    const resp = await page.goto(route)
    await page.waitForURL(/\/settings$/, { timeout: 30_000 })
    expect(resp?.status()).not.toBe(500)
  })

  test(`${route} - shows content`, async ({ page }) => {
    await page.goto(route)
    await page.waitForURL(/\/settings$/, { timeout: 30_000 })
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test(`${route} - no JS errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(route)
    await page.waitForURL(/\/settings$/, { timeout: 30_000 })
    expect(errors).toHaveLength(0)
  })
}

test.describe('Settings - Delete Account (LOAD ONLY)', () => {
  test('/settings/delete-account - loads without 500', async ({ page }) => {
    const resp = await page.goto('/settings/delete-account')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/settings/delete-account - shows warning or confirmation UI', async ({ page }) => {
    await page.goto('/settings/delete-account')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const hasWarning = await page
      .getByText(/delete|danger|permanent|cannot be undone|irreversible/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasWarning, 'delete account page must show danger warning').toBeTruthy()
  })

  test('/settings/delete-account - no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/settings/delete-account')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings - Journal Detail', () => {
  test('/settings/journal - loads and lists entries', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/journal')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })

  test('/settings/journal/[id] - open first journal entry without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/journal')
    await page.waitForLoadState('networkidle')

    const firstEntry = page.locator('a[href*="/settings/journal/"]').first()
    if (await firstEntry.isVisible()) {
      await firstEntry.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/settings\/journal\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings - Repertoire Detail', () => {
  test('/settings/repertoire - loads and lists items', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/repertoire')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })

  test('/settings/repertoire/[id] - open first repertoire item without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/repertoire')
    await page.waitForLoadState('networkidle')

    const firstItem = page.locator('a[href*="/settings/repertoire/"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/settings\/repertoire\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings - Developer Tools Redirects', () => {
  test('/settings/api-keys - redirects to /settings by default', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/api-keys')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/settings$/)
    expect(errors).toHaveLength(0)
  })

  test('/settings/webhooks - redirects to /settings by default', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/webhooks')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/settings$/)
    expect(errors).toHaveLength(0)
  })

  test('/settings/zapier - redirects to /settings by default', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/zapier')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/settings$/)
    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings - Event Types Interaction', () => {
  test('/settings/event-types - shows event type list or empty state', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/event-types')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })
})

test('All new settings pages load without 500', async ({ page }) => {
  const routes = [
    '/settings/appearance',
    '/settings/contracts',
    '/settings/custom-fields',
    '/settings/delete-account',
    '/settings/event-types',
    '/settings/highlights',
    '/settings/journal',
    '/settings/portfolio',
    '/settings/repertoire',
    '/settings/stripe-connect',
    '/settings/templates',
  ]

  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
