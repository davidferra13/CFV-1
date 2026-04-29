import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateRecipeFoodCost,
  calculateRecipeFoodCostWithUnits,
  computeIngredientCostLine,
  calculateFoodCostPercentage,
  getFoodCostRating,
  getFoodCostBadgeColor,
} from '@/lib/finance/food-cost-calculator'

// ── calculateRecipeFoodCost ──────────────────────────────────────────

test('calculateRecipeFoodCost sums ingredient costs correctly', () => {
  const ingredients = [
    { qty: 2, costPerUnitCents: 150 },
    { qty: 3, costPerUnitCents: 200 },
    { qty: 0.5, costPerUnitCents: 1000 },
  ]
  // 2*150=300 + 3*200=600 + 0.5*1000=500 = 1400
  assert.equal(calculateRecipeFoodCost(ingredients), 1400)
})

test('calculateRecipeFoodCost returns 0 for empty ingredients', () => {
  assert.equal(calculateRecipeFoodCost([]), 0)
})

test('calculateRecipeFoodCost rounds each ingredient to nearest cent', () => {
  const ingredients = [
    { qty: 1.333, costPerUnitCents: 100 }, // 133.3 -> 133
    { qty: 1.666, costPerUnitCents: 100 }, // 166.6 -> 167
  ]
  assert.equal(calculateRecipeFoodCost(ingredients), 133 + 167)
})

test('calculateRecipeFoodCost handles zero quantity', () => {
  const ingredients = [
    { qty: 0, costPerUnitCents: 500 },
    { qty: 2, costPerUnitCents: 100 },
  ]
  assert.equal(calculateRecipeFoodCost(ingredients), 200)
})

test('calculateRecipeFoodCost handles zero cost', () => {
  const ingredients = [
    { qty: 5, costPerUnitCents: 0 },
    { qty: 2, costPerUnitCents: 300 },
  ]
  assert.equal(calculateRecipeFoodCost(ingredients), 600)
})

test('calculateRecipeFoodCost handles single ingredient', () => {
  assert.equal(calculateRecipeFoodCost([{ qty: 4, costPerUnitCents: 250 }]), 1000)
})

test('calculateRecipeFoodCost handles fractional quantities typical in cooking', () => {
  const ingredients = [
    { qty: 0.25, costPerUnitCents: 400 }, // 1/4 cup -> 100
    { qty: 0.33, costPerUnitCents: 300 }, // 1/3 -> 99
    { qty: 0.125, costPerUnitCents: 800 }, // 1/8 -> 100
  ]
  assert.equal(calculateRecipeFoodCost(ingredients), 100 + 99 + 100)
})

test('calculateRecipeFoodCost handles large batch quantities', () => {
  const ingredients = [
    { qty: 50, costPerUnitCents: 200 },
    { qty: 100, costPerUnitCents: 50 },
  ]
  assert.equal(calculateRecipeFoodCost(ingredients), 10000 + 5000)
})

// ── calculateRecipeFoodCostWithUnits ─────────────────────────────────

test('calculateRecipeFoodCostWithUnits falls back when units match', () => {
  const result = calculateRecipeFoodCostWithUnits([
    {
      qty: 2,
      recipeUnit: 'lb',
      costPerUnitCents: 500,
      costUnit: 'lb',
    },
  ])
  assert.equal(result.totalCents, 1000)
  assert.equal(result.itemCosts.length, 1)
  assert.equal(result.itemCosts[0].converted, true)
})

test('calculateRecipeFoodCostWithUnits converts cups to lbs with density', () => {
  const result = calculateRecipeFoodCostWithUnits([
    {
      qty: 2,
      recipeUnit: 'cup',
      costPerUnitCents: 300,
      costUnit: 'lb',
      ingredientName: 'flour', // density 0.53
    },
  ])
  // 2 cups flour -> ml -> grams -> lbs -> cost
  // Should produce a valid cost, not fallback
  assert.equal(result.itemCosts[0].converted, true)
  assert.ok(result.totalCents > 0)
})

