import {
  ADMIN_PATHS,
  API_SKIP_AUTH_PREFIXES,
  CHEF_PROTECTED_PATHS,
  CLIENT_PROTECTED_PATHS,
  PARTNER_PROTECTED_PATHS,
  PUBLIC_ASSET_PATHS,
  PUBLIC_UNAUTHENTICATED_PATHS,
  STAFF_PROTECTED_PATHS,
  type RouteSessionRole,
  getRoutePolicyDecisionForRole,
} from './route-policy'

export type RouteAccessSurface =
  | 'admin'
  | 'api'
  | 'asset'
  | 'chef'
  | 'client'
  | 'partner'
  | 'public'
  | 'staff'

export type RouteAuthMode = 'public' | 'authenticated' | 'admin' | 'technical-skip'

export interface RouteAccessRegistryEntry {
  path: string
  surface: RouteAccessSurface
  authMode: RouteAuthMode
  allowedRoles: RouteSessionRole[]
  source: 'route-policy'
}

function entry(
  path: string,
  surface: RouteAccessSurface,
  authMode: RouteAuthMode,
  allowedRoles: RouteSessionRole[]
): RouteAccessRegistryEntry {
  return { path, surface, authMode, allowedRoles, source: 'route-policy' }
}

export const ROUTE_ACCESS_REGISTRY: RouteAccessRegistryEntry[] = [
  ...PUBLIC_UNAUTHENTICATED_PATHS.map((path) => entry(path, 'public', 'public', ['public'])),
  ...PUBLIC_ASSET_PATHS.map((path) => entry(path, 'asset', 'public', ['public'])),
  ...CHEF_PROTECTED_PATHS.map((path) => entry(path, 'chef', 'authenticated', ['chef', 'admin'])),
  ...CLIENT_PROTECTED_PATHS.map((path) =>
    entry(path, 'client', 'authenticated', ['client', 'admin'])
  ),
  ...STAFF_PROTECTED_PATHS.map((path) => entry(path, 'staff', 'authenticated', ['staff', 'admin'])),
  ...PARTNER_PROTECTED_PATHS.map((path) =>
    entry(path, 'partner', 'authenticated', ['partner', 'admin'])
  ),
  ...ADMIN_PATHS.map((path) => entry(path, 'admin', 'admin', ['admin'])),
  ...API_SKIP_AUTH_PREFIXES.map((path) => entry(path, 'api', 'technical-skip', ['system'])),
]

export function findRouteAccessEntry(pathname: string): RouteAccessRegistryEntry | null {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
  const matches = ROUTE_ACCESS_REGISTRY.filter(
    (entry) => normalized === entry.path || normalized.startsWith(`${entry.path}/`)
  ).sort((left, right) => right.path.length - left.path.length)

  return matches[0] ?? null
}

export function auditRouteAccessRegistry() {
  const byPath = new Map<string, RouteAccessRegistryEntry[]>()
  for (const item of ROUTE_ACCESS_REGISTRY) {
    byPath.set(item.path, [...(byPath.get(item.path) ?? []), item])
  }

  const duplicates = [...byPath.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([path, entries]) => ({ path, surfaces: entries.map((entry) => entry.surface) }))

  const conflicts = duplicates.filter(({ surfaces }) => new Set(surfaces).size > 1)

  return {
    total: ROUTE_ACCESS_REGISTRY.length,
    duplicates,
    conflicts,
  }
}

export function assertRegistryMatchesPolicy(pathname: string, role: RouteSessionRole) {
  const entry = findRouteAccessEntry(pathname)
  const policy = getRoutePolicyDecisionForRole(pathname, role)
  const registryAllows =
    entry?.authMode === 'public' ||
    entry?.authMode === 'admin' ||
    entry?.authMode === 'technical-skip' ||
    Boolean(entry?.allowedRoles.includes(role))

  return {
    pathname,
    role,
    entry,
    policyAllowed: policy.allowed,
    registryAllows,
    matches: policy.allowed === registryAllows,
  }
}
