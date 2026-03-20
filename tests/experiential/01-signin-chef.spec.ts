// Experiential Verification: Chef Sign-In Flow
//
// Walks the complete sign-in journey as a chef user, screenshotting
// every transition point. Catches blank screens between auth success
// and dashboard render (the exact issue that prompted this suite).

import { test, expect } from '@playwright/test'
import {
  captureCheckpoint,
  assertNotBlank,
  loadAgentCredentials,
  hasLoadingIndicator,
} from './helpers/experiential-utils'

test.describe('Chef Sign-In Flow', () => {
  test.setTimeout(90_000)

  test('sign-in shows continuous visual feedback from form to dashboard', async ({
    page,
    browser,
  }, testInfo) => {
    // Use a fresh context with no auth
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const freshPage = await context.newPage()

    const creds = loadAgentCredentials()

    // ── Checkpoint 1: Sign-in page renders ──
    await freshPage.goto('/auth/signin', { waitUntil: 'networkidle' })
    const cp1 = await assertNotBlank(freshPage, '1-signin-page-rendered', testInfo)
    expect(cp1.visibleText).toMatch(/sign in/i)

    // Verify form elements are present
    await expect(freshPage.locator('input[type="email"]')).toBeVisible()
    await expect(freshPage.locator('input[type="password"]')).toBeVisible()
    await expect(freshPage.getByRole('button', { name: /sign in/i })).toBeVisible()

    // ── Fill credentials ──
    await freshPage.locator('input[type="email"]').fill(creds.email)
    await freshPage.locator('input[type="password"]').fill(creds.password)

    await captureCheckpoint(freshPage, '2-credentials-filled', testInfo)

    // ── Checkpoint 3: Submit and capture immediate response ──
    // Set up a promise that resolves on navigation away from sign-in
    const navigationPromise = freshPage
      .waitForURL(/dashboard|onboarding|welcome|\/$/i, { timeout: 30_000 })
      .catch(() => {
        // Navigation may not match expected patterns - we'll verify destination below
      })

    await freshPage.getByRole('button', { name: /sign in/i }).click()

    // ── Checkpoint 4: Button loading state ──
    // The button should show a loading indicator immediately after click
    await freshPage.waitForTimeout(200)
    const cp4 = await captureCheckpoint(freshPage, '3-submit-clicked-immediate', testInfo)

    // ── Checkpoint 5: Transition overlay ──
    // After auth succeeds, a full-screen transition overlay should appear
    // with "Signing you in..." / "Loading your workspace..." messages.
    // This is the CRITICAL checkpoint - previously this was a blank screen.
    try {
      await freshPage.waitForSelector('text=/signing you in|loading your workspace|preparing/i', {
        timeout: 10_000,
      })
      const cp5 = await captureCheckpoint(freshPage, '4-transition-overlay-visible', testInfo)
      expect(cp5.hasContent).toBe(true)
    } catch {
      // If we don't see the transition overlay, capture what IS visible
      const cp5 = await captureCheckpoint(freshPage, '4-transition-overlay-MISSING', testInfo)

      // This is only a failure if the page is blank (no loading, no content)
      if (!cp5.hasContent && !cp5.hasLoadingIndicator) {
        throw new Error(
          'EXPERIENTIAL FAILURE: After successful sign-in, user sees a blank screen.\n' +
            'Expected: transition overlay with "Signing you in..." message.\n' +
            `Actual visible text: "${cp5.visibleText}"\n` +
            'This is the exact regression this suite was built to catch.'
        )
      }
    }

    // ── Checkpoint 6: Wait for navigation to complete ──
    await navigationPromise

    // ── Checkpoint 7: Destination page ──
    // After navigation, the user should see EITHER a loading skeleton, the dashboard,
    // OR the onboarding page (new/test accounts hit the onboarding gate).
    // They should NEVER see a blank page.
    await freshPage.waitForTimeout(500)
    const cp7 = await assertNotBlank(freshPage, '5-destination-page', testInfo)

    // The destination should show meaningful content (dashboard, onboarding, or loading)
    const hasDestinationContent =
      cp7.visibleText.match(
        /dashboard|loading your workspace|preparing|welcome|onboarding|chef|portal/i
      ) || cp7.hasLoadingIndicator
    expect(
      hasDestinationContent,
      `Post-signin destination should show content, got: "${cp7.visibleText.slice(0, 100)}"`
    ).toBeTruthy()

    // ── Checkpoint 8: Page fully loaded ──
    await freshPage.waitForLoadState('networkidle').catch(() => {})
    await freshPage.waitForTimeout(2000)
    const cp8 = await assertNotBlank(freshPage, '6-page-fully-loaded', testInfo)

    await context.close()
  })

  test('invalid credentials show inline error without blank flash', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const freshPage = await context.newPage()

    await freshPage.goto('/auth/signin', { waitUntil: 'networkidle' })

    await freshPage.locator('input[type="email"]').fill('nonexistent@example.com')
    await freshPage.locator('input[type="password"]').fill('wrongpassword123')
    await freshPage.getByRole('button', { name: /sign in/i }).click()

    // Wait for error to appear
    await freshPage.waitForTimeout(3000)

    const cp = await assertNotBlank(freshPage, 'error-state-after-invalid-login', testInfo)

    // Should still be on sign-in page
    expect(freshPage.url()).toContain('/auth/signin')

    // Should show an error message
    expect(cp.hasError || cp.visibleText.match(/invalid|error|incorrect|wrong/i)).toBeTruthy()

    await context.close()
  })

  test('sign-in page has no blank flash on initial load', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const freshPage = await context.newPage()

    // Navigate and capture immediately on commit (before JS runs)
    await freshPage.goto('/auth/signin', { waitUntil: 'commit' })
    const immediate = await captureCheckpoint(freshPage, 'signin-immediate-on-commit', testInfo)

    // The Suspense fallback should provide a spinner at minimum
    const hasAnything = immediate.hasContent || immediate.hasLoadingIndicator
    expect(
      hasAnything,
      'Sign-in page should show at least a loading spinner on initial commit'
    ).toBeTruthy()

    // Wait for full render
    await freshPage.waitForLoadState('networkidle')
    await assertNotBlank(freshPage, 'signin-after-hydration', testInfo)

    await context.close()
  })
})
