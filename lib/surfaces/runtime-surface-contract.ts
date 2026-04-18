// Runtime Surface Contract
// Machine-readable definition of which surfaces own which routes, shells,
// auth guards, and navigation configs. This is the enforcement layer that
// docs/system-architecture.md describes but previously left implicit.
//
// Read by tests and layout components to verify runtime ownership stays
// aligned with the canonical architecture model.

import type { Surface } from '@/types/system'

export type SurfaceContract = {
  surface: Surface
  routeRoots: string[]
  portalMarker: string
  authGuard: string
  navOwner: string
  exceptions?: string
}

/**
 * Canonical runtime surface definitions.
 * Each entry declares which route families, portal markers, auth guards,
 * and navigation configs belong to that surface.
 */
export const SURFACE_CONTRACTS: SurfaceContract[] = [
  {
    surface: 'public',
    routeRoots: ['app/(public)'],
    portalMarker: 'public',
    authGuard: 'none',
    navOwner: 'public-nav',
    exceptions:
      'Token routes (/view/[token], /tip/[token], etc.) are public but use minimal layout.',
  },
  {
    surface: 'chef',
    routeRoots: ['app/(chef)'],
    portalMarker: 'chef',
    authGuard: 'requireChef',
    navOwner: 'chef-nav',
    exceptions:
      'Staff routes (app/(staff)) classify as chef surface per architecture doc. ' +
      'Admin users may operate in chef context when on chef routes without changing surface ownership.',
  },
  {
    surface: 'client',
    routeRoots: ['app/(client)'],
    portalMarker: 'client',
    authGuard: 'requireClient',
    navOwner: 'client-nav',
  },
  {
    surface: 'admin',
    routeRoots: ['app/(admin)'],
    portalMarker: 'admin',
    authGuard: 'requireAdmin',
    navOwner: 'admin-nav',
    exceptions:
      'Admin is a control plane. Its shell and navigation are admin-owned. ' +
      'Shared presentational primitives (toasts, offline, theme) may be reused.',
  },
  {
    surface: 'partner',
    routeRoots: ['app/(partner)'],
    portalMarker: 'partner',
    authGuard: 'requirePartner',
    navOwner: 'partner-nav',
  },
]

/**
 * Lookup a surface contract by surface name.
 */
export function getSurfaceContract(surface: Surface): SurfaceContract | undefined {
  return SURFACE_CONTRACTS.find((c) => c.surface === surface)
}

/**
 * Get the expected portal marker for a given route group folder.
 */
export function getExpectedPortalMarker(routeGroup: string): string | undefined {
  const contract = SURFACE_CONTRACTS.find((c) => c.routeRoots.includes(routeGroup))
  return contract?.portalMarker
}

/**
 * Validate that a layout uses the correct portal marker and nav owner
 * for its surface. Returns null if valid, or an error string if misaligned.
 */
export function validateSurfaceAlignment(
  surface: Surface,
  actualPortalMarker: string,
  actualNavOwner: string
): string | null {
  const contract = getSurfaceContract(surface)
  if (!contract) return `Unknown surface: ${surface}`

  if (actualPortalMarker !== contract.portalMarker) {
    return `Portal marker mismatch for ${surface}: expected "${contract.portalMarker}", got "${actualPortalMarker}"`
  }

  if (actualNavOwner !== contract.navOwner) {
    return `Nav owner mismatch for ${surface}: expected "${contract.navOwner}", got "${actualNavOwner}"`
  }

  return null
}
