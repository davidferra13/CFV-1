import { test, type Page } from '@playwright/test'

const BASE = 'http://localhost:3100'
const S = 'screenshots'
const EMAIL = 'agent@local.chefflow'
const PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'

async function signIn(page: Page): Promise<boolean> {
  await page.goto(BASE + '/auth/signin', { waitUntil: 'load', timeout: 20000 })

  // Wait for React hydration
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })

  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)

  // window.location.href redirect means we need to wait for a new page load
  await page.click('button[type="submit"]')

  // Wait up to 15s for navigation away from signin
  try {
    await page.waitForURL((url) => !url.toString().includes('/auth/signin'), { timeout: 15000 })
  } catch {
    // Check for error message
    const err = await page
      .locator('[role="alert"]')
      .first()
      .textContent()
      .catch(() => '')
    console.log('Sign-in error:', err)
    return false
  }

  await page.waitForTimeout(1000)
  return true
}

test('VCQ: vendor call queue panel - price catalog', async ({ page }) => {
  page.setDefaultTimeout(30000)

  const jsErrors: string[] = []
  page.on('pageerror', (err) => jsErrors.push(err.message))

  // 1. Sign in
  console.log('--- Sign In ---')
  const ok = await signIn(page)
  console.log('Sign-in success:', ok)
  console.log('URL after sign-in:', page.url())
  await page.screenshot({ path: S + '/vcq-01-after-signin.png' })

  if (!ok) {
    console.log('FAIL: Could not sign in')
    return
  }

  // 2. Navigate to price catalog
  console.log('--- Price Catalog ---')
  await page.goto(BASE + '/culinary/price-catalog', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(3000)
  const catalogUrl = page.url()
  console.log('Catalog URL:', catalogUrl)
  await page.screenshot({ path: S + '/vcq-02-catalog.png', fullPage: true })

  if (catalogUrl.includes('signin') || catalogUrl.includes('sign-in')) {
    console.log('FAIL: Redirected to login after navigating to catalog')
    return
  }

  // 3. Inspect inputs
  const allInputs = page.locator('input')
  const inputCount = await allInputs.count()
  console.log('Input count:', inputCount)
  for (let i = 0; i < inputCount; i++) {
    const inp = allInputs.nth(i)
    const ph = await inp.getAttribute('placeholder')
    const type = await inp.getAttribute('type')
    const visible = await inp.isVisible()
    console.log('  input[' + i + '] type=' + type + ' ph=' + ph + ' visible=' + visible)
  }

  // 4. Look for search input (page starts in store-picker view)
  const searchLocator = page.locator('input').filter({ hasAttribute: 'placeholder' })
  const searchCount = await searchLocator.count()
  console.log('Inputs with placeholder:', searchCount)

  let hasSearchInput = false
  for (let i = 0; i < searchCount; i++) {
    const inp = searchLocator.nth(i)
    const ph = (await inp.getAttribute('placeholder')) || ''
    if (
      ph.toLowerCase().includes('search') ||
      ph.toLowerCase().includes('ingredient') ||
      ph.toLowerCase().includes('item')
    ) {
      hasSearchInput = true
      console.log('Found search input with placeholder:', ph)
      await inp.fill('black truffle shavings grade A')
      await page.keyboard.press('Enter')
      break
    }
  }

  if (!hasSearchInput) {
    // Try clicking store items to get past store picker
    console.log('No search input - trying store options...')
    const storeBtns = page
      .locator('button')
      .filter({ hasText: /Market|Food|Shop|Whole|Stop|Walmart|Target|Trader/i })
    const storeCount = await storeBtns.count()
    console.log('Store buttons found:', storeCount)

    if (storeCount > 0) {
      await storeBtns.first().click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: S + '/vcq-03-after-store-click.png', fullPage: true })

      const searchAfter = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
      if ((await searchAfter.count()) > 0) {
        hasSearchInput = true
        await searchAfter.first().fill('black truffle shavings grade A')
        await page.keyboard.press('Enter')
      }
    }
  }

  // 5. Wait for results and take screenshot
  console.log('--- Search Results ---')
  await page.waitForTimeout(7000)
  await page.screenshot({ path: S + '/vcq-04-search-results.png', fullPage: true })

  const resultText = (await page.textContent('body')) || ''
  console.log('Result checks:')
  console.log('  No ingredients found:', resultText.includes('No ingredients found'))
  console.log('  Not in catalog:', resultText.includes('Not in catalog'))
  console.log('  sourcing search:', resultText.includes('sourcing search'))
  console.log('  Call your suppliers:', resultText.includes('Call your suppliers'))
  console.log(
    '  Not in the catalog or online:',
    resultText.includes('Not in the catalog or online')
  )
  console.log('  Eataly (static fallback):', resultText.includes('Eataly'))
  console.log('  Manage contacts:', resultText.includes('Manage contacts'))

  // Scroll and screenshot
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  await page.screenshot({ path: S + '/vcq-05-scrolled.png', fullPage: true })

  // 6. Vendors page
  console.log('--- Vendors Page ---')
  await page.goto(BASE + '/culinary/vendors', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  console.log('Vendors URL:', page.url())
  await page.screenshot({ path: S + '/vcq-06-vendors.png', fullPage: true })

  const vText = (await page.textContent('body')) || ''
  console.log('Vendors page:')
  console.log('  Has Vendor content:', vText.includes('Vendor'))
  console.log('  Has phone (xxx) pattern:', /(d{3})/.test(vText))
  console.log('  No vendors empty state:', vText.toLowerCase().includes('no vendor'))

  // JS errors
  if (jsErrors.length > 0) {
    console.log('JS Runtime Errors:', jsErrors.length)
    jsErrors.slice(0, 3).forEach((e) => console.log(' ', e.substring(0, 200)))
  } else {
    console.log('No JS runtime errors')
  }
})
