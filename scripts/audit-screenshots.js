const { chromium } = require('playwright')

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  // Sign in via API
  const response = await page.request.post('http://localhost:3100/api/e2e/auth', {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })

  const status = response.status()
  console.log('Auth status:', status)

  if (status !== 200) {
    console.error('Auth failed:', status, await response.text())
    await browser.close()
    process.exit(1)
  }

  const authData = await response.json()
  console.log('Auth response keys:', Object.keys(authData))

  // Set cookies if returned
  if (authData.cookies) {
    await context.addCookies(authData.cookies)
    console.log('Set', authData.cookies.length, 'cookies')
  }

  // Navigate to dashboard first to confirm auth
  await page.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  console.log('Dashboard URL after nav:', page.url())
  await page.screenshot({
    path: '/c/Users/david/Documents/CFv1/screenshots/audit-dashboard-check.png',
  })
  console.log('Dashboard screenshot saved')

  await browser.close()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
