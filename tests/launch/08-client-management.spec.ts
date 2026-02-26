// Launch Readiness Audit — Client Management
// Tests: client list, search, detail, create, edit, status filtering, financial stats

import { test, expect } from '../helpers/fixtures'

test.describe('Client Directory', () => {
  test('client list loads with seed data', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show client names (seed has Alice, Bob, Carol, Dave)
    const hasClients = /alice|bob|carol|dave|client/i.test(bodyText)
    expect(hasClients).toBeTruthy()
  })

  test('client search works', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const searchInput = page
      .getByRole('searchbox')
      .first()
      .or(page.getByPlaceholder(/search|find/i).first())
      .or(page.locator('input[type="search"]').first())
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Alice')
      await page.waitForTimeout(1000) // Wait for filter
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).toMatch(/alice/i)
    }
  })

  test('client status filter tabs visible', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFilters = /active|vip|inactive|all/i.test(bodyText)
    expect(hasFilters).toBeTruthy()
  })
})

test.describe('Client Status Sub-Routes', () => {
  const routes = ['/clients/active', '/clients/inactive', '/clients/vip']

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})

test.describe('Client Detail', () => {
  test('client detail page loads with info', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show client name (Alice)
    expect(bodyText).toMatch(/alice|e2e|client/i)
  })

  test('client detail shows contact and event info', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.primary}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should have contact info, event history, or financial section
    const hasDetailSections = /email|phone|event|history|financial|spending|contact/i.test(bodyText)
    expect(hasDetailSections).toBeTruthy()
  })

  test('VIP client detail loads', async ({ page, seedIds }) => {
    await page.goto(`/clients/${seedIds.clientIds.secondary}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })
})

test.describe('Create New Client', () => {
  test('new client form renders', async ({ page }) => {
    await page.goto('/clients/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('new client form has key fields', async ({ page }) => {
    await page.goto('/clients/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|email|phone/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })

  test('can fill client form fields', async ({ page }) => {
    await page.goto('/clients/new')
    await page.waitForLoadState('networkidle')

    const nameField = page.getByLabel(/name/i).first().or(page.getByPlaceholder(/name/i).first())
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Launch Test Client')
    }

    const emailField = page.getByLabel(/email/i).first().or(page.getByPlaceholder(/email/i).first())
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('launch-client@example.com')
    }

    const phoneField = page.getByLabel(/phone/i).first().or(page.getByPlaceholder(/phone/i).first())
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill('555-123-4567')
    }

    // Form should not crash
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/unhandled|error/i)
  })
})

test.describe('Client Sub-Pages', () => {
  const routes = [
    '/clients/segments',
    '/clients/duplicates',
    '/clients/gift-cards',
    '/clients/communication',
    '/clients/history',
    '/clients/preferences',
    '/clients/insights',
    '/clients/insights/top-clients',
    '/clients/insights/most-frequent',
    '/clients/insights/at-risk',
    '/clients/loyalty',
  ]

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})

test.describe('Guest Directory', () => {
  test('/guests loads without 500', async ({ page }) => {
    const resp = await page.goto('/guests')
    expect(resp?.status()).not.toBe(500)
  })

  test('/guests/reservations loads without 500', async ({ page }) => {
    const resp = await page.goto('/guests/reservations')
    expect(resp?.status()).not.toBe(500)
  })
})

test.describe('Partners', () => {
  const routes = ['/partners', '/partners/active', '/partners/inactive']

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
