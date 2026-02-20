// tests/unit/pricing.evaluate.test.ts
//
// Unit tests for lib/pricing/evaluate.ts
//
// All amounts in cents. No database, no network — purely deterministic math.
// Run with: npm run test:unit
//
// Key constants used throughout:
//   COUPLES_RATES: { 3: 20000, 4: 25000, 5: 30000 }  ($200/$250/$300 per person)
//   GROUP_RATES:   { 3: 15500, 4: 18500, 5: 21500 }  ($155/$185/$215 per person)
//   WEEKLY_RATES standard_day: { min: 40000, max: 50000 }  ($400–$500/day)
//   WEEKLY_RATES commitment_day: { min: 30000, max: 35000 }  ($300–$350/day)
//   DEPOSIT_PERCENTAGE: 0.50 (50%)
//   WEEKEND_PREMIUM_PERCENT: 0.10 (10%)
//   IRS_MILEAGE_RATE_CENTS: 70 ($0.70/mile)
//   MINIMUM_BOOKING_CENTS: 30000 ($300)

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateChefPricing,
  isQuotable,
  generateQuoteSummary,
} from '@/lib/pricing/evaluate'

// ─── 1. Eligibility Gate ──────────────────────────────────────────────────────

test('eligibility: no context → pricingAllowed = true (chef-tool mode)', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.pricingAllowed, true)
  assert.deepEqual(result.eligibilityFailReasons, [])
})

test('eligibility: all conditions met → pricingAllowed = true', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eligibility: {
      clientAskedForPricing: true,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, true)
  assert.equal(result.eligibilityFailReasons.length, 0)
})

test('eligibility: client did not ask for pricing → pricingAllowed = false', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eligibility: {
      clientAskedForPricing: false,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, false)
  assert.ok(result.eligibilityFailReasons.length > 0)
})

test('eligibility: clientReferencedPriorPricing counts as trigger', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
    eligibility: {
      clientAskedForPricing: false,
      clientReferencedPriorPricing: true,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, true)
})

test('eligibility: missing guestCount → fail reason present', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
    eligibility: {
      clientAskedForPricing: true,
      guestCountKnown: false, // ← missing
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, false)
  assert.ok(result.eligibilityFailReasons.some((r) => r.toLowerCase().includes('guest count')))
})

test('eligibility: missing date → fail reason present', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
    eligibility: {
      clientAskedForPricing: true,
      guestCountKnown: true,
      dateKnown: false, // ← missing
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, false)
  assert.ok(result.eligibilityFailReasons.some((r) => r.toLowerCase().includes('date')))
})

test('eligibility: isLegitimateChefRequest = false → fail', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
    eligibility: {
      clientAskedForPricing: true,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
      isLegitimateChefRequest: false,
    },
  })
  assert.equal(result.pricingAllowed, false)
  assert.ok(result.eligibilityFailReasons.some((r) => r.toLowerCase().includes('legitimate')))
})

test('eligibility: pricing blocked, but breakdown is always computed', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eligibility: {
      clientAskedForPricing: false,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, false)
  // Breakdown is always computed regardless of eligibility gate
  assert.ok(result.breakdown.totalServiceCents > 0)
  assert.ok(result.breakdown.serviceFeeCents > 0)
})

// ─── 2. Private Dinner — Group Rate ──────────────────────────────────────────

test('private dinner: group rate — 4 guests, 4 courses → $185 × 4 = $740', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.breakdown.serviceFeeCents, 74000)   // $740
  assert.equal(result.breakdown.perPersonCents, 18500)    // $185
  assert.equal(result.breakdown.totalServiceCents, 74000)
  assert.equal(result.breakdown.depositCents, 37000)      // 50% of $740
  assert.equal(result.finalTotalCents, 74000)
  assert.equal(result.finalDepositCents, 37000)
  assert.equal(result.finalBalanceCents, 37000)
  assert.equal(result.breakdown.isCouple, false)
  assert.equal(result.requiresCustomPricing, false)
  assert.notEqual(result.clientFacingText, null)
})

