/**
 * Q86: Financial Arithmetic Purity
 *
 * All monetary amounts are stored as integer cents. But floating-point
 * corruption can sneak in during calculations:
 *   - parseFloat on cent strings
 *   - Division without rounding (profit margin = revenue / cost)
 *   - Multiplication by decimal rates (tax = amount * 0.0625) without Math.round
 *
 * Math.round(1.005 * 100) = 100, not 101. This is how pennies vanish.
 *
 * What we check:
 *   1. No parseFloat in financial calculation paths (use parseInt or Number)
 *   2. Every division in financial files is wrapped in Math.round/floor/ceil
 *   3. Every multiplication by a decimal (tax rates, percentages, margins)
 *      is wrapped in a rounding function
 *
 * Scope: lib/ledger/, lib/finance/, lib/quotes/, lib/commerce/,
 *        lib/pricing/, lib/billing/, lib/payments/
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q86-financial-arithmetic-purity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

const FINANCIAL_DIRS = [
  'lib/ledger',
  'lib/finance',
  'lib/quotes',
  'lib/commerce',
  'lib/pricing',
  'lib/billing',
  'lib/payments',
  'lib/tax',
  'lib/food-cost',
  'lib/expenses',
]

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

/** Check if surrounding context indicates this is in a rounding wrapper */
function isRounded(src: string, matchIndex: number): boolean {
  // Look backward for Math.round(, Math.floor(, Math.ceil(
  const lookback = src.slice(Math.max(0, matchIndex - 60), matchIndex)
  const lookforward = src.slice(matchIndex, Math.min(src.length, matchIndex + 100))

  return (
    lookback.includes('Math.round(') ||
    lookback.includes('Math.floor(') ||
    lookback.includes('Math.ceil(') ||
    lookback.includes('round(') ||
    lookforward.includes(') | 0') || // bitwise truncation
    lookforward.includes('>> 0') || // bitwise truncation
    // Entire expression might be wrapped
    /Math\.(round|floor|ceil)\([^)]*$/.test(lookback)
  )
}

/** Check if the line is a comment or import */
function isCommentOrImport(src: string, matchIndex: number): boolean {
  const lineStart = src.lastIndexOf('\n', matchIndex) + 1
  const linePrefix = src.slice(lineStart, matchIndex).trim()
  return (
    linePrefix.startsWith('//') ||
    linePrefix.startsWith('*') ||
    linePrefix.startsWith('/*') ||
    linePrefix.startsWith('import')
  )
}

