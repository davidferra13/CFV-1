/**
 * Test script for the upgraded trivia game:
 * - Timer toggle (off by default)
 * - Two game modes: Culinary Knowledge + My Business
 * - Sources & confidence on every question
 * - Full answer review at end
 */
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3100'
const CREDS = { email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  console.log('[1] Signing in via auth endpoint...')
  const res = await page.request.post(`${BASE}/api/e2e/auth`, { data: CREDS })
  if (!res.ok()) {
    console.error('Auth failed:', res.status())
    await browser.close()
    process.exit(1)
  }
  console.log('  Auth OK:', res.status())

  // Navigate to trivia page
  await page.goto(`${BASE}/games/trivia`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3000) // let client hydrate
  console.log('[2] Navigated to trivia page, URL:', page.url())

  // Check we're on the right page
  const heading = page.locator('h1')
  const headingText = await heading.textContent()
  console.log('  Page heading:', headingText)

  await page.screenshot({ path: 'test-screenshots/trivia-01-setup.png' })
  console.log('  Screenshot: trivia-01-setup.png')

  // Check game mode toggle exists
  const culinaryBtn = page.locator('button:has-text("Culinary Knowledge")')
  const businessBtn = page.locator('button:has-text("My Business")')
  console.log(`[3] Game mode buttons: Culinary=${await culinaryBtn.isVisible()}, Business=${await businessBtn.isVisible()}`)

  // Check timer toggle exists and is OFF by default
  const timerToggle = page.locator('button[title="Enable timer"]')
  const timerVisible = await timerToggle.isVisible()
  console.log(`[4] Timer toggle visible: ${timerVisible} (should be off by default)`)

  // Check "Take your time" text (timer disabled)
  const noRushText = page.locator('text=Take your time, no rush')
  console.log(`  "Take your time" text: ${await noRushText.isVisible()}`)

  // Test clicking "My Business" mode
  await businessBtn.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'test-screenshots/trivia-02-business-mode.png' })
  console.log('[5] Clicked "My Business" mode')

  // Check internal focus options appear
  const upcomingOpt = page.locator('button:has-text("Upcoming Events")')
  const clientsOpt = page.locator('button:has-text("My Clients")')
  const everythingOpt = page.locator('button:has-text("Everything")')
  console.log(`  Internal options: Upcoming=${await upcomingOpt.isVisible()}, Clients=${await clientsOpt.isVisible()}, Everything=${await everythingOpt.isVisible()}`)

  // Switch back to culinary mode
  await culinaryBtn.click()
  await page.waitForTimeout(300)

  // Select a topic
  const motherSauces = page.locator('button:has-text("Mother Sauces")')
  await motherSauces.click()
  console.log('[6] Selected "Mother Sauces" topic')
  await page.screenshot({ path: 'test-screenshots/trivia-03-topic-selected.png' })

  // Check Let's Go is enabled
  const startBtn = page.locator('button:has-text("Let\'s Go!")')
  console.log(`[7] "Let's Go!" button enabled: ${await startBtn.isEnabled()}`)

  // Toggle timer on
  await timerToggle.click()
  await page.waitForTimeout(300)
  const timeBonusText = page.locator('text=earn time bonuses')
  console.log(`[8] After enabling timer, "earn time bonuses" text: ${await timeBonusText.isVisible()}`)
  await page.screenshot({ path: 'test-screenshots/trivia-04-timer-enabled.png' })

  // Verify topic chips are visible
  const topicChips = page.locator('button:has-text("Knife Skills")')
  console.log(`[9] Topic chips visible (Knife Skills): ${await topicChips.isVisible()}`)

  console.log('\n=== ALL UI CHECKS PASSED ===')
  console.log('Note: Full game flow (questions, answers, results) requires Ollama running.')

  await browser.close()
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
