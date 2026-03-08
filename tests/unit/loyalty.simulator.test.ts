import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeLoyaltyConfig,
  simulateLoyaltyProgram,
  type LoyaltyProgramConfig,
  type LoyaltyProgramReward,
} from '@/lib/loyalty/simulator'

const rewardCatalog: LoyaltyProgramReward[] = [
  {
    id: 'reward-50',
    name: 'Appetizer',
    description: null,
    points_required: 50,
    reward_type: 'free_course',
    reward_value_cents: null,
    reward_percent: null,
    sort_order: 0,
  },
  {
    id: 'reward-120',
    name: '$30 off',
    description: null,
    points_required: 120,
    reward_type: 'discount_fixed',
    reward_value_cents: 3000,
    reward_percent: null,
    sort_order: 1,
  },
  {
    id: 'reward-200',
    name: 'Upgrade',
    description: null,
    points_required: 200,
    reward_type: 'upgrade',
    reward_value_cents: null,
    reward_percent: null,
    sort_order: 2,
  },
]

function createConfig(overrides: Partial<LoyaltyProgramConfig> = {}): LoyaltyProgramConfig {
  return normalizeLoyaltyConfig({
    points_per_guest: 10,
    bonus_large_party_threshold: 8,
    bonus_large_party_points: 20,
    milestone_bonuses: [{ events: 5, bonus: 50 }],
    tier_bronze_min: 0,
    tier_silver_min: 200,
    tier_gold_min: 500,
    tier_platinum_min: 1000,
    is_active: true,
    welcome_points: 25,
    referral_points: 100,
    program_mode: 'full',
    earn_mode: 'per_guest',
    points_per_dollar: 1,
    points_per_event: 100,
    ...overrides,
  })
}

test('full mode stacks welcome, base, and milestone points and unlocks rewards in order', () => {
  const result = simulateLoyaltyProgram({
    config: createConfig(),
    rewards: rewardCatalog,
    guestsPerEvent: 2,
    plannedEvents: 5,
    includeWelcomeBonus: true,
  })

  assert.equal(result.totalPointsAdded, 175)
  assert.equal(result.pointsEarnedFromEvents, 150)
  assert.equal(result.endingPointsBalance, 175)
  assert.equal(result.endingTier, 'bronze')
  assert.equal(result.valueToNextTier, 25)
  assert.deepEqual(
    result.unlockedRewards.map((entry) => ({
      id: entry.reward.id,
      unlockedAtPlanEvent: entry.unlockedAtPlanEvent,
      unlockedBy: entry.unlockedBy,
    })),
    [
      { id: 'reward-50', unlockedAtPlanEvent: 2, unlockedBy: 'event' },
      { id: 'reward-120', unlockedAtPlanEvent: 5, unlockedBy: 'event' },
    ]
  )
  assert.equal(result.timeline[4].milestoneBonusPoints, 50)
})

test('per-dollar mode applies spend-based earn, large-party bonus, and milestone bonus', () => {
  const result = simulateLoyaltyProgram({
    config: createConfig({
      welcome_points: 0,
      earn_mode: 'per_dollar',
      points_per_dollar: 1.5,
      bonus_large_party_threshold: 10,
      bonus_large_party_points: 40,
      milestone_bonuses: [{ events: 3, bonus: 60 }],
      tier_silver_min: 1500,
      tier_gold_min: 3000,
      tier_platinum_min: 4500,
    }),
    rewards: rewardCatalog,
    guestsPerEvent: 12,
    plannedEvents: 3,
    eventTotalCents: 100000,
    includeWelcomeBonus: false,
  })

  assert.equal(result.pointsEarnedFromEvents, 4680)
  assert.equal(result.totalPointsAdded, 4680)
  assert.equal(result.endingTier, 'platinum')
  assert.equal(result.timeline[0].basePoints, 1500)
  assert.equal(result.timeline[0].largePartyBonusPoints, 40)
  assert.equal(result.timeline[2].milestoneBonusPoints, 60)
  assert.equal(result.unlockedRewards.length, 3)
})

test('lite mode uses dinner count for tier progression and ignores point balances', () => {
  const result = simulateLoyaltyProgram({
    config: createConfig({
      program_mode: 'lite',
      tier_silver_min: 3,
      tier_gold_min: 5,
      tier_platinum_min: 8,
      welcome_points: 25,
    }),
    rewards: rewardCatalog,
    guestsPerEvent: 2,
    plannedEvents: 5,
    includeWelcomeBonus: true,
  })

  assert.equal(result.totalPointsAdded, 0)
  assert.equal(result.endingPointsBalance, 0)
  assert.equal(result.endingEventsCompleted, 5)
  assert.equal(result.endingTier, 'gold')
  assert.equal(result.nextTierName, 'platinum')
  assert.equal(result.valueToNextTier, 3)
  assert.equal(result.unlockedRewards.length, 0)
  assert.equal(
    result.timeline
      .filter((entry) => entry.tierChanged)
      .map((entry) => entry.planEventIndex)
      .join(','),
    '3,5'
  )
})
