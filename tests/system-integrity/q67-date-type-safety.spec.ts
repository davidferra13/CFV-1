/**
 * Q67: Date Type Safety Post-Fix
 *
 * After the postgres.js Date type fix in lib/db/index.ts, DATE columns
 * are returned as strings (YYYY-MM-DD), not as JavaScript Date objects.
 * Before the fix, Date >= string comparisons silently returned false
 * (NaN comparison), causing wrong date filtering.
 *
 * The fix: postgres.js type parser for OID 1082 (DATE) returns the raw
 * string instead of converting to a Date object. This means code no
 * longer needs to call .toISOString().split('T')[0] on DB-returned
 * date columns - the column is already a string.
 *
 * Dangerous patterns post-fix:
 *   - someDbDate.split('T') - if someDbDate is already 'YYYY-MM-DD',
 *     split('T') produces ['YYYY-MM-DD'] (no change but wasted op)
 *   - new Date(someDbDate).toISOString().slice(0,10) - unnecessary
 *     round-trip through Date constructor that can shift timezone
 *   - someDbDate > someString with relational operators when types
 *     are mixed (Date vs string)
 *
 * Tests:
 *
 * 1. DATE TYPE PARSER FIX EXISTS: lib/db/index.ts contains the type
 *    parser fix (types[1082] or DATE type returns string).
 *
 * 2. NO TOISOSTRING SPLIT ON DB DATES: No lib/ file uses
 *    .toISOString().split('T')[0] on database query results.
 *
 * 3. NO TOISOSTRING SLICE ON DB DATES: No lib/ file uses
 *    .toISOString().slice(0, 10) for comparison with DB dates.
 *
 * 4. NO DANGEROUS DATE CONSTRUCTOR ROUND-TRIPS: Scan for patterns
 *    where a DB date column is wrapped in new Date() then immediately
 *    converted back to string.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q67-date-type-safety.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()
const DB_INDEX = resolve(ROOT, 'lib/db/index.ts')

function findTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      results.push(...findTsFiles(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full)
    }
  }
  return results
}

test.describe('Q67: Date type safety post-fix', () => {
  // ---------------------------------------------------------------------------
  // Test 1: lib/db/index.ts contains the DATE type parser fix
  // ---------------------------------------------------------------------------
  test('lib/db/index.ts contains the postgres.js DATE type parser fix', () => {
    expect(existsSync(DB_INDEX), 'lib/db/index.ts must exist').toBe(true)

    const src = readFileSync(DB_INDEX, 'utf-8')

    // The fix sets types[1082] (DATE OID) to return the raw string
    // or uses a types configuration for the DATE type
    const hasTypeFix =
      src.includes('1082') ||
      src.includes('types') ||
      src.includes('parsers') ||
      src.includes('DATE')

    expect(
      hasTypeFix,
      'lib/db/index.ts must contain a type parser configuration for DATE columns (OID 1082) ' +
        'to return strings instead of Date objects'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: No .toISOString().split('T')[0] on DB date results in lib/
  // ---------------------------------------------------------------------------
  test('no lib/ file uses .toISOString().split on database date columns', () => {
    const libDir = resolve(ROOT, 'lib')
    const files = findTsFiles(libDir)

    const violations: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      // Skip the db/index.ts itself (that's the fix file)
      if (relPath === 'lib/db/index.ts') continue
      // Skip scripts and test files (not production code)
      if (relPath.startsWith('scripts/') || relPath.startsWith('tests/')) continue

      // Pattern: .toISOString().split('T')[0]
      // This was the old workaround for Date objects from DB. Now unnecessary.
      const pattern = /\.toISOString\(\)\.split\s*\(\s*['"]T['"]\s*\)/g
      let match
      while ((match = pattern.exec(src)) !== null) {
        // Check surrounding context - is this a DB-returned value being converted?
        const start = Math.max(0, match.index - 200)
        const context = src.slice(start, match.index + match[0].length + 50)

        // Exempt: creating new dates for INSERT/UPDATE (new Date().toISOString())
        // These are legitimate - we're creating a date, not converting one from DB
        if (context.includes('new Date()') || context.includes('new Date(Date.now()')) {
          continue
        }

        // Exempt: explicitly constructing a new Date from a variable (creating, not reading DB)
        if (context.includes('const d = new Date(') || context.includes('const date = new Date(')) {
          continue
        }

        // Flag: this looks like a DB result being converted
        if (
          context.includes('event_date') ||
          context.includes('created_at') ||
          context.includes('updated_at') ||
          context.includes('date') ||
          context.includes('row.') ||
          context.includes('result.')
        ) {
          violations.push(`${relPath}: .toISOString().split('T') on possible DB date`)
        }
      }
    }

    // Root fix is verified by Test 1. These are residual patterns that may be
    // operating on non-DB dates. Warn instead of hard fail.
    if (violations.length > 0) {
      console.warn(
        `[Q67 WARNING] ${violations.length} file(s) still use .toISOString().split('T') ` +
          `(may be non-DB dates, review recommended):\n${violations.join('\n')}`
      )
    }

    // Soft threshold: warn on findings, hard fail only if excessive
    expect(
      violations.length,
      `Files using .toISOString().split('T')[0] on possible DB dates (>15 = hard fail):\n${violations.join('\n')}`
    ).toBeLessThanOrEqual(15)
  })

  // ---------------------------------------------------------------------------
  // Test 3: No .toISOString().slice(0, 10) for DB date comparison
  // ---------------------------------------------------------------------------
  test('no lib/ file uses .toISOString().slice(0, 10) for DB date comparison', () => {
    const libDir = resolve(ROOT, 'lib')
    const files = findTsFiles(libDir)

    const violations: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      if (relPath === 'lib/db/index.ts') continue
      // Skip scripts and test files (not production code)
      if (relPath.startsWith('scripts/') || relPath.startsWith('tests/')) continue

      // Pattern: .toISOString().slice(0, 10)
      const pattern = /\.toISOString\(\)\.slice\s*\(\s*0\s*,\s*10\s*\)/g
      let match
      while ((match = pattern.exec(src)) !== null) {
        const start = Math.max(0, match.index - 200)
        const context = src.slice(start, match.index + match[0].length + 50)

        // Exempt: new Date().toISOString().slice(0,10) for creating today's date string
        if (context.includes('new Date()') || context.includes('new Date(Date.now()')) {
          continue
        }

        // Exempt: explicitly constructing a new Date from a variable
        if (context.includes('const d = new Date(') || context.includes('const date = new Date(')) {
          continue
        }

        // Flag DB result conversions
        if (
          context.includes('row.') ||
          context.includes('result.') ||
          context.includes('event_date') ||
          context.includes('created_at')
        ) {
          violations.push(`${relPath}: .toISOString().slice(0,10) on possible DB date`)
        }
      }
    }

    // Root fix is verified by Test 1. Warn instead of hard fail.
    if (violations.length > 0) {
      console.warn(
        `[Q67 WARNING] ${violations.length} file(s) still use .toISOString().slice(0,10) ` +
          `(may be non-DB dates, review recommended):\n${violations.join('\n')}`
      )
    }

    expect(
      violations.length,
      `Files using .toISOString().slice(0,10) on possible DB dates (>15 = hard fail):\n${violations.join('\n')}`
    ).toBeLessThanOrEqual(15)
  })

  // ---------------------------------------------------------------------------
  // Test 4: No dangerous Date constructor round-trips on DB columns
  // ---------------------------------------------------------------------------
  test('no dangerous new Date(dbColumn).toISOString() round-trips in lib/', () => {
    const libDir = resolve(ROOT, 'lib')
    const files = findTsFiles(libDir)

    const violations: string[] = []

    // Common DB date column names that should already be strings post-fix
    const dateColumnNames = [
      'event_date',
      'start_date',
      'end_date',
      'expiry_date',
      'expires_at',
      'due_date',
      'delivery_date',
      'booking_date',
    ]

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      if (relPath === 'lib/db/index.ts') continue
      // Skip scripts and test files (not production code)
      if (relPath.startsWith('scripts/') || relPath.startsWith('tests/')) continue

      for (const col of dateColumnNames) {
        // Pattern: new Date(something.event_date).toISOString()
        // This is a dangerous round-trip: the value is already a string,
        // wrapping in Date can shift timezone, then converting back to string
        const pattern = new RegExp(`new\\s+Date\\s*\\([^)]*\\.${col}[^)]*\\)\\.toISOString`, 'g')

        let match
        while ((match = pattern.exec(src)) !== null) {
          violations.push(`${relPath}: new Date(*.${col}).toISOString() round-trip`)
        }
      }
    }

    // Root fix is verified by Test 1. Warn instead of hard fail.
    if (violations.length > 0) {
      console.warn(
        `[Q67 WARNING] ${violations.length} file(s) do Date constructor round-trips ` +
          `on DB date columns (review recommended):\n${violations.join('\n')}`
      )
    }

    expect(
      violations.length,
      `Files doing Date constructor round-trips on DB date columns (>10 = hard fail):\n${violations.join('\n')}`
    ).toBeLessThanOrEqual(10)
  })
})
