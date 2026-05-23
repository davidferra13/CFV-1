import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LOYALTY_MAX_FIXED_DISCOUNT_CENTS,
  LOYALTY_MAX_PERCENT_DISCOUNT,
  validateLoyaltyRewardShape,
} from '@/lib/loyalty/reward-guardrails'

test('accepts experience rewards without cash discount values', () => {
  assert.deepEqual(
    validateLoyaltyRewardShape({
      reward_type: 'upgrade',
      reward_value_cents: null,
      reward_percent: null,
    }),
    []
  )
})

test('rejects experience rewards with cash discount values', () => {
  const issues = validateLoyaltyRewardShape({
    reward_type: 'free_course',
    reward_value_cents: 2_500,
    reward_percent: null,
  })

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /cannot include cash discount values/)
})

test('requires fixed discounts to include one bounded fixed amount only', () => {
  assert.deepEqual(
    validateLoyaltyRewardShape({
      reward_type: 'discount_fixed',
      reward_value_cents: LOYALTY_MAX_FIXED_DISCOUNT_CENTS,
      reward_percent: null,
    }),
    []
  )

  assert.match(
    validateLoyaltyRewardShape({
      reward_type: 'discount_fixed',
      reward_value_cents: LOYALTY_MAX_FIXED_DISCOUNT_CENTS + 1,
      reward_percent: null,
    })[0].message,
    /Fixed discounts/
  )

  assert.match(
    validateLoyaltyRewardShape({
      reward_type: 'discount_fixed',
      reward_value_cents: 2_500,
      reward_percent: 10,
    })[0].message,
    /cannot also include a percent/
  )
})

test('requires percent discounts to include one bounded percent only', () => {
  assert.deepEqual(
    validateLoyaltyRewardShape({
      reward_type: 'discount_percent',
      reward_value_cents: null,
      reward_percent: LOYALTY_MAX_PERCENT_DISCOUNT,
    }),
    []
  )

  assert.match(
    validateLoyaltyRewardShape({
      reward_type: 'discount_percent',
      reward_value_cents: null,
      reward_percent: LOYALTY_MAX_PERCENT_DISCOUNT + 1,
    })[0].message,
    /Percent discounts/
  )

  assert.match(
    validateLoyaltyRewardShape({
      reward_type: 'discount_percent',
      reward_value_cents: 2_500,
      reward_percent: 10,
    })[0].message,
    /cannot also include a fixed amount/
  )
})
