import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evaluateCulinaryFactTrust,
  type CulinaryFactTrustInput,
} from '../../lib/culinary-intelligence/trust.js'

const NOW = '2026-04-28T12:00:00.000Z'
const CURRENT_OBSERVED_AT = '2026-04-27T12:00:00.000Z'

function trustedFact(overrides: Partial<CulinaryFactTrustInput> = {}): CulinaryFactTrustInput {
  return {
    factType: 'equipment_status',
    lifecycleState: 'surfaceable',
    publicationEligibility: 'surfaceable',
    confidenceScore: 0.91,
    sourceRecordId: 'source-1',
    capturedAt: CURRENT_OBSERVED_AT,
    observedAt: CURRENT_OBSERVED_AT,
    tenantId: 'chef-1',
    reviewStatus: 'not_required',
    now: NOW,
    ...overrides,
  }
}

describe('evaluateCulinaryFactTrust', () => {
  it('does not surface facts with a missing source record', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        sourceRecordId: null,
      })
    )

    assert.equal(result.canSurface, false)
    assert.ok(result.reasons.includes('source_missing'))
  })

  it('does not surface stale facts', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        observedAt: '2026-03-01T12:00:00.000Z',
      })
    )

    assert.equal(result.canSurface, false)
    assert.equal(result.freshness.status, 'stale')
    assert.ok(result.reasons.includes('fact_stale'))
  })

  it('does not surface regulated facts without jurisdiction', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        factType: 'permit_validity',
        confidenceScore: 0.98,
        jurisdiction: null,
      })
    )

    assert.equal(result.canSurface, false)
    assert.ok(result.reasons.includes('jurisdiction_missing'))
  })

  it('does not surface negative monetary values', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        factType: 'replacement_cost_cents',
        confidenceScore: 0.98,
        value: -100,
        valuePresent: true,
      })
    )

    assert.equal(result.canSurface, false)
    assert.ok(result.reasons.includes('monetary_value_negative'))
  })

  it('keeps internal-only facts out of user-facing surfaces', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        lifecycleState: 'internal_only',
        publicationEligibility: 'internal_only',
      })
    )

    assert.equal(result.canSurface, false)
    assert.ok(result.reasons.includes('publication_not_surfaceable'))
    assert.ok(result.reasons.includes('lifecycle_not_surfaceable'))
  })

  it('surfaces high-confidence current facts with provenance and tenant scope', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        factType: 'property_access_constraint',
        confidenceScore: 0.97,
        observedAt: CURRENT_OBSERVED_AT,
      })
    )

    assert.equal(result.canSurface, true)
    assert.deepEqual(result.reasons, [])
    assert.equal(result.freshness.status, 'fresh')
    assert.equal(result.requiresReview, false)
    assert.equal(result.effectiveConfidence, 0.97)
  })

  it('allows reviewed high-impact facts to surface when confidence is below the automatic threshold', () => {
    const result = evaluateCulinaryFactTrust(
      trustedFact({
        factType: 'insurance_coverage',
        confidenceScore: 0.82,
        jurisdiction: 'MA',
        reviewStatus: 'approved',
      })
    )

    assert.equal(result.canSurface, true)
    assert.equal(result.requiresReview, false)
  })
})
