import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRemyDurableMemoryProposal,
  buildRemyNextActionHandoff,
  evaluateDurableMemoryConsentGate,
  getAllowedRemyDiscoveryActionProposals,
} from '@/lib/remy/action-discovery-handoff'
import { evaluateRemyDiscoveryProposalAcceptance } from '@/lib/remy/discovery-proposal-contracts'

const now = new Date('2026-05-13T01:30:08.000Z')

test('Remy maps ready discovery state to proposal-only next actions', () => {
  const handoff = buildRemyNextActionHandoff({
    surface: 'eat',
    authenticated: true,
    remyAvailable: true,
    hasResults: true,
    selectedItems: [
      { id: 'chef-1', type: 'chef', label: 'Chef Nina', href: '/chef/nina' },
      { id: 'restaurant-1', type: 'restaurant', label: 'Sichuan Garden', href: '/eat' },
    ],
    compareCandidateCount: 2,
    filters: {
      craving: 'Sichuan',
      location: 'Miami',
      dateWindow: 'friday',
      partySize: 4,
    },
    readinessConfidence: 0.82,
    now,
  })

  assert.equal(handoff.ready, true)
  assert.equal(handoff.clarification, null)
  assert.ok(handoff.proposals.some((proposal) => proposal.type === 'compare_candidates'))
  assert.ok(handoff.proposals.some((proposal) => proposal.type === 'save_item'))
  assert.ok(handoff.proposals.every((proposal) => proposal.lifecycle === 'created'))
  assert.ok(handoff.proposals.every((proposal) => proposal.analytics.source === 'remy_chat'))
})

test('Remy asks for a missing selection before pushing consequential next actions', () => {
  const handoff = buildRemyNextActionHandoff({
    surface: 'eat',
    authenticated: true,
    remyAvailable: true,
    hasResults: true,
    filters: { craving: 'Thai', location: 'Miami' },
    readinessConfidence: 0.4,
    now,
  })

  assert.equal(handoff.ready, false)
  assert.deepEqual(handoff.proposals, [])
  assert.equal(handoff.missingSignals.includes('selected_item'), true)
  assert.match(handoff.clarification ?? '', /which option/i)
})

test('durable memory handoff requires auth, consent, and confirmation before persistence', () => {
  const unsigned = evaluateDurableMemoryConsentGate({
    authenticated: false,
    proposedValue: 'vegetarian',
  })
  const noConsent = evaluateDurableMemoryConsentGate({
    authenticated: true,
    proposedValue: 'vegetarian',
  })
  const noConfirmation = evaluateDurableMemoryConsentGate({
    authenticated: true,
    durableMemoryConsent: true,
    proposedValue: 'vegetarian',
  })
  const persisted = evaluateDurableMemoryConsentGate({
    authenticated: true,
    durableMemoryConsent: true,
    confirmed: true,
    proposedValue: 'vegetarian',
  })

  assert.equal(unsigned.canPersist, false)
  assert.equal(noConsent.requiresConsent, true)
  assert.equal(noConfirmation.requiresConfirmation, true)
  assert.equal(persisted.canPersist, true)
})

test('durable memory proposal still routes through Remy proposal approval', () => {
  const proposal = buildRemyDurableMemoryProposal({
    label: 'Dietary preference',
    value: 'vegetarian',
    confidence: 0.74,
    now,
  })
  const denied = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'personal',
    durableMemoryConsent: true,
  })
  const approved = evaluateRemyDiscoveryProposalAcceptance(proposal, {
    authenticated: true,
    actorRole: 'client',
    activeMode: 'personal',
    durableMemoryConsent: true,
    confirmed: true,
  })

  assert.equal(proposal.type, 'save_memory')
  assert.equal(denied.requiresConfirmation, true)
  assert.equal(approved.allowed, true)
  assert.equal(approved.executionOwner, 'rail_session')
})

test('allowed Remy action proposal list mirrors eligible discovery actions', () => {
  const types = getAllowedRemyDiscoveryActionProposals({
    surface: 'circle',
    authenticated: true,
    remyAvailable: true,
    circleId: 'circle-1',
    selectedItems: [{ id: 'chef-1', type: 'chef', label: 'Chef Nina' }],
    filters: { craving: 'Italian' },
  })

  assert.ok(types.includes('save_to_circle'))
  assert.ok(types.includes('save_item'))
})
