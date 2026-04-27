import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isClosureActive,
  blocksNewEvents,
  blocksAutomatedOutreach,
  blocksPublicBooking,
  blocksPortalAccess,
  allowsActiveEventMessaging,
  getActiveEventPolicy,
} from '../../lib/clients/relationship-closure'
import type { ClientRelationshipClosure } from '../../lib/clients/relationship-closure-types'

function makeClosure(
  overrides: Partial<ClientRelationshipClosure> = {}
): ClientRelationshipClosure {
  return {
    id: 'test-id',
    tenant_id: 'tenant-1',
    client_id: 'client-1',
    closure_mode: 'closed',
    reason_category: 'client_requested',
    internal_notes: null,
    client_message: null,
    block_new_events: true,
    block_public_booking: true,
    block_automated_outreach: true,
    revoke_portal_access: false,
    allow_active_event_messages_until: null,
    active_event_policy: 'review_each_event',
    created_by: 'chef-1',
    created_at: '2026-04-27T00:00:00Z',
    reopened_by: null,
    reopened_at: null,
    reopen_reason: null,
    metadata: {},
    ...overrides,
  }
}

describe('isClosureActive', () => {
  it('returns true when reopened_at is null', () => {
    assert.equal(isClosureActive(makeClosure()), true)
  })

  it('returns false when reopened_at is set', () => {
    assert.equal(isClosureActive(makeClosure({ reopened_at: '2026-04-28T00:00:00Z' })), false)
  })
})

describe('blocksNewEvents', () => {
  it('blocks when active and block_new_events is true', () => {
    assert.equal(blocksNewEvents(makeClosure({ block_new_events: true })), true)
  })

  it('does not block when active but block_new_events is false', () => {
    assert.equal(blocksNewEvents(makeClosure({ block_new_events: false })), false)
  })

  it('does not block when reopened', () => {
    assert.equal(
      blocksNewEvents(makeClosure({ block_new_events: true, reopened_at: '2026-04-28T00:00:00Z' })),
      false
    )
  })
})

describe('blocksAutomatedOutreach', () => {
  it('blocks when active and flag is true', () => {
    assert.equal(blocksAutomatedOutreach(makeClosure({ block_automated_outreach: true })), true)
  })

  it('does not block when flag is false', () => {
    assert.equal(blocksAutomatedOutreach(makeClosure({ block_automated_outreach: false })), false)
  })

  it('does not block when reopened', () => {
    assert.equal(
      blocksAutomatedOutreach(
        makeClosure({ block_automated_outreach: true, reopened_at: '2026-04-28T00:00:00Z' })
      ),
      false
    )
  })
})

describe('blocksPublicBooking', () => {
  it('blocks when active and flag is true', () => {
    assert.equal(blocksPublicBooking(makeClosure({ block_public_booking: true })), true)
  })

  it('does not block when flag is false', () => {
    assert.equal(blocksPublicBooking(makeClosure({ block_public_booking: false })), false)
  })

  it('does not block when reopened', () => {
    assert.equal(
      blocksPublicBooking(
        makeClosure({ block_public_booking: true, reopened_at: '2026-04-28T00:00:00Z' })
      ),
      false
    )
  })
})

describe('blocksPortalAccess', () => {
  it('does not block by default (revoke_portal_access defaults to false)', () => {
    assert.equal(blocksPortalAccess(makeClosure()), false)
  })

  it('blocks when active and revoke_portal_access is true', () => {
    assert.equal(blocksPortalAccess(makeClosure({ revoke_portal_access: true })), true)
  })

  it('does not block when reopened', () => {
    assert.equal(
      blocksPortalAccess(
        makeClosure({ revoke_portal_access: true, reopened_at: '2026-04-28T00:00:00Z' })
      ),
      false
    )
  })
})

describe('allowsActiveEventMessaging', () => {
  it('blocks messaging when no window is set (conservative default)', () => {
    assert.equal(
      allowsActiveEventMessaging(makeClosure({ allow_active_event_messages_until: null })),
      false
    )
  })

  it('allows messaging when window is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    assert.equal(
      allowsActiveEventMessaging(makeClosure({ allow_active_event_messages_until: futureDate })),
      true
    )
  })

  it('blocks messaging when window has expired', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString()
    assert.equal(
      allowsActiveEventMessaging(makeClosure({ allow_active_event_messages_until: pastDate })),
      false
    )
  })

  it('allows messaging when closure is reopened (regardless of window)', () => {
    assert.equal(
      allowsActiveEventMessaging(
        makeClosure({
          allow_active_event_messages_until: null,
          reopened_at: '2026-04-28T00:00:00Z',
        })
      ),
      true
    )
  })
})

describe('getActiveEventPolicy', () => {
  it('returns the policy when closure is active', () => {
    assert.equal(
      getActiveEventPolicy(makeClosure({ active_event_policy: 'cancel_active_events' })),
      'cancel_active_events'
    )
  })

  it('returns null when closure is reopened', () => {
    assert.equal(getActiveEventPolicy(makeClosure({ reopened_at: '2026-04-28T00:00:00Z' })), null)
  })

  it('defaults to review_each_event', () => {
    assert.equal(getActiveEventPolicy(makeClosure()), 'review_each_event')
  })
})

describe('closure modes behave correctly', () => {
  it('transitioning mode: blocks events but allows messaging window', () => {
    const closure = makeClosure({
      closure_mode: 'transitioning',
      block_new_events: true,
      allow_active_event_messages_until: new Date(Date.now() + 86400000 * 30).toISOString(),
      active_event_policy: 'continue_active_events',
    })
    assert.equal(blocksNewEvents(closure), true)
    assert.equal(allowsActiveEventMessaging(closure), true)
    assert.equal(getActiveEventPolicy(closure), 'continue_active_events')
  })

  it('do_not_book mode: blocks everything', () => {
    const closure = makeClosure({
      closure_mode: 'do_not_book',
      block_new_events: true,
      block_public_booking: true,
      block_automated_outreach: true,
      revoke_portal_access: true,
    })
    assert.equal(blocksNewEvents(closure), true)
    assert.equal(blocksPublicBooking(closure), true)
    assert.equal(blocksAutomatedOutreach(closure), true)
    assert.equal(blocksPortalAccess(closure), true)
  })

  it('legal_hold mode: blocks everything, no messaging', () => {
    const closure = makeClosure({
      closure_mode: 'legal_hold',
      block_new_events: true,
      block_public_booking: true,
      block_automated_outreach: true,
      revoke_portal_access: true,
      allow_active_event_messages_until: null,
      active_event_policy: 'review_each_event',
    })
    assert.equal(blocksNewEvents(closure), true)
    assert.equal(blocksPublicBooking(closure), true)
    assert.equal(blocksAutomatedOutreach(closure), true)
    assert.equal(blocksPortalAccess(closure), true)
    assert.equal(allowsActiveEventMessaging(closure), false)
  })

  it('closed mode with gentle defaults: blocks new work, keeps portal open', () => {
    const closure = makeClosure({
      closure_mode: 'closed',
      reason_category: 'moving_away',
      block_new_events: true,
      block_public_booking: true,
      block_automated_outreach: true,
      revoke_portal_access: false,
    })
    assert.equal(blocksNewEvents(closure), true)
    assert.equal(blocksPublicBooking(closure), true)
    assert.equal(blocksAutomatedOutreach(closure), true)
    assert.equal(blocksPortalAccess(closure), false)
  })
})
