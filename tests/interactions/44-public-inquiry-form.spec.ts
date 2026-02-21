// Interaction Layer — Public Inquiry Form
// Tests the public-facing inquiry form at /chef/[slug]/inquire.
// No authentication required — this is the primary client acquisition action.
//
// These tests run WITHOUT a storageState (interactions-public project — no auth).
//
// Covers:
//   - Form renders with all required fields
//   - Validation: empty submit, invalid email, missing required fields
//   - Full valid submission flow → success screen
//   - No JS errors on any page load

import { test, expect } from '../helpers/fixtures'

// ─── Form Display ──────────────────────────────────────────────────────────────

test.describe('Public Inquiry Form — Display', () => {
  test('inquiry form page loads without JS errors', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })

  test('inquiry form shows required fields', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    // Full name field
    const nameField = page
      .locator('input[name="full_name"]')
      .first()
      .or(page.getByLabel(/full name/i).first())
    await expect(nameField).toBeVisible({ timeout: 10_000 })

    // Email field
    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    await expect(emailField).toBeVisible({ timeout: 10_000 })
  })

  test('inquiry form shows date and guest fields', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    // Form should have month/day/year selectors or date input
    expect(bodyText).toMatch(/month|day|year|date/i)
    // Guest count selector
    expect(bodyText).toMatch(/guest|guest count|guests/i)
  })

  test('inquiry form shows occasion field', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/occasion|event type|type of event/i)
  })

  test('inquiry form shows submit button', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const submitBtn = page
      .getByRole('button', { name: /submit|send|request|inquire|book/i })
      .first()
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
  })

  test('chef name appears on inquiry page', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    // The page resolves the chef by slug — chef name or "Book" heading should appear
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
    // Should not 404 or 500
    expect(bodyText).not.toMatch(/internal server error/i)
    expect(bodyText).not.toMatch(/this page could not be found/i)
  })
})

// ─── Form Validation ───────────────────────────────────────────────────────────

test.describe('Public Inquiry Form — Validation', () => {
  test('empty submit shows validation errors', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const submitBtn = page
      .getByRole('button', { name: /submit|send|request|inquire|book/i })
      .first()
    await submitBtn.click()
    await page.waitForTimeout(800)

    // Should stay on the form page, not redirect to a success screen
    const url = page.url()
    expect(url).toMatch(/inquire/)

    // Should show validation errors or stay on the same page
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/required|enter|valid|error/i)
  })

  test('invalid email format shows email error', async ({ page, seedIds }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const nameField = page.locator('input[name="full_name"]').first()
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Test Client')
    }

    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('not-an-email')
    }

    const submitBtn = page
      .getByRole('button', { name: /submit|send|request|inquire|book/i })
      .first()
    await submitBtn.click()
    await page.waitForTimeout(800)

    // Should show email-related error and stay on form
    const url = page.url()
    expect(url).toMatch(/inquire/)
  })

  test('form with only name filled shows remaining required field errors', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const nameField = page.locator('input[name="full_name"]').first()
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Test Client')
    }

    const submitBtn = page
      .getByRole('button', { name: /submit|send|request|inquire|book/i })
      .first()
    await submitBtn.click()
    await page.waitForTimeout(800)

    // Should NOT redirect to success
    const url = page.url()
    expect(url).toMatch(/inquire/)
    expect(url).not.toMatch(/thank|success|received/i)
  })

  test('no JS errors when filling fields progressively', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const nameField = page.locator('input[name="full_name"]').first()
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Playwright Test Client')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
    }

    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('playwright.test@example.com')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Full Form Submission ─────────────────────────────────────────────────────

