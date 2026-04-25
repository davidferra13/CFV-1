import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCircleInviteShareMessage,
  createHubInviteAttributionToken,
  deriveInviteCopyRole,
  verifyHubInviteAttributionToken,
} from '@/lib/hub/invite-links'

describe('hub invite links', () => {
  it('creates and verifies a group-bound attribution token', () => {
    process.env.HUB_INVITE_TOKEN_SECRET = 'hub-invite-test-secret'

    const token = createHubInviteAttributionToken({
      groupToken: 'circle-abc',
      inviterProfileId: 'profile-123',
    })

    assert.deepEqual(
      verifyHubInviteAttributionToken({
        groupToken: 'circle-abc',
        inviteToken: token,
      }),
      { inviterProfileId: 'profile-123' }
    )
  })

  it('rejects invite tokens for a different group or with a bad signature', () => {
    process.env.HUB_INVITE_TOKEN_SECRET = 'hub-invite-test-secret'

    const token = createHubInviteAttributionToken({
      groupToken: 'circle-abc',
      inviterProfileId: 'profile-123',
    })

    assert.equal(
      verifyHubInviteAttributionToken({
        groupToken: 'circle-other',
        inviteToken: token,
      }),
      null
    )

    assert.equal(
      verifyHubInviteAttributionToken({
        groupToken: 'circle-abc',
        inviteToken: `${token}tampered`,
      }),
      null
    )
  })

  it('derives chef, client, and member invite copy from the available identity signal', () => {
    assert.equal(
      deriveInviteCopyRole({
        membershipRole: 'chef',
      }),
      'chef'
    )

    assert.equal(
      deriveInviteCopyRole({
        membershipRole: 'owner',
        clientId: 'client-123',
      }),
      'client'
    )

    assert.equal(
      deriveInviteCopyRole({
        membershipRole: 'owner',
        authUserId: 'auth-123',
      }),
      'chef'
    )

    assert.equal(
      deriveInviteCopyRole({
        membershipRole: 'member',
      }),
      'member'
    )
  })

  it('keeps chef, client, and member share text distinct', () => {
    const inviteUrl = 'https://app.cheflowhq.com/hub/join/circle-abc'

    const chefMessage = buildCircleInviteShareMessage({
      copyRole: 'chef',
      occasion: 'Rooftop Dinner',
      inviteUrl,
    })
    const clientMessage = buildCircleInviteShareMessage({
      copyRole: 'client',
      occasion: 'Rooftop Dinner',
      inviteUrl,
    })
    const memberMessage = buildCircleInviteShareMessage({
      copyRole: 'member',
      occasion: 'Rooftop Dinner',
      inviteUrl,
    })

    assert.match(chefMessage, /^I set up our Dinner Circle/)
    assert.match(clientMessage, /^I started a Dinner Circle/)
    assert.match(memberMessage, /^Join our Dinner Circle/)
    assert.notEqual(chefMessage, clientMessage)
    assert.notEqual(clientMessage, memberMessage)
  })
})
