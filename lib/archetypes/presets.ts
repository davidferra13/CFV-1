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
// These modules are ON for every archetype - they're universally useful.
const ALWAYS_ON = [
  'dashboard',
  'pipeline',
  'events',
  'culinary',
  'clients',
  'finance',
  'protection',
  'more',
  'commerce',
  'social-hub',
  'station-ops',
  'operations',
]

// ─── Archetype Definitions ────────────────────────────────────────

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'private-chef',
    label: 'Private Chef',
    description: 'Solo operator doing in-home dining experiences for clients',
    emoji: '🍳',
    enabledModules: [...ALWAYS_ON, 'pipeline', 'events', 'culinary', 'clients'],
    primaryNavHrefs: [
      '/dashboard',
      '/inbox',
      '/clients',
      '/inquiries',
      '/chat',
      '/schedule',
      '/events',
    ],
    mobileTabHrefs: ['/dashboard', '/inbox', '/events', '/clients', '/schedule'],
  },
  {
    id: 'caterer',
    label: 'Caterer',
    description: 'Event-based business with a team to coordinate',
    emoji: '🎪',
    enabledModules: [...ALWAYS_ON, 'pipeline', 'events', 'culinary', 'clients'],
    primaryNavHrefs: [
      '/dashboard',
      '/inbox',
      '/inquiries',
      '/schedule',
      '/events',
      '/staff',
      '/tasks',
    ],
    mobileTabHrefs: ['/dashboard', '/inbox', '/events', '/staff', '/schedule'],
  },
  {
    id: 'meal-prep',
    label: 'Meal Prep Chef',
    description: 'Weekly batch cooking and delivery for recurring clients',
    emoji: '📦',
    enabledModules: [...ALWAYS_ON, 'pipeline', 'culinary', 'clients'],
    primaryNavHrefs: ['/dashboard', '/inbox', '/clients', '/chat', '/schedule', '/tasks'],
    mobileTabHrefs: ['/dashboard', '/inbox', '/clients', '/schedule', '/tasks'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Fixed-location daily service with staff and guests',
    emoji: '🏪',
    enabledModules: [...ALWAYS_ON, 'culinary', 'clients', 'commerce'],
    primaryNavHrefs: [
      '/dashboard',
      '/commerce/register',
      '/staff',
      '/stations',
      '/inventory',
      '/tasks',
      '/schedule',
    ],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/stations', '/inventory', '/staff'],
  },
  {
    id: 'food-truck',
    label: 'Food Truck',
    description: 'Mobile operation focused on locations, prep, and daily service',
    emoji: '🚚',
    enabledModules: [...ALWAYS_ON, 'culinary', 'commerce'],
    primaryNavHrefs: [
      '/dashboard',
      '/commerce/register',
      '/schedule',
      '/stations',
      '/tasks',
      '/travel',
    ],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/stations', '/schedule', '/tasks'],
  },
  {
    id: 'bakery',
    label: 'Bakery / Pastry',
    description: 'Order-driven production with recipes, clients, and schedules',
    emoji: '🧁',
    enabledModules: [...ALWAYS_ON, 'pipeline', 'culinary', 'clients', 'commerce'],
    primaryNavHrefs: [
      '/dashboard',
      '/inbox',
      '/commerce/register',
      '/clients',
      '/schedule',
      '/tasks',
    ],
    mobileTabHrefs: ['/dashboard', '/commerce/register', '/inbox', '/clients', '/schedule'],
  },
]

/** Look up an archetype by ID. */
export function getArchetype(id: ArchetypeId): ArchetypeDefinition | undefined {
  return ARCHETYPES.find((a) => a.id === id)
}

/** All valid archetype IDs. */
export const ARCHETYPE_IDS = ARCHETYPES.map((a) => a.id)
