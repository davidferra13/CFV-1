/**
 * Q78: Financial Display Source Derivation
 *
 * Every dollar amount rendered on the chef dashboard, event detail page,
 * or analytics page must be derived from a database query, ledger view,
 * or computed function. No hardcoded financial values displayed as if
 * they were real user data.
 *
 * Failure mode: Chef sees fake revenue numbers, makes wrong business
 * decisions based on fabricated data. This is a Zero Hallucination
 * violation (Law 2: never hide failure as zero, Law 3: never render
 * a non-functional feature as functional).
 *
 * Tests:
 *
 * 1. DASHBOARD PAGE: app/(chef)/dashboard/page.tsx has no hardcoded
 *    dollar amounts displayed as user data.
 *
 * 2. DASHBOARD WIDGETS: components/dashboard/* financial widgets derive
 *    values from await calls (server actions / queries), not literals.
 *
 * 3. EVENT FINANCIAL PAGE: app/(chef)/events/[id]/financial/page.tsx
 *    has no hardcoded financial amounts.
 *
 * 4. ANALYTICS PAGES: app/(chef)/analytics/* pages have no hardcoded
 *    financial values presented as real data.
 *
 * 5. FINANCE PAGES: app/(chef)/finance/* pages with financial displays
 *    derive values from queries, not hardcoded amounts.
 *
 * 6. NO FORMAT-CURRENCY WITH LITERALS: formatCurrency() or
 *    formatMoney() calls must not receive hardcoded numeric literals
 *    (except 0 for empty/initial states).
 *
 * 7. NO SUSPICIOUS ROUND DOLLAR AMOUNTS: Specific "demo-looking"
 *    dollar amounts like $1,234.56 or $9,999.99 must not appear
 *    as string literals in financial display files.
 *
 * Acceptable:
 *   - $0 or 0 as a default when data hasn't loaded (with loading state)
 *   - Financial constants in a shared config (PRO_PRICE_MONTHLY, etc.)
 *   - Layout/template numbers (grid sizes, padding, z-index)
 *   - Cents-to-dollars division (/ 100)
 *
 * Not acceptable:
 *   - `$29.00`, `1500`, `$12/month` displayed as if it's user data
 *   - formatCurrency(2500) with a hardcoded demo value
 *   - Revenue or balance variables initialized to non-zero literals
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q78-financial-display-derivation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

/**
 * Recursively walk a directory and return file paths matching given extensions.
 */
function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // inaccessible directory
  }
  return results
}

/**
 * Hardcoded dollar amounts that look like demo/sample data.
 * These should never appear as string literals in financial display code.
 */
const SUSPICIOUS_DOLLAR_LITERALS = [
  '$1,234.56',
  '$9,999.99',
  '$12,345.67',
  '$99.99',
  '$999.00',
  '$1,500.00',
  '$2,500.00',
  '$5,000.00',
  '$10,000.00',
  '$25,000.00',
  '$50,000.00',
  '$100,000.00',
]

/**
 * Patterns that indicate a hardcoded financial value being displayed as user data.
 * Each returns matches from source code. We look for numeric literals near
 * currency-formatting contexts.
 */