test('calculateRecipeFoodCostWithUnits uses explicit density over lookup', () => {
  const withLookup = calculateRecipeFoodCostWithUnits([
    {
      qty: 1,
      recipeUnit: 'cup',
      costPerUnitCents: 1000,
      costUnit: 'lb',
      ingredientName: 'flour',
      densityGPerMl: null,
    },
  ])
  const withExplicit = calculateRecipeFoodCostWithUnits([
    {
      qty: 1,
      recipeUnit: 'cup',
      costPerUnitCents: 1000,
      costUnit: 'lb',
      ingredientName: 'flour',
      densityGPerMl: 0.8, // much denser than flour
    },
  ])
  // Different densities should produce different costs
  assert.notEqual(withLookup.totalCents, withExplicit.totalCents)
})

test('calculateRecipeFoodCostWithUnits falls back for unknown ingredient with no density', () => {
  const result = calculateRecipeFoodCostWithUnits([
    {
      qty: 3,
      recipeUnit: 'cup',
      costPerUnitCents: 200,
      costUnit: 'lb',
      ingredientName: 'unobtanium',
      densityGPerMl: null,
    },
  ])
  // No density found, fallback to simple multiplication
  assert.equal(result.itemCosts[0].converted, false)
  assert.equal(result.totalCents, 600) // 3 * 200
})

test('calculateRecipeFoodCostWithUnits handles multiple ingredients mixed', () => {
  const result = calculateRecipeFoodCostWithUnits([
    { qty: 1, recipeUnit: 'lb', costPerUnitCents: 500, costUnit: 'lb' },
    { qty: 2, recipeUnit: 'cup', costPerUnitCents: 300, costUnit: 'lb', ingredientName: 'sugar' },
    { qty: 3, recipeUnit: 'each', costPerUnitCents: 50, costUnit: 'each' },
  ])
  assert.equal(result.itemCosts.length, 3)
  assert.ok(result.totalCents > 0)
})

test('calculateRecipeFoodCostWithUnits returns empty for no ingredients', () => {
  const result = calculateRecipeFoodCostWithUnits([])
  assert.equal(result.totalCents, 0)
  assert.equal(result.itemCosts.length, 0)
})

// ── calculateFoodCostPercentage ──────────────────────────────────────

test('computeIngredientCostLine uses precomputed recipe ingredient cost first', () => {
  const result = computeIngredientCostLine({
    qty: 2,
    recipeUnit: 'cup',
    costPerUnitCents: 300,
    costUnit: 'lb',
    ingredientName: 'flour',
    precomputedCostCents: 475,
  })

  assert.equal(result.totalCostCents, 475)
  assert.equal(result.hasCostData, true)
  assert.equal(result.status, 'precomputed')
})

test('computeIngredientCostLine does not trust precomputed zero without a price', () => {
  const result = computeIngredientCostLine({
    qty: 2,
    recipeUnit: 'lb',
    costPerUnitCents: null,
    costUnit: 'lb',
    precomputedCostCents: 0,
  })

  assert.equal(result.totalCostCents, 0)
  assert.equal(result.hasCostData, false)
  assert.equal(result.status, 'no_price')
})

test('computeIngredientCostLine converts recipe units without naive fallback', () => {
  const result = computeIngredientCostLine({
    qty: 2,
    recipeUnit: 'cup',
    costPerUnitCents: 300,
    costUnit: 'lb',
    ingredientName: 'flour',
  })

  assert.equal(result.hasCostData, true)
  assert.equal(result.status, 'priced')
  assert.ok(result.totalCostCents > 0)
})

test('computeIngredientCostLine marks unpriced ingredients incomplete', () => {
  const result = computeIngredientCostLine({
    qty: 2,
    recipeUnit: 'lb',
    costPerUnitCents: null,
    costUnit: 'lb',
  })

  assert.equal(result.totalCostCents, 0)
  assert.equal(result.hasCostData, false)
  assert.equal(result.status, 'no_price')
})

test('computeIngredientCostLine does not invent costs for impossible unit conversion', () => {
  const result = computeIngredientCostLine({
    qty: 3,
    recipeUnit: 'each',
    costPerUnitCents: 500,
    costUnit: 'lb',
    ingredientName: 'unknown garnish',
  })

  assert.equal(result.totalCostCents, 0)
  assert.equal(result.hasCostData, false)
  assert.equal(result.status, 'unit_mismatch')
})

