export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type ProgramMode = 'full' | 'lite' | 'off'
export type EarnMode = 'per_guest' | 'per_dollar' | 'per_event'
export type LoyaltyRewardType =
  | 'discount_fixed'
  | 'discount_percent'
  | 'free_course'
  | 'free_dinner'
  | 'upgrade'

export type LoyaltyProgramConfig = {
  points_per_guest: number
  bonus_large_party_threshold: number | null
  bonus_large_party_points: number | null
  milestone_bonuses: Array<{ events: number; bonus: number }>
  tier_bronze_min: number
  tier_silver_min: number
  tier_gold_min: number
  tier_platinum_min: number
  is_active: boolean
  welcome_points: number
  referral_points: number
  program_mode: ProgramMode
  earn_mode: EarnMode
  points_per_dollar: number
  points_per_event: number
}

export type LoyaltyProgramReward = {
  id: string
  name: string
  description: string | null
  points_required: number
  reward_type: LoyaltyRewardType
  reward_value_cents: number | null
  reward_percent: number | null
  sort_order?: number | null
}

export type LoyaltySimulationStartingProgress = {
  startingEventsCompleted?: number
  startingPointsBalance?: number
  startingLifetimePointsEarned?: number
}

export type LoyaltySimulationTimelineEntry = {
  planEventIndex: number
  totalEventsCompleted: number
  guestsPerEvent: number
  basePoints: number
  largePartyBonusPoints: number
  milestoneBonusPoints: number
  totalPointsEarned: number
  cumulativePointsBalance: number
  cumulativeLifetimePointsEarned: number
  tierBefore: LoyaltyTier
  tierAfter: LoyaltyTier
  tierChanged: boolean
  unlockedRewards: LoyaltyProgramReward[]
}

export type LoyaltySimulationUnlockedReward = {
  reward: LoyaltyProgramReward
  unlockedAtPlanEvent: number | null
  unlockedBy: 'welcome_bonus' | 'event'
}

export type LoyaltySimulationResult = {
  programMode: ProgramMode
  earnMode: EarnMode
  guestsPerEvent: number
  plannedEvents: number
  eventTotalCents: number
  totalGuestsAdded: number
  startingEventsCompleted: number
  endingEventsCompleted: number
  startingPointsBalance: number
  endingPointsBalance: number
  startingLifetimePointsEarned: number
  endingLifetimePointsEarned: number
  welcomeBonusApplied: number
  pointsEarnedFromEvents: number
  totalPointsAdded: number
  startingTier: LoyaltyTier
  endingTier: LoyaltyTier
  nextTierName: LoyaltyTier | null
  valueToNextTier: number
  nextReward: LoyaltyProgramReward | null
  pointsToNextReward: number | null
  unlockedRewards: LoyaltySimulationUnlockedReward[]
  timeline: LoyaltySimulationTimelineEntry[]
}

export const DEFAULT_LOYALTY_SIMULATOR_CONFIG: LoyaltyProgramConfig = {
  points_per_guest: 10,
  bonus_large_party_threshold: 8,
  bonus_large_party_points: 20,
  milestone_bonuses: [
    { events: 5, bonus: 50 },
    { events: 10, bonus: 100 },
  ],
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
}

