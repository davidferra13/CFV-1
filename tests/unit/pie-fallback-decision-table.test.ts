import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PIE_FALLBACK_DECISION_TABLE,
  PIE_RELIABILITY_RISK_DEFINITIONS,
  evaluatePieFallbackContract,
  getPieFallbackCompletionReport,
} from '../../lib/pricing/pie-fallback-decision-table.js'

describe('PIE fallback decision table and reliability scoring contract', () => {
  it('defines the formal fallback ladder in deterministic order', () => {
    assert.deepEqual(
      PIE_FALLBACK_DECISION_TABLE.map((row) => row.step),
      [
        'direct_proof',
        'sku_proof',
        'canonical_proof',
        'equivalent_proof',
        'sibling_fallback',
        'regional_fallback',
        'national_fallback',
        'synthetic_fallback',
        'substitution_fallback',
      ]
    )

    for (const row of PIE_FALLBACK_DECISION_TABLE) {
      assert.ok(row.allowedConditions.length > 0, `${row.step} needs allowed conditions`)
      assert.ok(row.blockedConditions.length > 0, `${row.step} needs blocked conditions`)
      assert.ok(row.proofRequirements.length > 0, `${row.step} needs proof requirements`)
      assert.ok(row.sourceTransparency.length > 0, `${row.step} needs source transparency`)
      assert.ok(row.hardStopRules.length > 0, `${row.step} needs hard-stop rules`)
      assert.ok(row.downgradeRules.length > 0, `${row.step} needs downgrade rules`)
      assert.ok(row.confidenceMultiplier >= 0 && row.confidenceMultiplier <= 1)
      assert.ok(row.visibleLabel)
      assert.ok(row.visibleLabelRequirement)
      assert.ok(
        ['allowed', 'allowed_with_estimate', 'review_required', 'blocked'].includes(
          row.finalCostingState
        )
      )
    }
  })

  it('classifies the mandatory reliability risks', () => {
    assert.deepEqual(
      PIE_RELIABILITY_RISK_DEFINITIONS.map((risk) => risk.code),
      [
        'ambiguous_string',
        'form_collapse',
        'unit_mismatch',
        'missing_yield',
        'prepared_sku',
        'cultural_false_friend',
        'stale_price',
        'region_drift',
        'substitution_drift',
        'synthetic_fallback',
      ]
    )

    for (const risk of PIE_RELIABILITY_RISK_DEFINITIONS) {
      assert.ok(risk.detectionSignals.length > 0, `${risk.code} needs detection signals`)
      assert.ok(risk.hardStopRules.length > 0, `${risk.code} needs hard-stop rules`)
      assert.ok(risk.downgradeRules.length > 0, `${risk.code} needs downgrade rules`)
      assert.ok(risk.requiredResolutionProof.length > 0, `${risk.code} needs resolution proof`)
      assert.ok(risk.sourceTransparency.length > 0, `${risk.code} needs source transparency`)
      assert.ok(risk.confidenceMultiplier >= 0 && risk.confidenceMultiplier <= 1)
    }
  })

  it('allows direct proof only when required transparency and conversion proof exist', () => {
    const direct = evaluatePieFallbackContract({
      step: 'direct_proof',
      baseConfidence: 0.94,
      presentProof: [
        'chef override or receipt image/line proof',
        'canonical ingredient identity',
        'paid price and purchase unit',
        'store or vendor',
        'observed or purchase date',
        'unit and yield basis',
      ],
      sourceAgeDays: 3,
      regionStoreScope: 'same_store',
    })

    assert.equal(direct.finalCostingState, 'allowed')
    assert.equal(direct.missingProof.length, 0)
    assert.equal(direct.visibleLabel, 'Receipt or chef proof')
    assert.ok(direct.confidenceScore > 0.9)

    const unitMismatch = evaluatePieFallbackContract({
      step: 'direct_proof',
      presentProof: ['chef override or receipt image/line proof'],
      riskCodes: ['unit_mismatch'],
    })

    assert.equal(unitMismatch.finalCostingState, 'blocked')
    assert.ok(unitMismatch.hardStops.length > 0)
    assert.ok(unitMismatch.missingProof.includes('conversion basis'))
  })

  it('keeps broad and synthetic fallbacks visibly downgraded', () => {
    const regional = evaluatePieFallbackContract({
      step: 'regional_fallback',
      baseConfidence: 1,
      presentProof: [
        'region identifier',
        'sample size',
        'source set',
        'freshness window',
        'canonical identity or curated category',
      ],
      regionStoreScope: 'same_region',
    })

    assert.equal(regional.finalCostingState, 'allowed_with_estimate')
    assert.equal(regional.visibleLabel, 'Regional estimate')
    assert.ok(regional.confidenceScore < 0.5)

    const synthetic = evaluatePieFallbackContract({
      step: 'synthetic_fallback',
      presentProof: [
        'model or floor version',
        'assumption set',
        'comparable group when present',
        'uncertainty band',
        'reason no market proof exists',
      ],
      riskCodes: ['synthetic_fallback'],
      regionStoreScope: 'unknown',
    })

    assert.equal(synthetic.finalCostingState, 'review_required')
    assert.equal(synthetic.visibleLabel, 'Synthetic estimate')
    assert.ok(synthetic.confidenceScore < 0.2)
  })

  it('blocks unapproved substitutions and exposes contract coverage', () => {
    const substitution = evaluatePieFallbackContract({
      step: 'substitution_fallback',
      presentProof: [
        'replacement canonical identity',
        'dietary and allergen check',
        'replacement price proof',
        'unit and yield compatibility',
      ],
      substitutionApproved: false,
    })

    assert.equal(substitution.finalCostingState, 'blocked')
    assert.ok(substitution.missingProof.includes('approval trail'))
    assert.ok(substitution.missingProof.includes('substitution approval'))

    const report = getPieFallbackCompletionReport()
    assert.equal(report.stepCount, 9)
    assert.equal(report.riskCount, 10)
    assert.deepEqual(report.finalCostingStates.sort(), [
      'allowed',
      'allowed_with_estimate',
      'blocked',
      'review_required',
    ])
  })
})
