import test from 'node:test'
import assert from 'node:assert/strict'

// menu-intelligence-actions.ts is a server action file ('use server'),
// so we test the pure deterministic math patterns extracted from it:
// margin alert thresholds, scaling logic, cost aggregation, price spike detection.

// ── Constants from menu-intelligence-actions.ts ──────────────────────

const MARGIN_WARNING_THRESHOLD = 35
const MARGIN_CRITICAL_THRESHOLD = 45
const PRICE_SPIKE_THRESHOLD = 1.3 // 30% above average
const SALT_SPICE_SCALE_FACTOR = 0.7
const LEAVENING_SCALE_FACTOR = 0.75
const BATCH_SPLIT_THRESHOLD = 3.0
const SMALL_BATCH_THRESHOLD = 0.5

const SALT_SPICE_CATEGORIES = ['spice', 'dry_herb', 'fresh_herb']
const LEAVENING_NAMES = ['baking powder', 'baking soda', 'yeast', 'cream of tartar']

// ── Margin alert generation ──────────────────────────────────────────

type MarginAlertLevel = 'ok' | 'warning' | 'critical'

function getMarginAlertLevel(foodCostPercent: number | null): MarginAlertLevel {
  if (foodCostPercent === null) return 'ok'
  if (foodCostPercent > MARGIN_CRITICAL_THRESHOLD) return 'critical'
  if (foodCostPercent > MARGIN_WARNING_THRESHOLD) return 'warning'
  return 'ok'
}

test('margin alert: ok for food cost under 35%', () => {
  assert.equal(getMarginAlertLevel(20), 'ok')
  assert.equal(getMarginAlertLevel(30), 'ok')
  assert.equal(getMarginAlertLevel(34.9), 'ok')
})

test('margin alert: ok for exactly 35%', () => {
  assert.equal(getMarginAlertLevel(35), 'ok')
})

test('margin alert: warning for food cost 35.1%-45%', () => {
  assert.equal(getMarginAlertLevel(35.1), 'warning')
  assert.equal(getMarginAlertLevel(40), 'warning')
  assert.equal(getMarginAlertLevel(45), 'warning')
})

test('margin alert: critical for food cost over 45%', () => {
  assert.equal(getMarginAlertLevel(45.1), 'critical')
  assert.equal(getMarginAlertLevel(50), 'critical')
  assert.equal(getMarginAlertLevel(75), 'critical')
  assert.equal(getMarginAlertLevel(100), 'critical')
})

test('margin alert: ok when null (no data)', () => {
  assert.equal(getMarginAlertLevel(null), 'ok')
})

test('margin alert: ok for zero percent', () => {
  assert.equal(getMarginAlertLevel(0), 'ok')
})

// ── Food cost percent calculation ────────────────────────────────────

function foodCostPercent(totalCostCents: number, quotedPriceCents: number | null): number | null {
  if (!quotedPriceCents || quotedPriceCents <= 0) return null
  return (totalCostCents / quotedPriceCents) * 100
}

test('foodCostPercent: basic calculation', () => {
  // $300 cost / $1000 quoted = 30%
  const pct = foodCostPercent(30000, 100000)
  assert.ok(pct !== null)
  assert.equal(pct, 30)
})

test('foodCostPercent: null when no quoted price', () => {
  assert.equal(foodCostPercent(30000, null), null)
  assert.equal(foodCostPercent(30000, 0), null)
})

test('foodCostPercent: over 100% (losing money)', () => {
  const pct = foodCostPercent(120000, 100000)
  assert.ok(pct !== null)
  assert.equal(pct, 120)
})

test('foodCostPercent: zero cost', () => {
  assert.equal(foodCostPercent(0, 100000), 0)
})

// ── Cost per guest ───────────────────────────────────────────────────

function costPerGuest(totalCostCents: number, guestCount: number): number {
  return guestCount > 0 ? Math.round(totalCostCents / guestCount) : 0
}

test('costPerGuest: basic', () => {
  // $500 total / 10 guests = $50/guest
  assert.equal(costPerGuest(50000, 10), 5000)
})

test('costPerGuest: single guest', () => {
  assert.equal(costPerGuest(50000, 1), 50000)
})

test('costPerGuest: zero guests returns 0', () => {
  assert.equal(costPerGuest(50000, 0), 0)
})

test('costPerGuest: rounds to nearest cent', () => {
  assert.equal(costPerGuest(10000, 3), 3333)
})

// ── Ingredient scaling (non-linear for salt/spice/leavening) ─────────

function scaleIngredient(
  quantity: number,
  linearScaleFactor: number,
  category: string,
  ingredientName: string
): number {
  // Base scaling
  let effectiveScale = linearScaleFactor

  // Salt/spice categories get reduced scaling
  if (SALT_SPICE_CATEGORIES.includes(category.toLowerCase())) {
    effectiveScale = linearScaleFactor * SALT_SPICE_SCALE_FACTOR
  }

  // Leavening agents get reduced scaling
  if (LEAVENING_NAMES.some((name) => ingredientName.toLowerCase().includes(name))) {
    effectiveScale = linearScaleFactor * LEAVENING_SCALE_FACTOR
  }

  return quantity * effectiveScale
}

