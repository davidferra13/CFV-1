import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canPosAccessLevelSatisfy,
  isPosManagerApprovalRequired,
  isPosRoleMatrixRequired,
  resolvePosRoleAccessLevel,
} from '@/lib/commerce/pos-authorization'

describe('commerce pos authorization', () => {
  it('parses manager-approval toggle values', () => {
    assert.equal(isPosManagerApprovalRequired('true'), true)
    assert.equal(isPosManagerApprovalRequired('1'), true)
    assert.equal(isPosManagerApprovalRequired('yes'), true)
    assert.equal(isPosManagerApprovalRequired('on'), true)
    assert.equal(isPosManagerApprovalRequired('false'), false)
    assert.equal(isPosManagerApprovalRequired('0'), false)
    assert.equal(isPosManagerApprovalRequired(undefined), false)
  })

  it('parses role-matrix toggle values', () => {
    assert.equal(isPosRoleMatrixRequired('true'), true)
    assert.equal(isPosRoleMatrixRequired('1'), true)
    assert.equal(isPosRoleMatrixRequired('yes'), true)
    assert.equal(isPosRoleMatrixRequired('on'), true)
    assert.equal(isPosRoleMatrixRequired('false'), false)
    assert.equal(isPosRoleMatrixRequired('0'), false)
    assert.equal(isPosRoleMatrixRequired(undefined), false)
  })

  it('resolves highest access level for a role', () => {
    const managerRoles = new Set(['owner', 'manager'])
    const leadRoles = new Set(['lead', 'manager'])
    const cashierRoles = new Set(['cashier', 'lead'])

    assert.equal(
      resolvePosRoleAccessLevel({
        role: 'manager',
        managerRoles,
        leadRoles,
        cashierRoles,
      }),
      'manager'
    )
    assert.equal(
      resolvePosRoleAccessLevel({
        role: 'lead',
        managerRoles,
        leadRoles,
        cashierRoles,
      }),
      'lead'
    )
    assert.equal(
      resolvePosRoleAccessLevel({
        role: 'cashier',
        managerRoles,
        leadRoles,
        cashierRoles,
      }),
      'cashier'
    )
    assert.equal(
      resolvePosRoleAccessLevel({
        role: 'guest',
        managerRoles,
        leadRoles,
        cashierRoles,
      }),
      null
    )
  })

  it('checks level hierarchy correctly', () => {
    assert.equal(
      canPosAccessLevelSatisfy({ actorLevel: 'manager', requiredLevel: 'cashier' }),
      true
    )
    assert.equal(canPosAccessLevelSatisfy({ actorLevel: 'lead', requiredLevel: 'cashier' }), true)
    assert.equal(canPosAccessLevelSatisfy({ actorLevel: 'cashier', requiredLevel: 'lead' }), false)
    assert.equal(canPosAccessLevelSatisfy({ actorLevel: null, requiredLevel: 'cashier' }), false)
  })
})
