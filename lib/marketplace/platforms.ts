// Marketplace Platform Definitions
// Central registry of all marketplace platforms that chefs use to find clients.
// Used by: convert banners, commission tracking, source analytics, command center.

export type MarketplacePlatform = {
  channel: string
  label: string
  shortLabel: string
  defaultCommissionPercent: number
  tier: 'major' | 'lead_gen' | 'niche'
  slaHours: number
  deepLinkTemplate: string | null
}

export const MARKETPLACE_PLATFORMS: MarketplacePlatform[] = [
  {
    channel: 'take_a_chef',
    label: 'Take a Chef',
    shortLabel: 'TAC',
    defaultCommissionPercent: 25,
    tier: 'major',
    slaHours: 24,
    deepLinkTemplate: 'https://www.takeachef.com/chef-dashboard/bookings',
  },
  {
    channel: 'yhangry',
    label: 'Yhangry',
    shortLabel: 'Yhangry',
    defaultCommissionPercent: 25,
    tier: 'major',
    slaHours: 24,
    deepLinkTemplate: 'https://yhangry.com/chef/dashboard',
  },
  {
    channel: 'cozymeal',
    label: 'Cozymeal',
    shortLabel: 'Cozymeal',
    defaultCommissionPercent: 20,
    tier: 'major',
    slaHours: 24,
    deepLinkTemplate: 'https://www.cozymeal.com/chef/dashboard',
  },
  {
    channel: 'bark',
    label: 'Bark',
    shortLabel: 'Bark',
    defaultCommissionPercent: 0, // pay-per-lead, not commission
    tier: 'lead_gen',
    slaHours: 24,
    deepLinkTemplate: 'https://www.bark.com/pro/dashboard',
  },
  {
    channel: 'thumbtack',
    label: 'Thumbtack',
    shortLabel: 'Thumbtack',
    defaultCommissionPercent: 0, // pay-per-lead
    tier: 'lead_gen',
    slaHours: 4,
    deepLinkTemplate: 'https://www.thumbtack.com/pro/dashboard',
  },
  {
    channel: 'gigsalad',
    label: 'GigSalad',
    shortLabel: 'GigSalad',
    defaultCommissionPercent: 10,
    tier: 'niche',
    slaHours: 24,
    deepLinkTemplate: 'https://www.gigsalad.com/member/dashboard',
  },
  {
    channel: 'theknot',
    label: 'The Knot / WeddingWire',
    shortLabel: 'The Knot',
    defaultCommissionPercent: 0, // listing fee
    tier: 'niche',
    slaHours: 48,
    deepLinkTemplate: 'https://www.theknot.com/marketplace/dashboard',
  },
  {
    channel: 'privatechefmanager',
    label: 'Private Chef Manager',
    shortLabel: 'PCM',
    defaultCommissionPercent: 2.9,
    tier: 'niche',
    slaHours: 24,
    deepLinkTemplate: null,
  },
  {
    channel: 'hireachef',
    label: 'Hire a Chef (USPCA)',
    shortLabel: 'USPCA',
    defaultCommissionPercent: 0, // directory listing
    tier: 'niche',
    slaHours: 48,
    deepLinkTemplate: null,
  },
  {
    channel: 'cuisineistchef',
    label: 'Cuisinist Chef',
    shortLabel: 'Cuisinist',
    defaultCommissionPercent: 15,
    tier: 'niche',
    slaHours: 24,
    deepLinkTemplate: null,
  },
  {
    channel: 'google_business',
    label: 'Google Business Profile',
    shortLabel: 'GBP',
    defaultCommissionPercent: 0,
    tier: 'lead_gen',
    slaHours: 24,
    deepLinkTemplate: 'https://business.google.com',
  },
  {
    channel: 'wix',
    label: 'Wix Website',
    shortLabel: 'Wix',
    defaultCommissionPercent: 0,
    tier: 'niche',
    slaHours: 48,
    deepLinkTemplate: null,
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
