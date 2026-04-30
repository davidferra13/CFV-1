import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateEstimatedActualVariance,
  calculateFoodCostPercent,
  calculateIngredientSpikePercent,
  calculateMarginPercent,
  calculateProfitCents,
  calculateSuggestedPriceFromFoodCost,
  calculateTargetFoodCostBudget,
  generateEventPricingWarnings,
  isIngredientPriceSpike,
  resolveSuggestedEventPrice,
} from '@/lib/finance/event-pricing-intelligence'

test('calculateSuggestedPriceFromFoodCost prices from target food cost percentage', () => {
  assert.equal(calculateSuggestedPriceFromFoodCost(35000, 35), 100000)
  assert.equal(calculateSuggestedPriceFromFoodCost(30001, 30), 100004)
})

test('calculateSuggestedPriceFromFoodCost returns a safe zero for incomplete inputs', () => {
  assert.equal(calculateSuggestedPriceFromFoodCost(null, 35), 0)
  assert.equal(calculateSuggestedPriceFromFoodCost(35000, null), 0)
  assert.equal(calculateSuggestedPriceFromFoodCost(35000, 0), 0)
})

test('calculateTargetFoodCostBudget derives the target food-cost ceiling', () => {
  assert.equal(calculateTargetFoodCostBudget(200000, 30), 60000)
  assert.equal(calculateTargetFoodCostBudget(125000, 35), 43750)
})

test('projected margin calculations produce profit and margin percent', () => {
  assert.equal(calculateProfitCents(200000, 70000), 130000)
  assert.equal(calculateMarginPercent(200000, 70000), 65)
})

test('actual margin calculation handles losses and empty revenue', () => {
  assert.equal(calculateMarginPercent(100000, 125000), -25)
  assert.equal(calculateMarginPercent(0, 125000), 0)
})

test('calculateFoodCostPercent reports target food cost usage', () => {
  assert.equal(calculateFoodCostPercent(45000, 180000), 25)
  assert.equal(calculateFoodCostPercent(3333, 10000), 33.3)
  assert.equal(calculateFoodCostPercent(45000, 0), null)
})

test('calculateEstimatedActualVariance reports estimated vs actual variance', () => {
  assert.deepEqual(calculateEstimatedActualVariance(50000, 65000), {
    varianceCents: 15000,
    variancePercent: 30,
  })
  assert.deepEqual(calculateEstimatedActualVariance(50000, 45000), {
    varianceCents: -5000,
    variancePercent: -10,
  })
  assert.deepEqual(calculateEstimatedActualVariance(0, 45000), {
    varianceCents: 45000,
    variancePercent: null,
  })
})

test('calculateIngredientSpikePercent reports current price above historical average', () => {
  assert.equal(calculateIngredientSpikePercent(1500, 1000), 50)
  assert.equal(calculateIngredientSpikePercent(1299, 1000), 29.9)
  assert.equal(calculateIngredientSpikePercent(800, 1000), -20)
})

test('isIngredientPriceSpike uses the 30 percent threshold', () => {
  assert.equal(isIngredientPriceSpike(1300, 1000), true)
  assert.equal(isIngredientPriceSpike(1299, 1000), false)
  assert.equal(isIngredientPriceSpike(1500, 1000, 50), true)
  assert.equal(isIngredientPriceSpike(1499, 1000, 50), false)
})

test('ingredient spike math ignores missing current or historical average prices', () => {
  assert.equal(calculateIngredientSpikePercent(1500, null), null)
  assert.equal(calculateIngredientSpikePercent(null, 1000), null)
  assert.equal(calculateIngredientSpikePercent(1500, 0), null)
  assert.equal(isIngredientPriceSpike(1500, null), false)
  assert.equal(isIngredientPriceSpike(null, 1000), false)
})

test('resolveSuggestedEventPrice uses projected food cost when available', () => {
  const result = resolveSuggestedEventPrice({
    projectedFoodCostCents: 35000,
    targetFoodCostPercent: 35,
    targetMarginPercent: 60,
    currentPriceCents: 90000,
    hasCompleteProjectedCost: true,
  })

  assert.equal(result.suggestedPriceCents, 100000)
  assert.equal(result.source, 'projected_food_cost')
  assert.equal(result.fallbackUsed, false)
  assert.equal(result.pricingConfidence, 'high')
})

test('resolveSuggestedEventPrice falls back without creating a null-price dead end', () => {
  const fromActualFood = resolveSuggestedEventPrice({
    actualFoodCostCents: 30000,
    targetFoodCostPercent: 30,
    targetMarginPercent: 60,
  })
  assert.equal(fromActualFood.suggestedPriceCents, 100000)
  assert.equal(fromActualFood.source, 'actual_food_cost')
  assert.equal(fromActualFood.fallbackUsed, true)

  const fromCurrentPrice = resolveSuggestedEventPrice({
    currentPriceCents: 125000,
    targetFoodCostPercent: 30,
    targetMarginPercent: 60,
  })
  assert.equal(fromCurrentPrice.suggestedPriceCents, 125000)
  assert.equal(fromCurrentPrice.source, 'current_price')
  assert.equal(fromCurrentPrice.pricingConfidence, 'low')
})

