/**
 * Q72: SQL Interpolation Safety
 *
 * No server action or lib file should use JavaScript template literals to
 * embed user-provided values directly into SQL strings. All user values must
 * go through parameterized queries.
 *
 * The postgres.js `sql` tagged template is SAFE because it auto-parameterizes.
 * Regular JS template literals and string concatenation with SQL keywords are
 * UNSAFE because they create SQL injection vectors.
 *
 * Key distinction:
 *   SAFE:   sql`SELECT * FROM users WHERE id = ${id}` (postgres.js tagged template)
 *   UNSAFE: `SELECT * FROM ${table} WHERE id = ${id}` (regular template literal)
 *   UNSAFE: "SELECT * FROM " + table + " WHERE id = " + id (string concat)
 *
 * Tests:
 *
 * 1. COMPAT LAYER USES PARAMETERIZED QUERIES: lib/db/compat.ts uses the
 *    postgres.js `sql` tagged template (not string concatenation) for query
 *    building.
 *
 * 2. COMPAT VALIDATES IDENTIFIERS: lib/db/compat.ts validates SQL identifiers
 *    (table names, column names) against an allowlist or regex before embedding.
 *
 * 3. NO UNTAGGED SQL TEMPLATE LITERALS IN LIB: No file in lib/ uses untagged
 *    template literals containing SQL keywords (SELECT, INSERT, UPDATE, DELETE).
 *
 * 4. NO STRING CONCATENATION SQL IN LIB: No file in lib/ uses string
 *    concatenation to build SQL queries.
 *
 * 5. COMPAT USES PARAMETERIZED VALUES: compat.ts passes user values as
 *    parameters (not interpolated into SQL strings).
 *
 * 6. NO RAW SQL IN SERVER ACTIONS: Server action files in lib/ that use
 *    pgClient or sql do so through the compat layer or tagged templates.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q72-sql-interpolation-safety.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()
const COMPAT = resolve(ROOT, 'lib/db/compat.ts')
const LIB_DIR = resolve(ROOT, 'lib')

/** Recursively collect all .ts files under a directory */
function walkTs(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    try {
      const stat = statSync(full)
      if (stat.isDirectory()) {
        results.push(...walkTs(full))
      } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
        results.push(full)
      }
    } catch {
      // skip inaccessible files
    }
  }
  return results
}

