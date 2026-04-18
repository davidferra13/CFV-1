// Loyalty pure helpers shared between actions (session-shaped) and store (tenant-explicit).
// No DB calls, no 'use server', no side effects.

import type { LoyaltyConfig, LoyaltyTier } from './actions'

export function computeTier(lifetimePoints: number, config: LoyaltyConfig): LoyaltyTier {
  if (lifetimePoints >= config.tier_platinum_min) return 'platinum'
  if (lifetimePoints >= config.tier_gold_min) return 'gold'
  if (lifetimePoints >= config.tier_silver_min) return 'silver'
  return 'bronze'
}

export function getNextTier(currentTier: LoyaltyTier): { name: string; key: LoyaltyTier } | null {
  const order: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum']
  const idx = order.indexOf(currentTier)
  if (idx >= order.length - 1) return null
  return { name: order[idx + 1], key: order[idx + 1] }
}

export function getTierThreshold(tier: LoyaltyTier, config: LoyaltyConfig): number {
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
