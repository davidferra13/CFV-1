const { chromium } = require('playwright')
const fs = require('fs')

async function main() {
  const creds = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf8'))

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] })
  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  // Sign in via the e2e auth endpoint
  const res = await page.request.post('http://localhost:3100/api/e2e/auth', {
    data: { email: creds.email, password: creds.password },
    headers: { 'Content-Type': 'application/json' },
  })

  console.log('Auth response status:', res.status())
  console.log('Auth response:', await res.text())

  // Navigate to the animations page
  await page.goto('http://localhost:3100/admin/animations', { waitUntil: 'networkidle' })
  console.log('Page URL:', page.url())
  console.log('Page title:', await page.title())

  await page.screenshot({ path: 'scripts/animations-screenshot.png' })
  console.log('Screenshot saved')

  // Keep browser open for 120 seconds
  await new Promise((r) => setTimeout(r, 120000))
}

main().catch(console.error)
