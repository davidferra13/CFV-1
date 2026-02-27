// Diagnostic Suite 04 — GDPR, Data Deletion & Account Management
// Tests: Account deletion, data export, privacy settings, compliance pages

import { test, expect } from '../helpers/fixtures'

// ─── Account Deletion Flow ──────────────────────────────────────────────────

test.describe('Account Deletion', () => {
  test('delete account settings page loads', async ({ page }) => {
    const resp = await page.goto('/settings/delete-account')
    if (resp && resp.status() !== 404) {
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/500|internal server error/i)
      // Should warn about consequences
      const hasWarning = /delete|remove|permanent|cancel|account|data/i.test(body)
      expect(hasWarning).toBeTruthy()
    }
  })

  test('reactivate account page loads', async ({ page }) => {
    const resp = await page.goto('/reactivate-account')
    // Should either load the reactivation page or redirect to dashboard
    expect(resp?.status()).toBeLessThan(500)
  })
})

// ─── Privacy & Compliance ───────────────────────────────────────────────────

test.describe('Privacy & Compliance Pages', () => {
  test('AI privacy settings page loads', async ({ page }) => {
    await page.goto('/settings/ai-privacy')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
    const hasPrivacy = /privacy|data|local|ai|ollama|consent/i.test(body)
    expect(hasPrivacy).toBeTruthy()
  })

  test('privacy policy public page loads', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('terms of service public page loads', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Data Export ────────────────────────────────────────────────────────────

test.describe('Data Export', () => {
  test('settings page has data export option', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    const hasExport = /export|download|backup|data/i.test(body)
    expect(hasExport).toBeTruthy()
  })
})

// ─── Security Settings ─────────────────────────────────────────────────────

test.describe('Security Settings', () => {
  test('general settings page loads', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('profile settings page loads', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('business settings page loads', async ({ page }) => {
    await page.goto('/settings/business')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})
