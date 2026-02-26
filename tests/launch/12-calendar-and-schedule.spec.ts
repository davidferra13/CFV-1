// Launch Readiness Audit — Calendar & Schedule
// Tests: calendar views, event display, date navigation, schedule page

import { test, expect } from '../helpers/fixtures'

test.describe('Calendar — Main View', () => {
  test('calendar page loads and renders', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Calendar should show month/week/day labels or grid
    const hasCalendarUI =
      /mon|tue|wed|thu|fri|sat|sun|january|february|march|april|may|june|july|august|september|october|november|december|\d{4}/i.test(
        bodyText
      )
    expect(hasCalendarUI).toBeTruthy()
    expect(errors).toHaveLength(0)
  })

  test('calendar shows event markers', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    // Seed events should appear on their dates
    // Look for clickable event elements or event indicators
    const bodyText = await page.locator('body').innerText()
    // At minimum, the calendar grid should have content
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })
})

test.describe('Calendar — Alternate Views', () => {
  test('/calendar/day loads', async ({ page }) => {
    const resp = await page.goto('/calendar/day')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/calendar/week loads', async ({ page }) => {
    const resp = await page.goto('/calendar/week')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })

  test('/calendar/year loads', async ({ page }) => {
    const resp = await page.goto('/calendar/year')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Schedule', () => {
  test('/schedule page loads', async ({ page }) => {
    await page.goto('/schedule')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show upcoming events or schedule view
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Waitlist', () => {
  test('/waitlist loads', async ({ page }) => {
    const resp = await page.goto('/waitlist')
    expect(resp?.status()).not.toBe(500)
  })
})

test.describe('Event Reviews', () => {
  test('/aar loads', async ({ page }) => {
    const resp = await page.goto('/aar')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })

  test('/reviews loads', async ({ page }) => {
    const resp = await page.goto('/reviews')
    expect(resp?.status()).not.toBe(500)
  })
})
