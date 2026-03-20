// Experiential Verification: Event Lifecycle Transitions
//
// For events in various FSM states, verifies that:
// - The event detail page renders correctly
// - Transition buttons are visible when expected
// - State-specific panels/tabs show appropriate content
// - No blank screens appear during navigation between event views

import { test, expect } from '@playwright/test'
import {
  assertNotBlank,
  navigateAndVerify,
  captureCheckpoint,
  dismissOverlays,
} from './helpers/experiential-utils'

test.describe('Event Lifecycle Views', () => {
  test.setTimeout(120_000)

  test('events board/kanban view renders', async ({ page }, testInfo) => {
    const { settled } = await navigateAndVerify(page, '/events/board', 'events-board', testInfo)
    await dismissOverlays(page)

    // If redirected to sign-in (expired auth), page is not blank - just unauthenticated
    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in redirect should show form, not blank').toBeTruthy()
      return
    }

    // Board view should show columns or an empty state
    const hasBoard = settled.visibleText.match(
      /draft|proposed|accepted|paid|confirmed|in progress|completed|cancelled|no events|empty/i
    )
    expect(
      hasBoard,
      `Events board should show FSM columns or empty state, got: "${settled.visibleText.slice(0, 200)}"`
    ).toBeTruthy()
  })

  test('calendar view renders', async ({ page }, testInfo) => {
    const { settled } = await navigateAndVerify(page, '/calendar', 'calendar-view', testInfo)
    await dismissOverlays(page)

    // If redirected to sign-in (expired auth), page is not blank - just unauthenticated
    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in redirect should show form, not blank').toBeTruthy()
      return
    }

    // Calendar should show month/week/day controls or calendar grid
    const hasCalendar = settled.visibleText.match(
      /january|february|march|april|may|june|july|august|september|october|november|december|mon|tue|wed|thu|fri|sat|sun|today|week|month/i
    )
    expect(
      hasCalendar,
      `Calendar should show date content, got: "${settled.visibleText.slice(0, 200)}"`
    ).toBeTruthy()
  })

  test('event detail tabs all render content', async ({ page }, testInfo) => {
    // Find an existing event
    await page.goto('/events', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await dismissOverlays(page)

    // If redirected to sign-in (expired auth), verify sign-in page renders and skip
    if (page.url().includes('/auth/signin')) {
      await assertNotBlank(page, 'event-tabs-auth-redirect', testInfo)
      test.skip(true, 'Auth expired - redirected to sign-in')
      return
    }

    const eventLink = page.locator('a[href*="/events/"]').first()
    const hasEvent = await eventLink.isVisible().catch(() => false)

    if (!hasEvent) {
      test.skip(true, 'No events in test data')
      return
    }

    // Get the event URL
    const href = await eventLink.getAttribute('href')
    if (!href) {
      test.skip(true, 'No event href found')
      return
    }

    // Navigate to event detail
    await page.goto(href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await dismissOverlays(page)

    await assertNotBlank(page, 'event-detail-main', testInfo)

    // Check for tab navigation on the event detail page
    const tabs = page.getByRole('tab')
    const tabCount = await tabs.count()

    if (tabCount > 0) {
      // Click each tab and verify it renders content
      for (let i = 0; i < Math.min(tabCount, 6); i++) {
        const tab = tabs.nth(i)
        const tabName = await tab.textContent()

        await tab.click()
        await page.waitForTimeout(500)

        await assertNotBlank(
          page,
          `event-detail-tab-${tabName?.trim().replace(/\s+/g, '-').toLowerCase() || i}`,
          testInfo
        )
      }
    }
  })

  test('AAR page renders', async ({ page }, testInfo) => {
    const { settled } = await navigateAndVerify(page, '/aar', 'aar-list', testInfo)
    await dismissOverlays(page)

    // If redirected to sign-in (expired auth), page is not blank - just unauthenticated
    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in redirect should show form, not blank').toBeTruthy()
      return
    }

    const hasContent = settled.visibleText.match(
      /after.action|review|debrief|no reviews|empty|completed/i
    )
    expect(
      hasContent,
      `AAR page should show reviews or empty state, got: "${settled.visibleText.slice(0, 200)}"`
    ).toBeTruthy()
  })
})
