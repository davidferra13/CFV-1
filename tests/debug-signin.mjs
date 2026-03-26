import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

// Listen for auth-related responses
page.on('response', r => {
  if (r.url().includes('auth') || r.url().includes('sign') || r.url().includes('csrf') || r.url().includes('callback')) {
    console.log(`  [${r.status()}] ${r.url().slice(0, 120)}`)
  }
})

console.log('1. Going to sign-in page...')
await page.goto('http://localhost:3200/sign-in', { timeout: 30000 })
await page.waitForTimeout(2000)
console.log('   URL after load:', page.url())

// Screenshot what we see
await page.screenshot({ path: 'tests/screenshots/debug-1-signin-page.png' })

// Get form elements
const formInfo = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input')).map(e => ({
    type: e.type, name: e.name, id: e.id, placeholder: e.placeholder
  }))
  const buttons = Array.from(document.querySelectorAll('button')).map(e => ({
    text: (e.textContent || '').trim().slice(0, 50), type: e.type
  }))
  const forms = Array.from(document.querySelectorAll('form')).map(e => ({
    action: e.action, method: e.method
  }))
  return { inputs, buttons, forms }
})
console.log('   Inputs:', JSON.stringify(formInfo.inputs))
console.log('   Buttons:', JSON.stringify(formInfo.buttons))
console.log('   Forms:', JSON.stringify(formInfo.forms))

console.log('\n2. Filling credentials...')
await page.fill('input[type="email"]', 'davidferra13@gmail.com')
await page.fill('input[type="password"]', 'TDtd1943!')
await page.screenshot({ path: 'tests/screenshots/debug-2-filled.png' })

console.log('3. Clicking submit and waiting for navigation...')
const navPromise = page.waitForNavigation({ timeout: 20000 }).catch(e => {
  console.log('   No full navigation detected:', e.message.slice(0, 80))
  return null
})
await page.click('button[type="submit"]')
await navPromise
await page.waitForTimeout(5000)
console.log('   URL after submit:', page.url())
await page.screenshot({ path: 'tests/screenshots/debug-3-after-submit.png' })

// Check cookies
const cookies = await context.cookies()
const authCookies = cookies.filter(c => c.name.includes('session') || c.name.includes('auth') || c.name.includes('csrf'))
console.log('   Auth cookies:', authCookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`))

// Check for error messages
const errors = await page.evaluate(() => {
  const els = document.querySelectorAll('[role="alert"], .error, .text-red-500, .text-destructive, [data-error]')
  return Array.from(els).map(e => (e.textContent || '').trim().slice(0, 100))
})
if (errors.length) console.log('   Error messages:', errors)

// Try navigating to dashboard
console.log('\n4. Attempting to navigate to dashboard...')
await page.goto('http://localhost:3200/dashboard', { timeout: 20000 })
await page.waitForTimeout(3000)
console.log('   Dashboard URL:', page.url())
await page.screenshot({ path: 'tests/screenshots/debug-4-dashboard.png' })

await browser.close()
console.log('\nDone! Check tests/screenshots/debug-*.png')
