// Interaction Layer - Staff Portal Theme
// Verifies the staff shell uses the shared app theme provider with a light default.

import type { Locator, Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'

async function clearStoredTheme(page: Page, route: string) {
  await page.goto(route)
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => {
    window.localStorage.removeItem('chefflow-theme')
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function getVisibleToggle(page: Page): Promise<Locator> {
  const toggles = page.getByTestId('theme-toggle')
  const count = await toggles.count()

  for (let index = 0; index < count; index += 1) {
    const toggle = toggles.nth(index)
    if (await toggle.isVisible().catch(() => false)) {
      return toggle
    }
  }

  throw new Error('No visible theme toggle found')
}

test.describe('Staff Portal - Theme', () => {
  test('staff shell theme defaults to light and persists across navigation + reload', async ({
    page,
  }) => {
    await clearStoredTheme(page, '/staff-dashboard')

    await expect(page.locator('html')).not.toHaveClass(/dark/)

    const toggle = await getVisibleToggle(page)
    await expect(toggle).toBeVisible()
    await toggle.click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('chefflow-theme')))
      .toBe('dark')

    await page.goto('/staff-tasks')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
