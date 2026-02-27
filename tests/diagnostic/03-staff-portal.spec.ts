// Diagnostic Suite 03 — Staff Portal
// Tests: Staff login, staff dashboard, staff tasks, station, recipes, schedule
// These are SEPARATE from chef portal — staff have their own auth realm

import { test, expect } from '../helpers/fixtures'

// ─── Staff Login Page ───────────────────────────────────────────────────────

test.describe('Staff Portal — Login', () => {
  test('staff login page renders', async ({ page }) => {
    await page.goto('/staff-login')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
    // Should have login form elements
    const inputs = page.locator('input')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('staff login page has password field', async ({ page }) => {
    await page.goto('/staff-login')
    await page.waitForLoadState('networkidle')
    const passwordField = page.locator('input[type="password"]')
    const hasPassword = (await passwordField.count()) > 0
    // Either a password field or a code/PIN field
    const codeField = page.locator('input[type="text"], input[type="number"], input[type="tel"]')
    const hasCode = (await codeField.count()) > 0
    expect(hasPassword || hasCode).toBeTruthy()
  })
})

// ─── Staff Management (Chef-Side) ───────────────────────────────────────────

test.describe('Staff Management — Chef View', () => {
  test('staff list page loads', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('add staff page or modal exists', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    // Look for add/invite staff button
    const addBtn = page
      .getByRole('button', { name: /add|invite|new|create/i })
      .first()
      .or(page.getByRole('link', { name: /add|invite|new|create/i }).first())
    const hasAdd = await addBtn.isVisible().catch(() => false)
    // Either there's an add button or the page shows staff management content
    const body = await page.locator('body').innerText()
    const hasStaffContent = /staff|team|member|employee|role/i.test(body)
    expect(hasAdd || hasStaffContent).toBeTruthy()
  })

  test('staff roles page loads', async ({ page }) => {
    const resp = await page.goto('/staff/roles')
    if (resp && resp.status() !== 404) {
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/500|internal server error/i)
    }
  })
})

// ─── Station System (Chef-Side) ─────────────────────────────────────────────

test.describe('Station System — Chef View', () => {
  test('stations page loads', async ({ page }) => {
    await page.goto('/stations')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('daily ops page loads', async ({ page }) => {
    await page.goto('/stations/daily-ops')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('ops log page loads', async ({ page }) => {
    await page.goto('/stations/ops-log')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('waste log page loads', async ({ page }) => {
    await page.goto('/stations/waste')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('order sheets page loads', async ({ page }) => {
    await page.goto('/stations/orders')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Tasks & Templates ─────────────────────────────────────────────────────

test.describe('Tasks System', () => {
  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('task templates page loads', async ({ page }) => {
    await page.goto('/tasks/templates')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Kitchen Display System ─────────────────────────────────────────────────

test.describe('Kitchen Display System (KDS)', () => {
  test('KDS page loads for confirmed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('KDS page loads for completed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/kds`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})
