/**
 * Verifies every top-level app/(chef) route family is protected by chef route policy.
 *
 * If this fails, add the missing root to CHEF_PROTECTED_PATHS in lib/auth/route-policy.ts.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { isChefRoutePath } from '../../lib/auth/route-policy'

const CHEF_APP_ROOT = path.join(process.cwd(), 'app', '(chef)')

function listChefRouteRoots(): string[] {
  return readdirSync(CHEF_APP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/${entry.name}`)
    .sort()
}

describe('Chef Route Policy Coverage', () => {
  it('covers every top-level app/(chef) route family', () => {
    const chefRoots = listChefRouteRoots()
    const uncoveredRoots = chefRoots.filter((route) => !isChefRoutePath(route))

    assert.equal(chefRoots.length > 0, true, 'No chef route roots discovered under app/(chef)')
    assert.deepEqual(
      uncoveredRoots,
      [],
      `Missing route roots in CHEF_PROTECTED_PATHS:\n${uncoveredRoots.join('\n')}`
    )
  })
})
