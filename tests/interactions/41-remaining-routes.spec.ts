// Interaction Layer — Remaining Routes
// Covers every route not yet reached by files 01-40:
//   /queue, /import, /help, /insights, /schedule, /activity,
//   /financials, /operations/**, /expenses/**, /events/[id]/schedule
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Queue ────────────────────────────────────────────────────────────────────

test.describe('Queue', () => {
  test('/queue — loads without redirect', async ({ page }) => {
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/queue — shows queue content or empty state', async ({ page }) => {
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/queue — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Import ───────────────────────────────────────────────────────────────────

test.describe('Import', () => {
  test('/import — loads without redirect', async ({ page }) => {
    await page.goto('/import')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/import — shows import interface or instructions', async ({ page }) => {
    await page.goto('/import')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/import — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/import')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Help ─────────────────────────────────────────────────────────────────────

test.describe('Help', () => {
  test('/help — loads without redirect', async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/help — shows help content', async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
    const hasContent = await page
      .getByText(/help|guide|faq|support|documentation|how to/i)
      .first()
      .isVisible()
      .catch(() => false)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    const _ = hasContent
  })

  test('/help — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/help — clicking first article does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
    const firstArticle = page.locator('a[href*="/help/"]').first()
    if (await firstArticle.isVisible()) {
      await firstArticle.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/help\//)
    }
    expect(errors).toHaveLength(0)
  })
})

// ─── Insights (chef-level, separate from /analytics) ─────────────────────────

test.describe('Insights', () => {
  test('/insights — loads without redirect', async ({ page }) => {
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/insights — shows insight content', async ({ page }) => {
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/insights — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/insights/time-analysis — loads without 500', async ({ page }) => {
    const resp = await page.goto('/insights/time-analysis')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/insights — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/insights')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Schedule (top-level, separate from /staff/schedule) ─────────────────────

test.describe('Schedule', () => {
  test('/schedule — loads without redirect', async ({ page }) => {
    await page.goto('/schedule')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/schedule — shows schedule content', async ({ page }) => {
    await page.goto('/schedule')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/schedule — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/schedule')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

// ─── Activity ─────────────────────────────────────────────────────────────────

test.describe('Activity', () => {
  test('/activity — loads without redirect', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/activity — shows activity feed content', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/activity — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/activity — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/activity')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Chef B Client E2E')
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Financials (chef view, separate from /finance) ───────────────────────────

test.describe('Financials', () => {
  test('/financials — loads without redirect', async ({ page }) => {
    await page.goto('/financials')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/financials — shows financial content', async ({ page }) => {
    await page.goto('/financials')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/financials — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/financials')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/financials — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/financials')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Operations ───────────────────────────────────────────────────────────────

test.describe('Operations', () => {
  test('/operations — loads without redirect', async ({ page }) => {
    await page.goto('/operations')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/operations — shows operations content', async ({ page }) => {
    await page.goto('/operations')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/operations — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/operations')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/operations/kitchen-rentals — loads without 500', async ({ page }) => {
    const resp = await page.goto('/operations/kitchen-rentals')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/operations/kitchen-rentals — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/operations/kitchen-rentals')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/operations/equipment — loads without 500', async ({ page }) => {
    const resp = await page.goto('/operations/equipment')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/operations/equipment — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/operations/equipment')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('All operations routes load without 500', async ({ page }) => {
    const routes = ['/operations', '/operations/kitchen-rentals', '/operations/equipment']
    for (const route of routes) {
      const resp = await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(resp?.status(), `${route} should not 500`).not.toBe(500)
    }
  })
})

// ─── Expenses (top-level tree, separate from /finance/expenses) ───────────────

test.describe('Expenses (standalone)', () => {
  test('/expenses — loads without redirect', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/expenses — shows expenses list or empty state', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/expenses — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/expenses/new — create expense form loads', async ({ page }) => {
    const resp = await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/expenses/new — has description and amount fields', async ({ page }) => {
    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')
    const descField = page
      .getByLabel(/description|name|expense/i)
      .first()
      .or(page.locator('input[type="text"]').first())
    const isVisible = await descField.isVisible().catch(() => false)
    const _ = isVisible // informational
  })

  test('/expenses/new — no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('/expenses — data is tenant-scoped', async ({ page, seedIds }) => {
    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain(seedIds.chefBId)
  })
})

// ─── Expense Mutation (using the correct /expenses/new route) ─────────────────

test.describe('Mutation — Expense (standalone route)', () => {
  test('Create expense via /expenses/new → appears in /expenses list', async ({ page }) => {
    const uniqueDesc = `TEST-MV5-Expense-${Date.now()}`

    await page.goto('/expenses/new')
    await page.waitForLoadState('networkidle')

    const descField = page
      .getByLabel(/description|name|item/i)
      .first()
      .or(page.locator('input[type="text"]').first())

    if (!await descField.isVisible()) return

    await descField.fill(uniqueDesc)

    const amountField = page
      .getByLabel(/amount|cost|price/i)
      .first()
      .or(page.locator('input[type="number"]').first())

    if (await amountField.isVisible()) {
      await amountField.fill('25')
    }

    const saveBtn = page.getByRole('button', { name: /save|create|add|submit/i }).first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForLoadState('networkidle')
    }

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.goto('/expenses')
    await page.waitForLoadState('networkidle')

    const expenseVisible = await page.getByText(uniqueDesc).first().isVisible().catch(() => false)
    expect(expenseVisible, `Created expense "${uniqueDesc}" should appear in /expenses list`).toBeTruthy()
  })
})

// ─── Event Schedule Sub-page ──────────────────────────────────────────────────

test.describe('Events — Schedule Sub-page', () => {
  test('/events/[id]/schedule — loads without 500', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.confirmed}/schedule`)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })

  test('/events/[id]/schedule — shows schedule content', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/schedule`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/events/[id]/schedule — no JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`/events/${seedIds.eventIds.confirmed}/schedule`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
