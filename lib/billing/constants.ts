import { SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS } from '@/lib/monetization/offers'

export const SUPPORT_PRICE_MONTHLY_CENTS = SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS

// Legacy exports retained for old imports. Do not use these names in new UI.
export const PRO_PRICE_MONTHLY = SUPPORT_PRICE_MONTHLY_CENTS / 100
export const PRO_TRIAL_DAYS = 0
