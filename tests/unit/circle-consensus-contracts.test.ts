import test from 'node:test'
import assert from 'node:assert/strict'

import type { DiscoveryCompareCandidate } from '@/lib/discovery/compare-contracts'
import { createPreferenceSignalEntry } from '@/lib/discovery/preference-contract'
import {
  aggregateCircleSignals,
  circleConsensusSignalsFromPreferenceLedger,
  evaluateCircleDecisionReadiness,
  scoreCircleConsensus,
  type CircleConsensusSignal,
} from '@/lib/hub/circle-consensus-contracts'
import type { CircleDiscoveryMemberAction } from '@/lib/hub/circle-discovery-contracts'

const candidates: DiscoveryCompareCandidate[] = [
  {
    id: 'restaurant-1',
    type: 'restaurant',
    label: 'Italian Supper Club',
    href: '/eat/italian-supper',
    cuisineTags: ['Italian'],
    priceLevel: 'moderate',
    available: true,
    confidence: 0.85,
    whyRecommended: ['Works for pasta cravings'],
  },
  {
    id: 'recipe-1',
    type: 'recipe',
    label: 'Sushi Night At Home',
    href: '/recipes/sushi-night',
    cuisineTags: ['Sushi'],
    priceLevel: 'budget',
    available: true,
    confidence: 0.75,
  },
]

test('signal aggregation exposes only aggregate counts and redacts private signal identity', () => {
  const signals: CircleConsensusSignal[] = [
    {
      memberId: 'alice',
      label: 'Italian',
      polarity: 'like',
      visibility: 'explicit_shared',
      sourceSignalId: 'signal-public-1',
    },
    {
      memberId: 'ben',
      label: 'Italian',
      polarity: 'like',
      visibility: 'aggregate_allowed',
      sourceSignalId: 'signal-public-2',
    },
    {
      memberId: 'cara',
      label: 'Omakase',
      polarity: 'like',
      visibility: 'private',
      sourceSignalId: 'signal-private-1',
    },
  ]

  const aggregation = aggregateCircleSignals(signals)
  assert.deepEqual(aggregation.aggregateSignals, [
    {
      label: 'Italian',
      polarity: 'like',
      memberCount: 2,
      averageStrength: 1,
      visibility: 'aggregate',
    },
  ])
  assert.equal(aggregation.redactedPrivateSignalCount, 1)
  assert.deepEqual(aggregation.memberIdsIncluded, [])
  assert.deepEqual(aggregation.sourceSignalIdsIncluded, [])
  assert.equal(JSON.stringify(aggregation).includes('cara'), false)
  assert.equal(JSON.stringify(aggregation).includes('signal-private-1'), false)
  assert.equal(JSON.stringify(aggregation).includes('Omakase'), false)
})

test('consensus scoring ranks shared overlap while honoring vetoes and eat-out mode', () => {
  const actions: CircleDiscoveryMemberAction[] = [
    {
      actorId: 'alice',
      actorRole: 'member',
      sessionId: 'session-1',
      actionType: 'like_candidate',
      candidateId: 'restaurant-1',
      createdAt: '2026-05-13T01:00:00.000Z',
      visibleToCircle: true,
    },
    {
      actorId: 'ben',
      actorRole: 'member',
      sessionId: 'session-1',
      actionType: 'shortlist_candidate',
      candidateId: 'restaurant-1',
      createdAt: '2026-05-13T01:00:00.000Z',
      visibleToCircle: true,
    },
  ]

  const signals: CircleConsensusSignal[] = [
    { memberId: 'alice', label: 'Italian', polarity: 'like', visibility: 'explicit_shared' },
    { memberId: 'ben', label: 'Italian', polarity: 'like', visibility: 'aggregate_allowed' },
    { memberId: 'alice', label: 'Sushi', polarity: 'never_show', visibility: 'explicit_shared' },
  ]

  const consensus = scoreCircleConsensus({
    candidates,
    actions,
    signals,
    compareContext: { desiredCuisine: 'Italian', budget: 'moderate' },
    mode: 'eat_out',
  })

  assert.equal(consensus.topCandidate?.id, 'restaurant-1')
  assert.equal(consensus.candidates[0].matchedAggregateLabels.includes('Italian'), true)
  assert.deepEqual(consensus.candidates[1].hardBlockerLabels, ['Sushi'])
  assert.equal(consensus.candidates[1].fulfillmentFit, 'weak')
})

