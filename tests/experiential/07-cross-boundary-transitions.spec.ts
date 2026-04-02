// Experiential Verification: Cross-Boundary Transitions
//
// Tests the moments where the user crosses between route groups.
// These boundaries are where blank screens are most likely because
// Next.js unmounts the old layout before mounting the new one.
//
// The sign-in-to-dashboard gap that prompted this entire suite
// is a cross-boundary transition. This file catches similar gaps
// at every boundary crossing.

import { test, expect } from '@playwright/test'
import {
  captureCheckpoint,
  assertNotBlank,
  loadAgentCredentials,
  dismissOverlays,
} from './helpers/experiential-utils'

test.describe('Cross-Boundary Transitions', () => {
  test.setTimeout(120_000)

  test('public homepage to sign-in page has no blank gap', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    // Start on public homepage
    await page.goto('/', { waitUntil: 'networkidle' })
    await assertNotBlank(page, 'public-homepage', testInfo)

    // Navigate to sign-in (public -> auth boundary)
    await page.goto('/auth/signin', { waitUntil: 'commit' })
    const immediate = await captureCheckpoint(page, 'auth-signin-on-commit', testInfo)

    // Should show at least a Suspense fallback (spinner)
    const hasVisual = immediate.hasContent || immediate.hasLoadingIndicator
    expect(hasVisual, 'Sign-in page should not be blank on initial commit').toBeTruthy()

    await page.waitForLoadState('networkidle')
    await assertNotBlank(page, 'auth-signin-settled', testInfo)

    await context.close()
  })

  test('unauthenticated access to chef dashboard redirects with visual feedback', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    // Try to access chef dashboard without auth
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Should redirect to sign-in or show unauthorized
    await page.waitForURL(/auth\/signin|unauthorized|\/$/i, { timeout: 15_000 })

    await page.waitForTimeout(500)
    await assertNotBlank(page, 'redirect-to-signin', testInfo)

    await context.close()
  })

  test('unauthenticated access to client portal redirects with visual feedback', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    await page.goto('/my-events', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/auth\/signin|unauthorized|\/$/i, { timeout: 15_000 })

    await page.waitForTimeout(500)
    await assertNotBlank(page, 'client-redirect-to-signin', testInfo)

    await context.close()
  })

  test('public pages are accessible and never blank', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    const publicRoutes = ['/', '/about', '/contact', '/privacy', '/terms']

    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(300)
      await assertNotBlank(page, `public-${route.replace(/\//g, '') || 'home'}`, testInfo)
    }

    await context.close()
  })

  test('token-protected pages show content or auth prompt', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    // These use fake tokens so they should show an error state, not blank
    const tokenRoutes = [
      '/proposal/fake-token-12345',
      '/review/fake-token-12345',
      '/feedback/fake-token-12345',
    ]

    for (const route of tokenRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(500)

      // Should show SOMETHING: error, 404, or "invalid token" message
      // Should NEVER show a blank page
      const cp = await captureCheckpoint(page, `token-${route.split('/')[1]}-invalid`, testInfo)

      const hasAnything = cp.hasContent || cp.hasError || cp.hasLoadingIndicator
      expect(
        hasAnything,
        `Token page ${route} should show error/404, not blank. Got: "${cp.visibleText.slice(0, 100)}"`
      ).toBeTruthy()
    }

    await context.close()
  })
})
