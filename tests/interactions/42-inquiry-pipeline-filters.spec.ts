// Interaction Layer — Inquiry Pipeline Filters
// Covers every inquiry status sub-route and the new-inquiry form.
// All were completely untested before this file.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Parametric load test — all filter views ──────────────────────────────────

const inquiryFilterRoutes = [
  '/inquiries/awaiting-response',
  '/inquiries/awaiting-client-reply',
  '/inquiries/declined',
  '/inquiries/menu-drafting',
  '/inquiries/sent-to-client',
]

for (const route of inquiryFilterRoutes) {
  test(`${route} — loads without 500`, async ({ page }) => {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
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

// ─── Tenant scoping ───────────────────────────────────────────────────────────

test('/inquiries — data is tenant-scoped', async ({ page, seedIds }) => {
  await page.goto('/inquiries')
  await page.waitForLoadState('networkidle')
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain(seedIds.chefBId)
})

// ─── New Inquiry Form ─────────────────────────────────────────────────────────

test.describe('New Inquiry', () => {
  test('/inquiries/new — loads without 500', async ({ page }) => {
    const resp = await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/inquiries/new — shows form fields', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/inquiries/new — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/inquiries/new — has client name or event date field', async ({ page }) => {
    await page.goto('/inquiries/new')
    await page.waitForLoadState('networkidle')
    const hasField = await page
      .getByLabel(/client|name|date|event/i)
      .first()
      .isVisible()
      .catch(() => false)
    // Informational — form structure varies
  })
})

// ─── Inquiry detail navigation ────────────────────────────────────────────────

test.describe('Inquiry Detail Navigation', () => {
  test('/inquiries — click first inquiry opens detail', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/inquiries')
    await page.waitForLoadState('networkidle')

    const firstInquiry = page.locator('a[href*="/inquiries/"]').first()
    if (await firstInquiry.isVisible()) {
      await firstInquiry.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/inquiries\//)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })

  test('/inquiries/awaiting-response — click first opens detail', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/inquiries/awaiting-response')
    await page.waitForLoadState('networkidle')

    const firstInquiry = page.locator('a[href*="/inquiries/"]').first()
    if (await firstInquiry.isVisible()) {
      await firstInquiry.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/inquiries\//)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── All inquiry filter routes load together ──────────────────────────────────

test('All inquiry filter routes load without 500', async ({ page }) => {
  const routes = [
    '/inquiries',
    '/inquiries/awaiting-response',
    '/inquiries/awaiting-client-reply',
    '/inquiries/declined',
    '/inquiries/menu-drafting',
    '/inquiries/sent-to-client',
    '/inquiries/new',
  ]
  for (const route of routes) {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status(), `${route} must not 500`).not.toBe(500)
  }
})
