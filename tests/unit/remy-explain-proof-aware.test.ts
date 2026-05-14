import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyDiscoveryFreshness } from '@/lib/discovery/data-freshness'
import { scoreDiscoverySourceConfidence } from '@/lib/discovery/source-governance'
import {
  buildProofAwareRailExplanation,
  type RemyExplanationSignal,
} from '@/lib/remy/proof-aware-explanations'

test('proof-aware explanation redacts private signals and limits weak-source certainty', () => {
  const freshness = classifyDiscoveryFreshness({
    dataClass: 'menu',
    checkedAt: '2026-04-01T12:00:00.000Z',
    currentAt: '2026-05-13T12:00:00.000Z',
  })
  const weakMenu = scoreDiscoverySourceConfidence({
    sourceType: 'social_page',
    field: 'menu_content',
    freshness,
    inferred: true,
  })
  const signals: RemyExplanationSignal[] = [
    {
      id: 'nearby',
      kind: 'nearby',
      label: 'Nearby fit',
      detail: 'Within the requested radius',
      visibility: 'public',
      allowed: true,
    },
    {
      id: 'menu-proof',
      kind: 'source_confidence',
      label: 'Menu proof',
      detail: 'Inferred from a social page',
      field: 'menu_content',
      confidence: weakMenu,
      freshness,
      visibility: 'public',
      allowed: true,
    },
    {
      id: 'circle-vote',
      kind: 'circle_momentum',
      label: 'Private circle vote',
      detail: 'A named diner voted for this',
      visibility: 'private',
      allowed: false,
    },
  ]

  const explanation = buildProofAwareRailExplanation({
    candidateId: 'cand-1',
    candidateLabel: 'Pasta House',
    signals,
  })

  assert.equal(explanation.certainty, 'limited')
  assert.equal(explanation.redactedSignalCount, 1)
  assert.equal(
    explanation.signals.some((signal) => signal.id === 'circle-vote'),
    false
  )
  assert.match(explanation.answer, /may be showing because/)
  assert.match(explanation.proofWarnings.join(' '), /cannot support a strong claim/)
  assert.match(explanation.proofWarnings.join(' '), /withheld/)
})

test('strong explanations require multiple strong approved proof signals', () => {
  const freshness = classifyDiscoveryFreshness({
    dataClass: 'operator_status',
    checkedAt: '2026-05-13T10:00:00.000Z',
    currentAt: '2026-05-13T12:00:00.000Z',
  })
  const operator = scoreDiscoverySourceConfidence({
    sourceType: 'chef_flow_claimed',
    field: 'operator_identity',
    freshness,
  })
  const availability = scoreDiscoverySourceConfidence({
    sourceType: 'operator_submission',
    field: 'availability',
    freshness,
    corroboratingSourceCount: 1,
  })

  const explanation = buildProofAwareRailExplanation({
    candidateId: 'chef-1',
    candidateLabel: 'Chef Nina',
    signals: [
      {
        id: 'claimed-profile',
        kind: 'source_confidence',
        label: 'Claimed profile',
        detail: 'Operator-controlled ChefFlow profile',
        confidence: operator,
        freshness,
        visibility: 'public',
        allowed: true,
      },
      {
        id: 'availability',
        kind: 'availability',
        label: 'Availability',
        detail: 'Submitted availability is current',
        confidence: availability,
        freshness,
        visibility: 'public',
        allowed: true,
      },
    ],
  })

  assert.equal(explanation.certainty, 'high')
  assert.deepEqual(explanation.proofWarnings, [])
  assert.match(explanation.answer, /^Chef Nina is showing because/)
})