test('decision readiness reports missing votes blockers and strong winners', () => {
  const blocked = scoreCircleConsensus({
    candidates: [candidates[0]],
    signals: [
      {
        memberId: 'alice',
        label: 'Italian',
        polarity: 'allergy',
        visibility: 'explicit_shared',
      },
    ],
  })
  const blockedReadiness = evaluateCircleDecisionReadiness({
    consensus: blocked,
    memberCount: 2,
    votedMemberIds: ['alice', 'ben'],
  })
  assert.equal(blockedReadiness.status, 'diet_conflict_unresolved')
  assert.equal(blockedReadiness.readyToFinalize, false)

  const needsVotes = scoreCircleConsensus({
    candidates,
    signals: [
      { memberId: 'alice', label: 'Italian', polarity: 'like', visibility: 'explicit_shared' },
    ],
  })
  const voteReadiness = evaluateCircleDecisionReadiness({
    consensus: needsVotes,
    memberCount: 3,
    votedMemberIds: ['alice'],
  })
  assert.equal(voteReadiness.status, 'needs_more_votes')
  assert.equal(voteReadiness.label, 'Needs 1 more vote')

  const strong = scoreCircleConsensus({
    candidates,
    actions: [
      {
        actorId: 'alice',
        actorRole: 'member',
        sessionId: 'session-1',
        actionType: 'like_candidate',
        candidateId: 'restaurant-1',
        createdAt: '2026-05-13T01:00:00.000Z',
        visibleToCircle: true,
      },
      {
        actorId: 'ben',
        actorRole: 'member',
        sessionId: 'session-1',
        actionType: 'like_candidate',
        candidateId: 'restaurant-1',
        createdAt: '2026-05-13T01:00:00.000Z',
        visibleToCircle: true,
      },
    ],
    signals: [
      { memberId: 'alice', label: 'Italian', polarity: 'like', visibility: 'explicit_shared' },
      { memberId: 'ben', label: 'Italian', polarity: 'like', visibility: 'aggregate_allowed' },
    ],
    compareContext: { desiredCuisine: 'Italian', budget: 'moderate' },
    mode: 'eat_out',
  })
  const strongReadiness = evaluateCircleDecisionReadiness({
    consensus: strong,
    memberCount: 2,
    votedMemberIds: ['alice', 'ben'],
  })
  assert.equal(strongReadiness.status, 'strong_winner')
  assert.equal(strongReadiness.readyToFinalize, true)
})

test('preference ledger mapping keeps private member signals out of consensus aggregation', () => {
  const ledger = [
    createPreferenceSignalEntry({
      id: 'ledger-public',
      ownerId: 'owner-1',
      scope: { level: 'guest', guestId: 'guest-public' },
      domain: 'discovery',
      source: 'user_entered',
      rawValue: 'Thai',
      polarity: 'like',
      shareCategory: 'event_visible',
    }),
    createPreferenceSignalEntry({
      id: 'ledger-private',
      ownerId: 'owner-1',
      scope: { level: 'guest', guestId: 'guest-private' },
      domain: 'discovery',
      source: 'user_entered',
      rawValue: 'Omakase',
      polarity: 'like',
      shareCategory: 'private',
    }),
  ]

  const aggregation = aggregateCircleSignals(circleConsensusSignalsFromPreferenceLedger(ledger))
  assert.equal(aggregation.redactedPrivateSignalCount, 1)
  assert.equal(JSON.stringify(aggregation).includes('guest-private'), false)
  assert.equal(JSON.stringify(aggregation).includes('ledger-private'), false)
  assert.equal(JSON.stringify(aggregation).includes('Omakase'), false)
})
