import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)

const BASE = 'http://localhost:3100'
const SCREENSHOTS_DIR = path.join(__dirname2, '..', 'tmp', 'walkthrough')

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  context.setDefaultTimeout(60000)
  const page = await context.newPage()

  // Authenticate
  console.log('Authenticating...')
  const authRes = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: {
      email: 'davidferra13@gmail.com',
      password: process.env.DEV_PASSWORD || 'CHEF.jdgyuegf9924092.FLOW',
    },
  })
  if (!authRes.ok()) {
    console.error('Auth failed:', authRes.status(), await authRes.text())
    await browser.close()
    process.exit(1)
  }
  console.log('Authenticated successfully')

  let screenshotCount = 0

  async function screenshot(name: string) {
    screenshotCount++
    const num = String(screenshotCount).padStart(2, '0')
    const filePath = path.join(SCREENSHOTS_DIR, `${num}-${name}.png`)
    await page.screenshot({ path: filePath, fullPage: false, timeout: 15000 })
    console.log(`  Screenshot: ${num}-${name}.png`)
  }

  async function visit(url: string, name: string) {
    console.log(`Visiting: ${url}`)
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(2000)
      await screenshot(name)
    } catch (err: any) {
      console.log(`  ERROR: ${err.message.split('\n')[0]}`)
      try {
        await screenshot(`${name}-ERROR`)
      } catch {
        console.log(`  Could not take screenshot`)
      }
    }
  }

  // Public pages
  await visit('/', 'landing-page')
  await visit('/pricing', 'pricing')
  await visit('/contact', 'contact')

  // Chef portal
  await visit('/dashboard', 'dashboard')
  await visit('/clients', 'clients-list')
  await visit('/events', 'events-list')
  await visit('/recipes', 'recipes-list')
  await visit('/menus', 'menus-list')
  await visit('/finances', 'finances')
  await visit('/calendar', 'calendar')
  await visit('/inquiries', 'inquiries')
  await visit('/messages', 'messages')
  await visit('/documents', 'documents')
  await visit('/contracts', 'contracts')
  await visit('/equipment', 'equipment')
  await visit('/staff', 'staff')
  await visit('/ingredients', 'ingredients')

  // Hub
  await visit('/hub', 'hub')

  // Settings
  await visit('/settings', 'settings')
  await visit('/settings/profile', 'settings-profile')
  await visit('/settings/billing', 'settings-billing')
  await visit('/settings/modules', 'settings-modules')

  // Analytics
  await visit('/analytics', 'analytics')
  await visit('/reports', 'reports')

  // Admin
  await visit('/admin', 'admin')

  // Misc
  await visit('/todos', 'todos')
  await visit('/goals', 'goals')
  await visit('/availability', 'availability')
  await visit('/shopping-lists', 'shopping-lists')
  await visit('/vendors', 'vendors')

  await browser.close()

  console.log(`\n=== DONE: ${screenshotCount} screenshots saved to ${SCREENSHOTS_DIR} ===`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
