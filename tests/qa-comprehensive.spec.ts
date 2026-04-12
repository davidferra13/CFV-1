import { test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'http://localhost:3100'
const DIR = 'screenshots/qa-pass'
mkdirSync(DIR, { recursive: true })

test.use({ storageState: '.auth/developer-storage.json' })

async function go(page: any, url: string) {
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)
  } catch (e: any) {
    console.log('NAV ERR ' + url + ': ' + e.message.substring(0, 80))
  }
}

async function shot(page: any, name: string, desc: string) {
  try {
    await page.screenshot({ path: join(DIR, name), fullPage: true, timeout: 15000 })
  } catch (e: any) {
    console.log('SHOT_FAIL:' + e.message.substring(0, 60))
    return
  }
  console.log('SHOT:' + name + '|' + desc)
}
test('01-dashboard', async ({ page }) => {
  await go(page, '/dashboard')
  await shot(page, '01-dashboard.png', 'Dashboard')
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
  console.log('URL:' + page.url())
})

test('02-inbox', async ({ page }) => {
  await go(page, '/inbox')
  await shot(page, '02-inbox.png', 'Inbox')
  console.log('URL:' + page.url())
  const t = await page.evaluate(() => document.body.innerText.substring(0, 300))
  console.log('CONTENT:' + t)
})

test('02b-history-scan', async ({ page }) => {
  await go(page, '/inbox/history-scan')
  await shot(page, '02b-history-scan.png', 'History Scan')
  console.log('URL:' + page.url())
  const t = await page.evaluate(() => document.body.innerText.substring(0, 600))
  console.log('HSCAN:' + t)
  const btns = await page.locator('button').allTextContents()
  console.log('BTNS:' + JSON.stringify(btns))
  const scanBtn = page
    .locator('button')
    .filter({ hasText: /scan|start|begin/i })
    .first()
  if ((await scanBtn.count()) > 0) {
    await scanBtn.click()
    await page.waitForTimeout(4000)
    await shot(page, '02c-scan-clicked.png', 'Scan Clicked')
    const after = await page.evaluate(() => document.body.innerText.substring(0, 400))
    console.log('AFTER_CLICK:' + after)
  }
})
test('03-events', async ({ page }) => {
  await go(page, '/events')
  await shot(page, '03-events.png', 'Events')
  const links = await page.locator('a[href*="/events/"]').all()
  console.log('EVENT_LINKS:' + links.length)
  if (links.length > 0) {
    const href = await links[0].getAttribute('href')
    await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(4000)
    await shot(page, '03b-event-detail.png', 'Event Detail')
    console.log('EVENT_URL:' + page.url())
    const tabs = await page.locator('[role=tab]').allTextContents()
    console.log('TABS:' + JSON.stringify(tabs))
    for (let i = 1; i < Math.min(tabs.length, 5); i++) {
      await page.locator('[role=tab]').nth(i).click()
      await page.waitForTimeout(2000)
      await shot(page, '03t' + i + '-tab.png', 'Tab-' + tabs[i])
    }
  }
})

test('04-quotes', async ({ page }) => {
  await go(page, '/quotes')
  await shot(page, '04-quotes.png', 'Quotes')
  console.log('URL:' + page.url())
})

test('05-clients', async ({ page }) => {
  await go(page, '/clients')
  await shot(page, '05-clients.png', 'Clients')
  const links = await page.locator('a[href*="/clients/"]').all()
  console.log('CLIENT_LINKS:' + links.length)
  if (links.length > 0) {
    const href = await links[0].getAttribute('href')
    await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(4000)
    await shot(page, '05b-client-detail.png', 'Client Detail')
    console.log('CLIENT_URL:' + page.url())
  }
})
test('06-culinary', async ({ page }) => {
  await go(page, '/culinary/recipes')
  await shot(page, '06-recipes.png', 'Recipes')
  await go(page, '/culinary/price-catalog')
  await shot(page, '06b-catalog.png', 'Price Catalog')
  const srch = page.locator('input[type=search], input[placeholder*=earch]').first()
  if ((await srch.count()) > 0) {
    await srch.fill('chicken')
    await page.waitForTimeout(4000)
    await shot(page, '06c-chicken.png', 'Chicken Search')
    await srch.fill('puntarelle')
    await page.waitForTimeout(4000)
    await shot(page, '06d-puntarelle.png', 'Puntarelle Search')
    const ws = await page.getByText(/web sourcing/i).count()
    console.log('WEB_SOURCING:' + (ws > 0))
  }
  await go(page, '/culinary/menus')
  await shot(page, '06e-menus.png', 'Menus')
})

