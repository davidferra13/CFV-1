import test from 'node:test'
import assert from 'node:assert/strict'

// catering-bid-actions.ts is a server action file ('use server'),
// but all cost math is deterministic. We test the exact formulas used
// by extracting and verifying the pure math patterns.

// ── Constants from catering-bid-actions.ts ───────────────────────────

const MILEAGE_RATE_CENTS = 7250 // per 100 miles (72.5 cents/mile)

// ── Recipe scaling logic ─────────────────────────────────────────────

function scaleRecipeCost(baseCostCents: number, servings: number, yieldQuantity: number): number {
  const scaleFactor = servings / (yieldQuantity || 1)
  return Math.round(baseCostCents * scaleFactor)
}

test('scaleRecipeCost: no scaling when servings equals yield', () => {
  assert.equal(scaleRecipeCost(1000, 4, 4), 1000)
})

test('scaleRecipeCost: double cost for double servings', () => {
  assert.equal(scaleRecipeCost(1000, 8, 4), 2000)
})

test('scaleRecipeCost: half cost for half servings', () => {
  assert.equal(scaleRecipeCost(1000, 2, 4), 500)
})

test('scaleRecipeCost: scales linearly', () => {
  // 50 servings from recipe yielding 4 = 12.5x
  assert.equal(scaleRecipeCost(1000, 50, 4), 12500)
})

test('scaleRecipeCost: handles yield of 1', () => {
  assert.equal(scaleRecipeCost(500, 10, 1), 5000)
})

test('scaleRecipeCost: handles yield of 0 (defaults to 1)', () => {
  assert.equal(scaleRecipeCost(500, 10, 0), 5000)
})

test('scaleRecipeCost: fractional scaling', () => {
  // 3 servings from recipe yielding 4 = 0.75x
  assert.equal(scaleRecipeCost(1000, 3, 4), 750)
})

test('scaleRecipeCost: rounds to nearest cent', () => {
  // 1 serving from recipe yielding 3 = 0.333...
  // 1000 * 0.333... = 333.33 -> 333
  assert.equal(scaleRecipeCost(1000, 1, 3), 333)
})

// ── Labor cost ───────────────────────────────────────────────────────

function laborCost(hours: number, rateCents: number): number {
  return Math.round(hours * rateCents)
}

test('laborCost: basic calculation', () => {
  // 8 hours at $50/hr = $400
  assert.equal(laborCost(8, 5000), 40000)
})

test('laborCost: fractional hours', () => {
  // 2.5 hours at $75/hr = $187.50
  assert.equal(laborCost(2.5, 7500), 18750)
})

test('laborCost: zero hours', () => {
  assert.equal(laborCost(0, 5000), 0)
})

test('laborCost: high rate catering', () => {
  // 12 hours at $100/hr = $1200
  assert.equal(laborCost(12, 10000), 120000)
})

// ── Travel cost ──────────────────────────────────────────────────────

function travelCost(miles: number): number {
  return Math.round((miles * MILEAGE_RATE_CENTS) / 100)
}

test('travelCost: IRS rate 72.5 cents/mile', () => {
  // 100 miles * 72.5 cents = $72.50 = 7250 cents
  assert.equal(travelCost(100), 7250)
})

test('travelCost: short local trip', () => {
  // 10 miles = 725 cents = $7.25
  assert.equal(travelCost(10), 725)
})

test('travelCost: zero miles', () => {
  assert.equal(travelCost(0), 0)
})

test('travelCost: long catering trip', () => {
  // 250 miles * 72.5 = $181.25 = 18125 cents
  assert.equal(travelCost(250), 18125)
})

test('travelCost: fractional miles', () => {
  // 1.5 miles = 108.75 -> 109 cents
  assert.equal(travelCost(1.5), 109)
})

// ── Overhead calculation ─────────────────────────────────────────────

function overhead(directCosts: number, overheadPercent: number): number {
  return Math.round(directCosts * (overheadPercent / 100))
}

