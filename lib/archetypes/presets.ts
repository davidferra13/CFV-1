// Chef Archetype Presets - defines nav defaults for each chef persona.
// Archetypes are starting-point presets only; nothing is locked out.
// Chefs can always customize via Settings > Navigation and Settings > Modules.
//
// NOT a server action file - no 'use server'.

export type ArchetypeId =
  | 'private-chef'
  | 'caterer'
  | 'meal-prep'
  | 'restaurant'
  | 'food-truck'
  | 'bakery'

export type ArchetypeDefinition = {
  id: ArchetypeId
  label: string
  description: string
  emoji: string
  /** Module slugs to enable (from lib/billing/modules.ts) */
  enabledModules: string[]
  /** Hrefs for Layer 1 quick-access buttons (from standaloneTop pool) */
  primaryNavHrefs: string[]
  /** Hrefs for mobile bottom tab bar (5 items) */
  mobileTabHrefs: string[]
}

// ─── Shared constants ─────────────────────────────────────────────
// Amendment 2 of docs/chef-navigation-decision-contract.md.
//
// This list used to hold 12 of the 13 modules, which made all six archetypes
// identical: a working chef was shown 458 of the 470 routes in the sidebar no
// matter which archetype they picked. The core is now the five modules every
// food operator uses, and everything else is chosen per archetype below.
//
// Nothing is removed by this. A module that is off is hidden from navigation
// and stays one switch away in Settings > Modules.
const CORE = ['dashboard', 'events', 'culinary', 'clients', 'finance']

// ─── Archetype Definitions ────────────────────────────────────────

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'private-chef',
    label: 'Private Chef',
    description: 'Solo operator doing in-home dining experiences for clients',
    emoji: '🍳',
    // Books the work themselves, cooks it themselves. No register, no crew,
    // no purchasing department.
    enabledModules: [...CORE, 'pipeline'],
    primaryNavHrefs: [
      '/dashboard',
      '/inbox',
      '/clients',
      '/inquiries',
      '/chat',
      '/calendar',
      '/events',
    ],
    mobileTabHrefs: ['/dashboard', '/inbox', '/events', '/clients', '/calendar'],
  },
  {
    id: 'caterer',
    label: 'Caterer',
    description: 'Event-based business with a team to coordinate',
    emoji: '🎪',
    // Sells events, runs a crew on the day, and buys for volume.
    enabledModules: [...CORE, 'pipeline', 'station-ops', 'operations'],
    primaryNavHrefs: [
      '/dashboard',
      '/inbox',
      '/inquiries',
      '/calendar',
      '/events',
      '/staff',
      '/tasks',
    ],
    mobileTabHrefs: ['/dashboard', '/inbox', '/events', '/staff', '/calendar'],
  },
  {
    id: 'meal-prep',
    label: 'Meal Prep Chef',
    description: 'Weekly batch cooking and delivery for recurring clients',
    emoji: '📦',
    // Recurring clients and standing orders, so purchasing matters and the
    // event floor does not.
    enabledModules: [...CORE, 'pipeline', 'operations'],
    primaryNavHrefs: ['/dashboard', '/inbox', '/clients', '/chat', '/calendar', '/tasks'],
    mobileTabHrefs: ['/dashboard', '/inbox', '/clients', '/calendar', '/tasks'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Fixed-location daily service with staff and guests',
    emoji: '🏪',
    // Sells at a counter, runs stations and staff, and orders stock.
    enabledModules: [...CORE, 'commerce', 'station-ops', 'operations'],
    primaryNavHrefs: [
      '/dashboard',
      '/commerce/register',
      '/staff',
      '/stations',
      '/inventory',
      '/tasks',
      '/calendar',
    ],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/stations', '/inventory', '/staff'],
  },
  {
    id: 'food-truck',
    label: 'Food Truck',
    description: 'Mobile operation focused on locations, prep, and daily service',
    emoji: '🚚',
    // A counter and a prep list on wheels. No sales pipeline.
    enabledModules: [...CORE, 'commerce', 'station-ops'],
    primaryNavHrefs: [
      '/dashboard',
      '/commerce/register',
      '/calendar',
      '/stations',
      '/tasks',
      '/travel',
    ],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/stations', '/calendar', '/tasks'],
  },
  {
    id: 'bakery',
    label: 'Bakery / Pastry',
    description: 'Order-driven production with recipes, clients, and schedules',
    emoji: '🧁',
    // Takes orders ahead and sells across the counter.
    enabledModules: [...CORE, 'pipeline', 'commerce'],
    primaryNavHrefs: [
      '/dashboard',
      '/inbox',
      '/commerce/register',
      '/clients',
      '/calendar',
      '/tasks',
    ],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/inbox', '/clients', '/calendar'],
  },
]

