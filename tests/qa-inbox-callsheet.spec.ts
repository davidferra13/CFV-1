import { test, expect } from '@playwright/test'
import * as fs from 'fs'

const BASE_URL = 'http://localhost:3100'
const SCREENSHOT_DIR = 'C:/Users/david/Documents/CFv1/qa-screenshots'

test.use({
  storageState: '.auth/agent-storage-fresh.json',
})

test('Inbox page', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  // Use domcontentloaded first, then wait for the page to settle
  await page.goto(`${BASE_URL}/inbox`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // Wait for load event
  await page.waitForLoadState('load', { timeout: 30000 })

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: `${SCREENSHOT_DIR}/inbox-page.png`, fullPage: true })
  console.log('[SCREENSHOT] inbox-page.png saved')

  const pageText = (await page.textContent('body')) || ''
  const currentUrl = page.url()
  console.log('[URL]', currentUrl)
  console.log('[HAS_ERROR]', pageText.includes('Something went wrong'))
  console.log('[HAS_INBOX_TEXT]', pageText.toLowerCase().includes('inbox'))
  console.log('[HAS_CF_EMAIL]', /cf-[a-z0-9]+@cheflowhq\.com/i.test(pageText))
  const emailMatch = pageText.match(/cf-[a-z0-9]+@cheflowhq\.com/i)
  if (emailMatch) console.log('[EMAIL_ADDRESS]', emailMatch[0])
  console.log('[BODY_SNIPPET_500]', pageText.substring(0, 500))
  console.log('[CONSOLE_ERRORS_COUNT]', consoleErrors.length)
  if (consoleErrors.length > 0)
    console.log('[CONSOLE_ERRORS]', consoleErrors.slice(0, 5).join(' | '))

  expect(currentUrl).not.toContain('/auth/signin')
  expect(pageText.includes('Something went wrong')).toBe(false)
})

test('Call sheet page', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto(`${BASE_URL}/culinary/call-sheet`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.waitForLoadState('load', { timeout: 30000 })

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: `${SCREENSHOT_DIR}/call-sheet-page.png`, fullPage: true })
  console.log('[SCREENSHOT] call-sheet-page.png saved')

  const pageText = (await page.textContent('body')) || ''
  const currentUrl = page.url()
  console.log('[URL]', currentUrl)
  console.log('[REDIRECTED_TO_PRICE_CATALOG]', currentUrl.includes('price-catalog'))
  console.log(
    '[HAS_CALL_ACCESS_REQUEST]',
    pageText.toLowerCase().includes('request access') ||
      pageText.toLowerCase().includes('calling access') ||
      pageText.toLowerCase().includes('call access')
  )
  console.log(
    '[HAS_CALL_SHEET_TABS]',
    pageText.toLowerCase().includes('call sheet') ||
      pageText.toLowerCase().includes('suppliers') ||
      pageText.toLowerCase().includes('vendor')
  )
  console.log('[HAS_ERROR]', pageText.includes('Something went wrong'))
  console.log('[BODY_SNIPPET_500]', pageText.substring(0, 500))
  console.log('[CONSOLE_ERRORS_COUNT]', consoleErrors.length)
  if (consoleErrors.length > 0)
    console.log('[CONSOLE_ERRORS]', consoleErrors.slice(0, 5).join(' | '))
})