export const DEFAULT_LOYALTY_SIMULATOR_REWARDS: LoyaltyProgramReward[] = [
  {
    id: 'default-reward-appetizer',
    name: 'Complimentary appetizer course',
    description: 'A bonus appetizer course added to your next dinner.',
    points_required: 50,
    reward_type: 'free_course',
    reward_value_cents: null,
    reward_percent: null,
    sort_order: 0,
  },
  {
    id: 'default-reward-dessert',
    name: 'Complimentary dessert course',
    description: 'A bonus dessert course added to your next dinner.',
    points_required: 75,
    reward_type: 'free_course',
    reward_value_cents: null,
    reward_percent: null,
    sort_order: 1,
  },
  {
    id: 'default-reward-fixed-discount',
    name: '$25 off your next dinner',
    description: '$25 discount on your next booking.',
    points_required: 100,
    reward_type: 'discount_fixed',
    reward_value_cents: 2500,
    reward_percent: null,
    sort_order: 2,
  },
  {
    id: 'default-reward-percent-discount',
    name: '15% off dinner for two',
    description: '15% discount on a dinner for two.',
    points_required: 150,
    reward_type: 'discount_percent',
    reward_value_cents: null,
    reward_percent: 15,
    sort_order: 3,
  },
  {
    id: 'default-reward-upgrade',
    name: "Chef's tasting menu experience",
    description: 'Bonus courses and elevated presentation on your next dinner.',
    points_required: 200,
    reward_type: 'upgrade',
    reward_value_cents: null,
    reward_percent: null,
    sort_order: 4,
  },
  {
    id: 'default-reward-large-discount',
    name: '50% off a dinner for two',
    description: 'Half-price dinner for two.',
    points_required: 250,
    reward_type: 'discount_percent',
    reward_value_cents: null,
    reward_percent: 50,
    sort_order: 5,
  },
  {
    id: 'default-reward-free-dinner',
    name: 'Free dinner for two',
    description: 'Complimentary dinner for two (ingredients billed separately).',
    points_required: 300,
    reward_type: 'free_dinner',
    reward_value_cents: null,
    reward_percent: null,
    sort_order: 6,
  },
]

function clampInteger(value: number, min: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.round(value))
}

function clampNumber(value: number, min: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, value)
}

export function normalizeLoyaltyConfig(
  partial?: Partial<LoyaltyProgramConfig> | null
): LoyaltyProgramConfig {
  const config: LoyaltyProgramConfig = {
    ...DEFAULT_LOYALTY_SIMULATOR_CONFIG,
    ...partial,
    milestone_bonuses:
      partial?.milestone_bonuses?.map((milestone) => ({
        events: clampInteger(milestone.events, 1),
        bonus: clampInteger(milestone.bonus, 1),
      })) ?? DEFAULT_LOYALTY_SIMULATOR_CONFIG.milestone_bonuses,
  }

  return {
    ...config,
    points_per_guest: clampInteger(config.points_per_guest, 1),
    bonus_large_party_threshold:
      config.bonus_large_party_threshold === null
        ? null
        : clampInteger(config.bonus_large_party_threshold, 1),
    bonus_large_party_points:
      config.bonus_large_party_points === null
        ? null
        : clampInteger(config.bonus_large_party_points, 0),
    tier_bronze_min: 0,
    tier_silver_min: clampInteger(config.tier_silver_min, 1),
    tier_gold_min: clampInteger(config.tier_gold_min, 2),
    tier_platinum_min: clampInteger(config.tier_platinum_min, 3),
    welcome_points: clampInteger(config.welcome_points, 0),
    referral_points: clampInteger(config.referral_points, 0),
    points_per_dollar: clampNumber(config.points_per_dollar, 0.01),
    points_per_event: clampInteger(config.points_per_event, 1),
    milestone_bonuses: [...config.milestone_bonuses].sort((a, b) => a.events - b.events),
  }
}

export function sortRewards(rewards: LoyaltyProgramReward[]): LoyaltyProgramReward[] {
  return [...rewards].sort((left, right) => {
    const byPoints = left.points_required - right.points_required
    if (byPoints !== 0) return byPoints
    return (left.sort_order ?? 0) - (right.sort_order ?? 0)
  })
}

export function computeTierFromConfigMetric(
  metricValue: number,
  config: LoyaltyProgramConfig
): LoyaltyTier {
  if (metricValue >= config.tier_platinum_min) return 'platinum'
  if (metricValue >= config.tier_gold_min) return 'gold'
  if (metricValue >= config.tier_silver_min) return 'silver'
  return 'bronze'
}

export function getTierThreshold(tier: LoyaltyTier, config: LoyaltyProgramConfig): number {
  switch (tier) {
    case 'bronze':
      return config.tier_bronze_min
    case 'silver':
      return config.tier_silver_min
    case 'gold':
      return config.tier_gold_min
    case 'platinum':
      return config.tier_platinum_min
  }
}

