// Phase 3 Verification Script - walks every pricing surface and screenshots
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:3100'
const CREDS = JSON.parse(fs.readFileSync('.auth/developer.json', 'utf-8'))
const SCREENSHOT_DIR = '.auth/phase3-screenshots'

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // Sign in via the credentials form on the login page
  console.log('Navigating to login page...')
  await page.goto(`${BASE}/login`, { timeout: 90000 })
  await page.waitForTimeout(3000)
  console.log('Login page URL:', page.url())

  // Screenshot login page
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-login-page.png') })

  // Fill credentials form
  try {
    const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"]').first()
    const passField = page.locator('input[type="password"], input[name="password"], input[id="password"]').first()

    if (await emailField.isVisible({ timeout: 5000 })) {
      console.log('Found login form, filling credentials...')
      await emailField.fill(CREDS.email)
      await passField.fill(CREDS.password)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00b-form-filled.png') })

      // Click submit
      const submitBtn = page.locator('button[type="submit"]').first()
      await submitBtn.click()

      // Wait for navigation
      await page.waitForTimeout(5000)
      console.log('After login URL:', page.url())
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00c-after-login.png') })
    } else {
      console.log('No visible email field. Page content:')
      console.log(await page.textContent('body').then(t => t?.substring(0, 500)))
    }
  } catch (err) {
    console.error('Login form interaction failed:', err.message)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-login-error.png') })
  }

  // Navigate to dashboard regardless
  if (!page.url().includes('dashboard')) {
    console.log('Navigating directly to dashboard...')
    await page.goto(`${BASE}/dashboard`, { timeout: 60000 })
    await page.waitForTimeout(3000)
  }

  console.log('Current URL:', page.url())
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: true })
  console.log('Dashboard captured')

  const pagesToVisit = [
    { url: '/settings/store-preferences', name: '02-store-preferences' },
    { url: '/culinary/costing', name: '03-costing-hub' },
    { url: '/culinary/costing/sales', name: '04-sales-this-week' },
    { url: '/culinary/costing/recipe', name: '05-recipe-costing' },
    { url: '/culinary/costing/menu', name: '06-menu-costing' },
    { url: '/culinary/costing/food-cost', name: '07-food-cost' },
    { url: '/culinary/ingredients', name: '08-ingredients-library' },
    { url: '/culinary/price-catalog', name: '09-price-catalog' },
  ]

  for (const p of pagesToVisit) {
    console.log(`Navigating to ${p.url}...`)
    try {
      await page.goto(`${BASE}${p.url}`, { timeout: 60000 })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${p.name}.png`), fullPage: true })
      console.log(`  Captured ${p.name}`)
    } catch (err) {
      console.error(`  FAILED ${p.name}: ${err.message}`)
      try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${p.name}-ERROR.png`) })
      } catch {}
    }
  }

  await browser.close()
  console.log(`\nDone. Screenshots in ${SCREENSHOT_DIR}/`)
}

run().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