test('private dinner: group rate — 6 guests, 3 courses → $155 × 6 = $930', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 6,
    courseCount: 3,
  })
  assert.equal(result.breakdown.serviceFeeCents, 93000)   // $930
  assert.equal(result.breakdown.perPersonCents, 15500)    // $155
})

test('private dinner: group rate — 4 guests, 5 courses → $215 × 4 = $860', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 5,
  })
  assert.equal(result.breakdown.serviceFeeCents, 86000)   // $860
})

// ─── 3. Private Dinner — Couples Rate ────────────────────────────────────────

test('private dinner: couples rate — 2 guests, 4 courses → $250 × 2 = $500', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 4,
  })
  assert.equal(result.breakdown.serviceFeeCents, 50000)   // $500
  assert.equal(result.breakdown.perPersonCents, 25000)    // $250
  assert.equal(result.breakdown.isCouple, true)
})

test('private dinner: couples rate — 2 guests, 3 courses → $200 × 2 = $400', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
  })
  assert.equal(result.breakdown.serviceFeeCents, 40000)   // $400
  assert.equal(result.breakdown.isCouple, true)
})

test('private dinner: 1 guest treated as couple → couples rate', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 1,
    courseCount: 3,
  })
  assert.equal(result.breakdown.isCouple, true)
  assert.equal(result.breakdown.serviceFeeCents, 20000)   // $200 × 1 = $200
})

test('private dinner: missing courseCount → requiresCustomPricing = true, clientFacingText = null', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    // no courseCount
  })
  assert.equal(result.requiresCustomPricing, true)
  assert.equal(result.clientFacingText, null)
  assert.equal(isQuotable(result), false)
})

test('private dinner: large group (10 guests) uses group rate + isLargeGroup flag', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 10,
    courseCount: 3,
  })
  assert.equal(result.breakdown.isLargeGroup, true)
  assert.equal(result.breakdown.isCouple, false)
  assert.equal(result.breakdown.serviceFeeCents, 155000)  // $155 × 10 = $1,550
  assert.equal(result.requiresCustomPricing, false)
})

test('private dinner: buyout (16 guests) → requiresCustomPricing = true', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 16,
    courseCount: 4,
  })
  assert.equal(result.requiresCustomPricing, true)
  assert.equal(result.clientFacingText, null)
})

// ─── 4. weekendPremiumEnabled Auto-Default ────────────────────────────────────
//
// 2026-03-20 is a Friday.
// In chef-tool mode (no eligibility), weekendPremiumEnabled defaults to true.
// In AI path (eligibility passed), weekendPremiumEnabled defaults to false.

test('weekendPremiumEnabled: chef-tool mode auto-defaults to true for Friday event', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-03-20', // Friday
    // no eligibility context → chef-tool mode
  })
  // serviceFeeCents = $185 × 4 = $740 → weekend premium = 10% = $74
  assert.equal(result.breakdown.isWeekend, true)
  assert.equal(result.breakdown.weekendPremiumCents, 7400) // $74
  assert.ok(result.breakdown.weekendPremiumCents > 0, 'weekend premium should auto-apply in chef-tool mode')
})

test('weekendPremiumEnabled: AI path (eligibility passed) does NOT auto-apply weekend premium', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-03-20', // Friday
    eligibility: {            // ← AI path
      clientAskedForPricing: true,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
    // weekendPremiumEnabled not explicitly passed
  })
  assert.equal(result.breakdown.isWeekend, true)
  assert.equal(result.breakdown.weekendPremiumCents, 0, 'AI path must not silently apply premium')
})

test('weekendPremiumEnabled: explicit false overrides chef-tool default', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-03-20', // Friday
    weekendPremiumEnabled: false,  // explicit override
  })
  assert.equal(result.breakdown.weekendPremiumCents, 0)
})

