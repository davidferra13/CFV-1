/**
 * System Audit Runtime Verification (Prod Server)
 * Tests public + authenticated pages against the pre-compiled prod server.
 * Run: node --experimental-vm-modules tests/system-audit-verify-prod.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'http://localhost:3000'
const SCREENSHOT_DIR = join(process.cwd(), 'qa-screenshots', 'system-audit-prod')
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const creds = JSON.parse(readFileSync('.auth/agent.json', 'utf-8'))

const results = []
function log(test, status, detail = '') {
  results.push({ test, status, detail })
  const icon = status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
  console.log(`  ${icon}  ${test}${detail ? ' - ' + detail : ''}`)
}

async function run() {
  console.log('\n=== ChefFlow System Audit - Prod Runtime Verification ===\n')

  const browser = await chromium.launch({ headless: true })

  // Phase 1: Public Pages (no auth needed)
  console.log('Phase 1: Public Discovery Funnel')
  const pubContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pubPage = await pubContext.newPage()

  const publicPages = [
    { name: 'Homepage', path: '/', check: 'content', minLength: 100, screenshot: '01-homepage.png' },
    { name: 'Chef directory', path: '/chefs', check: 'content', minLength: 100, screenshot: '02-chef-directory.png' },
    { name: 'Sign-in page', path: '/auth/signin', check: 'form', screenshot: '03-signin.png' },
    { name: 'Food directory', path: '/discover', check: 'content', minLength: 100, screenshot: '04-discover.png' },
    { name: 'Booking form', path: '/book', check: 'form', screenshot: '05-booking.png' },
  ]

  for (const pg of publicPages) {
    try {
      await pubPage.goto(`${BASE}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await pubPage.waitForTimeout(2000)
      const body = await pubPage.locator('body').innerText()

      if (pg.check === 'form') {
        const hasForm = (await pubPage.locator('form, input, button[type="submit"]').count()) > 0
        if (hasForm) {
          log(pg.name, 'PASS')
        } else {
          log(pg.name, 'FAIL', 'No form elements found')
        }
      } else {
        if (body.trim().length > (pg.minLength || 50)) {
          log(pg.name, 'PASS', `${body.trim().length} chars`)
        } else {
          log(pg.name, 'FAIL', `Only ${body.trim().length} chars`)
        }
      }
      await pubPage.screenshot({ path: join(SCREENSHOT_DIR, pg.screenshot), fullPage: false })
    } catch (err) {
      log(pg.name, 'FAIL', err.message.split('\n')[0])
      await pubPage.screenshot({ path: join(SCREENSHOT_DIR, pg.screenshot.replace('.png', '-error.png')) }).catch(() => {})
    }
  }

  // Phase 2: Authenticated pages via form sign-in
  console.log('\nPhase 2: Chef Portal (Authenticated)')
  const authContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await authContext.newPage()

  // Sign in through the actual form
  try {
    await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1500)

    // Fill email
    const emailInput = page.locator('input[name="email"], input[type="email"]').first()
    await emailInput.fill(creds.email)

    // Fill password
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first()
    await passwordInput.fill(creds.password)

    // Click submit
    const submitBtn = page.locator('button[type="submit"]').first()
    await submitBtn.click()

    await page.waitForTimeout(3000)
    const url = page.url()
    const signedIn = !url.includes('/auth/signin')
    if (signedIn) {
      log('Form sign-in', 'PASS', `Redirected to ${url.replace(BASE, '')}`)
    } else {
      log('Form sign-in', 'FAIL', 'Still on sign-in page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '06-post-signin.png'), fullPage: false })
  } catch (err) {
    log('Form sign-in', 'FAIL', err.message.split('\n')[0])
    await page.screenshot({ path: join(SCREENSHOT_DIR, '06-signin-error.png') }).catch(() => {})
  }

  // Chef portal pages
  const chefPages = [
    { name: 'Dashboard', path: '/dashboard', screenshot: '07-dashboard.png' },
    { name: 'Events', path: '/events', screenshot: '08-events.png' },
    { name: 'Clients', path: '/clients', screenshot: '09-clients.png' },
    { name: 'Inquiries', path: '/inquiries', screenshot: '10-inquiries.png' },
    { name: 'Recipes', path: '/culinary/recipes', screenshot: '11-recipes.png' },
    { name: 'Financials', path: '/financials', screenshot: '12-financials.png' },
    { name: 'Settings', path: '/settings', screenshot: '13-settings.png' },
    { name: 'Calendar', path: '/calendar', screenshot: '14-calendar.png' },
    { name: 'Quotes', path: '/quotes', screenshot: '15-quotes.png' },
    { name: 'Inbox', path: '/inbox', screenshot: '16-inbox.png' },
    { name: 'Analytics', path: '/analytics', screenshot: '17-analytics.png' },
    { name: 'Culinary', path: '/culinary', screenshot: '18-culinary.png' },
    { name: 'Menus', path: '/menus', screenshot: '19-menus.png' },
    { name: 'Staff', path: '/staff', screenshot: '20-staff.png' },
    { name: 'Operations', path: '/operations', screenshot: '21-operations.png' },
    { name: 'Growth', path: '/growth', screenshot: '22-growth.png' },
    { name: 'Prep', path: '/prep', screenshot: '23-prep.png' },
  ]

  for (const pg of chefPages) {
    try {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      // Check if redirected to auth (not signed in)
      if (currentUrl.includes('/auth/signin')) {
        log(pg.name, 'FAIL', 'Redirected to sign-in (not authenticated)')
        continue
      }

      const body = await page.locator('body').innerText()
      const hasMain = await page.locator('main').count() > 0
      const isBlank = body.trim().length < 50
      const status = await page.evaluate(() => {
        // Check for error states
        const h1 = document.querySelector('h1')
        if (h1 && /404|not found|error/i.test(h1.textContent)) return 'error'
        return 'ok'
      })

      if (status === 'error') {
        log(pg.name, 'FAIL', 'Error/404 page')
      } else if (isBlank) {
        log(pg.name, 'FAIL', 'Blank page')
      } else {
        log(pg.name, 'PASS', `${body.trim().length} chars`)
      }
      await page.screenshot({ path: join(SCREENSHOT_DIR, pg.screenshot), fullPage: false })
    } catch (err) {
      log(pg.name, 'FAIL', err.message.split('\n')[0])
      await page.screenshot({ path: join(SCREENSHOT_DIR, pg.screenshot.replace('.png', '-error.png')) }).catch(() => {})
    }
  }

  // Phase 3: API Health
  console.log('\nPhase 3: API Health Checks')
  const apiEndpoints = ['/api/health', '/api/ollama-status']
  for (const endpoint of apiEndpoints) {
    try {
      const res = await page.request.get(`${BASE}${endpoint}`)
      const status = res.status()
      if (status < 400) {
        log(`API: ${endpoint}`, 'PASS', `${status}`)
      } else {
        log(`API: ${endpoint}`, 'FAIL', `${status}`)
      }
    } catch (err) {
      log(`API: ${endpoint}`, 'FAIL', err.message.split('\n')[0])
    }
  }

  // Summary
  await browser.close()

  console.log('\n=== SUMMARY ===\n')
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  console.log(`  Total: ${results.length}  |  Passed: ${passed}  |  Failed: ${failed}`)
  console.log(`  Screenshots: ${SCREENSHOT_DIR}`)

  if (failed > 0) {
    console.log('\n  FAILURES:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    - ${r.test}: ${r.detail}`)
    })
  }

  console.log('')
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
