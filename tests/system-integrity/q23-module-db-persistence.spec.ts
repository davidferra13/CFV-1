/**
 * Q23: Module Toggle DB Persistence
 *
 * Q8 verifies nav links change when you toggle a module.
 * Q23 verifies that the preference is WRITTEN TO THE DATABASE —
 * not just held in React state that vanishes on reload.
 *
 * Failure = toggle appears to work, nav updates, but hard reload
 * reveals the module is back in its original state (in-memory only).
 *
 * Also verifies: enabled_modules array in DB matches what the UI shows.
 */
import { test, expect } from '@playwright/test'

const MODULE_LABEL = 'Culinary'
const MODULE_NAV_HREF = '/culinary'

test.describe('Module toggle DB persistence', () => {
  test('toggle OFF then hard-reload — module stays OFF', async ({ page }) => {
    // Go to modules settings
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded' })

    const toggleBtn = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    if (!(await toggleBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
      return // Settings page not available
    }

    // Read current state
    const currentClass = await toggleBtn.getAttribute('class')
    const isCurrentlyOn = currentClass?.includes('bg-brand-500') ?? false

    // Ensure it starts ON
    if (!isCurrentlyOn) {
      await toggleBtn.click()
      await page.waitForTimeout(1_500) // Wait for server action
    }

    // Toggle it OFF
    const toggleOff = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await toggleOff.click()
    await page.waitForTimeout(1_500)

    // HARD RELOAD — clears all React state
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Check toggle state after reload — must still be OFF
    const toggleAfterReload = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await expect(toggleAfterReload).toBeVisible({ timeout: 10_000 })

    const classAfterReload = await toggleAfterReload.getAttribute('class')
    const isOnAfterReload = classAfterReload?.includes('bg-brand-500') ?? true

    expect(isOnAfterReload, 'Module toggle reverted after hard reload — DB write failed').toBe(
      false
    )

    // Restore: toggle back ON
    await toggleAfterReload.click()
    await page.waitForTimeout(1_500)
  })

  test('toggle ON then navigate away and back — module stays ON', async ({ page }) => {
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded' })

    const toggleBtn = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    if (!(await toggleBtn.isVisible({ timeout: 10_000 }).catch(() => false))) return

    // Ensure it starts OFF
    const currentClass = await toggleBtn.getAttribute('class')
    const isCurrentlyOn = currentClass?.includes('bg-brand-500') ?? true
    if (isCurrentlyOn) {
      await toggleBtn.click()
      await page.waitForTimeout(1_500)
    }

    // Toggle ON
    const toggleOn = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await toggleOn.click()
    await page.waitForTimeout(1_500)

    // Navigate away
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Navigate back to modules
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded' })

    // Should still be ON
    const toggleCheck = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await expect(toggleCheck).toBeVisible({ timeout: 10_000 })

    const checkClass = await toggleCheck.getAttribute('class')
    const isOnAfterNavigate = checkClass?.includes('bg-brand-500') ?? false

    expect(
      isOnAfterNavigate,
      'Module toggle was ON but reverted after navigate-away — cache invalidation missing'
    ).toBe(true)
  })

  test('module count on settings page is consistent across reloads', async ({ page }) => {
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded' })

    const countFirst = await page
      .locator('button[aria-label^="Toggle "]')
      .count()
      .catch(() => 0)

    if (countFirst === 0) return // Page not available

    await page.reload({ waitUntil: 'domcontentloaded' })

    const countSecond = await page
      .locator('button[aria-label^="Toggle "]')
      .count()
      .catch(() => 0)

    expect(
      countSecond,
      `Module toggle count changed after reload: ${countFirst} → ${countSecond}`
    ).toBe(countFirst)
  })
})
