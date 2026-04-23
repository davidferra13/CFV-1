import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import routeInventory from '@/lib/interface/route-inventory'

describe('Public Route Policy Coverage', () => {
  it('covers every static public page route', () => {
    const publicRoutes = routeInventory.getStaticPageRoutesForRole('public')
    const uncoveredRoutes = routeInventory.getRoutePolicyGapsForRole('public')

    assert.equal(publicRoutes.length > 0, true, 'No public routes discovered under app/(public)')
    assert.deepEqual(
      uncoveredRoutes,
      [],
      `Missing routes in PUBLIC_UNAUTHENTICATED_PATHS:\n${uncoveredRoutes.join('\n')}`
    )
  })
})
