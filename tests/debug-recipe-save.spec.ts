import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE = 'http://localhost:3100'
const CREDS = { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }
const SSDIR = path.join(
  'C:',
  'Users',
  'david',
  'Documents',
  'CFv1',
  'test-results',
  'debug-recipe-save'
)

test.setTimeout(120000)

test('simple direct button test', async ({ page, context }) => {
  fs.mkdirSync(SSDIR, { recursive: true })

  const consoleLogs: string[] = []
  page.on('console', (msg) => {
    const t = msg.text()
    if (!t.includes('React DevTools') && !t.includes('ailed to load')) {
      consoleLogs.push(`${msg.type()}: ${t.substring(0, 300)}`)
    }
  })

  await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE }])
  const resp = await page.request.post(BASE + '/api/e2e/auth', { data: CREDS, timeout: 30000 })

  const allHeaders = resp.headersArray()
  let sessionCookieStr = ''
  for (const h of allHeaders) {
    if (h.name.toLowerCase() === 'set-cookie' && h.value.includes('authjs.session-token')) {
      const match = h.value.match(/(__Secure-authjs\.session-token|authjs\.session-token)=([^;]+)/)
      if (match) sessionCookieStr = match[1] + '=' + match[2]
    }
  }
  if (!sessionCookieStr) throw new Error('No session cookie')

  await context.route('**/*', async (route) => {
    const headers = { ...route.request().headers() }
    const existing = headers['cookie'] || ''
    headers['cookie'] = existing ? existing + '; ' + sessionCookieStr : sessionCookieStr
    await route.continue({ headers })
  })

  await page.goto(BASE + '/recipes/new', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  await page.locator('button').filter({ hasText: 'Manual Entry' }).first().click()
  await page.waitForTimeout(1000)

  const nameInput = page.locator('input[placeholder*="Diane"]').first()
  await nameInput.waitFor({ timeout: 5000 })
  const recipeName = 'SimpleTest ' + Date.now()
  await nameInput.fill(recipeName)
  await page.waitForTimeout(800) // Wait for React state to update

  // Verify React state via inputValue
  const inputVal = await nameInput.inputValue()
  console.log('Input value after fill:', inputVal)

  // Check button disabled state
  const saveBtn = page
    .locator('button')
    .filter({ hasText: /Save Recipe|Saving/ })
    .first()
  const btnText = await saveBtn.textContent().catch(() => '')
  const btnDisabled = await saveBtn.isDisabled().catch(() => true)
  console.log('Button text:', btnText, '| disabled:', btnDisabled)

  // Try clicking normally (not force)
  if (!btnDisabled) {
    await saveBtn.scrollIntoViewIfNeeded()

    // Screenshot before click
    await page.screenshot({ path: SSDIR + '/before-click.png' })

    await saveBtn.click() // normal click, not force

    // Wait for potential navigation
    await page.waitForTimeout(8000)

    console.log('URL after click:', page.url())
    await page.screenshot({ path: SSDIR + '/after-click.png' })

    // Log all console messages
    console.log('Console logs:')
    consoleLogs.forEach((l) => console.log(' ', l))
  } else {
    console.log('Button is disabled - checking why...')
    // Get the button element's disabled state from React
    const debug = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Save Recipe')
      )
      if (!btn) return { found: false }
      const input = document.querySelector('input[placeholder*="Diane"]') as HTMLInputElement
      return {
        found: true,
        btnDisabled: (btn as HTMLButtonElement).disabled,
        inputValue: input?.value || 'NOT FOUND',
      }
    })
    console.log('Debug:', JSON.stringify(debug))
  }
})
