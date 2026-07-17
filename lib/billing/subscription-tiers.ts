// Subscription tier definitions for the 3-tier SaaS model.

export type SubscriptionTier = 'free' | 'pro' | 'business'

export const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  business: 2,
}

export const TIER_PRICES_CENTS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1000,
  business: 2500,
}

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
}

export const FEATURE_TIER_REQUIREMENTS: Record<string, SubscriptionTier> = {
  remy_ai: 'pro',
  r2_storage: 'pro',
  staff_seats_extra: 'pro',
  document_generation: 'pro',
  client_preferences: 'pro',
  analytics: 'pro',
  unlimited_remy: 'business',
  r2_storage_25gb: 'business',
  unlimited_seats: 'business',
  vendor_management: 'business',
  inventory: 'business',
  priority_email: 'business',
  custom_branding: 'business',
}

export function tierMeetsRequirement(
  current: SubscriptionTier,
  required: SubscriptionTier
): boolean {
  return TIER_ORDER[current] >= TIER_ORDER[required]
}

export function getRequiredTier(feature: string): SubscriptionTier {
  return FEATURE_TIER_REQUIREMENTS[feature] || 'free'
}

export function resolveTierFromPriceId(priceId: string | null): SubscriptionTier {
  if (!priceId) return 'free'
  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY
  const businessPriceId = process.env.STRIPE_PRICE_BUSINESS_MONTHLY
  if (priceId === businessPriceId) return 'business'
  if (priceId === proPriceId) return 'pro'
  return 'free'
}
