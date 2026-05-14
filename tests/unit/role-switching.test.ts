import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('role switching', () => {
  it('should export switchRole and getAvailableRoles functions', async () => {
    const mod = await import('@/lib/auth/role-switching')
    assert.equal(typeof mod.switchRole, 'function')
    assert.equal(typeof mod.getAvailableRoles, 'function')
  })
})
