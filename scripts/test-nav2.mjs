import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function shot(page, name, full = false) {
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `scripts/${name}.png`, fullPage: full })
  console.log('Shot:', name)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)

  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }
  })
  const cookies = await page.request.storageState()
  await page.context().addCookies(cookies.cookies)

  // Culinary menus list
  await page.goto(`${BASE}/culinary/menus`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await shot(page, 'nav-culinary-menus')

  // Try to get first menu link
  const firstMenu = page.locator('a[href*="/culinary/menus/"]').first()
  const href = await firstMenu.getAttribute('href').catch(() => null)
  console.log('First menu href:', href)

  if (href) {
    await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await shot(page, 'nav-menu-editor', true)
    
    // Click "Add component" on first dish if available
    const addCompBtn = page.locator('button:has-text("+ Add component")').first()
    if (await addCompBtn.isVisible().catch(() => false)) {
      await addCompBtn.click()
      await page.waitForTimeout(1000)
      await shot(page, 'nav-add-component-form')
    }
  }

  // Clients
  await page.goto(`${BASE}/clients`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await shot(page, 'nav-clients')

  // Finance
  await page.goto(`${BASE}/finance/invoices`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await shot(page, 'nav-finance-invoices')

  await browser.close()
  console.log('Done')
}

run().catch(console.error)
