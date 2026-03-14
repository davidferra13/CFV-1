import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Listen for ALL console messages
  page.on('console', (msg) => {
    console.log(`[${msg.type()}] ${msg.text().slice(0, 200)}`)
  })
  page.on('pageerror', (err) => {
    console.log(`[PAGE_ERROR] ${err.message.slice(0, 200)}`)
  })

  console.log('Navigating to sign-in...')
  await page.goto('http://localhost:3100/auth/signin', { timeout: 30_000 })
  console.log(`Status: ${page.url()}`)

  // Wait for JS to load
  console.log('Waiting 10s for JS...')
  await page.waitForTimeout(10000)

  // Check if React hydrated
  const hydrated = await page.evaluate(() => {
    const root = document.getElementById('__next')
    if (!root) return 'no __next'
    const keys = Object.keys(root)
    const reactKeys = keys.filter((k) => k.startsWith('__react'))
    return reactKeys.length > 0
      ? `hydrated (${reactKeys.join(', ')})`
      : `not hydrated (keys: ${keys.slice(0, 5).join(', ')})`
  })
  console.log(`React hydration: ${hydrated}`)

  // Check input
  const inputValue = await page.evaluate(() => {
    const input = document.querySelector('input[type="email"]') as HTMLInputElement
    if (!input) return 'no input found'
    const keys = Object.keys(input).filter((k) => k.startsWith('__react') || k.startsWith('_react'))
    return `found, react keys: ${keys.length > 0 ? keys.join(', ') : 'none'}`
  })
  console.log(`Email input: ${inputValue}`)

  // Try filling
  console.log('Attempting fill...')
  await page.click('input[type="email"]')
  await page.keyboard.type('test@test.com', { delay: 5 })

  const filledValue = await page.evaluate(() => {
    return (document.querySelector('input[type="email"]') as HTMLInputElement)?.value ?? 'null'
  })
  console.log(`Filled value: ${filledValue}`)

  await page.screenshot({ path: 'test-results/quick-test2.png' })
  console.log('Screenshot saved')

  await browser.close()
}

main().catch(console.error)
