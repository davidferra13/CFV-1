// Marketing spend channel labels and types - no 'use server' (safe to import from client components)

export type MarketingSpendEntry = {
  id: string
  chef_id: string
  amount_cents: number
  channel: string
  description: string | null
  spend_date: string
  created_at: string
}

export type MarketingSpendChannel =
  | 'facebook_ads'
  | 'google_ads'
  | 'instagram_ads'
  | 'flyers'
  | 'referral_bonus'
  | 'event_sponsorship'
  | 'other'

export const CHANNEL_LABELS: Record<MarketingSpendChannel, string> = {
  facebook_ads: 'Facebook Ads',
  google_ads: 'Google Ads',
  instagram_ads: 'Instagram Ads',
  flyers: 'Flyers / Print',
  referral_bonus: 'Referral Bonus',
  event_sponsorship: 'Event Sponsorship',
  other: 'Other',
}
