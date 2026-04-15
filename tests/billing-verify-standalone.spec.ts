import { test, expect, Page, chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOT_DIR = path.join('C:/Users/david/Documents/CFv1/qa-screenshots', 'billing-verify')

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

test.use({
  baseURL: BASE_URL,
  storageState: undefined,
})

async function authAndGo(page: Page, url: string) {
  // Hit auth endpoint
  const res = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const body = await res.json()
  expect(body.ok).toBeTruthy()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
}

test('billing-1: base billing page', async ({ page }) => {
  await authAndGo(page, `${BASE_URL}/settings/billing`)

  const url = page.url()
  console.log('Final URL:', url)

  const h1Text = await page
    .locator('h1')
    .first()
    .textContent()
    .catch(() => 'n/a')
  const h2Text = await page
    .locator('h2')
    .first()
    .textContent()
    .catch(() => 'n/a')
  console.log('h1:', h1Text)
  console.log('h2:', h2Text)

  const bodyText = await page.locator('body').textContent()
  console.log('Has "Plans":', bodyText?.includes('Plans'))
  console.log('Has "Support ChefFlow":', bodyText?.includes('Support ChefFlow'))
  console.log(
    'Has "Everything is included for free":',
    bodyText?.includes('Everything is included for free')
  )
  console.log('Has "Free":', bodyText?.includes('Free'))
  console.log('Has "Paid":', bodyText?.includes('Paid'))

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-billing-base.png'), fullPage: true })
  console.log('Screenshot: 01-billing-base.png')
})

test('billing-2: billing page with feature param', async ({ page }) => {
  await authAndGo(page, `${BASE_URL}/settings/billing?feature=menu-costing-live`)

  const bodyText = await page.locator('body').textContent()
  console.log('Has "Live Menu Costing":', bodyText?.includes('Live Menu Costing'))
  console.log('Has "Menu Costing":', bodyText?.includes('Menu Costing'))

  const amberCount = await page.locator('[class*="amber"]').count()
  console.log('Amber elements:', amberCount)

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02-billing-feature-param.png'),
    fullPage: true,
  })
  console.log('Screenshot: 02-billing-feature-param.png')
})

test('billing-3: costing page', async ({ page }) => {
  await authAndGo(page, `${BASE_URL}/culinary/costing`)

  const url = page.url()
  console.log('Final URL:', url)

  const bodyText = await page.locator('body').textContent()
  console.log('Has "recalculates automatically":', bodyText?.includes('recalculates automatically'))
  console.log('Has "target margin":', bodyText?.includes('target margin'))
  console.log('Has "This recalculates":', bodyText?.includes('This recalculates'))
  console.log('Has "Set your target":', bodyText?.includes('Set your target'))

  const amberCount = await page.locator('[class*="amber"]').count()
  console.log('Amber elements:', amberCount)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-costing.png'), fullPage: true })
  console.log('Screenshot: 03-costing.png')
})

test('billing-4: analytics page', async ({ page }) => {
  await authAndGo(page, `${BASE_URL}/analytics`)

  const url = page.url()
  console.log('Final URL:', url)

  const bodyText = await page.locator('body').textContent()
  console.log('Has "next 90 days":', bodyText?.includes('next 90 days'))
  console.log('Has "probably look like":', bodyText?.includes('probably look like'))
  console.log('Has "See what":', bodyText?.includes('See what'))

  const amberCount = await page.locator('[class*="amber"]').count()
  console.log('Amber elements:', amberCount)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-analytics.png'), fullPage: true })
  console.log('Screenshot: 04-analytics.png')
})

test('billing-5: event financial page', async ({ page }) => {
  await authAndGo(page, `${BASE_URL}/events`)

  const url = page.url()
  console.log('Final URL:', url)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05a-events-list.png'), fullPage: true })

  // Find first event link
  const eventLinks = await page.locator('a[href*="/events/"]').all()
  console.log('Event links found:', eventLinks.length)

  let navigatedToFinancial = false
  for (const link of eventLinks.slice(0, 5)) {
    const href = await link.getAttribute('href')
    if (!href) continue
    const parts = href.split('/events/')
    if (parts.length < 2) continue
    const eventSlug = parts[1].split('/')[0]
    if (!eventSlug || eventSlug.length < 5) continue

    console.log('Navigating to financial for event:', eventSlug)
    await page.goto(`${BASE_URL}/events/${eventSlug}/financial`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await page.waitForTimeout(2000)

    const finUrl = page.url()
    console.log('Financial page URL:', finUrl)

    const bodyText = await page.locator('body').textContent()
    const amberCount = await page.locator('[class*="amber"]').count()
    console.log('Amber elements on financial page:', amberCount)
    console.log('Has upgrade text:', bodyText?.toLowerCase().includes('upgrade'))

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05b-event-financial.png'),
      fullPage: true,
    })
    console.log('Screenshot: 05b-event-financial.png')
    navigatedToFinancial = true
    break
  }

  if (!navigatedToFinancial) {
    console.log('No suitable event found for financial page test')
  }
})
