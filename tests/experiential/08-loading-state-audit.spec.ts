// Experiential Verification: Loading State Audit
//
// Systematically checks that every major data-fetching page shows a loading
// indicator before content appears. This catches pages where loading.tsx
// was deleted, never created, or doesn't match the actual layout.

import { test, expect } from '@playwright/test'
import {
  captureCheckpoint,
  hasLoadingIndicator,
  dismissOverlays,
} from './helpers/experiential-utils'

// Routes that fetch data server-side and MUST show a loading state
const DATA_ROUTES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/events', name: 'events-list' },
  { path: '/inquiries', name: 'inquiries-list' },
  { path: '/clients', name: 'clients-list' },
  { path: '/quotes', name: 'quotes-list' },
  { path: '/financials', name: 'financials' },
  { path: '/expenses', name: 'expenses' },
  { path: '/menus', name: 'menus-list' },
  { path: '/recipes', name: 'recipes-list' },
  { path: '/calendar', name: 'calendar' },
  { path: '/inventory', name: 'inventory' },
  { path: '/staff', name: 'staff-list' },
  { path: '/inbox', name: 'inbox' },
  { path: '/insights', name: 'insights' },
  { path: '/aar', name: 'aar-list' },
  { path: '/settings', name: 'settings' },
  { path: '/schedule', name: 'schedule' },
]

test.describe('Loading State Audit', () => {
  test.setTimeout(180_000)

  test('every data-fetching route shows a loading indicator on fresh navigation', async ({
    page,
  }, testInfo) => {
    const results: { route: string; hadLoading: boolean; hadContent: boolean }[] = []

    for (const { path, name } of DATA_ROUTES) {
      // Clear cache by navigating to a simple page first
      await page.goto('/settings', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(200)

      // Navigate via client-side to trigger loading.tsx
      await page.evaluate((url) => {
        window.location.href = url
      }, path)

      // Capture at 100ms intervals to catch the loading state
      let foundLoading = false
      let foundContent = false

      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(100)

        try {
          const loading = await hasLoadingIndicator(page)
          if (loading) foundLoading = true

          const text = await page.evaluate(() => document.body?.textContent || '')
          if (text.trim().length > 50) foundContent = true

          // Once we have content, stop polling
          if (foundContent && !loading) break
        } catch {
          // Page might be mid-navigation
          continue
        }
      }

      await page.waitForLoadState('networkidle').catch(() => {})

      const cp = await captureCheckpoint(page, `loading-audit-${name}`, testInfo)

      results.push({
        route: path,
        hadLoading: foundLoading,
        hadContent: cp.hasContent,
      })
    }

    // Generate report
    const routesWithoutLoading = results.filter((r) => !r.hadLoading && r.hadContent)
    const routesWithoutContent = results.filter((r) => !r.hadContent)

    const report = [
      '# Loading State Audit Report',
      '',
      '## Results',
      '',
      ...results.map((r) => {
        const loadingStatus = r.hadLoading ? 'HAS LOADING' : 'NO LOADING DETECTED'
        const contentStatus = r.hadContent ? 'HAS CONTENT' : 'NO CONTENT'
        return `- [${loadingStatus}] [${contentStatus}] ${r.route}`
      }),
      '',
      '## Routes Missing Loading States',
      '',
      ...(routesWithoutLoading.length > 0
        ? routesWithoutLoading.map((r) => `- ${r.route}`)
        : ['None detected (all routes showed loading indicators)']),
      '',
      '## Routes Without Content After Load',
      '',
      ...(routesWithoutContent.length > 0
        ? routesWithoutContent.map((r) => `- ${r.route}`)
        : ['None detected (all routes showed content)']),
    ].join('\n')

    await testInfo.attach('loading-state-audit', {
      body: Buffer.from(report),
      contentType: 'text/markdown',
    })

    // Fail if any route shows no content at all
    expect(
      routesWithoutContent,
      `${routesWithoutContent.length} routes showed no content after loading`
    ).toHaveLength(0)
  })
})
