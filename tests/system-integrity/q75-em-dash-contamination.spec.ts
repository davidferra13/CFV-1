/**
 * Q75: Em Dash Contamination
 *
 * No user-visible string literal in .tsx or .ts component/page files should
 * contain an em dash (U+2014). Per CLAUDE.md absolute rule, em dashes are
 * the #1 tell that text was written by AI. Using them destroys credibility.
 *
 * The en dash (U+2013) is acceptable. Only the em dash (U+2014) is banned.
 *
 * Scope:
 *   - All .tsx files in app/ and components/ (user-visible UI)
 *   - Exclude: comments, docs/, tests/, CLAUDE.md, node_modules, .next
 *
 * Tests:
 *
 * 1. NO EM DASH IN APP TSX: No .tsx file in app/ contains the em dash
 *    character (U+2014) in non-comment lines.
 *
 * 2. NO EM DASH IN COMPONENT TSX: No .tsx file in components/ contains
 *    the em dash character in non-comment lines.
 *
 * 3. NO EM DASH IN SERVER ACTION RETURNS: No .ts file in lib/ that has
 *    'use server' contains em dashes in string literals returned to users.
 *
 * 4. NO EM DASH IN TOAST MESSAGES: No toast.error(), toast.success(), or
 *    toast() call contains an em dash.
 *
 * 5. NO EM DASH IN ERROR MESSAGES: No throw new Error() or error message
 *    string contains an em dash.
 *
 * 6. OVERALL COUNT IS ZERO: Total em dash occurrences across all scanned
 *    user-facing files is zero.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q75-em-dash-contamination.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()
const EM_DASH = '\u2014' // the banned character

/** Recursively collect files matching extensions */
function walkFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    try {
      const stat = statSync(full)
      if (stat.isDirectory()) {
        // Skip node_modules, .next, test directories
        if (
          entry === 'node_modules' ||
          entry === '.next' ||
          entry === 'tests' ||
          entry === 'docs'
        ) {
          continue
        }
        results.push(...walkFiles(full, extensions))
      } else if (extensions.some((ext) => full.endsWith(ext))) {
        results.push(full)
      }
    } catch {
      // skip inaccessible
    }
  }
  return results
}

/** Check if a line is a comment, console output, or other developer-only context */
function isNonUserVisibleLine(line: string): boolean {
  const trimmed = line.trim()
  // Comment lines (single-line or within multi-line block)
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('<!--')
  )
    return true

  // Console output (developer-only, never user-visible)
  if (
    trimmed.includes('console.log') ||
    trimmed.includes('console.error') ||
    trimmed.includes('console.warn') ||
    trimmed.includes('console.debug') ||
    trimmed.includes('console.info')
  )
    return true

  return false
}

