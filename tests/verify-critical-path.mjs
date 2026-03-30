// Standalone verification: Critical Path + Dinner Circle
// Run: node tests/verify-critical-path.mjs
// Uses dev server (port 3100) with e2e auth API

import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3100'
const EMAIL = 'agent@local.chefflow'
const PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  // Dev server is slow (hot reload compilation), use generous timeouts
  page.setDefaultTimeout(120000)

  // Sign in via e2e API (sets auth cookie on the context)
  console.log('1. Signing in via e2e API...')
  const authResp = await ctx.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: EMAIL, password: PASSWORD },
    timeout: 180000,
  })
  const authResult = await authResp.json()
  console.log('2. Auth:', authResult.ok ? 'OK' : 'FAILED')
  if (!authResult.ok) {
    console.log('FAIL:', JSON.stringify(authResult))
    await browser.close()
    process.exit(1)
  }

  // Navigate to inquiries (dev server compiles on first visit, can be very slow)
  console.log('3. Loading inquiries (dev server may be slow on first compile)...')
  await page.goto(`${BASE}/inquiries`, { timeout: 180000, waitUntil: 'load' })
  // Wait for client hydration
  await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {
    console.log('3b. networkidle timeout (continuing anyway)')
  })
  console.log('4. URL:', page.url())

  if (page.url().includes('signin')) {
    console.log('FAIL: Redirected to signin despite e2e auth')
    await page.screenshot({ path: 'tests/screenshots/auth-fail.png' })
    await browser.close()
    process.exit(1)
  }

  await page.screenshot({ path: 'tests/screenshots/inquiries-list.png', fullPage: true })

  // Find actual inquiry links by looking for UUID patterns in hrefs
  const html = await page.content()
  const uuidPattern = /\/inquiries\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
  const uuids = [...new Set([...html.matchAll(uuidPattern)].map(m => m[1]))]
  console.log('5. Inquiry UUIDs found:', uuids.length)

  if (uuids.length === 0) {
    // Take screenshot to see what the page actually shows
    await page.screenshot({ path: 'tests/screenshots/inquiries-no-uuids.png', fullPage: true })
    // List all links for debugging
    const allLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a')].map(a => a.getAttribute('href')).filter(h => h && h.includes('inquir'))
    )
    console.log('5b. All inquiry-related links:', allLinks)
    console.log('SKIP: No inquiry detail pages found (no UUIDs in links)')
    await browser.close()
    return
  }

  const inquiryId = uuids[0]
  console.log('5b. Navigating to inquiry:', inquiryId)
  await page.goto(`${BASE}/inquiries/${inquiryId}`, { timeout: 180000, waitUntil: 'load' })
  await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {})
  console.log('6. Detail URL:', page.url())
  await page.screenshot({ path: 'tests/screenshots/inquiry-detail.png', fullPage: true })

  const body = await page.textContent('body')

  console.log('')
  console.log('=== CRITICAL PATH ===')
  const hasCriticalPath = body.includes('Critical Path') || body.includes('Ready to cook')
  console.log('Visible:', hasCriticalPath)
  const cpMatch = body.match(/(\d+)\/10 confirmed/)
  if (cpMatch) console.log('Status:', cpMatch[0])
  if (!hasCriticalPath) console.log('NOT FOUND on inquiry detail page')

  const circleLink = page.locator('a[href*="/hub/g/"]')
  const hasCircle = (await circleLink.count()) > 0
  console.log('')
  console.log('=== DINNER CIRCLE ===')
  console.log('Link found:', hasCircle)

  if (hasCircle) {
    const href = await circleLink.first().getAttribute('href')
    console.log('URL:', href)

    // Guest view - new context, no auth
    const gctx = await browser.newContext()
    const gp = await gctx.newPage()
    gp.setDefaultTimeout(120000)
    const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`
    await gp.goto(fullUrl, { timeout: 180000, waitUntil: 'load' })
    await gp.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {})
    await gp.screenshot({ path: 'tests/screenshots/dinner-circle-guest.png', fullPage: true })

    const gt = await gp.textContent('body')
    console.log('')
    console.log('=== GUEST VIEW ===')
    console.log('Dinner Status:', gt.includes('Your Dinner Status'))
    console.log('Has tabs:', gt.includes('Chat') || gt.includes('Meals'))
    const sm = gt.match(/(\d+)\/(\d+) confirmed/)
    if (sm) console.log('Status:', sm[0])
    if (gt.includes('All set')) console.log('All set!')
    if (gt.includes('Still needed')) console.log('Has "Still needed"')
    if (gt.includes('Host name')) console.log('Shows: Host name')
    if (gt.includes('Date')) console.log('Shows: Date')
    if (gt.includes('Dietary')) console.log('Shows: Dietary')
    if (gt.includes('Menu')) console.log('Shows: Menu')
    await gctx.close()
  }

  console.log('')
  console.log('=== COMPOSER ===')
  console.log('Response Draft:', body.includes('Response Draft'))
  console.log('Circle toggle:', body.includes('Include Dinner Circle'))

  await browser.close()
  console.log('')
  console.log('=== DONE ===')
}

run().catch((e) => {
  console.error('FAIL:', e.message)
  process.exit(1)
})
