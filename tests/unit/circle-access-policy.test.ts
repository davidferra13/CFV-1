import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  canAssignCircleMemberRole,
  canInvite,
  canManageCircleMember,
  canPost,
  canSeeCircle,
  canSeeLinkedObject,
  defaultCircleMemberPermissions,
  describeCircleAccess,
  type CircleAccessContext,
} from '@/lib/hub/circle-access-policy'

const privateCircle: CircleAccessContext = {
  group: {
    visibility: 'private',
    tenant_id: 'tenant-1',
    created_by_profile_id: 'profile-owner',
    allow_anonymous_posts: false,
    allow_member_invites: false,
    group_type: 'circle',
  },
}

describe('circle access policy', () => {
  it('allows explicit members and denies non-member viewers on private circles', () => {
    assert.equal(canSeeCircle({ role: 'member', isMember: true }, privateCircle), true)
    assert.equal(canSeeCircle({ role: 'viewer' }, privateCircle), false)
  })

  it('keeps posting and invite rights role/member scoped', () => {
    assert.equal(
      canPost(
        {
          role: 'member',
          member: { role: 'member', can_post: true, can_invite: false, can_pin: false },
        },
        privateCircle
      ),
      true
    )
    assert.equal(canInvite({ role: 'member', isMember: true }, privateCircle), false)
    assert.equal(canInvite({ role: 'host', isMember: true }, privateCircle), true)
  })

  it('shapes linked-object visibility without leaking chef-only context', () => {
    const context: CircleAccessContext = {
      ...privateCircle,
      linkedObject: { type: 'event', sharedWithCircle: true, chefOnly: true },
    }

    assert.equal(canSeeLinkedObject({ role: 'chef', isMember: true }, context), true)
    assert.equal(canSeeLinkedObject({ role: 'member', isMember: true }, context), false)
    assert.equal(describeCircleAccess({ role: 'admin' }, context).canSeeLinkedObject, true)
  })

  it('centralizes server-side member management decisions', () => {
    const host = { role: 'host' as const, isMember: true }
    const admin = { role: 'admin' as const, isMember: true }
    const chef = { role: 'chef' as const, isMember: true }

    assert.equal(canManageCircleMember(host, privateCircle, 'member'), true)
    assert.equal(canManageCircleMember(host, privateCircle, 'admin'), false)
    assert.equal(canAssignCircleMemberRole(host, privateCircle, 'member', 'viewer'), true)
    assert.equal(canAssignCircleMemberRole(host, privateCircle, 'member', 'admin'), false)
    assert.equal(canManageCircleMember(admin, privateCircle, 'admin'), false)
    assert.equal(canAssignCircleMemberRole(chef, privateCircle, 'member', 'admin'), true)
    assert.deepEqual(defaultCircleMemberPermissions('viewer'), {
      can_post: false,
      can_invite: false,
      can_pin: false,
    })
  })
})
