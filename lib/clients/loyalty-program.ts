import {
  awardBonusPoints,
  getClientLoyaltyProfile,
  getRewards,
  redeemReward,
} from '@/lib/loyalty/actions'

export async function getClientLoyaltySummary(clientId: string) {
  const profile = await getClientLoyaltyProfile(clientId)
  return {
    tier: profile.currentTier,
    pointsBalance: profile.pointsBalance,
    nextTierName: profile.nextTierName,
    pointsToNextTier: profile.pointsToNextTier,
    totalEventsCompleted: profile.totalEventsCompleted,
    totalGuestsServed: profile.totalGuestsServed,
    lifetimePointsEarned: profile.lifetimePointsEarned,
    availableRewardsCount: profile.availableRewards.length,
    nextMilestone: profile.nextMilestone,
  }
}

export async function getLoyaltyRewardCatalog() {
  return getRewards()
}

export async function awardClientLoyaltyBonus(clientId: string, points: number, reason: string) {
  return awardBonusPoints(clientId, points, reason)
}

export async function redeemClientLoyaltyReward(
  clientId: string,
  rewardId: string,
  eventId?: string
) {
  return redeemReward(clientId, rewardId, eventId)
}
