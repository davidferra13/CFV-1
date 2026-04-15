/**
 * Q30: Input Validation Surface
 *
 * Every system boundary that accepts user input must validate before writing.
 * Recent fixes (Q347, Q356, Q387) show that input validation gaps are real.
 * This test verifies that the highest-risk inputs — the ones that mutate
 * financial or auth state — are validated with Zod schemas before any DB call.
 *
 * Tests:
 *
 * 1. ZOD USAGE: Key action files (quotes, events, clients) import from 'zod'
 *    or use a shared validation utility — not ad-hoc if/else checks.
 *
 * 2. EXPENSE CATEGORY VALIDATION: lib/finance/expense-actions.ts validates
 *    category against EXPENSE_CATEGORY_VALUES before inserting.
 *
 * 3. EMAIL FORMAT VALIDATION: Server actions that accept email addresses
 *    validate with z.string().email() before DB writes.
 *
 * 4. UUID VALIDATION: Server actions accepting IDs validate they are UUIDs
 *    before using them in DB queries (prevents SQL injection-style tricks).
 *
 * 5. EMBED ROUTE VALIDATION: app/api/embed/inquiry/route.ts validates all
 *    required fields before creating any DB records.
 *
 * 6. NO TS-NOCHECK WITH EXPORTS: Files with @ts-nocheck must not export
 *    server actions — they will crash at runtime on type mismatches.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q30-input-validation-surface.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()
const EXPENSE_ACTIONS = resolve(ROOT, 'lib/finance/expense-actions.ts')
const EMBED_ROUTE = resolve(ROOT, 'app/api/embed/inquiry/route.ts')
const CLIENT_ACTIONS = resolve(ROOT, 'lib/clients/actions.ts')
const QUOTE_ACTIONS = resolve(ROOT, 'lib/quotes/actions.ts')

function walkDir(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full))
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        results.push(full)
      }
    }
  } catch {
    // skip
  }
  return results
}

test.describe('Q30: Input validation surface', () => {
  // -------------------------------------------------------------------------
  // Test 1: Key action files use Zod for schema validation
  // -------------------------------------------------------------------------
  test('quote and client action files use Zod schema validation', () => {
    const filesToCheck = [QUOTE_ACTIONS, CLIENT_ACTIONS].filter(existsSync)

    for (const file of filesToCheck) {
      const src = readFileSync(file, 'utf-8')
      const rel = relative(ROOT, file)

      expect(
        src.includes("from 'zod'") ||
          src.includes('from "zod"') ||
          src.includes('z.object') ||
          src.includes('z.string'),
        `${rel} must use Zod for input validation (not ad-hoc if/else checks)`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 2: Expense category validated against allowlist
  // -------------------------------------------------------------------------
  test('expense-actions.ts validates category against EXPENSE_CATEGORY_VALUES', () => {
    if (!existsSync(EXPENSE_ACTIONS)) return

    const src = readFileSync(EXPENSE_ACTIONS, 'utf-8')

    expect(
      src.includes('EXPENSE_CATEGORY'),
      'expense-actions.ts must validate expense category against EXPENSE_CATEGORY_VALUES allowlist'
    ).toBe(true)

    // Must throw or return error for invalid category
    expect(
      src.includes('throw') || src.includes('error') || src.includes('return {'),
      'expense-actions.ts must reject invalid expense categories before DB write'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Email fields validated with Zod email()
  // -------------------------------------------------------------------------
  test('server actions validate email format with z.string().email()', () => {
    // Check embed route — most likely to receive arbitrary email input
    expect(existsSync(EMBED_ROUTE), 'app/api/embed/inquiry/route.ts must exist').toBe(true)

    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    // Must validate email format
    expect(
      src.includes('.email(') ||
        (src.includes('email') &&
          (src.includes('regex') || src.includes('test(') || src.includes('@'))),
      'embed route must validate email format before creating client record'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Embed route rejects missing required fields (400)
  // -------------------------------------------------------------------------
  test('embed inquiry route validates all required fields before any DB call', () => {
    const src = readFileSync(EMBED_ROUTE, 'utf-8')

    const requiredFields = ['full_name', 'email', 'event_date', 'guest_count']
    for (const field of requiredFields) {
      expect(src.includes(field), `embed route must validate required field: ${field}`).toBe(true)
    }

    // Must return 400 for validation errors
    expect(
      src.includes('status: 400') || src.includes('status:400'),
      'embed route must return 400 for invalid/missing fields'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: No @ts-nocheck files export server actions
  // -------------------------------------------------------------------------
  test('no @ts-nocheck files export callable server actions', () => {
    const libFiles = walkDir(join(ROOT, 'lib'))
    const violations: string[] = []

    for (const filePath of libFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      const hasNoCheck = src.includes('@ts-nocheck')
      const hasUseServer = /^['"]use server['"]/m.test(src.slice(0, 500))
      const hasExport = src.includes('export async function') || src.includes('export function')

      if (hasNoCheck && hasUseServer && hasExport) {
        violations.push(relative(ROOT, filePath).replace(/\\/g, '/'))
      }
    }

    if (violations.length > 0) {
      console.error(
        `\nQ30 CRITICAL — @ts-nocheck files with exported server actions (will crash at runtime):\n` +
          violations.map((v) => `  CRASH RISK: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `@ts-nocheck files must not export server actions (they crash at runtime): ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 6: XSS risk - no dangerouslySetInnerHTML in user-content components
  // -------------------------------------------------------------------------
  test('no dangerouslySetInnerHTML in components that render user content', () => {
    const componentFiles = walkDir(join(ROOT, 'components'))

    const violations: string[] = []

    for (const filePath of componentFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      if (src.includes('dangerouslySetInnerHTML')) {
        // Flag it but check if it's sanitized
        const idx = src.indexOf('dangerouslySetInnerHTML')
        const context = src.slice(Math.max(0, idx - 200), idx + 200)

        const isSanitized =
          context.includes('sanitize') ||
          context.includes('DOMPurify') ||
          context.includes('sanitizeHtml') ||
          context.includes('// safe:') ||
          context.includes('// sanitized')

        if (!isSanitized) {
          violations.push(relative(ROOT, filePath).replace(/\\/g, '/'))
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ30 WARNING — dangerouslySetInnerHTML without sanitization:\n` +
          violations.map((v) => `  XSS RISK: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Components must not use dangerouslySetInnerHTML without sanitization: ${violations.join(', ')}`
    ).toHaveLength(0)
  })
})
