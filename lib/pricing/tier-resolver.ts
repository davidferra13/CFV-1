/**
 * Shared interface for PIE tier resolvers.
 *
 * Each of the 17 ordered resolver steps across major trust tiers 0-10 implements TierResolver.
 * The waterfall loop in resolve-price.ts calls resolve() on each tier
 * in order until one returns a non-null result.
 */

import type { ResolvedPrice } from './resolve-price'

export interface TierContext {
  ingredientId: string
  tenantId: string
  preferredStore: string | null
  preferredState: string | null
}

export interface TierResolver {
  tier: number
  name: string
  resolve(ctx: TierContext): Promise<ResolvedPrice | null>
}
