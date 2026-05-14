import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRemyDiscoveryRuntimeResponse } from '@/lib/remy/discovery-runtime'

const now = new Date('2026-05-13T04:30:00.000Z')

test('Remy discovery runtime converts chat into reversible rail proposals', () => {
  const response = buildRemyDiscoveryRuntimeResponse({
    message: 'Show me Sichuan for 8 Friday within 20 minutes',
    target: { surface: 'eat', mode: 'personal', sessionId: 'session-1' },
    actor: { authenticated: true, actorRole: 'client' },
    now,
  })

  assert.equal(response.policy.executionOwner, 'visible_discovery_rail')
  assert.equal(response.filters.cuisines[0], 'sichuan')
  assert.equal(response.filters.partySize, 8)
  assert.equal(response.filters.dateWindow, 'friday')
  assert.equal(response.filters.radiusMiles, 10)
  assert.ok(response.proposals.length > 0)
  assert.equal(response.proposals[0].durability, 'temporary')
  assert.equal(response.proposalEnvelopes[0].acceptance.executionOwner, 'rail_session')
})

test('Remy discovery runtime keeps durable memory proposal gated', () => {
  const response = buildRemyDiscoveryRuntimeResponse({
    message: 'remember we avoid loud places',
    target: { surface: 'eat', mode: 'circle', sessionId: 'session-1', circleId: 'circle-1' },
    actor: {
      authenticated: true,
      actorRole: 'client',
      circleRole: 'member',
      hasCircleMembership: true,
      canManageCircle: false,
      durableMemoryConsent: false,
      confirmed: false,
    },
    now,
  })

  const memoryEnvelope = response.proposalEnvelopes.find(
    (envelope) => envelope.proposal.type === 'save_memory'
  )

  assert.ok(memoryEnvelope)
  assert.equal(memoryEnvelope.proposal.confirmation.required, true)
  assert.ok(memoryEnvelope.proposal.requiredPermissions.includes('durable_memory_consent'))
  assert.equal(memoryEnvelope.acceptance.allowed, false)
  assert.equal(memoryEnvelope.acceptance.requiresConsent, true)
})

test('Remy discovery runtime proposes anti-loop recovery without relaxing locked constraints', () => {
  const response = buildRemyDiscoveryRuntimeResponse({
    message: 'change strategy',
    loop: {
      dwellSeconds: 240,
      repeatedFilterCount: 4,
      resultCount: 0,
      diversityScore: 0.2,
      now: now.toISOString(),
      lockedConstraints: [
        {
          field: 'distance',
          value: '10 miles',
          locked: true,
          source: 'user',
          reusable: false,
        },
      ],
    },
    now,
  })

  assert.ok(response.recovery?.stuck)
  assert.equal(response.recovery.preservesLockedConstraints, true)
  assert.ok(!response.recovery.actions.includes('widen_radius'))
  assert.ok(response.proposals.some((proposal) => proposal.analytics.label.includes('recovery')))
})

test('Remy discovery runtime wraps source research as approval-only external proposals', () => {
  const response = buildRemyDiscoveryRuntimeResponse({
    message: 'is this current enough to shortlist?',
    sourceCandidates: [
      {
        id: 'restaurant-1',
        label: 'North Fork Table',
        menu: null,
        fieldConfidence: {
          operator_identity: { tier: 'low', canSupportStrongClaim: false },
        },
      },
    ],
    actor: { authenticated: true, confirmed: false },
    now,
  })

  const researchEnvelope = response.proposalEnvelopes.find(
    (envelope) => envelope.proposal.type === 'suggest_research'
  )

  assert.ok(researchEnvelope)
  assert.equal(researchEnvelope.proposal.durability, 'external')
  assert.equal(researchEnvelope.proposal.confirmation.required, true)
  assert.equal(researchEnvelope.acceptance.requiresConfirmation, true)
  assert.equal(response.policy.externalActions, 'proposal_only')
})
