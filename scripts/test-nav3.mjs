import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function shot(page, name, full = false) {
  await page.waitForTimeout(2000)
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

  // Create a test menu via the new menu form
  await page.goto(`${BASE}/menus/new`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await shot(page, 'nav-new-menu')

  // Fill in menu name
  const nameInput = page.locator('input[name="name"], input[placeholder*="menu" i], input[placeholder*="name" i]').first()
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Summer Tasting Menu')
    await shot(page, 'nav-new-menu-filled')
    
    // Submit
    const submitBtn = page.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(3000)
      await shot(page, 'nav-after-create-menu', true)
      console.log('Current URL:', page.url())
    }
  }

  await browser.close()
}

run().catch(e => { console.error(e.message); process.exit(0) })