test('weekendPremiumEnabled: explicit true in AI path applies premium', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-03-20', // Friday
    weekendPremiumEnabled: true,   // explicit opt-in
    eligibility: {
      clientAskedForPricing: true,
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.ok(result.breakdown.weekendPremiumCents > 0)
})

// ─── 5. Holiday Detection ─────────────────────────────────────────────────────
//
// 2026-02-14 = Valentine's Day (Saturday, Tier 1 holiday, 45% premium)

test("holiday: Valentine's Day 2026-02-14 — Tier 1, 45% premium applied", async () => {
  // In chef-tool mode, weekendPremiumEnabled auto-defaults to true.
  // serviceFee = $250 × 2 = $500
  // weekendPremium = 10% of $500 = $50
  // holidayPremium = 45% of ($500 + $50) = 45% of $550 = $247.50 → rounds to $248 (Math.round)
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 4,
    eventDate: '2026-02-14', // Valentine's Day (Saturday)
  })
  assert.equal(result.breakdown.holidayName, "Valentine's Day")
  assert.equal(result.breakdown.holidayTier, 1)
  assert.ok(result.breakdown.holidayPremiumCents > 0)
  assert.equal(result.breakdown.isWeekend, true)
  assert.ok(result.breakdown.weekendPremiumCents > 0, 'weekend premium auto-applied on Saturday in chef-tool mode')
})

test('holiday: non-holiday Tuesday → no holiday premium', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-03-10', // Tuesday, no holiday
  })
  assert.equal(result.breakdown.holidayName, null)
  assert.equal(result.breakdown.holidayPremiumCents, 0)
  assert.equal(result.breakdown.isWeekend, false)
  assert.equal(result.breakdown.weekendPremiumCents, 0)
})

test('holiday premium is stacked on top of weekend premium', async () => {
  // For a Tier-1 holiday on a Friday/Saturday the holiday premium is applied
  // to (serviceFeeCents + weekendPremiumCents), not just serviceFeeCents.
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-02-14', // Saturday Valentine's Day — chef-tool auto-applies weekend premium
  })
  const { serviceFeeCents, weekendPremiumCents, holidayPremiumCents } = result.breakdown
  // holiday premium should be > 0 and based on (service + weekend) base
  assert.ok(holidayPremiumCents > 0)
  const expectedBase = serviceFeeCents + weekendPremiumCents
  const expectedHoliday = Math.round(expectedBase * 0.45)
  assert.equal(holidayPremiumCents, expectedHoliday)
})

// ─── 6. Range Pricing — Weekly Services ──────────────────────────────────────

test('weekly_standard: hasRange = true, low and high computed', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 3,
    numberOfDays: 5,
    // no eventDate → no premiums; clean numbers for math verification
  })
  assert.equal(result.hasRange, true)
  assert.ok(result.rangeLow != null)
  assert.ok(result.rangeHigh != null)
  // Low: $400/day × 5 = $2,000
  assert.equal(result.rangeLow!.dayRateCents, 40000)
  assert.equal(result.rangeLow!.serviceFeeCents, 200000)
  assert.equal(result.rangeLow!.totalServiceCents, 200000)
  assert.equal(result.rangeLow!.depositCents, 100000)  // 50% of $2,000
  // High: $500/day × 5 = $2,500
  assert.equal(result.rangeHigh!.dayRateCents, 50000)
  assert.equal(result.rangeHigh!.serviceFeeCents, 250000)
  assert.equal(result.rangeHigh!.totalServiceCents, 250000)
  assert.equal(result.rangeHigh!.depositCents, 125000) // 50% of $2,500
  // finalTotalCents and breakdown always reflect the HIGH end
  assert.equal(result.breakdown.totalServiceCents, 250000)
  assert.equal(result.finalTotalCents, 250000)
})

