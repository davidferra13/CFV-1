import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildScenarioOverlay,
  decideRemyDiscoveryContext,
  getOccasionWeights,
  negotiateSharedPreferences,
  nextTasteInterviewStep,
  parseConstraintIntent,
  proposeGroupDecisionMechanic,
  resolveConstraints,
  type SharedPreferenceSignal,
} from '@/lib/remy/group-decision-contracts'
import type { DiscoveryCompareCandidate } from '@/lib/discovery/compare-contracts'

test('personal versus circle guardrails require membership and confirmation for shared state', () => {
  const personal = decideRemyDiscoveryContext({
    message: 'I want sushi tonight',
    currentMode: 'personal',
  })
  assert.equal(personal.mode, 'personal')
  assert.equal(personal.allowed, true)
  assert.equal(personal.privacyBoundary, 'personal_only')

  const ambiguous = decideRemyDiscoveryContext({
    message: 'I want something that works for our circle',
    circleId: 'circle-1',
    actorRole: 'member',
  })
  assert.equal(ambiguous.mode, 'ambiguous')
  assert.equal(ambiguous.requiresConfirmation, true)

  const blocked = decideRemyDiscoveryContext({
    message: 'apply this to circle',
    actorRole: 'non_member',
  })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.privacyBoundary, 'blocked')
})

test('group decision facilitator picks mechanics without allowing non-member writes', () => {
  const dietary = proposeGroupDecisionMechanic({
    candidateCount: 5,
    memberCount: 4,
    dietaryConcernCount: 1,
    actorRole: 'host',
  })
  assert.equal(dietary.mechanic, 'dietary_concern_check')
  assert.equal(dietary.requiresConfirmation, true)

  const hostCall = proposeGroupDecisionMechanic({
    candidateCount: 3,
    memberCount: 4,
    hostRequestedFinalCall: true,
    actorRole: 'member',
  })
  assert.equal(hostCall.mechanic, 'host_top_three')
  assert.equal(hostCall.allowed, false)

  const broadList = proposeGroupDecisionMechanic({
    candidateCount: 9,
    memberCount: 4,
    actorRole: 'member',
  })
  assert.equal(broadList.mechanic, 'everyone_pick_two')
})

test('constraint locking and vetoes preserve locked fields against silent relaxation', () => {
  const lock = parseConstraintIntent("don't change the budget under $150")
  const veto = parseConstraintIntent('no sushi')
  assert.equal(lock?.operation, 'lock')
  assert.equal(lock?.field, 'budget')
  assert.equal(veto?.operation, 'veto')
  assert.equal(veto?.field, 'cuisine')

  const resolved = resolveConstraints({
    existing: [],
    intents: [lock!, veto!],
    proposedRelaxations: { budget: 'under $250' },
  })

  assert.equal(resolved.constraints.length, 1)
  assert.equal(resolved.constraints[0].locked, true)
  assert.equal(resolved.vetoes.length, 1)
  assert.equal(resolved.blockedRelaxations[0].field, 'budget')
})

test('preference negotiation redacts private signals and ranks compromise candidates', () => {
  const signals: SharedPreferenceSignal[] = [
    { memberId: 'a', label: 'Italian', polarity: 'like', visibility: 'explicit_shared' },
    { memberId: 'b', label: 'Italian', polarity: 'like', visibility: 'aggregate_allowed' },
    { memberId: 'c', label: 'Sushi', polarity: 'dislike', visibility: 'explicit_shared' },
    { memberId: 'd', label: 'Omakase', polarity: 'like', visibility: 'private' },
  ]
  const candidates: DiscoveryCompareCandidate[] = [
    {
      id: 'italian-1',
      type: 'restaurant',
      label: 'Italian Supper Club',
      cuisineTags: ['Italian'],
      confidence: 0.8,
    },
    {
      id: 'sushi-1',
      type: 'restaurant',
      label: 'Sushi Counter',
      cuisineTags: ['Sushi'],
      confidence: 0.9,
    },
  ]

  const result = negotiateSharedPreferences({ signals, candidates })

  assert.deepEqual(result.overlapLabels, ['Italian'])
  assert.deepEqual(result.conflictLabels, ['Sushi'])
  assert.equal(result.redactedPrivateSignalCount, 1)
  assert.deepEqual(result.compromiseCandidateIds, ['italian-1'])
})

test('scenario, occasion, and taste interview contracts are non-mutating and consent aware', () => {
  const active = { date: 'Friday', headcount: 4 }
  const scenario = buildScenarioOverlay({
    id: 'rain',
    label: 'If it rains',
    activeState: active,
    patch: { headcount: 6 },
  })
  assert.deepEqual(scenario.activeState, active)
  assert.equal(scenario.scenarioState.headcount, 6)
  assert.equal(scenario.mutatesActiveState, false)

  const clientDinner = getOccasionWeights('client_dinner')
  assert.ok(clientDinner.reliability > clientDinner.novelty)
  assert.ok(clientDinner.dietaryRisk > 0.9)

  const complete = nextTasteInterviewStep(
    [
      { key: 'dietary', value: 'vegetarian' },
      { key: 'novelty', value: 'surprising' },
      { key: 'formality', value: 'relaxed omakase' },
    ],
    ['vegetarian']
  )
  assert.equal(complete.complete, true)
  assert.equal(complete.memoryRequiresConsent, true)
})
