import type { Commitment, CommitmentOverride, FrictionTier } from './types'
import { DOMAIN_DEFAULT_TIERS } from './types'

export function calculateFrictionTier(
  commitment: Commitment,
  overrides: CommitmentOverride[]
): FrictionTier {
  const domainDefault = DOMAIN_DEFAULT_TIERS[commitment.domain]
  const last30 = countOverridesInWindow(overrides, 30)
  const last60 = countOverridesInWindow(overrides, 60)
  const last90 = countOverridesInWindow(overrides, 90)

  let tier = domainDefault
  if (last30 >= 2) tier = Math.max(tier, 2) as FrictionTier
  if (last60 >= 3) tier = Math.max(tier, 3) as FrictionTier
  if (last90 >= 5) tier = Math.max(tier, 4) as FrictionTier
  if (last90 >= 8) tier = Math.max(tier, 5) as FrictionTier

  // De-escalation: 60 days without override drops one tier
  if (commitment.lastOverrideAt) {
    const daysSinceOverride =
      (Date.now() - commitment.lastOverrideAt.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSinceOverride >= 60) {
      tier = Math.max(domainDefault, tier - 1) as FrictionTier
    }
  }

  return Math.min(5, Math.max(1, tier)) as FrictionTier
}

export function countOverridesInWindow(overrides: CommitmentOverride[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return overrides.filter((o) => o.createdAt.getTime() > cutoff).length
}