/** Look up an archetype by ID. */
export function getArchetype(id: ArchetypeId): ArchetypeDefinition | undefined {
  return ARCHETYPES.find((a) => a.id === id)
}

/** All valid archetype IDs. */
export const ARCHETYPE_IDS = ARCHETYPES.map((a) => a.id)

/**
 * Modules to store when a chef switches archetype.
 *
 * Amendment 2 of docs/chef-navigation-decision-contract.md: an explicit chef
 * toggle outranks any preset. Switching archetype used to overwrite the module
 * list outright, throwing away everything the chef had turned on or off by hand.
 * Those choices are recoverable without any new column: against their previous
 * archetype's preset, anything enabled that the preset did not include was
 * turned on by the chef, and anything the preset included that is not enabled
 * was turned off by the chef. Both survive the switch, in both directions, so
 * switching away and back leaves the chef's own toggles intact.
 *
 * With no previous archetype there is nothing to infer, so the new preset is
 * used as-is.
 */
export function resolveModulesForArchetypeSwitch(params: {
  previousArchetype: ArchetypeId | null | undefined
  previousEnabledModules: string[] | null | undefined
  nextArchetype: ArchetypeId
}): string[] {
  const next = getArchetype(params.nextArchetype)
  if (!next) return []

  const nextPreset = [...new Set(next.enabledModules)]

  const previous = params.previousArchetype ? getArchetype(params.previousArchetype) : undefined
  if (!previous) return nextPreset

  const previousPreset = [...new Set(previous.enabledModules)]
  const previousEnabled = Array.isArray(params.previousEnabledModules)
    ? params.previousEnabledModules
    : []

  const turnedOnByChef = previousEnabled.filter((m) => !previousPreset.includes(m))
  const turnedOffByChef = previousPreset.filter((m) => !previousEnabled.includes(m))

  return [...new Set([...nextPreset, ...turnedOnByChef])].filter(
    (m) => !turnedOffByChef.includes(m)
  )
}

/** A chef's deviation from their archetype preset. Never the whole set. */
export type ModuleOverrides = { on: string[]; off: string[] }

export const EMPTY_MODULE_OVERRIDES: ModuleOverrides = { on: [], off: [] }

/** Read an overrides value of unknown shape out of the database safely. */
export function normalizeModuleOverrides(value: unknown): ModuleOverrides {
  const raw = (value ?? {}) as { on?: unknown; off?: unknown }
  const list = (v: unknown) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : []
  return { on: list(raw.on), off: list(raw.off) }
}

/**
 * What the chef changed by hand, measured against their archetype's preset.
 * Called when the chef saves module toggles, so the deviation is recorded
 * accurately without having to track individual clicks.
 */
export function diffModulesAgainstPreset(
  archetypeId: ArchetypeId | null | undefined,
  enabledModules: string[]
): ModuleOverrides {
  const enabled = [...new Set(enabledModules)]
  const preset = archetypeId ? getArchetype(archetypeId)?.enabledModules : undefined
  if (!preset) return { on: enabled, off: [] }
  const presetSet = [...new Set(preset)]
  return {
    on: enabled.filter((m) => !presetSet.includes(m)),
    off: presetSet.filter((m) => !enabled.includes(m)),
  }
}

/**
 * The module set for an archetype with the chef's own toggles laid back on top.
 * This is the authoritative resolution: preset first, chef last.
 */
export function applyModuleOverrides(
  archetypeId: ArchetypeId,
  overrides: ModuleOverrides | null | undefined
): string[] {
  const preset = [...new Set(getArchetype(archetypeId)?.enabledModules ?? [])]
  const o = normalizeModuleOverrides(overrides)
  return [...new Set([...preset, ...o.on])].filter((m) => !o.off.includes(m))
}
