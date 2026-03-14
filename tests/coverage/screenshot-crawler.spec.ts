/**
 * Screenshot Crawler - Visits every page and captures full-page screenshots
 *
 * This is NOT a pass/fail test. It crawls every route in the app,
 * takes a full-page screenshot, and logs JS errors and HTTP status.
 * The output is a visual audit you can review manually.
 *
 * Screenshots are saved to: test-results/screenshots/
 *
 * Run: npx playwright test tests/coverage/screenshot-crawler.spec.ts --project=screenshot-crawler
 */

import { test, expect } from '../helpers/fixtures'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots')

// Ensure screenshot directory exists
test.beforeAll(() => {
  fs.mkdirSync(path.join(SCREENSHOT_DIR, 'chef'), { recursive: true })
  fs.mkdirSync(path.join(SCREENSHOT_DIR, 'client'), { recursive: true })
  fs.mkdirSync(path.join(SCREENSHOT_DIR, 'public'), { recursive: true })
  fs.mkdirSync(path.join(SCREENSHOT_DIR, 'admin'), { recursive: true })
})

// Increase timeout per test since we're screenshotting lots of pages
test.setTimeout(120_000)

function sanitizeFilename(url: string): string {
  return url.replace(/^\//, '').replace(/\//g, '__').replace(/[^a-zA-Z0-9_-]/g, '_') || 'root'
}

interface CrawlResult {
  url: string
  status: number
  jsErrors: string[]
  redirectedTo: string
  screenshotPath: string
  bodyLength: number
}

async function crawlAndScreenshot(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string,
  subdir: string
): Promise<CrawlResult> {
  const jsErrors: string[] = []
  const onPageError = (err: Error) => jsErrors.push(err.message)
  page.on('pageerror', onPageError)

  let status = 0
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    status = response?.status() ?? 0
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    jsErrors.push(`Navigation error: ${msg}`)
  }

  page.off('pageerror', onPageError)

  // Wait a moment for any lazy-loaded content
  await page.waitForTimeout(1000)

  const currentUrl = page.url()
  const bodyText = await page.locator('body').innerText().catch(() => '')
  const filename = sanitizeFilename(url)
  const screenshotPath = path.join(SCREENSHOT_DIR, subdir, `${filename}.png`)

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})

  return {
    url,
    status,
    jsErrors,
    redirectedTo: currentUrl,
    screenshotPath,
    bodyLength: bodyText.length,
  }
}

// Write a summary JSON after all tests in a describe block
const allResults: CrawlResult[] = []

