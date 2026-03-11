// Chef archetype presets define operational defaults layered on top of the
// shared archetype registry. Nothing is locked out.

import { CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS } from '@/lib/navigation/primary-shortcuts'
import {
  ARCHETYPE_IDS,
  ARCHETYPE_REGISTRY,
  type ArchetypeId,
  type ArchetypeRegistryEntry,
} from './registry'

export type ArchetypeDefinition = ArchetypeRegistryEntry & {
  /** Module slugs to enable (from lib/billing/modules.ts) */
  enabledModules: string[]
  /** Hrefs for Layer 1 quick-access buttons (from standaloneTop pool) */
  primaryNavHrefs: string[]
  /** Hrefs for mobile bottom tab bar (5 items) */
  mobileTabHrefs: string[]
}

const ALWAYS_ON = ['dashboard', 'finance']

const ARCHETYPE_PRESET_DETAILS: Record<
  ArchetypeId,
  Pick<ArchetypeDefinition, 'enabledModules' | 'mobileTabHrefs'>
> = {
  'private-chef': {
    enabledModules: [...ALWAYS_ON, 'pipeline', 'events', 'culinary', 'clients'],
    mobileTabHrefs: ['/dashboard', '/inbox', '/events', '/clients', '/schedule'],
  },
  caterer: {
    enabledModules: [...ALWAYS_ON, 'pipeline', 'events', 'culinary', 'clients'],
    mobileTabHrefs: ['/dashboard', '/inbox', '/events', '/staff', '/schedule'],
  },
  'meal-prep': {
    enabledModules: [...ALWAYS_ON, 'pipeline', 'culinary', 'clients'],
    mobileTabHrefs: ['/dashboard', '/inbox', '/clients', '/schedule', '/tasks'],
  },
  restaurant: {
    enabledModules: [...ALWAYS_ON, 'culinary', 'clients', 'commerce'],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/stations', '/staff', '/schedule'],
  },
  'food-truck': {
    enabledModules: [...ALWAYS_ON, 'culinary', 'commerce'],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/stations', '/schedule', '/tasks'],
  },
  bakery: {
    enabledModules: [...ALWAYS_ON, 'pipeline', 'culinary', 'clients', 'commerce'],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/inbox', '/clients', '/schedule'],
  },
}

export const ARCHETYPES: ArchetypeDefinition[] = ARCHETYPE_REGISTRY.map((archetype) => ({
  ...archetype,
  ...ARCHETYPE_PRESET_DETAILS[archetype.id],
  primaryNavHrefs: [...CURRENT_ARCHETYPE_PRIMARY_NAV_HREFS[archetype.id]],
}))

export function getArchetype(id: ArchetypeId): ArchetypeDefinition | undefined {
  return ARCHETYPES.find((archetype) => archetype.id === id)
}

export { ARCHETYPE_IDS }
export type { ArchetypeId }
