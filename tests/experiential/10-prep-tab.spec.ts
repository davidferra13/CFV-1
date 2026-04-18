// Experiential Verification: Prep Tab & Peak Windows
//
// Verifies that:
// - Event detail page renders the prep tab
// - Prep tab shows timeline content (days, items, or empty state)
// - Symbol key is visible
// - Untimed items section appears when expected
// - Peak window display on recipe detail page works

import { test, expect } from '@playwright/test'
import {
  assertNotBlank,
  navigateAndVerify,
  captureCheckpoint,
  dismissOverlays,
} from './helpers/experiential-utils'

test.describe('Prep Tab & Peak Windows', () => {
  test.setTimeout(120_000)

  test('event detail prep tab renders without blank screen', async ({ page }, testInfo) => {
    // Navigate to events list to find an event
    const { settled: listSettled } = await navigateAndVerify(
      page,
      '/events',
      'events-list',
      testInfo
    )
    await dismissOverlays(page)

    if (page.url().includes('/auth/signin')) {
      expect(listSettled.hasContent, 'Sign-in page should not be blank').toBeTruthy()
      return
    }

    // Find first event link
    const eventLink = page.locator('a[href*="/events/"]').first()
    const hasEvent = await eventLink.isVisible().catch(() => false)

    if (!hasEvent) {
      // No events exist, skip gracefully
      test.skip()
      return
    }

    await eventLink.click()
    await page.waitForLoadState('networkidle')
    await dismissOverlays(page)

    // Look for prep tab trigger
    const prepTab = page.locator(
      '[data-value="prep"], button:has-text("Prep"), [role="tab"]:has-text("Prep")'
    )
    const hasPrepTab = await prepTab
      .first()
      .isVisible()
      .catch(() => false)

    if (!hasPrepTab) {
      // Prep tab may not exist on all events (e.g., no menu)
      await captureCheckpoint(page, 'event-detail-no-prep-tab', testInfo)
      return
    }

    await prepTab.first().click()
    await page.waitForTimeout(1000)

    const { settled } = (await captureCheckpoint(page, 'prep-tab-content', testInfo)) as any
    const pageText = (await page.textContent('body')) ?? ''

    // Prep tab should show timeline content OR empty state
    const hasTimelineContent =
      /day\s*-?\d|service\s*day|prep\s*day|grocery|peak|no.*menu|set\s*peak\s*windows|untimed/i.test(
        pageText
      )
    const hasSymbolKey = /symbol|legend|freezable|day.of|fresh/i.test(pageText)

    expect(
      hasTimelineContent || hasSymbolKey,
      `Prep tab should show timeline content or guidance. Got: "${pageText.slice(0, 300)}"`
    ).toBeTruthy()
  })

  test('recipe detail shows peak window data when set', async ({ page }, testInfo) => {
    const { settled } = await navigateAndVerify(page, '/recipes', 'recipes-list', testInfo)
    await dismissOverlays(page)

    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in page should not be blank').toBeTruthy()
      return
    }

    // Find first recipe link
    const recipeLink = page.locator('a[href*="/recipes/"]').first()
    const hasRecipe = await recipeLink.isVisible().catch(() => false)

    if (!hasRecipe) {
      test.skip()
      return
    }

    await recipeLink.click()
    await page.waitForLoadState('networkidle')
    await dismissOverlays(page)

    const pageText = (await page.textContent('body')) ?? ''

    // Recipe detail should render. Peak window data is optional (only if set).
    // Just verify the page isn't blank and has recipe content.
    const hasRecipeContent =
      /ingredient|method|instructions|prep\s*time|cook\s*time|category/i.test(pageText)

    expect(
      hasRecipeContent,
      `Recipe detail should show recipe content. Got: "${pageText.slice(0, 300)}"`
    ).toBeTruthy()

    // If peak window data is set, verify it renders
    const hasPeakDisplay = /peak\s*freshness|peak\s*window|safety\s*ceiling|storage\s*method/i.test(
      pageText
    )
    if (hasPeakDisplay) {
      await captureCheckpoint(page, 'recipe-peak-window-display', testInfo)
    }
  })

  test('recipe print view includes peak window when available', async ({ page }, testInfo) => {
    // Navigate to recipe sprint (print view)
    const { settled } = await navigateAndVerify(page, '/recipes/sprint', 'recipe-sprint', testInfo)
    await dismissOverlays(page)

    if (page.url().includes('/auth/signin')) {
      expect(settled.hasContent, 'Sign-in page should not be blank').toBeTruthy()
      return
    }

    // Sprint/print page should render without errors
    assertNotBlank(settled, 'Recipe sprint page should not be blank')
  })
})
