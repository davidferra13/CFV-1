import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  calculateDoseVolumeMl,
  calculateDryWeightPotency,
  calculateEstimatedFinishedCannabinoidMg,
  calculateLabelVariancePercent,
  calculateLiquidPotencyMgPerMl,
  calculateMgPerMlFromMgPerGram,
  calculatePotentialCannabinoidMg,
  calculateTotalCannabinoid,
  calculateTransferEfficiency,
  THCA_TO_THC_FACTOR,
} from '@/lib/formulas/regulated-product'

describe('regulated product formulas', () => {
  it('converts acidic cannabinoids to neutral potential with molecular weight loss', () => {
    const totalThc = calculateTotalCannabinoid({
      neutralAmount: 1,
      acidicAmount: 20,
      acidToNeutralFactor: THCA_TO_THC_FACTOR,
    })

    assert.equal(totalThc, 18.54)
  })

  it('corrects potency to dry weight basis', () => {
    assert.equal(calculateDryWeightPotency({ asReceivedPotency: 18, moistureFraction: 0.1 }), 20)
  })

  it('calculates finished liquid strength after process losses', () => {
    const potentialMg = calculatePotentialCannabinoidMg({
      materialGrams: 10,
      totalCannabinoidDecimal: 0.1854,
    })

    const finishedMg = calculateEstimatedFinishedCannabinoidMg({
      potentialMg,
      decarbEfficiency: 0.9,
      extractionEfficiency: 0.8,
      transferEfficiency: 0.95,
      retentionEfficiency: 1,
    })

    const mgPerMl = calculateLiquidPotencyMgPerMl({
      finishedCannabinoidMg: finishedMg,
      finalVolumeMl: 60,
    })

    assert.equal(potentialMg, 1854)
    assert.equal(finishedMg, 1268.136)
    assert.equal(mgPerMl, 21.1356)
  })

  it('converts label and dosing units without assuming density equals water', () => {
    assert.equal(calculateMgPerMlFromMgPerGram({ mgPerGram: 18, densityGPerMl: 0.93 }), 16.74)
    assert.equal(calculateDoseVolumeMl({ targetDoseMg: 2.5, potencyMgPerMl: 20 }), 0.125)
  })

  it('surfaces transfer and label variance as explicit percentages', () => {
    assert.equal(
      calculateTransferEfficiency({ intendedMassGrams: 1.5, deliveredMassGrams: 1.462 }),
      0.974667
    )
    assert.equal(calculateLabelVariancePercent({ labelClaim: 10, labResult: 8.9 }), 11)
  })
})
