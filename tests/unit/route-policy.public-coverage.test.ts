/**
 * Verifies every public website page route is covered by unauthenticated route policy.
 *
 * If this fails, add the missing route prefix to PUBLIC_UNAUTHENTICATED_PATHS
 * in lib/auth/route-policy.ts.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { isPublicUnauthenticatedPath } from '../../lib/auth/route-policy'

const PUBLIC_APP_ROOT = path.join(process.cwd(), 'app', '(public)')

function listPublicPageRoutes(dir: string = PUBLIC_APP_ROOT): string[] {
  const routes: string[] = []

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      routes.push(...listPublicPageRoutes(fullPath))
      continue
    }

    if (entry !== 'page.tsx') {
      continue
    }

    const relativePath = path.relative(PUBLIC_APP_ROOT, fullPath).replace(/\\/g, '/')
    const route = relativePath === 'page.tsx' ? '/' : `/${relativePath.replace(/\/page\.tsx$/, '')}`
    routes.push(route)
  }

  return Array.from(new Set(routes)).sort()
}

describe('Public Route Policy Coverage', () => {
  it('covers every app/(public) page route', () => {
    const publicRoutes = listPublicPageRoutes()
    const uncoveredRoutes = publicRoutes.filter(
      (route) => route !== '/' && !isPublicUnauthenticatedPath(route)
    )

    assert.equal(publicRoutes.length > 0, true, 'No public routes discovered under app/(public)')
    assert.deepEqual(
      uncoveredRoutes,
      [],
      `Missing routes in PUBLIC_UNAUTHENTICATED_PATHS:\n${uncoveredRoutes.join('\n')}`
    )
  })
})
