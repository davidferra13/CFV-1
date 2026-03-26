import { test } from '@playwright/test'

// Sign in via credentials form, then screenshot core pages
test('walkthrough - screenshot core pages', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  // Sign in
  await page.goto('http://localhost:3100/sign-in')
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="email"]', 'agent@chefflow.test')
  await page.fill('input[name="password"]', 'AgentChefFlow!2026')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
  await page.waitForLoadState('networkidle')

  const pages = [
    { name: '01-dashboard', url: '/dashboard' },
    { name: '02-inquiries', url: '/inquiries' },
    { name: '03-events', url: '/events' },
    { name: '04-clients', url: '/clients' },
    { name: '05-recipes', url: '/recipes' },
    { name: '06-recipes-import', url: '/recipes/import' },
    { name: '07-menus', url: '/menus' },
    { name: '08-menus-upload', url: '/menus/upload' },
    { name: '09-documents', url: '/documents' },
    { name: '10-finance', url: '/finance' },
    { name: '11-settings-pricing', url: '/settings/pricing' },
    { name: '12-calendar', url: '/calendar' },
  ]

  for (const p of pages) {
    await page.goto(`http://localhost:3100${p.url}`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(1500) // let animations settle
    await page.screenshot({ path: `tests/screenshots/${p.name}.png`, fullPage: true })
    console.log(`Screenshot: ${p.name}`)
  }

  await context.close()
})
