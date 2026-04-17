/**
 * Q92: External Fetch Timeout Coverage
 *
 * Stress Questions Q26-Q27: External API calls without timeouts can
 * hang indefinitely, blocking server action threads and exhausting
 * the connection pool.
 *
 * What we check:
 *   1. Critical-path files (financial, auth, notifications) must have AbortSignal.timeout
 *   2. All other external fetches are warned but not hard-failed (tech debt baseline)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q92-external-fetch-timeouts.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function scanDir(dir: string, ext: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...scanDir(full, ext))
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(full)
      }
    }
  } catch {
    /* skip unreadable */
  }
  return results
}

// Critical-path files that MUST have timeout protection.
// These are files where a hung fetch blocks financial ops, auth, or notifications.
const CRITICAL_PATH_FILES = [
  'lib/notifications/onesignal.ts',
  'lib/geo/geocodio.ts',
  'lib/sms/twilio-client.ts',
  'lib/sms/send.ts',
  'lib/ledger/',
  'lib/finance/',
]

function isCriticalPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return CRITICAL_PATH_FILES.some((cp) => normalized.includes(cp))
}

test.describe('Q92: External fetch timeout coverage', () => {
  const libFiles = scanDir(resolve(ROOT, 'lib'), '.ts')

  function findFilesWithExternalFetch(): { withTimeout: string[]; withoutTimeout: string[] } {
    const timeoutPattern = /AbortSignal\.timeout|AbortController|signal\s*:/
    const internalUrlPattern = /localhost|127\.0\.0\.1|0\.0\.0\.0/
    const withTimeout: string[] = []
    const withoutTimeout: string[] = []

    for (const file of libFiles) {
      const content = readFileSync(file, 'utf-8')
      const fetchMatches = content.match(/fetch\s*\(/g)
      if (!fetchMatches) continue

      const lines = content.split('\n')
      let hasExternalFetch = false

      for (const line of lines) {
        if (line.includes('fetch(') || line.includes('fetch (')) {
          if (!internalUrlPattern.test(line)) {
            hasExternalFetch = true
            break
          }
        }
      }

      if (
        !hasExternalFetch &&
        content.includes('fetch(') &&
        (content.includes('ONESIGNAL') ||
          content.includes('GEOCODIO') ||
          content.includes('TWILIO') ||
          content.includes('propublica') ||
          content.includes('openfoodfacts') ||
          content.includes('wfp.org'))
      ) {
        hasExternalFetch = true
      }

      if (!hasExternalFetch) continue

      if (timeoutPattern.test(content)) {
        withTimeout.push(file)
      } else {
        withoutTimeout.push(file)
      }
    }
    return { withTimeout, withoutTimeout }
  }

  test('critical-path external fetches have timeout protection', () => {
    const { withoutTimeout } = findFilesWithExternalFetch()
    const criticalMissing = withoutTimeout.filter((f) => isCriticalPath(f))

    if (criticalMissing.length > 0) {
      const relative = criticalMissing.map((f) => f.replace(ROOT, '').replace(/\\/g, '/'))
      console.warn(
        `CRITICAL files with external fetch() but NO timeout:\n${relative.join('\n')}\n` +
          'Fix: Add AbortSignal.timeout() to prevent hung connections on critical paths.'
      )
    }

    expect(
      criticalMissing.length,
      `${criticalMissing.length} critical-path file(s) lack fetch timeout protection`
    ).toBe(0)
  })

  test('baseline: track non-critical files without timeouts', () => {
    const { withoutTimeout, withTimeout } = findFilesWithExternalFetch()
    const nonCritical = withoutTimeout.filter((f) => !isCriticalPath(f))

    if (nonCritical.length > 0) {
      const relative = nonCritical.map((f) => f.replace(ROOT, '').replace(/\\/g, '/'))
      console.warn(
        `Tech debt: ${nonCritical.length} non-critical file(s) with external fetch but no timeout:\n` +
          relative.join('\n') +
          '\nThese should be addressed incrementally.'
      )
    }

    // This is informational, not a hard failure. Track the count to detect regression.
    // If someone adds a new file with external fetch and no timeout, this count goes up.
    console.log(
      `Timeout coverage: ${withTimeout.length} protected, ${nonCritical.length} unprotected (non-critical)`
    )
  })
})