test.afterAll(() => {
  const summaryPath = path.join(SCREENSHOT_DIR, 'crawl-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(allResults, null, 2))

  // Also write a markdown summary
  const lines = [
    '# Screenshot Crawl Summary',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Total pages crawled:** ${allResults.length}`,
    `**JS errors found:** ${allResults.filter((r) => r.jsErrors.length > 0).length}`,
    `**HTTP 500+ errors:** ${allResults.filter((r) => r.status >= 500).length}`,
    `**Blank pages:** ${allResults.filter((r) => r.bodyLength < 10).length}`,
    '',
    '## Pages with JS Errors',
    '',
  ]
  for (const r of allResults.filter((r) => r.jsErrors.length > 0)) {
    lines.push(`### ${r.url}`)
    for (const e of r.jsErrors) lines.push(`- ${e.slice(0, 200)}`)
    lines.push('')
  }
  lines.push('## Pages with HTTP Errors', '')
  for (const r of allResults.filter((r) => r.status >= 400)) {
    lines.push(`- ${r.url} (HTTP ${r.status})`)
  }
  lines.push('', '## All Pages', '')
  lines.push('| URL | Status | JS Errors | Body Length |')
  lines.push('|-----|--------|-----------|-------------|')
  for (const r of allResults) {
    lines.push(`| ${r.url} | ${r.status} | ${r.jsErrors.length} | ${r.bodyLength} |`)
  }

  const mdPath = path.join(SCREENSHOT_DIR, 'crawl-summary.md')
  fs.writeFileSync(mdPath, lines.join('\n'))
})

// ---- CHEF ROUTES (295 pages) ----

const CHEF_ROUTES = [
  // Dashboard & Quick Access
  '/dashboard', '/queue', '/activity', '/briefing',
  // Events
  '/events', '/events/new', '/events/board',
  '/events/upcoming', '/events/awaiting-deposit', '/events/confirmed',
  '/events/completed', '/events/cancelled',
  // Calendar
  '/calendar', '/calendar/day', '/calendar/week', '/calendar/year',
  '/calendar/share', '/schedule', '/waitlist',
  // Clients
  '/clients', '/clients/new',
  '/clients/active', '/clients/inactive', '/clients/vip',
  '/clients/duplicates', '/clients/segments', '/clients/gift-cards',
  '/clients/communication', '/clients/communication/notes',
  '/clients/communication/follow-ups', '/clients/communication/upcoming-touchpoints',
  '/clients/outreach',
  '/clients/history', '/clients/history/event-history',
  '/clients/history/past-menus', '/clients/history/spending-history',
  '/clients/preferences', '/clients/preferences/allergies',
  '/clients/preferences/dietary-restrictions', '/clients/preferences/favorite-dishes',
  '/clients/preferences/dislikes',
  '/clients/insights', '/clients/insights/top-clients',
  '/clients/insights/most-frequent', '/clients/insights/at-risk',
  '/clients/loyalty', '/clients/loyalty/points',
  '/clients/loyalty/rewards', '/clients/loyalty/referrals',
  '/clients/presence', '/client-requests',
  // Guests & Partners
  '/guests', '/guests/reservations',
  '/partners', '/partners/new',
  '/partners/active', '/partners/inactive',
  // Inquiries & Leads
  '/inquiries', '/inquiries/new',
  '/leads', '/leads/new', '/leads/contacted', '/leads/qualified',
  '/leads/converted', '/leads/archived',
  // Quotes
  '/quotes', '/quotes/new',
  '/quotes/draft', '/quotes/sent', '/quotes/viewed',
  '/quotes/accepted', '/quotes/expired', '/quotes/rejected',
  '/rate-card',
  // Calls
  '/calls', '/calls/new',
  // Proposals & Testimonials
  '/proposals', '/proposals/templates', '/proposals/addons',
  '/testimonials', '/guest-leads', '/guest-analytics', '/marketplace',
  // Recipes & Menus
  '/recipes', '/recipes/new', '/recipes/production-log',
  '/recipes/sprint', '/recipes/ingredients',
  '/menus', '/menus/new', '/menus/upload',
  // Culinary
  '/culinary/dish-index', '/culinary/dish-index/insights',
  '/culinary/ingredients', '/culinary/ingredients/seasonal-availability',
  '/culinary/ingredients/vendor-notes',
  '/culinary/components',
  '/culinary/prep', '/culinary/prep/shopping', '/culinary/prep/timeline',
  '/culinary/costing', '/culinary/costing/food-cost',
  '/culinary/costing/menu', '/culinary/costing/recipe',
  '/culinary-board',
  '/culinary/beverages', '/culinary/plating-guides', '/culinary/vendors',
  '/nutrition',
  // Operations
  '/daily', '/stations/daily-ops', '/tasks', '/tasks/templates',
  '/stations', '/inventory', '/inventory/counts', '/inventory/waste',
  '/inventory/food-cost', '/inventory/vendor-invoices',
  '/staff', '/team', '/notifications',
  // Commerce
  '/commerce', '/commerce/register', '/commerce/virtual-terminal',
  '/commerce/table-service', '/commerce/kds',
  '/commerce/products', '/commerce/products/new',
  '/commerce/orders', '/commerce/sales', '/commerce/promotions',
  '/commerce/observability', '/commerce/parity', '/commerce/reconciliation',
  '/commerce/settlements', '/commerce/reports', '/commerce/reports/shifts',
  '/commerce/schedules',
  // Financials
  '/financials', '/finance',
  '/expenses', '/expenses/new',
  '/finance/expenses',
  '/finance/invoices',
  '/finance/payments',
  '/finance/recurring',
  '/finance/ledger',
  '/finance/payouts',
  '/finance/reporting',
  '/finance/tax', '/finance/tax/quarterly', '/finance/year-end',
  '/finance/bank-feed', '/finance/cash-flow', '/finance/forecast',
  '/finance/disputes', '/finance/contractors', '/finance/sales-tax',
  '/finance/planning/break-even', '/finance/pricing-calculator',
  '/finance/revenue-per-hour',
  '/goals', '/goals/setup', '/goals/revenue-path',
  // Inbox & Messaging
  '/inbox', '/chat', '/circles', '/communications',
  // Analytics
  '/analytics', '/analytics/funnel', '/insights', '/intelligence', '/reports',
  // Marketing & Growth
  '/marketing', '/marketing/campaigns', '/marketing/email',
  '/social', '/portfolio', '/photos',
  '/network', '/community',
  '/loyalty', '/loyalty/settings',
  // Documents & Help
  '/documents', '/help', '/feedback',
  // Settings
  '/settings', '/settings/profile', '/settings/team',
  '/settings/modules', '/settings/layout', '/settings/navigation',
  '/settings/preferences', '/settings/notifications',
  '/settings/embed', '/settings/repertoire',
  '/settings/business-identity', '/settings/integrations',
  '/settings/archive', '/settings/api', '/settings/data',
  // Special
  '/onboarding', '/import', '/games', '/training',
  '/travel', '/compliance', '/consulting',
  '/production', '/shopping', '/food-cost',
]

test.describe('Screenshot Crawl - Chef Portal', () => {
  for (const route of CHEF_ROUTES) {
    test(`screenshot: ${route}`, async ({ page }) => {
      const result = await crawlAndScreenshot(page, route, 'chef')
      allResults.push(result)
      // Don't fail on errors - we're just collecting data
      // But log them so they appear in test output
      if (result.jsErrors.length > 0) {
        console.log(`[JS ERRORS] ${route}: ${result.jsErrors.join('; ')}`)
      }
      if (result.status >= 500) {
        console.log(`[HTTP ${result.status}] ${route}`)
      }
    })
  }
})

// ---- CLIENT ROUTES ----

const CLIENT_ROUTES = [
  '/my-events', '/my-events/request',
  '/my-inquiries', '/my-quotes', '/my-chat',
  '/my-profile', '/my-loyalty',
  '/my-meals', '/my-feedback',
  '/my-hub', '/my-rewards', '/my-spending',
  '/book-now', '/discover',
]

test.describe('Screenshot Crawl - Client Portal', () => {
  // Client tests need client auth - skip if no client storage state
  test.use({ storageState: '.auth/client.json' })

  for (const route of CLIENT_ROUTES) {
    test(`screenshot: ${route}`, async ({ page }) => {
      const result = await crawlAndScreenshot(page, route, 'client')
      allResults.push(result)
      if (result.jsErrors.length > 0) {
        console.log(`[JS ERRORS] ${route}: ${result.jsErrors.join('; ')}`)
      }
    })
  }
})

// ---- PUBLIC ROUTES ----

const PUBLIC_ROUTES = [
  '/', '/about', '/pricing', '/contact', '/faq',
  '/privacy', '/terms', '/trust',
  '/chefs', '/blog', '/help',
  '/auth/signin', '/auth/signup', '/auth/client-signup',
  '/auth/partner-signup', '/auth/forgot-password',
  '/beta', '/unsubscribe', '/open-tables',
  '/client/playwright-guaranteed-not-found-token-xyz',
  '/survey/not-a-real-survey-token',
  '/staff-login',
]

test.describe('Screenshot Crawl - Public Pages', () => {
  // No auth needed for public pages
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const route of PUBLIC_ROUTES) {
    test(`screenshot: ${route}`, async ({ page }) => {
      const result = await crawlAndScreenshot(page, route, 'public')
      allResults.push(result)
      if (result.jsErrors.length > 0) {
        console.log(`[JS ERRORS] ${route}: ${result.jsErrors.join('; ')}`)
      }
    })
  }
})