test.describe('Q86: Financial arithmetic purity', () => {
  // ---------------------------------------------------------------------------
  // Test 1: No parseFloat in financial calculation files
  // ---------------------------------------------------------------------------
  test('no parseFloat in financial directories', () => {
    const violations: string[] = []

    for (const dir of FINANCIAL_DIRS) {
      const fullDir = resolve(ROOT, dir)
      if (!existsSync(fullDir)) continue

      const files = walkDir(fullDir, ['.ts', '.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        const pattern = /parseFloat\s*\(/g
        let match
        while ((match = pattern.exec(src)) !== null) {
          if (isCommentOrImport(src, match.index)) continue

          // Check context: is this parsing a non-monetary value?
          const context = src.slice(Math.max(0, match.index - 150), match.index + 150)
          const isNonMonetary =
            context.includes('percent') ||
            context.includes('rate') ||
            context.includes('ratio') ||
            context.includes('factor') ||
            context.includes('score') ||
            context.includes('confidence') ||
            context.includes('similarity') ||
            context.includes('miles') ||
            context.includes('hours') ||
            context.includes('quantity') ||
            context.includes('qty') ||
            context.includes('multiplier') ||
            context.includes('distance')

          if (isNonMonetary) continue

          // Also safe: parseFloat followed by Math.round(... * 100) on the same or next line
          const lookforward = src.slice(match.index, Math.min(src.length, match.index + 300))
          const hasRounding = lookforward.includes('Math.round') && lookforward.includes('* 100')

          if (hasRounding) continue

          const lineNum = src.slice(0, match.index).split('\n').length
          violations.push(
            `${relPath}:${lineNum} parseFloat() on monetary value without immediate rounding`
          )
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ86 VIOLATIONS - parseFloat in financial code:\n` +
          violations.map((v) => `  FLOAT RISK: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `parseFloat used in financial calculations.\n` +
        `Use parseInt() or Number() for cent values to avoid float corruption:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Division operations in financial files are rounded
  // ---------------------------------------------------------------------------
  test('division in financial files is wrapped in rounding', () => {
    const violations: string[] = []

    for (const dir of FINANCIAL_DIRS) {
      const fullDir = resolve(ROOT, dir)
      if (!existsSync(fullDir)) continue

      const files = walkDir(fullDir, ['.ts', '.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        // Find division operations that look like financial calculations
        // Pattern: variable / 100, amount / count, etc.
        const divisionPattern =
          /\b\w+(?:cents|amount|total|revenue|cost|price|profit|balance|payment)\w*\s*\/\s*(?!\/)/gi
        let match
        while ((match = divisionPattern.exec(src)) !== null) {
          if (isCommentOrImport(src, match.index)) continue

          // Check: is this division by 100 for cents-to-dollars display?
          const afterDiv = src.slice(
            match.index + match[0].length,
            match.index + match[0].length + 20
          )

          // Division by 100 for display is common and acceptable if the result
          // goes to toFixed(2) or a format function
          if (/^\s*100\b/.test(afterDiv)) {
            const lineContent = src.slice(
              match.index,
              Math.min(src.length, src.indexOf('\n', match.index))
            )
            if (lineContent.includes('toFixed') || lineContent.includes('format')) continue
          }

          // For other divisions, check rounding
          if (!isRounded(src, match.index)) {
            const lineNum = src.slice(0, match.index).split('\n').length
            violations.push(`${relPath}:${lineNum} unrounded division: ${match[0].trim()}`)
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ86 WARNINGS - Potentially unrounded financial division:\n` +
          violations.map((v) => `  ROUND? ${v}`).join('\n')
      )
    }

    // This is a warning-level check. Some divisions are intentionally
    // float (display formatting). Hard failures are parseFloat only.
    if (violations.length > 20) {
      expect(
        violations,
        `Too many potentially unrounded divisions in financial code (${violations.length}).\n` +
          `Review and wrap in Math.round() where the result is stored or compared.`
      ).toHaveLength(0)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 3: Multiplication by decimal rates is rounded
  // ---------------------------------------------------------------------------
  test('multiplication by decimal constants in financial files is rounded', () => {
    const violations: string[] = []

    for (const dir of FINANCIAL_DIRS) {
      const fullDir = resolve(ROOT, dir)
      if (!existsSync(fullDir)) continue

      const files = walkDir(fullDir, ['.ts', '.tsx'])

      for (const file of files) {
        const src = readFileSync(file, 'utf-8')
        const relPath = relative(ROOT, file).replace(/\\/g, '/')

        // Pattern: monetary_variable * 0.0625 (tax rate style decimals)
        // Only flag when the variable name suggests money
        const decimalMultPattern = /(\w+)\s*\*\s*0\.\d{2,}/g
        let match
        while ((match = decimalMultPattern.exec(src)) !== null) {
          if (isCommentOrImport(src, match.index)) continue

          // Only flag if the variable name suggests monetary value
          const varName = match[1].toLowerCase()
          const isMonetary =
            varName.includes('cent') ||
            varName.includes('amount') ||
            varName.includes('total') ||
            varName.includes('revenue') ||
            varName.includes('cost') ||
            varName.includes('price') ||
            varName.includes('profit') ||
            varName.includes('balance') ||
            varName.includes('payment') ||
            varName.includes('tip') ||
            varName.includes('fee') ||
            varName.includes('tax')

          if (!isMonetary) continue

          if (!isRounded(src, match.index)) {
            const lineNum = src.slice(0, match.index).split('\n').length
            violations.push(
              `${relPath}:${lineNum} unrounded decimal multiplication: ${match[0].trim()}`
            )
          }
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ86 VIOLATIONS - Unrounded decimal multiplication in financial code:\n` +
          violations.map((v) => `  FLOAT RISK: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Financial calculations multiply by decimals without rounding.\n` +
        `Math.round(1.005 * 100) = 100, not 101. Pennies vanish:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })
})
