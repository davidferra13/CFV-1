// lib/feature-gates/gate-check.ts
// Core gate checking logic. Reads chef_feature_flags table + tier definitions.

import { cache } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { isAdmin } from '@/lib/auth/admin'
import type { GateCheckResult, GateTier } from './gate-types'
import { GATE_REGISTRY, type GateKey } from './gate-registry'

/** Tier hierarchy for comparison. Higher number = more access. */
const TIER_RANK: Record<GateTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

/**
 * Load all feature flag overrides for a chef from chef_feature_flags table.
 * Cached per request via React.cache.
 */
const loadChefFlagOverrides = cache(async (chefId: string): Promise<Record<string, boolean>> => {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('chef_feature_flags')
    .select('flag_name, enabled')
    .eq('chef_id', chefId)

  if (error) {
    console.error('[feature-gates] Failed to load flags:', error)
    return {}
  }

  return Object.fromEntries((data ?? []).map((row: any) => [row.flag_name, row.enabled === true]))
})

/**
 * Resolve the effective tier for a chef.
 * Currently returns 'free' as default since subscription billing is not yet live.
 * When Stripe subscription integration ships, this will read the chef's plan.
 */
async function resolveChefTier(_chefId: string): Promise<GateTier> {
  // TODO: read from subscription/billing table when it exists
  return 'free'
}

/**
 * Check whether a chef can access a gated feature.
 * Resolution order:
 *   1. Admin bypass (always allowed)
 *   2. Explicit flag override in chef_feature_flags
 *   3. Tier-based default from registry
 */
export async function checkGate(chefId: string, gateKey: GateKey): Promise<GateCheckResult> {
  const definition = GATE_REGISTRY[gateKey]
  if (!definition) {
    return { allowed: false, reason: `Unknown gate: ${gateKey}` }
  }

  // Admin bypass
  if (await isAdmin()) {
    return { allowed: true, reason: 'Admin bypass' }
  }

  // Explicit per-chef override
  const overrides = await loadChefFlagOverrides(chefId)
  if (gateKey in overrides) {
    return overrides[gateKey]
      ? { allowed: true, reason: 'Explicitly enabled for this account' }
      : {
          allowed: false,
          reason: 'Explicitly disabled for this account',
          requiredTier: definition.tier,
        }
  }

  // Tier-based resolution
  const chefTier = await resolveChefTier(chefId)
  const chefRank = TIER_RANK[chefTier]
  const requiredRank = TIER_RANK[definition.tier]

  if (chefRank >= requiredRank && definition.defaultEnabled) {
    return { allowed: true, reason: `Included in ${chefTier} tier` }
  }

  return {
    allowed: false,
    reason: `Requires ${definition.tier} tier (current: ${chefTier})`,
    requiredTier: definition.tier,
  }
}

/**
 * Throws if the current chef cannot access the gate.
 * Use at the top of server actions like requireChef().
 */
export async function requireGate(gateKey: GateKey): Promise<void> {
  const user = await requireChef()
  const result = await checkGate(user.entityId, gateKey)
  if (!result.allowed) {
    throw new Error(result.reason)
  }
}

/**
 * Simple boolean check for a single gate.
 */
export async function isGateEnabled(chefId: string, gateKey: GateKey): Promise<boolean> {
  const result = await checkGate(chefId, gateKey)
  return result.allowed
}

/**
 * Get all gates with their allowed status for a chef.
 * Useful for rendering upgrade prompts or feature dashboards.
 */
export async function getChefGates(chefId: string): Promise<Record<GateKey, GateCheckResult>> {
  const keys = Object.keys(GATE_REGISTRY) as GateKey[]
  const results: Record<string, GateCheckResult> = {}

  for (const key of keys) {
    results[key] = await checkGate(chefId, key)
  }

  return results as Record<GateKey, GateCheckResult>
}
