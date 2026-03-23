import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  // Sign in
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }
  })
  console.log('Auth:', res.status())
  const cookies = await page.request.storageState()
  await page.context().addCookies(cookies.cookies)

  // Dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'scripts/nav-01-dashboard.png', fullPage: false })
  console.log('Screenshot: dashboard')

  // Go to Culinary > Menus
  await page.goto(`${BASE}/culinary/menus`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'scripts/nav-02-culinary-menus.png', fullPage: false })
  console.log('Screenshot: culinary/menus')

  // Check if there are menus, click the first one
  const menuLinks = await page.locator('a[href*="/culinary/menus/"]').all()
  console.log('Menu links found:', menuLinks.length)
  if (menuLinks.length > 0) {
    await menuLinks[0].click()
    await page.waitForTimeout(2500)
    await page.screenshot({ path: 'scripts/nav-03-menu-editor.png', fullPage: true })
    console.log('Screenshot: menu editor (full page)')
    
    // Scroll down to see shopping list
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'scripts/nav-04-menu-bottom.png', fullPage: false })
    console.log('Screenshot: menu editor bottom')
  }

  await browser.close()
  console.log('Done')
}

run().catch(console.error)
