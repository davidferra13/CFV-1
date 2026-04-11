// Full Site Crawl — visits every chef-accessible route, captures screenshots + console errors
// Run: npx playwright test tests/e2e/99-full-site-crawl.spec.ts -p chef --timeout 300000

import { test, expect } from '@playwright/test'

// All chef-accessible routes organized by section
const ROUTES = {
  // ── DASHBOARD ──
  dashboard: ['/dashboard'],

  // ── EVENTS ──
  events: ['/events', '/events/new', '/events/past', '/events/templates'],

  // ── CLIENTS ──
  clients: ['/clients', '/clients/new', '/clients/tags', '/clients/segments', '/clients/import'],

  // ── INQUIRY PIPELINE ──
  pipeline: [
    '/inquiries',
    '/inquiries/new',
    '/quotes',
    '/quotes/new',
    '/leads',
    '/leads/new',
    '/calls',
    '/calls/new',
    '/partners',
    '/partners/new',
    '/prospecting',
    '/guest-leads',
    '/proposals',
    '/proposals/new',
    '/testimonials',
  ],

  // ── FINANCIALS ──
  financials: [
    '/financials',
    '/expenses',
    '/expenses/new',
    '/invoices',
    '/invoices/new',
    '/payments',
    '/payments/new',
    '/ledger',
    '/payouts',
    '/payouts/new',
    '/reporting',
    '/tax-center',
    '/payroll',
    '/financial-goals',
    '/pricing',
    '/pricing/packages',
    '/revenue-forecast',
  ],

  // ── CULINARY ──
  culinary: [
    '/menus',
    '/menus/new',
    '/recipes',
    '/recipes/new',
    '/recipes/sprint',
    '/ingredients',
    '/ingredients/new',
    '/components',
    '/components/new',
    '/costing',
    '/prep',
    '/vendors',
    '/vendors/new',
    '/vendors/compare',
    '/inventory',
    '/inventory/new',
    '/culinary-board',
    '/seasonal-palettes',
  ],

  // ── CALENDAR & SCHEDULE ──
  calendar: [
    '/calendar',
    '/calendar/month',
    '/calendar/week',
    '/calendar/day',
    '/calendar/agenda',
    '/calendar/timeline',
    '/calendar/availability',
    '/schedule',
  ],

  // ── INBOX & MESSAGING ──
  inbox: ['/inbox', '/inbox/compose'],

  // ── STAFF ──
  staff: ['/staff', '/staff/new', '/tasks', '/tasks/new', '/stations', '/notifications'],

  // ── ANALYTICS ──
  analytics: [
    '/analytics',
    '/analytics/revenue',
    '/analytics/clients',
    '/analytics/events',
    '/analytics/culinary',
    '/analytics/marketing',
    '/analytics/staff',
    '/analytics/growth',
  ],

  // ── DAILY OPS ──
  dailyOps: ['/daily', '/queue', '/activity'],

  // ── TRAVEL & OPS ──
  travel: ['/travel', '/travel/new', '/temp-log'],

  // ── REVIEWS & AAR ──
  reviews: ['/reviews', '/aar'],

  // ── SETTINGS ──
  settings: [
    '/settings',
    '/settings/profile',
    '/settings/business',
    '/settings/branding',
    '/settings/billing',
    '/settings/modules',
    '/settings/notifications',
    '/settings/integrations',
    '/settings/team',
    '/settings/security',
    '/settings/data',
    '/settings/email',
    '/settings/dashboard',
    '/settings/calendar',
    '/settings/embed',
    '/settings/templates',
    '/settings/documents',
    '/settings/tax',
    '/settings/payment',
    '/settings/automation',
    '/settings/custom-fields',
  ],

  // ── MARKETING & SOCIAL ──
  marketing: [
    '/marketing',
    '/marketing/campaigns',
    '/marketing/campaigns/new',
    '/marketing/social',
    '/marketing/social/calendar',
    '/marketing/social/templates',
    '/marketing/waitlist',
    '/marketing/surveys',
    '/marketing/seo',
    '/marketing/wix',
    '/marketing/referrals',
  ],

  // ── NETWORK & COMMUNITY ──
  network: [
    '/network',
    '/network/discover',
    '/network/collabs',
    '/network/feed',
    '/network/events',
    '/network/messages',
  ],

  // ── OTHER ──
  other: [
    '/loyalty',
    '/safety',
    '/safety/incidents',
    '/safety/training',
    '/help',
    '/help/faq',
    '/help/guides',
    '/onboarding',
    '/cannabis',
    '/import',
  ],
}

// Flatten all routes
const ALL_ROUTES = Object.entries(ROUTES).flatMap(([section, routes]) =>
  routes.map((route) => ({ section, route }))
)

