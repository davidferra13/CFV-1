import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3100'
const SCREENSHOT_DIR = 'screenshots/charity-test'

async function signIn(page: Page) {
  await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
    headers: { 'Content-Type': 'application/json' },
  })
}

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

test('Community Impact page renders without error boundary', async ({ page }) => {
  await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })

  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  try {
    await page.goto(`${BASE_URL}/charity`, { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    await page.goto(`${BASE_URL}/charity`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  }
  await page.waitForTimeout(2000)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/charity.png`, fullPage: true })

  const bodyText = await page.locator('body').innerText()
  console.log('Title:', await page.title())
  console.log('Body preview:', bodyText.substring(0, 400))
  console.log('Console errors:', consoleErrors)

  expect(bodyText).not.toContain('Something went wrong')
  expect(bodyText).not.toContain('Application error')
  expect(bodyText.trim().length).toBeGreaterThan(50)
})

test('Volunteer Log page renders without error boundary', async ({ page }) => {
  await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })

  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  try {
    await page.goto(`${BASE_URL}/charity/hours`, { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    await page.goto(`${BASE_URL}/charity/hours`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  }
  await page.waitForTimeout(2000)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/charity-hours.png`, fullPage: true })

  const bodyText = await page.locator('body').innerText()
  console.log('Title:', await page.title())
  console.log('Body preview:', bodyText.substring(0, 400))
  console.log('Console errors:', consoleErrors)

  expect(bodyText).not.toContain('Something went wrong')
  expect(bodyText).not.toContain('Application error')
  expect(bodyText.trim().length).toBeGreaterThan(50)
})

test('Client Insights page renders without error boundary', async ({ page }) => {
  await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })

  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(e.message))

  try {
    await page.goto(`${BASE_URL}/clients/insights`, { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    await page.goto(`${BASE_URL}/clients/insights`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
  }
  await page.waitForTimeout(2000)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/clients-insights.png`, fullPage: true })

  const bodyText = await page.locator('body').innerText()
  console.log('Title:', await page.title())
  console.log('Body preview:', bodyText.substring(0, 400))
  console.log('Console errors:', consoleErrors)

  expect(bodyText).not.toContain('Something went wrong')
  expect(bodyText).not.toContain('Application error')
  expect(bodyText.trim().length).toBeGreaterThan(50)
})
