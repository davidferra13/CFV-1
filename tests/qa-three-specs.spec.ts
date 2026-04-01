import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = 'http://localhost:3100'
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'qa-2026-04-01')
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function signIn(page: any) {
  const resp = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const body = await resp.json()
  if (!body.ok) throw new Error('Auth failed: ' + JSON.stringify(body))
  await page.goto(`${BASE}/dashboard`)
  await page.waitForLoadState('networkidle')
}

async function shot(page: any, name: string) {
  const p = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: p, fullPage: true })
  console.log('Screenshot: ' + p)
}

test('01 network page loads', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/network`)
  await page.waitForLoadState('networkidle')
  await shot(page, '01-network-page')
  const collabCount = await page.locator('text=Collab').count()
  console.log('Collab elements: ' + collabCount)
})

test('01 collab tab and bridge elements', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/network`)
  await page.waitForLoadState('networkidle')
  const collabTab = page.locator('button:has-text("Collab"), [role="tab"]:has-text("Collab")')
  if ((await collabTab.count()) > 0) {
    await collabTab.first().click()
    await page.waitForLoadState('networkidle')
    await shot(page, '01-collab-tab-active')
  }
  const startIntroBtn = await page
    .locator('button:has-text("Start Intro"), button:has-text("Introduction")')
    .count()
  console.log('Start Intro buttons: ' + startIntroBtn)
  await shot(page, '01-collab-intro-check')
})

test('01 bridge route exists', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/network/bridges/test-id`)
  await page.waitForLoadState('networkidle')
  console.log('Bridge route URL: ' + page.url())
  await shot(page, '01-bridge-route')
})

test('02 catalog store picker entry', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/culinary/price-catalog`)
  await page.waitForLoadState('networkidle')
  await shot(page, '02-catalog-initial')
  const storePicker = await page
    .locator('text=All Stores, text=My Stores, text=Pick a store')
    .count()
  console.log('Store picker: ' + storePicker)
  const confidenceJargon = await page.locator('text=Confidence').count()
  const sourceJargon = await page.locator('th:has-text("Source")').count()
  console.log('Dev jargon Confidence: ' + confidenceJargon + ', Source col: ' + sourceJargon)
})

test('02 catalog stock badge and images', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/culinary/price-catalog`)
  await page.waitForLoadState('networkidle')
  const stockBadge = await page.locator('text=Out of Stock, text=In Stock').count()
  console.log('Stock badges: ' + stockBadge)
  await shot(page, '02-catalog-full')
})

test('03 events list', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/events`)
  await page.waitForLoadState('networkidle')
  await shot(page, '03-events-list')
  const eventLinks = await page.locator('a[href*="/events/"]:not([href*="/events/new"])').count()
  console.log('Event links: ' + eventLinks)
})

test('03 prep plan section on ops tab', async ({ page }) => {
  await signIn(page)
  await page.goto(`${BASE}/events`)
  await page.waitForLoadState('networkidle')
  const eventLinks = page.locator('a[href*="/events/"]:not([href*="/events/new"])')
  const count = await eventLinks.count()
  if (count > 0) {
    const href = await eventLinks.first().getAttribute('href')
    await page.goto(`${BASE}${href}`)
    await page.waitForLoadState('networkidle')
    await shot(page, '03-event-detail')
    const opsTab = page.locator('button:has-text("Ops"), [role="tab"]:has-text("Ops")')
    if ((await opsTab.count()) > 0) {
      await opsTab.first().click()
      await page.waitForLoadState('networkidle')
      await shot(page, '03-ops-tab')
      const prepPlan = await page.locator('text=Prep Plan').count()
      console.log('Prep Plan text: ' + prepPlan)
      await shot(page, '03-prep-plan')
    } else {
      await shot(page, '03-no-ops-tab')
      console.log('No Ops tab found')
    }
  } else {
    await shot(page, '03-no-events')
    console.log('No events found')
  }
})
