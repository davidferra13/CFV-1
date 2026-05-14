import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ROUTE_ACCESS_REGISTRY,
  assertRegistryMatchesPolicy,
  auditRouteAccessRegistry,
  findRouteAccessEntry,
} from '@/lib/auth/route-access-registry'

describe('route access registry', () => {
  it('classifies representative public and protected routes', () => {
    assert.equal(findRouteAccessEntry('/chef/demo')?.surface, 'public')
    assert.equal(findRouteAccessEntry('/dashboard')?.surface, 'chef')
    assert.equal(findRouteAccessEntry('/my-events')?.surface, 'client')
    assert.equal(findRouteAccessEntry('/staff-dashboard')?.surface, 'staff')
    assert.equal(findRouteAccessEntry('/partner')?.surface, 'partner')
    assert.equal(findRouteAccessEntry('/admin')?.surface, 'admin')
  })

  it('preserves current route-policy decisions', () => {
    for (const [path, role] of [
      ['/chef/demo', 'public'],
      ['/dashboard', 'chef'],
      ['/dashboard', 'client'],
      ['/my-events', 'client'],
      ['/my-events', 'chef'],
      ['/staff-dashboard', 'staff'],
      ['/partner', 'partner'],
      ['/admin', 'client'],
    ] as const) {
      assert.equal(assertRegistryMatchesPolicy(path, role).matches, true, `${path}:${role}`)
    }
  })

  it('audits duplicate and conflicting route entries', () => {
    const audit = auditRouteAccessRegistry()
    assert.ok(audit.total >= ROUTE_ACCESS_REGISTRY.length)
    assert.equal(
      audit.conflicts.some((conflict) => conflict.path === '/auth'),
      true
    )
  })
})
