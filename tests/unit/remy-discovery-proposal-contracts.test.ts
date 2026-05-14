import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRemyProposalAnalyticsEvent,
  createRemyDiscoveryProposal,
  evaluateRemyDiscoveryProposalAcceptance,
  remyProposalLeavesRailUnchanged,
  transitionRemyDiscoveryProposal,
} from '@/lib/remy/discovery-proposal-contracts'

const now = new Date('2026-05-13T01:30:08.000Z')

test('Remy proposal contract gates durable memory behind consent and confirmation', () => {
  const proposal = createRemyDiscoveryProposal({
    id: 'proposal-memory-1',
    type: 'save_memory',
    target: { surface: 'remy', mode: 'personal', sessionId: 'session-1' },
    confidence: 0.8,
    reason: 'Remember vegetarian preference.',
    backingSignals: ['chat:good for vegetarians'],
    durability: 'durable_user',
    payload: {
      memorySignal: { label: 'Dietary preference', value: 'vegetarian', scope: 'account' },
    },
    errorFallback: 'Keep it as a temporary filter.',
    now,
  })

  assert.equal(proposal.confirmation.required, true)
  assert.ok(proposal.requiredPermissions.includes('durable_memory_consent'))
  assert.ok(proposal.requiredPermissions.includes('authenticated_user'))

  const noConsent = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'personal',
    confirmed: true,
    durableMemoryConsent: false,
  })
  const noConfirmation = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'personal',
    durableMemoryConsent: true,
  })
  const accepted = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'personal',
    confirmed: true,
    durableMemoryConsent: true,
  })

  assert.equal(noConsent.requiresConsent, true)
  assert.equal(noConfirmation.requiresConfirmation, true)
  assert.equal(accepted.allowed, true)
  assert.equal(accepted.executionOwner, 'rail_session')
})

test('Remy proposal lifecycle keeps rejected and ignored proposals non-mutating', () => {
  const proposal = createRemyDiscoveryProposal({
    id: 'proposal-filter-1',
    type: 'add_filter',
    target: { surface: 'eat', mode: 'personal', sessionId: 'session-1' },
    confidence: 0.72,
    reason: 'Apply Sichuan filter.',
    backingSignals: ['cuisine:sichuan'],
    durability: 'temporary',
    payload: { filters: { cuisines: ['sichuan'] } },
    errorFallback: 'Use manual filters.',
    now,
  })

  const shown = transitionRemyDiscoveryProposal(proposal, 'shown', now)
  const rejected = transitionRemyDiscoveryProposal(shown, 'rejected', now)
  const analytics = buildRemyProposalAnalyticsEvent(rejected, 'rejected')

  assert.equal(rejected.lifecycle, 'rejected')
  assert.equal(remyProposalLeavesRailUnchanged(rejected.lifecycle), true)
  assert.equal(analytics.proposalType, 'add_filter')
  assert.equal(analytics.outcome, 'rejected')
  assert.throws(() => transitionRemyDiscoveryProposal(rejected, 'accepted', now))
})

test('circle proposals require active circle context and manager approval when shared state changes', () => {
  const proposal = createRemyDiscoveryProposal({
    id: 'proposal-circle-1',
    type: 'save_to_circle',
    target: {
      surface: 'circle',
      mode: 'circle',
      sessionId: 'session-1',
      circleId: 'circle-1',
    },
    confidence: 0.78,
    reason: 'Save selected dinner option to the circle.',
    backingSignals: ['next-action:share_to_circle'],
    durability: 'durable_circle',
    payload: {
      selectedItems: [{ type: 'saved', label: 'Nina Dinner', value: 'chef-1', href: '/eat' }],
    },
    errorFallback: 'Keep it in personal discovery.',
    now,
  })

  const personalMode = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'personal',
    confirmed: true,
  })
  const memberWithoutManager = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'circle',
    circleId: 'circle-1',
    confirmed: true,
  })
  const allowed = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'circle',
    circleId: 'circle-1',
    canManageCircle: true,
    confirmed: true,
  })

  assert.equal(personalMode.allowed, false)
  assert.equal(memberWithoutManager.allowed, false)
  assert.equal(allowed.allowed, true)
})
