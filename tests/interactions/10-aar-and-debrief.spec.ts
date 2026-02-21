// Interaction Layer — After-Action Review (AAR) & Debrief
// Tests post-event reflection forms:
//
// AAR: Star ratings (calm/prepared), checkboxes (what was forgotten),
//   free-text fields (what went well, what went wrong, notes).
//
// Debrief: Structured debrief notes, learnings, next-time action items.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── AAR (After-Action Review) ────────────────────────────────────────────────

test.describe('AAR — Structure', () => {
  test('AAR page loads for completed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('AAR page shows event context', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    // Should show the event name or occasion
    await expect(page.getByText(/TEST Completed New Years Dinner|completed/i)).toBeVisible({ timeout: 10_000 })
  })

  test('AAR has "How calm were you?" rating', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    const calmEl = page.getByText(/calm|stress/i).first()
    await expect(calmEl).toBeVisible({ timeout: 10_000 })
  })

  test('AAR has "How prepared were you?" rating', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    const prepEl = page.getByText(/prepared|ready/i).first()
    await expect(prepEl).toBeVisible({ timeout: 10_000 })
  })

  test('AAR has star rating buttons (1–5)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    // Rating buttons are numbered 1-5
    const ratingBtns = page.locator('button').filter({ hasText: /^[1-5]$/ })
    const count = await ratingBtns.count()
    expect(count, 'AAR should have rating buttons 1-5').toBeGreaterThanOrEqual(2)
  })

  test('AAR has free-text notes fields', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    const textareas = await page.locator('textarea').count()
    expect(textareas, 'AAR should have textarea fields for notes').toBeGreaterThan(0)
  })

  test('AAR has Save button', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')
    const saveBtn = page.getByRole('button', { name: /save|submit|record/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
  })

  test('AAR does not crash when ratings are clicked', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')

    // Click rating "4" for calm
    const ratingBtns = page.locator('button').filter({ hasText: /^4$/ })
    const firstRating = ratingBtns.first()
    if (await firstRating.isVisible()) {
      await firstRating.click()
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })
})

test.describe('AAR — Form Filling', () => {
  test('Can fill calm rating + note + save without crashing', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.completed}/aar`)
    await page.waitForLoadState('networkidle')

    // Click rating 4 for calm
    const ratingBtn4 = page.locator('button').filter({ hasText: /^4$/ }).first()
    if (await ratingBtn4.isVisible()) {
      await ratingBtn4.click()
    }

    // Click rating 5 for prepared (second set of rating buttons)
    const ratingBtn5 = page.locator('button').filter({ hasText: /^5$/ }).nth(1)
    if (await ratingBtn5.isVisible()) {
      await ratingBtn5.click()
    }

    // Fill a notes field
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill('TEST AAR note — automated E2E test, please ignore')
    }

    // Click save
    const saveBtn = page.getByRole('button', { name: /save|submit/i }).first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(1500)
    }

    expect(errors).toHaveLength(0)
    expect(page.url()).not.toMatch(/auth\/signin/)
  })
})

// ─── Global AAR List ──────────────────────────────────────────────────────────

test.describe('AAR — Global List', () => {
  test('/aar — AAR archive page loads', async ({ page }) => {
    await page.goto('/aar')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('/aar — shows reviews or empty state', async ({ page }) => {
    await page.goto('/aar')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })
})

// ─── Debrief ──────────────────────────────────────────────────────────────────

test.describe('Debrief — Structure', () => {
  test('Debrief page loads for completed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('Debrief page has text input areas', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await page.waitForLoadState('networkidle')
    const inputs = await page.locator('input, textarea').count()
    expect(inputs, 'Debrief should have form fields').toBeGreaterThan(0)
  })

  test('Debrief has Save button', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await page.waitForLoadState('networkidle')
    const saveBtn = page.getByRole('button', { name: /save|submit|record/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
  })

  test('Debrief does not crash on filling fields', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.completed}/debrief`)
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill('TEST debrief note — automated E2E test')
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Interactive Debrief (mid-service) ───────────────────────────────────────

test.describe('Interactive / Mid-Service Notes', () => {
  test('/events/[confirmed]/interactive loads', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/interactive`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Interactive page does not crash', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.confirmed}/interactive`)
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
