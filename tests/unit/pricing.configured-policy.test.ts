import './fixtures/pricing-network.cjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateChefPricing, isQuotable } from '@/lib/pricing/evaluate'
import { validatePricingInput, type ServiceType } from '@/lib/pricing/compute'
import { makePricingTestConfig } from './fixtures/pricing-config'

test('configured dinner uses the chef tariff without supplying platform rates', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    config: makePricingTestConfig({ group_rate_4_course: 19000 }),
  })
  assert.equal(result.finalTotalCents, 76000)
  assert.equal(isQuotable(result), true)
})

test('weekly range uses both chef day rates and their deposit percentage', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    numberOfDays: 5,
    config: makePricingTestConfig({
      weekly_standard_min: 20000,
      weekly_standard_max: 30000,
      deposit_percentage: 30,
    }),
  })
  assert.equal(result.rangeLow?.dayRateCents, 20000)
  assert.equal(result.rangeHigh?.dayRateCents, 30000)
  assert.equal(result.rangeLow?.totalServiceCents, 100000)
  assert.equal(result.rangeHigh?.totalServiceCents, 150000)
  assert.equal(result.rangeLow?.depositCents, 30000)
  assert.equal(result.rangeHigh?.depositCents, 45000)
  assert.ok(result.clientFacingText?.includes('$1,000'))
  assert.ok(result.clientFacingText?.includes('$1,500'))
})

test('weekly low side applies the chef minimum before adding fixed travel', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    numberOfDays: 1,
    distanceMiles: 10,
    config: makePricingTestConfig({
      weekly_standard_min: 20000,
      weekly_standard_max: 60000,
      minimum_booking_cents: 50000,
      deposit_percentage: 30,
    }),
  })
  assert.equal(result.rangeLow?.totalServiceCents, 50700)
  assert.equal(result.rangeLow?.depositCents, 15210)
  assert.equal(result.rangeHigh?.totalServiceCents, 60700)
  assert.equal(result.rangeHigh?.depositCents, 18210)
})

for (const [percent, want] of [
  [0, 0],
  [30, 21000],
  [100, 70000],
]) {
  test(`adjusted dinner retains the chef's ${percent}% deposit`, async () => {
    const result = await evaluateChefPricing({
      serviceType: 'private_dinner',
      guestCount: 4,
      courseCount: 4,
      config: makePricingTestConfig({ deposit_percentage: percent }),
      adjustment: { type: 'loyalty_discount', amountCents: 4000, reason: 'Returning guest' },
    })
    assert.equal(result.finalTotalCents, 70000)
    assert.equal(result.finalDepositCents, want)
    assert.equal(result.finalBalanceCents, 70000 - want)
  })
}

test('manual total override preserves the chef deposit policy', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    config: makePricingTestConfig({ deposit_percentage: 25 }),
    adjustment: { type: 'custom_total', totalCents: 100000, reason: 'Approved package' },
  })
  assert.equal(result.finalDepositCents, 25000)
  assert.equal(result.finalBalanceCents, 75000)
})

test('chef quote guidance displays the actual deposit and balance deadline', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    config: makePricingTestConfig({ deposit_percentage: 25, balance_due_hours: 48 }),
  })
  assert.ok(result.chefChecklist.some((line) => line.includes('25%')))
  assert.ok(result.chefChecklist.some((line) => line.includes('48 hours')))
  assert.ok(result.chefSummaryText.includes('Deposit (25%)'))
  assert.ok(result.chefSummaryText.includes('48 hours before service'))
})

test('confirmed chef-specific package validates and becomes quotable', async () => {
  const config = makePricingTestConfig({ multi_night_packages: { retreat_breakfast: 45000 } })
  const input = {
    serviceType: 'multi_night' as const,
    guestCount: 2,
    multiNightPackage: 'retreat_breakfast',
  }
  assert.deepEqual(validatePricingInput(input, config), { valid: true, errors: [] })
  const result = await evaluateChefPricing({ ...input, config })
  assert.equal(result.finalTotalCents, 45000)
  assert.deepEqual(result.validationErrors, [])
  assert.equal(isQuotable(result), true)
})

