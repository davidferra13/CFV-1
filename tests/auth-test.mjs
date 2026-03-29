import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const BASE = 'https://beta.cheflowhq.com'

// Step 1: Get CSRF token from Next-Auth
console.log('1. Getting CSRF token...')
const csrfRes = await page.request.get(`${BASE}/api/auth/csrf`)
console.log('   CSRF status:', csrfRes.status())
const csrfText = await csrfRes.text()
console.log('   CSRF body:', csrfText.slice(0, 200))
const csrfData = JSON.parse(csrfText || '{}')
console.log('   CSRF token:', csrfData.csrfToken?.slice(0, 20) + '...')

// Step 2: POST to Next-Auth credentials callback
console.log('2. POSTing to credentials callback...')
const callbackRes = await page.request.post(`${BASE}/api/auth/callback/credentials`, {
  form: {
    email: 'davidferra13@gmail.com',
    password: process.env.DEV_PASSWORD || 'CHEF.jdgyuegf9924092.FLOW',
    csrfToken: csrfData.csrfToken,
    callbackUrl: `${BASE}/dashboard`,
    json: 'true',
  },
})
console.log('   Callback status:', callbackRes.status())
const callbackHeaders = callbackRes.headers()
console.log('   Location header:', callbackHeaders['location'] || 'none')
const callbackBody = await callbackRes.text()
console.log('   Response:', callbackBody.slice(0, 300))

// Step 3: Check cookies
const cookies = await context.cookies()
const authCookies = cookies.filter(c => c.name.includes('session') || c.name.includes('auth'))
console.log('   Auth cookies:', authCookies.map(c => `${c.name} (${c.value.slice(0, 15)}...)`))

// Step 4: Try hitting dashboard
console.log('3. Navigating to dashboard...')
await page.goto(`${BASE}/dashboard`, { timeout: 30000 })
await page.waitForTimeout(3000)
console.log('   URL:', page.url())
await page.screenshot({ path: 'tests/screenshots/auth-test-dashboard.png', fullPage: true })

const isAuthenticated = !page.url().includes('auth') && !page.url().includes('sign-in')
console.log(isAuthenticated ? 'AUTHENTICATED!' : 'NOT AUTHENTICATED')

await browser.close()
