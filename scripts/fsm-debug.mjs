/**
 * Debug FSM Accept on Behalf button click
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
  console.log('Auth OK:', page.url())

  // Go to Ops tab
  console.log('\n--- Loading Ops tab ---')
  await page.goto(`${BASE}/events/${eventId}?tab=ops`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(8000)

  // Collect all buttons related to FSM
  const fsmButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    return btns
      .map(b => ({ text: b.textContent?.trim(), disabled: b.disabled, rect: b.getBoundingClientRect() }))
      .filter(b => b.text && (
        b.text.includes('Accept') || b.text.includes('Propose') ||
        b.text.includes('Mark') || b.text.includes('Confirm') ||
        b.text.includes('Cancel') || b.text.includes('Start')
      ) && b.text.length < 50)
  })
  console.log('FSM buttons found:')
  for (const b of fsmButtons) {
    console.log(`  "${b.text}" disabled=${b.disabled} pos=(${Math.round(b.rect.x)},${Math.round(b.rect.y)}) size=${Math.round(b.rect.width)}x${Math.round(b.rect.height)}`)
  }

  await page.screenshot({ path: 'screenshots/s1-s10-chain/fsm-debug-1.png', fullPage: true })

  // Find Accept on Behalf button
  const btn = page.getByRole('button', { name: 'Accept on Behalf', exact: true })
  const visible = await btn.isVisible().catch(() => false)
  console.log('\nAccept on Behalf visible:', visible)

  if (!visible) {
    console.log('Button not found!')
    await browser.close()
    return
  }

  // Check what's at the button's position (overlay check)
  const btnBox = await btn.boundingBox()
  console.log('Button bounding box:', btnBox)

  if (btnBox) {
    const elementAtPoint = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return 'null'
      return `${el.tagName}#${el.id}.${el.className?.toString().slice(0, 60)} text="${el.textContent?.slice(0, 30)}"`
    }, { x: btnBox.x + btnBox.width / 2, y: btnBox.y + btnBox.height / 2 })
    console.log('Element at button center:', elementAtPoint)
  }

  // Listen for console and errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('transition') || msg.text().includes('Transition')) {
      console.log(`PAGE ${msg.type()}: ${msg.text().slice(0, 200)}`)
    }
  })
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message.slice(0, 200)))

  // Monitor network
  page.on('response', resp => {
    if (resp.url().includes('transition') || resp.url().includes('accept') ||
        (resp.status() >= 400 && !resp.url().includes('realtime') && !resp.url().includes('loading'))) {
      console.log(`NET: ${resp.status()} ${resp.url().slice(0, 100)}`)
    }
  })

  // Scroll and click
  await btn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)

  console.log('\n--- Clicking Accept on Behalf ---')
  await btn.click({ force: true })
  console.log('Click dispatched')

  // Wait for result
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000)
    const still = await btn.isVisible().catch(() => false)
    if (!still) {
      console.log(`Button gone after ${i + 1}s - transition succeeded!`)
      break
    }
    // Check for loading state
    if (i === 2) {
      const btnText = await btn.textContent().catch(() => '')
      const btnDisabled = await btn.isDisabled().catch(() => false)
      console.log(`  After 3s: text="${btnText?.trim()}" disabled=${btnDisabled}`)
    }
    if (i % 15 === 14) console.log(`  Still waiting... ${i + 1}s`)
  }

  const finalVisible = await btn.isVisible().catch(() => false)
  if (finalVisible) {
    console.log('\n--- BUTTON STILL VISIBLE after 90s ---')
    // Check if there's an error
    const errors = await page.evaluate(() => {
      const els = document.querySelectorAll('[role="alert"], .text-red-500, .text-destructive')
      return Array.from(els).map(e => e.textContent?.trim()).filter(Boolean)
    })
    if (errors.length) console.log('Errors on page:', errors)

    // Try clicking via JS dispatch
    console.log('\n--- Trying JS dispatch click ---')
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const target = btns.find(b => b.textContent?.trim() === 'Accept on Behalf')
      if (target) {
        console.log('Found button, dispatching click event')
        target.click()
      } else {
        console.log('Button not found in DOM')
      }
    })
    console.log('JS click dispatched, waiting 30s...')

    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000)
      const still = await btn.isVisible().catch(() => false)
      if (!still) {
        console.log(`Button gone after JS click + ${i + 1}s!`)
        break
      }
      if (i % 10 === 9) console.log(`  JS click wait: ${i + 1}s`)
    }
  }

  await page.screenshot({ path: 'screenshots/s1-s10-chain/fsm-debug-2.png', fullPage: true })
  await browser.close()
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
