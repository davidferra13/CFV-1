import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOT_DIR = 'C:/Users/david/Documents/CFv1/qa-screenshots/billing-verify'

async function authAndGo(page: Page, url: string, timeout = 60000) {
  const res = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const body = await res.json()
  if (!body.ok) throw new Error('Auth failed')
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
  await page.waitForTimeout(3000)
}

test.use({ baseURL: BASE_URL })

test('costing page long timeout', async ({ page }) => {
  test.setTimeout(90000)
  await authAndGo(page, `${BASE_URL}/culinary/costing`, 60000)

  const url = page.url()
  console.log('Final URL:', url)

  const bodyText = await page.locator('body').textContent()
  console.log('Has "recalculates automatically":', bodyText?.includes('recalculates automatically'))
  console.log('Has "target margin":', bodyText?.includes('target margin'))
  console.log('Has "This recalculates":', bodyText?.includes('This recalculates'))
  console.log('Has "Set your target":', bodyText?.includes('Set your target'))
  console.log('Has "UpgradePrompt":', bodyText?.includes('UpgradePrompt'))
  console.log('Has "upgrade":', bodyText?.toLowerCase().includes('upgrade'))

  const amberCount = await page.locator('[class*="amber"]').count()
  console.log('Amber elements:', amberCount)

  // Look for any banner-like containers
  const banners = await page.locator('div[class*="border"], div[class*="rounded"]').count()
  console.log('Border/rounded divs:', banners)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-costing.png`, fullPage: true })
  console.log('Screenshot: 03-costing.png')
})

test('events - find real event ID', async ({ page }) => {
  test.setTimeout(60000)
  await authAndGo(page, `${BASE_URL}/events`, 30000)

  // Find all links that look like real UUIDs or slugs to real events
  const links = await page.locator('a[href*="/events/"]').all()

  const hrefs: string[] = []
  for (const link of links) {
    const href = await link.getAttribute('href')
    if (href && href.includes('/events/') && !href.endsWith('/events/')) {
      const slug = href.split('/events/')[1]?.split('/')[0]
      if (slug && slug.length > 4 && !hrefs.includes(slug)) {
        hrefs.push(slug)
      }
    }
  }
  console.log('Event slugs/IDs:', hrefs.slice(0, 10))

  // Try to navigate to the first one that's a real event (not a static page)
  for (const slug of hrefs.slice(0, 5)) {
    await page.goto(`${BASE_URL}/events/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const bodyText = await page.locator('body').textContent()
    const isRealEvent =
      !bodyText?.includes('Page not found') && !bodyText?.includes("doesn't exist")
    console.log(`Event "${slug}" is real:`, isRealEvent)

    if (isRealEvent) {
      // Now go to financial tab
      await page.goto(`${BASE_URL}/events/${slug}/financial`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await page.waitForTimeout(2000)

      const finUrl = page.url()
      console.log('Financial URL:', finUrl)
      const finBody = await page.locator('body').textContent()
      const amberCount = await page.locator('[class*="amber"]').count()
      console.log('Amber on financial:', amberCount)
      console.log('Has upgrade:', finBody?.toLowerCase().includes('upgrade'))
      console.log('Has "margin":', finBody?.toLowerCase().includes('margin'))

      await page.screenshot({ path: `${SCREENSHOT_DIR}/05b-event-financial.png`, fullPage: true })
      console.log('Screenshot: 05b-event-financial.png')
      break
    }
  }
})