test('overhead: 15% of direct costs', () => {
  // $1000 direct * 15% = $150
  assert.equal(overhead(100000, 15), 15000)
})

test('overhead: zero percent', () => {
  assert.equal(overhead(100000, 0), 0)
})

test('overhead: 100%', () => {
  assert.equal(overhead(100000, 100), 100000)
})

test('overhead: fractional percent', () => {
  // $5000 * 12.5% = $625
  assert.equal(overhead(500000, 12.5), 62500)
})

// ── Profit calculation ───────────────────────────────────────────────

function profit(subtotal: number, profitMarginPercent: number): number {
  return Math.round(subtotal * (profitMarginPercent / 100))
}

test('profit: 20% margin on subtotal', () => {
  assert.equal(profit(100000, 20), 20000)
})

test('profit: 30% margin', () => {
  assert.equal(profit(100000, 30), 30000)
})

test('profit: zero margin', () => {
  assert.equal(profit(100000, 0), 0)
})

// ── Per-person cost ──────────────────────────────────────────────────

function perPerson(totalCents: number, guestCount: number): number {
  return guestCount > 0 ? Math.round(totalCents / guestCount) : 0
}

test('perPerson: basic division', () => {
  // $1000 total / 10 guests = $100/person
  assert.equal(perPerson(100000, 10), 10000)
})

test('perPerson: single guest gets full amount', () => {
  assert.equal(perPerson(50000, 1), 50000)
})

test('perPerson: zero guests returns 0', () => {
  assert.equal(perPerson(50000, 0), 0)
})

test('perPerson: rounds to nearest cent', () => {
  // $100 / 3 = 33.33... -> 3333 cents
  assert.equal(perPerson(10000, 3), 3333)
})

test('perPerson: large event', () => {
  // $25,000 / 200 guests = $125/person
  assert.equal(perPerson(2500000, 200), 12500)
})

// ── Full bid calculation (end-to-end formula) ────────────────────────

function calculateFullBid(params: {
  foodCostCents: number
  laborHours: number
  laborRateCents: number
  equipmentCostCents: number
  travelMiles: number
  overheadPercent: number
  profitMarginPercent: number
  guestCount: number
}) {
  const laborCostCents = Math.round(params.laborHours * params.laborRateCents)
  const travelCostCents = Math.round((params.travelMiles * MILEAGE_RATE_CENTS) / 100)

  const directCosts =
    params.foodCostCents + laborCostCents + params.equipmentCostCents + travelCostCents

  const overheadCents = Math.round(directCosts * (params.overheadPercent / 100))
  const subtotalCents = directCosts + overheadCents
  const profitCents = Math.round(subtotalCents * (params.profitMarginPercent / 100))
  const totalCents = subtotalCents + profitCents
  const perPersonCents = params.guestCount > 0 ? Math.round(totalCents / params.guestCount) : 0

  return {
    foodCostCents: params.foodCostCents,
    laborCostCents,
    overheadCents,
    travelCostCents,
    equipmentCostCents: params.equipmentCostCents,
    subtotalCents,
    profitCents,
    totalCents,
    perPersonCents,
  }
}

test('full bid: typical private dinner (4 guests)', () => {
  const bid = calculateFullBid({
    foodCostCents: 15000, // $150 food
    laborHours: 6, // 6 hours
    laborRateCents: 7500, // $75/hr
    equipmentCostCents: 0,
    travelMiles: 20,
    overheadPercent: 10,
    profitMarginPercent: 25,
    guestCount: 4,
  })

  assert.equal(bid.foodCostCents, 15000)
  assert.equal(bid.laborCostCents, 45000) // 6 * 7500
  assert.equal(bid.travelCostCents, 1450) // 20 * 72.5
  assert.equal(bid.equipmentCostCents, 0)

  const directCosts = 15000 + 45000 + 0 + 1450 // 61450
  assert.equal(bid.overheadCents, Math.round(directCosts * 0.1)) // 6145
  const subtotal = directCosts + bid.overheadCents // 67595
  assert.equal(bid.subtotalCents, subtotal)
  assert.equal(bid.profitCents, Math.round(subtotal * 0.25)) // 16899
  assert.equal(bid.totalCents, subtotal + bid.profitCents) // 84494

  // Per person should be total / 4
  assert.equal(bid.perPersonCents, Math.round(bid.totalCents / 4))
})

