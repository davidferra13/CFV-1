// Hybrid Archetype Preset - merges multiple archetype presets into one blended config.
// When a chef selects multiple archetypes, this produces a single unified preset
// with deduped modules and nav items, prioritizing the first-selected (primary) archetype.

import { getArchetype, type ArchetypeDefinition, type ArchetypeId } from './presets'

const MAX_MOBILE_TABS = 5

/**
 * Merge multiple archetype presets into a single blended preset.
 *
 * Rules:
 * - enabledModules: union of all, deduped
 * - primaryNavHrefs: first archetype's items come first, then others appended (deduped)
 * - mobileTabHrefs: first archetype's tabs prioritized, others appended, capped at 5
 *
 * The first archetype in the array is treated as the "primary" and determines
 * ordering priority for nav and mobile tabs.
 */
export function mergeArchetypePresets(archetypeKeys: ArchetypeId[]): ArchetypeDefinition {
  if (archetypeKeys.length === 0) {
    throw new Error('At least one archetype must be selected')
  }

  const archetypes = archetypeKeys
    .map((key) => getArchetype(key))
    .filter((a): a is ArchetypeDefinition => a != null)

  if (archetypes.length === 0) {
    throw new Error('No valid archetypes found for the given keys')
  }

  // Single archetype: return as-is
  if (archetypes.length === 1) {
    return { ...archetypes[0] }
  }

  const primary = archetypes[0]

  // Merge enabledModules (dedup, preserve insertion order)
  const enabledModules = dedup(archetypes.flatMap((a) => a.enabledModules))

  // Merge primaryNavHrefs (primary first, then others)
  const primaryNavHrefs = dedup(archetypes.flatMap((a) => a.primaryNavHrefs))

  // Merge mobileTabHrefs (primary's tabs first, cap at 5)
  const allMobileTabs = dedup(archetypes.flatMap((a) => a.mobileTabHrefs))
  const mobileTabHrefs = allMobileTabs.slice(0, MAX_MOBILE_TABS)

  return {
    id: primary.id,
    label: archetypes.map((a) => a.label).join(' + '),
    description: `Blended preset combining ${archetypes.map((a) => a.label).join(', ')}`,
    emoji: primary.emoji,
    enabledModules,
    primaryNavHrefs,
    mobileTabHrefs,
  }
}

/** Deduplicate an array while preserving insertion order. */
function dedup(arr: string[]): string[] {
  return [...new Set(arr)]
}
