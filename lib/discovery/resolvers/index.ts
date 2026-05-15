import type { UniversalRailRole } from '../universal-rail-types'
import type { RailResolverResult } from './types'

/**
 * Resolve live data for a role's rail items.
 *
 * Returns a metadata map keyed by definition ID.
 * Items in the map get hydrated templates; items not in the map keep static labels.
 * Roles without resolvers return empty (graceful degradation).
 */
export async function resolveRailData(
  role: UniversalRailRole,
  userId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  try {
    switch (role) {
      case 'chef': {
        const { resolveChefRailData } = await import('./chef-resolver')
        return resolveChefRailData(userId, tenantId)
      }
      case 'client': {
        const { resolveClientRailData } = await import('./client-resolver')
        return resolveClientRailData(userId, tenantId)
      }
      // Staff, partner, admin: resolvers not yet built.
      // Items render with static labels until resolvers are added.
      default:
        return {}
    }
  } catch (err) {
    console.error(`[resolveRailData] ${role} resolver failed:`, err)
    return {}
  }
}

export type { RailResolverResult } from './types'
