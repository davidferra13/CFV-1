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
      case 'admin': {
        const { resolveAdminRailData } = await import('./admin-resolver')
        return resolveAdminRailData(userId, tenantId)
      }
      case 'staff': {
        const { resolveStaffRailData } = await import('./staff-resolver')
        return resolveStaffRailData(userId, tenantId)
      }
      case 'partner': {
        const { resolvePartnerRailData } = await import('./partner-resolver')
        return resolvePartnerRailData(userId, tenantId)
      }
      default:
        return {}
    }
  } catch (err) {
    console.error(`[resolveRailData] ${role} resolver failed:`, err)
    return {}
  }
}

export type { RailResolverResult } from './types'
