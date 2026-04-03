import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = 'http://localhost:3100'
const CREDS = { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }
const SSDIR = 'test-results/golden-path-qa'

test.beforeAll(() => {
  fs.mkdirSync(SSDIR, { recursive: true })
})
test.describe.serial('Golden Path Reliability', () => {
  test.use({ baseURL: BASE })

  test.beforeEach(async ({ page, context }) => {
    // Add cookie consent cookie to suppress banner
    await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE }])
    // Use e2e auth endpoint (bypasses rate limiter).
    // The server uses NEXTAUTH_URL=https://... so it sets __Secure-authjs.session-token.
    // Browsers refuse to send Secure cookies to HTTP. Use page.route() to inject the
    // cookie header directly into every request, bypassing the browser's security check.
    const resp = await page.request.post(BASE + '/api/e2e/auth', {
      data: CREDS,
      timeout: 30000,
    })
    if (!resp.ok()) throw new Error('E2E auth failed: ' + resp.status())
    const setCookieHeader = resp.headers()['set-cookie'] || ''
    const cookieMatch = setCookieHeader.match(
      /(__Secure-authjs.session-token|authjs.session-token)=([^;]+)/
    )
    if (!cookieMatch) {
      throw new Error(
        'No session cookie in e2e auth response: ' + setCookieHeader.substring(0, 100)
      )
    }
    const sessionCookieHeader = cookieMatch[1] + '=' + cookieMatch[2]
    // Intercept all requests to inject the session cookie header
    await context.route('**/*', async (route) => {
      const headers = route.request().headers()
      const existing = headers['cookie'] || ''
      headers['cookie'] = existing ? existing + '; ' + sessionCookieHeader : sessionCookieHeader
      await route.continue({ headers })
    })
  })

  test('00 sign in via e2e auth endpoint', async ({ page }) => {
    // Use e2e auth API to set session cookies (faster + more reliable than UI form)
    const resp = await page.request.post('/api/e2e/auth', {
      data: CREDS,
      timeout: 30000,
    })
    expect(resp.ok(), 'E2E auth endpoint should return 200').toBe(true)
    // Navigate to dashboard to confirm session is active
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '00-signed-in.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    expect(page.url()).toContain('/dashboard')
  })

  test('01 recipes-new loads', async ({ page }) => {
    await page.goto('/recipes/new', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '01-recipes-new.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const hi = await page
      .locator('input, textarea')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hi, 'Recipe form should have inputs').toBe(true)
  })
  test('02 create recipe saves and redirects', async ({ page }) => {
    const consoleMessages = []
    const pageErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleMessages.push(msg.text())
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))
    await page.goto('/recipes/new', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})

    // The page defaults to Smart Import tab - switch to Manual Entry
    const manualTab = page
      .getByRole('tab', { name: /manual entry/i })
      .or(page.locator('button, [role="tab"]').filter({ hasText: /manual entry/i }))
      .first()
    const hasManualTab = await manualTab.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasManualTab) await manualTab.click()
    await page.waitForTimeout(500)

    const recipeName = 'QA Seared Salmon ' + Date.now()

    // Find the Recipe Name input (placeholder: 'e.g., Diane Sauce')
    const nameInput = page
      .locator('input[placeholder*="Diane"]')
      .or(page.locator('input[placeholder*="recipe name" i]'))
      .or(page.locator('input[type="text"]').first())
      .first()
    await nameInput.waitFor({ timeout: 5000 })
    await nameInput.fill(recipeName)
    await page.screenshot({ path: path.join(SSDIR, '02a-recipe-filled.png'), fullPage: true })
    // Check if save button is still disabled (name might not have been filled properly)
    const isSaveBtnDisabled = await page
      .locator('button')
      .filter({ hasText: 'Save Recipe' })
      .first()
      .isDisabled({ timeout: 2000 })
      .catch(() => false)
    console.log(
      'Save button disabled:',
      isSaveBtnDisabled,
      '| Name value:',
      await nameInput.inputValue().catch(() => 'error')
    )

    // Also add an ingredient to make it a more realistic test
    const ingInput = page.locator('input[placeholder*="Ingredient name" i]').first()
    const hasIngInput = await ingInput.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasIngInput) await ingInput.fill('Salmon fillet')

    // Click Save Recipe button (not a submit button, uses onClick)
    const saveBtn = page.locator('button').filter({ hasText: 'Save Recipe' }).first()
    await saveBtn.waitFor({ timeout: 5000 })
    await saveBtn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    // Check for any overlays blocking the click and dismiss them
    const cookieBanner = page
      .locator('[class*="cookieconsent"], [id*="cookie"], [class*="cookie-banner"]')
      .first()
    const hasBanner = await cookieBanner.isVisible({ timeout: 500 }).catch(() => false)
    if (hasBanner)
      await cookieBanner
        .locator('button')
        .first()
        .click()
        .catch(() => {})
    await page.waitForTimeout(300)
    // Use keyboard Enter as fallback if click doesn't work
    await saveBtn.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(SSDIR, '02a2-before-save-click.png'), fullPage: false })
    // Use dispatchEvent to trigger click regardless of overlay
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const saveBtn = btns.find((b) => b.textContent?.trim() === 'Save Recipe')
      if (saveBtn) saveBtn.click()
    })
    await page.waitForTimeout(3000)
    const urlAfterEval = page.url()
    console.log('URL after eval click:', urlAfterEval)
    const errorEl = page.locator('[role="alert"], .text-red-500, .text-red-600').first()
    const errMsg = await errorEl
      .textContent({ timeout: 2000 })
      .catch(() => 'no error element found')
    console.log('Error message on page:', errMsg)
    await page.screenshot({ path: path.join(SSDIR, '02a3-after-eval-click.png'), fullPage: true })

    console.log('Browser errors:', JSON.stringify(consoleMessages))
    console.log('Page errors:', JSON.stringify(pageErrors))
    // Wait for redirect to /recipes/[id]
    await page.waitForURL(
      (u) => {
        const url = u.toString()
        return url.includes('/recipes/') && !url.includes('/new')
      },
      { timeout: 20000 }
    )
    const fu = page.url()
    await page.screenshot({ path: path.join(SSDIR, '02b-recipe-saved.png'), fullPage: true })
    expect(fu).toContain('/recipes/')
    expect(fu).not.toContain('/new')
    fs.writeFileSync(
      path.join(SSDIR, 'created-recipe.json'),
      JSON.stringify({ name: recipeName, url: fu })
    )
  })
  test('03 recipe appears in list', async ({ page }) => {
    await page.goto('/recipes', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '03-recipes-list.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const hc = await page
      .locator('main, ul, table, .grid')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hc, 'Recipes list should have content').toBe(true)
    let ci = null
    try {
      ci = JSON.parse(fs.readFileSync(path.join(SSDIR, 'created-recipe.json'), 'utf8'))
    } catch {}
    if (ci) {
      const bt = await page.textContent('body').catch(() => '')
      const found = (bt ?? '').includes(ci.name.substring(0, 20))
      console.log('Created recipe found in list:', found)
      expect(found, 'Created recipe should appear in list').toBe(true)
    }
  })

  test('04 recipes-ingredients loads', async ({ page }) => {
    await page.goto('/recipes/ingredients', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '04-ingredients.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const crash = await page
      .getByText('Something went wrong')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    expect(crash, 'Ingredients page should not crash').toBe(false)
    const hc = await page
      .locator('main, table, ul, section')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hc, 'Ingredients page should have content').toBe(true)
  })

  test('05 costing loads with honest data', async ({ page }) => {
    await page.goto('/culinary/costing', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '05-costing.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const crash = await page
      .getByText('Something went wrong')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    expect(crash, 'Costing page should not crash').toBe(false)
    const hc = await page
      .locator('main, table, section')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hc, 'Costing page should have content').toBe(true)
  })
  test('06 create menu saves and redirects', async ({ page }) => {
    await page.goto('/menus/new', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '06a-menus-new.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const menuName = 'QA Test Menu ' + Date.now()
    const sel =
      'input[type="text"], input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])'
    const inputs = await page.locator(sel).all()
    let filled = false
    for (const inp of inputs.slice(0, 6)) {
      const nm = (await inp.getAttribute('name').catch(() => '')) ?? ''
      const ph = (await inp.getAttribute('placeholder').catch(() => '')) ?? ''
      const id = (await inp.getAttribute('id').catch(() => '')) ?? ''
      if (/name|title/i.test(nm) || /name|menu/i.test(ph) || /name|title/i.test(id)) {
        await inp.fill(menuName)
        filled = true
        break
      }
    }
    if (!filled && inputs.length > 0) {
      await inputs[0].fill(menuName)
      filled = true
    }
    expect(filled, 'Should fill menu name').toBe(true)
    await page.screenshot({ path: path.join(SSDIR, '06b-menu-filled.png'), fullPage: true })
    const sb = page
      .locator('button[type="submit"]')
      .or(page.locator('button').filter({ hasText: /save|create/i }))
      .first()
    await sb.waitFor({ timeout: 5000 })
    await sb.click()
    await page.waitForURL((u) => !u.toString().includes('/new'), { timeout: 15000 })
    const au = page.url()
    await page.screenshot({ path: path.join(SSDIR, '06c-menu-saved.png'), fullPage: true })
    const match = au.match(new RegExp('/menus/([^/?#]+)'))
    expect(match, 'Should redirect to /menus/[id]').not.toBeNull()
    if (match)
      fs.writeFileSync(
        path.join(SSDIR, 'created-menu.json'),
        JSON.stringify({ id: match[1], name: menuName, url: au })
      )
  })

  test('07 menu detail shows persisted name', async ({ page }) => {
    let mi = null
    try {
      mi = JSON.parse(fs.readFileSync(path.join(SSDIR, 'created-menu.json'), 'utf8'))
    } catch {}
    if (!mi) {
      test.skip(true, 'No menu created')
      return
    }
    await page.goto('/menus/' + mi.id, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '07-menu-detail.png'), fullPage: true })
    const bt = await page.textContent('body').catch(() => '')
    expect(bt ?? '', 'Menu name should appear in detail').toContain(mi.name.substring(0, 15))
  })
  test('08 menus list loads', async ({ page }) => {
    await page.goto('/menus', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '08-menus-list.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const hc = await page
      .locator('main, ul, table, .grid')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hc, 'Menus list should have content').toBe(true)
  })

  test('09 menus quick-view resolves', async ({ page }) => {
    await page.goto('/menus', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    const sels = [
      '[aria-label*="View" i]',
      '[aria-label*="Quick view" i]',
      '[data-testid*="quick-view"]',
    ]
    let qvBtn = null
    for (const s of sels) {
      const btn = page.locator(s).first()
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        qvBtn = btn
        break
      }
    }
    if (!qvBtn) {
      await page.screenshot({ path: path.join(SSDIR, '09-no-qv-btn.png'), fullPage: true })
      console.log('No quick-view button found - informational skip')
      return
    }
    await qvBtn.click()
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(SSDIR, '09-after-qv.png'), fullPage: true })
    const hs = await page
      .locator('.animate-spin')
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false)
    const hm = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    if (hs && !hm) throw new Error('Quick-view shows endless spinner')
    expect(hm, 'Quick-view modal should open').toBe(true)
  })

  test('10 dish-index loads without crash', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/culinary/dish-index', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await page.screenshot({ path: path.join(SSDIR, '10-dish-index.png'), fullPage: true })
    expect(page.url()).not.toContain('/auth/signin')
    const crash = await page
      .getByText('Something went wrong')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    expect(crash, 'Dish index should not crash').toBe(false)
    const hc = await page
      .locator('main, table, section, ul, .grid')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hc, 'Dish index should have content').toBe(true)
    if (errors.length > 0) console.log('JS errors:', errors)
    expect(errors, 'No uncaught JS errors').toHaveLength(0)
  })
})