test('full bid: large catering (100 guests)', () => {
  const bid = calculateFullBid({
    foodCostCents: 250000, // $2500 food
    laborHours: 16, // 16 hours (2 people, 8 each)
    laborRateCents: 5000, // $50/hr
    equipmentCostCents: 25000, // $250 equipment rental
    travelMiles: 50,
    overheadPercent: 15,
    profitMarginPercent: 30,
    guestCount: 100,
  })

  assert.ok(bid.totalCents > bid.subtotalCents, 'Total includes profit')
  assert.ok(
    bid.subtotalCents > bid.foodCostCents + bid.laborCostCents,
    'Subtotal includes overhead'
  )
  assert.ok(bid.perPersonCents > 0)
  assert.equal(bid.perPersonCents, Math.round(bid.totalCents / 100))
})

test('full bid: zero overhead and profit', () => {
  const bid = calculateFullBid({
    foodCostCents: 10000,
    laborHours: 4,
    laborRateCents: 5000,
    equipmentCostCents: 0,
    travelMiles: 0,
    overheadPercent: 0,
    profitMarginPercent: 0,
    guestCount: 4,
  })

  const directCosts = 10000 + 20000 // food + labor
  assert.equal(bid.overheadCents, 0)
  assert.equal(bid.profitCents, 0)
  assert.equal(bid.totalCents, directCosts)
  assert.equal(bid.subtotalCents, directCosts)
})

test('full bid: all cost components present', () => {
  const bid = calculateFullBid({
    foodCostCents: 50000,
    laborHours: 8,
    laborRateCents: 6000,
    equipmentCostCents: 10000,
    travelMiles: 30,
    overheadPercent: 12,
    profitMarginPercent: 20,
    guestCount: 20,
  })

  // Verify every component is accounted for
  const expectedDirect =
    bid.foodCostCents + bid.laborCostCents + bid.equipmentCostCents + bid.travelCostCents
  assert.equal(bid.subtotalCents, expectedDirect + bid.overheadCents)
  assert.equal(bid.totalCents, bid.subtotalCents + bid.profitCents)
})

test('full bid: food cost percentage check', () => {
  const bid = calculateFullBid({
    foodCostCents: 30000, // $300 food
    laborHours: 5,
    laborRateCents: 5000,
    equipmentCostCents: 0,
    travelMiles: 0,
    overheadPercent: 10,
    profitMarginPercent: 25,
    guestCount: 10,
  })

  // Food should be a reasonable percentage of total
  const foodPct = (bid.foodCostCents / bid.totalCents) * 100
  assert.ok(foodPct > 0 && foodPct < 100, `Food is ${foodPct}% of total`)
  assert.ok(foodPct < 50, `Food cost ${foodPct}% seems high for a bid with labor`)
})

// ── Cost per serving calculation ─────────────────────────────────────

test('costPerServing: basic', () => {
  const scaledCost = 5000 // $50 for 10 servings
  const servings = 10
  const costPerServing = servings > 0 ? Math.round(scaledCost / servings) : 0
  assert.equal(costPerServing, 500) // $5/serving
})

test('costPerServing: zero servings returns 0', () => {
  const servings = 0
  const costPerServing = servings > 0 ? Math.round(5000 / servings) : 0
  assert.equal(costPerServing, 0)
})

// ── Pricing notes formatting (from saveBidAsQuote) ───────────────────

test('pricing notes format: dollar conversion from cents', () => {
  assert.equal((15000 / 100).toFixed(2), '150.00')
  assert.equal((7250 / 100).toFixed(2), '72.50')
  assert.equal((99 / 100).toFixed(2), '0.99')
  assert.equal((1 / 100).toFixed(2), '0.01')
  assert.equal((0 / 100).toFixed(2), '0.00')
})
