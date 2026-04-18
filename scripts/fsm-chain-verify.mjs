/**
 * Verify full FSM chain after pricing_model fix.
 * Creates a fresh event with pricing_model set, then drives all 6 transitions.
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

  // Create event
  console.log('\n--- Creating event ---')
  await page.goto(`${BASE}/events/new`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(5000)

  // Wait for hydration (slow prod build on slow hardware)
  await page.waitForTimeout(8000)

  // Fill Step 1 fields
  const clientSelect = page.getByLabel('Client')
  await clientSelect.waitFor({ state: 'visible', timeout: 15000 })
  const options = await clientSelect.locator('option').allTextContents()
  const firstClient = options.find(o => o && o.length > 3 && !o.includes('Select'))
  if (firstClient) {
    await clientSelect.selectOption({ label: firstClient })
    console.log('  Client:', firstClient)
  }

  const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth()+1).padStart(2,'0')}-${String(eventDate.getDate()).padStart(2,'0')}T17:00`
  await page.getByLabel('Event Date & Time').fill(dateStr)
  await page.getByLabel('Number of Guests').fill('4')
  await page.waitForTimeout(1000)

  // Click Continue - handles scheduling conflicts
  const contBtn = page.locator('button:has-text("Continue")')
  await contBtn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await contBtn.click()
  console.log('  Continue clicked')

  // Wait for either: conflict warnings, step 2, or error
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)

    // Check for scheduling conflict checkbox
    const checkbox = page.locator('input[type="checkbox"]').last()
    const conflictText = await page.locator('text=Scheduling conflict detected').isVisible().catch(() => false)
    if (conflictText) {
      console.log('  Conflict detected, overriding...')
      await checkbox.check()
      await page.waitForTimeout(500)
      // Re-click Continue (it should now be enabled)
      const contBtn2 = page.locator('button:has-text("Continue")')
      await contBtn2.click()
      console.log('  Continue re-clicked after override')
      continue
    }

    // Check for Step 2
    const step2 = await page.getByText('Quoted Price ($)').isVisible().catch(() => false)
    const createVisible = await page.locator('button:has-text("Create Event")').isVisible().catch(() => false)
    if (step2 || createVisible) {
      console.log('  Step 2 reached')
      break
    }

    // Check for validation errors
    if (i === 5) {
      const errors = await page.evaluate(() => {
        const els = document.querySelectorAll('[role="alert"], .text-red-500, .text-destructive')
        return Array.from(els).map(e => e.textContent?.trim()).filter(t => t && t.length > 3)
      })
      if (errors.length) console.log('  Form errors:', errors)
    }
  }

  // Wait for Step 2 (Quoted Price) with conflict handling
  let step2Found = false
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    // Check for scheduling conflict
    const conflictLabel = page.locator('label:has-text("I understand")')
    if (await conflictLabel.isVisible().catch(() => false)) {
      console.log('  Handling scheduling conflict')
      await conflictLabel.click()
      await page.waitForTimeout(500)
      const retryBtn = page.locator('button:has-text("Continue")')
      if (await retryBtn.isVisible().catch(() => false)) await retryBtn.click()
    }
    // Check for Step 2 content
    const qp = await page.getByText('Quoted Price ($)').isVisible().catch(() => false)
    const createBtn = await page.locator('button:has-text("Create Event")').isVisible().catch(() => false)
    if (qp || createBtn) {
      step2Found = true
      console.log('  Step 2 reached')
      break
    }
  }

  if (!step2Found) {
    await page.screenshot({ path: 'screenshots/s1-s10-chain/fsm-verify-step2-fail.png', fullPage: true })
    console.log('FAILED: Step 2 not reached')
    await browser.close()
    return
  }

  await page.waitForTimeout(1000)
  const quotedPrice = page.getByPlaceholder('e.g., 2500.00')
  if (await quotedPrice.isVisible().catch(() => false)) {
    await quotedPrice.fill('500')
  }

  // Create event
  const createBtn = page.locator('button:has-text("Create Event")')
  await createBtn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await createBtn.click()

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/events/new')) break
  }

  const eventMatch = page.url().match(/\/events\/([a-f0-9-]+)/)
  if (!eventMatch) {
    console.log('FAILED: Event creation failed:', page.url())
    await browser.close()
    return
  }
  const eventId = eventMatch[1]
  console.log(`Created: ${eventId}`)

  // Define transitions
  const transitions = [
    { name: 'draft -> proposed', btn: 'Propose to Client' },
    { name: 'proposed -> accepted', btn: 'Accept on Behalf' },
    { name: 'accepted -> paid', btn: 'Mark Paid (Offline)' },
    { name: 'paid -> confirmed', btn: 'Confirm Event' },
    { name: 'confirmed -> in_progress', btn: 'Mark In Progress' },
    { name: 'in_progress -> completed', btn: 'Mark Completed' },
  ]

  for (const { name, btn: btnName } of transitions) {
    console.log(`\n--- ${name} ---`)
    await page.goto(`${BASE}/events/${eventId}?tab=ops`, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(8000)

    const btn = page.getByRole('button', { name: btnName, exact: true })
    const visible = await btn.isVisible().catch(() => false)

    if (!visible) {
      // Check all buttons for debugging
      const allBtns = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button'))
          .map(b => b.textContent?.trim())
          .filter(t => t && t.length < 50 && (
            t.includes('Propose') || t.includes('Accept') || t.includes('Mark') ||
            t.includes('Confirm') || t.includes('Cancel') || t.includes('Start')
          ))
      })
      console.log(`  FAILED: "${btnName}" not visible. Available: ${allBtns.join(', ')}`)
      break
    }

    await btn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Capture errors
    const pageErrors = []
    const errHandler = err => pageErrors.push(err.message?.slice(0, 150))
    page.on('pageerror', errHandler)

    await btn.click({ force: true })
    console.log('  Clicked...')

    // Wait up to 120s
    let success = false
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(1000)
      if (!await btn.isVisible().catch(() => false)) {
        console.log(`  OK after ${i + 1}s`)
        success = true
        break
      }
      if (i % 30 === 29) console.log(`  ${i + 1}s...`)
    }

    page.removeListener('pageerror', errHandler)

    if (!success) {
      console.log(`  FAILED: button still visible after 120s`)
      if (pageErrors.length) console.log(`  Errors: ${pageErrors.join('; ')}`)
      await page.screenshot({ path: `screenshots/s1-s10-chain/fsm-verify-fail-${name.replace(/\s+/g, '-')}.png`, fullPage: true })
      break
    }
  }

  // Final check
  console.log('\n--- Final DB check ---')
  await page.goto(`${BASE}/events/${eventId}?tab=ops`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(8000)
  const badges = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="badge"], [class*="Badge"]'))
      .map(b => b.textContent?.trim())
      .filter(Boolean)
      .slice(0, 10)
  })
  console.log('Status badges:', badges)

  await page.screenshot({ path: 'screenshots/s1-s10-chain/fsm-verify-final.png', fullPage: true })
  await browser.close()
  console.log('\nDone')
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