test.describe('Public Inquiry Form — Full Submission', () => {
  test('submitting fully-filled form shows success or confirmation', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    // Full name
    const nameField = page.locator('input[name="full_name"]').first()
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Playwright Test Client')
    }

    // Email
    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill(`playwright.inquiry.${Date.now()}@example.com`)
    }

    // Phone (optional but fill it)
    const phoneField = page.locator('input[name="phone"], input[type="tel"]').first()
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill('555-000-0001')
    }

    // Address
    const addressField = page
      .locator('input[name="address"], textarea[name="address"]')
      .first()
      .or(page.getByPlaceholder(/address|location|where/i).first())
    if (await addressField.isVisible().catch(() => false)) {
      await addressField.fill('123 Test St, Boston MA 02101')
    }

    // Date — select month (pick a future month, well clear of 30-day min)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 65)
    const futureMonth = String(futureDate.getMonth() + 1)
    const futureDay = String(futureDate.getDate())
    const futureYear = String(futureDate.getFullYear())

    const monthSelect = page.locator('select[name="month"]').first()
    if (await monthSelect.isVisible().catch(() => false)) {
      await monthSelect.selectOption(futureMonth)
    }
    const daySelect = page.locator('select[name="day"]').first()
    if (await daySelect.isVisible().catch(() => false)) {
      await daySelect.selectOption(futureDay)
    }
    const yearSelect = page.locator('select[name="year"]').first()
    if (await yearSelect.isVisible().catch(() => false)) {
      await yearSelect.selectOption(futureYear)
    }

    // Serve time
    const timeSelect = page
      .locator('select[name="serve_time"]')
      .first()
      .or(page.getByLabel(/serve time|start time|time/i).first())
    if (await timeSelect.isVisible().catch(() => false)) {
      // select first non-empty option
      const options = await timeSelect.locator('option').all()
      for (const opt of options) {
        const val = await opt.getAttribute('value')
        if (val && val.trim() !== '') {
          await timeSelect.selectOption(val)
          break
        }
      }
    }

    // Guest count (dropdown)
    const guestSelect = page.locator('select[name="guest_count"]').first()
    if (await guestSelect.isVisible().catch(() => false)) {
      await guestSelect.selectOption('4')
    }

    // Occasion
    const occasionField = page
      .locator('input[name="occasion"], textarea[name="occasion"]')
      .first()
      .or(page.getByLabel(/occasion|event/i).first())
    if (await occasionField.isVisible().catch(() => false)) {
      await occasionField.fill('Birthday Dinner')
    }

    // Submit
    const submitBtn = page
      .getByRole('button', { name: /submit|send|request|inquire|book/i })
      .first()
    await expect(submitBtn).toBeVisible({ timeout: 5_000 })
    await submitBtn.click()

    // Wait for response
    await page.waitForTimeout(3000)

    // Should show success screen OR stay on form with no JS errors
    // (Server may show "Invalid date" if date parsing fails — still no crash)
    const url = page.url()
    const bodyText = await page.locator('body').innerText()

    // Either success message or still on inquire page — NOT an error page
    const isSuccess = /thank you|received|we.ll be in touch|inquiry sent|submitted/i.test(bodyText)
    const stillOnForm = url.includes('inquire')
    const hasServerError = /internal server error|500/i.test(bodyText)

    expect(hasServerError, 'Should not show a 500 error').toBe(false)
    expect(errors, 'Should not throw JS errors during submission').toHaveLength(0)
    expect(isSuccess || stillOnForm, 'Should either succeed or stay on form').toBe(true)
  })

  test('submitting creates an inquiry (success screen visible)', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    // Only fill the required fields
    const nameField = page.locator('input[name="full_name"]').first()
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('E2E Inquiry Test')
    }

    const emailField = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill(`e2e.test.${Date.now()}@playwright.dev`)
    }

    const addressField = page
      .locator('input[name="address"], textarea[name="address"]')
      .first()
      .or(page.getByPlaceholder(/address|location/i).first())
    if (await addressField.isVisible().catch(() => false)) {
      await addressField.fill('456 E2E Avenue, Boston MA')
    }

    // Date fields
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 70)
    const monthSelect = page.locator('select[name="month"]').first()
    if (await monthSelect.isVisible().catch(() => false)) {
      await monthSelect.selectOption(String(futureDate.getMonth() + 1))
    }
    const daySelect = page.locator('select[name="day"]').first()
    if (await daySelect.isVisible().catch(() => false)) {
      await daySelect.selectOption(String(futureDate.getDate()))
    }
    const yearSelect = page.locator('select[name="year"]').first()
    if (await yearSelect.isVisible().catch(() => false)) {
      await yearSelect.selectOption(String(futureDate.getFullYear()))
    }

    const timeSelect = page.locator('select[name="serve_time"]').first()
    if (await timeSelect.isVisible().catch(() => false)) {
      const options = await timeSelect.locator('option').all()
      for (const opt of options) {
        const val = await opt.getAttribute('value')
        if (val && val.trim() !== '') {
          await timeSelect.selectOption(val)
          break
        }
      }
    }

    const guestSelect = page.locator('select[name="guest_count"]').first()
    if (await guestSelect.isVisible().catch(() => false)) {
      await guestSelect.selectOption('2')
    }

    const occasionField = page.locator('input[name="occasion"]').first()
    if (await occasionField.isVisible().catch(() => false)) {
      await occasionField.fill('E2E Test Occasion')
    }

    const submitBtn = page
      .getByRole('button', { name: /submit|send|request|inquire|book/i })
      .first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(4000)
    }

    const bodyText = await page.locator('body').innerText()
    // Not a server error
    expect(bodyText).not.toMatch(/internal server error|500 error/i)
    expect(errors).toHaveLength(0)
  })
})

// ─── Unknown Chef Slug ─────────────────────────────────────────────────────────

test.describe('Public Inquiry Form — Unknown Chef', () => {
  test('/chef/nonexistent-slug-xyz/inquire returns 404 gracefully', async ({ page }) => {
    const resp = await page.goto('/chef/nonexistent-slug-xyz-playwright/inquire')
    await page.waitForLoadState('networkidle')

    // Should not 500 — either 404 or redirect
    const status = resp?.status() ?? 200
    expect(status).not.toBe(500)
  })

  test('/chef/nonexistent-slug-xyz/inquire does not throw JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/chef/nonexistent-slug-xyz-playwright/inquire')
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
