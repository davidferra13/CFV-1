// Refresh Playwright auth state for ALL demo accounts.
// Signs in via the e2e auth API and saves storageState files
// that the demo video recorder uses.
//
// Usage: node scripts/refresh-demo-auth.mjs
//        node scripts/refresh-demo-auth.mjs --base-url http://beta.cheflowhq.com
//
// Output files:
//   .auth/demo.json        (demo chef - Chef Isabella Torres)
//   .auth/client.json      (demo client - Sarah Chen)
//   .auth/staff.json       (demo staff - Maria Santos)
//   .auth/partner.json     (demo partner - The Langham)
//   .auth/demo-b.json      (demo chef B - Chef Marcus Rivera)
//   .auth/chef-bob.state.json (Chef Bob - golden-case rehearsal)

import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'fs'

const baseUrlIdx = process.argv.indexOf('--base-url')
const BASE = baseUrlIdx !== -1 && process.argv[baseUrlIdx + 1]
  ? process.argv[baseUrlIdx + 1]
  : 'http://localhost:3100'

const ACCOUNTS = [
  { credFile: '.auth/demo-chef.json',    outputFile: '.auth/demo.json',    label: 'Demo Chef',    landingPath: '/dashboard' },
  { credFile: '.auth/demo-client.json',  outputFile: '.auth/client.json',  label: 'Demo Client',  landingPath: '/my-events' },
  { credFile: '.auth/demo-staff.json',   outputFile: '.auth/staff.json',   label: 'Demo Staff',   landingPath: '/my-schedule' },
  { credFile: '.auth/demo-partner.json', outputFile: '.auth/partner.json', label: 'Demo Partner', landingPath: '/partner' },
  { credFile: '.auth/demo-chef-b.json',  outputFile: '.auth/demo-b.json',  label: 'Demo Chef B',  landingPath: '/dashboard' },
  { credFile: '.auth/chef-bob.json',     outputFile: '.auth/chef-bob.state.json', label: 'Chef Bob', landingPath: '/dashboard' },
]

async function authAccount(browser, account) {
  if (!existsSync(account.credFile)) {
    console.log(`  SKIP ${account.label}: ${account.credFile} not found`)
    return false
  }

  const creds = JSON.parse(readFileSync(account.credFile, 'utf-8'))
  const email = creds.email
  const password = creds.password

  console.log(`  ${account.label} (${email})...`)

  // Auth via API
  const resp = await fetch(`${BASE}/api/e2e/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  })

  if (!resp.ok) {
    console.log(`    FAIL: API returned ${resp.status}`)
    return false
  }

  // Extract cookies
  const setCookieHeaders = resp.headers.getSetCookie?.() || []
  const cookies = setCookieHeaders.map(header => {
    const parts = header.split(';').map(p => p.trim())
    const [nameValue, ...attrs] = parts
    const [name, ...valueParts] = nameValue.split('=')
    const value = valueParts.join('=')
    const cookie = { name, value, domain: new URL(BASE).hostname, path: '/' }
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

  // Create context, inject cookies, navigate to verify
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })

  if (cookies.length > 0) {
    await ctx.addCookies(cookies)
  }

  // Pre-accept cookie consent
  await ctx.addCookies([
    { name: 'cookieConsent', value: 'accepted', domain: new URL(BASE).hostname, path: '/' },
  ])

  const page = await ctx.newPage()
  await page.goto(`${BASE}${account.landingPath}`, { timeout: 120000, waitUntil: 'commit' })
  await page.waitForTimeout(5000)

  const url = page.url()
  const onTarget = url.includes(account.landingPath) || url.includes('/dashboard')

  if (!onTarget && url.includes('sign')) {
    // Fallback: sign in via UI
    console.log(`    API auth didn't stick, trying UI sign-in...`)
    await page.goto(`${BASE}/sign-in`, { timeout: 60000, waitUntil: 'commit' })
    await page.waitForTimeout(3000)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(email)
      await page.fill('input[type="password"], input[name="password"]', password)
      await page.click('button[type="submit"]')
      await page.waitForTimeout(8000)
    }
  }

  await ctx.storageState({ path: account.outputFile })
  console.log(`    OK -> ${account.outputFile}`)
  await page.close()
  await ctx.close()
  return true
}

async function main() {
  console.log(`Refreshing demo auth states (${BASE})`)
  console.log('')

  const browser = await chromium.launch({ headless: true })
  let success = 0

  for (const account of ACCOUNTS) {
    const ok = await authAccount(browser, account)
    if (ok) success++
  }

  await browser.close()

  console.log('')
  console.log(`Done: ${success}/${ACCOUNTS.length} accounts authenticated`)
  if (success < ACCOUNTS.length) {
    console.log('Run `npm run demo:setup` first to create missing accounts')
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
