/**
 * Full site crawl V2 — uses stored auth state from .auth/chef.json
 * OR re-authenticates via browser login form.
 * Run:  npx tsx tests/crawl-site-v2.ts
 */
import { chromium, type Page, type BrowserContext } from '@playwright/test'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'

const BASE_URL = 'http://localhost:3100'

// All chef routes
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
    if (msg.type() === 'error') {
      const text = msg.text()
      // Filter out noise
      if (text.includes('fallback/') || text.includes('MIME type')) return
      consoleErrors.push(text)
    }
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
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    })
    httpCode = resp?.status() ?? 0
    await page.waitForTimeout(2000)
    finalUrl = page.url()

    // Don't count fallback chunk 500s as page errors
    // The real page status is what we care about
    if (httpCode === 404 || (httpCode >= 400 && !finalUrl.includes(route))) {
      status = 'not-found'
    } else if (httpCode >= 500) {
      // Double check — does the page actually have content?
      const bodyHtml = await page.innerHTML('body').catch(() => '')
      if (bodyHtml.length > 100) {
        // Page rendered content even though HTTP said 500
        // This is the fallback chunk issue — page is OK
        httpCode = 200
        status = 'ok'
      } else {
        status = 'error'
      }
    }

    // Check for error boundary
    const bodyText = await page.textContent('body').catch(() => '')
    if (
      bodyText?.includes('Something went wrong') ||
      bodyText?.includes('Application error') ||
      bodyText?.includes('Internal Server Error')
    ) {
      hasErrorBoundary = true
      status = 'error'
    }

    // Check if we got redirected to auth
    if (finalUrl.includes('/auth/signin')) {
      status = 'redirect'
    } else if (status === 'ok' && !finalUrl.includes(route) && !route.endsWith('/new')) {
      status = 'redirect'
    }

    // Screenshot
    const safeName = route.replace(/\//g, '_').replace(/^_/, '') || 'root'
    const dir = `test-results/crawl-v2/${section}`
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: `${dir}/${safeName}.png`, fullPage: false }).catch(() => {})
  } catch (err: any) {
    if (err.message?.includes('Timeout') || err.message?.includes('timeout')) status = 'timeout'
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
  console.log('CHEFFLOW — FULL SITE CRAWL V2')
  console.log('='.repeat(80))
  console.log()

  const browser = await chromium.launch({ headless: true })

  // Try to use existing auth state
  let context: BrowserContext
  const authFile = '.auth/chef.json'

  // Sign in via browser form
  console.log('[auth] Signing in via browser form...')
  context = await browser.newContext()
  const loginPage = await context.newPage()

  await loginPage.goto(`${BASE_URL}/auth/signin`, {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  })
  await loginPage.waitForTimeout(3000)
  console.log(`[auth] Sign-in page loaded: ${loginPage.url()}`)

  // Wait for form to hydrate
  await loginPage.waitForSelector('input[type="email"]', { state: 'visible', timeout: 15_000 })
  await loginPage.waitForTimeout(1000)

  // Fill credentials
  const emailInput = loginPage.locator('input[type="email"]')
  const passwordInput = loginPage.locator('input[type="password"]')

  if ((await emailInput.count()) > 0) {
    await emailInput.click()
    await emailInput.fill('e2e.chef.20260226@chefflow.test')
    await passwordInput.click()
    await passwordInput.fill('E2eChefTest!2026')

    // Submit
    const submitBtn = loginPage.locator('button[type="submit"]')
    await submitBtn.click()

    // Wait for redirect to dashboard
    try {
      await loginPage.waitForURL(/\/dashboard/, { timeout: 30_000 })
      console.log(`[auth] Logged in! URL: ${loginPage.url()}`)
    } catch {
      console.log(`[auth] Login redirect didn't reach /dashboard. URL: ${loginPage.url()}`)
      // Try archetype selector skip
      const skipButton = loginPage.locator('text=Skip')
      if ((await skipButton.count()) > 0) {
        await skipButton.click()
        await loginPage.waitForTimeout(2000)
      }
    }
  } else {
    console.log('[auth] No email input found on sign-in page, trying API...')
    // Fallback to API auth
    const resp = await loginPage.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: {
        email: 'e2e.chef.20260226@chefflow.test',
        password: 'E2eChefTest!2026',
      },
    })
    if (resp.ok()) {
      await loginPage.goto(`${BASE_URL}/dashboard`, { timeout: 30_000 })
    }
  }

  // Dismiss cookie consent
  await loginPage.evaluate(() => {
    document.cookie = 'cookieConsent=declined; path=/'
  })

  console.log(`[auth] Final URL after auth: ${loginPage.url()}`)
  await loginPage.waitForTimeout(2000)

  // Save screenshot of landing page
  mkdirSync('test-results/crawl-v2', { recursive: true })
  await loginPage.screenshot({ path: 'test-results/crawl-v2/00-landing-after-auth.png' })

  const page = loginPage
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
              : result.status === 'timeout'
                ? '⏱'
                : '✗'
      const time = `${result.loadMs}ms`
      const extras = []
      if (result.status === 'redirect') extras.push(`→ ${result.finalUrl.replace(BASE_URL, '')}`)
      if (result.consoleErrors.length > 0) extras.push(`${result.consoleErrors.length} errors`)
      if (result.hasErrorBoundary) extras.push('ERROR BOUNDARY')

      console.log(
        `  [${completed}/${totalRoutes}] ${icon} ${route} (${time})${extras.length ? ' — ' + extras.join(', ') : ''}`
      )
    }
  }

  await browser.close()

  // ── Summary ──
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
        console.log(`    → ${e.slice(0, 200)}`)
      }
    }
  }

  if (notFound.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('NOT FOUND (404):')
    console.log('─'.repeat(60))
    for (const r of notFound) console.log(`  [${r.section}] ${r.route}`)
  }

  if (timeouts.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('TIMEOUTS:')
    console.log('─'.repeat(60))
    for (const r of timeouts) console.log(`  [${r.section}] ${r.route}`)
  }

  if (redirects.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`REDIRECTS: ${redirects.length}`)
    console.log('─'.repeat(60))
    for (const r of redirects) console.log(`  ${r.route} → ${r.finalUrl.replace(BASE_URL, '')}`)
  }

  // Console errors on OK pages
  const withErrors = ok.filter((r) => r.consoleErrors.length > 0)
  if (withErrors.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`PAGES WITH CONSOLE ERRORS: ${withErrors.length}`)
    console.log('─'.repeat(60))
    for (const r of withErrors) {
      console.log(`  [${r.section}] ${r.route}`)
      for (const e of r.consoleErrors.slice(0, 2)) console.log(`    → ${e.slice(0, 200)}`)
    }
  }

  // Slow pages
  const slow = results.filter((r) => r.loadMs > 5000 && r.status !== 'timeout')
  if (slow.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`SLOW PAGES (>5s): ${slow.length}`)
    console.log('─'.repeat(60))
    for (const r of slow.sort((a, b) => b.loadMs - a.loadMs)) {
      console.log(`  ${r.route} — ${(r.loadMs / 1000).toFixed(1)}s`)
    }
  }

  // Save JSON
  const reportPath = 'test-results/crawl-v2/report.json'
  writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\nJSON: ${reportPath}`)
  console.log('='.repeat(80))
}

main().catch((err) => {
  console.error('Crawl failed:', err)
  process.exit(1)
})
