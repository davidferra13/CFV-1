import { chromium } from '@playwright/test'
import { TEST_BASE_URL } from './helpers/runtime-base-url'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('Navigating to sign-in...')
  const resp = await page.goto(`${TEST_BASE_URL}/auth/signin`, {
    timeout: 30_000,
    waitUntil: 'load',
  })
  console.log(`Status: ${resp?.status()}`)
  console.log(`URL: ${page.url()}`)

  // Wait and screenshot
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'test-results/quick-signin.png' })
  console.log('Screenshot saved to test-results/quick-signin.png')

  // Check for email input
  const emailInputs = await page.locator('input[type="email"]').count()
  console.log(`Email inputs found: ${emailInputs}`)

  // Get body text length
  const bodyHtml = await page.innerHTML('body')
  console.log(`Body HTML length: ${bodyHtml.length}`)

  // Check page errors
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.waitForTimeout(2000)
  console.log(`Console errors: ${errors.length}`)
  for (const e of errors) console.log(`  - ${e.slice(0, 150)}`)

  await browser.close()
  console.log('Done')
}

main().catch(console.error)