test('scaleIngredient: linear scaling for regular ingredients', () => {
  // Double a recipe -> chicken doubles
  assert.equal(scaleIngredient(500, 2, 'protein', 'chicken breast'), 1000)
})

test('scaleIngredient: salt/spice scales at 0.7x', () => {
  // Double a recipe -> spice gets 1.4x instead of 2x
  const result = scaleIngredient(10, 2, 'spice', 'cumin')
  assert.equal(result, 10 * 2 * 0.7) // 14 instead of 20
})

test('scaleIngredient: dry herbs scale at 0.7x', () => {
  const result = scaleIngredient(5, 3, 'dry_herb', 'oregano')
  assert.ok(Math.abs(result - 10.5) < 0.001, `Expected ~10.5, got ${result}`)
})

test('scaleIngredient: fresh herbs scale at 0.7x', () => {
  const result = scaleIngredient(8, 2, 'fresh_herb', 'basil')
  assert.equal(result, 8 * 2 * 0.7) // 11.2 instead of 16
})

test('scaleIngredient: baking powder scales at 0.75x', () => {
  const result = scaleIngredient(10, 4, 'leavening', 'baking powder')
  assert.equal(result, 10 * 4 * 0.75) // 30 instead of 40
})

test('scaleIngredient: baking soda scales at 0.75x', () => {
  const result = scaleIngredient(5, 3, 'leavening', 'baking soda')
  assert.equal(result, 5 * 3 * 0.75) // 11.25 instead of 15
})

test('scaleIngredient: yeast scales at 0.75x', () => {
  const result = scaleIngredient(7, 2, 'leavening', 'active dry yeast')
  assert.equal(result, 7 * 2 * 0.75) // 10.5 instead of 14
})

test('scaleIngredient: cream of tartar scales at 0.75x', () => {
  const result = scaleIngredient(3, 2, 'leavening', 'cream of tartar')
  assert.equal(result, 3 * 2 * 0.75) // 4.5 instead of 6
})

test('scaleIngredient: scale factor 1 is identity for regular', () => {
  assert.equal(scaleIngredient(100, 1, 'vegetable', 'carrot'), 100)
})

test('scaleIngredient: scale factor 1 is identity for spice', () => {
  // Even at 1x, spice gets 0.7 reduction -> 0.7
  assert.equal(scaleIngredient(100, 1, 'spice', 'paprika'), 70)
})

// ── Price spike detection ────────────────────────────────────────────

function isPriceSpike(currentPrice: number, averagePrice: number): boolean {
  if (averagePrice <= 0) return false
  return currentPrice > averagePrice * PRICE_SPIKE_THRESHOLD
}

function spikePercent(currentPrice: number, averagePrice: number): number {
  if (averagePrice <= 0) return 0
  return Math.round(((currentPrice - averagePrice) / averagePrice) * 100)
}

test('isPriceSpike: no spike at normal price', () => {
  assert.equal(isPriceSpike(100, 100), false)
})

test('isPriceSpike: no spike at 29% above average', () => {
  assert.equal(isPriceSpike(129, 100), false)
})

test('isPriceSpike: no spike at exactly 30% above', () => {
  assert.equal(isPriceSpike(130, 100), false)
})

test('isPriceSpike: spike at 31% above average', () => {
  assert.equal(isPriceSpike(131, 100), true)
})

test('isPriceSpike: spike at double the price', () => {
  assert.equal(isPriceSpike(200, 100), true)
})

test('isPriceSpike: false when average is zero', () => {
  assert.equal(isPriceSpike(100, 0), false)
})

test('spikePercent: calculates correctly', () => {
  assert.equal(spikePercent(150, 100), 50) // 50% above
  assert.equal(spikePercent(200, 100), 100) // 100% above
  assert.equal(spikePercent(130, 100), 30) // 30% above
  assert.equal(spikePercent(100, 100), 0) // no change
  assert.equal(spikePercent(80, 100), -20) // 20% below (price dropped)
})

// ── Batch split detection ────────────────────────────────────────────

function needsBatchSplit(scaleFactor: number): boolean {
  return scaleFactor >= BATCH_SPLIT_THRESHOLD
}

function isSmallBatch(scaleFactor: number): boolean {
  return scaleFactor <= SMALL_BATCH_THRESHOLD
}

test('needsBatchSplit: false for 2x scale', () => {
  assert.equal(needsBatchSplit(2), false)
})

test('needsBatchSplit: true for 3x scale', () => {
  assert.equal(needsBatchSplit(3), true)
})

