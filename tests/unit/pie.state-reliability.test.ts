import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assessPriceStateReliability,
  scoreStateReliability,
  type StateReliabilityMetrics,
} from '../../lib/pricing/state-reliability.js'

function metrics(overrides: Partial<StateReliabilityMetrics> = {}): StateReliabilityMetrics {
  return {
    state: 'MA',
    pricedProducts: 100_000,
    stores: 40,
    chains: 8,
    fresh7d: 60_000,
    fresh30d: 95_000,
    fresh7dPct: 60,
    fresh30dPct: 95,
    newestSeen: '2026-05-07T00:00:00.000Z',
    resolvedCells: 20_000,
    realResolvedCells: 18_000,
    syntheticResolvedCells: 2_000,
    realResolvedPct: 90,
    avgSourceCount: 4,
    avgConfidence: 0.82,
    accuracyComparisons: 50,
    accuracyPct: 88,
    meanAbsErrorPct: 10,
    ...overrides,
  }
}

describe('PIE state reliability scoring', () => {
  it('marks a broad, fresh, validated state as reliable', () => {
    const result = scoreStateReliability(metrics())

    assert.equal(result.status, 'reliable')
    assert.equal(result.blockers.length, 0)
    assert.ok(result.score >= 80)
  })

  it('prevents reliability when the state has no accuracy proof', () => {
    const result = scoreStateReliability(
      metrics({
        accuracyComparisons: 0,
        accuracyPct: null,
        meanAbsErrorPct: null,
      })
    )

    assert.notEqual(result.status, 'reliable')
    assert.ok(result.blockers.includes('unvalidated_accuracy'))
  })

  it('treats stale 7-day data as a hard blocker', () => {
    const result = scoreStateReliability(
      metrics({
        fresh7d: 500,
        fresh7dPct: 0.5,
        fresh30dPct: 95,
      })
    )

    assert.notEqual(result.status, 'reliable')
    assert.ok(result.blockers.includes('stale_7d'))
  })

  it('flags states with only synthetic resolved prices', () => {
    const result = scoreStateReliability(
      metrics({
        resolvedCells: 20_000,
        realResolvedCells: 1_000,
        syntheticResolvedCells: 19_000,
        realResolvedPct: 5,
      })
    )

    assert.ok(result.blockers.includes('synthetic_heavy'))
    assert.notEqual(result.status, 'reliable')
  })

  it('marks empty states as unreliable', () => {
    const result = scoreStateReliability(
      metrics({
        pricedProducts: 0,
        stores: 0,
        chains: 0,
        fresh7d: 0,
        fresh30d: 0,
        fresh7dPct: 0,
        fresh30dPct: 0,
        resolvedCells: 0,
        realResolvedCells: 0,
        syntheticResolvedCells: 0,
        realResolvedPct: 0,
        avgSourceCount: 0,
        avgConfidence: 0,
        accuracyComparisons: 0,
        accuracyPct: null,
        meanAbsErrorPct: null,
      })
    )

    assert.equal(result.status, 'unreliable')
    assert.ok(result.blockers.includes('no_local_prices'))
    assert.ok(result.score < 35)
  })

  it('allows reliable local claims only for validated local states', () => {
    const assessment = assessPriceStateReliability({
      stateReliability: scoreStateReliability(metrics()),
      resolutionTier: 'zip_local',
      confidenceScore: 0.91,
    })

    assert.equal(assessment.claimLevel, 'reliable_local')
    assert.equal(assessment.canClaimReliableLocal, true)
    assert.equal(assessment.effectiveConfidenceScore, 0.91)
  })

  it('caps local confidence when state reliability is only estimated', () => {
    const estimatedState = scoreStateReliability(
      metrics({
        fresh7d: 500,
        fresh7dPct: 0.5,
        accuracyComparisons: 0,
        accuracyPct: null,
        meanAbsErrorPct: null,
      })
    )
    const assessment = assessPriceStateReliability({
      stateReliability: estimatedState,
      resolutionTier: 'regional',
      confidenceScore: 0.86,
    })

    assert.equal(assessment.claimLevel, 'state_estimate')
    assert.equal(assessment.canClaimReliableLocal, false)
    assert.equal(assessment.effectiveConfidenceScore, 0.5)
  })

  it('does not apply state-local claims to national or synthetic prices', () => {
    const assessment = assessPriceStateReliability({
      stateReliability: scoreStateReliability(metrics()),
      resolutionTier: 'national_median',
      confidenceScore: 0.62,
    })

    assert.equal(assessment.claimLevel, 'national_or_synthetic')
    assert.equal(assessment.canClaimReliableLocal, false)
    assert.equal(assessment.effectiveConfidenceScore, 0.62)
  })
})
