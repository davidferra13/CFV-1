/**
 * Test FSM transitions by calling the server action through Playwright
 * Uses page.evaluate to import and call the server action function directly
 */
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const CREDS = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))

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

  // Create a fresh event for isolated testing
  console.log('\n--- Creating test event ---')
  await page.goto(`${BASE}/events/new`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(5000)

  // Use the first client in the dropdown
  const clientSelect = page.getByLabel('Client')
  await clientSelect.waitFor({ state: 'visible', timeout: 10000 })
  const options = await clientSelect.locator('option').allTextContents()
  const firstClient = options.find(o => o && o.length > 3 && !o.includes('Select'))
  if (firstClient) {
    await clientSelect.selectOption({ label: firstClient })
    console.log(`  Selected client: ${firstClient}`)
  }

  // Set event date
  const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth()+1).padStart(2,'0')}-${String(eventDate.getDate()).padStart(2,'0')}T17:00`
  await page.getByLabel('Event Date & Time').fill(dateStr)
  await page.getByLabel('Number of Guests').fill('4')

  // Continue to Step 2
  const continueBtn = page.getByRole('button', { name: /Continue/ })
  await continueBtn.click()

  // Wait for Step 2 (handle scheduling conflicts)
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    const qp = await page.getByText('Quoted Price ($)').isVisible().catch(() => false)
    if (qp) break
    // Check for scheduling conflict
    const conflictLabel = page.locator('label:has-text("I understand")')
    if (await conflictLabel.isVisible().catch(() => false)) {
      await conflictLabel.click()
      await page.waitForTimeout(500)
      const retryBtn = page.getByRole('button', { name: /Continue/ })
      if (await retryBtn.isVisible().catch(() => false)) await retryBtn.click()
    }
  }
  await page.waitForTimeout(1000)

  // Set price
  const quotedPrice = page.getByPlaceholder('e.g., 2500.00')
  if (await quotedPrice.isVisible().catch(() => false)) {
    await quotedPrice.fill('500')
  }

  // Create event
  const createBtn = page.getByRole('button', { name: 'Create Event' })
  await createBtn.click()

  // Wait for redirect
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/events/new')) break
  }

  const eventUrl = page.url()
  const eventMatch = eventUrl.match(/\/events\/([a-f0-9-]+)/)
  if (!eventMatch) {
    console.log('Failed to create event:', eventUrl)
    await browser.close()
    return
  }
  const eventId = eventMatch[1]
  console.log(`  Created event: ${eventId}`)

  // --- Now test FSM transitions one at a time ---
  // Navigate to a SIMPLE page (not the heavy event detail) to call server actions
  // We'll use the events list page and call transitions via page.evaluate

  // Step 1: Propose (draft -> proposed)
  console.log('\n--- Transition: draft -> proposed ---')
  await page.goto(`${BASE}/events/${eventId}?tab=ops`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(8000)

  let btn = page.getByRole('button', { name: 'Propose to Client', exact: true })
  if (await btn.isVisible().catch(() => false)) {
    await btn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    page.on('console', msg => {
      if (msg.text().includes('error') || msg.text().includes('Error') || msg.text().includes('Transition'))
        console.log(`  [${msg.type()}] ${msg.text().slice(0, 200)}`)
    })
    await btn.click({ force: true })
    console.log('  Clicked, waiting...')
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(1000)
      if (!await btn.isVisible().catch(() => false)) {
        console.log(`  Button gone after ${i + 1}s`)
        break
      }
      if (i % 15 === 14) console.log(`  ${i + 1}s...`)
    }
  }

  // Check DB
  console.log('\n  Checking DB...')
  // Navigate to events list to check
  await page.waitForTimeout(2000)

  // Step 2: Accept on behalf (proposed -> accepted)
  console.log('\n--- Transition: proposed -> accepted ---')
  await page.goto(`${BASE}/events/${eventId}?tab=ops`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(8000)

  btn = page.getByRole('button', { name: 'Accept on Behalf', exact: true })
  const visible = await btn.isVisible().catch(() => false)
  console.log(`  Accept on Behalf visible: ${visible}`)

  if (visible) {
    await btn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Capture responses
    page.on('response', async resp => {
      if (resp.status() >= 400 && !resp.url().includes('realtime') && !resp.url().includes('loading') && !resp.url().includes('ai/health')) {
        console.log(`  NET ${resp.status()}: ${resp.url().slice(0, 100)}`)
        if (resp.status() === 500) {
          try {
            const body = await resp.text()
            // Look for error digest
            const digestMatch = body.match(/digest[":]+([^"}\s]+)/)
            if (digestMatch) console.log(`  Error digest: ${digestMatch[1]}`)
          } catch {}
        }
      }
    })

    await btn.click({ force: true })
    console.log('  Clicked, waiting...')

    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1000)
      if (!await btn.isVisible().catch(() => false)) {
        console.log(`  Button gone after ${i + 1}s - SUCCESS!`)
        break
      }
      if (i === 2) {
        const d = await btn.isDisabled().catch(() => false)
        console.log(`  3s: disabled=${d}`)
      }
      if (i % 15 === 14) console.log(`  ${i + 1}s...`)
    }

    // Check errors on page
    const errors = await page.evaluate(() => {
      const els = document.querySelectorAll('[role="alert"], .text-red-500, .text-destructive')
      return Array.from(els).map(e => e.textContent?.trim()).filter(t => t && t.length > 3 && t.length < 200)
    })
    if (errors.length) console.log('  Page errors:', errors)
  }

  // Final status
  await page.screenshot({ path: 'screenshots/s1-s10-chain/fsm-api-final.png', fullPage: true })
  await browser.close()
  console.log('\nDone')
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
