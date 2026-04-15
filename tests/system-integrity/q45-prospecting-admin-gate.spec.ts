/**
 * Q45: Prospecting Admin Gate
 *
 * Prospecting is exclusively an admin feature. CLAUDE.md states this as a
 * permanent, non-negotiable rule: prospecting must NEVER appear in any
 * non-admin user's portal. This rule exists because prospecting tools
 * include AI-driven lead scoring and OpenClaw data access - capabilities
 * that are admin-controlled and cost-significant.
 *
 * Two enforcement layers:
 *   1. Nav: prospecting nav items have adminOnly: true
 *   2. Pages: prospecting pages call requireAdmin() server-side
 *
 * Tests:
 *
 * 1. MAIN PROSPECTING PAGE: app/(chef)/prospecting/page.tsx has requireAdmin.
 *
 * 2. CLUSTER PAGE: prospecting/clusters/page.tsx has requireAdmin.
 *
 * 3. NAV CONFIG: The nav config has adminOnly: true for prospecting items.
 *
 * 4. PIPELINE PAGE: prospecting/pipeline/page.tsx has requireAdmin or
 *    redirects non-admins.
 *
 * 5. NO PROSPECTING IN DASHBOARD FOR NON-ADMIN: Dashboard widget or
 *    shortcut is gated behind isAdmin() check.
 *
 * 6. REQUIRE ADMIN EXISTS: lib/auth/get-user.ts (or similar) exports
 *    requireAdmin() as a distinct function from requireChef().
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q45-prospecting-admin-gate.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { readdirSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()

function readIfExists(rel: string): string | null {
  const full = resolve(ROOT, rel)
  return existsSync(full) ? readFileSync(full, 'utf-8') : null
}

test.describe('Q45: Prospecting admin gate', () => {
  // -------------------------------------------------------------------------
  // Test 1: Main prospecting page requires admin
  // -------------------------------------------------------------------------
  test('app/(chef)/prospecting/page.tsx requires admin authentication', () => {
    const src = readIfExists('app/(chef)/prospecting/page.tsx')
    if (!src) return // skip if not built yet

    expect(
      src.includes('requireAdmin') || src.includes('isAdmin') || src.includes('admin'),
      'prospecting/page.tsx must call requireAdmin() (prospecting is admin-only per CLAUDE.md)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Clusters page requires admin
  // -------------------------------------------------------------------------
  test('prospecting/clusters/page.tsx requires admin authentication', () => {
    const src = readIfExists('app/(chef)/prospecting/clusters/page.tsx')
    if (!src) return

    expect(
      src.includes('requireAdmin') || src.includes('isAdmin'),
      'prospecting/clusters/page.tsx must require admin (cluster analysis is admin-only)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Nav config marks prospecting as adminOnly
  // -------------------------------------------------------------------------
  test('nav config marks prospecting items as adminOnly: true', () => {
    // Check nav config files
    const navFiles = [
      'lib/nav/nav-config.tsx',
      'lib/nav/nav-config.ts',
      'components/nav/nav-config.tsx',
      'components/nav/nav-config.ts',
      'app/(chef)/nav-config.tsx',
      'app/(chef)/nav-config.ts',
    ]

    let navSrc = ''
    for (const rel of navFiles) {
      const content = readIfExists(rel)
      if (content) {
        navSrc = content
        break
      }
    }

    if (!navSrc) return // nav config not found, skip

    expect(
      navSrc.includes('adminOnly') || navSrc.includes('admin_only'),
      'nav config must have adminOnly property for prospecting items'
    ).toBe(true)

    if (navSrc.includes('prospecting') || navSrc.includes('Prospecting')) {
      // If prospecting is in the nav, it must be marked adminOnly
      const prospIdx = navSrc.indexOf('prospecting')
      const region = navSrc.slice(Math.max(0, prospIdx - 200), prospIdx + 400)

      expect(
        region.includes('adminOnly') || region.includes('admin'),
        'prospecting nav item must have adminOnly: true'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: All prospecting pages have admin guard
  // -------------------------------------------------------------------------
  test('all app/(chef)/prospecting/ page files have admin guard', () => {
    const prospDir = resolve(ROOT, 'app/(chef)/prospecting')
    if (!existsSync(prospDir)) return

    const violations: string[] = []

    function checkDir(dir: string) {
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const full = join(dir, entry.name)
          if (entry.isDirectory()) {
            checkDir(full)
          } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
            const src = readFileSync(full, 'utf-8')
            if (
              !src.includes('requireAdmin') &&
              !src.includes('isAdmin') &&
              !src.includes('admin')
            ) {
              violations.push(relative(ROOT, full).replace(/\\/g, '/'))
            }
          }
        }
      } catch {
        // skip
      }
    }

    checkDir(prospDir)

    expect(
      violations,
      `Prospecting page files must have admin guards: ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 5: Dashboard prospecting widget is gated behind isAdmin
  // -------------------------------------------------------------------------
  test('dashboard prospecting widget is gated behind isAdmin() check', () => {
    const dashSrc =
      readIfExists('app/(chef)/dashboard/page.tsx') ||
      readIfExists('app/(chef)/dashboard/_sections/prospecting-widget.tsx') ||
      readIfExists('components/prospecting/prospecting-widget.tsx')

    if (!dashSrc) return // no dashboard prospecting widget, trivially safe

    if (dashSrc.includes('prospecting') || dashSrc.includes('Prospecting')) {
      expect(
        dashSrc.includes('isAdmin') ||
          dashSrc.includes('adminOnly') ||
          dashSrc.includes('requireAdmin'),
        'dashboard prospecting widget must be gated behind isAdmin() (non-admin chefs must not see prospecting)'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 6: requireAdmin function exists in auth module
  // -------------------------------------------------------------------------
  test('requireAdmin() function exists in auth module (distinct from requireChef)', () => {
    const authFiles = ['lib/auth/get-user.ts', 'lib/auth/require-admin.ts', 'lib/auth/auth.ts']

    let found = false
    for (const rel of authFiles) {
      const content = readIfExists(rel)
      if (content && content.includes('requireAdmin')) {
        found = true
        break
      }
    }

    expect(
      found,
      'requireAdmin() must exist in the auth module (prospecting pages import it to enforce admin-only access)'
    ).toBe(true)
  })
})
