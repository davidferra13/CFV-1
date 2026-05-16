import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  classifyRoute,
  normalizeAppRoute,
  parseRoutePolicySource,
  renderRouteProtectionMatrix,
} from '../../scripts/generate-route-protection-matrix.mjs'

const policySource = `
export const CHEF_PROTECTED_PATHS = [
  '/dashboard',
  '/menus',
  // '/commented-out',
] as const
export const CLIENT_PROTECTED_PATHS = ['/my-events'] as const
export const STAFF_PROTECTED_PATHS = ['/staff-dashboard'] as const
export const PARTNER_PROTECTED_PATHS = ['/partner'] as const
export const VENDOR_PROTECTED_PATHS = ['/vendor'] as const
export const PUBLIC_UNAUTHENTICATED_PATHS = ['/about', '/book', '/embed'] as const
export const ADMIN_PATHS = ['/admin'] as const
export const API_SKIP_AUTH_PREFIXES = ['/api/webhooks', '/api/health'] as const
`

describe('route protection matrix generator', () => {
  const policy = parseRoutePolicySource(policySource)

  it('normalizes app route groups and dynamic segments into route paths', () => {
    assert.deepEqual(normalizeAppRoute('app/(chef)/menus/[id]/page.tsx'), {
      file: 'app/(chef)/menus/[id]/page.tsx',
      kind: 'page',
      path: '/menus/:id',
    })

    assert.deepEqual(normalizeAppRoute('app/api/webhooks/[provider]/route.ts'), {
      file: 'app/api/webhooks/[provider]/route.ts',
      kind: 'api',
      path: '/api/webhooks/:provider',
    })

    assert.deepEqual(normalizeAppRoute('app/api/og/services/route.tsx'), {
      file: 'app/api/og/services/route.tsx',
      kind: 'api',
      path: '/api/og/services',
    })

    assert.equal(normalizeAppRoute('app/(public)/page.tsx').path, '/')
    assert.equal(normalizeAppRoute('app/blog/[...slug]/page.tsx').path, '/blog/:slug*')
  })

  it('parses route policy arrays from source text', () => {
    assert.deepEqual(policy.chef, ['/dashboard', '/menus'])
    assert.deepEqual(policy.public, ['/about', '/book', '/embed'])
    assert.deepEqual(policy.apiSkipAuth, ['/api/webhooks', '/api/health'])
  })

  it('classifies protected, public, unknown, admin, and API review routes', () => {
    assert.equal(
      classifyRoute({ kind: 'page', path: '/menus/:id', file: '' }, policy).coverage,
      'chef'
    )
    assert.equal(
      classifyRoute({ kind: 'page', path: '/book/:chefSlug', file: '' }, policy).coverage,
      'public'
    )
    assert.equal(
      classifyRoute({ kind: 'page', path: '/missing', file: '' }, policy).coverage,
      'unknown'
    )

    const admin = classifyRoute({ kind: 'page', path: '/admin/clients', file: '' }, policy)
    assert.equal(admin.coverage, 'admin')
    assert.match(admin.review, /requireAdmin/)

    const skipAuthApi = classifyRoute(
      { kind: 'api', path: '/api/webhooks/:provider', file: '' },
      policy
    )
    assert.equal(skipAuthApi.coverage, 'technical-skip')
    assert.match(skipAuthApi.review, /self-authenticated/)

    const apiReview = classifyRoute({ kind: 'api', path: '/api/private/data', file: '' }, policy)
    assert.equal(apiReview.coverage, 'unknown')
  })

  it('renders summary and focused review tables', () => {
    const markdown = renderRouteProtectionMatrix(
      [
        { kind: 'page', path: '/menus/:id', file: 'app/(chef)/menus/[id]/page.tsx' },
        { kind: 'page', path: '/missing', file: 'app/missing/page.tsx' },
        { kind: 'page', path: '/admin', file: 'app/(admin)/admin/page.tsx' },
        { kind: 'api', path: '/api/private/data', file: 'app/api/private/data/route.ts' },
      ],
      policy,
      new Date('2026-05-15T00:00:00.000Z')
    )

    assert.match(markdown, /# Route Protection Matrix/)
    assert.match(markdown, /\| Unknown routes \| 2 \|/)
    assert.match(markdown, /## Unknown Routes/)
    assert.match(markdown, /\/missing/)
    assert.match(markdown, /## API And Route Handler Review/)
    assert.match(markdown, /\/api\/private\/data/)
  })
})
