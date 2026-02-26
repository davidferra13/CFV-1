// Interaction Layer — Settings Flows
// Tests that settings pages are interactive and changes can be made.
// Verifies form fields are present, fillable, and submit correctly.
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Profile Settings ─────────────────────────────────────────────────────────

test.describe('Settings — Chef Profile', () => {
  test('/settings/my-profile — profile form has fields', async ({ page }) => {
    await page.goto('/settings/my-profile')
    await page.waitForLoadState('networkidle')

    // Should have name, bio, or phone fields
    const inputs = await page.locator('input, textarea').count()
    expect(inputs, 'Profile settings should have editable fields').toBeGreaterThan(0)
  })

  test('/settings/my-profile — pre-fills with E2E chef data', async ({ page }) => {
    await page.goto('/settings/my-profile')
    await page.waitForLoadState('networkidle')

    // E2E chef has business_name = "TEST - E2E Kitchen"
    const pageText = await page.locator('body').innerText()
    const hasChefData = pageText.includes('E2E Kitchen') || pageText.includes('E2E Test Chef')
    expect(hasChefData, 'Profile should show E2E chef data').toBeTruthy()
  })

  test('/settings/my-profile — can update tagline and save', async ({ page }) => {
    await page.goto('/settings/my-profile')
    await page.waitForLoadState('networkidle')

    const taglineField = page
      .getByLabel(/tagline/i)
      .first()
      .or(page.getByPlaceholder(/tagline/i).first())

    if (await taglineField.isVisible()) {
      await taglineField.clear()
      await taglineField.fill('Updated by E2E interaction test')

      const saveBtn = page.getByRole('button', { name: /save|update/i }).first()
      await saveBtn.click()
      await page.waitForLoadState('networkidle')

      // Should show success indication or stay on page (not crash)
      const url = page.url()
      expect(url).not.toMatch(/auth\/signin/)
    } else {
      test.skip(true, 'Tagline field not found — form structure may differ')
    }
  })
})

// ─── Public Profile ───────────────────────────────────────────────────────────

test.describe('Settings — Public Profile', () => {
  test('/settings/public-profile — renders customization options', async ({ page }) => {
    await page.goto('/settings/public-profile')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Notification Settings ────────────────────────────────────────────────────

test.describe('Settings — Notifications', () => {
  test('/settings/notifications — toggles are present', async ({ page }) => {
    await page.goto('/settings/notifications')
    await page.waitForLoadState('networkidle')

    // Should have some toggle/checkbox inputs
    const toggles = await page.locator('input[type="checkbox"], button[role="switch"]').count()
    expect(toggles, 'Notification settings should have toggles').toBeGreaterThan(0)
  })

  test('/settings/notifications — toggling a preference does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/notifications')
    await page.waitForLoadState('networkidle')

    const firstToggle = page.locator('input[type="checkbox"], button[role="switch"]').first()
    if (await firstToggle.isVisible()) {
      await firstToggle.click()
      await page.waitForTimeout(500)
    }

    expect(errors, 'Toggling notification preference should not throw JS errors').toHaveLength(0)
  })
})

// ─── Automation Settings ──────────────────────────────────────────────────────

test.describe('Settings — Automations', () => {
  test('/settings/automations — automation list renders', async ({ page }) => {
    await page.goto('/settings/automations')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Dashboard Layout ─────────────────────────────────────────────────────────

test.describe('Settings — Dashboard Layout', () => {
  test('/settings/dashboard — widget configuration renders', async ({ page }) => {
    await page.goto('/settings/dashboard')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Navigation Settings ──────────────────────────────────────────────────────

test.describe('Settings — Navigation', () => {
  test('/settings/navigation — nav customization renders', async ({ page }) => {
    await page.goto('/settings/navigation')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Integration Settings ─────────────────────────────────────────────────────

test.describe('Settings — Integrations', () => {
  test('/settings/integrations — integration list renders', async ({ page }) => {
    await page.goto('/settings/integrations')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/settings/integrations — no unhandled errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/settings/integrations')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})

// ─── Compliance & Emergency ───────────────────────────────────────────────────

test.describe('Settings — Compliance & Emergency', () => {
  test('/settings/compliance — compliance page renders', async ({ page }) => {
    await page.goto('/settings/compliance')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })

  test('/settings/emergency — emergency contacts page renders', async ({ page }) => {
    await page.goto('/settings/emergency')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Client Preview ───────────────────────────────────────────────────────────

test.describe('Settings — Client Preview', () => {
  test('/settings/client-preview — shows client-facing view', async ({ page }) => {
    await page.goto('/settings/client-preview')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── Health Check ─────────────────────────────────────────────────────────────

test.describe('Settings — System Health', () => {
  test('/settings/health — system health check renders', async ({ page }) => {
    await page.goto('/settings/health')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})
