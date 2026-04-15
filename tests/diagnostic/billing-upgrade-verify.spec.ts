import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOT_DIR = path.join(process.cwd(), 'qa-screenshots', 'billing-verify')

async function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

async function authenticate(page: Page) {
  const res = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const body = await res.json()
  if (!body.ok) throw new Error('Auth failed: ' + JSON.stringify(body))
  return body
}

test.beforeAll(async () => {
  ensureDir(SCREENSHOT_DIR)
})

test.use({ baseURL: BASE_URL })

test('1. Billing page - base view', async ({ page }) => {
  await authenticate(page)
  await page.goto(`${BASE_URL}/settings/billing`, { waitUntil: 'networkidle' })

  const title = await page.title()
  console.log('Page title:', title)

  const h1 = page.locator('h1, h2').first()
  const headingText = await h1.textContent().catch(() => 'no heading found')
  console.log('Main heading:', headingText)

  // Check for "Plans" heading
  const hasPlans = await page
    .getByText('Plans', { exact: false })
    .first()
    .isVisible()
    .catch(() => false)
  const hasSupportChefFlow = await page
    .getByText('Support ChefFlow', { exact: false })
    .first()
    .isVisible()
    .catch(() => false)
  const hasEverythingFree = await page
    .getByText('Everything is included for free', { exact: false })
    .first()
    .isVisible()
    .catch(() => false)
  const hasFreeTier = await page
    .getByText('Free', { exact: false })
    .first()
    .isVisible()
    .catch(() => false)
  const hasPaidTier = await page
    .getByText('Paid', { exact: false })
    .first()
    .isVisible()
    .catch(() => false)

  console.log('Has "Plans" heading:', hasPlans)
  console.log('Has "Support ChefFlow":', hasSupportChefFlow)
  console.log('Has "Everything is included for free":', hasEverythingFree)
  console.log('Has "Free" tier:', hasFreeTier)
  console.log('Has "Paid" tier:', hasPaidTier)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-billing-base.png'), fullPage: true })
  console.log('Screenshot saved: 01-billing-base.png')

  expect(hasPlans).toBe(true)
  expect(hasSupportChefFlow).toBe(false)
  expect(hasEverythingFree).toBe(false)
})

test('2. Billing page - with feature param', async ({ page }) => {
  await authenticate(page)
  await page.goto(`${BASE_URL}/settings/billing?feature=menu-costing-live`, {
    waitUntil: 'networkidle',
  })

  // Look for amber/highlight box with feature info
  const pageContent = await page.content()
  const hasLiveMenuCosting =
    pageContent.includes('Live Menu Costing') ||
    pageContent.includes('menu-costing-live') ||
    pageContent.includes('Menu Costing')
  console.log('Has feature highlight (Live Menu Costing):', hasLiveMenuCosting)

  // Check for amber styling classes
  const amberElements = await page.locator('[class*="amber"], [class*="yellow"]').count()
  console.log('Amber/yellow elements found:', amberElements)

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02-billing-feature-param.png'),
    fullPage: true,
  })
  console.log('Screenshot saved: 02-billing-feature-param.png')

  // Report what we see
  const bodyText = await page.locator('body').textContent()
  const featureBoxVisible =
    bodyText?.includes('Live Menu Costing') || bodyText?.includes('Menu Costing')
  console.log('Feature name visible in page:', featureBoxVisible)
})

test('3. Costing page', async ({ page }) => {
  await authenticate(page)
  await page.goto(`${BASE_URL}/culinary/costing`, { waitUntil: 'networkidle' })

  const pageTitle = await page.title()
  console.log('Costing page title:', pageTitle)

  // Check for amber inline banners
  const amberBanners = await page.locator('[class*="amber"]').count()
  console.log('Amber banners:', amberBanners)

  // Check for specific banner text
  const recalcBanner = await page
    .getByText('recalculates automatically', { exact: false })
    .isVisible()
    .catch(() => false)
  const marginBanner = await page
    .getByText('target margin', { exact: false })
    .isVisible()
    .catch(() => false)
  console.log('Has "recalculates automatically" banner:', recalcBanner)
  console.log('Has "target margin" banner:', marginBanner)

  // Check for upgrade prompt component
  const upgradePrompt = await page
    .locator('[data-testid="upgrade-prompt"], .upgrade-prompt')
    .count()
  console.log('Upgrade prompt elements:', upgradePrompt)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-costing-page.png'), fullPage: true })
  console.log('Screenshot saved: 03-costing-page.png')
})

test('4. Analytics page - amber banner at top', async ({ page }) => {
  await authenticate(page)
  await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' })

  const pageTitle = await page.title()
  console.log('Analytics page title:', pageTitle)

  // Check for the specific amber banner text
  const nextDaysBanner = await page
    .getByText('next 90 days', { exact: false })
    .isVisible()
    .catch(() => false)
  const probabillyBanner = await page
    .getByText('probably look like', { exact: false })
    .isVisible()
    .catch(() => false)
  console.log('Has "next 90 days" banner:', nextDaysBanner)
  console.log('Has "probably look like" banner:', probabillyBanner)

  // Check amber elements
  const amberElements = await page.locator('[class*="amber"]').count()
  console.log('Amber elements:', amberElements)

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '04-analytics-page.png'),
    fullPage: true,
  })
  console.log('Screenshot saved: 04-analytics-page.png')
})

test('5. Events list + event financial page', async ({ page }) => {
  await authenticate(page)
  await page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle' })

  const pageTitle = await page.title()
  console.log('Events page title:', pageTitle)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05a-events-list.png'), fullPage: true })
  console.log('Screenshot saved: 05a-events-list.png')

  // Try to find an event link to click
  const eventLinks = await page.locator('a[href*="/events/"]').all()
  console.log('Event links found:', eventLinks.length)

  if (eventLinks.length > 0) {
    const href = await eventLinks[0].getAttribute('href')
    console.log('First event link:', href)

    // Navigate to financial tab of first event
    if (href) {
      const eventId = href.split('/events/')[1]?.split('/')[0]
      if (eventId) {
        await page.goto(`${BASE_URL}/events/${eventId}/financial`, { waitUntil: 'networkidle' })

        const amberBanners = await page.locator('[class*="amber"]').count()
        console.log('Amber banners on event financial page:', amberBanners)

        const upgradeBanner = await page
          .getByText('upgrade', { exact: false })
          .isVisible()
          .catch(() => false)
        console.log('Has upgrade text on financial page:', upgradeBanner)

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '05b-event-financial.png'),
          fullPage: true,
        })
        console.log('Screenshot saved: 05b-event-financial.png')
      }
    }
  } else {
    console.log('No events found - skipping financial page test')
  }
})
