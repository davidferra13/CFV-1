import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateChefPricing } from '../../lib/pricing/evaluate'
import { validatePricingInput } from '../../lib/pricing/compute'
import { dateToDateString } from '../../lib/utils/format'
import { configuredPricing } from '../helpers/pricing-config'

test('calendar date strings preserve their day in every supported timezone', () => {
  const original = process.env.TZ
  try {
    for (const timezone of ['UTC', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = timezone
      assert.equal(dateToDateString('2026-03-20'), '2026-03-20')
      assert.equal(dateToDateString(new Date(2026, 2, 20, 12)), '2026-03-20')
    }
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

test('multi-night validation uses only the selected chef catalog', async () => {
  const config = { ...configuredPricing, multi_night_packages: { retreat: 123456 } }
  const input = { serviceType: 'multi_night' as const, guestCount: 2, multiNightPackage: 'retreat' }
  assert.equal(validatePricingInput(input, config).valid, true)
  assert.equal(validatePricingInput(input).valid, false)
  assert.equal(
    validatePricingInput({ ...input, multiNightPackage: 'two_night_4_course' }, config).valid,
    false
  )
  const result = await evaluateChefPricing({ ...input, config })
  assert.equal(result.requiresCustomPricing, false)
  assert.equal(result.finalTotalCents, 123456)
})

test('weekly range honors custom rates, minimum, deposit and balance policies', async () => {
  const config = {
    ...configuredPricing,
    weekly_standard_min: 10000,
    weekly_standard_max: 60000,
    minimum_booking_cents: 35000,
    deposit_percentage: 30,
    balance_due_hours: 48,
  }
  const result = await evaluateChefPricing({
    serviceType: 'weekly_standard',
    guestCount: 2,
    numberOfDays: 2,
    config,
  })
  assert.equal(result.rangeLow?.totalServiceCents, 35000)
  assert.equal(result.rangeLow?.depositCents, 10500)
  assert.equal(result.rangeHigh?.totalServiceCents, 120000)
  assert.equal(result.rangeHigh?.depositCents, 36000)
  assert.ok(result.chefChecklist.some((line) => line.includes('30%')))
  assert.ok(result.chefChecklist.some((line) => line.includes('48 hours')))
  const adjusted = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
    config,
    adjustment: { type: 'custom_total', totalCents: 50000, reason: 'Chef quote' },
  })
  assert.equal(adjusted.finalDepositCents, 15000)
  assert.equal(adjusted.finalBalanceCents, 35000)
})

test('unconfigured chefs retain zero rates instead of receiving the test chef prices', async () => {
  const result = await evaluateChefPricing({
    serviceType: 'private_dinner',
    guestCount: 4,
    courseCount: 4,
  })
  assert.equal(result.breakdown.serviceFeeCents, 0)
})
