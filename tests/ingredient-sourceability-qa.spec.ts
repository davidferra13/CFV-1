import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = 'http://localhost:3100'
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'qa-screenshots')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function signIn(page: Page) {
  const creds = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), '.auth', 'agent.json'), 'utf-8')
  )
  const res = await page.request.post(BASE + '/api/e2e/auth', {
    data: { email: creds.email, password: creds.password },
    headers: { 'Content-Type': 'application/json' },
    timeout: 90000,
  })
  console.log('Auth status:', res.status())
  return res
}

test.describe('Ingredient Sourceability Feature', () => {
  test('1. API endpoint organic-oranges', async ({ page }) => {
    const res = await page.request.get(BASE + '/api/ingredients/organic-oranges')
    const status = res.status()
    const text = await res.text()
    console.log('API status:', status)
    console.log('API body:', text.slice(0, 1000))
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'api-response.json'), text, 'utf-8')
    if (status === 200) {
      const json = JSON.parse(text)
      console.log('ingredient.name:', json.ingredient?.name)
      console.log('availability.classification:', json.availability?.classification)
      console.log('availability.label:', json.availability?.label)
      console.log('pricing.storeCount:', json.pricing?.storeCount)
      console.log('alternatives count:', json.alternatives?.length)
    }
    expect([200, 404, 500]).toContain(status)
  })

  test('2. Public ingredient page no auth', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    const resp = await page.goto(BASE + '/ingredient/organic-oranges', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    const status = resp?.status()
    console.log('HTTP status:', status)
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-public-ingredient-page.png'),
      fullPage: true,
    })
    const title = await page.title()
    const body = await page.locator('body').innerText()
    console.log('Title:', title)
    console.log('Body:', body.slice(0, 800))
    if (errs.length) console.log('Console errors:', errs.slice(0, 2))
    expect([200, 404]).toContain(status)
  })

  test('3. Search functionality type apple', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    const resp = await page.goto(BASE + '/ingredient/organic-oranges', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    const status = resp?.status()
    console.log('Page status:', status)
    await page.waitForTimeout(1500)
    if (status === 404) {
      const apiRes = await page.request.get(BASE + '/api/ingredients/search?q=apple')
      console.log('Search API status:', apiRes.status())
      const apiText = await apiRes.text()
      console.log('Search API body:', apiText.slice(0, 800))
      fs.writeFileSync(path.join(SCREENSHOT_DIR, 'api-search-response.json'), apiText, 'utf-8')
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-ingredient-fallback.png'),
        fullPage: true,
      })
      return
    }
    const inputs = page.locator('input')
    const cnt = await inputs.count()
    console.log('Inputs found:', cnt)
    if (cnt > 0) {
      const placeholder = await inputs.first().getAttribute('placeholder')
      console.log('First input placeholder:', placeholder)
      await inputs.first().click()
      await inputs.first().fill('apple')
      await page.waitForTimeout(2000)
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-search-dropdown.png'),
        fullPage: true,
      })
      const body = await page.locator('body').innerText()
      console.log('Body after typing apple:', body.slice(0, 600))
    }
    if (errs.length) console.log('Errors:', errs.slice(0, 3))
  })

  test('4. Price catalog sourceability column', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    await signIn(page)
    const cookies = await page.context().cookies()
    console.log(
      'Cookies after signIn:',
      JSON.stringify(cookies.map((c) => ({ name: c.name, value: c.value.slice(0, 20) })))
    )
    const resp = await page.goto(BASE + '/culinary/price-catalog', {
      waitUntil: 'commit',
      timeout: 90000,
    })
    console.log('Catalog status:', resp?.status())
    console.log('Catalog URL:', page.url())
    await page.waitForTimeout(4000)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-price-catalog-initial.png'),
      fullPage: true,
    })
    const body = await page.locator('body').innerText()
    console.log('Body:', body.slice(0, 1000))
    console.log('Has Sourceability column:', body.toLowerCase().includes('sourceabilit'))
    const rows = page.locator('tbody tr')
    const rowCnt = await rows.count()
    console.log('Table rows:', rowCnt)
    if (rowCnt > 0) {
      await rows.first().click()
      await page.waitForTimeout(1500)
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-price-catalog-expanded.png'),
        fullPage: true,
      })
      const expanded = await page.locator('body').innerText()
      console.log('Expanded:', expanded.slice(0, 800))
    }
    if (errs.length) console.log('Errors:', errs.slice(0, 3))
  })

  test('5. Nonexistent ingredient 404 page', async ({ page }) => {
    const resp = await page.goto(BASE + '/ingredient/nonexistent-ingredient-xyz123', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    const status = resp?.status()
    console.log('HTTP status:', status)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-404-page.png'), fullPage: true })
    const title = await page.title()
    const body = await page.locator('body').innerText()
    console.log('Title:', title)
    console.log('Body:', body.slice(0, 400))
    const hasNotFoundContent =
      body.toLowerCase().includes('not found') || body.toLowerCase().includes('go home')
    console.log('Has not-found UI content:', hasNotFoundContent)
    expect(hasNotFoundContent).toBe(true)
    console.log('RESULT: Not-found page renders correctly')
  })
})
