import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('Posting auth...')
  const resp = await page.request.post(BASE + '/api/e2e/auth', {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
    timeout: 30000,
  })
  
  const body = await resp.json()
  console.log('Auth response:', JSON.stringify(body))
  console.log('Status:', resp.status())
  
  // Navigate to a page to verify auth works
  console.log('Navigating to dashboard...')
  await page.goto(BASE + '/dashboard', { timeout: 60000 })
  console.log('Current URL:', page.url())
  
  if (!page.url().includes('/dashboard')) {
    console.error('Auth failed - redirected to:', page.url())
    await page.screenshot({ path: '.auth/agent-setup-fail.png' })
    process.exit(1)
  }
  
  console.log('Auth working! Saving storage state...')
  await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE }])
  await context.storageState({ path: '.auth/agent-state.json' })
  console.log('Storage state saved to .auth/agent-state.json')
  
  await browser.close()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
