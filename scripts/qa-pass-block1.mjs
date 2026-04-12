import { chromium } from '@playwright/test'
import { readFileSync, mkdirSync } from 'fs'

mkdirSync('./screenshots/qa-pass', { recursive: true })

const storageState = JSON.parse(readFileSync('./.auth/developer-storage.json', 'utf-8'))
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ 
  storageState,
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})
const page = await context.newPage()

const BASE = 'https://app.cheflowhq.com'
const SS = (name) => `./screenshots/qa-pass/${name}`
const errors = []

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`[console error] ${msg.text()}`)
})

async function goto(path, timeout=45000) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(3000)
  } catch(e) {
    console.log(`NAV ERROR for ${path}: ${e.message}`)
  }
}

// BLOCK 1: Dashboard
console.log('=== BLOCK 1: DASHBOARD ===')
await goto('/dashboard')
await page.screenshot({ path: SS('01-dashboard.png'), fullPage: false })
const dashboardTitle = await page.title()
console.log('Dashboard title:', dashboardTitle)
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(1500)
await page.screenshot({ path: SS('01-dashboard-bottom.png'), fullPage: false })
const dashboardFull = await page.evaluate(() => document.body.innerText.substring(0, 2000))
console.log('Dashboard full text:\n', dashboardFull)
await page.evaluate(() => window.scrollTo(0, 0))

const spinners = await page.$$('[class*="spinner"], [class*="loading"], [class*="skeleton"]')
console.log('Dashboard spinners/skeletons count:', spinners.length)

// BLOCK 2: Inbox
console.log('\n=== BLOCK 2: INBOX ===')
await goto('/inbox')
await page.screenshot({ path: SS('02-inbox.png'), fullPage: false })
const inboxContent = await page.evaluate(() => document.body.innerText.substring(0, 1500))
console.log('Inbox content:\n', inboxContent)

await goto('/inbox/history-scan')
await page.screenshot({ path: SS('03-history-scan.png'), fullPage: false })
const scanContent = await page.evaluate(() => document.body.innerText.substring(0, 2000))
console.log('History scan content:\n', scanContent)

const scanButtons = await page.$$('button')
const scanButtonTexts = await Promise.all(scanButtons.map(b => b.innerText()))
console.log('Scan page buttons:', scanButtonTexts.filter(t => t.trim().length > 0).join(' | '))

const startBtn = await page.$('button:has-text("Scan"), button:has-text("Start"), button:has-text("scan")')
if (startBtn) {
  console.log('Found scan button, clicking...')
  await startBtn.click()
  await page.waitForTimeout(15000)
  await page.screenshot({ path: SS('03-history-scan-after.png'), fullPage: false })
  const afterContent = await page.evaluate(() => document.body.innerText.substring(0, 1500))
  console.log('After scan content:\n', afterContent)
} else {
  console.log('No scan button found on history-scan page')
  await page.screenshot({ path: SS('03-history-scan-after.png'), fullPage: false })
}

console.log('\nConsole errors:', errors.slice())

await browser.close()
console.log('\n=== BLOCK 1+2 COMPLETE ===')
