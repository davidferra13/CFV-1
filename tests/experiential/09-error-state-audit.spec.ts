// Experiential Verification: Error State Audit
//
// Verifies that error conditions produce visible error states, not blank
// screens or silent failures. Tests 404s, invalid IDs, and boundary
// conditions that could produce "nothing visible" instead of an error.

import { test, expect } from '@playwright/test'
import { captureCheckpoint, assertNotBlank, dismissOverlays } from './helpers/experiential-utils'

test.describe('Error State Audit', () => {
  test.setTimeout(120_000)

  test('nonexistent event ID shows error or not-found, not blank', async ({ page }, testInfo) => {
    await page.goto('/events/00000000-0000-0000-0000-000000000000', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, 'nonexistent-event', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `Nonexistent event should show error/404, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })

  test('nonexistent client ID shows error or not-found, not blank', async ({ page }, testInfo) => {
    await page.goto('/clients/00000000-0000-0000-0000-000000000000', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, 'nonexistent-client', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `Nonexistent client should show error/404, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })

  test('nonexistent recipe ID shows error or not-found, not blank', async ({ page }, testInfo) => {
    await page.goto('/recipes/00000000-0000-0000-0000-000000000000', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, 'nonexistent-recipe', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `Nonexistent recipe should show error/404, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })

  test('nonexistent route shows 404 page, not blank', async ({ page }, testInfo) => {
    await page.goto('/this-route-does-not-exist-at-all', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, '404-page', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `404 page should show not-found content, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })

  test('nonexistent chef settings sub-route shows error or redirect', async ({
    page,
  }, testInfo) => {
    await page.goto('/settings/nonexistent-section', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, 'nonexistent-settings', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `Nonexistent settings section should show error/redirect, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })

  test('invalid UUID in event path shows error, not crash', async ({ page }, testInfo) => {
    await page.goto('/events/not-a-uuid', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, 'invalid-uuid-event', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `Invalid UUID should show error, not blank/crash. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })

  test('deeply nested nonexistent route shows 404', async ({ page }, testInfo) => {
    await page.goto('/events/00000000-0000-0000-0000-000000000000/nonexistent-tab', {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(500)

    const cp = await captureCheckpoint(page, 'deep-nonexistent-route', testInfo)

    const hasResponse = cp.hasContent || cp.hasError
    expect(
      hasResponse,
      `Deep nonexistent route should show error/404, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
    ).toBeTruthy()
  })
})