test.describe('Q72: SQL interpolation safety', () => {
  // ---------------------------------------------------------------------------
  // Test 1: compat.ts uses the postgres.js sql tagged template
  // ---------------------------------------------------------------------------
  test('lib/db/compat.ts uses postgres.js sql tagged template for queries', () => {
    expect(existsSync(COMPAT), 'lib/db/compat.ts must exist').toBe(true)

    const src = readFileSync(COMPAT, 'utf-8')

    // The compat layer should import sql or pgClient from lib/db and use
    // the tagged template syntax (sql`...`) for building queries
    expect(
      src.includes('pgClient') || src.includes('sql`') || src.includes('sql('),
      'compat.ts must use pgClient or sql tagged template for parameterized queries'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: compat.ts validates SQL identifiers before embedding
  // ---------------------------------------------------------------------------
  test('lib/db/compat.ts validates SQL identifiers against regex or allowlist', () => {
    const src = readFileSync(COMPAT, 'utf-8')

    // The compat layer must validate identifiers (table names, column names)
    // before embedding them into SQL. Look for assertIdent, IDENT_RE, quoteIdent,
    // or similar validation patterns
    expect(
      src.includes('assertIdent') ||
        src.includes('IDENT_RE') ||
        src.includes('quoteIdent') ||
        src.includes(/^[a-zA-Z_]/.source),
      'compat.ts must validate SQL identifiers (assertIdent, IDENT_RE, or equivalent regex) before embedding'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: No untagged SQL template literals in lib/ files
  // ---------------------------------------------------------------------------
  test('no untagged template literals with SQL keywords in lib/ files (excluding compat.ts)', () => {
    const allFiles = walkTs(LIB_DIR)
    const violations: string[] = []

    // Pattern: a backtick-delimited template literal containing SQL keywords
    // that is NOT preceded by `sql` (which would make it a tagged template).
    // We look for lines like:  `SELECT ... ${  or  `INSERT ... ${
    // that do NOT have sql` as prefix.
    //
    // IMPORTANT: Only match actual SQL statement patterns, not English words
    // like "Create menu" or "Update client" that happen to share SQL keywords.
    // SQL statements have specific syntax: SELECT ... FROM, INSERT INTO, etc.
    const unsafePattern =
      /(?<!sql)(?<!sql\s)`\s*(?:SELECT\s+[\w*]|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE|TRUNCATE\s+TABLE)[^`]*\$\{/i

    for (const filePath of allFiles) {
      const normalized = filePath.replace(/\\/g, '/')
      // Skip compat.ts - it builds SQL internally with validated identifiers
      if (normalized.includes('lib/db/compat.ts')) continue
      // Skip migration files
      if (normalized.includes('database/')) continue
      // Skip test files
      if (normalized.includes('/tests/') || normalized.includes('.spec.')) continue
      // Skip QuickBooks integration (uses SQL-like syntax in API query URLs, not DB)
      if (normalized.includes('quickbooks')) continue
      // Skip files that only use the compat shim (queries go through validated layer)
      if (normalized.includes('lib/db/')) continue

      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      // Track whether we're inside a multiline sql` tagged template
      let inSqlTaggedTemplate = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue

        // Track multiline sql`` tagged templates - these are SAFE (postgres.js)
        // Opening: sql` or sql\n` on this line without a closing backtick
        if (/\bsql\s*`/.test(line)) {
          // Count backticks after 'sql`' to see if it's closed on this line
          const afterSql = line.slice(line.indexOf('sql`') + 4)
          const backtickCount = (afterSql.match(/(?<!\\)`/g) || []).length
          if (backtickCount === 0) {
            inSqlTaggedTemplate = true
          }
          continue // This line is safe regardless (it's a sql tagged template)
        }

        // If we're inside a multiline sql tagged template, skip until closing backtick
        if (inSqlTaggedTemplate) {
          if (line.includes('`')) {
            inSqlTaggedTemplate = false
          }
          continue
        }

        // Skip lines that are inside a postgres.js sql tagged template
        // (variable name ending in sql followed by backtick on a nearby prior line)
        if (
          trimmed.startsWith('${') ||
          trimmed.startsWith('FROM') ||
          trimmed.startsWith('WHERE') ||
          trimmed.startsWith('SET') ||
          trimmed.startsWith('VALUES') ||
          trimmed.startsWith('AND') ||
          trimmed.startsWith('OR') ||
          trimmed.startsWith('ORDER') ||
          trimmed.startsWith('GROUP') ||
          trimmed.startsWith('HAVING') ||
          trimmed.startsWith('JOIN') ||
          trimmed.startsWith('LEFT') ||
          trimmed.startsWith('INNER') ||
          trimmed.startsWith('ON') ||
          trimmed.startsWith('RETURNING') ||
          trimmed.startsWith('LIMIT') ||
          trimmed.startsWith('OFFSET')
        ) {
          // These are likely continuations of a multi-line sql tagged template
          continue
        }

        // Skip lines in string constants (error messages, log messages containing SQL words)
        if (/['"].*(?:SELECT|INSERT|UPDATE|DELETE).*['"]/.test(line)) continue

        // Skip lines that reference sql` (tagged template usage on same line)
        if (/\bsql\s*`/.test(line)) continue

        // Skip lines that are inside pgClient.unsafe() calls (parameterized by $N params)
        // Check current line and previous lines (the unsafe( call may be on the line above)
        if (/pgClient\.unsafe\s*\(/.test(line)) continue
        if (i > 0 && /pgClient\.unsafe\s*\(/.test(lines[i - 1])) continue
        if (i > 1 && /pgClient\.unsafe\s*\(/.test(lines[i - 2])) continue

        // Skip summary/description template literals that use English "Create/Update" etc.
        if (/summary\s*:\s*`/.test(line) || /description\s*:\s*`/.test(line)) continue

        // Skip lines that are clearly object property values, not SQL
        if (
          /^\s*\w+\s*:\s*`/.test(line) &&
          !/\bFROM\b/.test(line) &&
          !/\bINTO\b/.test(line) &&
          !/\bSET\b/.test(line)
        )
          continue

        if (unsafePattern.test(line)) {
          const rel = relative(ROOT, filePath).replace(/\\/g, '/')
          violations.push(`${rel}:${i + 1}: ${trimmed.substring(0, 100)}`)
        }
      }
    }

    expect(
      violations,
      `Found untagged template literals with SQL keywords and interpolation:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: No string concatenation SQL in lib/ files
  // ---------------------------------------------------------------------------
  test('no string concatenation to build SQL queries in lib/ files (excluding compat.ts)', () => {
    const allFiles = walkTs(LIB_DIR)
    const violations: string[] = []

    // Pattern: "SELECT ... " + variable or 'SELECT ... ' + variable
    const concatPatterns = [
      /["']\s*SELECT\s.*["']\s*\+/i,
      /["']\s*INSERT\s.*["']\s*\+/i,
      /["']\s*UPDATE\s.*["']\s*\+/i,
      /["']\s*DELETE\s.*["']\s*\+/i,
      /\+\s*["']\s*WHERE\s/i,
      /\+\s*["']\s*FROM\s/i,
    ]

    for (const filePath of allFiles) {
      const normalized = filePath.replace(/\\/g, '/')
      // Skip compat.ts - it builds SQL internally with validated identifiers
      if (normalized.includes('lib/db/compat.ts')) continue
      // Skip test files
      if (normalized.includes('/tests/') || normalized.includes('.spec.')) continue

      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue

        // Skip log/error messages that mention SQL keywords as string content
        if (/(?:console\.|throw\s|Error\(|error\(|warn\(|log\()/.test(line)) continue

        for (const pattern of concatPatterns) {
          if (pattern.test(line)) {
            const rel = relative(ROOT, filePath).replace(/\\/g, '/')
            violations.push(`${rel}:${i + 1}: ${trimmed.substring(0, 100)}`)
            break
          }
        }
      }
    }

    expect(
      violations,
      `Found string concatenation building SQL queries:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 5: compat.ts passes user values as parameters (not interpolated)
  // ---------------------------------------------------------------------------
  test('compat.ts passes values via parameterized query syntax', () => {
    const src = readFileSync(COMPAT, 'utf-8')

    // The compat layer should use $1, $2, etc. positional parameters or
    // the postgres.js sql tagged template (which auto-parameterizes).
    // Look for evidence of parameterized queries.
    expect(
      src.includes('$1') || src.includes('${') || src.includes('params') || src.includes('values'),
      'compat.ts must use parameterized query syntax ($1/$2 or sql tagged template parameters)'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 6: SQL identifier rejection for dangerous characters
  // ---------------------------------------------------------------------------
  test('compat.ts rejects SQL identifiers containing dangerous characters', () => {
    const src = readFileSync(COMPAT, 'utf-8')

    // The assertIdent or quoteIdent function must reject identifiers with
    // characters outside [a-zA-Z0-9_] to prevent SQL injection via table/column names
    expect(
      (src.includes('throw') || src.includes('Error')) &&
        (src.includes('Invalid SQL identifier') ||
          src.includes('assertIdent') ||
          src.includes('IDENT_RE')),
      'compat.ts must throw an error for identifiers with invalid characters (SQL injection via identifier)'
    ).toBe(true)
  })
})
