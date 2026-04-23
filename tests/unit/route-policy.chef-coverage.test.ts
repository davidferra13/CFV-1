import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import routeInventory from '@/lib/interface/route-inventory'

describe('Chef Route Policy Coverage', () => {
  it('covers every static chef route file path', () => {
    const routePaths = routeInventory.getStaticPageRoutesForRole('chef')
    const uncovered = routeInventory.getRoutePolicyGapsForRole('chef')

    assert.equal(routePaths.length > 0, true, 'No chef route paths discovered under app/(chef)')
    assert.deepEqual(
      uncovered,
      [],
      `Missing route paths in CHEF_PROTECTED_PATHS:\n${uncovered.join('\n')}`
    )
  })
})
