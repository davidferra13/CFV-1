// Archetype-aware UI copy maps chef archetypes to their primary dashboard action.

import {
  DEFAULT_ARCHETYPE_ID,
  type ArchetypeId,
  type ArchetypePrimaryAction,
  getArchetypeRegistryEntry,
} from './registry'

const DEFAULT_ACTION: ArchetypePrimaryAction =
  getArchetypeRegistryEntry(DEFAULT_ARCHETYPE_ID)?.primaryAction ?? {
    label: 'New Event',
    href: '/events/new',
  }

export function getDashboardPrimaryAction(
  archetype: ArchetypeId | null | undefined
): ArchetypePrimaryAction {
  if (!archetype) return DEFAULT_ACTION
  return getArchetypeRegistryEntry(archetype)?.primaryAction ?? DEFAULT_ACTION
}
