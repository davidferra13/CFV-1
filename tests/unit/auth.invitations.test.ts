/**
 * Unit tests for invitation flow logic extracted from lib/auth/invitations.ts.
 *
 * Covers token lookup result handling, expiry checks, and mutation error behavior.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type InvitationRecord = {
  id: string
  email: string
  tenant_id: string
  token: string
  used_at: string | null
  expires_at: string
}

function resolveInvitationLookup(
  invitation: InvitationRecord | null,
  error: unknown
): InvitationRecord | null {
  if (error || !invitation) return null
  return invitation
}

function isInvitationActive(invitation: InvitationRecord, nowIso: string): boolean {
  return invitation.used_at === null && invitation.expires_at > nowIso
}

function assertInvitationEmailMatch(invitationEmail: string, signupEmail: string): void {
  if (invitationEmail.toLowerCase() !== signupEmail.toLowerCase()) {
    throw new Error('Email does not match invitation')
  }
}

function assertMarkInvitationUsedResult(error: unknown): { success: true } {
  if (error) {
    throw new Error('Failed to mark invitation as used')
  }
  return { success: true }
}

function assertRevokeInvitationResult(error: unknown): { success: true } {
  if (error) {
    throw new Error('Failed to revoke invitation')
  }
  return { success: true }
}

describe('auth/invitations - lookup and validity', () => {
  const now = '2026-02-27T00:00:00.000Z'

  it('returns null when lookup has an error', () => {
    const invitation: InvitationRecord = {
      id: 'i1',
      email: 'client@example.com',
      tenant_id: 't1',
      token: 'tok',
      used_at: null,
      expires_at: '2026-03-01T00:00:00.000Z',
    }

    assert.equal(resolveInvitationLookup(invitation, { code: 'PGRST116' }), null)
  })

  it('returns null when invitation is missing', () => {
    assert.equal(resolveInvitationLookup(null, null), null)
  })

  it('returns invitation when found with no error', () => {
    const invitation: InvitationRecord = {
      id: 'i2',
      email: 'client@example.com',
      tenant_id: 't2',
      token: 'tok2',
      used_at: null,
      expires_at: '2026-03-01T00:00:00.000Z',
    }
    assert.equal(resolveInvitationLookup(invitation, null)?.id, 'i2')
  })

  it('treats unused + unexpired invitation as active', () => {
    const invitation: InvitationRecord = {
      id: 'i3',
      email: 'client@example.com',
      tenant_id: 't3',
      token: 'tok3',
      used_at: null,
      expires_at: '2026-03-05T00:00:00.000Z',
    }
    assert.equal(isInvitationActive(invitation, now), true)
  })

  it('treats used invitation as inactive', () => {
    const invitation: InvitationRecord = {
      id: 'i4',
      email: 'client@example.com',
      tenant_id: 't4',
      token: 'tok4',
      used_at: '2026-02-20T00:00:00.000Z',
      expires_at: '2026-03-05T00:00:00.000Z',
    }
    assert.equal(isInvitationActive(invitation, now), false)
  })

  it('treats expired invitation as inactive', () => {
    const invitation: InvitationRecord = {
      id: 'i5',
      email: 'client@example.com',
      tenant_id: 't5',
      token: 'tok5',
      used_at: null,
      expires_at: '2026-02-01T00:00:00.000Z',
    }
    assert.equal(isInvitationActive(invitation, now), false)
  })
})

describe('auth/invitations - invitation email checks', () => {
  it('allows case-insensitive email match', () => {
    assert.doesNotThrow(() =>
      assertInvitationEmailMatch('Client@Example.com', 'client@example.com')
    )
  })

  it('throws when signup email does not match invitation', () => {
    assert.throws(
      () => assertInvitationEmailMatch('a@example.com', 'b@example.com'),
      /Email does not match invitation/
    )
  })
})

describe('auth/invitations - mutation result handling', () => {
  it('returns success when mark-used update succeeds', () => {
    assert.deepEqual(assertMarkInvitationUsedResult(null), { success: true })
  })

  it('throws expected error when mark-used update fails', () => {
    assert.throws(
      () => assertMarkInvitationUsedResult(new Error('db error')),
      /Failed to mark invitation as used/
    )
  })

  it('returns success when revoke update succeeds', () => {
    assert.deepEqual(assertRevokeInvitationResult(null), { success: true })
  })

  it('throws expected error when revoke update fails', () => {
    assert.throws(
      () => assertRevokeInvitationResult(new Error('db error')),
      /Failed to revoke invitation/
    )
  })
})
