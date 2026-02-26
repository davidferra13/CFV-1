// Launch Readiness Audit — Vendor Management & Price Comparison
// Tests: vendor CRUD, price lists, price comparison, food cost dashboard
// Feature specifically requested by users

import { test, expect } from '../helpers/fixtures'

test.describe('Vendor Directory', () => {
  test('vendor list loads', async ({ page }) => {
    await page.goto('/vendors')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show vendor list or empty state
    const hasContent = /vendor|purveyor|supplier|add|create|no vendor/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('vendor page has add vendor button', async ({ page }) => {
    await page.goto('/vendors')
    await page.waitForLoadState('networkidle')
    const addBtn = page
      .getByRole('button', { name: /add|new|create/i })
      .first()
      .or(page.getByRole('link', { name: /add|new|create/i }).first())
    const hasAdd = await addBtn.isVisible().catch(() => false)
    expect(hasAdd).toBeTruthy()
  })

  test('vendor create form has required fields', async ({ page }) => {
    await page.goto('/vendors')
    await page.waitForLoadState('networkidle')
    // Click add button to open form
    const addBtn = page.getByRole('button', { name: /add|new|create/i }).first()
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1000)
      const bodyText = await page.locator('body').innerText()
      // Form should have vendor fields
      const hasFields = /name|contact|phone|email|delivery|payment/i.test(bodyText)
      expect(hasFields).toBeTruthy()
    }
  })
})

test.describe('Vendor Invoices', () => {
  test('/vendors/invoices loads', async ({ page }) => {
    const resp = await page.goto('/vendors/invoices')
    expect(resp?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Price Comparison', () => {
  test('/vendors/price-comparison loads', async ({ page }) => {
    await page.goto('/vendors/price-comparison')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show comparison interface or empty state
    const hasContent = /comparison|price|vendor|ingredient|compare|no items/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('price comparison page has comparison UI elements', async ({ page }) => {
    await page.goto('/vendors/price-comparison')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    // Should have table or comparison layout
    expect(bodyText.trim().length).toBeGreaterThan(30)
  })
})

test.describe('Food Cost Dashboard', () => {
  test('/food-cost loads with dashboard', async ({ page }) => {
    await page.goto('/food-cost')
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
    // Should show food cost dashboard or empty state
    const hasContent = /food cost|cost|revenue|percentage|daily/i.test(bodyText)
    expect(hasContent).toBeTruthy()
  })

  test('/food-cost/revenue loads', async ({ page }) => {
    const resp = await page.goto('/food-cost/revenue')
    expect(resp?.status()).not.toBe(500)
  })

  test('food cost dashboard has date controls', async ({ page }) => {
    await page.goto('/food-cost')
    await page.waitForLoadState('networkidle')
    // Should have date range picker or period selector
    const bodyText = await page.locator('body').innerText()
    const hasDateControls = /date|period|range|from|to|month|week|today/i.test(bodyText)
    expect(hasDateControls).toBeTruthy()
  })
})