test('weekly_commitment: hasRange = true, correct rates ($300–$350/day)', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_commitment',
    guestCount: 2,
    numberOfDays: 5,
  })
  assert.equal(result.hasRange, true)
  // Low: $300/day × 5 = $1,500
  assert.equal(result.rangeLow!.dayRateCents, 30000)
  assert.equal(result.rangeLow!.serviceFeeCents, 150000)
  // High: $350/day × 5 = $1,750
  assert.equal(result.rangeHigh!.dayRateCents, 35000)
  assert.equal(result.rangeHigh!.serviceFeeCents, 175000)
})

test('weekly_standard: clientFacingText contains both low and high totals', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 3,
    numberOfDays: 5,
  })
  assert.notEqual(result.clientFacingText, null)
  // formatCentsAsDollars uses Intl.NumberFormat — thousands separator included
  assert.ok(result.clientFacingText!.includes('$2,000'), `Expected $2,000 in: ${result.clientFacingText}`)
  assert.ok(result.clientFacingText!.includes('$2,500'), `Expected $2,500 in: ${result.clientFacingText}`)
})

test('private_dinner: hasRange = false (not a weekly type)', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.hasRange, false)
  assert.equal(result.rangeLow, undefined)
  assert.equal(result.rangeHigh, undefined)
})

test('weekly_standard range: premiums scale proportionally with day rate', async () => {
  // With a Friday date in chef-tool mode (weekend premium auto-applies):
  // weekendPremium on high side = 10% × 250000 = 25000
  // scalingFactor = 200000 / 250000 = 0.8
  // weekendPremium on low side = round(25000 × 0.8) = 20000
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    numberOfDays: 5,
    eventDate: '2026-03-20', // Friday — auto-applies weekend premium in chef-tool mode
  })
  assert.equal(result.hasRange, true)
  const highWeekend = result.breakdown.weekendPremiumCents
  assert.ok(highWeekend > 0, 'weekend premium should auto-apply in chef-tool mode')
  // Low side weekend = scaled version of high side weekend
  const expectedLowWeekend = Math.round(highWeekend * 0.8)
  assert.equal(result.rangeLow!.subtotalCents, result.rangeLow!.serviceFeeCents + expectedLowWeekend)
})

test('weekly_standard range: travel is same on both sides (does not scale)', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    numberOfDays: 5,
    distanceMiles: 20, // 20 × $0.70 = $14 = 1400 cents
  })
  const travelFee = result.breakdown.travelFeeCents
  assert.equal(travelFee, 1400)
  // Both sides should include the same travel fee
  assert.equal(result.rangeLow!.totalServiceCents, result.rangeLow!.subtotalCents + travelFee)
  assert.equal(result.rangeHigh!.totalServiceCents, result.rangeHigh!.subtotalCents + travelFee)
})

// ─── 7. Adjustments ──────────────────────────────────────────────────────────

test('adjustment: loyalty_discount reduces finalTotalCents and recalculates deposit', async () => {
  // 4 guests, 3 courses → $155 × 4 = $620. Discount $50 → final = $570.
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 3,
    adjustment: {
      type: 'loyalty_discount',
      amountCents: 5000, // $50
      reason: 'Third booking',
    },
  })
  assert.equal(result.breakdown.totalServiceCents, 62000) // $620 unchanged
  assert.equal(result.finalTotalCents, 57000)             // $570
  assert.equal(result.finalDepositCents, 28500)           // 50% of $570
  assert.equal(result.finalBalanceCents, 28500)
  assert.equal(result.adjustmentApplied, true)
  assert.ok(result.adjustmentDescription?.includes('Loyalty discount'))
  assert.ok(result.adjustmentDescription?.includes('Third booking'))
})

test('adjustment: surcharge adds to final total', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 4,
    adjustment: {
      type: 'surcharge',
      amountCents: 10000, // $100
      reason: 'Complex dietary requirements',
    },
  })
  // $500 + $100 = $600
  assert.equal(result.finalTotalCents, 60000)
  assert.equal(result.adjustmentApplied, true)
  assert.ok(result.adjustmentDescription?.includes('Surcharge'))
})

