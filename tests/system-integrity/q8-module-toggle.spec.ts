/**
 * Q8: Module Toggle Fidelity
 *
 * Toggling a module off must remove its nav link.
 * Toggling it back on must restore the link.
 * Failure = nav shows stale links that ignore module preferences.
 */
import { test, expect } from '@playwright/test'

// "Culinary" is a non-essential, toggleable module with a clear nav link (/culinary).
const MODULE_LABEL = 'Culinary'
const MODULE_NAV_HREF = '/culinary'

test.describe('Module toggle fidelity', () => {
  test('toggling a module off removes its nav link', async ({ page }) => {
    // Go to modules settings
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Find the toggle button for Culinary
    const toggleBtn = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 })

    // Determine current state from the button's class (bg-brand-500 = on)
    const currentClass = await toggleBtn.getAttribute('class')
    const isCurrentlyOn = currentClass?.includes('bg-brand-500') ?? false

    // If currently off, turn it on first so we have a known starting state
    if (!isCurrentlyOn) {
      await toggleBtn.click()
      await page.waitForTimeout(1_000)
    }

    // Navigate to dashboard and verify nav link IS present
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const navLink = page.locator(`a[href="${MODULE_NAV_HREF}"]`).first()
    await expect(navLink, 'Nav link should be visible when module is ON').toBeVisible({
      timeout: 5_000,
    })

    // Go back to modules settings and toggle it OFF
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const toggleBtnOff = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await toggleBtnOff.click()
    // Wait for the server action to persist
    await page.waitForTimeout(1_500)

    // Navigate to dashboard and verify nav link is GONE
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const navLinkAfterOff = page.locator(`a[href="${MODULE_NAV_HREF}"]`).first()
    await expect(navLinkAfterOff, 'Nav link must be absent when module is OFF').toBeHidden({
      timeout: 5_000,
    })

    // Restore: toggle back ON so we don't leave the account broken
    await page.goto('/settings/modules', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const toggleBtnRestore = page.getByRole('button', { name: `Toggle ${MODULE_LABEL}` })
    await toggleBtnRestore.click()
    await page.waitForTimeout(1_500)

    // Final check: nav link is back
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const navLinkRestored = page.locator(`a[href="${MODULE_NAV_HREF}"]`).first()
    await expect(
      navLinkRestored,
      'Nav link must return when module is toggled back ON'
    ).toBeVisible({ timeout: 5_000 })
  })
})