test('07-finance', async ({ page }) => {
  await go(page, '/finance')
  await shot(page, '07-finance.png', 'Finance')
  console.log('FINANCE_URL:' + page.url())
  await go(page, '/finance/invoices')
  await shot(page, '07b-invoices.png', 'Invoices')
  await go(page, '/finance/expenses')
  await shot(page, '07c-expenses.png', 'Expenses')
})
test('08-settings', async ({ page }) => {
  await go(page, '/settings')
  await shot(page, '08-settings.png', 'Settings Main')
  const slinks = await page.locator('a[href*="/settings/"]').allTextContents()
  console.log('SETTINGS_LINKS:' + JSON.stringify(slinks))
  await go(page, '/settings/gmail')
  await shot(page, '08b-gmail.png', 'Gmail')
  const gText = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('GMAIL_TEXT:' + gText)
  await go(page, '/settings/account')
  await shot(page, '08c-account.png', 'Account Settings')
  await go(page, '/settings/api-keys')
  await shot(page, '08d-apikeys.png', 'API Keys')
  await go(page, '/settings/webhooks')
  await shot(page, '08e-webhooks.png', 'Webhooks')
  await go(page, '/settings/zapier')
  await shot(page, '08f-zapier.png', 'Zapier')
  await go(page, '/settings/store-preferences')
  await shot(page, '08g-storeprefs.png', 'Store Prefs')
  const slugVal = await page
    .locator('input[name=slug], input[id*=slug]')
    .first()
    .inputValue()
    .catch(() => '')
  console.log('SLUG:' + slugVal)
  if (slugVal) {
    await go(page, '/chef/' + slugVal)
    await shot(page, '11-public-profile.png', 'Public Profile')
  }
})

test('09-calendar', async ({ page }) => {
  await go(page, '/calendar')
  await shot(page, '09-calendar.png', 'Calendar')
  console.log('CALENDAR_URL:' + page.url())
})

test('10-daily', async ({ page }) => {
  await go(page, '/daily')
  await shot(page, '10-daily.png', 'Daily')
  console.log('DAILY_URL:' + page.url())
  await go(page, '/planning')
  await shot(page, '10b-planning.png', 'Planning')
  console.log('PLANNING_URL:' + page.url())
})
test('12-extra', async ({ page }) => {
  await go(page, '/dashboard')
  await shot(page, '13-nav.png', 'Nav Sidebar')
  const navLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a, aside a'))
      .map((a: any) => ({
        text: a.textContent.trim().substring(0, 25),
        href: a.getAttribute('href'),
      }))
      .filter((l: any) => l.href && l.href.startsWith('/'))
  })
  navLinks.forEach((l: any) => console.log('NAV:' + l.text + '->' + l.href))
  const extra = [
    ['/staff', '14-staff.png'],
    ['/documents', '15-documents.png'],
    ['/help', '16-help.png'],
    ['/admin/hub', '17-admin-hub.png'],
    ['/prospecting', '20-prospecting.png'],
    ['/chefs', '21-chefs-dir.png'],
    ['/settings/billing', '22-billing.png'],
  ]
  for (const [url, label] of extra) {
    await go(page, url)
    await shot(page, label as string, url as string)
    console.log('PAGE:' + url + '->' + page.url())
  }
})
