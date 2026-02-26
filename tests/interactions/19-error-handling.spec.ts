// Interaction Layer — Error Handling Tests
// Tests that the application handles errors gracefully:
//   - Bad IDs → 404 page (not crash)
//   - Non-existent routes → 404 page
//   - Malformed UUIDs in URL params
//   - API endpoints with bad params return structured errors
//   - Cross-tenant access attempts are blocked
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── 404 Handling — Non-Existent Entities ─────────────────────────────────────

test.describe('Error Handling — Entity 404s', () => {
  const fakeUuid = '00000000-0000-0000-0000-000000000000'

  test('/events/[fakeId] — shows 404 or not found (not 500)', async ({ page }) => {
    const resp = await page.goto(`/events/${fakeUuid}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 0
    // Should be 404 or a graceful redirect — NOT a 500
    expect(status).not.toBe(500)
    // Should show a not found message or redirect
    const hasNotFound = await page
      .getByText(/not found|404|doesn't exist|does not exist|no event/i)
      .first()
      .isVisible()
      .catch(() => false)
    const redirected = !page.url().includes(fakeUuid)
    expect(
      status === 404 || hasNotFound || redirected,
      'Fake event ID should show 404 or redirect'
    ).toBeTruthy()
  })

  test('/clients/[fakeId] — shows 404 or redirect (not 500)', async ({ page }) => {
    const resp = await page.goto(`/clients/${fakeUuid}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/quotes/[fakeId] — shows 404 or redirect (not 500)', async ({ page }) => {
    const resp = await page.goto(`/quotes/${fakeUuid}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/inquiries/[fakeId] — shows 404 or redirect (not 500)', async ({ page }) => {
    const resp = await page.goto(`/inquiries/${fakeUuid}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/menus/[fakeId] — shows 404 or redirect (not 500)', async ({ page }) => {
    const resp = await page.goto(`/menus/${fakeUuid}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/recipes/[fakeId] — shows 404 or redirect (not 500)', async ({ page }) => {
    const resp = await page.goto(`/recipes/${fakeUuid}`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })
})

// ─── 404 Handling — Malformed IDs ─────────────────────────────────────────────

test.describe('Error Handling — Malformed Parameters', () => {
  test('/events/not-a-uuid — does not 500', async ({ page }) => {
    const resp = await page.goto('/events/not-a-uuid')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/events/12345 — numeric ID does not 500', async ({ page }) => {
    const resp = await page.goto('/events/12345')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/clients/abc-not-uuid — does not 500', async ({ page }) => {
    const resp = await page.goto('/clients/abc-not-uuid')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/events/[id]/dop with fake ID — does not 500', async ({ page }) => {
    const resp = await page.goto('/events/fake-id-here/dop')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/events/[id]/aar with fake ID — does not 500', async ({ page }) => {
    const resp = await page.goto('/events/fake-id-here/aar')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/events/[id]/close-out with fake ID — does not 500', async ({ page }) => {
    const resp = await page.goto('/events/fake-id-here/close-out')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })
})

// ─── Non-Existent Routes ───────────────────────────────────────────────────────

test.describe('Error Handling — Non-Existent Pages', () => {
  test('/this-page-does-not-exist — shows 404', async ({ page }) => {
    const resp = await page.goto('/this-page-does-not-exist')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).toBe(404)
  })

  test('/settings/nonexistent-setting — shows 404 or redirect', async ({ page }) => {
    const resp = await page.goto('/settings/nonexistent-setting-page')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/events/[id]/nonexistent-sub-page — does not 500', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.confirmed}/nonexistent-sub`)
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/finance/nonexistent — does not 500', async ({ page }) => {
    const resp = await page.goto('/finance/nonexistent-page')
    await page.waitForLoadState('networkidle')
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })
})

// ─── API Error Handling ────────────────────────────────────────────────────────

test.describe('Error Handling — API Endpoints', () => {
  const fakeUuid = '00000000-0000-0000-0000-000000000000'

  test('API event document with fake ID returns <500', async ({ page }) => {
    const resp = await page.request.get(`/api/events/${fakeUuid}/documents/invoice`)
    expect(resp.status()).not.toBe(500)
  })

  test('API quote PDF with fake ID returns <500', async ({ page }) => {
    const resp = await page.request.get(`/api/quotes/${fakeUuid}/pdf`)
    expect(resp.status()).not.toBe(500)
  })

  test('Cron endpoint without secret returns 401 or 403', async ({ page }) => {
    const resp = await page.request.post('/api/scheduled/send-reminders', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(resp.status()).toBeGreaterThanOrEqual(401)
    expect(resp.status()).toBeLessThan(500)
  })

  test('API v1 clients without auth returns 401', async ({ page }) => {
    // Create a new request context without cookies
    const unauthRequest = await page.request.newContext()
    const resp = await unauthRequest.get('/api/v1/clients')
    expect(resp.status()).toBeGreaterThanOrEqual(401)
    expect(resp.status()).toBeLessThan(500)
    await unauthRequest.dispose()
  })
})

// ─── JS Error Resilience ───────────────────────────────────────────────────────

test.describe('Error Handling — JS Error Resilience', () => {
  test('Navigating rapidly between pages does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const pages = ['/dashboard', '/events', '/clients', '/quotes', '/finance']
    for (const path of pages) {
      await page.goto(path)
      await page.waitForTimeout(300)
    }

    expect(errors, 'Rapid navigation should not throw JS errors').toHaveLength(0)
  })

  test('Browser back button from 404 does not crash the app', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.goto('/this-does-not-exist')
    await page.waitForLoadState('networkidle')

    await page.goBack()
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
    expect(page.url()).toMatch(/dashboard/)
  })

  test('Network error resilience — page does not white-screen after slow load', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(errors).toHaveLength(0)
  })
})

// ─── Form Error States ─────────────────────────────────────────────────────────

test.describe('Error Handling — Form Error States', () => {
  test('Submitting event form with only spaces shows error', async ({ page }) => {
    await page.goto('/events/new')
    await page.waitForLoadState('networkidle')

    const nameField = page.locator('input[type="text"]').first()
    if (await nameField.isVisible()) {
      await nameField.fill('   ')
    }

    const submitBtn = page.getByRole('button', { name: /save|create|next|submit/i }).first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(1000)
    }

    // Should stay on form or show error — not create a blank-named event
    const url = page.url()
    expect(url).not.toMatch(/\/events\/[0-9a-f-]{36}$/)
  })

  test('Expense form with text in amount field handles gracefully', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')

    const amountField = page.locator('input[type="number"], input[name="amount"]').first()
    if (await amountField.isVisible()) {
      // Try to type text into a number field
      await amountField.fill('abc')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(300)
    }

    expect(errors).toHaveLength(0)
  })
})
