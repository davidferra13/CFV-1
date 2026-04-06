import { test, Page } from '@playwright/test'
import * as path from 'path'

const BASE = 'http://localhost:3100'
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'qa-screenshots')

async function shot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, 'food-costing-' + name + '.png')
  await page.screenshot({ path: filePath, fullPage: true })
  console.log('Screenshot: ' + filePath)
  return filePath
}

test.describe('Food Costing Knowledge System', () => {
  test.use({ baseURL: BASE })
  test.setTimeout(90000)

  test('01 Recipe list and detail', async ({ page }) => {
    await page.goto(BASE + '/culinary/recipes', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '01-recipe-list')

    const recipeLinks = page.locator('a[href*="/culinary/recipes/"]')
    const count = await recipeLinks.count()
    console.log('Recipe links: ' + count)

    if (count > 0) {
      await recipeLinks.first().click()
      await page.waitForTimeout(3000)
      await shot(page, '02-recipe-detail')

      const questionBtns = page.locator('button').filter({ hasText: '?' })
      console.log('? buttons on recipe detail: ' + (await questionBtns.count()))

      const totalCost = page.locator('text=Total Cost')
      const costPerPortion = page.locator('text=Cost per Portion')
      console.log('Total Cost label count: ' + (await totalCost.count()))
      console.log('Cost per Portion label count: ' + (await costPerPortion.count()))
    } else {
      console.log('No recipes found')
    }
  })

  test('02 Menu list and detail', async ({ page }) => {
    await page.goto(BASE + '/culinary/menus', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '03-menu-list')

    const menuLinks = page.locator('a[href*="/culinary/menus/"]')
    const count = await menuLinks.count()
    console.log('Menu links: ' + count)

    if (count > 0) {
      await menuLinks.first().click()
      await page.waitForTimeout(3000)
      await shot(page, '04-menu-detail')

      const questionBtns = page.locator('button').filter({ hasText: '?' })
      console.log('? buttons on menu detail: ' + (await questionBtns.count()))

      const costPerGuest = page.locator('text=Cost / Guest')
      const foodCostPct = page.locator('text=Food Cost %')
      console.log('Cost / Guest count: ' + (await costPerGuest.count()))
      console.log('Food Cost % count: ' + (await foodCostPct.count()))
    } else {
      console.log('No menus found')
    }
  })

  test('03 Recipe costing dashboard', async ({ page }) => {
    await page.goto(BASE + '/culinary/costing/recipe', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '05-recipe-costing-dashboard')

    const questionBtns = page.locator('button').filter({ hasText: '?' })
    console.log('? buttons on recipe costing: ' + (await questionBtns.count()))

    const mostExpensive = page.locator('text=Most expensive recipe')
    const avgCost = page.locator('text=Average recipe cost')
    console.log('Most expensive recipe count: ' + (await mostExpensive.count()))
    console.log('Average recipe cost count: ' + (await avgCost.count()))
  })

  test('04 Menu costing dashboard', async ({ page }) => {
    await page.goto(BASE + '/culinary/costing/menu', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '06-menu-costing-dashboard')

    const questionBtns = page.locator('button').filter({ hasText: '?' })
    console.log('? buttons on menu costing: ' + (await questionBtns.count()))

    const estimatedCost = page.locator('text=Estimated Cost')
    const costPerGuest = page.locator('text=Cost / Guest')
    console.log('Estimated Cost count: ' + (await estimatedCost.count()))
    console.log('Cost / Guest count: ' + (await costPerGuest.count()))
  })

  test('05 Pricing settings', async ({ page }) => {
    await page.goto(BASE + '/settings/pricing', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '07-pricing-settings')

    const questionBtns = page.locator('button').filter({ hasText: '?' })
    console.log('? buttons on pricing settings: ' + (await questionBtns.count()))

    const couplesRates = page.locator('text=Couples Rates')
    const groupRates = page.locator('text=Group Rates')
    const travel = page.locator('text=Travel')
    console.log('Couples Rates count: ' + (await couplesRates.count()))
    console.log('Group Rates count: ' + (await groupRates.count()))
    console.log('Travel count: ' + (await travel.count()))
  })

  test('06 Plate costs page', async ({ page }) => {
    await page.goto(BASE + '/finance/plate-costs', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '08-plate-costs')

    const questionBtns = page.locator('button').filter({ hasText: '?' })
    console.log('? buttons on plate costs: ' + (await questionBtns.count()))

    const truePlateCost = page.locator('text=True Plate Cost')
    console.log('True Plate Cost count: ' + (await truePlateCost.count()))
  })

  test('07 Food Costing Guide help page', async ({ page }) => {
    await page.goto(BASE + '/help/food-costing', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await shot(page, '09-food-costing-guide')

    const headings = page.locator('h1, h2')
    const hCount = await headings.count()
    console.log('Headings found: ' + hCount)
    if (hCount > 0) {
      const firstH = await headings.first().textContent()
      console.log('First heading: ' + firstH)
    }

    const tables = page.locator('table')
    console.log('Tables found: ' + (await tables.count()))

    const cards = page.locator('[class*="card"], [class*="Card"]')
    console.log('Card elements: ' + (await cards.count()))
  })

  test('08 Dashboard food cost stat', async ({ page }) => {
    await page.goto(BASE + '/dashboard', { waitUntil: 'commit', timeout: 60000 })
    await page.waitForTimeout(3000)
    await page.waitForTimeout(2000)
    await shot(page, '10-dashboard')

    const foodCostText = page.locator('text=Food Cost')
    console.log('Food Cost text count on dashboard: ' + (await foodCostText.count()))

    const targetText = page.locator('text=/target/i')
    console.log('Target text count: ' + (await targetText.count()))

    const withinText = page.locator('text=/Within/i')
    console.log('Within text count: ' + (await withinText.count()))
  })
})
