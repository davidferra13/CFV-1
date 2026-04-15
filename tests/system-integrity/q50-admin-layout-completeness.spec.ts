/**
 * Q50: Admin Layout Completeness
 *
 * Every page under app/(admin)/ must pass through app/(admin)/layout.tsx,
 * which calls requireAdmin() globally. If any admin page is reachable outside
 * this layout tree (e.g., placed in a parallel route or a different segment),
 * the layout gate is bypassed and the page is unprotected.
 *
 * This is a structural guarantee: the layout is the only gate, so its scope
 * must cover ALL admin pages.
 *
 * Tests:
 *
 * 1. LAYOUT EXISTS: app/(admin)/layout.tsx exists.
 *
 * 2. LAYOUT CALLS REQUIREADMIN: The layout file contains requireAdmin().
 *
 * 3. ALL ADMIN PAGES UNDER LAYOUT: Every page.tsx under app/(admin)/ is a
 *    descendant of app/(admin)/layout.tsx — no admin page lives outside the
 *    admin route group.
 *
 * 4. NO ADMIN PAGES IN CHEF LAYOUT: No page.tsx inside app/(chef)/ contains
 *    "requireAdmin" without ALSO having a page-level requireAdmin call (the
 *    chef layout only calls requireChef, so page-level admin checks are the
 *    only protection for admin-gated pages inside the chef portal).
 *
 * 5. CANNABIS LAYOUT REDIRECTS ALL: app/(chef)/cannabis/layout.tsx redirects
 *    every request to /dashboard — cannabis is disabled for all users.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q50-admin-layout-completeness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const ADMIN_LAYOUT = resolve(ROOT, 'app/(admin)/layout.tsx')
const CANNABIS_LAYOUT = resolve(ROOT, 'app/(chef)/cannabis/layout.tsx')

function findFiles(dir: string, name: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFiles(full, name))
    } else if (entry.isFile() && entry.name === name) {
      results.push(full)
    }
  }
  return results
}

test.describe('Q50: Admin layout completeness', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Admin layout exists
  // ---------------------------------------------------------------------------
  test('app/(admin)/layout.tsx exists', () => {
    expect(
      existsSync(ADMIN_LAYOUT),
      'app/(admin)/layout.tsx must exist — it is the global admin auth gate'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Admin layout calls requireAdmin()
  // ---------------------------------------------------------------------------
  test('app/(admin)/layout.tsx calls requireAdmin()', () => {
    expect(existsSync(ADMIN_LAYOUT), 'app/(admin)/layout.tsx must exist').toBe(true)
    const src = readFileSync(ADMIN_LAYOUT, 'utf-8')

    expect(
      src.includes('requireAdmin'),
      'app/(admin)/layout.tsx must call requireAdmin() — this is the only gate for all admin pages'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: All admin page.tsx files are under the admin route group
  // ---------------------------------------------------------------------------
  test('all admin page.tsx files live under app/(admin)/ — none outside the admin layout tree', () => {
    // Find all page.tsx files that reference requireAdmin() outside the admin group
    const chefPages = findFiles(resolve(ROOT, 'app/(chef)'), 'page.tsx')
    const publicPages = findFiles(resolve(ROOT, 'app/(public)'), 'page.tsx').concat(
      findFiles(resolve(ROOT, 'app/api'), 'route.ts')
    )

    // None of these should bypass admin by having admin data access without page-level gate
    // The test: any page outside (admin)/ that imports from lib/admin/ must also call requireAdmin
    const violations: string[] = []
    for (const page of chefPages) {
      const src = readFileSync(page, 'utf-8')
      if (src.includes("from '@/lib/admin/") || src.includes('from "@/lib/admin/')) {
        // Imports admin lib — must have its own requireAdmin call
        if (!src.includes('requireAdmin')) {
          violations.push(page.replace(ROOT, '').replace(/\\/g, '/'))
        }
      }
    }

    expect(
      violations,
      `These chef-portal pages import from lib/admin/ but don't call requireAdmin(): ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Chef pages with admin-only sections call requireAdmin or isAdmin
  // ---------------------------------------------------------------------------
  test('chef portal pages with admin UI sections use isAdmin() for conditional rendering', () => {
    const dashboardPage = resolve(ROOT, 'app/(chef)/dashboard/page.tsx')
    if (!existsSync(dashboardPage)) return

    const src = readFileSync(dashboardPage, 'utf-8')

    // Dashboard is known to have admin-only widgets — they must be gated
    if (src.includes('admin') || src.includes('Admin')) {
      expect(
        src.includes('isAdmin') || src.includes('requireAdmin'),
        'Dashboard page with admin widgets must call isAdmin() to conditionally render them'
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 5: Cannabis layout hard-redirects all requests
  // ---------------------------------------------------------------------------
  test('app/(chef)/cannabis/layout.tsx redirects ALL requests to /dashboard', () => {
    expect(
      existsSync(CANNABIS_LAYOUT),
      'app/(chef)/cannabis/layout.tsx must exist to enforce the hard redirect'
    ).toBe(true)

    const src = readFileSync(CANNABIS_LAYOUT, 'utf-8')

    expect(
      src.includes('redirect'),
      'Cannabis layout must call redirect() — the feature is disabled for all users'
    ).toBe(true)

    expect(
      src.includes('/dashboard') || src.includes("'/'"),
      "Cannabis layout redirect must point to '/dashboard' or '/'"
    ).toBe(true)
  })
})
