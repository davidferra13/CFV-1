/**
 * Verifies every app/(chef) route file is protected by chef route policy.
 *
 * Discovers actual page.tsx / route.ts files and derives their URL paths,
 * so directories like /chef (which hosts public /chef/[slug] AND protected
 * /chef/cannabis/*) are tested at the actual route level, not the root level.
 *
 * If this fails, add the missing path to CHEF_PROTECTED_PATHS in lib/auth/route-policy.ts.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { isChefRoutePath, isPublicUnauthenticatedPath } from '../../lib/auth/route-policy'

const CHEF_APP_ROOT = path.join(process.cwd(), 'app', '(chef)')

/**
 * Recursively find all page.tsx / route.ts files under app/(chef) and
 * derive their URL paths. Strips Next.js layout groups like (chef) from
 * the path segments. Dynamic segments like [id] are preserved as-is for
 * prefix matching.
 */
function discoverChefRoutePaths(): string[] {
  const routePaths: string[] = []

  function walk(dir: string, urlSegments: string[]) {
    if (!existsSync(dir)) return
    const entries = readdirSync(dir, { withFileTypes: true })

    // Check if this directory has a route file
    const hasRoute = entries.some(
      (e) =>
        !e.isDirectory() &&
        (e.name === 'page.tsx' ||
          e.name === 'page.ts' ||
          e.name === 'route.ts' ||
          e.name === 'route.tsx')
    )

    if (hasRoute && urlSegments.length > 0) {
      routePaths.push('/' + urlSegments.join('/'))
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      // Skip Next.js internal dirs
      if (entry.name.startsWith('_')) continue

      // Strip layout groups like (chef), (public) from URL
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        walk(path.join(dir, entry.name), urlSegments)
      } else {
        walk(path.join(dir, entry.name), [...urlSegments, entry.name])
      }
    }
  }

  walk(CHEF_APP_ROOT, [])
  return routePaths.sort()
}

describe('Chef Route Policy Coverage', () => {
  it('covers every app/(chef) route file path', () => {
    const routePaths = discoverChefRoutePaths()
    // Exclude routes also in PUBLIC_UNAUTHENTICATED_PATHS; middleware handles
    // those before the chef-protection check runs, so they don't need to be
    // in CHEF_PROTECTED_PATHS (e.g. /availability, /feedback serve both public
    // and chef layout groups depending on auth state).
    const uncovered = routePaths.filter(
      (route) => !isChefRoutePath(route) && !isPublicUnauthenticatedPath(route)
    )

    assert.equal(routePaths.length > 0, true, 'No chef route paths discovered under app/(chef)')
    assert.deepEqual(
      uncovered,
      [],
      `Missing route paths in CHEF_PROTECTED_PATHS:\n${uncovered.join('\n')}`
    )
  })
})
