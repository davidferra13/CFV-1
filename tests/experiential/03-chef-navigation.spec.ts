// Experiential Verification: Chef Portal Navigation
//
// Navigates to every major section of the chef portal and verifies
// that each page shows content or a loading state - never a blank screen.
// This catches broken routes, missing loading.tsx files, and hydration gaps.

import { test, expect } from '@playwright/test'
import { navigateAndVerify, assertNotBlank, dismissOverlays } from './helpers/experiential-utils'

// Every major chef portal route, grouped by nav section
const CHEF_ROUTES = {
  // Core
  dashboard: '/dashboard',
  events: '/events',
  inquiries: '/inquiries',
  clients: '/clients',
  quotes: '/quotes',
  calendar: '/calendar',

  // Financial
  financials: '/financials',
  expenses: '/expenses',

  // Culinary
  menus: '/menus',
  recipes: '/recipes',

  // Operations
  schedule: '/schedule',
  inventory: '/inventory',
  staff: '/staff',

  // Communication
  inbox: '/inbox',

  // Settings
  settings: '/settings',
  settingsProfile: '/settings/profile',
  settingsModules: '/settings/modules',
  settingsNotifications: '/settings/notifications',

  // Analytics
  insights: '/insights',

  // AAR
  aar: '/aar',
}

test.describe('Chef Portal Navigation', () => {
  test.setTimeout(180_000)

  test('every major route shows content or loading state, never blank', async ({
    page,
  }, testInfo) => {
    const results: { route: string; status: string; url: string }[] = []

    // Start at dashboard to establish session
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await dismissOverlays(page)

    for (const [name, route] of Object.entries(CHEF_ROUTES)) {
      try {
        const { settled } = await navigateAndVerify(page, route, `chef-nav-${name}`, testInfo)
        await dismissOverlays(page)

        results.push({
          route,
          status: settled.hasError ? 'ERROR' : 'OK',
          url: settled.url,
        })
      } catch (err) {
        results.push({
          route,
          status: `FAIL: ${(err as Error).message.slice(0, 100)}`,
          url: page.url(),
        })
      }
    }

    // Generate summary report
    const failures = results.filter((r) => r.status.startsWith('FAIL'))
    const errors = results.filter((r) => r.status === 'ERROR')

    // Attach summary as test artifact
    const summary = [
      '# Chef Navigation Experiential Report',
      '',
      `Total routes tested: ${results.length}`,
      `Passed: ${results.filter((r) => r.status === 'OK').length}`,
      `Errors (page rendered but shows error): ${errors.length}`,
      `Failures (blank screen or crash): ${failures.length}`,
      '',
      '## Results',
      '',
      ...results.map((r) => `- [${r.status}] ${r.route} -> ${r.url}`),
    ].join('\n')

    await testInfo.attach('navigation-report', {
      body: Buffer.from(summary),
      contentType: 'text/markdown',
    })

    // Hard fail if any route showed a blank screen
    expect(failures, `${failures.length} routes showed blank screens`).toHaveLength(0)
  })
})