test('adjustment: custom_total overrides entire computed price', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    adjustment: {
      type: 'custom_total',
      totalCents: 100000, // $1,000 chef-set price
      reason: 'Custom negotiated rate',
    },
  })
  assert.equal(result.finalTotalCents, 100000)
  assert.equal(result.finalDepositCents, 50000)  // 50% of $1,000
  assert.equal(result.finalBalanceCents, 50000)
  assert.equal(result.adjustmentApplied, true)
  assert.ok(result.adjustmentDescription?.includes('Custom total override'))
})

test('adjustment: loyalty_discount cannot push total below zero', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
    adjustment: {
      type: 'loyalty_discount',
      amountCents: 999999, // more than the total
      reason: 'Test floor',
    },
  })
  assert.equal(result.finalTotalCents, 0)
  assert.equal(result.finalDepositCents, 0)
})

test('adjustment: no adjustment → adjustmentApplied = false, originals preserved', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.adjustmentApplied, false)
  assert.equal(result.adjustmentDescription, undefined)
  assert.equal(result.finalTotalCents, result.breakdown.totalServiceCents)
  assert.equal(result.finalDepositCents, result.breakdown.depositCents)
})

// ─── 8. Travel Fee ────────────────────────────────────────────────────────────

test('travel: 10 miles → $0.70/mile = $7 (700 cents)', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    distanceMiles: 10,
  })
  assert.equal(result.breakdown.travelFeeCents, 700) // 10 × 70 = 700
  assert.equal(result.breakdown.totalServiceCents, 74000 + 700) // $740 + $7
})

test('travel: no distance → travelFeeCents = 0', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.breakdown.travelFeeCents, 0)
})

// ─── 9. isQuotable() ─────────────────────────────────────────────────────────

test('isQuotable: standard valid result → true', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(isQuotable(result), true)
})

test('isQuotable: requiresCustomPricing → false', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    // no courseCount → custom pricing required
  })
  assert.equal(isQuotable(result), false)
})

test('isQuotable: buyout guest count → false', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 16,
    courseCount: 4,
  })
  assert.equal(isQuotable(result), false)
})

test('isQuotable: loyalty discount wipes total → false', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 2,
    courseCount: 3,
    adjustment: {
      type: 'loyalty_discount',
      amountCents: 999999,
      reason: 'Floor test',
    },
  })
  assert.equal(result.finalTotalCents, 0)
  assert.equal(isQuotable(result), false)
})

test('isQuotable: pricingAllowed = false does NOT block quoting', async () => {
  // Chef can always create a quote regardless of AI eligibility gate.
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eligibility: {
      clientAskedForPricing: false, // would block AI from including pricing in reply
      guestCountKnown: true,
      dateKnown: true,
      locationKnown: true,
    },
  })
  assert.equal(result.pricingAllowed, false)
  assert.equal(isQuotable(result), true) // chef can still create the quote
})

// ─── 10. generateQuoteSummary() ──────────────────────────────────────────────

test('generateQuoteSummary: private dinner → includes course count and total', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  const summary = generateQuoteSummary(result, { serviceType: 'private_dinner' })
  assert.ok(summary.includes('4-course'), `Expected "4-course" in: ${summary}`)
  assert.ok(summary.includes('4'), `Expected guest count in: ${summary}`)
  assert.ok(summary.includes('$740'), `Expected "$740" in: ${summary}`)
  assert.ok(!summary.includes('(adjusted)'))
})

test('generateQuoteSummary: with loyalty discount → includes (adjusted)', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    adjustment: { type: 'loyalty_discount', amountCents: 5000, reason: '3rd booking' },
  })
  const summary = generateQuoteSummary(result, { serviceType: 'private_dinner' })
  assert.ok(summary.includes('(adjusted)'), `Expected "(adjusted)" in: ${summary}`)
})

test("generateQuoteSummary: Valentine's Day → includes holiday name", async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    eventDate: '2026-02-14',
  })
  const summary = generateQuoteSummary(result, { serviceType: 'private_dinner' })
  assert.ok(summary.includes("Valentine's Day"), `Expected holiday name in: ${summary}`)
})

