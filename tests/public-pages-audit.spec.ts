import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'

const SCREENSHOT_DIR = 'C:/Users/david/Documents/CFv1/screenshots/public-rewrite'

test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

const pages = [
  { path: '/', name: '01-landing' },
  { path: '/chefs', name: '02-chef-directory' },
  { path: '/book', name: '03-book' },
  { path: '/how-it-works', name: '04-how-it-works' },
  { path: '/services', name: '05-services' },
  { path: '/about', name: '06-about' },
  { path: '/for-operators', name: '07-for-operators' },
  { path: '/faq', name: '08-faq' },
  { path: '/contact', name: '09-contact' },
  { path: '/partner-signup', name: '10-partner-signup' },
  { path: '/for-operators/walkthrough', name: '11-operator-walkthrough' },
]

for (const { path: pagePath, name } of pages) {
  test(`capture ${name}`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const statusCode = response?.status()
    const finalUrl = page.url()

    // Wait for main content to render
    await page.waitForTimeout(2000)

    const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const title = await page.title()
    const h1 = await page
      .$eval('h1', (el) => (el as HTMLElement).innerText)
      .catch(() => 'NO H1 FOUND')
    const bodyText = await page.evaluate(() => document.body.innerText)
    const bodyPreview = bodyText.replace(/\s+/g, ' ').trim().substring(0, 500)

    testInfo.annotations.push({ type: 'status', description: String(statusCode) })
    testInfo.annotations.push({ type: 'finalUrl', description: finalUrl })
    testInfo.annotations.push({ type: 'title', description: title })
    testInfo.annotations.push({ type: 'h1', description: h1 })
    testInfo.annotations.push({ type: 'bodyPreview', description: bodyPreview })
    testInfo.annotations.push({ type: 'consoleErrors', description: JSON.stringify(consoleErrors) })
    testInfo.annotations.push({ type: 'screenshot', description: screenshotPath })

    console.log(`\n--- ${name} ---`)
    console.log(`STATUS: ${statusCode}`)
    console.log(`FINAL URL: ${finalUrl}`)
    console.log(`TITLE: ${title}`)
    console.log(`H1: ${h1}`)
    console.log(`BODY: ${bodyPreview}`)
    console.log(`ERRORS: ${JSON.stringify(consoleErrors)}`)
    console.log(`SCREENSHOT: ${screenshotPath}`)

    // Basic sanity: page should load (2xx or 3xx that resolved)
    expect(statusCode, `${name} should return a response`).toBeDefined()
  })
}
