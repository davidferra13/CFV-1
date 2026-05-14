import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  HUB_CHEF_OPERATION_ROLES,
  HUB_CLIENT_CIRCLE_MANAGER_ROLES,
  HUB_MEMBER_ROLES,
  type HubMemberRole,
} from '@/lib/hub/types'

describe('hub member role contract', () => {
  it('keeps the TypeScript role contract aligned with the database constraint', () => {
    const expectedRoles = ['owner', 'admin', 'chef', 'host', 'member', 'viewer', 'delegate']

    assert.deepEqual([...HUB_MEMBER_ROLES], expectedRoles)

    const hostRole: HubMemberRole = 'host'
    const delegateRole: HubMemberRole = 'delegate'

    assert.equal(hostRole, 'host')
    assert.equal(delegateRole, 'delegate')
  })

  it('keeps client host controls separate from chef-only operations', () => {
    assert.deepEqual([...HUB_CLIENT_CIRCLE_MANAGER_ROLES], ['owner', 'admin', 'host'])
    assert.deepEqual([...HUB_CHEF_OPERATION_ROLES], ['chef'])

    assert.equal(HUB_CLIENT_CIRCLE_MANAGER_ROLES.includes('host'), true)
    assert.equal(HUB_CLIENT_CIRCLE_MANAGER_ROLES.includes('chef' as never), false)
    assert.equal(HUB_CHEF_OPERATION_ROLES.includes('host' as never), false)
  })
})
