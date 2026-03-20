// Experiential Verification: Inquiry to Event Creation
//
// Walks the pipeline flow: inquiry list -> inquiry detail -> create event.
// Verifies every transition shows visual feedback and no blank gaps.

import { test, expect } from '@playwright/test'
import {
  captureCheckpoint,
  assertNotBlank,
  navigateAndVerify,
  dismissOverlays,
} from './helpers/experiential-utils'

test.describe('Inquiry to Event Flow', () => {
  test.setTimeout(120_000)

  test('inquiry list renders with content or empty state', async ({ page }, testInfo) => {
    const { settled } = await navigateAndVerify(page, '/inquiries', 'inquiry-list', testInfo)
    await dismissOverlays(page)

    // If redirected to sign-in (expired auth), page is not blank - just unauthenticated
    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in redirect should show form, not blank').toBeTruthy()
      return
    }

    // Should show either inquiry cards or an empty state message
    const hasInquiries = settled.visibleText.match(/inquiry|lead|new|status/i)
    const hasEmptyState = settled.visibleText.match(/no inquiries|get started|empty|waiting/i)
    expect(
      hasInquiries || hasEmptyState,
      `Inquiry list should show inquiries or empty state, got: "${settled.visibleText.slice(0, 200)}"`
    ).toBeTruthy()
  })

  test('clicking an inquiry shows detail without blank flash', async ({ page }, testInfo) => {
    await page.goto('/inquiries', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await dismissOverlays(page)

    // Look for any clickable inquiry row/card
    const inquiryLink = page
      .locator('a[href*="/inquiries/"], tr[data-inquiry-id], [data-testid*="inquiry"]')
      .first()
    const hasInquiry = await inquiryLink.isVisible().catch(() => false)

    if (!hasInquiry) {
      // No inquiries exist - verify the empty state is visible (not blank)
      await assertNotBlank(page, 'inquiry-list-empty-state', testInfo)
      test.skip(true, 'No inquiries in test data to click through')
      return
    }

    // Click the first inquiry
    await inquiryLink.click()
    await page.waitForTimeout(300)

    // Immediate state after click
    await assertNotBlank(page, 'inquiry-detail-immediate', testInfo)

    // Settled state
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await assertNotBlank(page, 'inquiry-detail-settled', testInfo)
  })

  test('events list renders with content or empty state', async ({ page }, testInfo) => {
    const { settled } = await navigateAndVerify(page, '/events', 'events-list', testInfo)
    await dismissOverlays(page)

    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in redirect should show form, not blank').toBeTruthy()
      return
    }

    const hasEvents = settled.visibleText.match(/event|upcoming|past|status|date/i)
    const hasEmptyState = settled.visibleText.match(/no events|create|get started|empty/i)
    expect(
      hasEvents || hasEmptyState,
      `Events list should show events or empty state, got: "${settled.visibleText.slice(0, 200)}"`
    ).toBeTruthy()
  })

  test('event creation form renders all fields', async ({ page }, testInfo) => {
    await page.goto('/events/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)
    await dismissOverlays(page)

    const cp = await assertNotBlank(page, 'event-creation-form', testInfo)

    // Should have form-like content
    const hasFormElements = cp.visibleText.match(/client|date|guest|occasion|event|create|new/i)
    expect(
      hasFormElements,
      `Event form should show form fields, got: "${cp.visibleText.slice(0, 200)}"`
    ).toBeTruthy()
  })

  test('event detail page shows content for existing event', async ({ page }, testInfo) => {
    // Navigate to events list first
    await page.goto('/events', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await dismissOverlays(page)

    // Find first event link
    const eventLink = page.locator('a[href*="/events/"]').first()
    const hasEvent = await eventLink.isVisible().catch(() => false)

    if (!hasEvent) {
      test.skip(true, 'No events in test data')
      return
    }

    await eventLink.click()
    await page.waitForTimeout(300)

    // Should show loading or content immediately
    await assertNotBlank(page, 'event-detail-immediate', testInfo)

    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1000)
    await assertNotBlank(page, 'event-detail-settled', testInfo)
  })
})