test('computeIngredientCostLine applies yield after conversion', () => {
  const result = computeIngredientCostLine({
    qty: 1,
    recipeUnit: 'lb',
    costPerUnitCents: 1000,
    costUnit: 'lb',
    yieldPct: 80,
  })

  assert.equal(result.totalCostCents, 1250)
  assert.equal(result.hasCostData, true)
})

test('calculateFoodCostPercentage computes correct percentage', () => {
  // 2500 food cost / 10000 revenue = 25%
  assert.equal(calculateFoodCostPercentage(2500, 10000), 25)
})

test('calculateFoodCostPercentage returns 0 for zero revenue', () => {
  assert.equal(calculateFoodCostPercentage(500, 0), 0)
})

test('calculateFoodCostPercentage returns 0 for negative revenue', () => {
  assert.equal(calculateFoodCostPercentage(500, -100), 0)
})

test('calculateFoodCostPercentage handles 100% food cost', () => {
  assert.equal(calculateFoodCostPercentage(5000, 5000), 100)
})

test('calculateFoodCostPercentage handles food cost exceeding revenue', () => {
  // 15000 / 10000 = 150%
  assert.equal(calculateFoodCostPercentage(15000, 10000), 150)
})

test('calculateFoodCostPercentage rounds to one decimal', () => {
  // 3333 / 10000 = 33.33% -> 33.3
  assert.equal(calculateFoodCostPercentage(3333, 10000), 33.3)
})

test('calculateFoodCostPercentage handles small values', () => {
  // 1 / 100 = 1%
  assert.equal(calculateFoodCostPercentage(1, 100), 1)
})

test('calculateFoodCostPercentage handles zero food cost', () => {
  assert.equal(calculateFoodCostPercentage(0, 10000), 0)
})

test('calculateFoodCostPercentage precision for typical private chef event', () => {
  // $450 food cost on $1800 event = 25%
  assert.equal(calculateFoodCostPercentage(45000, 180000), 25)
})

test('calculateFoodCostPercentage precision for high-end event', () => {
  // $2000 food on $8000 event = 25%
  assert.equal(calculateFoodCostPercentage(200000, 800000), 25)
})

// ── getFoodCostRating ────────────────────────────────────────────────

test('getFoodCostRating returns excellent for under 25%', () => {
  const result = getFoodCostRating(20)
  assert.equal(result.rating, 'excellent')
  assert.equal(result.label, 'Excellent')
  assert.ok(result.color.includes('green'))
})

test('getFoodCostRating returns excellent for 0%', () => {
  assert.equal(getFoodCostRating(0).rating, 'excellent')
})

test('getFoodCostRating returns excellent for 24.9%', () => {
  assert.equal(getFoodCostRating(24.9).rating, 'excellent')
})

test('getFoodCostRating returns good for exactly 25%', () => {
  const result = getFoodCostRating(25)
  assert.equal(result.rating, 'good')
  assert.equal(result.label, 'Good')
  assert.ok(result.color.includes('emerald'))
})

test('getFoodCostRating returns good for 30%', () => {
  assert.equal(getFoodCostRating(30).rating, 'good')
})

test('getFoodCostRating returns fair for 30.1%', () => {
  assert.equal(getFoodCostRating(30.1).rating, 'fair')
})

test('getFoodCostRating returns fair for exactly 35%', () => {
  const result = getFoodCostRating(35)
  assert.equal(result.rating, 'fair')
  assert.equal(result.label, 'Fair')
  assert.ok(result.color.includes('amber'))
})

test('getFoodCostRating returns high for over 35%', () => {
  const result = getFoodCostRating(40)
  assert.equal(result.rating, 'high')
  assert.equal(result.label, 'High')
  assert.ok(result.color.includes('red'))
})

test('getFoodCostRating returns high for extreme values', () => {
  assert.equal(getFoodCostRating(100).rating, 'high')
  assert.equal(getFoodCostRating(150).rating, 'high')
})

// Boundary tests at exact thresholds
test('getFoodCostRating boundary: 24.99 is excellent, 25 is good', () => {
  assert.equal(getFoodCostRating(24.99).rating, 'excellent')
  assert.equal(getFoodCostRating(25).rating, 'good')
})

