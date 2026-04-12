/**
 * One-time setup: sign in as the developer on the PRODUCTION site and save the session.
 * Run with: node scripts/save-developer-session.mjs
 *
 * Output: .auth/developer-storage.json
 * Re-run if the session expires.
 */

import { chromium } from '@playwright/test'
import { writeFileSync } from 'fs'

const BASE_URL = 'https://app.cheflowhq.com'
const OUTPUT = '.auth/developer-storage.json'
const EMAIL = 'davidferra13@gmail.com'
const PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'

console.log(`Signing into production: ${BASE_URL}`)
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'load', timeout: 60000 })

await page.locator('input[type="email"]').first().fill(EMAIL)
await page.locator('input[type="password"]').first().fill(PASSWORD)
await page.locator('input[type="password"]').first().press('Enter')

await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 30000 })
console.log(`Signed in. URL: ${page.url()}`)

const storageState = await context.storageState()
writeFileSync(OUTPUT, JSON.stringify(storageState, null, 2))
console.log(`Production session saved to ${OUTPUT}`)

await browser.close()
