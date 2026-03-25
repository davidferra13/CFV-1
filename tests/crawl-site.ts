/**
 * Full site crawl — standalone Playwright script (not a test file).
 * Run:  npx tsx tests/crawl-site.ts
 *
 * Signs in via /api/e2e/auth, then visits every chef-accessible route.
 * Captures screenshots and logs errors.
 */
import { chromium, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'

const BASE_URL = 'http://localhost:3100'

// All chef routes, organized by section
const SECTIONS: Record<string, string[]> = {
  dashboard: ['/dashboard'],
  events: ['/events', '/events/new', '/events/past', '/events/templates'],
  clients: ['/clients', '/clients/new', '/clients/tags', '/clients/segments', '/clients/import'],
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
  inbox: ['/inbox', '/inbox/compose'],
  staff: ['/staff', '/staff/new', '/tasks', '/tasks/new', '/stations', '/notifications'],
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
  dailyOps: ['/daily', '/queue', '/activity'],
  travel: ['/travel', '/travel/new', '/temp-log'],
  reviews: ['/reviews', '/aar'],
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
    '/settings/api-keys',
    '/settings/templates',
    '/settings/documents',
    '/settings/tax',
    '/settings/payment',
    '/settings/automation',
    '/settings/custom-fields',
  ],
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
  network: [
    '/network',
    '/network/discover',
    '/network/collabs',
    '/network/feed',
    '/network/events',
    '/network/messages',
  ],
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

interface Result {
  section: string
  route: string
  status: 'ok' | 'error' | 'redirect' | 'not-found' | 'timeout'
  httpCode: number
  loadMs: number
  finalUrl: string
  consoleErrors: string[]
  hasErrorBoundary: boolean
}

async function visitRoute(page: Page, section: string, route: string): Promise<Result> {
  const consoleErrors: string[] = []

  const onConsole = (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  }
  const onError = (err: any) => {
    consoleErrors.push(`UNCAUGHT: ${err.message}`)
  }

  page.on('console', onConsole)
  page.on('pageerror', onError)

  const start = Date.now()
  let httpCode = 0
  let finalUrl = ''
  let hasErrorBoundary = false
  let status: Result['status'] = 'ok'

  try {
    const resp = await page.goto(`${BASE_URL}${route}`, {
      timeout: 20_000,
      waitUntil: 'domcontentloaded',
    })
    httpCode = resp?.status() ?? 0
    await page.waitForTimeout(1000)
    finalUrl = page.url()

    // Check for error states
    if (httpCode === 404) status = 'not-found'
    else if (httpCode >= 500) status = 'error'

    // Check for Next.js error overlay or error boundary
    const bodyText = await page.textContent('body').catch(() => '')
    if (
      bodyText?.includes('Something went wrong') ||
      bodyText?.includes('Application error') ||
      bodyText?.includes('Internal Server Error')
    ) {
      hasErrorBoundary = true
      status = 'error'
    }

    const errorOverlay = await page.locator('#__next-build-error, [data-nextjs-dialog]').count()
    if (errorOverlay > 0) {
      hasErrorBoundary = true
      status = 'error'
    }

    // Determine redirect
    if (status === 'ok' && !finalUrl.includes(route)) {
      status = 'redirect'
    }

    // Screenshot
    const safeName = route.replace(/\//g, '_').replace(/^_/, '') || 'root'
    const dir = `test-results/crawl/${section}`
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: `${dir}/${safeName}.png`, fullPage: false }).catch(() => {})
  } catch (err: any) {
    if (err.message?.includes('Timeout')) status = 'timeout'
    else status = 'error'
    consoleErrors.push(String(err).slice(0, 300))
    finalUrl = page.url()
  }

  page.removeListener('console', onConsole)
  page.removeListener('pageerror', onError)

  return {
    section,
    route,
    status,
    httpCode,
    loadMs: Date.now() - start,
    finalUrl,
    consoleErrors: [...consoleErrors],
    hasErrorBoundary,
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('CHEFFLOW — FULL SITE CRAWL')
  console.log('='.repeat(80))
  console.log()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Sign in via e2e auth endpoint
  console.log('[auth] Signing in via /api/e2e/auth...')
  const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: {
      email: 'e2e.chef.20260226@chefflow.test',
      password: 'E2eChefTest!2026',
    },
  })

  if (!resp.ok()) {
    // Try the seed data to find correct credentials
    console.log('[auth] E2E seed user failed, trying agent account...')
    const resp2 = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: {
        email: 'agent@chefflow.test',
        password: 'AgentChefFlow!2026',
      },
    })
    if (!resp2.ok()) {
      console.error('[auth] Both logins failed. Reading seed-ids.json...')
      process.exit(1)
    }
  }

  // Navigate to dashboard to establish session
  console.log('[auth] Navigating to dashboard to establish session...')
  await page.goto(`${BASE_URL}/dashboard`, { timeout: 30_000, waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  console.log(`[auth] Landed on: ${page.url()}`)

  // Dismiss cookie consent if present
  await page.evaluate(() => {
    document.cookie = 'cookieConsent=declined; path=/'
  })

  const results: Result[] = []
  const allEntries = Object.entries(SECTIONS)
  const totalRoutes = allEntries.reduce((sum, [, routes]) => sum + routes.length, 0)
  let completed = 0

  for (const [section, routes] of allEntries) {
    console.log(`\n── ${section.toUpperCase()} (${routes.length} routes) ──`)
    for (const route of routes) {
      completed++
      const result = await visitRoute(page, section, route)
      results.push(result)

      const icon =
        result.status === 'ok'
          ? '✓'
          : result.status === 'redirect'
            ? '→'
            : result.status === 'not-found'
              ? '?'
              : '✗'
      const time = `${result.loadMs}ms`
      const extras = []
      if (result.status === 'redirect') extras.push(`→ ${result.finalUrl.replace(BASE_URL, '')}`)
      if (result.consoleErrors.length > 0)
        extras.push(`${result.consoleErrors.length} console errors`)
      if (result.hasErrorBoundary) extras.push('ERROR BOUNDARY')

      console.log(
        `  [${completed}/${totalRoutes}] ${icon} ${route} (${time})${extras.length ? ' — ' + extras.join(', ') : ''}`
      )
    }
  }

  await browser.close()

  // ── Summary report ──
  console.log('\n\n' + '='.repeat(80))
  console.log('CRAWL REPORT')
  console.log('='.repeat(80))

  const ok = results.filter((r) => r.status === 'ok')
  const errors = results.filter((r) => r.status === 'error')
  const notFound = results.filter((r) => r.status === 'not-found')
  const redirects = results.filter((r) => r.status === 'redirect')
  const timeouts = results.filter((r) => r.status === 'timeout')

  console.log(`\nTotal:      ${results.length}`)
  console.log(`  OK:       ${ok.length}`)
  console.log(`  Redirect: ${redirects.length}`)
  console.log(`  Errors:   ${errors.length}`)
  console.log(`  404s:     ${notFound.length}`)
  console.log(`  Timeouts: ${timeouts.length}`)

  if (errors.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('ERRORS (broken pages):')
    console.log('─'.repeat(60))
    for (const r of errors) {
      console.log(`  [${r.section}] ${r.route} — HTTP ${r.httpCode}`)
      if (r.hasErrorBoundary) console.log(`    → Error boundary / "Something went wrong"`)
      for (const e of r.consoleErrors.slice(0, 3)) {
        console.log(`    → ${e.slice(0, 150)}`)
      }
    }
  }

  if (notFound.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('NOT FOUND (404):')
    console.log('─'.repeat(60))
    for (const r of notFound) {
      console.log(`  [${r.section}] ${r.route}`)
    }
  }

  if (timeouts.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('TIMEOUTS:')
    console.log('─'.repeat(60))
    for (const r of timeouts) {
      console.log(`  [${r.section}] ${r.route}`)
    }
  }

  // Pages with console errors (non-error pages)
  const withConsoleErrors = results.filter(
    (r) =>
      r.status !== 'error' &&
      r.consoleErrors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('React DevTools') &&
          !e.includes('hydration') &&
          !e.includes('[Fast Refresh]') &&
          !e.includes('Warning:') &&
          !e.includes('net::ERR_') &&
          !e.includes('ChunkLoadError') &&
          !e.includes('deprecated')
      ).length > 0
  )
  if (withConsoleErrors.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`CONSOLE ERRORS (${withConsoleErrors.length} pages):`)
    console.log('─'.repeat(60))
    for (const r of withConsoleErrors) {
      const filtered = r.consoleErrors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('React DevTools') &&
          !e.includes('hydration') &&
          !e.includes('[Fast Refresh]') &&
          !e.includes('Warning:') &&
          !e.includes('net::ERR_') &&
          !e.includes('ChunkLoadError') &&
          !e.includes('deprecated')
      )
      console.log(`  [${r.section}] ${r.route}`)
      for (const e of filtered.slice(0, 2)) {
        console.log(`    → ${e.slice(0, 150)}`)
      }
    }
  }

  // Slow pages (>5s)
  const slow = results.filter((r) => r.loadMs > 5000)
  if (slow.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`SLOW PAGES (>${5}s): ${slow.length}`)
    console.log('─'.repeat(60))
    for (const r of slow.sort((a, b) => b.loadMs - a.loadMs)) {
      console.log(`  ${r.route} — ${(r.loadMs / 1000).toFixed(1)}s`)
    }
  }

  // Redirects summary
  if (redirects.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`REDIRECTS: ${redirects.length}`)
    console.log('─'.repeat(60))
    for (const r of redirects) {
      console.log(`  ${r.route} → ${r.finalUrl.replace(BASE_URL, '')}`)
    }
  }

  // Save JSON report
  const reportPath = 'test-results/crawl/report.json'
  mkdirSync('test-results/crawl', { recursive: true })
  writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\nFull JSON report: ${reportPath}`)
  console.log('Screenshots:      test-results/crawl/<section>/<route>.png')
  console.log('='.repeat(80))
}

main().catch((err) => {
  console.error('Crawl failed:', err)
  process.exit(1)
})