test('getFoodCostRating boundary: 30 is good, 30.01 is fair', () => {
  assert.equal(getFoodCostRating(30).rating, 'good')
  assert.equal(getFoodCostRating(30.01).rating, 'fair')
})

test('getFoodCostRating boundary: 35 is fair, 35.01 is high', () => {
  assert.equal(getFoodCostRating(35).rating, 'fair')
  assert.equal(getFoodCostRating(35.01).rating, 'high')
})

// ── getFoodCostBadgeColor ────────────────────────────────────────────

test('getFoodCostBadgeColor returns green classes under 25%', () => {
  const color = getFoodCostBadgeColor(20)
  assert.ok(color.includes('green'))
  assert.ok(color.includes('bg-'))
  assert.ok(color.includes('text-'))
  assert.ok(color.includes('border-'))
})

test('getFoodCostBadgeColor returns emerald for 25-30%', () => {
  assert.ok(getFoodCostBadgeColor(27).includes('emerald'))
})

test('getFoodCostBadgeColor returns amber for 30-35%', () => {
  assert.ok(getFoodCostBadgeColor(33).includes('amber'))
})

test('getFoodCostBadgeColor returns red above 35%', () => {
  assert.ok(getFoodCostBadgeColor(40).includes('red'))
})

test('getFoodCostBadgeColor matches getFoodCostRating color boundaries', () => {
  // Under 25: both green
  assert.ok(getFoodCostBadgeColor(20).includes('green'))
  assert.ok(getFoodCostRating(20).color.includes('green'))

  // 25-30: both emerald
  assert.ok(getFoodCostBadgeColor(27).includes('emerald'))
  assert.ok(getFoodCostRating(27).color.includes('emerald'))

  // 30-35: both amber
  assert.ok(getFoodCostBadgeColor(33).includes('amber'))
  assert.ok(getFoodCostRating(33).color.includes('amber'))

  // Over 35: both red
  assert.ok(getFoodCostBadgeColor(40).includes('red'))
  assert.ok(getFoodCostRating(40).color.includes('red'))
})

// ── Real-world scenarios ─────────────────────────────────────────────

test('scenario: intimate dinner party (4 guests, $800 revenue)', () => {
  // Appetizer: 4 portions of burrata salad
  // Main: 4 portions of braised short ribs
  // Dessert: 4 portions of panna cotta
  const ingredients = [
    { qty: 4, costPerUnitCents: 350 }, // burrata
    { qty: 1, costPerUnitCents: 200 }, // mixed greens
    { qty: 0.5, costPerUnitCents: 800 }, // olive oil
    { qty: 4, costPerUnitCents: 600 }, // short ribs (per lb)
    { qty: 2, costPerUnitCents: 150 }, // vegetables
    { qty: 1, costPerUnitCents: 500 }, // wine for braising
    { qty: 2, costPerUnitCents: 300 }, // cream for panna cotta
    { qty: 1, costPerUnitCents: 250 }, // vanilla + gelatin
  ]
  const totalCost = calculateRecipeFoodCost(ingredients)
  const pct = calculateFoodCostPercentage(totalCost, 80000)
  const rating = getFoodCostRating(pct)

  assert.ok(totalCost > 0)
  assert.ok(pct > 0 && pct < 100)
  assert.ok(['excellent', 'good', 'fair', 'high'].includes(rating.rating))
})

test('scenario: catering event (50 guests, $5000 revenue)', () => {
  const ingredients = [
    { qty: 50, costPerUnitCents: 100 }, // appetizer per person
    { qty: 25, costPerUnitCents: 500 }, // protein (lbs)
    { qty: 10, costPerUnitCents: 200 }, // sides (bulk)
    { qty: 5, costPerUnitCents: 400 }, // dessert components
  ]
  const totalCost = calculateRecipeFoodCost(ingredients)
  const pct = calculateFoodCostPercentage(totalCost, 500000)

  // At these prices, food cost should be reasonable
  assert.ok(pct < 50, `Food cost ${pct}% seems unreasonably high for this scenario`)
})
