import { isProductionEnvironment } from '@/lib/environment/runtime'

/**
 * In production, require chefs to complete Stripe Connect onboarding
 * before accepting card payments. This can be overridden explicitly
 * for controlled environments.
 */
export function isConnectOnboardingRequiredForPayments(): boolean {
  const override = process.env.REQUIRE_CONNECT_ONBOARDING_FOR_PAYMENTS?.trim().toLowerCase()
  if (override === 'true') return true
  if (override === 'false') return false
  return isProductionEnvironment()
}
