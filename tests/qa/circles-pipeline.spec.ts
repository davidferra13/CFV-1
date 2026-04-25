/**
 * QA test: Circles pipeline UI - with form sign-in fallback
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3100'

test.describe('Circles Pipeline UI (form auth)', () => {
  test('sign in via form and navigate to circles', async ({ page }) => {
    // Go to sign in
    await page.goto(BASE_URL + '/auth/signin', { waitUntil: 'networkidle' })
    await page.screenshot({
      path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-00-signin.png',
      fullPage: true,
    })

    // Fill in credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

    if (await emailInput.isVisible()) {
      await emailInput.fill('agent@local.chefflow')
      await passwordInput.fill('CHEF.jdgyuegf9924092.FLOW')
      await page.screenshot({
        path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-00b-filled.png',
        fullPage: true,
      })

      // Click sign in button
      const signInBtn = page.locator('button', { hasText: 'Sign In' }).first()
      await signInBtn.click()

      // Wait for navigation or error
      await page.waitForTimeout(5000)
      await page.screenshot({
        path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-00c-after-signin.png',
        fullPage: true,
      })

      const currentUrl = page.url()
      console.log('Current URL after sign in:', currentUrl)

      if (currentUrl.includes('/dashboard') || currentUrl.includes('/circles')) {
        // Navigate to circles
        await page.goto(BASE_URL + '/circles', { waitUntil: 'networkidle', timeout: 30000 })
        await page.screenshot({
          path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-01-full-page.png',
          fullPage: true,
        })

        // Check heading
        const heading = page.locator('h1', { hasText: 'Circles' })
        const headingVisible = await heading.isVisible().catch(() => false)
        console.log('Circles heading:', headingVisible ? 'VISIBLE' : 'NOT VISIBLE')

        // Pipeline labels
        const pipelineLabels = ['Leads', 'Quoted', 'Booked', 'Live', 'Past']
        for (const label of pipelineLabels) {
          const el = page.locator('text=' + label).first()
          const isVisible = await el.isVisible().catch(() => false)
          console.log('Pipeline group "' + label + '":', isVisible ? 'VISIBLE' : 'NOT VISIBLE')
        }

        const activePipeline = page.locator('text=Active pipeline')
        const apVisible = await activePipeline.isVisible().catch(() => false)
        console.log('Active pipeline label:', apVisible ? 'VISIBLE' : 'NOT VISIBLE')

        // Filter pills
        const filterLabels = ['All', 'Needs Action', 'Pipeline', 'Past']
        for (const label of filterLabels) {
          const pill = page.locator('button', { hasText: label }).first()
          const isVisible = await pill.isVisible().catch(() => false)
          console.log('Filter pill "' + label + '":', isVisible ? 'VISIBLE' : 'NOT VISIBLE')
        }

        await page.screenshot({
          path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-02-pipeline.png',
          fullPage: true,
        })

        // Click Needs Action
        const needsActionBtn = page.locator('button', { hasText: 'Needs Action' }).first()
        if (await needsActionBtn.isVisible().catch(() => false)) {
          await needsActionBtn.click()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-04-needs-action.png',
            fullPage: true,
          })
          console.log('Needs Action filter: clicked')
        }

        // Click Pipeline
        const pipelineBtn = page.locator('button', { hasText: 'Pipeline' }).first()
        if (await pipelineBtn.isVisible().catch(() => false)) {
          await pipelineBtn.click()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-05-pipeline.png',
            fullPage: true,
          })
          console.log('Pipeline filter: clicked')
        }

        // Click Past
        const pastBtn = page.locator('button', { hasText: /^Past$/ })
        if (await pastBtn.isVisible().catch(() => false)) {
          await pastBtn.click()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-06-past.png',
            fullPage: true,
          })
          console.log('Past filter: clicked')
        }

        // Circle rows
        const circleLinks = page.locator('a[href^="/circles/"]')
        console.log('Circle row links:', await circleLinks.count())

        // Stage badges
        const stageLabels = [
          'New',
          'Waiting',
          'Action',
          'Quoted',
          'Accepted',
          'Paid',
          'Confirmed',
          'Live',
          'Done',
          'Cancelled',
          'Declined',
          'Expired',
          'Active',
        ]
        for (const label of stageLabels) {
          const badges = page.locator('span', { hasText: new RegExp('^' + label + '$') })
          const count = await badges.count()
          if (count > 0) console.log('Stage badge "' + label + '":', count, 'found')
        }

        // Tabs
        const feedTab = page.locator('button', { hasText: 'Feed' }).first()
        if (await feedTab.isVisible().catch(() => false)) {
          await feedTab.click()
          await page.waitForTimeout(500)
          await page.screenshot({
            path: 'C:/Users/david/Documents/CFv1/tests/qa/screenshots/circles-08-feed.png',
            fullPage: true,
          })
          console.log('Feed tab: clicked')
        }

        // Attention banner
        const banner = page.locator('[class*="border-amber"]').first()
        console.log(
          'Attention banner:',
          (await banner.isVisible().catch(() => false)) ? 'VISIBLE' : 'NOT VISIBLE'
        )
      } else {
        console.log('SIGN IN FAILED - still on:', currentUrl)
        // Check for error messages
        const errorMsg = page.locator('[class*="error"], [class*="Error"], [role="alert"]').first()
        if (await errorMsg.isVisible().catch(() => false)) {
          console.log('Error message:', await errorMsg.textContent())
        }
      }
    }
  })
})