test('unpriced chef package requests a price in settings before quoting', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'multi_night',
    guestCount: 2,
    multiNightPackage: 'retreat_breakfast',
    config: makePricingTestConfig({ multi_night_packages: { retreat_breakfast: 0 } }),
  })
  assert.equal(isQuotable(result), false)
  assert.equal(result.clientFacingText, null)
  assert.ok(result.pendingConfirmations.some((line) => line.includes('retreat_breakfast')))
  assert.ok(result.validationErrors.some((line) => line.includes('placeholder')))
})

test('minimum-floor explanations use the applied chef minimum', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'cook_and_leave',
    guestCount: 2,
    distanceMiles: 10,
    config: makePricingTestConfig({ minimum_booking_cents: 50000 }),
  })
  assert.equal(result.breakdown.totalServiceCents, 50700)
  assert.ok(result.clientFacingText?.includes('$500 minimum'))
  assert.ok(result.pendingConfirmations.some((line) => line.includes('$500')))
  assert.ok(result.chefSummaryText.includes('raised to $500'))
})

test('discount warning compares against the chef minimum', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'cook_and_leave',
    guestCount: 2,
    config: makePricingTestConfig({ minimum_booking_cents: 50000 }),
    adjustment: { type: 'loyalty_discount', amountCents: 10000, reason: 'Returning guest' },
  })
  assert.equal(result.finalTotalCents, 40000)
  assert.ok(result.warnings.some((line) => line.includes('below the $500 minimum')))
})

for (const serviceType of [
  'private_dinner',
  'weekly_standard',
  'weekly_commitment',
  'cook_and_leave',
  'pizza_experience',
  'multi_night',
] as ServiceType[]) {
  test(`unconfigured ${serviceType} cannot become a travel-only or free quote`, async () => {
    const result = await evaluateChefPricing({
      serviceType,
      guestCount: 2,
      courseCount: 4,
      numberOfDays: 5,
      multiNightPackage: 'unconfigured',
      distanceMiles: 10,
    })
    assert.equal(result.requiresCustomPricing, true)
    assert.equal(result.clientFacingText, null)
    assert.equal(isQuotable(result), false)
  })
}

test('negative configured service rate cannot become a client quote', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'pizza_experience',
    guestCount: 2,
    config: makePricingTestConfig({ pizza_rate: -100 }),
  })
  assert.equal(result.requiresCustomPricing, true)
  assert.equal(result.clientFacingText, null)
  assert.equal(result.breakdown.serviceFeeCents, 0)
})

test('configured large-group ceiling applies to validation and quoting', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 15,
    courseCount: 4,
    config: makePricingTestConfig({ large_group_max: 20 }),
  })
  assert.equal(result.finalTotalCents, 277500)
  assert.deepEqual(result.validationErrors, [])
  assert.equal(isQuotable(result), true)
})

test('two chef configurations keep their weekly ranges separate', async () => {
  const first = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    config: makePricingTestConfig({
      weekly_standard_min: 20000,
      weekly_standard_max: 30000,
      minimum_booking_cents: 0,
    }),
  })
  const second = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    config: makePricingTestConfig({
      weekly_standard_min: 70000,
      weekly_standard_max: 90000,
      minimum_booking_cents: 0,
    }),
  })
  assert.equal(first.rangeLow?.totalServiceCents, 20000)
  assert.equal(first.rangeHigh?.totalServiceCents, 30000)
  assert.equal(second.rangeLow?.totalServiceCents, 70000)
  assert.equal(second.rangeHigh?.totalServiceCents, 90000)
})

for (const serviceType of ['weekly_standard', 'weekly_commitment'] as const) {
  for (const min of [0, -100, 40000]) {
    test(`${serviceType} weekly range rejects an invalid lower rate of ${min}`, async () => {
      const config = makePricingTestConfig({
        weekly_standard_min: min,
        weekly_standard_max: 30000,
        weekly_commit_min: min,
        weekly_commit_max: 30000,
        minimum_booking_cents: 0,
      })
      const result = await evaluateChefPricing({
        serviceType,
        guestCount: 2,
        numberOfDays: 5,
        config,
      })
      assert.equal(result.requiresCustomPricing, true)
      assert.equal(result.clientFacingText, null)
      assert.equal(result.hasRange, false)
      assert.equal(isQuotable(result), false)
    })
  }
}
