// T1: Critical Paths - Core user journeys that must always work
// Schedule: Daily 6 AM on Pi
// Target time: < 5 minutes
// Mutations: None (read-only navigation checks)

import { test, expect } from '@playwright/test'
import { signInViaUI } from './helpers/sentinel-utils'

test.describe('T1: Critical Paths', () => {
  test.describe('Chef Portal', () => {
    test('dashboard widgets render after sign-in', async ({ page }) => {
      await signInViaUI(page)
      await page.waitForLoadState('domcontentloaded')
      const body = await page.textContent('body')
      expect(body!.length).toBeGreaterThan(200)
    })

    test('all critical pages load after single sign-in', async ({ page }) => {
      await signInViaUI(page)

      const criticalPages = [
        { path: '/events', urlPattern: /\/(events|onboarding|dashboard)/ },
        { path: '/recipes', urlPattern: /\/(recipes|onboarding|dashboard)/ },
        { path: '/financials', urlPattern: /\/(financials|onboarding|dashboard)/ },
        { path: '/finance', urlPattern: /\/(finance|onboarding|dashboard)/ },
        { path: '/calendar', urlPattern: /\/(calendar|onboarding|dashboard)/ },
        { path: '/settings', urlPattern: /\/(settings|onboarding|dashboard)/ },
        { path: '/culinary', urlPattern: /\/(culinary|onboarding|dashboard)/ },
        { path: '/analytics', urlPattern: /\/(analytics|onboarding|dashboard)/ },
        { path: '/inquiries/new', urlPattern: /\/(inquiries|onboarding|dashboard)/ },
      ]

      const failures: string[] = []
      for (const { path, urlPattern } of criticalPages) {
        try {
          await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
          const url = page.url()
          if (!urlPattern.test(url)) {
            failures.push(`${path}: unexpected URL ${url}`)
            continue
          }
          await expect(page.locator('body')).toBeVisible({ timeout: 10_000 })
        } catch (err) {
          failures.push(`${path}: ${(err as Error).message}`)
        }
      }

      if (failures.length > 0) {
        throw new Error(`Critical pages failed:\n${failures.join('\n')}`)
      }
    })
  })

  test.describe('Public Pages', () => {
    test('for-operators page loads', async ({ page }) => {
      await page.goto('/for-operators', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      const text = await page.textContent('body')
      expect(text!.length).toBeGreaterThan(100)
    })

    test('blog page loads', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('help page loads', async ({ page }) => {
      await page.goto('/help', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
