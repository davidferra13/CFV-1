import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import routeInventory from '@/lib/interface/route-inventory'

describe('Protected Route Policy Coverage', () => {
  it('covers every static client route file path', () => {
    const routePaths = routeInventory.getStaticPageRoutesForRole('client')
    const uncovered = routeInventory.getRoutePolicyGapsForRole('client')

    assert.equal(routePaths.length > 0, true, 'No client route paths discovered under app/(client)')
    assert.deepEqual(
      uncovered,
      [],
      `Missing route paths in CLIENT_PROTECTED_PATHS:\n${uncovered.join('\n')}`
    )
  })

  it('covers every static staff route file path', () => {
    const routePaths = routeInventory.getStaticPageRoutesForRole('staff')
    const uncovered = routeInventory.getRoutePolicyGapsForRole('staff')

    assert.equal(routePaths.length > 0, true, 'No staff route paths discovered under app/(staff)')
    assert.deepEqual(
      uncovered,
      [],
      `Missing route paths in STAFF_PROTECTED_PATHS:\n${uncovered.join('\n')}`
    )
  })

  it('covers every static partner route file path', () => {
    const routePaths = routeInventory.getStaticPageRoutesForRole('partner')
    const uncovered = routeInventory.getRoutePolicyGapsForRole('partner')

    assert.equal(routePaths.length > 0, true, 'No partner routes discovered under app/(partner)')
    assert.deepEqual(
      uncovered,
      [],
      `Missing route paths in PARTNER_PROTECTED_PATHS:\n${uncovered.join('\n')}`
    )
  })
})
