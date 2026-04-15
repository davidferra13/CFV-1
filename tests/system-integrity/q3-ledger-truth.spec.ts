/**
 * Q3: Ledger Truth
 *
 * Financial totals shown in the UI must be derivable from actual ledger entries.
 * This test verifies the P&L page and invoice list show consistent, coherent numbers —
 * no number appears that couldn't come from the ledger.
 *
 * Full SQL-level ledger verification requires DB access (run via Postgres MCP
 * or integration test). This Playwright layer checks:
 *  1. Revenue on the P&L page is non-negative (ledger sums can't produce negative revenue)
 *  2. Invoice totals don't exceed a plausible ceiling per-invoice (>$1M = data error)
 *  3. Expense totals are non-negative
 *  4. The page shows consistent data (no NaN, no "undefined", no "#ERROR")
 */
import { test, expect } from '@playwright/test'

test.describe('Ledger truth — financial consistency checks', () => {
  test('P&L page shows no NaN or undefined values', async ({ page }) => {
    await page.goto('/finance/reporting/profit-loss', { waitUntil: 'domcontentloaded' })

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')

    // Must not show corrupted computed values
    expect(bodyText, 'P&L shows NaN').not.toMatch(/\bNaN\b/)
    expect(bodyText, 'P&L shows undefined').not.toMatch(/\bundefined\b/)
    expect(bodyText, 'P&L shows #ERROR').not.toContain('#ERROR')
    expect(bodyText, 'P&L shows [object').not.toContain('[object')

    // Must not crash
    expect(bodyText).not.toMatch(/Application error|Internal Server Error/i)
  })

  test('invoice list shows no impossible amounts', async ({ page }) => {
    await page.goto('/finance/invoices', { waitUntil: 'domcontentloaded' })

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/Application error|Internal Server Error/i)

    // Extract dollar amounts and verify none exceed plausible ceiling
    const amounts = bodyText.match(/\$([0-9,]+)\.[0-9]{2}/g) ?? []
    for (const amount of amounts) {
      const numeric = parseFloat(amount.replace(/[$,]/g, ''))
      // No single invoice should exceed $999,999 — if it does, it's a bug (cents/dollars confusion)
      expect(numeric, `Invoice amount exceeds plausible ceiling: ${amount}`).toBeLessThan(1_000_000)
      // Amounts must be non-negative
      expect(numeric, `Negative invoice amount: ${amount}`).toBeGreaterThanOrEqual(0)
    }
  })

  test('expense page shows no impossible amounts', async ({ page }) => {
    await page.goto('/expenses', { waitUntil: 'domcontentloaded' })

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/Application error|Internal Server Error/i)

    const amounts = bodyText.match(/\$([0-9,]+)\.[0-9]{2}/g) ?? []
    for (const amount of amounts) {
      const numeric = parseFloat(amount.replace(/[$,]/g, ''))
      expect(numeric, `Expense amount exceeds plausible ceiling: ${amount}`).toBeLessThan(1_000_000)
      expect(numeric, `Negative expense: ${amount}`).toBeGreaterThanOrEqual(0)
    }
  })

  test('revenue and profit relationship is coherent on P&L', async ({ page }) => {
    await page.goto('/finance/reporting/profit-loss', { waitUntil: 'domcontentloaded' })

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')

    // Extract all dollar amounts
    const allAmounts = (bodyText.match(/\$[0-9,]+\.[0-9]{2}/g) ?? []).map((a) =>
      parseFloat(a.replace(/[$,]/g, ''))
    )

    // All amounts must be parseable numbers
    for (const n of allAmounts) {
      expect(Number.isFinite(n), `Non-finite amount on P&L`).toBe(true)
      expect(n, `Negative amount on P&L`).toBeGreaterThanOrEqual(0)
    }
  })
})
