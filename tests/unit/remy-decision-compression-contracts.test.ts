import test from 'node:test'
import assert from 'node:assert/strict'

import type { DiscoveryCompareCandidate } from '@/lib/discovery/compare-contracts'
import {
  compressDiscoveryDecision,
  parseCompressionMode,
} from '@/lib/remy/decision-compression-contracts'

const candidates: DiscoveryCompareCandidate[] = [
  {
    id: 'safe',
    type: 'restaurant',
    label: 'Reliable Bistro',
    cuisineTags: ['Italian'],
    distanceMiles: 2,
    priceLevel: 'moderate',
    supportsGroupSize: 6,
    available: true,
    confidence: 0.95,
    whyRecommended: ['Known group fit'],
  },
  {
    id: 'adventurous',
    type: 'chef',
    label: 'Seasonal Omakase Table',
    cuisineTags: ['Japanese', 'Omakase'],
    distanceMiles: 8,
    priceLevel: 'premium',
    supportsGroupSize: 4,
    available: true,
    confidence: 0.68,
    whyRecommended: ['Seasonal tasting menu', 'Rare regional dishes'],
  },
  {
    id: 'risky',
    type: 'restaurant',
    label: 'Unknown Counter',
    cuisineTags: ['Sushi'],
    distanceMiles: 18,
    priceLevel: 'luxury',
    supportsGroupSize: 2,
    available: false,
    confidence: 0.25,
  },
]

test('compression parser maps natural recommendation modes', () => {
  assert.equal(parseCompressionMode('give me the safest 3'), 'safest')
  assert.equal(parseCompressionMode('what offends the fewest people?'), 'lowest_risk')
  assert.equal(parseCompressionMode('make an adventurous pick'), 'adventurous')
})

test('safe compression favors reliable candidates and preserves the broader rail', () => {
  const result = compressDiscoveryDecision({
    mode: 'safest',
    candidates,
    context: {
      desiredCuisine: 'Italian',
      maxDistanceMiles: 10,
      budget: 'moderate',
      groupSize: 4,
    },
  })

  assert.equal(result.candidates[0].id, 'safe')
  assert.deepEqual(result.preservedRailCandidateIds, ['safe', 'adventurous', 'risky'])
  assert.equal(result.reversible, true)
  assert.equal(result.candidates[0].railItemId, 'safe')
})

test('adventurous compression raises novel options while keeping explanations', () => {
  const result = compressDiscoveryDecision({
    mode: 'adventurous',
    candidates,
    context: { maxDistanceMiles: 10, groupSize: 4 },
  })

  assert.equal(result.candidates[0].id, 'adventurous')
  assert.ok(result.candidates[0].tradeoffs.includes('More novel than the baseline rail'))
})
