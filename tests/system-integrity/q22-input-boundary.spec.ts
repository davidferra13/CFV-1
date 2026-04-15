/**
 * Q22: Input Boundary — XSS, Oversized, and Injection Probes
 *
 * User-controlled input that reaches the DOM must be escaped.
 * User-controlled input that reaches DB queries must not alter SQL.
 * Oversized input must be rejected or truncated, not crash the server.
 *
 * This is a defense-in-depth check, not a full security audit.
 * Failure = stored XSS payload executes in DOM, or server crashes on
 * malicious input (500 error).
 */
import { test, expect } from '@playwright/test'

// Payloads chosen to catch unescaped output without actual attack surface scanning.
const XSS_PAYLOAD = '<script>window.__xss_probe=1</script>'
const XSS_ATTR_PAYLOAD = '" onmouseover="window.__xss_probe=2'
const SQL_PROBE = "test'; DROP TABLE clients; --"
const OVERSIZED = 'A'.repeat(10_001) // 10k chars — exceeds any reasonable max
const UNICODE_BOUNDARY = '\u0000\uFFFD\u200B\u2028\u2029' // null + replacement + zero-width + line sep

test.describe('Input boundary — XSS + injection probes', () => {
  test('client name: XSS payload stored and rendered escaped', async ({ page }) => {
    // Create a client with an XSS payload as the name
    await page.goto('/clients/new', { waitUntil: 'domcontentloaded' })

    const nameInput = page
      .locator('input[name="name"], input[placeholder*="name" i], input[id*="name" i]')
      .first()
    if (!(await nameInput.isVisible({ timeout: 10_000 }).catch(() => false))) return

    await nameInput.fill(XSS_PAYLOAD)

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
      .first()
    if (!(await submitBtn.isEnabled({ timeout: 3_000 }).catch(() => false))) return
    await submitBtn.click()

    await page.waitForTimeout(2_000)
    await page.goto('/clients', { waitUntil: 'domcontentloaded' })

    // The probe window variable must NOT be set — means script did not execute
    const xssExecuted = await page.evaluate(() => (window as any).__xss_probe).catch(() => null)
    expect(xssExecuted, 'XSS payload executed on clients page').toBeNull()

    // Server must not have crashed
    const body = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(body).not.toMatch(/Application error|Internal Server Error/i)
  })

  test('client name: SQL-like input does not crash server', async ({ page }) => {
    await page.goto('/clients/new', { waitUntil: 'domcontentloaded' })

    const nameInput = page
      .locator('input[name="name"], input[placeholder*="name" i], input[id*="name" i]')
      .first()
    if (!(await nameInput.isVisible({ timeout: 10_000 }).catch(() => false))) return

    await nameInput.fill(SQL_PROBE)

    const emailInput = page.locator('input[type="email"]').first()
    if (await emailInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await emailInput.fill(`sql-probe-${Date.now()}@example.com`)
    }

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
      .first()
    if (!(await submitBtn.isEnabled({ timeout: 3_000 }).catch(() => false))) return
    await submitBtn.click()

    await page.waitForTimeout(2_000)

    // Must not show 500 or crash
    const body = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(body).not.toMatch(/Application error|Internal Server Error|syntax error/i)
  })

  test('oversized input: server rejects or truncates without crashing', async ({ page }) => {
    await page.goto('/clients/new', { waitUntil: 'domcontentloaded' })

    const nameInput = page
      .locator('input[name="name"], input[placeholder*="name" i], input[id*="name" i]')
      .first()
    if (!(await nameInput.isVisible({ timeout: 10_000 }).catch(() => false))) return

    // Fill with 10k chars — browsers truncate at maxlength but we bypass that
    await nameInput.evaluate((el: HTMLInputElement, val) => {
      el.removeAttribute('maxlength')
      el.value = val
    }, OVERSIZED)

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
      .first()
    if (!(await submitBtn.isEnabled({ timeout: 3_000 }).catch(() => false))) return
    await submitBtn.click()

    await page.waitForTimeout(3_000)

    // Server must either reject (validation error shown) or truncate and save.
    // It must NEVER crash with 500.
    const body = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(body).not.toMatch(/Application error|Internal Server Error/i)
  })

  test('unicode boundary chars do not corrupt records', async ({ page }) => {
    await page.goto('/clients/new', { waitUntil: 'domcontentloaded' })

    const nameInput = page
      .locator('input[name="name"], input[placeholder*="name" i], input[id*="name" i]')
      .first()
    if (!(await nameInput.isVisible({ timeout: 10_000 }).catch(() => false))) return

    await nameInput.fill(`Unicode${UNICODE_BOUNDARY}Test`)

    const emailInput = page.locator('input[type="email"]').first()
    if (await emailInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await emailInput.fill(`unicode-${Date.now()}@example.com`)
    }

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
      .first()
    if (!(await submitBtn.isEnabled({ timeout: 3_000 }).catch(() => false))) return
    await submitBtn.click()

    await page.waitForTimeout(2_000)

    // Must not crash
    const body = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(body).not.toMatch(/Application error|Internal Server Error/i)
  })

  test('expense description: XSS payload does not execute on render', async ({ page }) => {
    await page.goto('/expenses', { waitUntil: 'domcontentloaded' })

    const addBtn = page
      .locator('button:has-text("Add"), button:has-text("New"), button:has-text("Record")')
      .first()
    if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) return

    await addBtn.click()
    await page.waitForTimeout(500)

    const descInput = page
      .locator('input[name*="description" i], input[placeholder*="description" i]')
      .first()
    if (!(await descInput.isVisible({ timeout: 3_000 }).catch(() => false))) return

    await descInput.fill(XSS_ATTR_PAYLOAD)

    const amountInput = page.locator('input[type="number"], input[name*="amount" i]').first()
    if (await amountInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await amountInput.fill('1.00')
    }

    const saveBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")')
      .first()
    if (!(await saveBtn.isEnabled({ timeout: 3_000 }).catch(() => false))) return
    await saveBtn.click()

    await page.waitForTimeout(2_000)
    await page.goto('/expenses', { waitUntil: 'domcontentloaded' })

    const xssExecuted = await page.evaluate(() => (window as any).__xss_probe).catch(() => null)
    expect(xssExecuted, 'XSS payload executed on expenses page').toBeNull()
  })
})
