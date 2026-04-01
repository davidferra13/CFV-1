import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'

const BASE_URL = 'http://localhost:3100'
const DIR = '.auth/wave-a-screenshots'
mkdirSync(DIR, { recursive: true })

const EMAIL = 'davidferra13@gmail.com'
const PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  console.log('[wave-a] Signing in via form...')
  await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  console.log('[wave-a] At sign-in page, URL:', page.url())
  await page.screenshot({ path: `${DIR}/01-signin.png` })

  // Fill credentials
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.screenshot({ path: `${DIR}/02-filled.png` })
  await page.locator('button[type="submit"]').click()

  // Wait for navigation away from auth pages
  try {
    await page.waitForURL((url) => !url.toString().includes('/auth/'), { timeout: 15000 })
    console.log('[wave-a] Signed in, URL:', page.url())
  } catch {
    console.log('[wave-a] waitForURL timed out, current URL:', page.url())
    await page.screenshot({ path: `${DIR}/signin-error.png` })
    // Try reading any error
    const bodyText = await page.textContent('body')
    console.log('[wave-a] Body snippet:', bodyText?.slice(0, 200))
  }
  await page.screenshot({ path: `${DIR}/03-post-signin.png` })

  const currentURL = page.url()
  if (currentURL.includes('/auth/')) {
    console.error('[wave-a] Still on auth page - sign-in failed')
    await browser.close()
    process.exit(1)
  }

  const results: Record<string, boolean> = {}

  // ---- A1: OpenClaw Total Capture Phase 1 ----
  console.log('\n[A1] Price catalog...')
  await page.goto(`${BASE_URL}/culinary/price-catalog`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  })
  await page.screenshot({ path: `${DIR}/a1-price-catalog.png` })
  const a1Text = (await page.textContent('body')) ?? ''
  results.a1_catalog_loads =
    !a1Text.includes('Application error') && !a1Text.includes('This page could not be found')
  results.a1_has_price_context =
    a1Text.toLowerCase().includes('price') || a1Text.toLowerCase().includes('catalog')
  console.log(
    '[A1] catalog loads:',
    results.a1_catalog_loads,
    '| price context:',
    results.a1_has_price_context
  )

  // ---- A2: Golden Path Reliability ----
  const a2Pages: [string, string][] = [
    ['recipes_new', '/recipes/new'],
    ['ingredients', '/recipes/ingredients'],
    ['costing', '/culinary/costing'],
    ['dish_index', '/culinary/dish-index'],
    ['menus', '/menus'],
    ['menus_new', '/menus/new'],
  ]
  for (const [key, url] of a2Pages) {
    console.log(`\n[A2] ${url}...`)
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.screenshot({ path: `${DIR}/a2-${key}.png` })
    const t = (await page.textContent('body')) ?? ''
    results[`a2_${key}`] =
      !t.includes('Application error') &&
      !t.includes('unhandled') &&
      !t.includes('This page could not be found')
    console.log(`[A2] ${url}: ${results[`a2_${key}`]}`)
  }

  // ---- A3: Pricing Override Infrastructure ----
  const a3Pages: [string, string][] = [
    ['quotes', '/quotes'],
    ['events', '/events'],
  ]
  for (const [key, url] of a3Pages) {
    console.log(`\n[A3] ${url}...`)
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.screenshot({ path: `${DIR}/a3-${key}.png` })
    const t = (await page.textContent('body')) ?? ''
    results[`a3_${key}_loads`] =
      !t.includes('Application error') && !t.includes('This page could not be found')
    console.log(`[A3] ${url}: ${results[`a3_${key}_loads`]}`)
  }

  const allPassed = Object.values(results).every((v) => v === true)
  console.log('\n=== WAVE A RESULTS ===')
  console.log(JSON.stringify(results, null, 2))
  console.log('\nAll passed:', allPassed)

  writeFileSync(
    `${DIR}/results.json`,
    JSON.stringify({ results, allPassed, timestamp: new Date().toISOString() }, null, 2)
  )
  await browser.close()
  console.log('\nDone. Screenshots in', DIR)
}

run().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
