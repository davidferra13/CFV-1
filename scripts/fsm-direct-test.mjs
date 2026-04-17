/**
 * Test FSM transitions directly via server action call (bypass UI)
 * Uses Playwright to call the server action via page.evaluate
 */
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const CREDS = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))
const eventId = '987f745e-ff2b-430a-b3b2-ad2909ad279b'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })

  // Auth
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  await page.evaluate(async ({ base, email, password }) => {
    const csrf = await (await fetch(`${base}/api/auth/csrf`)).json()
    await fetch(`${base}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, json: 'true' }),
      redirect: 'manual',
    })
  }, { base: BASE, email: CREDS.email, password: CREDS.password })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(5000)
  console.log('Auth OK')

  // Check current status
  console.log('\n--- Checking event status ---')
  await page.goto(`${BASE}/events/${eventId}?tab=ops`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(8000)

  // Get status from page text
  const statusText = await page.evaluate(() => {
    // Find status badge or text near the event title
    const badges = document.querySelectorAll('[class*="badge"], [class*="Badge"]')
    const texts = Array.from(badges).map(b => b.textContent?.trim()).filter(Boolean)
    // Also check for status in the page title area
    const h1s = document.querySelectorAll('h1, h2')
    const headings = Array.from(h1s).map(h => h.textContent?.trim()).filter(t => t?.includes('propos') || t?.includes('accept') || t?.includes('draft'))
    return { badges: texts.slice(0, 10), headings: headings.slice(0, 5) }
  })
  console.log('Status indicators:', JSON.stringify(statusText))

  // Try calling the transition directly via the API
  // The event detail page imports the transition functions. Let's call them via a direct server action invocation
  // Actually, server actions can only be called from the Next.js client. Let's use a simpler approach:
  // Hit the event detail page and use the button, but this time capture the actual error

  console.log('\n--- Attempting Accept on Behalf via E2E auth endpoint ---')

  // First, try using the e2e API to call the transition directly
  const result = await page.evaluate(async ({ base, evtId }) => {
    try {
      const resp = await fetch(`${base}/api/e2e/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: evtId, action: 'acceptOnBehalf' })
      })
      const text = await resp.text()
      return { status: resp.status, body: text.slice(0, 500) }
    } catch (err) {
      return { error: err.message }
    }
  }, { base: BASE, evtId: eventId })
  console.log('E2E transition result:', JSON.stringify(result))

  // If no e2e endpoint, let's try the direct approach: navigate to a test page that calls the action
  // Actually, let's just try the button click but with full error capture
  console.log('\n--- Attempting button click with full error capture ---')

  // Capture ALL console output from the page
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('error') || text.includes('Error') || text.includes('transition') ||
        text.includes('Transition') || text.includes('accept') || text.includes('500')) {
      console.log(`  CONSOLE [${msg.type()}]: ${text.slice(0, 300)}`)
    }
  })
  page.on('pageerror', err => {
    console.log(`  PAGEERROR: ${err.message.slice(0, 300)}`)
  })

  // Capture request/response for the server action
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/events/')) {
      console.log(`  REQ: POST ${req.url().slice(0, 100)}`)
      const headers = req.headers()
      if (headers['next-action']) console.log(`    Next-Action: ${headers['next-action']}`)
    }
  })
  page.on('response', async resp => {
    if (resp.url().includes('/events/') && (resp.status() >= 400)) {
      console.log(`  RESP: ${resp.status()} ${resp.url().slice(0, 100)}`)
      try {
        const body = await resp.text()
        if (body.length < 2000) {
          console.log(`    Body: ${body.slice(0, 500)}`)
        } else {
          console.log(`    Body (first 500): ${body.slice(0, 500)}`)
        }
      } catch {}
    }
  })

  // Find and click the button
  const btn = page.getByRole('button', { name: 'Accept on Behalf', exact: true })
  const visible = await btn.isVisible().catch(() => false)
  if (!visible) {
    console.log('Button not visible!')
    await browser.close()
    return
  }

  await btn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  console.log('Clicking...')
  await btn.click({ force: true })

  // Wait and capture
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000)
    const still = await btn.isVisible().catch(() => false)
    if (!still) {
      console.log(`Button gone after ${i + 1}s`)
      break
    }
    if (i === 2) {
      const d = await btn.isDisabled().catch(() => false)
      console.log(`  3s: disabled=${d}`)
    }
    if (i % 10 === 9) console.log(`  ${i + 1}s...`)
  }

  // Check final state
  const finalErrors = await page.evaluate(() => {
    const els = document.querySelectorAll('[role="alert"], .text-red-500, .text-destructive')
    return Array.from(els).map(e => e.textContent?.trim()).filter(t => t && t.length > 3)
  })
  if (finalErrors.length) console.log('Final errors:', finalErrors)

  await page.screenshot({ path: 'screenshots/s1-s10-chain/fsm-direct-result.png', fullPage: true })
  await browser.close()
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
