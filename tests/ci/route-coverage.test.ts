/**
 * Route Coverage CI Test
 *
 * Asserts every page.tsx in app/ is classified in the route policy map.
 * Unclassified routes fail CI, preventing unreviewed pages from shipping.
 *
 * Run: node --test --import tsx tests/ci/route-coverage.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { glob } from 'glob'
import { pageFileToRoute, getRoutePolicy, routePolicy } from '../../lib/security/route-policy.js'

describe('Route Coverage', () => {
  it('all page.tsx files have a route policy classification', async () => {
    const pages = await glob('app/**/page.tsx', { posix: true })
    assert.ok(pages.length > 0, 'Should find at least one page.tsx')

    const unclassified: string[] = []

    for (const page of pages) {
      const routePath = pageFileToRoute(page)
      const policy = getRoutePolicy(routePath)
      if (!policy) {
        unclassified.push(`${page} -> ${routePath}`)
      }
    }

    if (unclassified.length > 0) {
      assert.fail(
        `${unclassified.length} page(s) missing route policy classification:\n` +
          unclassified.map((u) => `  - ${u}`).join('\n') +
          '\n\nAdd these routes to lib/security/route-policy.ts'
      )
    }
  })

  it('pageFileToRoute strips route groups correctly', () => {
    assert.equal(pageFileToRoute('app/(chef)/events/[id]/page.tsx'), '/events/[id]')
    assert.equal(pageFileToRoute('app/(public)/about/page.tsx'), '/about')
    assert.equal(pageFileToRoute('app/(admin)/admin/users/page.tsx'), '/admin/users')
    assert.equal(pageFileToRoute('app/auth/signin/page.tsx'), '/auth/signin')
    assert.equal(pageFileToRoute('app/(public)/page.tsx'), '/')
    assert.equal(
      pageFileToRoute('app/(client)/my-events/[id]/countdown/page.tsx'),
      '/my-events/[id]/countdown'
    )
  })

  it('pageFileToRoute handles backslash paths (Windows)', () => {
    assert.equal(pageFileToRoute('app\\(chef)\\events\\[id]\\page.tsx'), '/events/[id]')
  })

  it('route policy map has no empty-string keys', () => {
    const keys = Object.keys(routePolicy)
    for (const key of keys) {
      assert.ok(key.length > 0, 'Route key must not be empty')
      assert.ok(key.startsWith('/'), `Route key must start with /: "${key}"`)
    }
  })

  it('every route policy value is a valid tier', () => {
    const validTiers = new Set([
      'public',
      'authenticated',
      'chef',
      'client',
      'staff',
      'admin',
      'partner',
      'vendor',
      'demo',
      'mobile',
      'kiosk',
    ])
    for (const [route, tier] of Object.entries(routePolicy)) {
      assert.ok(validTiers.has(tier), `Invalid tier "${tier}" for route "${route}"`)
    }
  })

  it('route policy map covers a reasonable number of routes', () => {
    const count = Object.keys(routePolicy).length
    assert.ok(count >= 800, `Expected 800+ routes classified, got ${count}`)
  })
})
