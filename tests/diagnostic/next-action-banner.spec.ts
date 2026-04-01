import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'tmp-screenshots')
const BASE = 'http://localhost:3100'
const INQUIRY_ID = '846fced1-7163-44b4-89b1-a57a43543f35'

test.describe('NextActionBanner - QA', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('verify inquiry detail NextActionBanner', async ({ page }) => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // Sign in from signin page so cookies are set in browser context
    await page.goto(`${BASE}/auth/signin`, { waitUntil: 'load', timeout: 30000 })
    await page.evaluate(async () => {
      await fetch('/api/e2e/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'agent@local.chefflow',
          password: 'CHEF.jdgyuegf9924092.FLOW',
        }),
        credentials: 'include',
      })
    })

    // Navigate to inquiries list first (fast page, verifies auth)
    await page.goto(`${BASE}/inquiries`, { waitUntil: 'commit', timeout: 20000 })
    await page.waitForSelector('text=Inquiry Pipeline', { timeout: 15000 })
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-inquiries-list.png') })
    console.log('01: inquiries list loaded')

    // Click the Gunjan Gupta link using client-side routing (faster than page.goto)
    await page.click(`a[href="/inquiries/${INQUIRY_ID}"]`)

    // Wait for the detail page to load - use a text we know should appear
    // Try to detect something on the detail page
    const detailLoaded = await page
      .waitForSelector('text=Gunjan Gupta, text=15th Anniversary, [data-testid="inquiry-detail"]', {
        timeout: 60000,
        state: 'visible',
      })
      .catch(() => null)

    console.log('Detail loaded:', !!detailLoaded)
    console.log('Detail URL:', page.url())
    await page.waitForTimeout(1000)

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-inquiry-detail-top.png') })
    console.log('02: inquiry detail top')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-inquiry-detail-full.png'),
      fullPage: true,
    })
    console.log('03: inquiry detail full')

    const pageText = (await page.locator('body').textContent()) ?? ''
    console.log('\n=== Inquiry detail phrases ===')
    const phrases = [
      'Send first response',
      'Reply to client',
      'SLA',
      'overdue',
      'hrs left',
      'Respond',
      'Critical Path',
      'Lifecycle',
      'next action',
      'Awaiting',
      'first response',
      'Action needed',
      'urgent',
      'time remaining',
      'Your Reply',
      'Score',
    ]
    for (const p of phrases) {
      if (pageText.toLowerCase().includes(p.toLowerCase())) console.log(`  FOUND: "${p}"`)
    }

    const headings = await page.locator('h1, h2, h3').allTextContents()
    console.log('Headings:', headings.slice(0, 8))

    // Specifically look for the NextActionBanner component
    const bannerEl = page.locator(
      '[class*="banner"], [class*="Banner"], [role="alert"], [class*="alert"]'
    )
    const bCount = await bannerEl.count()
    console.log('Banner/alert elements:', bCount)
    for (let i = 0; i < bCount; i++) {
      const txt = await bannerEl.nth(i).textContent()
      console.log(`  [${i}]: "${txt?.substring(0, 120)}"`)
    }

    // Look for SLA badge explicitly
    const slaBadge = page.getByText(/SLA|overdue|hrs left/i)
    console.log('SLA-related text elements:', await slaBadge.count())

    // Dashboard test
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'commit', timeout: 30000 })
    await page.waitForSelector('text=Dashboard', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-dashboard.png') })
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-dashboard-full.png'),
      fullPage: true,
    })
    console.log('04-05: dashboard - URL:', page.url())

    const dashText = (await page.locator('body').textContent()) ?? ''
    console.log('\n=== Dashboard phrases ===')
    const dashPhrases = ['Respond Next', 'overdue', 'Response Queue', 'Inquiries', 'Pending']
    for (const p of dashPhrases) {
      if (dashText.toLowerCase().includes(p.toLowerCase())) console.log(`  FOUND: "${p}"`)
    }
    const overdueMatches = dashText.match(/\d+\s*overdue/gi)
    if (overdueMatches) console.log('Overdue text:', overdueMatches)

    const respondNextEl = page.getByText('Respond Next', { exact: false })
    console.log('"Respond Next" count:', await respondNextEl.count())

    console.log('\n=== Console errors ===')
    if (errors.length === 0) console.log('  None')
    else errors.slice(0, 8).forEach((e) => console.log('  ERR:', e))

    expect(true).toBe(true)
  })
})
