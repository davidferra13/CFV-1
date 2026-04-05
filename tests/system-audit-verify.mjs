/**
 * System Audit Runtime Verification
 * Tests that critical pages actually render and function at runtime.
 * Run: node --experimental-vm-modules tests/system-audit-verify.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'http://localhost:3100'
const SCREENSHOT_DIR = join(process.cwd(), 'qa-screenshots', 'system-audit')
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const creds = JSON.parse(readFileSync('.auth/agent.json', 'utf-8'))

const results = []
function log(test, status, detail = '') {
  results.push({ test, status, detail })
  const icon = status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
  console.log(`  ${icon}  ${test}${detail ? ' - ' + detail : ''}`)
}

async function run() {
  console.log('\n=== ChefFlow System Audit - Runtime Verification ===\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // 1. Sign in via e2e auth endpoint
  console.log('Phase 1: Authentication')
  try {
    const res = await page.request.post(`${BASE}/api/e2e/auth`, {
      data: { email: creds.email, password: creds.password }
    })
    const body = await res.json()
    if (body.ok) {
      log('Agent sign-in', 'PASS')
    } else {
      log('Agent sign-in', 'FAIL', JSON.stringify(body))
    }
  } catch (err) {
    log('Agent sign-in', 'FAIL', err.message)
  }

  // 2. Chef Dashboard
  console.log('\nPhase 2: Chef Portal (Primary User)')
  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const title = await page.title()
    const hasContent = await page.locator('main').count() > 0
    const isBlank = (await page.locator('body').innerText()).trim().length < 50
    if (hasContent && !isBlank) {
      log('Dashboard renders', 'PASS', title)
    } else {
      log('Dashboard renders', 'FAIL', 'Blank or no main element')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: false })
  } catch (err) {
    log('Dashboard renders', 'FAIL', err.message)
    await page.screenshot({ path: join(SCREENSHOT_DIR, '01-dashboard-error.png') }).catch(() => {})
  }

  // 3. Events page
  try {
    await page.goto(`${BASE}/events`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const hasTable = (await page.locator('table, [role="grid"], .event-card, [data-testid]').count()) > 0
    const hasEmptyState = (await page.locator('text=/no events|empty|get started/i').count()) > 0
    if (hasTable || hasEmptyState) {
      log('Events page renders', 'PASS', hasTable ? 'has data' : 'empty state shown')
    } else {
      log('Events page renders', 'FAIL', 'No table or empty state')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '02-events.png'), fullPage: false })
  } catch (err) {
    log('Events page renders', 'FAIL', err.message)
  }

  // 4. Clients page
  try {
    await page.goto(`${BASE}/clients`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    const isBlank = body.trim().length < 50
    if (!isBlank) {
      log('Clients page renders', 'PASS')
    } else {
      log('Clients page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '03-clients.png'), fullPage: false })
  } catch (err) {
    log('Clients page renders', 'FAIL', err.message)
  }

  // 5. Inquiries page
  try {
    await page.goto(`${BASE}/inquiries`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    if (body.trim().length > 50) {
      log('Inquiries page renders', 'PASS')
    } else {
      log('Inquiries page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '04-inquiries.png'), fullPage: false })
  } catch (err) {
    log('Inquiries page renders', 'FAIL', err.message)
  }

  // 6. Recipes page
  try {
    await page.goto(`${BASE}/culinary/recipes`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    if (body.trim().length > 50) {
      log('Recipes page renders', 'PASS')
    } else {
      log('Recipes page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '05-recipes.png'), fullPage: false })
  } catch (err) {
    log('Recipes page renders', 'FAIL', err.message)
  }

  // 7. Financial page
  try {
    await page.goto(`${BASE}/financials`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    if (body.trim().length > 50) {
      log('Financials page renders', 'PASS')
    } else {
      log('Financials page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '06-financials.png'), fullPage: false })
  } catch (err) {
    log('Financials page renders', 'FAIL', err.message)
  }

  // 8. Settings page
  try {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    if (body.trim().length > 50) {
      log('Settings page renders', 'PASS')
    } else {
      log('Settings page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '07-settings.png'), fullPage: false })
  } catch (err) {
    log('Settings page renders', 'FAIL', err.message)
  }

  // 9. Calendar page
  try {
    await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    if (body.trim().length > 50) {
      log('Calendar page renders', 'PASS')
    } else {
      log('Calendar page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '08-calendar.png'), fullPage: false })
  } catch (err) {
    log('Calendar page renders', 'FAIL', err.message)
  }

  // 10. Quotes page
  try {
    await page.goto(`${BASE}/quotes`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    if (body.trim().length > 50) {
      log('Quotes page renders', 'PASS')
    } else {
      log('Quotes page renders', 'FAIL', 'Blank page')
    }
    await page.screenshot({ path: join(SCREENSHOT_DIR, '09-quotes.png'), fullPage: false })
  } catch (err) {
    log('Quotes page renders', 'FAIL', err.message)
  }

  // Phase 3: Public Pages (no auth needed)
  console.log('\nPhase 3: Public Discovery Funnel')
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pubPage = await publicContext.newPage()

  // 11. Homepage
  try {
    await pubPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await pubPage.waitForTimeout(2000)
    const body = await pubPage.locator('body').innerText()
    const hasChefFlow = body.toLowerCase().includes('chefflow') || body.toLowerCase().includes('chef')
    if (body.trim().length > 100 && hasChefFlow) {
      log('Homepage renders', 'PASS')
    } else {
      log('Homepage renders', 'FAIL', `Content length: ${body.trim().length}`)
    }
    await pubPage.screenshot({ path: join(SCREENSHOT_DIR, '10-homepage.png'), fullPage: false })
  } catch (err) {
    log('Homepage renders', 'FAIL', err.message)
  }

  // 12. Chef directory
  try {
    await pubPage.goto(`${BASE}/chefs`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await pubPage.waitForTimeout(2000)
    const body = await pubPage.locator('body').innerText()
    if (body.trim().length > 100) {
      log('Chef directory renders', 'PASS')
    } else {
      log('Chef directory renders', 'FAIL', 'Blank or minimal content')
    }
    await pubPage.screenshot({ path: join(SCREENSHOT_DIR, '11-chef-directory.png'), fullPage: false })
  } catch (err) {
    log('Chef directory renders', 'FAIL', err.message)
  }

  // 13. Public booking form
  try {
    await pubPage.goto(`${BASE}/book`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await pubPage.waitForTimeout(1500)
    const hasForm = (await pubPage.locator('form, input, [type="submit"], button').count()) > 0
    if (hasForm) {
      log('Booking form renders', 'PASS')
    } else {
      log('Booking form renders', 'FAIL', 'No form elements found')
    }
    await pubPage.screenshot({ path: join(SCREENSHOT_DIR, '12-booking-form.png'), fullPage: false })
  } catch (err) {
    log('Booking form renders', 'FAIL', err.message)
  }

  // 14. Sign-in page
  try {
    await pubPage.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await pubPage.waitForTimeout(1500)
    const hasForm = (await pubPage.locator('form, input[type="email"], input[type="password"]').count()) > 0
    if (hasForm) {
      log('Sign-in page renders', 'PASS')
    } else {
      log('Sign-in page renders', 'FAIL', 'No form elements found')
    }
    await pubPage.screenshot({ path: join(SCREENSHOT_DIR, '13-signin.png'), fullPage: false })
  } catch (err) {
    log('Sign-in page renders', 'FAIL', err.message)
  }

  // 15. Food directory
  try {
    await pubPage.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await pubPage.waitForTimeout(1500)
    const body = await pubPage.locator('body').innerText()
    if (body.trim().length > 100) {
      log('Food directory renders', 'PASS')
    } else {
      log('Food directory renders', 'FAIL', 'Blank or minimal content')
    }
    await pubPage.screenshot({ path: join(SCREENSHOT_DIR, '14-discover.png'), fullPage: false })
  } catch (err) {
    log('Food directory renders', 'FAIL', err.message)
  }

  // Phase 4: Navigation Integrity
  console.log('\nPhase 4: Navigation Integrity (sidebar links)')
  const navLinks = [
    '/inbox', '/analytics', '/culinary', '/menus',
    '/staff', '/operations', '/growth'
  ]
  for (const link of navLinks) {
    try {
      const res = await page.goto(`${BASE}${link}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
      const status = res?.status() || 0
      await page.waitForTimeout(1000)
      const body = await page.locator('body').innerText()
      const isBlank = body.trim().length < 50
      if (status < 400 && !isBlank) {
        log(`Nav: ${link}`, 'PASS', `${status}`)
      } else {
        log(`Nav: ${link}`, 'FAIL', `status=${status}, blank=${isBlank}`)
      }
    } catch (err) {
      log(`Nav: ${link}`, 'FAIL', err.message)
    }
  }

  // Phase 5: API Health
  console.log('\nPhase 5: API Health Checks')
  const apiEndpoints = [
    '/api/health',
    '/api/ollama-status',
  ]
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
      log(`API: ${endpoint}`, 'FAIL', err.message)
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