test('generateEventPricingWarnings flags underpricing, food cost, margin, variance, and stale confidence', () => {
  const warnings = generateEventPricingWarnings({
    projectedFoodCostCents: 45000,
    actualFoodCostCents: 65000,
    actualTotalCostCents: 90000,
    quoteOrRevenueCents: 100000,
    suggestedPriceCents: 150000,
    targetFoodCostPercent: 35,
    targetMarginPercent: 60,
    projectedFoodCostPercent: 45,
    actualFoodCostPercent: 65,
    actualMarginPercent: 10,
    estimatedVsActualPercent: 44.4,
    fallbackUsed: false,
    stalePriceCount: 3,
    lowConfidenceIngredientCount: 2,
  })

  assert.ok(warnings.some((warning) => warning.type === 'underpriced_event'))
  assert.ok(warnings.some((warning) => warning.type === 'food_cost_above_target'))
  assert.ok(warnings.some((warning) => warning.type === 'actual_margin_below_target'))
  assert.ok(warnings.some((warning) => warning.type === 'estimated_actual_variance_high'))
  assert.ok(warnings.some((warning) => warning.type === 'menu_needs_repricing'))
  assert.ok(warnings.some((warning) => warning.type === 'stale_pricing'))
  assert.ok(warnings.some((warning) => warning.type === 'low_confidence_pricing'))
})

test('generateEventPricingWarnings emits one ingredient spike warning with top spike summary', () => {
  const warnings = generateEventPricingWarnings({
    projectedFoodCostCents: 45000,
    actualFoodCostCents: 0,
    actualTotalCostCents: 0,
    quoteOrRevenueCents: 150000,
    suggestedPriceCents: 150000,
    targetFoodCostPercent: 35,
    targetMarginPercent: 60,
    projectedFoodCostPercent: 30,
    actualFoodCostPercent: null,
    actualMarginPercent: null,
    estimatedVsActualPercent: null,
    fallbackUsed: false,
    stalePriceCount: 0,
    lowConfidenceIngredientCount: 0,
    ingredientSpikeCount: 2,
    topIngredientSpikeName: 'Ribeye',
    topIngredientSpikePercent: 62.5,
  })

  const spikeWarnings = warnings.filter((warning) => warning.type === 'ingredient_price_spike')
  assert.equal(spikeWarnings.length, 1)
  assert.equal(spikeWarnings[0].label, 'Ingredient price spike')
  assert.match(spikeWarnings[0].message, /2 event ingredients are at least 30% above average/)
  assert.match(spikeWarnings[0].message, /Ribeye is 62.5% above average/)
})

test('generateEventPricingWarnings does not emit ingredient spike warning without valid spike count', () => {
  const warnings = generateEventPricingWarnings({
    projectedFoodCostCents: 45000,
    actualFoodCostCents: 0,
    actualTotalCostCents: 0,
    quoteOrRevenueCents: 150000,
    suggestedPriceCents: 150000,
    targetFoodCostPercent: 35,
    targetMarginPercent: 60,
    projectedFoodCostPercent: 30,
    actualFoodCostPercent: null,
    actualMarginPercent: null,
    estimatedVsActualPercent: null,
    fallbackUsed: false,
    stalePriceCount: 0,
    lowConfidenceIngredientCount: 0,
    ingredientSpikeCount: 0,
  })

  assert.equal(
    warnings.some((warning) => warning.type === 'ingredient_price_spike'),
    false
  )
})

test('generateEventPricingWarnings flags fallback pricing without nulls', () => {
  const warnings = generateEventPricingWarnings({
    projectedFoodCostCents: 0,
    actualFoodCostCents: 0,
    actualTotalCostCents: 0,
    quoteOrRevenueCents: 0,
    suggestedPriceCents: 0,
    targetFoodCostPercent: 35,
    targetMarginPercent: 60,
    projectedFoodCostPercent: null,
    actualFoodCostPercent: null,
    actualMarginPercent: null,
    estimatedVsActualPercent: null,
    fallbackUsed: true,
    stalePriceCount: 0,
    lowConfidenceIngredientCount: 0,
  })

  assert.equal(warnings.length, 1)
  assert.equal(warnings[0].type, 'missing_cost_data')
})

test('generateEventPricingWarnings flags pricing reliability gate failures', () => {
  const warnings = generateEventPricingWarnings({
    projectedFoodCostCents: 45000,
    actualFoodCostCents: 0,
    actualTotalCostCents: 0,
    quoteOrRevenueCents: 150000,
    suggestedPriceCents: 150000,
    targetFoodCostPercent: 35,
    targetMarginPercent: 60,
    projectedFoodCostPercent: 30,
    actualFoodCostPercent: null,
    actualMarginPercent: null,
    estimatedVsActualPercent: null,
    fallbackUsed: false,
    stalePriceCount: 0,
    lowConfidenceIngredientCount: 0,
    pricingReliabilityVerdict: 'planning_only',
    pricingReliabilityPlanningOnlyCount: 2,
    pricingReliabilityVerifyFirstCount: 1,
    pricingReliabilityModeledCount: 2,
  })

  const reliabilityWarnings = warnings.filter(
    (warning) => warning.type === 'pricing_reliability_gate'
  )
  assert.equal(reliabilityWarnings.length, 1)
  assert.equal(reliabilityWarnings[0].severity, 'critical')
  assert.match(reliabilityWarnings[0].message, /2 planning-only ingredient prices/)
  assert.match(reliabilityWarnings[0].message, /2 modeled fallback prices/)
})