// ---- ADMIN ROUTES ----

const ADMIN_ROUTES = [
  '/admin', '/admin/activity-feed', '/admin/analytics',
  '/admin/audit', '/admin/beta', '/admin/calendar-view',
  '/admin/clients', '/admin/events', '/admin/inquiries', '/admin/quotes',
  '/admin/conversations', '/admin/data-tools', '/admin/emails',
  '/admin/errors', '/admin/feedback', '/admin/financials',
  '/admin/gmail-sync', '/admin/hub', '/admin/loyalty',
  '/admin/notifications', '/admin/onboarding-status',
  '/admin/presence', '/admin/remy-activity',
  '/admin/search', '/admin/sessions', '/admin/sla',
  // Prospecting (admin only)
  '/prospecting', '/prospecting/scrub', '/prospecting/queue',
  '/prospecting/scripts', '/prospecting/pipeline', '/prospecting/clusters',
  // Admin commands
  '/commands', '/remy',
]

test.describe('Screenshot Crawl - Admin Pages', () => {
  for (const route of ADMIN_ROUTES) {
    test(`screenshot: ${route}`, async ({ page }) => {
      const result = await crawlAndScreenshot(page, route, 'admin')
      allResults.push(result)
      if (result.jsErrors.length > 0) {
        console.log(`[JS ERRORS] ${route}: ${result.jsErrors.join('; ')}`)
      }
    })
  }
})
