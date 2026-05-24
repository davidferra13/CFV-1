// lib/feature-gates/gate-types.ts
// Feature gate contract types for tier-based access control.

/** Subscription tiers. Free is default for all chefs. */
export type GateTier = 'free' | 'pro' | 'enterprise'

/** Definition of a single gated feature. */
export type GateDefinition = {
  key: string
  name: string
  tier: GateTier
  description: string
  /** Whether the gate is enabled by default for chefs on the matching tier */
  defaultEnabled: boolean
}

/** Result of checking whether a chef can access a gated feature. */
export type GateCheckResult = {
  allowed: boolean
  reason: string
  requiredTier?: GateTier
}

/** Map of gate keys to their definitions. */
export type GateRegistry = Record<string, GateDefinition>
