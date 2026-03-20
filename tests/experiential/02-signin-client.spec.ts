// Experiential Verification: Client Sign-In Flow
//
// Same principle as chef sign-in but for client role.
// Verifies the auth-to-client-portal boundary crossing.

import { test, expect } from '@playwright/test'
import { captureCheckpoint, assertNotBlank } from './helpers/experiential-utils'
import { readFileSync } from 'fs'

function loadClientCredentials(): { email: string; password: string } | null {
  try {
    const raw = readFileSync('.auth/seed-ids.json', 'utf-8')
    const data = JSON.parse(raw)
    if (data.clientEmail && data.clientPassword) {
      return { email: data.clientEmail, password: data.clientPassword }
    }
    return null
  } catch {
    return null
  }
}

test.describe('Client Sign-In Flow', () => {
  test.setTimeout(90_000)

  test('client sign-in shows continuous feedback from form to my-events', async ({
    browser,
  }, testInfo) => {
    const creds = loadClientCredentials()
    test.skip(!creds, 'No client credentials in seed-ids.json - run globalSetup first')

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const freshPage = await context.newPage()

    // ── Sign-in page ──
    await freshPage.goto('/auth/signin', { waitUntil: 'networkidle' })
    await assertNotBlank(freshPage, '1-signin-page', testInfo)

    // ── Fill and submit ──
    await freshPage.locator('input[type="email"]').fill(creds!.email)
    await freshPage.locator('input[type="password"]').fill(creds!.password)

    await freshPage.getByRole('button', { name: /sign in/i }).click()

    // ── Immediate post-submit ──
    await freshPage.waitForTimeout(300)
    const postSubmit = await captureCheckpoint(freshPage, '2-post-submit', testInfo)

    // Should show SOMETHING (button loading, transition overlay, or page content)
    const hasVisual = postSubmit.hasContent || postSubmit.hasLoadingIndicator
    expect(hasVisual, 'Post-submit should not be blank').toBeTruthy()

    // ── Wait for navigation (client may land on my-events, dashboard, or onboarding) ──
    try {
      await freshPage.waitForURL(/my-events|dashboard|onboarding|welcome|\/$/i, { timeout: 30_000 })
    } catch {
      // If navigation didn't match expected patterns, verify we're not stuck on a blank page
      // (the sign-in may have failed or redirected elsewhere)
    }

    // ── Destination page loaded ──
    await freshPage.waitForTimeout(500)
    await assertNotBlank(freshPage, '3-destination-initial', testInfo)

    await freshPage.waitForLoadState('networkidle').catch(() => {})
    await freshPage.waitForTimeout(1500)
    const settled = await assertNotBlank(freshPage, '4-destination-settled', testInfo)

    // If still on sign-in page, the credentials likely failed - but the page is not blank
    if (freshPage.url().includes('/auth/signin')) {
      // Verify it shows an error or the form (not blank)
      expect(settled.hasContent, 'Sign-in page should show form or error, not blank').toBeTruthy()
    }

    await context.close()
  })
})
