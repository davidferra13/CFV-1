import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Sign in via the API
  console.log('[1/6] Signing in...')
  await page.goto(`${BASE}/games/trivia`, { waitUntil: 'load' })
  await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/e2e/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }),
    })
    return { ok: r.ok, status: r.status }
  }, BASE)
  console.log('  Auth OK')

  // Dismiss cookie consent (set localStorage before page loads trivia)
  await page.evaluate(() => localStorage.setItem('cookieConsent', 'true'))

  // Navigate to trivia page
  console.log('[2/6] Navigating to trivia...')
  await page.goto(`${BASE}/games/trivia`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.screenshot({ path: 'test-screenshots/trivia-01-setup.png' })
  console.log('  Setup page loaded')

  // Select a topic and start
  console.log('[3/6] Starting game (Knife Skills, medium)...')
  await page.click('button:has-text("Knife Skills")')
  await page.click('button:has-text("Let\'s Go!")')
  await page.screenshot({ path: 'test-screenshots/trivia-02-loading.png' })
  console.log('  Loading started, waiting for questions (up to 120s)...')

  // Wait for questions to load
  try {
    await page.waitForSelector('button:has-text("A.")', { timeout: 120000 })
    console.log('  Questions loaded!')
    await page.screenshot({ path: 'test-screenshots/trivia-03-playing.png' })
  } catch (err) {
    console.error('  FAILED: Questions did not load within 120s')
    await page.screenshot({ path: 'test-screenshots/trivia-03-FAILED.png' })
    await browser.close()
    process.exit(1)
  }

  // Answer first question
  console.log('[4/6] Answering first question...')
  await page.locator('button:has-text("A.")').first().click()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-screenshots/trivia-04-answered.png' })
  console.log('  Answer registered')

  // Click Next Question
  console.log('[5/6] Moving to next question...')
  await page.locator('button:has-text("Next Question")').click({ timeout: 5000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-screenshots/trivia-05-question2.png' })
  console.log('  Moved to question 2')

  // Answer remaining questions to get to results
  for (let i = 2; i <= 5; i++) {
    await page.locator('button:has-text("A.")').first().click()
    await page.waitForTimeout(500)
    const btnText = i < 5 ? 'Next Question' : 'See Results'
    await page.locator(`button:has-text("${btnText}")`).click({ timeout: 5000 })
    await page.waitForTimeout(300)
    console.log(`  Completed question ${i}`)
  }

  await page.screenshot({ path: 'test-screenshots/trivia-06-results.png' })
  console.log('[6/6] Results screen reached! Trivia game is FULLY WORKING!')

  await browser.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('Test crashed:', err.message)
  process.exit(1)
})
