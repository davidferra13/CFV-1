// Settings E2E Tests
// Verifies that all major settings pages load without errors.

import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

const settingsPages = [
  { route: ROUTES.settings, label: 'Settings hub' },
  { route: ROUTES.settingsProfile, label: 'Profile settings' },
  { route: ROUTES.settingsPublicProfile, label: 'Public profile settings' },
  { route: ROUTES.settingsAutomations, label: 'Automations' },
  { route: ROUTES.settingsNotifications, label: 'Notifications' },
  { route: ROUTES.settingsDashboard, label: 'Dashboard layout' },
  { route: ROUTES.settingsNavigation, label: 'Navigation preferences' },
  { route: ROUTES.settingsIntegrations, label: 'Integrations' },
  { route: ROUTES.settingsEmergency, label: 'Emergency planning' },
  { route: ROUTES.settingsCompliance, label: 'Food safety compliance' },
] as const

test.describe('Settings Pages', () => {
  for (const { route, label } of settingsPages) {
    test(`${label} (${route}) loads without 500 error`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(route)
      await expect(page).not.toHaveURL(/auth\/signin/)

      // Must not be a hard error page
      await expect(page.getByText(/internal server error|500/i)).not.toBeVisible()

      // Log any JS errors as annotations (non-fatal for load test)
      if (errors.length > 0) {
        test.info().annotations.push({
          type: 'warning',
          description: `JS errors on ${route}: ${errors.join('; ')}`,
        })
      }
    })
  }

  test('profile form pre-fills with chef business name', async ({ page }) => {
    await page.goto(ROUTES.settingsProfile)
    await page.waitForLoadState('networkidle')
    // Business name should be visible in the form
    await expect(page.locator('[value="TEST - E2E Kitchen"]')).toBeVisible({ timeout: 10_000 })
  })

  test('automations list renders', async ({ page }) => {
    await page.goto(ROUTES.settingsAutomations)
    await page.waitForLoadState('networkidle')
    // Should render without error regardless of whether there are automations
    await expect(page.getByText(/automation|rule|trigger/i)).toBeVisible({ timeout: 10_000 })
  })
})
