// Screenshot pages that will be modified by openclaw-price-surfacing spec
const { chromium } = require('playwright')

const BASE = 'http://localhost:3100'
const dir = process.argv[2] || 'before'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  // Sign in
  await page.goto(`${BASE}/auth/signin`, { timeout: 30000 })
  await page.waitForTimeout(2000)
  await page.fill('input[type="email"]', 'agent@local.chefflow')
  await page.fill('input[type="password"]', 'CHEF.jdgyuegf9924092.FLOW')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  console.log('Signed in')

  const pages = [
    { name: 'costing', url: '/culinary/costing' },
    { name: 'ingredients', url: '/culinary/ingredients' },
    { name: 'admin-price-catalog', url: '/admin/price-catalog' },
  ]

  for (const p of pages) {
    try {
      await page.goto(`${BASE}${p.url}`, { timeout: 30000 })
      await page.waitForTimeout(3000)
      await page.screenshot({ path: `screenshots/${dir}/${p.name}.png`, fullPage: true })
      console.log(`${dir}: ${p.name}`)
    } catch (e) {
      console.log(`${dir}: ${p.name} FAILED - ${e.message?.slice(0, 100)}`)
    }
  }

  await browser.close()
  console.log('Done')
}

main().catch(e => { console.error(e); process.exit(1) })
