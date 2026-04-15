import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOT_DIR = 'C:/Users/david/Documents/CFv1/qa-screenshots/billing-verify'

async function authAndGo(page: Page, url: string, timeout = 30000) {
  // Dismiss service worker update if present
  await page.addInitScript(() => {
    // Prevent service worker from intercepting
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
      })
    }
  })

  const res = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const body = await res.json()
  if (!body.ok) throw new Error('Auth failed')

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout })

  // If service worker update dialog appears, reload
  const updateDialog = page.getByText('Updating app', { exact: false })
  if (await updateDialog.isVisible().catch(() => false)) {
    console.log('Service worker update dialog detected, clicking Reload')
    const reloadBtn = page.getByRole('button', { name: /reload/i })
    if (await reloadBtn.isVisible().catch(() => false)) {
      await reloadBtn.click()
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 })
    }
  }

  await page.waitForTimeout(2000)
}

test.use({ baseURL: BASE_URL })

test('costing page with SW bypass', async ({ page }) => {
  test.setTimeout(120000)

  // Unregister service workers first
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) await reg.unregister()
    }
  })

  const authRes = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const authBody = await authRes.json()
  console.log('Auth result:', authBody.ok)

  await page.goto(`${BASE_URL}/culinary/costing`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(3000)

  const url = page.url()
  console.log('Costing URL:', url)

  // Check if service worker dialog is still there
  const bodyText = await page.locator('body').textContent()
  console.log('Has SW update text:', bodyText?.includes('Updating app'))
  console.log('Has "recalculates automatically":', bodyText?.includes('recalculates automatically'))
  console.log('Has "target margin":', bodyText?.includes('target margin'))
  console.log('Has "upgrade":', bodyText?.toLowerCase().includes('upgrade'))

  const amberCount = await page.locator('[class*="amber"]').count()
  console.log('Amber elements:', amberCount)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-costing.png`, fullPage: true })
  console.log('Screenshot: 03-costing.png')
})

test('event financial with real UUID', async ({ page }) => {
  test.setTimeout(60000)

  // Unregister service workers
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) await reg.unregister()
    }
  })

  const authRes = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  const authBody = await authRes.json()
  console.log('Auth:', authBody.ok)

  // Try the real UUID event
  const realEventId = '1c47f359-cf7b-4b0c-ac84-882e36995e87'

  await page.goto(`${BASE_URL}/events/${realEventId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(2000)

  const eventBody = await page.locator('body').textContent()
  console.log('Event page - is real event:', !eventBody?.includes('Page not found'))
  console.log('Event page title area:', eventBody?.slice(0, 200))

  await page.screenshot({ path: `${SCREENSHOT_DIR}/05a-event-detail.png`, fullPage: true })

  // Navigate to financial tab
  await page.goto(`${BASE_URL}/events/${realEventId}/financial`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(3000)

  const finUrl = page.url()
  console.log('Financial URL:', finUrl)

  const finBody = await page.locator('body').textContent()
  const amberCount = await page.locator('[class*="amber"]').count()
  console.log('Financial page - Amber elements:', amberCount)
  console.log('Has upgrade text:', finBody?.toLowerCase().includes('upgrade'))
  console.log('Has "Page not found":', finBody?.includes('Page not found'))

  await page.screenshot({ path: `${SCREENSHOT_DIR}/05b-event-financial.png`, fullPage: true })
  console.log('Screenshot: 05b-event-financial.png')
})
