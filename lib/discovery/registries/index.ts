import type { UniversalRailItemDefinition, UniversalRailRole } from '../universal-rail-types'

// Re-export all role registries
// Each registry is lazily imported to avoid loading 780 item definitions at startup

const registryModules: Record<
  UniversalRailRole,
  () => Promise<{
    default?: never
    [key: string]: readonly UniversalRailItemDefinition[] | unknown
  }>
> = {
  public: () => import('./public-rail-registry'),
  guest: () => import('./guest-rail-registry'),
  client: () => import('./client-rail-registry'),
  chef: () => import('./chef-rail-registry'),
  staff: () => import('./staff-rail-registry'),
  partner: () => import('./partner-rail-registry'),
  admin: () => import('./admin-rail-registry'),
}

const REGISTRY_EXPORT_NAMES: Record<UniversalRailRole, string> = {
  public: 'PUBLIC_RAIL_REGISTRY',
  guest: 'GUEST_RAIL_REGISTRY',
  client: 'CLIENT_RAIL_REGISTRY',
  chef: 'CHEF_RAIL_REGISTRY',
  staff: 'STAFF_RAIL_REGISTRY',
  partner: 'PARTNER_RAIL_REGISTRY',
  admin: 'ADMIN_RAIL_REGISTRY',
}

// Cache loaded registries
const cache = new Map<UniversalRailRole, readonly UniversalRailItemDefinition[]>()

/**
 * Load the item definition registry for a specific role.
 * Results are cached after first load.
 */
export async function loadRoleRegistry(
  role: UniversalRailRole
): Promise<readonly UniversalRailItemDefinition[]> {
  const cached = cache.get(role)
  if (cached) return cached

  const mod = await registryModules[role]()
  const exportName = REGISTRY_EXPORT_NAMES[role]
  const registry = (mod as Record<string, readonly UniversalRailItemDefinition[]>)[exportName]

  if (!registry) {
    throw new Error(`Registry for role "${role}" not found (expected export "${exportName}")`)
  }

  cache.set(role, registry)
  return registry
}

/**
 * Look up a single item definition by its ID across all loaded registries.
 * Returns null if not found.
 */
export function findItemDefinition(definitionId: string): UniversalRailItemDefinition | null {
  for (const registry of cache.values()) {
    const found = registry.find((item) => item.id === definitionId)
    if (found) return found
  }
  return null
}

/**
 * Get all loaded registries (only returns already-cached roles).
 */
export function getLoadedRegistries(): Map<
  UniversalRailRole,
  readonly UniversalRailItemDefinition[]
> {
  return new Map(cache)
}

/**
 * Preload all registries. Useful for admin views or system health checks.
 */
export async function preloadAllRegistries(): Promise<void> {
  const roles: UniversalRailRole[] = [
    'public',
    'guest',
    'client',
    'chef',
    'staff',
    'partner',
    'admin',
  ]
  await Promise.all(roles.map(loadRoleRegistry))
}

/**
 * Get total item count across all loaded registries.
 */
export function getTotalItemCount(): number {
  let count = 0
  for (const registry of cache.values()) {
    count += registry.length
  }
  return count
}

/**
 * Clear the registry cache (for testing or hot-reload).
 */
export function clearRegistryCache(): void {
  cache.clear()
}
