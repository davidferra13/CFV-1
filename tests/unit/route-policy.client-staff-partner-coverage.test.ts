import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import routeInventory from '@/lib/interface/route-inventory'

describe('Protected Route Policy Coverage', () => {
  it('covers every static public route file path', () => {
    const routePaths = routeInventory.getStaticPageRoutesForRole('public')
    const uncovered = routeInventory.getRoutePolicyGapsForRole('public')

    assert.equal(routePaths.length > 0, true, 'No public route paths discovered under app')
    assert.deepEqual(
      uncovered,
      [],
      `Missing route paths in PUBLIC_UNAUTHENTICATED_PATHS:\n${uncovered.join('\n')}`
    )
  })

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

  it('covers every static admin route file path', () => {
    const routePaths = routeInventory.getStaticPageRoutesForRole('admin')
    const uncovered = routeInventory.getRoutePolicyGapsForRole('admin')

    assert.equal(routePaths.length > 0, true, 'No admin routes discovered under app/(admin)')
    assert.deepEqual(uncovered, [], `Missing route paths in ADMIN_PATHS:\n${uncovered.join('\n')}`)
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
