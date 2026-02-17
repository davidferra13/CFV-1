// Loyalty Program Constants
// Complements lib/loyalty/actions.ts with presentation-layer data
// Badges, milestones, and gift card templates

// ============================================================
// Culinary Badges (client achievements)
// ============================================================

export type CulinaryBadge = {
  id: string
  name: string
  description: string
  icon: string
}

export const CULINARY_BADGES: CulinaryBadge[] = [
  { id: 'first_event', name: 'First Event', description: 'Completed your first event.', icon: 'medal' },
  { id: 'tasting_menu_pro', name: 'Tasting Pro', description: 'Hosted 3+ tasting menus.', icon: 'star' },
  { id: 'world_traveler', name: 'World Traveler', description: 'Explored 5+ cuisines.', icon: 'globe' },
  { id: 'party_host', name: 'Party Host', description: 'Hosted a party of 20+ guests.', icon: 'party-popper' },
  { id: 'loyal_patron', name: 'Loyal Patron', description: 'Completed 10+ events.', icon: 'heart' },
  { id: 'big_spender', name: 'Connoisseur', description: 'Spent $10,000+ on events.', icon: 'gem' },
  { id: 'repeat_monthly', name: 'Monthly Regular', description: 'Booked events 3 months in a row.', icon: 'calendar-check' },
  { id: 'referral_champ', name: 'Referral Champion', description: 'Referred 3+ new clients.', icon: 'users' },
]

// ============================================================
// Milestone Rewards (people-served based)
// ============================================================

export type MilestoneReward = {
  id: string
  peopleServedThreshold: number
  rewardDescription: string
  rewardType: 'discount' | 'free_course' | 'upgrade'
}

export const MILESTONE_REWARDS: MilestoneReward[] = [
  { id: 'mr-100', peopleServedThreshold: 100, rewardDescription: '10% off next event', rewardType: 'discount' },
  { id: 'mr-250', peopleServedThreshold: 250, rewardDescription: 'Free appetizer course', rewardType: 'free_course' },
  { id: 'mr-500', peopleServedThreshold: 500, rewardDescription: 'Free dessert course', rewardType: 'free_course' },
  { id: 'mr-1000', peopleServedThreshold: 1000, rewardDescription: "Chef's tasting menu upgrade", rewardType: 'upgrade' },
]

// ============================================================
// Gift Card Templates
// ============================================================

export type GiftCardDesign = 'classic' | 'celebration' | 'holiday'
export type GiftCardTag = 'dinner_for_two' | 'celebration_for_four' | 'custom_amount'

export type GiftTagTemplate = {
  id: string
  tag: GiftCardTag
  label: string
  peopleServed: number
}

export const GIFT_TAG_TEMPLATES: GiftTagTemplate[] = [
  { id: 'gtt-1', tag: 'dinner_for_two', label: 'Dinner for Two', peopleServed: 2 },
  { id: 'gtt-2', tag: 'celebration_for_four', label: 'Celebration for Four', peopleServed: 4 },
  { id: 'gtt-3', tag: 'custom_amount', label: 'Custom Amount', peopleServed: 1 },
]

// ============================================================
// Tier Display Configuration
// ============================================================

export const LOYALTY_TIER_DISPLAY = {
  bronze: { label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-100', icon: 'shield' },
  silver: { label: 'Silver', color: 'text-gray-500', bg: 'bg-gray-100', icon: 'shield' },
  gold: { label: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: 'crown' },
  platinum: { label: 'Platinum', color: 'text-purple-600', bg: 'bg-purple-100', icon: 'crown' },
} as const