test.describe('Full Site Crawl', () => {
  // Increase timeout for the whole suite
  test.setTimeout(300_000)

  const errors: Array<{ route: string; section: string; type: string; message: string }> = []
  const results: Array<{
    route: string
    section: string
    status: 'ok' | 'error' | 'redirect' | 'not-found'
    loadTimeMs: number
    consoleErrors: string[]
    screenshotPath?: string
  }> = []

  for (const { section, route } of ALL_ROUTES) {
    test(`[${section}] ${route}`, async ({ page }) => {
      const consoleErrors: string[] = []

      // Capture console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Capture uncaught exceptions
      page.on('pageerror', (err) => {
        consoleErrors.push(`UNCAUGHT: ${err.message}`)
      })

      const start = Date.now()
      let status: 'ok' | 'error' | 'redirect' | 'not-found' = 'ok'

      try {
        const response = await page.goto(route, {
          timeout: 30_000,
          waitUntil: 'domcontentloaded',
        })

        // Wait a bit for hydration
        await page.waitForTimeout(1500)

        const httpStatus = response?.status() ?? 0
        const finalUrl = page.url()

        if (httpStatus === 404) {
          status = 'not-found'
        } else if (httpStatus >= 500) {
          status = 'error'
        } else if (!finalUrl.includes(route) && !route.includes('/new')) {
          status = 'redirect'
        }

        // Check for Next.js error overlay
        const hasErrorOverlay = await page
          .locator('#__next-build-error, [data-nextjs-dialog]')
          .count()
        if (hasErrorOverlay > 0) {
          status = 'error'
          consoleErrors.push('Next.js error overlay detected')
        }

        // Check for "Something went wrong" or error boundaries
        const bodyText = await page.textContent('body').catch(() => '')
        if (bodyText?.includes('Something went wrong') || bodyText?.includes('Application error')) {
          status = 'error'
          consoleErrors.push('Error boundary detected on page')
        }

        // Take screenshot
        const screenshotName = route.replace(/\//g, '_').replace(/^_/, '') || 'root'
        const screenshotPath = `test-results/crawl-screenshots/${section}/${screenshotName}.png`
        await page.screenshot({ path: screenshotPath, fullPage: false })

        const loadTimeMs = Date.now() - start

        results.push({
          route,
          section,
          status,
          loadTimeMs,
          consoleErrors: [...consoleErrors],
          screenshotPath,
        })

        // Filter out known harmless console errors
        const realErrors = consoleErrors.filter(
          (e) =>
            !e.includes('favicon') &&
            !e.includes('Download the React DevTools') &&
            !e.includes('hydration') &&
            !e.includes('[Fast Refresh]') &&
            !e.includes('Warning:') &&
            !e.includes('database') &&
            !e.includes('net::ERR_') &&
            !e.includes('ChunkLoadError') &&
            !e.includes('was deprecated')
        )

        if (status === 'error') {
          errors.push({
            route,
            section,
            type: 'page-error',
            message: `HTTP ${httpStatus} or error boundary`,
          })
        }
        if (realErrors.length > 0) {
          errors.push({
            route,
            section,
            type: 'console-errors',
            message: realErrors.join(' | '),
          })
        }

        // Soft assertion — don't fail for redirects (expected for some routes)
        if (status !== 'not-found') {
          expect(httpStatus).toBeLessThan(500)
        }
      } catch (err) {
        const loadTimeMs = Date.now() - start
        results.push({
          route,
          section,
          status: 'error',
          loadTimeMs,
          consoleErrors: [String(err)],
        })
        errors.push({
          route,
          section,
          type: 'navigation-error',
          message: String(err).slice(0, 200),
        })
      }
    })
  }

  test.afterAll(async () => {
    // Print summary report
    console.log('\n\n' + '='.repeat(80))
    console.log('FULL SITE CRAWL — REPORT')
    console.log('='.repeat(80))

    const okCount = results.filter((r) => r.status === 'ok').length
    const errorCount = results.filter((r) => r.status === 'error').length
    const notFoundCount = results.filter((r) => r.status === 'not-found').length
    const redirectCount = results.filter((r) => r.status === 'redirect').length

    console.log(`\nTotal routes tested: ${results.length}`)
    console.log(`  OK:        ${okCount}`)
    console.log(`  Errors:    ${errorCount}`)
    console.log(`  Not Found: ${notFoundCount}`)
    console.log(`  Redirect:  ${redirectCount}`)

    if (errors.length > 0) {
      console.log(`\n${'─'.repeat(80)}`)
      console.log('ISSUES FOUND:')
      console.log('─'.repeat(80))
      for (const e of errors) {
        console.log(`  [${e.section}] ${e.route} — ${e.type}: ${e.message}`)
      }
    }

    // Slow pages (> 5 seconds)
    const slowPages = results.filter((r) => r.loadTimeMs > 5000)
    if (slowPages.length > 0) {
      console.log(`\n${'─'.repeat(80)}`)
      console.log('SLOW PAGES (>5s):')
      console.log('─'.repeat(80))
      for (const p of slowPages) {
        console.log(`  ${p.route} — ${(p.loadTimeMs / 1000).toFixed(1)}s`)
      }
    }

    console.log('\n' + '='.repeat(80))
  })
})
