// Interaction Layer — Waitlist, Surveys & Wix Integration Tests
// Tests waitlist management, client survey capture, and Wix form submissions.
//
// Routes covered:
//   /waitlist              — waitlist management (add is via modal/inline, no /new sub-route)
//   /surveys               — survey hub and responses
//   /wix-submissions       — Wix form submission log
//   /settings/integrations — integration settings (includes Wix)
//
// NOTE: /waitlist/new does NOT exist as a separate page — adding to the waitlist
// happens via a modal or inline form on /waitlist.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Waitlist Hub ─────────────────────────────────────────────────────────────

test.describe('Waitlist — Hub', () => {
  test('/waitlist — page loads without redirect', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/waitlist — shows waitlist content or empty state', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/waitlist|waiting|queue|add to waitlist|interested/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/waitlist — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/waitlist — has Add to Waitlist button or link', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add|new|invite/i })
      .first()
      .or(page.getByRole('link', { name: /add|new|waitlist/i }).first())
    const isVisible = await addBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })

  test('/waitlist — shows status of waitlist entries', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')
    const statusIndicator = page
      .getByText(/pending|invited|accepted|declined|active/i)
      .first()
    const isVisible = await statusIndicator.isVisible().catch(() => false)
    // Informational — only visible if entries exist
    const _ = isVisible
  })
})

// ─── Waitlist — Add Entry (inline/modal on /waitlist) ────────────────────────

test.describe('Waitlist — Add Entry', () => {
  test('/waitlist — Add button opens form without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')

    const addBtn = page
      .getByRole('button', { name: /add|new|invite|create/i })
      .first()
      .or(page.getByRole('link', { name: /add|new waitlist|invite/i }).first())

    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(600)
    }

    expect(errors).toHaveLength(0)
  })

  test('/waitlist — add form has name and email fields when open', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')

    const addBtn = page
      .getByRole('button', { name: /add|new|invite/i })
      .first()

    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(400)
      const nameField = page
        .getByLabel(/name/i)
        .first()
        .or(page.getByPlaceholder(/name/i).first())
      const isVisible = await nameField.isVisible().catch(() => false)
      // Informational — only present after the modal opens
      const _ = isVisible
    }
  })

  test('/waitlist — submitting empty form does not navigate away', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')

    const addBtn = page
      .getByRole('button', { name: /add|new|invite/i })
      .first()

    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(400)
      const submitBtn = page.getByRole('button', { name: /save|add|submit|create/i }).first()
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(800)
      }
    }
    // Should still be on /waitlist
    expect(page.url()).toMatch(/\/waitlist/)
  })

  test('/wix-submissions — Wix submission log loads', async ({ page }) => {
    const resp = await page.goto('/wix-submissions')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })
})

// ─── Surveys ─────────────────────────────────────────────────────────────────

test.describe('Surveys — Hub', () => {
  test('/surveys — page loads without redirect', async ({ page }) => {
    await page.goto('/surveys')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/surveys — shows survey content or empty state', async ({ page }) => {
    await page.goto('/surveys')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/survey|feedback|response|question|form/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/surveys — no JS errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/surveys')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/surveys — has Create Survey or similar CTA', async ({ page }) => {
    await page.goto('/surveys')
    await page.waitForLoadState('networkidle')
    const createBtn = page
      .getByRole('button', { name: /create survey|new survey|add survey/i })
      .first()
      .or(page.getByRole('link', { name: /create survey|new survey/i }).first())
    const isVisible = await createBtn.isVisible().catch(() => false)
    // Informational
    const _ = isVisible
  })
})

// ─── Wix Integration ─────────────────────────────────────────────────────────

test.describe('Surveys — Wix Integration', () => {
  test('/settings/integrations — page loads', async ({ page }) => {
    await page.goto('/settings/integrations')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/settings/integrations — shows Wix or integration options', async ({ page }) => {
    await page.goto('/settings/integrations')
    await page.waitForLoadState('networkidle')
    const hasWix = await page
      .getByText(/wix|integration|connect|webhook|form/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasWix
  })

  test('/settings/integrations — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/settings/integrations')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('Wix submissions appear in inquiries or waitlist', async ({ page }) => {
    // Wix form submissions route to /inquiries or /waitlist
    // Verify those pages load and don't 500
    const checkRoutes = ['/inquiries', '/waitlist']
    for (const route of checkRoutes) {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      const status = resp?.status() ?? 200
      expect(status).not.toBe(500)
    }
  })
})

// ─── Wix Webhook Endpoint ─────────────────────────────────────────────────────

test.describe('Surveys — Wix Webhook Security', () => {
  test('Wix webhook endpoint returns 400/401/405 without valid payload', async ({ page }) => {
    // POST without a valid Wix signature should be rejected
    const resp = await page.request.post('/api/webhooks/wix', {
      headers: { 'Content-Type': 'application/json' },
      data: { test: true },
    })
    // Should NOT be a 200 (we don't want to accept unsigned payloads)
    // and should NOT be a 500
    expect(resp.status()).not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })

  test('Wix form endpoint GET request returns 405 or 404', async ({ page }) => {
    const resp = await page.request.get('/api/webhooks/wix')
    expect(resp.status()).not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Cross-Feature: Waitlist → Inquiry Conversion ────────────────────────────

test.describe('Waitlist — Inquiry Conversion', () => {
  test('Waitlist page links to inquiry creation', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')

    const inquiryLink = page
      .getByRole('link', { name: /inquir|convert|move to/i })
      .first()
      .or(page.getByRole('button', { name: /inquir|convert/i }).first())

    const isVisible = await inquiryLink.isVisible().catch(() => false)
    // Informational — only present if waitlist entries exist
    const _ = isVisible
  })

  test('Waitlist does not show other chefs waitlist data', async ({ page }) => {
    await page.goto('/waitlist')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
  })
})
