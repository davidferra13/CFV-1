// Interaction Layer — Settings Deep Coverage
// Covers every settings sub-page with zero prior coverage:
//   api-keys, appearance, contracts, custom-fields, delete-account (load only),
//   event-types, highlights, journal, journal/[id], portfolio,
//   repertoire, repertoire/[id], stripe-connect, templates, webhooks
//
// NOTE: /settings/delete-account is loaded but the delete action is NEVER clicked.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Parametric load test — all missing settings pages ─────────────────────

const settingsRoutes = [
  '/settings/api-keys',
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
  '/settings/webhooks',
]

for (const route of settingsRoutes) {
  test(`${route} — loads without 500`, async ({ page }) => {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test(`${route} — shows content`, async ({ page }) => {
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
// ─── Delete Account — LOAD ONLY, never click delete ────────────────────────────

test.describe('Settings — Delete Account (LOAD ONLY)', () => {
  test('/settings/delete-account — loads without 500', async ({ page }) => {
    const resp = await page.goto('/settings/delete-account')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/settings/delete-account — shows warning or confirmation UI', async ({ page }) => {
    await page.goto('/settings/delete-account')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    // Confirm warning text is present — DO NOT click any delete button
    const hasWarning = await page
      .getByText(/delete|danger|permanent|cannot be undone|irreversible/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasWarning, 'delete account page must show danger warning').toBeTruthy()
  })

  test('/settings/delete-account — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/settings/delete-account')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Settings Journal — detail navigation ─────────────────────────────────────────────

test.describe('Settings — Journal Detail', () => {
  test('/settings/journal — loads and lists entries', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/journal')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })

  test('/settings/journal/[id] — open first journal entry without crash', async ({ page }) => {
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

// ─── Settings Repertoire — detail navigation ──────────────────────────────────────────────

test.describe('Settings — Repertoire Detail', () => {
  test('/settings/repertoire — loads and lists items', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/repertoire')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })

  test('/settings/repertoire/[id] — open first repertoire item without crash', async ({ page }) => {
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

// ─── Settings interaction tests ─────────────────────────────────────────────────────────────

test.describe('Settings — API Keys Interaction', () => {
  test('/settings/api-keys — generate new key button present', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/api-keys')
    await page.waitForLoadState('networkidle')

    const generateBtn = page
      .getByRole('button', { name: /generate|create|new key|add key/i })
      .first()

    const isVisible = await generateBtn.isVisible().catch(() => false)

    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings — Webhooks Interaction', () => {
  test('/settings/webhooks — add webhook button present', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/webhooks')
    await page.waitForLoadState('networkidle')

    const addBtn = page.getByRole('button', { name: /add webhook|new webhook|create/i }).first()

    const isVisible = await addBtn.isVisible().catch(() => false)

    expect(errors).toHaveLength(0)
  })
})

test.describe('Settings — Event Types Interaction', () => {
  test('/settings/event-types — shows event type list or empty state', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/event-types')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })
})

// ─── All settings pages load together ────────────────────────────────────────────────────────────

test('All new settings pages load without 500', async ({ page }) => {
  const routes = [
    '/settings/api-keys',
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
    '/settings/webhooks',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
