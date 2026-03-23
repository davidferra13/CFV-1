import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function shot(page, name, full = false) {
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `scripts/${name}.png`, fullPage: full })
  console.log('Shot:', name, '- URL:', page.url())
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(45000)

  // Sign in
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.fill('input[type="email"]', 'agent@chefflow.test')
  await page.fill('input[type="password"]', 'AgentChefFlow!2026')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 30000 })
  await shot(page, 'p01-dashboard')

  // Pipeline / Inquiries
  await page.goto(`${BASE}/inquiries`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p02-inquiries')

  // Events
  await page.goto(`${BASE}/events`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p03-events')

  // Clients
  await page.goto(`${BASE}/clients`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p04-clients')

  // Culinary menus
  await page.goto(`${BASE}/culinary/menus`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p05-culinary-menus')

  // Recipes
  await page.goto(`${BASE}/recipes`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p06-recipes')

  // Finance
  await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p07-finance')

  // Settings
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await shot(page, 'p08-settings')

  await browser.close()
  console.log('All done.')
}

run().catch(e => { console.error('Error:', e.message) })
