// Marketplace Platform Definitions
// Central registry of all marketplace platforms that chefs use to find clients.
// Used by: convert banners, commission tracking, source analytics, command center.

export type MarketplacePlatform = {
  channel: string
  label: string
  shortLabel: string
  defaultCommissionPercent: number
  tier: 'major' | 'lead_gen' | 'niche'
}

export const MARKETPLACE_PLATFORMS: MarketplacePlatform[] = [
  {
    channel: 'take_a_chef',
    label: 'Take a Chef',
    shortLabel: 'TAC',
    defaultCommissionPercent: 25,
    tier: 'major',
  },
  {
    channel: 'yhangry',
    label: 'Yhangry',
    shortLabel: 'Yhangry',
    defaultCommissionPercent: 25,
    tier: 'major',
  },
  {
    channel: 'cozymeal',
    label: 'Cozymeal',
    shortLabel: 'Cozymeal',
    defaultCommissionPercent: 20,
    tier: 'major',
  },
  {
    channel: 'bark',
    label: 'Bark',
    shortLabel: 'Bark',
    defaultCommissionPercent: 0, // pay-per-lead, not commission
    tier: 'lead_gen',
  },
  {
    channel: 'thumbtack',
    label: 'Thumbtack',
    shortLabel: 'Thumbtack',
    defaultCommissionPercent: 0, // pay-per-lead
    tier: 'lead_gen',
  },
  {
    channel: 'gigsalad',
    label: 'GigSalad',
    shortLabel: 'GigSalad',
    defaultCommissionPercent: 10,
    tier: 'niche',
  },
  {
    channel: 'theknot',
    label: 'The Knot / WeddingWire',
    shortLabel: 'The Knot',
    defaultCommissionPercent: 0, // listing fee
    tier: 'niche',
  },
]

// All marketplace channel values for quick lookup
export const MARKETPLACE_CHANNELS = new Set(MARKETPLACE_PLATFORMS.map((p) => p.channel))

// Check if a channel or referral_source is from a marketplace
export function isMarketplaceSource(channelOrSource: string | null | undefined): boolean {
  if (!channelOrSource) return false
  return MARKETPLACE_CHANNELS.has(channelOrSource)
}

// Get platform config by channel
export function getMarketplacePlatform(
  channel: string | null | undefined
): MarketplacePlatform | null {
  if (!channel) return null
  return MARKETPLACE_PLATFORMS.find((p) => p.channel === channel) ?? null
}
