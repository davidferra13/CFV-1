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
const allErrors = []

page.on('console', msg => {
  if (msg.type() === 'error') allErrors.push(msg.text())
})

async function goto(path, timeout=45000) {
  try {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout })
    await page.waitForTimeout(3000)
    return response?.status()
  } catch(e) {
    console.log(`NAV ERROR for ${path}: ${e.message}`)
    return null
  }
}

async function getContent() {
  return await page.evaluate(() => document.body.innerText.substring(0, 1500))
}

// Check if we're actually logged in by reading the page URL after navigation
console.log('=== CHECKING AUTH STATE ===')
const status = await goto('/dashboard')
console.log('Response status for /dashboard:', status)
const currentUrl = page.url()
console.log('Current URL after /dashboard:', currentUrl)
const content = await getContent()
console.log('Content:', content.substring(0, 500))

// Check what the dashboard ACTUALLY shows in the viewport
const h1Text = await page.$$eval('h1, h2, h3', els => els.map(e => e.innerText).join(' | '))
console.log('Headings on page:', h1Text)

// BLOCK 3: SELL PILLAR
console.log('\n=== BLOCK 3: SELL PILLAR ===')

await goto('/inquiries')
await page.screenshot({ path: SS('04-inquiries.png'), fullPage: false })
console.log('Inquiries URL:', page.url())
console.log('Inquiries content:', (await getContent()).substring(0, 500))

await goto('/events')
await page.screenshot({ path: SS('05-events.png'), fullPage: false })
console.log('Events URL:', page.url())
const eventsContent = await getContent()
console.log('Events content:', eventsContent.substring(0, 800))

// Try clicking first event if any
const eventLinks = await page.$$('a[href*="/events/"]')
console.log('Event links count:', eventLinks.length)
if (eventLinks.length > 0) {
  const href = await eventLinks[0].getAttribute('href')
  console.log('Clicking event:', href)
  await eventLinks[0].click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: SS('05-event-detail.png'), fullPage: false })
  console.log('Event detail URL:', page.url())
  const detailContent = await getContent()
  console.log('Event detail content:', detailContent.substring(0, 800))
  
  // Get tabs
  const tabs = await page.$$('[role="tab"], button[class*="tab"], [class*="Tab"]')
  const tabTexts = await Promise.all(tabs.map(t => t.innerText()))
  console.log('Event tabs:', tabTexts.filter(t => t.trim()).join(' | '))
  
  // Screenshot each tab
  for (let i = 0; i < Math.min(tabs.length, 5); i++) {
    try {
      const tabName = (await tabs[i].innerText()).trim().replace(/\s+/g, '-').toLowerCase().substring(0, 20)
      if (tabName) {
        await tabs[i].click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: SS(`05-event-tab-${tabName}.png`), fullPage: false })
        console.log(`Tab ${tabName} screenshot taken`)
      }
    } catch(e) {
      console.log(`Tab ${i} error: ${e.message}`)
    }
  }
}

await goto('/quotes')
await page.screenshot({ path: SS('06-quotes.png'), fullPage: false })
console.log('Quotes content:', (await getContent()).substring(0, 500))

// BLOCK 4: COOK PILLAR
console.log('\n=== BLOCK 4: COOK PILLAR ===')

await goto('/culinary/recipes')
await page.screenshot({ path: SS('07-recipes.png'), fullPage: false })
console.log('Recipes content:', (await getContent()).substring(0, 500))

await goto('/culinary/price-catalog')
await page.screenshot({ path: SS('08-price-catalog.png'), fullPage: false })
console.log('Price catalog content:', (await getContent()).substring(0, 500))

// Search chicken breast
const searchInput = await page.$('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]')
if (searchInput) {
  await searchInput.fill('chicken breast')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: SS('08-search-chicken.png'), fullPage: false })
  console.log('Chicken search result:', (await getContent()).substring(0, 400))
  
  await searchInput.clear()
  await searchInput.fill('puntarelle')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: SS('08-search-puntarelle.png'), fullPage: false })
  console.log('Puntarelle search result:', (await getContent()).substring(0, 400))
  
  // Check for web sourcing fallback
  const webFallback = await page.$('[class*="sourcing"], [class*="web-source"], text*="Find online"')
  console.log('Web sourcing fallback visible:', webFallback !== null)
} else {
  console.log('No search input found on price-catalog page')
}

await goto('/culinary/ingredients')
await page.screenshot({ path: SS('09-ingredients.png'), fullPage: false })
console.log('Ingredients URL:', page.url())
console.log('Ingredients content:', (await getContent()).substring(0, 500))

console.log('\nConsole errors:', allErrors.slice())
allErrors.length = 0

await browser.close()
console.log('\n=== BLOCKS 3+4 COMPLETE ===')
