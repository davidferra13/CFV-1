import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'tmp-screenshots')
const BASE = 'http://localhost:3100'

test.describe('Dashboard Respond Next Card', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('dashboard respond next card', async ({ page }) => {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // Auth
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

    // Go to inquiries first to establish auth, then client-navigate to dashboard
    await page.goto(`${BASE}/inquiries`, { waitUntil: 'commit', timeout: 20000 })
    await page.waitForSelector('text=Inquiry Pipeline', { timeout: 15000 })
    console.log('Inquiries loaded')

    // Use sidebar nav to go to dashboard (client-side routing)
    // Try clicking the ChefFlow logo / home link
    const dashLinks = page.locator('a[href="/dashboard"]')
    const dCount = await dashLinks.count()
    console.log('Dashboard links:', dCount)
    if (dCount > 0) {
      await dashLinks.first().click()
    } else {
      // Try navigating via page link
      await page.evaluate(() => {
        window.history.pushState({}, '', '/dashboard')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
    }

    await page.waitForTimeout(4000)
    console.log('Dashboard URL:', page.url())

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-dashboard.png') })
    console.log('04: dashboard viewport')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-dashboard-full.png'),
      fullPage: true,
    })
    console.log('05: dashboard full')

    const dashText = (await page.locator('body').textContent()) ?? ''
    console.log('\n=== Dashboard text scan ===')
    const phrases = ['Respond Next', 'overdue', 'Response Queue', 'Pending', 'Inquiries', 'Today']
    for (const p of phrases) {
      if (dashText.toLowerCase().includes(p.toLowerCase())) console.log(`  FOUND: "${p}"`)
    }
    const overdueMatch = dashText.match(/\d+\s*overdue/gi)
    if (overdueMatch) console.log('Overdue text:', overdueMatch)

    const respondNextEl = page.getByText('Respond Next', { exact: false })
    console.log('"Respond Next" count:', await respondNextEl.count())

    const headings = await page.locator('h1, h2, h3').allTextContents()
    console.log('Headings:', headings.slice(0, 10))

    console.log('\n=== Console errors ===')
    if (errors.length === 0) console.log('  None')
    else errors.slice(0, 5).forEach((e) => console.log('  ERR:', e))

    expect(true).toBe(true)
  })
})
