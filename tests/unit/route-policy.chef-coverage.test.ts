import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import routeInventory from '@/lib/interface/route-inventory'
import { getRoutePolicyDecisionForRole } from '@/lib/auth/route-policy'

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

for (const route of [
  '/business/ops',
  '/reference/dietary-conditions',
  '/reference/food-safety',
  '/series',
]) {
  it(route + ' admits chefs and denies other account contexts, including child pages', () => {
    for (const pathname of [route, route + '/internal-detail']) {
      const chef = getRoutePolicyDecisionForRole(pathname, 'chef')
      assert.equal(chef.allowed, true)
      assert.equal(chef.mode, 'chef_workspace')
      for (const role of [null, 'client', 'staff', 'partner', 'vendor', 'admin']) {
        const decision = getRoutePolicyDecisionForRole(pathname, role)
        assert.equal(decision.allowed, false, pathname + ' must reject ' + role)
        assert.equal(decision.reason, 'wrong_context')
        assert.equal(decision.mode, 'chef_workspace')
      }
    }
  })
}
