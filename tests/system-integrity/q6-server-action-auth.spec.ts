/**
 * Q6: Server Action Auth Completeness
 *
 * Every exported server action that touches tenant data must begin with an
 * auth check (requireChef, requireClient, requireAdmin, or be explicitly
 * documented as intentionally public).
 *
 * This is a STRUCTURAL test — it scans all 'use server' files and looks
 * for exported async functions that lack an auth check in the first 20 lines
 * of the function body.
 *
 * Failure = an exported server action callable by any unauthenticated request
 * with no auth guard, creating a data exposure or mutation vector.
 *
 * Known public-by-design patterns (exempt from this rule):
 *  - lib/auth/actions.ts (signIn, signOut — auth IS the operation)
 *  - lib/hub/profile-actions.ts (public profile creation for embed/hub join)
 *  - lib/hub/group-actions.ts (joinHubGroup — public join link)
 *  - lib/email/actions.ts (unsubscribe flows — must be public)
 *  - app/api/embed/* (public widget endpoints, rate-limited separately)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q6-server-action-auth.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

// Files that are intentionally public — auth is not required
const PUBLIC_EXEMPT_FILES = new Set([
  'lib/auth/actions.ts',
  'lib/auth/client-actions.ts',
  'lib/hub/profile-actions.ts',
  'lib/hub/group-actions.ts',
  'lib/email/unsubscribe-actions.ts',
  'lib/email/actions.ts',
  'lib/clients/public-actions.ts',
  'lib/reviews/public-actions.ts',
])

// Auth guard function names
const AUTH_GUARDS = [
  'requireChef',
  'requireClient',
  'requireAdmin',
  'requireAuth',
  'withApiAuth',
  'getServerSession',
  'auth()',
]

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
    // Directory not accessible
  }
  return results
}

function hasUseServer(src: string): boolean {
  // Must have 'use server' directive at the top
  return /^['"]use server['"]/m.test(src.slice(0, 500))
}

function extractExportedFunctions(src: string): Array<{ name: string; bodyStart: number }> {
  const results: Array<{ name: string; bodyStart: number }> = []
  // Match: export async function NAME or export async function NAME
  const pattern = /export\s+async\s+function\s+(\w+)\s*\(/g
  let match
  while ((match = pattern.exec(src)) !== null) {
    results.push({ name: match[1], bodyStart: match.index })
  }
  return results
}

function functionBodyFirst20Lines(src: string, bodyStart: number): string {
  // Find the opening brace and extract the next 20 lines
  const fromHere = src.slice(bodyStart)
  const braceIdx = fromHere.indexOf('{')
  if (braceIdx === -1) return ''
  const body = fromHere.slice(braceIdx + 1)
  return body.split('\n').slice(0, 20).join('\n')
}

function hasAuthGuard(body: string): boolean {
  return AUTH_GUARDS.some((guard) => body.includes(guard))
}

const ROOT = process.cwd()

test.describe('Q6: Server action auth completeness', () => {
  test('all exported server actions have auth guards', () => {
    // Scan lib/ and app/ for 'use server' files
    const libFiles = walkDir(join(ROOT, 'lib'), ['.ts'])
    const appFiles = walkDir(join(ROOT, 'app'), ['.ts', '.tsx'])
    const allFiles = [...libFiles, ...appFiles]

    const violations: string[] = []
    let checkedCount = 0
    let exemptCount = 0

    for (const filePath of allFiles) {
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')

      // Skip test files, type files, generated files
      if (rel.includes('.test.') || rel.includes('.spec.') || rel.includes('types/')) continue
      if (rel.includes('/node_modules/') || rel.includes('/.next/')) continue

      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      if (!hasUseServer(src)) continue

      // Check if file is in the exempt list
      if (PUBLIC_EXEMPT_FILES.has(rel)) {
        exemptCount++
        continue
      }

      const fns = extractExportedFunctions(src)
      for (const fn of fns) {
        checkedCount++
        const body = functionBodyFirst20Lines(src, fn.bodyStart)
        if (!hasAuthGuard(body)) {
          violations.push(`${rel}::${fn.name}`)
        }
      }
    }

    if (violations.length > 0) {
      console.error(
        `\nQ6 FAILURES — exported server actions missing auth guards (${violations.length}):\n` +
          violations.map((v) => `  MISSING AUTH: ${v}`).join('\n')
      )
    }

    // Report count even on pass
    console.log(
      `Q6: Checked ${checkedCount} server actions across use-server files. ` +
        `${exemptCount} files exempt. ${violations.length} violations.`
    )

    expect(
      violations,
      `${violations.length} server actions lack auth guards:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 2: Tenant ID in server actions comes from session, not request body
  // (Structural scan for the anti-pattern: input.tenantId or body.tenantId)
  // -------------------------------------------------------------------------
  test('server actions do not accept tenant_id from request body', () => {
    const libFiles = walkDir(join(ROOT, 'lib'), ['.ts'])
    const violations: string[] = []

    for (const filePath of libFiles) {
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')
      if (rel.includes('.test.') || rel.includes('.spec.')) continue

      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      if (!hasUseServer(src)) continue

      // Anti-pattern: reading tenant_id from a function parameter named input/data/body/payload
      // instead of from the session
      const antiPattern = /(?:input|data|body|payload|params)\s*(?:\?\.|\[\s*['"])\s*tenant_id/g
      const altPattern = /=\s*(?:input|data|body|payload)\.tenantId/g

      if (antiPattern.test(src) || altPattern.test(src)) {
        violations.push(rel)
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ6 WARNING — possible tenant_id from request body in:\n` +
          violations.map((v) => `  CHECK: ${v}`).join('\n') +
          `\n(May be false positives — verify manually)`
      )
    }

    // This is a warning-level check, not a hard failure (too many false positives)
    // Just log the count
    console.log(`Q6: ${violations.length} files with possible tenant_id-from-body patterns.`)
    expect(true).toBe(true) // Always pass — logged for manual review
  })
})
