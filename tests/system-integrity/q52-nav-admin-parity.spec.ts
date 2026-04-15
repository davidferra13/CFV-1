/**
 * Q52: Nav adminOnly Parity
 *
 * Every nav item marked adminOnly: true must correspond to a route that
 * also enforces admin access at the server level (layout or page-level
 * requireAdmin). Hiding a nav item is UX, not security. If the route
 * itself has no server gate, any chef can navigate there directly by URL.
 *
 * This question enforces the principle: nav hiding and route protection
 * must always be in sync. If nav says adminOnly, route must agree.
 *
 * Tests:
 *
 * 1. NAV CONFIG EXISTS: components/navigation/nav-config.tsx exists.
 *
 * 2. ADMIN LAYOUT COVERS /admin/* ROUTES: Nav items pointing to /admin/*
 *    are covered by the admin layout gate (app/(admin)/layout.tsx).
 *
 * 3. PROSPECTING ROUTES HAVE PAGE GUARDS: Nav items pointing to /prospecting/*
 *    correspond to pages that call requireAdmin() at page level.
 *
 * 4. SETTINGS/REMY REQUIRES ADMIN: /settings/remy page calls requireAdmin()
 *    since it's admin-only in the nav.
 *
 * 5. NO ADMINONLY NAV ITEM POINTS TO UNPROTECTED ROUTE: For each adminOnly
 *    nav item with a /chef/* route, the corresponding page.tsx must call
 *    requireAdmin() or isAdmin() for conditional rendering.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q52-nav-admin-parity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const NAV_CONFIG = resolve(ROOT, 'components/navigation/nav-config.tsx')
const ADMIN_LAYOUT = resolve(ROOT, 'app/(admin)/layout.tsx')

// Known admin-only chef-portal pages (not under /admin/ layout)
const ADMIN_ONLY_CHEF_PAGES = [
  { route: '/settings/remy', page: 'app/(chef)/settings/remy/page.tsx' },
  { route: '/remy', page: 'app/(chef)/remy/page.tsx' },
  { route: '/commands', page: 'app/(chef)/commands/page.tsx' },
]

// Known prospecting pages
const PROSPECTING_PAGES = [
  'app/(chef)/prospecting/page.tsx',
  'app/(chef)/prospecting/clusters/page.tsx',
  'app/(chef)/prospecting/pipeline/page.tsx',
  'app/(chef)/prospecting/queue/page.tsx',
]

test.describe('Q52: Nav adminOnly parity with route guards', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Nav config exists
  // ---------------------------------------------------------------------------
  test('components/navigation/nav-config.tsx exists', () => {
    expect(existsSync(NAV_CONFIG), 'components/navigation/nav-config.tsx must exist').toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Nav config contains adminOnly flags
  // ---------------------------------------------------------------------------
  test('nav-config.tsx contains adminOnly: true flags for protected items', () => {
    const src = readFileSync(NAV_CONFIG, 'utf-8')
    expect(
      src.includes('adminOnly'),
      'nav-config.tsx must have adminOnly flags to control visibility'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Admin layout covers /admin/* routes
  // ---------------------------------------------------------------------------
  test('app/(admin)/layout.tsx is the security gate for all /admin/* routes', () => {
    expect(existsSync(ADMIN_LAYOUT), 'app/(admin)/layout.tsx must exist').toBe(true)
    const src = readFileSync(ADMIN_LAYOUT, 'utf-8')
    expect(
      src.includes('requireAdmin'),
      'Admin layout must call requireAdmin() — this covers all /admin/* nav items'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Prospecting pages call requireAdmin at page level
  // ---------------------------------------------------------------------------
  for (const relPath of PROSPECTING_PAGES) {
    const absPath = resolve(ROOT, relPath)
    test(`${relPath} calls requireAdmin() (adminOnly nav item needs page-level guard)`, () => {
      if (!existsSync(absPath)) return
      const src = readFileSync(absPath, 'utf-8')
      expect(
        src.includes('requireAdmin'),
        `${relPath} must call requireAdmin() — it is marked adminOnly in nav but lives in the chef route group`
      ).toBe(true)
    })
  }

  // ---------------------------------------------------------------------------
  // Test 5: Settings/remy, /remy, /commands call requireAdmin
  // ---------------------------------------------------------------------------
  for (const { route, page } of ADMIN_ONLY_CHEF_PAGES) {
    const absPath = resolve(ROOT, page)
    test(`${route} page calls requireAdmin() (adminOnly nav item)`, () => {
      if (!existsSync(absPath)) return
      const src = readFileSync(absPath, 'utf-8')
      expect(
        src.includes('requireAdmin') || src.includes('isAdmin'),
        `${page} is linked from adminOnly nav — it must call requireAdmin() or gate content behind isAdmin()`
      ).toBe(true)
    })
  }

  // ---------------------------------------------------------------------------
  // Test 6: Nav filtering logic hides adminOnly items for non-admins
  // ---------------------------------------------------------------------------
  test('nav-config sidebar filtering logic excludes adminOnly items for non-admin users', () => {
    // Find sidebar or nav rendering component
    const candidates = [
      resolve(ROOT, 'components/navigation/chef-nav.tsx'),
      resolve(ROOT, 'components/navigation/sidebar.tsx'),
      resolve(ROOT, 'components/layout/sidebar.tsx'),
      resolve(ROOT, 'components/chef-nav.tsx'),
    ]

    let found = false
    for (const f of candidates) {
      if (existsSync(f)) {
        const src = readFileSync(f, 'utf-8')
        if (src.includes('adminOnly') && (src.includes('isAdmin') || src.includes('filter'))) {
          found = true
          break
        }
      }
    }

    expect(
      found,
      'The sidebar/nav component must filter out adminOnly nav items for non-admin users'
    ).toBe(true)
  })
})
