import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGrazingPlan, normalizeGrazingComponentMix } from '@/lib/grazing/scaling-engine'

test('8 guest small board uses formula output and rounded nonzero core categories', () => {
  const plan = buildGrazingPlan({
    guestCount: 8,
    eventFormat: 'small_board',
    serviceStyle: 'standard_grazing',
    density: 'standard',
  })

  assert.equal(plan.totalEdibleOz, 64)
  assert.equal(plan.perGuestOz, 8)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'cheese')?.quantity, 20)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'charcuterie')?.quantity, 16)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'fruit')?.quantity, 16)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'crackers_bread')?.quantity, 16)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'dips_spreads')?.unit, 'cup')
})

test('40 guest mid spread scales above the format minimum', () => {
  const plan = buildGrazingPlan({
    guestCount: 40,
    eventFormat: 'mid_spread',
    serviceStyle: 'standard_grazing',
    density: 'standard',
  })

  assert.equal(plan.totalEdibleOz, 320)
  assert.equal(plan.perGuestOz, 8)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'cheese')?.quantity, 92)
  assert.equal(plan.quantityPlan.find((line) => line.category === 'charcuterie')?.quantity, 64)
})

test('100 guest large table respects the large format minimum', () => {
  const plan = buildGrazingPlan({
    guestCount: 100,
    eventFormat: 'large_table',
    serviceStyle: 'standard_grazing',
    density: 'standard',
  })

  assert.equal(plan.totalEdibleOz, 850)
  assert.equal(plan.perGuestOz, 8.5)
  assert.ok((plan.quantityPlan.find((line) => line.category === 'fruit')?.quantity ?? 0) > 0)
})

test('density changes increase total edible ounces', () => {
  const light = buildGrazingPlan({
    guestCount: 40,
    eventFormat: 'mid_spread',
    serviceStyle: 'standard_grazing',
    density: 'light',
  })
  const abundant = buildGrazingPlan({
    guestCount: 40,
    eventFormat: 'mid_spread',
    serviceStyle: 'standard_grazing',
    density: 'abundant',
  })

  assert.equal(light.totalEdibleOz, 281.6)
  assert.equal(abundant.totalEdibleOz, 377.6)
  assert.ok(abundant.totalEdibleOz > light.totalEdibleOz)
})

test('budget warning appears when estimated quote or food cost exceeds budget', () => {
  const plan = buildGrazingPlan({
    guestCount: 40,
    eventFormat: 'mid_spread',
    serviceStyle: 'standard_grazing',
    density: 'standard',
    budgetCents: 1000,
    targetMarginPercent: 65,
  })

  assert.ok(plan.pricingEstimate.estimatedFoodCostCents > 1000)
  assert.ok(plan.warnings.some((warning) => warning.includes('estimated food cost exceeds budget')))
})

test('layout warning appears when table area is tight', () => {
  const plan = buildGrazingPlan({
    guestCount: 40,
    eventFormat: 'mid_spread',
    serviceStyle: 'standard_grazing',
    density: 'standard',
    tableLengthFt: 4,
    tableWidthFt: 4,
  })

  assert.equal(plan.layoutPlan.surfaceSqFt, 16)
  assert.equal(plan.layoutPlan.sqFtPerGuest, 0.4)
  assert.equal(plan.layoutPlan.densityAssessment, 'tight')
  assert.ok(plan.warnings.some((warning) => warning.includes('tight table area')))
})

test('custom mix normalizes to 1.0', () => {
  const mix = normalizeGrazingComponentMix({ cheese: 2, charcuterie: 1 })
  const total = Object.values(mix).reduce((sum, value) => sum + value, 0)
  assert.equal(Math.round(total * 100000) / 100000, 1)
})