test('generateQuoteSummary: requiresCustomPricing → starts with "Custom pricing required"', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    // no courseCount
  })
  const summary = generateQuoteSummary(result)
  assert.ok(summary.startsWith('Custom pricing required'), `Got: ${summary}`)
})

test('generateQuoteSummary: weekly service → includes days', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    numberOfDays: 5,
  })
  const summary = generateQuoteSummary(result, { serviceType: 'weekly_standard' })
  assert.ok(summary.includes('5'), `Expected days in: ${summary}`)
  assert.ok(summary.includes('$2,500'), `Expected high-end total in: ${summary}`)
})

// ─── 11. Pending Confirmations ────────────────────────────────────────────────

test('pendingConfirmations: catalog add-on surfaces confirmation prompt', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    addOns: [{ key: 'wine_pairing' }],
  })
  assert.ok(
    result.pendingConfirmations.some((c) => c.toLowerCase().includes('wine pairing')),
    'Expected wine pairing confirmation in pendingConfirmations'
  )
})

test('pendingConfirmations: zero-priced multi-night package surfaces', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'multi_night',
    guestCount: 2,
    multiNightPackage: 'three_night_4_course', // price = 0 placeholder
  })
  assert.equal(result.requiresCustomPricing, true)
  assert.ok(
    result.pendingConfirmations.some((c) => c.includes('three_night_4_course')),
    'Expected unpriced package in pendingConfirmations'
  )
})

test('pendingConfirmations: confirmed two-night package has no price confirmation', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'multi_night',
    guestCount: 2,
    multiNightPackage: 'two_night_4_course', // price = $900, confirmed
  })
  // Should NOT surface a price-pending confirmation for this package
  const packageConfirm = result.pendingConfirmations.filter((c) =>
    c.includes('two_night_4_course')
  )
  assert.equal(packageConfirm.length, 0)
})

// ─── 12. Other Service Types ──────────────────────────────────────────────────

test('cook_and_leave: $150/session, 1 session', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'cook_and_leave',
    guestCount: 2,
    numberOfDays: 1,
  })
  assert.equal(result.breakdown.serviceFeeCents, 15000) // $150
  assert.equal(result.requiresCustomPricing, false)
  assert.equal(result.hasRange, false) // cook_and_leave has no range
})

test('pizza_experience: $150/person', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'pizza_experience',
    guestCount: 6,
  })
  assert.equal(result.breakdown.perPersonCents, 15000)
  assert.equal(result.breakdown.serviceFeeCents, 90000) // $150 × 6 = $900
  assert.equal(result.requiresCustomPricing, false)
})

test('multi_night: two_night_4_course → $900 flat', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'multi_night',
    guestCount: 2,
    multiNightPackage: 'two_night_4_course',
  })
  assert.equal(result.breakdown.serviceFeeCents, 90000) // $900
  assert.equal(result.requiresCustomPricing, false)
  assert.equal(isQuotable(result), true)
})

test('custom service type → requiresCustomPricing = true', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'custom',
    guestCount: 10,
  })
  assert.equal(result.requiresCustomPricing, true)
  assert.equal(result.clientFacingText, null)
})

// ─── 13. Minimum Booking Floor ────────────────────────────────────────────────

test('minimum floor: cook_and_leave below $300 minimum → floor applied', async () => {
  // cook_and_leave = $150, minimum floor = $300
  const result = await evaluateChefPricing({
    serviceType: 'cook_and_leave',
    guestCount: 2,
    numberOfDays: 1,
  })
  assert.equal(result.breakdown.serviceFeeCents, 15000) // $150 original
  assert.equal(result.breakdown.minimumApplied, true)
  assert.equal(result.breakdown.totalServiceCents, 30000) // floored to $300
})

test('minimum floor: private dinner above $300 → no floor applied', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.breakdown.minimumApplied, false)
  assert.equal(result.breakdown.totalServiceCents, 74000)
})
