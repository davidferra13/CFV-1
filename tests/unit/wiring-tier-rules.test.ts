/**
 * Unit tests for tier-aware wiring-audit classification.
 * Run: node --test --import tsx tests/unit/wiring-tier-rules.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error plain .mjs module without type declarations
import { tierForRoute, classifyRouteStatus } from '../../scripts/wiring-tier-rules.mjs'

const tierMap = {
  guests: { tier: 2, module: 'ticketed-dinners' },
  cannabis: { tier: 3 },
  pipeline: { tier: 4 },
  dashboard: { tier: 0 },
}
const moduleSlugs = new Set(['ticketed-dinners'])
const allowlist = new Set(['/studio/preview'])

describe('tierForRoute', () => {
  it('maps a route to its top-level section tier', () => {
    assert.deepEqual(tierForRoute('/guests/tickets/scan', tierMap), {
      tier: 2,
      module: 'ticketed-dinners',
    })
  })
  it('returns null for untagged sections', () => {
    assert.equal(tierForRoute('/not-a-section', tierMap), null)
  })
})

describe('classifyRouteStatus', () => {
  const base = { refCount: 0, navRefs: 0, allowlist, moduleSlugs, isMiddlewareWired: false }
  it('keeps current behavior for tier 0: zero refs is ORPHAN', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/dashboard/x', tierEntry: { tier: 0 } }),
      'ORPHAN'
    )
  })
  it('keeps current behavior for untagged routes: one non-nav ref is WEAK', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/whatever', tierEntry: null, refCount: 1 }),
      'WEAK'
    )
  })
  it('tier 2 with a registered module slug is WIRED even with zero nav refs', () => {
    assert.equal(
      classifyRouteStatus({
        ...base,
        route: '/guests/waitlist',
        tierEntry: { tier: 2, module: 'ticketed-dinners' },
      }),
      'WIRED'
    )
  })
  it('tier 2 with an unregistered module falls back to ORPHAN at zero refs', () => {
    assert.equal(
      classifyRouteStatus({
        ...base,
        route: '/guests/waitlist',
        tierEntry: { tier: 2, module: 'missing-module' },
      }),
      'ORPHAN'
    )
  })
  it('tier 3 with one ref of any kind is WIRED', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/cannabis', tierEntry: { tier: 3 }, refCount: 1 }),
      'WIRED'
    )
  })
  it('allowlisted route is ALLOWED regardless of refs', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/studio/preview', tierEntry: null }),
      'ALLOWED'
    )
  })
})
