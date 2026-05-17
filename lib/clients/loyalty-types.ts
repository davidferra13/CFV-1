// Loyalty Tier Configuration Types
// Chef-configurable tier definitions, perks, and client loyalty profiles

export type LoyaltyTierName = 'bronze' | 'silver' | 'gold' | 'platinum'

export type LoyaltyPerk = {
  key: string
  label: string
  description: string
}

export type TierConfig = {
  id: string
  tenantId: string
  tier: LoyaltyTierName
  minEvents: number
  minSpendCents: number
  discountPercent: number
  perksJson: LoyaltyPerk[]
  createdAt: string
}

export type LoyaltyProfile = {
  clientId: string
  clientName: string
  tier: LoyaltyTierName
  totalEvents: number
  totalSpendCents: number
  tenureDays: number
  pointsBalance: number
  lifetimePointsEarned: number
  perksUnlocked: LoyaltyPerk[]
  nextTier: LoyaltyTierName | null
  eventsToNextTier: number | null
  spendToNextTierCents: number | null
}

export type ChefLoyaltyOverviewEntry = {
  clientId: string
  clientName: string
  tier: LoyaltyTierName
  totalEvents: number
  totalSpendCents: number
  tenureDays: number
  pointsBalance: number
  lastEventDate: string | null
}

/** Default perk catalog for seeding new tier configs */
export const DEFAULT_TIER_PERKS: Record<LoyaltyTierName, LoyaltyPerk[]> = {
  bronze: [],
  silver: [
    {
      key: 'priority_booking',
      label: 'Priority booking',
      description: 'Book preferred dates before general availability',
    },
  ],
  gold: [
    {
      key: 'priority_booking',
      label: 'Priority booking',
      description: 'Book preferred dates before general availability',
    },
    {
      key: 'complimentary_course',
      label: 'Complimentary amuse-bouche',
      description: 'A surprise bite to start every dinner',
    },
    {
      key: 'menu_preview',
      label: 'Early menu access',
      description: 'Preview seasonal menus before they publish',
    },
  ],
  platinum: [
    {
      key: 'priority_booking',
      label: 'Priority booking',
      description: 'Book preferred dates before general availability',
    },
    {
      key: 'complimentary_course',
      label: 'Complimentary amuse-bouche',
      description: 'A surprise bite to start every dinner',
    },
    {
      key: 'menu_preview',
      label: 'Early menu access',
      description: 'Preview seasonal menus before they publish',
    },
    {
      key: 'custom_menu',
      label: 'Custom menu consultation',
      description: 'One-on-one menu planning for every event',
    },
    {
      key: 'annual_dinner',
      label: 'Annual appreciation dinner',
      description: 'A complimentary celebration dinner each year',
    },
  ],
}
