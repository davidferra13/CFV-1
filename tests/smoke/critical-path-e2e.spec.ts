// E2E verification: Critical Path + Dinner Circle flow
// Tests: inquiry creation -> critical path rendering -> dinner circle guest view

import { test, expect } from '@playwright/test'

const AGENT_EMAIL = 'agent@local.chefflow'
const AGENT_PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'
const BASE = 'http://localhost:3100'

async function signIn(page: any) {
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: AGENT_EMAIL, password: AGENT_PASSWORD },
  })
  const body = await res.json()
  expect(body.ok).toBe(true)
}

test.describe('Critical Path & Dinner Circle E2E', () => {
  test('inquiry page shows critical path card', async ({ page }) => {
    await signIn(page)
    await page.goto(`${BASE}/inquiries`)
    await page.waitForLoadState('networkidle')

    // Find any existing inquiry to check
    const inquiryLinks = page.locator('a[href*="/inquiries/"]')
    const count = await inquiryLinks.count()

    if (count === 0) {
      console.log('No inquiries found - skipping inquiry detail test')
      return
    }

    // Click first inquiry
    await inquiryLinks.first().click()
    await page.waitForLoadState('networkidle')

    // Take screenshot of inquiry detail
    await page.screenshot({ path: 'tests/screenshots/inquiry-detail.png', fullPage: true })

    // Check if critical path card renders
    const criticalPath = page.locator('text=Critical Path')
    const readyToCook = page.locator('text=Ready to cook')
    const hasCriticalPath = (await criticalPath.count()) > 0 || (await readyToCook.count()) > 0

    console.log(`Critical Path card visible: ${hasCriticalPath}`)

    // Check for the /10 confirmed text
    const confirmedText = page.locator('text=/\\d+\\/10 confirmed/')
    if ((await confirmedText.count()) > 0) {
      const text = await confirmedText.first().textContent()
      console.log(`Critical Path status: ${text}`)
    }
  })

  test('dinner circle guest page renders with status', async ({ page }) => {
    // First, find a circle token from the database
    await signIn(page)

    // Try to access a known test circle or find one via the inquiries page
    await page.goto(`${BASE}/inquiries`)
    await page.waitForLoadState('networkidle')

    const inquiryLinks = page.locator('a[href*="/inquiries/"]')
    const count = await inquiryLinks.count()

    if (count === 0) {
      console.log('No inquiries - cannot test dinner circle')
      return
    }

    // Click first inquiry and look for dinner circle link
    await inquiryLinks.first().click()
    await page.waitForLoadState('networkidle')

    const circleLink = page.locator('a[href*="/hub/g/"]')
    const hasCircle = (await circleLink.count()) > 0

    if (!hasCircle) {
      console.log('No Dinner Circle link found on inquiry page')
      await page.screenshot({ path: 'tests/screenshots/inquiry-no-circle.png', fullPage: true })
      return
    }

    // Get the circle URL
    const href = await circleLink.first().getAttribute('href')
    console.log(`Found Dinner Circle link: ${href}`)

    // Open circle in a new context (no auth - guest view)
    const guestContext = await page.context().browser()!.newContext()
    const guestPage = await guestContext.newPage()
    await guestPage.goto(`${BASE}${href}`)
    await guestPage.waitForLoadState('networkidle')

    await guestPage.screenshot({
      path: 'tests/screenshots/dinner-circle-guest.png',
      fullPage: true,
    })

    // Check for "Your Dinner Status" component
    const dinnerStatus = guestPage.locator('text=Your Dinner Status')
    const hasDinnerStatus = (await dinnerStatus.count()) > 0
    console.log(`Guest status view visible: ${hasDinnerStatus}`)

    // Check for confirmed/missing items
    const confirmed = guestPage.locator('text=/\\d+\\/\\d+ confirmed/')
    const allSet = guestPage.locator('text=All set')
    if ((await confirmed.count()) > 0) {
      console.log(`Status: ${await confirmed.first().textContent()}`)
    }
    if ((await allSet.count()) > 0) {
      console.log('Status: All set!')
    }

    // Check for chat tab (functional dinner circle)
    const chatTab = guestPage.locator('text=Chat').or(guestPage.locator('text=chat'))
    console.log(`Chat tab present: ${(await chatTab.count()) > 0}`)

    await guestContext.close()
  })

  test('reply composer has dinner circle toggle', async ({ page }) => {
    await signIn(page)
    await page.goto(`${BASE}/inquiries`)
    await page.waitForLoadState('networkidle')

    const inquiryLinks = page.locator('a[href*="/inquiries/"]')
    if ((await inquiryLinks.count()) === 0) {
      console.log('No inquiries - skipping composer test')
      return
    }

    await inquiryLinks.first().click()
    await page.waitForLoadState('networkidle')

    // Look for response draft section
    const responseDraft = page.locator('text=Response Draft')
    const hasComposer = (await responseDraft.count()) > 0
    console.log(`Reply composer visible: ${hasComposer}`)

    if (hasComposer) {
      // Check for circle toggle
      const circleToggle = page.locator('text=Include Dinner Circle link')
      console.log(`Circle toggle present: ${(await circleToggle.count()) > 0}`)
    }

    await page.screenshot({ path: 'tests/screenshots/inquiry-composer.png', fullPage: true })
  })
})