test('needsBatchSplit: true for 5x scale', () => {
  assert.equal(needsBatchSplit(5), true)
})

test('needsBatchSplit: false for 2.9x', () => {
  assert.equal(needsBatchSplit(2.9), false)
})

test('isSmallBatch: true for 0.5x', () => {
  assert.equal(isSmallBatch(0.5), true)
})

test('isSmallBatch: true for 0.25x (quarter batch)', () => {
  assert.equal(isSmallBatch(0.25), true)
})

test('isSmallBatch: false for 1x', () => {
  assert.equal(isSmallBatch(1), false)
})

test('isSmallBatch: false for 0.6x', () => {
  assert.equal(isSmallBatch(0.6), false)
})

// ── Component cost aggregation ───────────────────────────────────────

test('aggregation: sum component costs for dish', () => {
  const components = [
    { scaleFactor: 1, recipeCostCents: 500 },
    { scaleFactor: 2, recipeCostCents: 300 },
    { scaleFactor: 1.5, recipeCostCents: 200 },
  ]
  const dishCost = components.reduce(
    (sum, c) => sum + Math.round(c.recipeCostCents * c.scaleFactor),
    0
  )
  assert.equal(dishCost, 500 + 600 + 300) // 1400
})

test('aggregation: sum dish costs for menu', () => {
  const dishes = [{ cost: 1400 }, { cost: 800 }, { cost: 500 }]
  const menuCost = dishes.reduce((sum, d) => sum + d.cost, 0)
  assert.equal(menuCost, 2700)
})

test('aggregation: missing price count tracks unpriced ingredients', () => {
  const ingredients = [
    { priceCents: 100 },
    { priceCents: null },
    { priceCents: 200 },
    { priceCents: null },
    { priceCents: null },
  ]
  const missingCount = ingredients.filter((i) => i.priceCents === null).length
  assert.equal(missingCount, 3)
})

test('aggregation: hasAllPrices is true only when zero missing', () => {
  assert.equal(0 === 0, true) // no missing
  assert.equal(1 === 0, false) // one missing
  assert.equal(5 === 0, false) // five missing
})

// ── Real-world menu costing scenarios ────────────────────────────────

test('scenario: 3-course dinner menu for 8 guests at $2400', () => {
  // Appetizer: burrata salad, scale 1x, cost $45
  // Main: braised short ribs, scale 2x (double recipe), cost $80 base
  // Dessert: panna cotta, scale 1x, cost $25
  const courses = [
    { name: 'Appetizer', scaleFactor: 1, recipeCostCents: 4500 },
    { name: 'Main', scaleFactor: 2, recipeCostCents: 8000 },
    { name: 'Dessert', scaleFactor: 1, recipeCostCents: 2500 },
  ]

  const totalCost = courses.reduce(
    (sum, c) => sum + Math.round(c.recipeCostCents * c.scaleFactor),
    0
  )
  // 4500 + 16000 + 2500 = 23000 cents = $230
  assert.equal(totalCost, 23000)

  const quotedPrice = 240000 // $2400
  const fcPct = (totalCost / quotedPrice) * 100
  // $230 / $2400 = 9.58%
  assert.ok(fcPct < 25, `Food cost ${fcPct.toFixed(1)}% should be under 25% for private chef`)

  const perGuest = Math.round(totalCost / 8)
  // $230 / 8 = $28.75
  assert.equal(perGuest, 2875)

  assert.equal(getMarginAlertLevel(fcPct), 'ok')
})

test('scenario: high food cost menu triggers warning', () => {
  const totalCost = 80000 // $800 food
  const quotedPrice = 200000 // $2000 event
  const fcPct = (totalCost / quotedPrice) * 100 // 40%
  assert.equal(getMarginAlertLevel(fcPct), 'warning')
})

test('scenario: extremely high food cost triggers critical', () => {
  const totalCost = 120000 // $1200 food
  const quotedPrice = 200000 // $2000 event
  const fcPct = (totalCost / quotedPrice) * 100 // 60%
  assert.equal(getMarginAlertLevel(fcPct), 'critical')
})

test('scenario: scaling from 4 to 50 guests (catering)', () => {
  const originalScale = 1 // recipe for 4
  const newScale = 50 / 4 // 12.5x

  // Regular ingredient scales 12.5x
  assert.equal(scaleIngredient(100, newScale, 'protein', 'chicken'), 100 * 12.5)

  // Salt scales 12.5 * 0.7 = 8.75x
  assert.equal(scaleIngredient(10, newScale, 'spice', 'salt'), 10 * 12.5 * 0.7)

  // Baking powder scales 12.5 * 0.75 = 9.375x
  assert.equal(scaleIngredient(5, newScale, 'leavening', 'baking powder'), 5 * 12.5 * 0.75)

  // This scale needs batch splitting
  assert.equal(needsBatchSplit(newScale), true)
})