export function getNextTier(tier: LoyaltyTier): LoyaltyTier | null {
  switch (tier) {
    case 'bronze':
      return 'silver'
    case 'silver':
      return 'gold'
    case 'gold':
      return 'platinum'
    case 'platinum':
      return null
  }
}

export function estimateEventPoints(input: {
  config: LoyaltyProgramConfig
  guestsPerEvent: number
  eventTotalCents: number
}): number {
  const guestsPerEvent = clampInteger(input.guestsPerEvent, 1)
  const eventTotalCents = clampInteger(input.eventTotalCents, 0)

  switch (input.config.earn_mode) {
    case 'per_dollar':
      return Math.round((eventTotalCents / 100) * input.config.points_per_dollar)
    case 'per_event':
      return input.config.points_per_event
    case 'per_guest':
    default:
      return guestsPerEvent * input.config.points_per_guest
  }
}

export function simulateLoyaltyProgram(input: {
  config: Partial<LoyaltyProgramConfig> | LoyaltyProgramConfig | null | undefined
  rewards?: LoyaltyProgramReward[]
  guestsPerEvent: number
  plannedEvents: number
  eventTotalCents?: number
  includeWelcomeBonus?: boolean
  startingProgress?: LoyaltySimulationStartingProgress
}): LoyaltySimulationResult {
  const config = normalizeLoyaltyConfig(input.config)
  const rewards = sortRewards(
    input.rewards && input.rewards.length > 0 ? input.rewards : DEFAULT_LOYALTY_SIMULATOR_REWARDS
  )
  const guestsPerEvent = clampInteger(input.guestsPerEvent, 1)
  const plannedEvents = clampInteger(input.plannedEvents, 0)
  const eventTotalCents = clampInteger(input.eventTotalCents ?? 0, 0)
  const startingEventsCompleted = clampInteger(
    input.startingProgress?.startingEventsCompleted ?? 0,
    0
  )
  const startingPointsBalance = clampInteger(input.startingProgress?.startingPointsBalance ?? 0, 0)
  const startingLifetimePointsEarned = clampInteger(
    input.startingProgress?.startingLifetimePointsEarned ?? startingPointsBalance,
    0
  )

  const metricAtStart =
    config.program_mode === 'lite' ? startingEventsCompleted : startingLifetimePointsEarned
  const startingTier = computeTierFromConfigMetric(metricAtStart, config)
  const totalGuestsAdded = guestsPerEvent * plannedEvents

  if (!config.is_active || config.program_mode === 'off') {
    return {
      programMode: 'off',
      earnMode: config.earn_mode,
      guestsPerEvent,
      plannedEvents,
      eventTotalCents,
      totalGuestsAdded,
      startingEventsCompleted,
      endingEventsCompleted: startingEventsCompleted,
      startingPointsBalance,
      endingPointsBalance: startingPointsBalance,
      startingLifetimePointsEarned,
      endingLifetimePointsEarned: startingLifetimePointsEarned,
      welcomeBonusApplied: 0,
      pointsEarnedFromEvents: 0,
      totalPointsAdded: 0,
      startingTier,
      endingTier: startingTier,
      nextTierName: null,
      valueToNextTier: 0,
      nextReward: null,
      pointsToNextReward: null,
      unlockedRewards: [],
      timeline: [],
    }
  }

  let pointsBalance = startingPointsBalance
  let lifetimePointsEarned = startingLifetimePointsEarned
  let totalEventsCompleted = startingEventsCompleted
  let welcomeBonusApplied = 0
  let pointsEarnedFromEvents = 0
  const timeline: LoyaltySimulationTimelineEntry[] = []
  const unlockedRewards: LoyaltySimulationUnlockedReward[] = []
  const unlockedRewardIds = new Set<string>()

  function unlockRewards(unlockedBy: 'welcome_bonus' | 'event', eventIndex: number | null) {
    if (config.program_mode !== 'full') return

    for (const reward of rewards) {
      if (reward.points_required > pointsBalance || unlockedRewardIds.has(reward.id)) {
        continue
      }

      unlockedRewardIds.add(reward.id)
      unlockedRewards.push({
        reward,
        unlockedAtPlanEvent: eventIndex,
        unlockedBy,
      })
    }
  }

  if (
    config.program_mode === 'full' &&
    input.includeWelcomeBonus !== false &&
    config.welcome_points > 0
  ) {
    welcomeBonusApplied = config.welcome_points
    pointsBalance += config.welcome_points
    lifetimePointsEarned += config.welcome_points
    unlockRewards('welcome_bonus', null)
  }

  for (let index = 0; index < plannedEvents; index += 1) {
    totalEventsCompleted += 1

    const tierBefore = computeTierFromConfigMetric(
      config.program_mode === 'lite' ? totalEventsCompleted - 1 : lifetimePointsEarned,
      config
    )

    const basePoints =
      config.program_mode === 'full'
        ? estimateEventPoints({
            config,
            guestsPerEvent,
            eventTotalCents,
          })
        : 0

    const largePartyBonusPoints =
      config.program_mode === 'full' &&
      config.bonus_large_party_threshold !== null &&
      guestsPerEvent >= config.bonus_large_party_threshold
        ? (config.bonus_large_party_points ?? 0)
        : 0

    const milestoneBonusPoints =
      config.program_mode === 'full'
        ? config.milestone_bonuses
            .filter((milestone) => milestone.events === totalEventsCompleted)
            .reduce((sum, milestone) => sum + milestone.bonus, 0)
        : 0

    const totalPointsEarned = basePoints + largePartyBonusPoints + milestoneBonusPoints

    if (config.program_mode === 'full') {
      pointsBalance += totalPointsEarned
      lifetimePointsEarned += totalPointsEarned
      pointsEarnedFromEvents += totalPointsEarned
    }

    const unlockedBeforeEvent = new Set(unlockedRewardIds)
    unlockRewards('event', index + 1)
    const unlockedRewardsThisEvent = unlockedRewards
      .filter(
        (entry) =>
          entry.unlockedAtPlanEvent === index + 1 && !unlockedBeforeEvent.has(entry.reward.id)
      )
      .map((entry) => entry.reward)

    const tierAfter = computeTierFromConfigMetric(
      config.program_mode === 'lite' ? totalEventsCompleted : lifetimePointsEarned,
      config
    )

    timeline.push({
      planEventIndex: index + 1,
      totalEventsCompleted,
      guestsPerEvent,
      basePoints,
      largePartyBonusPoints,
      milestoneBonusPoints,
      totalPointsEarned,
      cumulativePointsBalance: pointsBalance,
      cumulativeLifetimePointsEarned: lifetimePointsEarned,
      tierBefore,
      tierAfter,
      tierChanged: tierBefore !== tierAfter,
      unlockedRewards: unlockedRewardsThisEvent,
    })
  }

  const endingMetric = config.program_mode === 'lite' ? totalEventsCompleted : lifetimePointsEarned
  const endingTier = computeTierFromConfigMetric(endingMetric, config)
  const nextTierName = getNextTier(endingTier)
  const valueToNextTier = nextTierName
    ? Math.max(0, getTierThreshold(nextTierName, config) - endingMetric)
    : 0
  const nextReward =
    config.program_mode === 'full'
      ? (rewards.find((reward) => reward.points_required > pointsBalance) ?? null)
      : null

  return {
    programMode: config.program_mode,
    earnMode: config.earn_mode,
    guestsPerEvent,
    plannedEvents,
    eventTotalCents,
    totalGuestsAdded,
    startingEventsCompleted,
    endingEventsCompleted: totalEventsCompleted,
    startingPointsBalance,
    endingPointsBalance: pointsBalance,
    startingLifetimePointsEarned,
    endingLifetimePointsEarned: lifetimePointsEarned,
    welcomeBonusApplied,
    pointsEarnedFromEvents,
    totalPointsAdded: welcomeBonusApplied + pointsEarnedFromEvents,
    startingTier,
    endingTier,
    nextTierName,
    valueToNextTier,
    nextReward,
    pointsToNextReward: nextReward ? Math.max(0, nextReward.points_required - pointsBalance) : null,
    unlockedRewards,
    timeline,
  }
}
