'use server'

// Discovery Actions - server actions for the module discovery page.
// Reads the catalog + user's enabled modules and lets them toggle modules on/off.

import { requireChef } from '@/lib/auth/get-user'
import {
  getEnabledModules,
  toggleModule as billingToggleModule,
} from '@/lib/billing/module-actions'
import { MODULE_CATALOG, DIMENSIONS } from './module-catalog'
import type { DimensionId, CatalogModule, DimensionDefinition } from './module-catalog'

export type CatalogModuleWithState = CatalogModule & {
  enabled: boolean
}

export type DimensionGroup = {
  dimension: DimensionDefinition
  modules: CatalogModuleWithState[]
}

/**
 * Returns the full module catalog grouped by dimension,
 * with each module's enabled state based on the current user's preferences.
 */
export async function getModuleCatalogGrouped(): Promise<DimensionGroup[]> {
  await requireChef()
  const enabledSlugs = await getEnabledModules()
  const enabledSet = new Set(enabledSlugs)

  const groups: DimensionGroup[] = DIMENSIONS.map((dim) => {
    const dimensionModules = MODULE_CATALOG.filter((m) => m.dimension === dim.id)
    const modulesWithState: CatalogModuleWithState[] = dimensionModules.map((mod) => ({
      ...mod,
      // A catalog module is "enabled" if its linked moduleSlug is in the user's enabled list,
      // or if it has no moduleSlug (standalone feature, default to false)
      enabled: mod.moduleSlug ? enabledSet.has(mod.moduleSlug) : false,
    }))
    return { dimension: dim, modules: modulesWithState }
  })

  return groups
}

/**
 * Toggle a catalog module on or off for the current user.
 * Maps the catalog module key to its underlying module slug and delegates
 * to the billing toggle action.
 */
export async function toggleDiscoveryModule(
  moduleKey: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireChef()

  const catalogEntry = MODULE_CATALOG.find((m) => m.key === moduleKey)
  if (!catalogEntry) {
    return { success: false, error: 'Unknown module' }
  }

  if (!catalogEntry.moduleSlug) {
    // Module has no backing slug yet (future feature)
    return { success: false, error: 'This feature is not yet available' }
  }

  try {
    await billingToggleModule(catalogEntry.moduleSlug, enabled)
    return { success: true }
  } catch (err) {
    console.error('[discovery] Failed to toggle module', moduleKey, err)
    return { success: false, error: 'Failed to update module' }
  }
}
