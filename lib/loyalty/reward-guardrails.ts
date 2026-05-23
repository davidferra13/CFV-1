export const LOYALTY_REWARD_TYPES = [
  'free_course',
  'upgrade',
  'free_dinner',
  'discount_fixed',
  'discount_percent',
] as const

export type LoyaltyRewardGuardedType = (typeof LOYALTY_REWARD_TYPES)[number]

export const LOYALTY_MAX_FIXED_DISCOUNT_CENTS = 50_000
export const LOYALTY_MAX_PERCENT_DISCOUNT = 50

export const LOYALTY_REWARD_TYPE_LABELS: Record<LoyaltyRewardGuardedType, string> = {
  free_course: 'Complimentary course',
  upgrade: 'Experience upgrade',
  free_dinner: 'Hosted dinner',
  discount_fixed: 'Fixed discount',
  discount_percent: 'Percent discount',
}

export const LOYALTY_REWARD_GUARDRAIL_SUMMARY = [
  'Experience rewards are preferred because they deepen the relationship without hiding margin.',
  `Fixed discounts are capped at $${LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}.`,
  `Percent discounts are capped at ${LOYALTY_MAX_PERCENT_DISCOUNT}%.`,
  'A reward can use one value shape only: fixed amount, percent, or no cash value.',
  'Redemptions create pending delivery records so fulfillment remains visible.',
]

type RewardShape = {
  reward_type?: string | null
  reward_value_cents?: number | null
  reward_percent?: number | null
}

export type RewardGuardrailIssue = {
  path: keyof RewardShape
  message: string
}

function isKnownRewardType(value: string | null | undefined): value is LoyaltyRewardGuardedType {
  return LOYALTY_REWARD_TYPES.includes(value as LoyaltyRewardGuardedType)
}

export function validateLoyaltyRewardShape(
  input: RewardShape,
  options: { partial?: boolean } = {}
): RewardGuardrailIssue[] {
  const issues: RewardGuardrailIssue[] = []
  const type = input.reward_type
  const fixed = input.reward_value_cents
  const percent = input.reward_percent
  const hasFixed = fixed !== undefined && fixed !== null
  const hasPercent = percent !== undefined && percent !== null

  if (!type) {
    if (!options.partial) {
      issues.push({ path: 'reward_type', message: 'Reward type is required' })
    }
    if (hasFixed && (fixed <= 0 || fixed > LOYALTY_MAX_FIXED_DISCOUNT_CENTS)) {
      issues.push({
        path: 'reward_value_cents',
        message: `Fixed discounts must be between $0.01 and $${LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}`,
      })
    }
    if (hasPercent && (percent <= 0 || percent > LOYALTY_MAX_PERCENT_DISCOUNT)) {
      issues.push({
        path: 'reward_percent',
        message: `Percent discounts must be between 1 and ${LOYALTY_MAX_PERCENT_DISCOUNT}`,
      })
    }
    return issues
  }

  if (!isKnownRewardType(type)) {
    issues.push({ path: 'reward_type', message: 'Reward type is not supported' })
    return issues
  }

  if (type === 'discount_fixed') {
    if (!hasFixed) {
      issues.push({ path: 'reward_value_cents', message: 'Fixed discounts require an amount' })
    } else if (fixed <= 0 || fixed > LOYALTY_MAX_FIXED_DISCOUNT_CENTS) {
      issues.push({
        path: 'reward_value_cents',
        message: `Fixed discounts must be between $0.01 and $${LOYALTY_MAX_FIXED_DISCOUNT_CENTS / 100}`,
      })
    }
    if (hasPercent) {
      issues.push({
        path: 'reward_percent',
        message: 'Fixed discounts cannot also include a percent value',
      })
    }
    return issues
  }

  if (type === 'discount_percent') {
    if (!hasPercent) {
      issues.push({ path: 'reward_percent', message: 'Percent discounts require a percent value' })
    } else if (percent <= 0 || percent > LOYALTY_MAX_PERCENT_DISCOUNT) {
      issues.push({
        path: 'reward_percent',
        message: `Percent discounts must be between 1 and ${LOYALTY_MAX_PERCENT_DISCOUNT}`,
      })
    }
    if (hasFixed) {
      issues.push({
        path: 'reward_value_cents',
        message: 'Percent discounts cannot also include a fixed amount',
      })
    }
    return issues
  }

  if (hasFixed || hasPercent) {
    issues.push({
      path: hasFixed ? 'reward_value_cents' : 'reward_percent',
      message: `${LOYALTY_REWARD_TYPE_LABELS[type]} rewards cannot include cash discount values`,
    })
  }

  return issues
}

export function assertValidLoyaltyRewardShape(
  input: RewardShape,
  options: { partial?: boolean } = {}
) {
  const issues = validateLoyaltyRewardShape(input, options)
  if (issues.length > 0) {
    throw new Error(issues[0].message)
  }
}
