import { MARKETPLACE_PLATFORMS } from '@/lib/marketplace/platforms'
import { getDefaultTakeAChefCommissionPercent } from './take-a-chef-defaults'

/**
 * Get the default commission percent for any platform.
 * For take_a_chef, uses the date-aware legacy/current logic.
 * For all others, reads from the MARKETPLACE_PLATFORMS registry.
 */
export function getDefaultCommissionPercent(
  channel: string,
  referenceDate?: string | Date | null
): number {
  if (channel === 'take_a_chef') {
    return getDefaultTakeAChefCommissionPercent(referenceDate)
  }
  const platform = MARKETPLACE_PLATFORMS.find((p) => p.channel === channel)
  return platform?.defaultCommissionPercent ?? 0
}

/**
 * Get the default SLA hours for a platform.
 */
export function getDefaultSlaHours(channel: string): number {
  const platform = MARKETPLACE_PLATFORMS.find((p) => p.channel === channel)
  return platform?.slaHours ?? 24
}
