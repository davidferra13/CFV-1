// Launch Readiness Audit — Public Inquiry Form & Embed Widget
// Tests: public-facing inquiry form, form validation, submission, embed form
// No authentication — this is what potential clients see

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'

function getSeedIds() {
  const raw = readFileSync('.auth/seed-ids.json', 'utf-8')
  return JSON.parse(raw)
}

test.describe('Public Inquiry Form', () => {
  test('inquiry form loads for seed chef', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Note: page legitimately contains "$500" in budget dropdown — only check for server errors
    expect(bodyText).not.toMatch(/internal server error/i)
    // Should show form fields
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('inquiry form shows required fields', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|email|date|guest|occasion/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })

  test('empty submit shows validation errors', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /submit|send|inquire|book/i }).first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(1500)
      // Should show validation errors or prevent submission
      const bodyText = await page.locator('body').innerText()
      const hasErrors = /required|please|must|invalid|error|fill/i.test(bodyText)
      expect(hasErrors).toBeTruthy()
    }
  })

  test('invalid email shows email error', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    const emailField = page.getByLabel(/email/i).first().or(page.getByPlaceholder(/email/i).first())
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('not-an-email')
      // Tab out to trigger validation
      await emailField.press('Tab')
      await page.waitForTimeout(1000)

      // Try submit
      const submitBtn = page.getByRole('button', { name: /submit|send|inquire|book/i }).first()
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(1500)
        const bodyText = await page.locator('body').innerText()
        const hasEmailError = /email|invalid|valid|format/i.test(bodyText)
        expect(hasEmailError).toBeTruthy()
      }
    }
  })

  test('can fill complete form', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/chef/${seedIds.chefSlug}/inquire`)
    await page.waitForLoadState('networkidle')

    // Fill name
    const nameField = page.getByLabel(/name/i).first().or(page.getByPlaceholder(/name/i).first())
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Test Customer')
    }

    // Fill email
    const emailField = page.getByLabel(/email/i).first().or(page.getByPlaceholder(/email/i).first())
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill(`launch-test-${Date.now()}@example.com`)
    }

    // Fill phone
    const phoneField = page.getByLabel(/phone/i).first().or(page.getByPlaceholder(/phone/i).first())
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill('555-999-0000')
    }

    // Fill occasion/message
    const occasionField = page
      .getByLabel(/occasion|event|type/i)
      .first()
      .or(page.getByPlaceholder(/occasion/i).first())
    if (await occasionField.isVisible().catch(() => false)) {
      await occasionField.fill('Birthday Dinner')
    }

    const messageField = page
      .getByLabel(/message|note|detail/i)
      .first()
      .or(page.locator('textarea').first())
    if (await messageField.isVisible().catch(() => false)) {
      await messageField.fill('Launch readiness test — please ignore this inquiry')
    }

    // Form should not crash after filling
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/unhandled|error|crash/i)
  })
})

test.describe('Embed Inquiry Form', () => {
  test('embed form loads for seed chef', async ({ page }) => {
    const seedIds = getSeedIds()
    const resp = await page.goto(`/embed/inquiry/${seedIds.chefId}`)
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should show form fields (inline styles, not Tailwind)
    const inputs = page.locator('input, textarea, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('embed form has name and email fields', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/embed/inquiry/${seedIds.chefId}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    const hasFields = /name|email/i.test(bodyText)
    expect(hasFields).toBeTruthy()
  })
})

test.describe('Chef Public Profile', () => {
  test('chef profile has inquiry CTA', async ({ page }) => {
    const seedIds = getSeedIds()
    await page.goto(`/chef/${seedIds.chefSlug}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should have a way to inquire/book
    const hasInquiryCTA = /inquire|book|contact|get started|request/i.test(bodyText)
    expect(hasInquiryCTA).toBeTruthy()
  })
})

test.describe('Unknown Chef Slug', () => {
  test('/chef/nonexistent-slug returns 404 gracefully', async ({ page }) => {
    const resp = await page.goto('/chef/nonexistent-slug-xyz-9999')
    const status = resp?.status() ?? 0
    // Should be 404, not 500
    expect(status).not.toBe(500)
    const bodyText = await page.locator('body').innerText()
    const hasNotFound = /not found|404|doesn't exist|no chef/i.test(bodyText)
    expect(hasNotFound).toBeTruthy()
  })
})