const HARDCODED_FINANCIAL_PATTERNS = [
  // formatCurrency(1234) or formatMoney(1234) with a non-zero literal
  /format(?:Currency|Money)\(\s*[1-9]\d{2,}/g,
  // revenue = 1234, balance = 5678, profit = 999 (non-zero initialization)
  /(?:revenue|balance|profit|income|earnings|total|amount)\s*[=:]\s*[1-9]\d{2,}/gi,
  // Hardcoded dollar string displayed directly: "$29.00" or "$1,500"
  /['"]\$[1-9][0-9,]+\.\d{2}['"]/g,
]

/**
 * Patterns that are acceptable (false positive filters).
 * These indicate the value is a config constant, not fake user data.
 */
const SAFE_CONTEXT_PATTERNS = [
  /PRO_PRICE/i,
  /PRICE_MONTHLY/i,
  /PRICE_YEARLY/i,
  /subscription/i,
  /plan.*price/i,
  /placeholder/i,
  /example/i,
  /sample/i,
  /test/i,
  /mock/i,
  /demo/i,
  /tooltip/i,
  /aria-label/i,
  /comment/i,
]

/**
 * Check if a match is in a safe context (config constant, comment, tooltip, etc.)
 */
function isInSafeContext(src: string, matchIndex: number): boolean {
  const contextStart = Math.max(0, matchIndex - 200)
  const contextEnd = Math.min(src.length, matchIndex + 200)
  const context = src.slice(contextStart, contextEnd)

  // Check if the line is a comment
  const lineStart = src.lastIndexOf('\n', matchIndex) + 1
  const lineContent = src.slice(lineStart, matchIndex).trim()
  if (lineContent.startsWith('//') || lineContent.startsWith('*') || lineContent.startsWith('/*')) {
    return true
  }

  return SAFE_CONTEXT_PATTERNS.some((p) => p.test(context))
}

test.describe('Q78: Financial display source derivation', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Dashboard page has no hardcoded dollar amounts as user data
  // ---------------------------------------------------------------------------
  test('dashboard page derives all financial values from queries', () => {
    const dashboardPage = resolve(ROOT, 'app/(chef)/dashboard/page.tsx')
    if (!existsSync(dashboardPage)) return

    const src = readFileSync(dashboardPage, 'utf-8')
    const rel = relative(ROOT, dashboardPage).replace(/\\/g, '/')
    const violations: string[] = []

    for (const pattern of HARDCODED_FINANCIAL_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(src)) !== null) {
        if (!isInSafeContext(src, match.index)) {
          violations.push(`${rel}: "${match[0]}" at offset ${match.index}`)
        }
      }
    }

    expect(
      violations,
      `Dashboard page has hardcoded financial values that look like user data:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Dashboard financial widgets derive values from await calls
  // ---------------------------------------------------------------------------
  test('dashboard financial widgets do not contain hardcoded financial values', () => {
    const widgetDir = resolve(ROOT, 'components/dashboard')
    if (!existsSync(widgetDir)) return

    // Financial widgets: files with money-related names
    const financialWidgetNames = [
      'revenue',
      'expense',
      'profit',
      'payment',
      'payout',
      'forecast',
      'financial',
      'invoice',
      'earnings',
      'cost',
      'hourly-rate',
      'revenue-comparison',
      'revenue-projection',
      'revenue-goal',
      'food-cost',
      'business-health',
    ]

    const widgetFiles = walkDir(widgetDir, ['.tsx', '.ts'])
    const financialWidgets = widgetFiles.filter((f) =>
      financialWidgetNames.some((name) => f.toLowerCase().includes(name))
    )

    const violations: string[] = []

    for (const filePath of financialWidgets) {
      const src = readFileSync(filePath, 'utf-8')
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      for (const pattern of HARDCODED_FINANCIAL_PATTERNS) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(src)) !== null) {
          if (!isInSafeContext(src, match.index)) {
            violations.push(`${rel}: "${match[0]}"`)
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ78 WARNING - hardcoded financial values in dashboard widgets:\n` +
          violations.map((v) => `  HARDCODED: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Dashboard financial widgets have hardcoded values:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Event financial page has no hardcoded amounts
  // ---------------------------------------------------------------------------
  test('event financial page derives all amounts from queries', () => {
    const eventFinancialPage = resolve(ROOT, 'app/(chef)/events/[id]/financial/page.tsx')
    if (!existsSync(eventFinancialPage)) return

    const src = readFileSync(eventFinancialPage, 'utf-8')
    const rel = relative(ROOT, eventFinancialPage).replace(/\\/g, '/')
    const violations: string[] = []

    for (const pattern of HARDCODED_FINANCIAL_PATTERNS) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(src)) !== null) {
        if (!isInSafeContext(src, match.index)) {
          violations.push(`${rel}: "${match[0]}"`)
        }
      }
    }

    // Also check for suspicious dollar string literals
    for (const suspicious of SUSPICIOUS_DOLLAR_LITERALS) {
      if (src.includes(suspicious)) {
        violations.push(`${rel}: contains suspicious demo amount "${suspicious}"`)
      }
    }

    expect(
      violations,
      `Event financial page has hardcoded financial values:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Analytics pages have no hardcoded financial values
  // ---------------------------------------------------------------------------
  test('analytics pages derive all financial values from queries', () => {
    const analyticsDir = resolve(ROOT, 'app/(chef)/analytics')
    if (!existsSync(analyticsDir)) return

    const analyticsFiles = walkDir(analyticsDir, ['.tsx', '.ts'])
    const violations: string[] = []

    for (const filePath of analyticsFiles) {
      const src = readFileSync(filePath, 'utf-8')
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      for (const pattern of HARDCODED_FINANCIAL_PATTERNS) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(src)) !== null) {
          if (!isInSafeContext(src, match.index)) {
            violations.push(`${rel}: "${match[0]}"`)
          }
        }
      }

      // Check for suspicious round amounts
      for (const suspicious of SUSPICIOUS_DOLLAR_LITERALS) {
        if (src.includes(suspicious)) {
          violations.push(`${rel}: suspicious demo amount "${suspicious}"`)
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ78 WARNING - hardcoded financial values in analytics pages:\n` +
          violations.map((v) => `  HARDCODED: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Analytics pages have hardcoded financial values:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Finance overview/reporting pages derive values from queries
  // ---------------------------------------------------------------------------
  test('finance reporting pages have no hardcoded financial display values', () => {
    const financeDir = resolve(ROOT, 'app/(chef)/finance')
    if (!existsSync(financeDir)) return

    // Focus on reporting and overview pages (highest risk for demo data)
    const reportingFiles = walkDir(financeDir, ['.tsx', '.ts']).filter(
      (f) =>
        f.includes('reporting') ||
        f.includes('overview') ||
        f.includes('profit-loss') ||
        f.includes('revenue')
    )

    const violations: string[] = []

    for (const filePath of reportingFiles) {
      const src = readFileSync(filePath, 'utf-8')
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      for (const pattern of HARDCODED_FINANCIAL_PATTERNS) {
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(src)) !== null) {
          if (!isInSafeContext(src, match.index)) {
            violations.push(`${rel}: "${match[0]}"`)
          }
        }
      }
    }

    expect(
      violations,
      `Finance reporting pages have hardcoded financial values:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 6: No formatCurrency/formatMoney calls with hardcoded non-zero literals
  // ---------------------------------------------------------------------------
  test('formatCurrency/formatMoney are not called with hardcoded non-zero literals', () => {
    // Scan all chef-facing app and component files
    const dirsToScan = [
      resolve(ROOT, 'app/(chef)'),
      resolve(ROOT, 'components/dashboard'),
      resolve(ROOT, 'components/finance'),
      resolve(ROOT, 'components/events'),
      resolve(ROOT, 'components/analytics'),
    ].filter(existsSync)

    const violations: string[] = []
    const formatPattern = /format(?:Currency|Money|Dollars|Cents)\(\s*([1-9]\d{2,})\s*\)/g

    for (const dir of dirsToScan) {
      const files = walkDir(dir, ['.tsx', '.ts'])
      for (const filePath of files) {
        let src: string
        try {
          src = readFileSync(filePath, 'utf-8')
        } catch {
          continue
        }

        formatPattern.lastIndex = 0
        let match
        while ((match = formatPattern.exec(src)) !== null) {
          if (!isInSafeContext(src, match.index)) {
            const rel = relative(ROOT, filePath).replace(/\\/g, '/')
            violations.push(`${rel}: ${match[0]} (hardcoded amount: ${match[1]})`)
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ78 WARNING - formatCurrency called with hardcoded amounts:\n` +
          violations.map((v) => `  HARDCODED: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `formatCurrency/formatMoney called with hardcoded values (should use query results):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 7: No suspicious demo dollar amounts in financial display files
  // ---------------------------------------------------------------------------
  test('no suspicious demo dollar amounts in event money tab component', () => {
    const moneyTab = resolve(ROOT, 'app/(chef)/events/[id]/_components/event-detail-money-tab.tsx')
    if (!existsSync(moneyTab)) return

    const src = readFileSync(moneyTab, 'utf-8')
    const rel = relative(ROOT, moneyTab).replace(/\\/g, '/')
    const violations: string[] = []

    for (const suspicious of SUSPICIOUS_DOLLAR_LITERALS) {
      if (src.includes(suspicious)) {
        violations.push(`${rel}: contains suspicious demo amount "${suspicious}"`)
      }
    }

    // Also check for hardcoded cents values that look like demo data
    // e.g., totalCents = 150000 (looks like $1,500.00 hardcoded)
    const hardcodedCents = /(?:cents|Cents|amount)\s*[=:]\s*[1-9]\d{4,}/g
    let match
    while ((match = hardcodedCents.exec(src)) !== null) {
      if (!isInSafeContext(src, match.index)) {
        violations.push(`${rel}: "${match[0]}" (suspiciously specific hardcoded cents value)`)
      }
    }

    expect(
      violations,
      `Event money tab has suspicious hardcoded values:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })
})
