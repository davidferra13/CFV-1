// Loyalty Visibility Types
// Client-facing loyalty data: what the client sees about their tier,
// progress, perks, and redemption history.

import type { LoyaltyTierName, LoyaltyPerk } from './loyalty-types'

/** Color palette for tier badges in client UI */
export const TIER_COLORS: Record<LoyaltyTierName, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
}

/** Human-readable tier labels */
export const TIER_LABELS: Record<LoyaltyTierName, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

/** Progress bar data for the client tier progress UI */
export type TierProgressBar = {
  /** Current tier name */
  currentTier: LoyaltyTierName
  /** Next tier name, or null if at platinum */
  nextTier: LoyaltyTierName | null
  /** 0-100 percentage toward next tier (average of events + spend progress) */
  progressPercent: number
  /** Events completed toward next tier threshold */
  eventsCompleted: number
  /** Events required for next tier (null if at max) */
  eventsRequired: number | null
  /** Spend in cents toward next tier threshold */
  spendCents: number
  /** Spend required for next tier in cents (null if at max) */
  spendRequiredCents: number | null
}

/** A single perk redemption record */
export type LoyaltyPerkRedemption = {
  id: string
  perkKey: string
  perkLabel: string
  redeemedAt: string
  eventId: string | null
  amountCents: number
  description: string
}

/** Full client-facing loyalty view (used on loyalty detail page) */
export type ClientLoyaltyView = {
  /** Current tier */
  tier: LoyaltyTierName
  /** Display label for the tier */
  tierLabel: string
  /** Hex color for the tier badge */
  tierColor: string
  /** Total completed events with this chef */
  totalEvents: number
  /** Total lifetime spend in cents */
  totalSpendCents: number
  /** Days since first event */
  tenureDays: number
  /** Current loyalty points balance */
  pointsBalance: number
  /** Perks available at the current tier */
  availablePerks: LoyaltyPerk[]
  /** Discount percentage for the current tier */
  discountPercent: number
  /** Progress toward next tier */
  progress: TierProgressBar
  /** Past perk redemptions */
  redemptionHistory: LoyaltyPerkRedemption[]
}

/** Lightweight badge data for portal header */
export type LoyaltyBadgeData = {
  tier: LoyaltyTierName
  tierLabel: string
  tierColor: string
} | null
