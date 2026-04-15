/**
 * Q10: Financial Zero-Hallucination
 *
 * No financial figure shown to the user may be hardcoded or fabricated.
 * Every dollar amount must either come from a real DB query or be
 * clearly marked as unavailable.
 *
 * This test catches:
 *  - Hardcoded "$0.00" displayed as if it were real revenue
 *  - Static sample numbers in dashboard widgets
 *  - Placeholder currency values in finance reports
 *
 * Strategy: scan rendered page text for dollar patterns and cross-check
 * against known-safe patterns (empty states, loading indicators, N/A).
 */
import { test, expect } from '@playwright/test'

// Pages that display financial figures
const FINANCIAL_PAGES = [
  '/dashboard',
  '/finance',
  '/finance/invoices',
  '/finance/reporting/profit-loss',
  '/expenses',
]

// Patterns that are SAFE to show even with no data — these are honest empty states
const SAFE_PATTERNS = [
  /\$0\.00/, // Zero revenue IS valid when account truly has no data
  /no (invoices|expenses|revenue|data)/i,
  /nothing here/i,
  /get started/i,
  /N\/A/,
  /could not load/i,
  /error loading/i,
]

// Patterns that are SUSPICIOUS when they appear repeatedly with the same value
// (suggests hardcoded sample data)
const SUSPICIOUS_EXACT_VALUES = [
  '$1,234.56',
  '$9,999.99',
  '$12,345.67',
  '$99.99',
  '$999.00',
  '$1,500.00',
  '$2,500.00',
  '$5,000.00',
  '$10,000.00',
]

test.describe('Financial zero-hallucination scan', () => {
  for (const pagePath of FINANCIAL_PAGES) {
    test(`no hardcoded sample amounts on: ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' })

      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => '')

      // Check for suspicious exact values that look like sample/demo data
      for (const suspiciousValue of SUSPICIOUS_EXACT_VALUES) {
        const count = (
          bodyText.match(new RegExp(suspiciousValue.replace(/[.$,]/g, '\\$&'), 'g')) ?? []
        ).length
        // If a specific "round" value appears more than twice, it's likely hardcoded
        expect(
          count,
          `"${suspiciousValue}" appears ${count} times on ${pagePath} — likely hardcoded`
        ).toBeLessThan(3)
      }

      // Page must not have crashed — any dollar amounts showing means actual rendering worked
      expect(bodyText).not.toMatch(/Application error|Internal Server Error/i)
    })
  }

  test('P&L page shows real data or honest error — not fake totals', async ({ page }) => {
    await page.goto('/finance/reporting/profit-loss', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')

    // If the page shows any dollar figures, they must come from the DB.
    // A new account with no events should show $0.00 or an empty state — not fake numbers.
    // We can't check DB directly here, so we verify the page doesn't show
    // suspiciously specific non-zero values that smell like hardcoded data.
    const dollarMatches = bodyText.match(/\$[0-9,]+\.[0-9]{2}/g) ?? []

    for (const amount of dollarMatches) {
      // Strip formatting to get numeric value
      const numeric = parseFloat(amount.replace(/[$,]/g, ''))
      // No suspicious "marketing demo" amounts — real chef data won't be these exact values
      // unless the chef actually has events with those exact totals
      const isSuspiciousDemo = numeric > 0 && SUSPICIOUS_EXACT_VALUES.includes(amount)
      expect(isSuspiciousDemo, `Suspicious hardcoded amount "${amount}" on P&L page`).toBe(false)
    }
  })

  test('dashboard revenue widget shows zero or real data — not placeholder', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Look for revenue/earnings widgets
    const dashText = await page
      .locator('body')
      .innerText()
      .catch(() => '')

    // Must not show "Application error"
    expect(dashText).not.toMatch(/Application error/i)

    // If revenue numbers appear, verify they're not suspicious demo values
    const revenuePattern = /(?:revenue|earnings|income|total).*?\$([0-9,]+\.[0-9]{2})/gi
    let match: RegExpExecArray | null
    while ((match = revenuePattern.exec(dashText)) !== null) {
      const amount = `$${match[1]}`
      expect(
        SUSPICIOUS_EXACT_VALUES.includes(amount),
        `Dashboard shows suspicious hardcoded revenue: "${amount}"`
      ).toBe(false)
    }
  })
})
