// Server-only helper: resolves which nav routes should be hidden
// based on the unified surface graph. Called from chef layout (server component),
// result passed as serializable string[] to the client sidebar.

import { resolveSurfaceBatch, type ChefSurfaceContext } from './surface-graph'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'
import type { WorkspaceDensity } from '@/lib/interface/surface-governance'
import type { ArchetypeId } from '@/lib/archetypes/presets'

import { standaloneTop, navGroups } from '@/components/navigation/nav-config'

function collectNavHrefs(): string[] {
  const hrefs: string[] = []
  for (const item of standaloneTop) {
    hrefs.push(item.href)
    if ('subMenu' in item && Array.isArray((item as any).subMenu)) {
      for (const sub of (item as any).subMenu) hrefs.push(sub.href)
    }
  }
  for (const group of navGroups) {
    for (const item of group.items) {
      hrefs.push(item.href)
      if (item.children) {
        for (const child of item.children) hrefs.push(child.href)
      }
    }
  }
  return [...new Set(hrefs)]
}

export function resolveHiddenNavRoutes(params: {
  chefId: string
  tenantId: string
  dataPresence: TenantDataPresence | null
  enabledModules: string[]
  focusModeEnabled: boolean
  workspaceDensity: WorkspaceDensity
  archetype?: ArchetypeId | null
  isAdmin?: boolean
}): string[] {
  // If no data presence, skip surface graph (cannot evaluate tier)
  if (!params.dataPresence) return []

  const context: ChefSurfaceContext = {
    chefId: params.chefId,
    tenantId: params.tenantId,
    dataPresence: params.dataPresence,
    enabledModules: params.enabledModules,
    focusModeEnabled: params.focusModeEnabled,
    workspaceDensity: params.workspaceDensity,
    archetype: params.archetype as ArchetypeId | undefined,
    isAdmin: params.isAdmin,
  }

  const allHrefs = collectNavHrefs()
  const results = resolveSurfaceBatch(allHrefs, context)

  const hidden: string[] = []
  for (const [route, vis] of results) {
    if (!vis.visible) hidden.push(route)
  }
  return hidden
}
