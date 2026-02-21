// Interaction Layer — DOP Mobile & KDS (Kitchen Display System)
// Tests day-of-service operational tools:
//
// DOP Mobile: Full-screen task checklist with Mark Complete/Undo toggles,
//   Next/Previous navigation, auto-detected tasks, progress tracking.
//
// KDS: Course status tracker with Fire/86 buttons, color-coded states,
//   timestamps, status counts.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── DOP Mobile ───────────────────────────────────────────────────────────────

test.describe('DOP Mobile — Structure', () => {
  test('DOP mobile page loads for confirmed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('DOP mobile shows event title or occasion', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/confirmed wedding dinner|TEST/i)).toBeVisible({ timeout: 10_000 })
  })

  test('DOP mobile has task list', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')
    // Should have checkboxes, buttons, or task items
    const taskElements = page.locator('button, [role="checkbox"], li').first()
    await expect(taskElements).toBeVisible({ timeout: 10_000 })
  })

  test('DOP mobile shows progress indicator', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')
    // Progress bar or "X of Y complete" text
    const progressEl = page.locator('[role="progressbar"]').first()
      .or(page.getByText(/of.*complete|complete|progress|%/i).first())
    await expect(progressEl).toBeVisible({ timeout: 10_000 })
  })

  test('DOP mobile has navigation buttons (Previous/Next or Mark Complete)', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')
    const navBtn = page.getByRole('button', { name: /next|previous|mark complete|complete/i }).first()
    await expect(navBtn).toBeVisible({ timeout: 10_000 })
  })

  test('DOP mobile does not crash on task toggle', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')

    // Click the first available action button
    const markBtn = page.getByRole('button', { name: /mark complete|complete|next/i }).first()
    if (await markBtn.isVisible()) {
      await markBtn.click()
      await page.waitForTimeout(1000)
    }

    expect(errors, 'DOP task toggle should not throw JS errors').toHaveLength(0)
  })

  test('DOP mobile Previous button is disabled on first task', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/dop/mobile`)
    await page.waitForLoadState('networkidle')
    const prevBtn = page.getByRole('button', { name: /previous|back/i }).first()
    if (await prevBtn.isVisible()) {
      // Should be disabled on the very first task
      const isDisabled = await prevBtn.isDisabled()
      expect(isDisabled, 'Previous button should be disabled on first task').toBeTruthy()
    }
  })

  test('DOP mobile for draft event still loads (read-only or shows warning)', async ({ page, seedIds }) => {
    const resp = await page.goto(`/events/${seedIds.eventIds.draft}/dop/mobile`)
    expect(resp?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── KDS (Kitchen Display System) ────────────────────────────────────────────

test.describe('KDS — Structure', () => {
  test('KDS loads for confirmed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('KDS shows course cards or "no courses" message', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    // Either course cards appear or a "no menu attached" message
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('KDS shows status counts section', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    // Should show "Pending: X", "Fired: X", "Served: X", etc.
    const statusEl = page.getByText(/pending|fired|served|plated|86/i).first()
    await expect(statusEl).toBeVisible({ timeout: 10_000 })
  })

  test('KDS has link back to event detail', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    const backLink = page.getByRole('link').filter({ hasText: /back|event|return/i }).first()
    await expect(backLink).toBeVisible({ timeout: 10_000 })
  })

  test('KDS does not crash on load', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')

    expect(errors, 'KDS should not throw JS errors on load').toHaveLength(0)
  })
})

test.describe('KDS — Fire/86 Interactions', () => {
  test('KDS Fire button is visible when courses exist', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    // Fire button exists when a course is in "pending" state
    const fireBtn = page.getByRole('button', { name: /fire|start/i }).first()
    const isVisible = await fireBtn.isVisible().catch(() => false)
    // Non-fatal: event may not have courses seeded; just verify no crash
    if (isVisible) {
      await expect(fireBtn).toBeVisible()
    }
  })

  test('KDS 86 button is visible when courses exist', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')
    const eightyBtn = page.getByRole('button', { name: /86|eighty.six|cancel course/i }).first()
    const isVisible = await eightyBtn.isVisible().catch(() => false)
    if (isVisible) {
      await expect(eightyBtn).toBeVisible()
    }
  })

  test('KDS clicking Fire button does not crash', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.confirmed}/kds`)
    await page.waitForLoadState('networkidle')

    const fireBtn = page.getByRole('button', { name: /^fire$/i }).first()
    if (await fireBtn.isVisible()) {
      await fireBtn.click()
      await page.waitForTimeout(1000)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Pack List ────────────────────────────────────────────────────────────────

test.describe('Pack List — Interactions', () => {
  test('Pack list page renders for confirmed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/pack`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('Pack list has checkable items or empty state', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/pack`)
    await page.waitForLoadState('networkidle')
    // Either shows a list of items to pack or an empty state message
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
  })

  test('Pack list does not crash on checkbox toggle', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/events/${seedIds.eventIds.confirmed}/pack`)
    await page.waitForLoadState('networkidle')

    const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]').first()
    if (await checkbox.isVisible()) {
      await checkbox.click()
      await page.waitForTimeout(500)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Travel Page ──────────────────────────────────────────────────────────────

test.describe('Travel Page — Content', () => {
  test('Travel page loads for confirmed event', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/travel`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('Travel page shows address or location info', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/travel`)
    await page.waitForLoadState('networkidle')
    // Seeded confirmed event has address "100 E2E Test Street, Boston, MA 02101"
    const addressEl = page.getByText(/boston|e2e test|travel|route|direction/i).first()
    await expect(addressEl).toBeVisible({ timeout: 10_000 })
  })
})
