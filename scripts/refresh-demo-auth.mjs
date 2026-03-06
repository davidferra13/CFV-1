// Refresh demo auth state using fetch + cookie injection into Playwright context
import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function main() {
  // Step 1: Auth via native fetch to get Set-Cookie headers
  console.log('Authenticating via fetch...')
  const resp = await fetch(`${BASE}/api/e2e/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }),
    redirect: 'manual',
  })
  console.log('Status:', resp.status)

  if (!resp.ok) {
    console.log('Body:', await resp.text())
    process.exit(1)
  }

  // Extract cookies from response
  const setCookieHeaders = resp.headers.getSetCookie?.() || []
  console.log('Got', setCookieHeaders.length, 'Set-Cookie headers')

  // Parse cookies for Playwright
  const cookies = setCookieHeaders.map(header => {
    const parts = header.split(';').map(p => p.trim())
    const [nameValue, ...attrs] = parts
    const [name, ...valueParts] = nameValue.split('=')
    const value = valueParts.join('=')
    const cookie = { name, value, domain: 'localhost', path: '/' }
    for (const attr of attrs) {
      const [key, val] = attr.split('=')
      if (key.toLowerCase() === 'path') cookie.path = val
      if (key.toLowerCase() === 'max-age') cookie.expires = Date.now() / 1000 + parseInt(val)
      if (key.toLowerCase() === 'httponly') cookie.httpOnly = true
      if (key.toLowerCase() === 'secure') cookie.secure = true
      if (key.toLowerCase() === 'samesite') {
        const v = (val || '').charAt(0).toUpperCase() + (val || '').slice(1).toLowerCase()
        if (['Strict', 'Lax', 'None'].includes(v)) cookie.sameSite = v
      }
    }
    return cookie
  })

  // Step 2: Create Playwright context with these cookies
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })

  if (cookies.length > 0) {
    await ctx.addCookies(cookies)
  }

  // Also decline cookie consent
  await ctx.addCookies([{ name: 'cookieConsent', value: 'declined', domain: 'localhost', path: '/' }])

  const page = await ctx.newPage()
  console.log('Navigating to dashboard...')
  await page.goto(`${BASE}/dashboard`, { timeout: 120000, waitUntil: 'commit' })
  await page.waitForTimeout(5000)
  console.log('URL:', page.url())

  const isDashboard = page.url().includes('/dashboard')
  if (!isDashboard) {
    console.log('Auth may have failed - not on dashboard. Trying sign-in via page...')
    // Fallback: sign in via UI
    await page.goto(`${BASE}/sign-in`, { timeout: 60000, waitUntil: 'commit' })
    await page.waitForTimeout(3000)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill('agent@chefflow.test')
      await page.fill('input[type="password"], input[name="password"]', 'AgentChefFlow!2026')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(8000)
      console.log('After sign-in URL:', page.url())
    }
  }

  await ctx.storageState({ path: '.auth/demo.json' })
  console.log('Saved .auth/demo.json')
  await browser.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })
