import test from 'node:test'
import assert from 'node:assert/strict'

import { createPreferenceSignalEntry } from '@/lib/discovery/preference-contract'
import {
  buildDecisionTimeline,
  createDecisionAuditEvent,
  summarizeDecisionPath,
} from '@/lib/remy/audit-trail-contracts'
import {
  applyMemoryConsent,
  buildPostDecisionFeedbackMemory,
  createMemoryProposal,
  summarizeAllowedGroupMemory,
} from '@/lib/remy/memory-consent-contracts'

test('memory proposals require explicit consent and preserve personal versus circle scope', () => {
  const proposal = createMemoryProposal({
    scope: 'circle',
    statement: 'We avoid loud places',
    source: 'explicit_remember_request',
  })

  assert.equal(proposal.requiresConfirmation, true)
  assert.equal(proposal.status, 'pending_confirmation')
  assert.equal(proposal.visibleToCircle, true)

  const declined = applyMemoryConsent(proposal, 'decline')
  assert.equal(declined.status, 'declined')

  const feedback = buildPostDecisionFeedbackMemory({
    decisionLabel: 'Reliable Bistro',
    outcome: 'win',
    reasons: ['quiet enough', 'budget fit'],
    scope: 'personal',
  })
  assert.equal(feedback.scope, 'personal')
  assert.match(feedback.statement, /quiet enough/)
})

test('group memory summary omits private or non-consented preference signals', () => {
  const shared = createPreferenceSignalEntry({
    id: 'shared-italian',
    ownerId: 'user-1',
    domain: 'discovery',
    source: 'user_entered',
    rawValue: 'Italian',
    kind: 'cuisine',
    polarity: 'like',
    shareCategory: 'household_visible',
    consent: { profileUse: true },
  })
  const privateSignal = createPreferenceSignalEntry({
    id: 'private-sushi',
    ownerId: 'user-1',
    domain: 'discovery',
    source: 'user_entered',
    rawValue: 'Sushi',
    kind: 'cuisine',
    polarity: 'dislike',
    shareCategory: 'private',
    consent: { profileUse: true },
  })

  const summary = summarizeAllowedGroupMemory([shared, privateSignal])

  assert.deepEqual(summary.labels, ['Italian'])
  assert.equal(summary.redactedPrivateSignalCount, 1)
  assert.deepEqual(summary.sourceSignalIds, ['shared-italian'])
})

test('decision audit timeline filters private circle facts for host and member views', () => {
  const events = [
    createDecisionAuditEvent({
      id: 'start',
      type: 'chat_filter_inferred',
      label: 'Italian for Friday',
      visibility: 'public_to_circle',
      mode: 'circle',
      at: '2026-05-13T01:00:00.000Z',
    }),
    createDecisionAuditEvent({
      id: 'private',
      type: 'proposal_rejected',
      label: 'Private dislike',
      actorId: 'member-1',
      visibility: 'private',
      mode: 'circle',
      at: '2026-05-13T01:01:00.000Z',
    }),
    createDecisionAuditEvent({
      id: 'host',
      type: 'veto_added',
      label: 'Dietary blocker',
      visibility: 'host_only',
      mode: 'circle',
      at: '2026-05-13T01:02:00.000Z',
    }),
    createDecisionAuditEvent({
      id: 'final',
      type: 'final_pick',
      label: 'Reliable Bistro',
      visibility: 'public_to_circle',
      mode: 'circle',
      at: '2026-05-13T01:03:00.000Z',
    }),
  ]

  const memberTimeline = buildDecisionTimeline({
    events,
    viewer: { actorId: 'member-2', mode: 'circle', isHost: false },
  })
  assert.deepEqual(
    memberTimeline.map((item) => item.id),
    ['start', 'final']
  )

  const hostTimeline = buildDecisionTimeline({
    events,
    viewer: { actorId: 'host-1', mode: 'circle', isHost: true },
  })
  assert.deepEqual(
    hostTimeline.map((item) => item.id),
    ['start', 'host', 'final']
  )

  const summary = summarizeDecisionPath({
    events,
    viewer: { actorId: 'host-1', mode: 'circle', isHost: true },
  })
  assert.match(summary, /ended with Final pick: Reliable Bistro/)
})
