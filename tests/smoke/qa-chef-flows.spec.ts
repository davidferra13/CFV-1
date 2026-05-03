import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3100'

test.describe('QA Chef Flows - Remaining Pages', () => {
  let cookies: any[] = []

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const res = await page.request.post(`${BASE}/api/e2e/auth`, {
      data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
    })
    if (!res.ok()) {
      await page.goto(`${BASE}/sign-in`, { timeout: 30000 })
      await page.waitForTimeout(3000)
      await page.fill('input[name="email"], input[type="email"]', 'agent@local.chefflow')
      await page.fill('input[name="password"], input[type="password"]', 'CHEF.jdgyuegf9924092.FLOW')
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard|chef/, { timeout: 30000 })
    }
    cookies = await context.cookies()
    await context.close()
  })

  async function authedPage(browser: any) {
    const context = await browser.newContext()
    await context.addCookies(cookies)
    const page = await context.newPage()
    const consoleErrors: string[] = []
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    return { page, context, consoleErrors }
  }

  test('Events page', async ({ browser }) => {
    const { page, context, consoleErrors } = await authedPage(browser)
    await page.goto(`${BASE}/events`, { timeout: 90000 })
    await page.waitForTimeout(8000)
    await page.screenshot({ path: 'test-results/qa-02-events.png', fullPage: true })
    console.log('[Events] URL:', page.url())
    console.log(
      '[Events] Errors:',
      consoleErrors
        .filter((e) => !e.includes('favicon') && !e.includes('Offscreen'))
        .slice(0, 3)
        .join(' | ') || 'NONE'
    )

    const createBtn = page
      .locator('button, a')
      .filter({ hasText: /new event|create event|add event|new dinner/i })
      .first()
    const vis = await createBtn.isVisible().catch(() => false)
    console.log('[Events] Create button:', vis)
    if (vis) {
      await createBtn.click()
      await page.waitForTimeout(5000)
      await page.screenshot({ path: 'test-results/qa-02b-events-create.png', fullPage: true })
    }
    await context.close()
  })

  test('Clients page', async ({ browser }) => {
    const { page, context, consoleErrors } = await authedPage(browser)
    await page.goto(`${BASE}/clients`, { timeout: 90000 })
    await page.waitForTimeout(8000)
    await page.screenshot({ path: 'test-results/qa-03-clients.png', fullPage: true })
    console.log('[Clients] URL:', page.url())
    console.log(
      '[Clients] Errors:',
      consoleErrors
        .filter((e) => !e.includes('favicon') && !e.includes('Offscreen'))
        .slice(0, 3)
        .join(' | ') || 'NONE'
    )
    await context.close()
  })

  test('Menus page', async ({ browser }) => {
    const { page, context, consoleErrors } = await authedPage(browser)
    await page.goto(`${BASE}/culinary/menus`, { timeout: 90000 })
    await page.waitForTimeout(8000)
    await page.screenshot({ path: 'test-results/qa-05-menus.png', fullPage: true })
    console.log('[Menus] URL:', page.url())
    console.log(
      '[Menus] Errors:',
      consoleErrors
        .filter((e) => !e.includes('favicon') && !e.includes('Offscreen'))
        .slice(0, 3)
        .join(' | ') || 'NONE'
    )
    await context.close()
  })

  test('Settings page', async ({ browser }) => {
    const { page, context, consoleErrors } = await authedPage(browser)
    await page.goto(`${BASE}/settings`, { timeout: 90000 })
    await page.waitForTimeout(8000)
    await page.screenshot({ path: 'test-results/qa-06-settings.png', fullPage: true })
    console.log('[Settings] URL:', page.url())
    console.log(
      '[Settings] Errors:',
      consoleErrors
        .filter((e) => !e.includes('favicon') && !e.includes('Offscreen'))
        .slice(0, 3)
        .join(' | ') || 'NONE'
    )
    await context.close()
  })
})
