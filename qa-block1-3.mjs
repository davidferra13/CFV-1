import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'

mkdirSync('screenshots/qa-pass', { recursive: true })

const DEV = 'http://localhost:3100'
const TOKEN = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiV1pDbVlxSXBtakxXT2QzajFfUXJveTNKajVEWDhjVHFiVzZXejUwZm8xQnV3ZmxWeC1hZGV0MHU5WTZNRFR3NDBTbDJCV1VLMkk2ZmFBR3FNS2xPWVEifQ..SBQGG9u1ZbM9nOerk6eqTA.rmn0KvQ9EupmteEaQ4LGHwcolf6hzYaJQwIGcNesZ3PWdHRK_2dLwES0WbDmb5-mf_b3FV1zMnbjva6wOUeqYDLfluMW5ldAc5QTeKh9f094KVK5w-jXQc29HlE3-ykJcIj0YA-LtSHj5Nm98Xo4l4iX4Snp_bL2LlOENU9cNBQkpZHq5uDz-p5Q8FrWb47z07oLL4_JY_Iyg1fL_FojlvFEg16e6__L2Jx8bSF5n0Dc6We-Eu1qejhTtCW9P7ZxfqIWQuLNs_2FtwFh75WMVU_rcDqw9pHnFthuu6EXlYkr7l9WhzthuoaeBNrDIMOyfLUYq3wlxdYW8DHbv1I7jtb9fq0Ca4GpsoVm_JnazYEbSjUdTxtX9y5RKKkWCy6T.iUVVGeWk0A1p8ldwFJRyFqdSnQY9g_iNX1jY28trPfo'

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })

await context.addCookies([{
  name: 'authjs.session-token',
  value: TOKEN,
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  sameSite: 'Lax'
}])

const page = await context.newPage()
const consoleErrors = []
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({text: msg.text(), url: page.url()}) })

async function go(url, filename, waitExtra = 3000) {
  console.log(`\n=== ${url} ===`)
  const start = Date.now()
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 30000 })
    await page.waitForTimeout(waitExtra)
    const elapsed = Date.now() - start
    const finalUrl = page.url()
    const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
    console.log(`URL: ${finalUrl} (${(elapsed/1000).toFixed(1)}s)`)
    console.log(`TEXT: ${text.substring(0, 400)}`)
    await page.screenshot({ path: `screenshots/qa-pass/${filename}`, fullPage: false, timeout: 10000 })
    console.log(`SCREENSHOT: ${filename}`)
    return { url: finalUrl, text, ok: true }
  } catch(e) {
    console.log(`ERROR: ${e.message.substring(0, 120)}`)
    try { await page.screenshot({ path: `screenshots/qa-pass/${filename}`, timeout: 5000 }) } catch {}
    return { ok: false, error: e.message }
  }
}

// ============ BLOCK 1: DASHBOARD & NAV ============
console.log('\n\n========== BLOCK 1: DASHBOARD & NAV ==========')
const dashResult = await go(`${DEV}/dashboard`, '01-dashboard.png', 5000)

// Get nav items
const navItems = await page.evaluate(() => {
  const links = document.querySelectorAll('nav a, aside a, [data-sidebar] a')
  return Array.from(links).map(l => ({text: l.textContent?.trim(), href: l.href})).filter(l => l.text)
}).catch(() => [])
console.log('NAV ITEMS:', JSON.stringify(navItems.slice(0, 40)))

// Check specific widgets
const widgets = await page.evaluate(() => {
  return {
    hasMorningBriefing: !!document.querySelector('[class*="morning"], [class*="briefing"]') || document.body.innerText.includes('Morning'),
    hasRevenue: document.body.innerText.includes('Revenue') || document.body.innerText.includes('revenue'),
    hasCalendar: !!document.querySelector('[class*="calendar"]') || document.body.innerText.includes('calendar'),
    hasTasks: document.body.innerText.includes('task') || document.body.innerText.includes('Task'),
    spinnerCount: document.querySelectorAll('[class*="spinner"], [class*="loading"], [class*="skeleton"]').length
  }
}).catch(() => ({}))
console.log('WIDGETS:', JSON.stringify(widgets))

await page.screenshot({ path: 'screenshots/qa-pass/02-sidebar-nav.png', timeout: 10000 })

// ============ BLOCK 2: INBOX ============
console.log('\n\n========== BLOCK 2: INBOX ==========')
await go(`${DEV}/inbox`, '03-inbox.png', 3000)

await go(`${DEV}/inbox/history-scan`, '04-history-scan.png', 3000)

// Check scan page elements
const scanBtns = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'))
  return buttons.map(b => ({text: b.textContent?.trim(), disabled: b.disabled}))
}).catch(() => [])
console.log('SCAN PAGE BUTTONS:', JSON.stringify(scanBtns))

const scanBtn = await page.locator('button').filter({ hasText: /scan|start|analyze|process|run/i }).first()
const scanCount = await scanBtn.count()
console.log('Scan button found:', scanCount)
if (scanCount > 0) {
  const btnText = await scanBtn.innerText().catch(() => 'unknown')
  console.log('Scan button text:', btnText)
  await scanBtn.click().catch(e => console.log('Click error:', e.message))
  await page.waitForTimeout(15000)
  await page.screenshot({ path: 'screenshots/qa-pass/04-history-scan-after-click.png', timeout: 10000 })
  const afterText = await page.evaluate(() => document.body?.innerText || '').catch(() => '').then(t => t.substring(0, 500))
  console.log('AFTER SCAN CLICK:', afterText)
}

// ============ BLOCK 3: SELL ============
console.log('\n\n========== BLOCK 3: SELL ==========')
await go(`${DEV}/inquiries`, '05-inquiries.png', 3000)
await go(`${DEV}/events`, '06-events.png', 3000)

// Check for events
const eventItems = await page.evaluate(() => {
  const items = document.querySelectorAll('[class*="event-row"], [class*="event-item"], tr, [class*="card"]')
  return items.length
}).catch(() => 0)
console.log('Event items count:', eventItems)

// Try to click first event
const firstEvent = page.locator('a[href*="/events/"], tr[data-href*="/events/"], [class*="event"] a').first()
const firstEventCount = await firstEvent.count()
console.log('First event link count:', firstEventCount)
if (firstEventCount > 0) {
  await firstEvent.click().catch(e => console.log('Event click error:', e.message))
  await page.waitForTimeout(3000)
  console.log('Event detail URL:', page.url())
  await page.screenshot({ path: 'screenshots/qa-pass/06-event-detail.png', timeout: 10000 })
  
  // Check tabs
  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"], [data-state="active"], [class*="tab"]'))
      .map(t => t.textContent?.trim())
      .filter(Boolean)
  }).catch(() => [])
  console.log('Event tabs:', JSON.stringify(tabs))
}

await go(`${DEV}/quotes`, '07-quotes.png', 3000)

console.log('\n\nCONSOLE ERRORS SO FAR:', consoleErrors.length)
consoleErrors.slice(0, 10).forEach(e => console.log(' -', e.text.substring(0, 100)))

await browser.close()
console.log('\nBLOCKS 1-3 COMPLETE')
