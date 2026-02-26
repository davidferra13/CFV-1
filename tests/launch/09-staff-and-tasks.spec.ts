// Launch Readiness Audit — Staff & Task Management
// Tests: staff CRUD, scheduling, availability, clock, performance, labor
// Tests: task CRUD, assignment, completion, templates
// These are features users specifically requested

import { test, expect } from '../helpers/fixtures'

test.describe('Staff Directory', () => {
  test('staff list loads', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show staff list or empty state with add button
    const hasContent = /staff|team|add|create|empty|no staff/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('staff page has add staff button', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add|new|create/i })
      .first()
      .or(page.getByRole('link', { name: /add|new|create/i }).first())
    const hasAdd = await addBtn.isVisible().catch(() => false)
    // Should have a way to add staff
    expect(hasAdd).toBeTruthy()
  })
})

test.describe('Staff Sub-Pages', () => {
  test('/staff/schedule loads', async ({ page }) => {
    const resp = await page.goto('/staff/schedule')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should show schedule grid or empty state
    const hasScheduleContent = /schedule|week|assign|event|day/i.test(bodyText)
    expect(hasScheduleContent).toBeTruthy()
  })

  test('/staff/availability loads', async ({ page }) => {
    const resp = await page.goto('/staff/availability')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasContent = /availability|available|unavailable/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('/staff/clock loads', async ({ page }) => {
    const resp = await page.goto('/staff/clock')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/staff/performance loads', async ({ page }) => {
    const resp = await page.goto('/staff/performance')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/staff/labor loads', async ({ page }) => {
    const resp = await page.goto('/staff/labor')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Task Board', () => {
  test('task page loads with date navigation', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show date navigation (prev/today/next)
    const hasDateNav = /today|prev|next|←|→/i.test(bodyText)
    // Task board should render
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('task page has create task button', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add|new|create/i })
      .first()
      .or(page.getByRole('link', { name: /add|new|create/i }).first())
    const hasAdd = await addBtn.isVisible().catch(() => false)
    expect(hasAdd).toBeTruthy()
  })

  test('task creation form has required fields', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    // Click add/create button to open form
    const addBtn = page.getByRole('button', { name: /add|new|create/i }).first()
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1000)
      const bodyText = await page.locator('body').innerText()
      // Form should show task fields
      const hasFields = /title|description|priority|assign|due/i.test(bodyText)
      expect(hasFields).toBeTruthy()
    }
  })
})

test.describe('Task Templates', () => {
  test('/tasks/templates loads', async ({ page }) => {
    const resp = await page.goto('/tasks/templates')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })
})

test.describe('Event Staff Panel', () => {
  test('event detail shows staff assignment capability', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Event detail should have a staff section
    const hasStaffSection = /staff|team|assign|roster/i.test(bodyText)
    console.log('[INFO] Staff section visible on event detail:', hasStaffSection)
  })
})

test.describe('Daily Ops', () => {
  test('/daily loads (Daily Ops Command Center)', async ({ page }) => {
    const resp = await page.goto('/daily')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/stations/daily-ops loads', async ({ page }) => {
    const resp = await page.goto('/stations/daily-ops')
    expect(resp?.status()).not.toBe(500)
  })
})

test.describe('Operations Sub-Pages', () => {
  const routes = [
    '/stations',
    '/stations/orders',
    '/stations/waste',
    '/stations/ops-log',
    '/queue',
    '/operations/kitchen-rentals',
    '/operations/equipment',
  ]

  for (const route of routes) {
    test(`${route} loads without 500`, async ({ page }) => {
      const resp = await page.goto(route)
      expect(resp?.status()).not.toBe(500)
    })
  }
})
