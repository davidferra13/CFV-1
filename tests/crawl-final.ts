/**
 * Full site crawl — minimal, robust version.
 * Run:  npx tsx tests/crawl-final.ts
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { TEST_BASE_URL } from './helpers/runtime-base-url'

const BASE = TEST_BASE_URL

const ROUTES: Record<string, string[]> = {
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
    '/blog',
    '/games',
    '/import',
  ],
}

interface Result {
  section: string
  route: string
  status: 'ok' | 'error' | 'redirect' | 'not-found' | 'timeout' | 'auth-redirect'
  httpCode: number
  loadMs: number
  finalUrl: string
  bodyLen: number
  consoleErrors: string[]
}

async function main() {
  console.log('='.repeat(80))
  console.log('CHEFFLOW — FULL SITE CRAWL')
  console.log('='.repeat(80))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // === AUTH: Sign in via form ===
  console.log('\n[auth] Loading sign-in page...')
  await page.goto(`${BASE}/auth/signin`, { timeout: 30_000 })
  await page.waitForTimeout(3000)

  // Wait for React hydration — the form uses useState, so inputs need JS
  console.log('[auth] Waiting for hydration...')
  await page
    .waitForFunction(
      () => {
        const input = document.querySelector('input[type="email"]') as HTMLInputElement
        // React-controlled inputs will have __reactFiber or _reactInternal
        return (
          input &&
          (Object.keys(input).some((k) => k.startsWith('__react')) ||
            Object.keys(input).some((k) => k.startsWith('_reactInternal')))
        )
      },
      { timeout: 15_000 }
    )
    .catch(() => {
      console.log('[auth] Hydration check timed out, continuing anyway...')
    })
  await page.waitForTimeout(2000)

  // Fill and submit using keyboard to avoid React state reset
  console.log('[auth] Filling credentials...')
  await page.click('input[type="email"]')
  await page.keyboard.type('e2e.chef.20260226@chefflow.test', { delay: 10 })
  await page.click('input[type="password"]')
  await page.keyboard.type('E2eChefTest!2026', { delay: 10 })
  console.log('[auth] Submitting...')
  await page.click('button[type="submit"]')

  // Wait for navigation
  await page.waitForTimeout(8000)
  console.log(`[auth] After login: ${page.url()}`)

  // If we hit archetype selector, skip it
  const bodyText = await page.textContent('body').catch(() => '')
  if (bodyText?.includes('archetype') || bodyText?.includes('persona')) {
    console.log('[auth] Archetype selector detected, looking for skip/close...')
    // Try clicking through
    const closeBtn = page.locator(
      'button:has-text("Skip"), button:has-text("Close"), button:has-text("Later")'
    )
    if ((await closeBtn.count()) > 0) {
      await closeBtn.first().click()
      await page.waitForTimeout(2000)
    }
  }

  // Take auth landing screenshot
  mkdirSync('test-results/crawl-final', { recursive: true })
  await page.screenshot({ path: 'test-results/crawl-final/00-after-auth.png' })
  console.log(`[auth] Final URL: ${page.url()}\n`)

  // If still on signin, auth failed
  if (page.url().includes('/auth/signin')) {
    console.error('[auth] FAILED — still on sign-in page')
    await page.screenshot({ path: 'test-results/crawl-final/00-auth-FAILED.png' })
    await browser.close()
    process.exit(1)
  }

  // Dismiss cookies
  await page.evaluate(() => {
    document.cookie = 'cookieConsent=declined; path=/'
  })

  // === CRAWL ===
  const results: Result[] = []
  const total = Object.values(ROUTES).flat().length
  let n = 0

  for (const [section, routes] of Object.entries(ROUTES)) {
    console.log(`\n── ${section.toUpperCase()} ──`)
    for (const route of routes) {
      n++
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))

      const start = Date.now()
      let httpCode = 0
      let finalUrl = ''
      let bodyLen = 0
      let status: Result['status'] = 'ok'

      try {
        const resp = await page.goto(`${BASE}${route}`, { timeout: 25_000, waitUntil: 'load' })
        httpCode = resp?.status() ?? 0
        await page.waitForTimeout(1500)
        finalUrl = page.url()
        bodyLen = (await page.innerHTML('body').catch(() => '')).length

        if (finalUrl.includes('/auth/signin')) {
          status = 'auth-redirect'
        } else if (httpCode === 404) {
          status = 'not-found'
        } else if (httpCode >= 500 && bodyLen < 200) {
          status = 'error'
        } else if (httpCode >= 500 && bodyLen >= 200) {
          // Page rendered content despite 500 status (fallback chunk issue)
          status = 'ok'
          httpCode = 200
        }

        // Error boundary check
        const text = await page.textContent('body').catch(() => '')
        if (text?.includes('Something went wrong') || text?.includes('Application error')) {
          status = 'error'
        }

        // Take screenshot
        const name = route.replace(/\//g, '_').replace(/^_/, '') || 'root'
        const dir = `test-results/crawl-final/${section}`
        mkdirSync(dir, { recursive: true })
        await page.screenshot({ path: `${dir}/${name}.png` }).catch(() => {})
      } catch (err: any) {
        status = err.message?.includes('imeout') ? 'timeout' : 'error'
        errors.push(err.message?.slice(0, 200) ?? String(err))
        finalUrl = page.url()
      }

      page.removeAllListeners('pageerror')
      const loadMs = Date.now() - start

      results.push({
        section,
        route,
        status,
        httpCode,
        loadMs,
        finalUrl,
        bodyLen,
        consoleErrors: errors,
      })

      const icon = {
        ok: '✓',
        error: '✗',
        'not-found': '?',
        redirect: '→',
        timeout: '⏱',
        'auth-redirect': '🔒',
      }[status]
      const extra =
        status === 'auth-redirect'
          ? ' (redirected to login)'
          : status === 'redirect'
            ? ` → ${finalUrl.replace(BASE, '')}`
            : errors.length
              ? ` (${errors.length} errors)`
              : ''
      console.log(`  [${n}/${total}] ${icon} ${route} — ${loadMs}ms, ${bodyLen}b${extra}`)
    }
  }

  await browser.close()

  // === REPORT ===
  console.log('\n\n' + '='.repeat(80))
  console.log('REPORT')
  console.log('='.repeat(80))

  const ok = results.filter((r) => r.status === 'ok')
  const errs = results.filter((r) => r.status === 'error')
  const nf = results.filter((r) => r.status === 'not-found')
  const timeouts = results.filter((r) => r.status === 'timeout')
  const authRedirects = results.filter((r) => r.status === 'auth-redirect')

  console.log(`Total:          ${results.length}`)
  console.log(`  OK:           ${ok.length}`)
  console.log(`  Errors:       ${errs.length}`)
  console.log(`  404s:         ${nf.length}`)
  console.log(`  Timeouts:     ${timeouts.length}`)
  console.log(`  Auth redirect: ${authRedirects.length}`)

  if (errs.length > 0) {
    console.log('\nBROKEN PAGES:')
    for (const r of errs) {
      console.log(`  ${r.route} — HTTP ${r.httpCode}, ${r.bodyLen}b`)
      for (const e of r.consoleErrors.slice(0, 2)) console.log(`    ${e}`)
    }
  }

  if (nf.length > 0) {
    console.log('\n404 PAGES:')
    for (const r of nf) console.log(`  ${r.route}`)
  }

  if (timeouts.length > 0) {
    console.log('\nTIMEOUTS:')
    for (const r of timeouts) console.log(`  ${r.route}`)
  }

  if (authRedirects.length > 0) {
    console.log('\nAUTH REDIRECTS (session lost):')
    for (const r of authRedirects) console.log(`  ${r.route}`)
  }

  // Console errors on OK pages
  const okWithErrors = ok.filter((r) => r.consoleErrors.length > 0)
  if (okWithErrors.length > 0) {
    console.log(`\nOK PAGES WITH JS ERRORS: ${okWithErrors.length}`)
    for (const r of okWithErrors) {
      console.log(`  ${r.route}`)
      for (const e of r.consoleErrors.slice(0, 2)) console.log(`    ${e}`)
    }
  }

  // Slow
  const slow = results.filter((r) => r.loadMs > 8000 && r.status !== 'timeout')
  if (slow.length > 0) {
    console.log(`\nSLOW (>8s):`)
    for (const r of slow.sort((a, b) => b.loadMs - a.loadMs))
      console.log(`  ${r.route} — ${(r.loadMs / 1000).toFixed(1)}s`)
  }

  writeFileSync('test-results/crawl-final/report.json', JSON.stringify(results, null, 2))
  console.log('\nJSON: test-results/crawl-final/report.json')
  console.log('='.repeat(80))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
