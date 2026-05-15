// God Mode types for the rail tier system.
// Extends the universal rail with priority tiers, rich resolved items,
// and inline action support.

import type { UniversalRailRole } from './universal-rail-types'

// ---------------------------------------------------------------------------
// Tier system
// ---------------------------------------------------------------------------

export type RailTier = 'p0' | 'p1' | 'p2' | 'p3' | 'p4'

export const TIER_ORDER: RailTier[] = ['p0', 'p1', 'p2', 'p3', 'p4']

export interface TierConfig {
  name: string
  color: 'red' | 'amber' | 'blue' | 'gray' | 'dim'
  alwaysExpanded: boolean
  pulses: boolean
}

export const TIER_CONFIG: Record<RailTier, TierConfig> = {
  p0: { name: 'Act Now', color: 'red', alwaysExpanded: true, pulses: true },
  p1: { name: 'Today', color: 'amber', alwaysExpanded: true, pulses: false },
  p2: { name: 'This Week', color: 'blue', alwaysExpanded: false, pulses: false },
  p3: { name: 'On Your Radar', color: 'gray', alwaysExpanded: false, pulses: false },
  p4: { name: 'Ambient', color: 'dim', alwaysExpanded: false, pulses: false },
}

export function compareTiers(a: RailTier, b: RailTier): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)
}

export function isExpandedByDefault(tier: RailTier): boolean {
  return tier === 'p0' || tier === 'p1' || tier === 'p2'
}

// ---------------------------------------------------------------------------
// Inline actions
// ---------------------------------------------------------------------------

export type InlineActionVariant = 'default' | 'destructive' | 'success'

export interface InlineAction {
  label: string
  action: string
  params: Record<string, unknown>
  variant: InlineActionVariant
}

// ---------------------------------------------------------------------------
// Resolved item (output of domain resolvers)
// ---------------------------------------------------------------------------

export interface GodModeResolvedItem {
  definitionId: string
  tier: RailTier
  label: string
  context: string
  destination: string
  icon?: string
  inlineActions?: InlineAction[]
  data?: Record<string, unknown>
  expiresAt?: Date
  escalatesAt?: Date
  score?: number
}

// ---------------------------------------------------------------------------
// Resolver contract
// ---------------------------------------------------------------------------

export interface GodModeResolverContext {
  userId: string
  tenantId: string
  role: UniversalRailRole
  now: Date
}

export type GodModeResolver = (ctx: GodModeResolverContext) => Promise<GodModeResolvedItem[]>

// ---------------------------------------------------------------------------
// Assembly result
// ---------------------------------------------------------------------------

export interface GodModeRailResult {
  tiers: Record<RailTier, GodModeResolvedItem[]>
  totalItems: number
  assembledAt: string
}

export interface GodModeStripResult {
  items: GodModeResolvedItem[]
  hasP0: boolean
  totalUrgent: number
}
