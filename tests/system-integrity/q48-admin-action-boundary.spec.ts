/**
 * Q48: Admin Action Boundary
 *
 * Every exported server action whose name begins with "admin" must call
 * requireAdmin() before touching data. Q6 checks that all server actions
 * have *some* auth guard; Q48 is the stronger check: admin-prefixed functions
 * must specifically gate on admin role, not just any authenticated session.
 *
 * Live incident (2026-04-15): lib/discover/actions.ts exported 5 admin-prefixed
 * functions (adminGetAllListings, adminUpdateListingStatus, adminCreateListing,
 * adminGetNominations, adminReviewNomination) with no requireAdmin() guard.
 * Any authenticated chef could call them directly. Fixed same day.
 *
 * Tests:
 *
 * 1. DISCOVER ADMIN GATE: All 5 admin functions in lib/discover/actions.ts
 *    call requireAdmin() before any database operation.
 *
 * 2. DISCOVER IMPORT PRESENT: lib/discover/actions.ts imports requireAdmin
 *    from @/lib/auth/admin.
 *
 * 3. NO UNGUARDED ADMIN PREFIX: Scan all 'use server' files for exported
 *    async functions with "admin" in the name. Every such file must import
 *    requireAdmin (or have the function gated via another admin check).
 *
 * 4. REQUIREADMIN THROWS ON NON-ADMIN: lib/auth/admin.ts requireAdmin()
 *    throws (redirect or error) when the caller is not in platform_admins.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q48-admin-action-boundary.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const DISCOVER_ACTIONS = resolve(ROOT, 'lib/discover/actions.ts')
const ADMIN_LIB = resolve(ROOT, 'lib/auth/admin.ts')

function getAllTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...getAllTsFiles(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full)
    }
  }
  return results
}

test.describe('Q48: Admin action boundary', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Discover admin functions call requireAdmin()
  // ---------------------------------------------------------------------------
  test('lib/discover/actions.ts: all admin-prefixed functions call requireAdmin()', () => {
    expect(existsSync(DISCOVER_ACTIONS), 'lib/discover/actions.ts must exist').toBe(true)
    const src = readFileSync(DISCOVER_ACTIONS, 'utf-8')

    const adminFns = [
      'adminGetAllListings',
      'adminUpdateListingStatus',
      'adminCreateListing',
      'adminGetNominations',
      'adminReviewNomination',
    ]

    for (const fn of adminFns) {
      const fnStart = src.indexOf(`export async function ${fn}`)
      expect(fnStart, `${fn} must be exported from lib/discover/actions.ts`).toBeGreaterThan(-1)

      // Find the function body (next 200 chars after opening brace)
      const bodyStart = src.indexOf('{', fnStart)
      const bodySnippet = src.slice(bodyStart, bodyStart + 300)

      expect(
        bodySnippet.includes('requireAdmin'),
        `${fn} must call requireAdmin() before any database operation`
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 2: lib/discover/actions.ts imports requireAdmin
  // ---------------------------------------------------------------------------
  test('lib/discover/actions.ts imports requireAdmin from @/lib/auth/admin', () => {
    const src = readFileSync(DISCOVER_ACTIONS, 'utf-8')
    expect(
      src.includes('requireAdmin') && src.includes('lib/auth/admin'),
      "lib/discover/actions.ts must import requireAdmin from '@/lib/auth/admin'"
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: No 'use server' file exports an admin-named function without
  //         importing requireAdmin
  // ---------------------------------------------------------------------------
  test("all 'use server' files with admin-prefixed exports import requireAdmin", () => {
    const allFiles = [
      ...getAllTsFiles(resolve(ROOT, 'lib')),
      ...getAllTsFiles(resolve(ROOT, 'app')),
    ]

    const violations: string[] = []

    for (const file of allFiles) {
      let src: string
      try {
        src = readFileSync(file, 'utf-8')
      } catch {
        continue
      }

      if (!src.includes("'use server'") && !src.includes('"use server"')) continue

      // Check if this file exports any admin-named async function
      const hasAdminExport = /export\s+async\s+function\s+admin[A-Z]/.test(src)
      if (!hasAdminExport) continue

      // It must import requireAdmin
      if (!src.includes('requireAdmin')) {
        const relativePath = file.replace(ROOT, '').replace(/\\/g, '/')
        violations.push(relativePath)
      }
    }

    expect(
      violations,
      `These 'use server' files export admin-prefixed functions but don't import requireAdmin: ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: requireAdmin throws/redirects for non-admin callers
  // ---------------------------------------------------------------------------
  test('lib/auth/admin.ts requireAdmin() throws or redirects when not admin', () => {
    expect(existsSync(ADMIN_LIB), 'lib/auth/admin.ts must exist').toBe(true)
    const src = readFileSync(ADMIN_LIB, 'utf-8')

    // Must have a check that throws or redirects
    expect(
      src.includes('redirect') || src.includes('throw') || src.includes('Error'),
      'requireAdmin() must throw or redirect when the caller is not in platform_admins'
    ).toBe(true)

    // Must check platform_admins table or equivalent
    expect(
      src.includes('platform_admins') || src.includes('isAdmin') || src.includes('admin_access'),
      'requireAdmin() must verify admin status against platform_admins or equivalent'
    ).toBe(true)
  })
})
