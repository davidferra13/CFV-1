/**
 * Q81: Silent Catch-Return-Default
 *
 * Server actions and data-fetching functions must NEVER swallow database
 * errors by returning empty arrays, zero, null, or false. A chef seeing
 * "$0.00 revenue" when the DB is down makes wrong business decisions.
 * A chef seeing "Could not load data" refreshes the page.
 *
 * Acceptable catch patterns:
 *   - Non-blocking side effects (notifications, emails, activity logs)
 *     may catch-and-log without surfacing to UI
 *   - Functions that explicitly return { success: false, error: ... }
 *   - Functions that re-throw the error
 *   - Console.error logging (as long as the function also returns error)
 *
 * Banned patterns in data-fetching/mutation functions:
 *   - catch (e) { return [] }
 *   - catch (e) { return {} }
 *   - catch (e) { return 0 }
 *   - catch (e) { return null }
 *   - catch (e) { return false }
 *   - catch (e) { return "" }
 *   - catch (e) { return { items: [] } } (disguised empty)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q81-silent-catch-return-default.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

// Known non-blocking side-effect files where catch-and-swallow is acceptable
const SIDE_EFFECT_EXEMPTIONS = [
  'lib/notifications/',
  'lib/email/',
  'lib/sms/',
  'lib/activity/',
  'lib/realtime/broadcast',
  'lib/analytics/track',
  'lib/monitoring/',
  'lib/incidents/',
]

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.'))
        continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // inaccessible
  }
  return results
}

function isExemptSideEffect(relPath: string): boolean {
  return SIDE_EFFECT_EXEMPTIONS.some((prefix) => relPath.includes(prefix.replace(/\//g, '/')))
}

/**
 * Check if a catch block context suggests this is a non-blocking side effect.
 * Look for [non-blocking] comments, console.error/warn calls, and
 * the function being clearly a fire-and-forget helper.
 */
function isNonBlockingContext(src: string, catchIndex: number): boolean {
  const contextStart = Math.max(0, catchIndex - 500)
  const contextEnd = Math.min(src.length, catchIndex + 300)
  const context = src.slice(contextStart, contextEnd)

  return (
    context.includes('[non-blocking]') ||
    context.includes('// non-blocking') ||
    context.includes('// side effect') ||
    context.includes('// fire and forget') ||
    context.includes('// optional') ||
    context.includes('// best effort') ||
    context.includes('sendNotification') ||
    context.includes('sendEmail') ||
    context.includes('broadcastInsert') ||
    context.includes('broadcastUpdate') ||
    context.includes('broadcastDelete') ||
    context.includes('logActivity') ||
    context.includes('trackEvent')
  )
}

/**
 * Detect catch blocks that return silent defaults.
 * Matches patterns like:
 *   catch (err) { return [] }
 *   catch (e) { console.error(...); return null }
 *   } catch { return {} }
 */
const SILENT_RETURN_PATTERN =
  /catch\s*\([^)]*\)\s*\{[^}]*?return\s+(\[\]|\{\}|0|null|false|""|''|undefined)\s*[;\n}]/g

const DISGUISED_EMPTY_PATTERN =
  /catch\s*\([^)]*\)\s*\{[^}]*?return\s+\{[^}]*(?:items|data|results|records|rows|entries)\s*:\s*\[\]\s*[^}]*\}/g

test.describe('Q81: Silent catch-return-default', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Server action files must not swallow errors as empty returns
  // ---------------------------------------------------------------------------
  test('use-server files do not silently return defaults on catch', () => {
    const libDir = resolve(ROOT, 'lib')
    const allFiles = walkDir(libDir, ['.ts'])

    const serverActionFiles = allFiles.filter((f) => {
      try {
        const src = readFileSync(f, 'utf-8')
        return src.startsWith("'use server'") || src.startsWith('"use server"')
      } catch {
        return false
      }
    })

    expect(serverActionFiles.length).toBeGreaterThan(50)

    const violations: string[] = []

    for (const file of serverActionFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      if (isExemptSideEffect(relPath)) continue

      // Check for silent return defaults
      SILENT_RETURN_PATTERN.lastIndex = 0
      let match
      while ((match = SILENT_RETURN_PATTERN.exec(src)) !== null) {
        if (!isNonBlockingContext(src, match.index)) {
          const lineNum = src.slice(0, match.index).split('\n').length
          violations.push(`${relPath}:${lineNum} catch returns silent default: ${match[1]}`)
        }
      }

      // Check for disguised empty returns
      DISGUISED_EMPTY_PATTERN.lastIndex = 0
      while ((match = DISGUISED_EMPTY_PATTERN.exec(src)) !== null) {
        if (!isNonBlockingContext(src, match.index)) {
          const lineNum = src.slice(0, match.index).split('\n').length
          violations.push(`${relPath}:${lineNum} catch returns disguised empty (items: [])`)
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ81 VIOLATIONS - Silent catch-return-default in server actions:\n` +
          violations.map((v) => `  SILENT FAIL: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Server actions silently swallowing errors as empty/default returns.\n` +
        `Each is a potential Zero Hallucination violation (user sees empty instead of error):\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Data-fetching functions (get*, fetch*, load*) must not swallow errors
  // ---------------------------------------------------------------------------
  test('data-fetching functions do not return silent defaults on failure', () => {
    const libDir = resolve(ROOT, 'lib')
    const allFiles = walkDir(libDir, ['.ts'])

    const violations: string[] = []

    // Focus on files with exported get/fetch/load functions
    const dataFetchPattern = /export\s+(?:async\s+)?function\s+(get|fetch|load)\w+/g

    for (const file of allFiles) {
      const src = readFileSync(file, 'utf-8')
      const relPath = relative(ROOT, file).replace(/\\/g, '/')

      if (isExemptSideEffect(relPath)) continue

      // Only check files that export data-fetching functions
      dataFetchPattern.lastIndex = 0
      if (!dataFetchPattern.test(src)) continue

      // Now check catch blocks in these files
      SILENT_RETURN_PATTERN.lastIndex = 0
      let match
      while ((match = SILENT_RETURN_PATTERN.exec(src)) !== null) {
        if (!isNonBlockingContext(src, match.index)) {
          const lineNum = src.slice(0, match.index).split('\n').length
          violations.push(`${relPath}:${lineNum} data-fetching file catch returns: ${match[1]}`)
        }
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ81 VIOLATIONS - Data-fetching functions swallowing errors:\n` +
          violations.map((v) => `  SILENT FAIL: ${v}`).join('\n')
      )
    }

    expect(
      violations,
      `Data-fetching functions returning silent defaults on error.\n` +
        `Chefs will see $0.00/empty instead of error messages:\n` +
        violations.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Non-blocking side effects ARE allowed to catch-and-swallow
  // ---------------------------------------------------------------------------
  test('non-blocking side-effect files are correctly exempted', () => {
    // This test confirms the exemption list is real and in use.
    // If side-effect files stop catching silently, that is GOOD, not a failure.
    const libDir = resolve(ROOT, 'lib')
    const allFiles = walkDir(libDir, ['.ts'])

    let sideEffectFiles = 0
    for (const file of allFiles) {
      const relPath = relative(ROOT, file).replace(/\\/g, '/')
      if (isExemptSideEffect(relPath)) {
        sideEffectFiles++
      }
    }

    // Confirm exemption directories exist (sanity check)
    expect(
      sideEffectFiles,
      'Expected side-effect exemption directories to contain files'
    ).toBeGreaterThan(0)
  })
})