test.describe('Q75: Em dash contamination', () => {
  // ---------------------------------------------------------------------------
  // Test 1: No em dash in app/ .tsx files
  // ---------------------------------------------------------------------------
  test('no em dash (U+2014) in any .tsx file under app/', () => {
    const appDir = resolve(ROOT, 'app')
    const files = walkFiles(appDir, ['.tsx'])
    const violations: string[] = []

    for (const filePath of files) {
      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (isNonUserVisibleLine(lines[i])) continue
        if (lines[i].includes(EM_DASH)) {
          const rel = relative(ROOT, filePath).replace(/\\/g, '/')
          violations.push(`${rel}:${i + 1}: ${lines[i].trim().substring(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `Em dashes found in app/ .tsx files (CLAUDE.md absolute rule):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: No em dash in components/ .tsx files
  // ---------------------------------------------------------------------------
  test('no em dash (U+2014) in any .tsx file under components/', () => {
    const componentsDir = resolve(ROOT, 'components')
    const files = walkFiles(componentsDir, ['.tsx'])
    const violations: string[] = []

    for (const filePath of files) {
      const src = readFileSync(filePath, 'utf-8')
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (isNonUserVisibleLine(lines[i])) continue
        if (lines[i].includes(EM_DASH)) {
          const rel = relative(ROOT, filePath).replace(/\\/g, '/')
          violations.push(`${rel}:${i + 1}: ${lines[i].trim().substring(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `Em dashes found in components/ .tsx files (CLAUDE.md absolute rule):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: No em dash in server action return strings in lib/
  // ---------------------------------------------------------------------------
  test('no em dash in "use server" files in lib/ that return user-visible text', () => {
    const libDir = resolve(ROOT, 'lib')
    const files = walkFiles(libDir, ['.ts'])
    const violations: string[] = []

    for (const filePath of files) {
      const src = readFileSync(filePath, 'utf-8')

      // Only check files with 'use server' directive
      if (!src.includes("'use server'")) continue

      const lines = src.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (isNonUserVisibleLine(lines[i])) continue
        if (lines[i].includes(EM_DASH)) {
          const rel = relative(ROOT, filePath).replace(/\\/g, '/')
          violations.push(`${rel}:${i + 1}: ${lines[i].trim().substring(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `Em dashes found in 'use server' files in lib/ (user-visible returns):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: No em dash in toast messages
  // ---------------------------------------------------------------------------
  test('no em dash in toast.error(), toast.success(), or toast() calls', () => {
    const dirs = [resolve(ROOT, 'app'), resolve(ROOT, 'components')]
    const violations: string[] = []

    for (const dir of dirs) {
      const files = walkFiles(dir, ['.tsx', '.ts'])
      for (const filePath of files) {
        const src = readFileSync(filePath, 'utf-8')
        const lines = src.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (isNonUserVisibleLine(line)) continue

          // Check for toast calls containing em dashes
          if (line.includes('toast') && line.includes(EM_DASH)) {
            const rel = relative(ROOT, filePath).replace(/\\/g, '/')
            violations.push(`${rel}:${i + 1}: ${line.trim().substring(0, 80)}`)
          }
        }
      }
    }

    expect(violations, `Em dashes found in toast messages:\n${violations.join('\n')}`).toHaveLength(
      0
    )
  })

  // ---------------------------------------------------------------------------
  // Test 5: No em dash in throw new Error() messages
  // ---------------------------------------------------------------------------
  test('no em dash in Error message strings', () => {
    const dirs = [resolve(ROOT, 'app'), resolve(ROOT, 'components'), resolve(ROOT, 'lib')]
    const violations: string[] = []

    for (const dir of dirs) {
      const files = walkFiles(dir, ['.ts', '.tsx'])
      for (const filePath of files) {
        const src = readFileSync(filePath, 'utf-8')
        const lines = src.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (isNonUserVisibleLine(line)) continue

          // Check for Error() or error: strings containing em dashes
          if (
            (line.includes('Error(') || line.includes('error:') || line.includes('error,')) &&
            line.includes(EM_DASH)
          ) {
            const rel = relative(ROOT, filePath).replace(/\\/g, '/')
            violations.push(`${rel}:${i + 1}: ${line.trim().substring(0, 80)}`)
          }
        }
      }
    }

    expect(violations, `Em dashes found in error messages:\n${violations.join('\n')}`).toHaveLength(
      0
    )
  })

  // ---------------------------------------------------------------------------
  // Test 6: Total em dash count across user-facing files is zero
  // ---------------------------------------------------------------------------
  test('overall em dash count across all user-facing files is zero', () => {
    const dirs = [resolve(ROOT, 'app'), resolve(ROOT, 'components')]
    let totalCount = 0
    const fileCount: { file: string; count: number }[] = []

    for (const dir of dirs) {
      // Only scan .tsx files (user-visible UI components and pages).
      // .ts files under app/api/ are API route handlers, not user-facing UI.
      // Server action strings in lib/ are already covered by test 3.
      const files = walkFiles(dir, ['.tsx'])
      for (const filePath of files) {
        const src = readFileSync(filePath, 'utf-8')
        const lines = src.split('\n')
        let fileHits = 0

        for (let i = 0; i < lines.length; i++) {
          if (isNonUserVisibleLine(lines[i])) continue
          const matches = lines[i].split(EM_DASH).length - 1
          fileHits += matches
        }

        if (fileHits > 0) {
          totalCount += fileHits
          fileCount.push({
            file: relative(ROOT, filePath).replace(/\\/g, '/'),
            count: fileHits,
          })
        }
      }
    }

    expect(
      totalCount,
      `Found ${totalCount} em dashes across ${fileCount.length} files:\n${fileCount.map((f) => `  ${f.file} (${f.count})`).join('\n')}`
    ).toBe(0)
  })
})
