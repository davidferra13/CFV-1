// Launch Readiness Audit — Settings & Module Management
// Tests: profile, modules, navigation, archetype picker, embed, privacy

import { test, expect } from '../helpers/fixtures'

test.describe('Settings — Main Page', () => {
  test('/settings loads', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show settings sections
    const hasSettings = /profile|settings|account|billing|module|navigation/i.test(bodyText)
    expect(hasSettings).toBeTruthy()
  })
})

test.describe('Settings — Profile', () => {
  test('/settings/profile loads with editable fields', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should have form inputs for profile editing
    const inputs = page.locator('input, textarea')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('profile has business name and contact fields', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|email|phone|bio|business/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })
})

test.describe('Settings — Public Profile', () => {
  test('/settings/public-profile loads', async ({ page }) => {
    const resp = await page.goto('/settings/public-profile')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Settings — Modules', () => {
  test('/settings/modules loads with toggles', async ({ page }) => {
    await page.goto('/settings/modules')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show module toggles
    const hasModules = /module|enable|disable|toggle|sales|finance|culinary|operations/i.test(
      bodyText
    )
    expect(hasModules).toBeTruthy()
  })

  test('module page has toggle switches', async ({ page }) => {
    await page.goto('/settings/modules')
    await page.waitForLoadState('networkidle')
    // Should have toggle/switch elements
    const toggles = page.locator('button[role="switch"], input[type="checkbox"], [data-state]')
    const count = await toggles.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe('Settings — Navigation & Archetypes', () => {
  test('/settings/navigation loads with archetype picker', async ({ page }) => {
    await page.goto('/settings/navigation')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show archetype options
    const hasArchetypes = /private chef|caterer|meal prep|restaurant|food truck|bakery/i.test(
      bodyText
    )
    expect(hasArchetypes).toBeTruthy()
  })

  test('archetype options are clickable', async ({ page }) => {
    await page.goto('/settings/navigation')
    await page.waitForLoadState('networkidle')
    // Find archetype cards/buttons
    const archetypeBtn = page.getByText(/private chef/i).first()
    const isVisible = await archetypeBtn.isVisible().catch(() => false)
    expect(isVisible).toBeTruthy()
  })
})

test.describe('Settings — Embed Widget', () => {
  test('/settings/embed loads with copyable code', async ({ page }) => {
    await page.goto('/settings/embed')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show embed code
    const hasEmbedCode = /embed|script|widget|copy|code|iframe/i.test(bodyText)
    expect(hasEmbedCode).toBeTruthy()
  })
})

test.describe('Settings — AI & Privacy', () => {
  test('/settings/ai-privacy loads', async ({ page }) => {
    const resp = await page.goto('/settings/ai-privacy')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasPrivacy = /privacy|ai|ollama|local|data/i.test(bodyText)
    expect(hasPrivacy).toBeTruthy()
  })
})

test.describe('Settings — Other Pages', () => {
  const routes = [
    '/settings/automations',
    '/settings/integrations',
    '/settings/dashboard',
    '/settings/emergency',
    '/settings/protection',
    '/settings/protection/insurance',
    '/settings/protection/certifications',
    '/settings/protection/nda',
    '/settings/protection/continuity',
    '/settings/protection/crisis',
  ]

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})

test.describe('Settings — Advanced', () => {
  const routes = [
    '/settings/api-keys',
    '/settings/webhooks',
    '/settings/gdpr',
    '/settings/custom-fields',
    '/settings/event-type-labels',
    '/settings/portfolio',
    '/settings/profile-highlights',
    '/settings/subscription',
  ]

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
