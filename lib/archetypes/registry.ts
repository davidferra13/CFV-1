// Central archetype registry.
// Keep shared archetype metadata here so other systems do not hardcode
// their own parallel lists of the same business types.

export type ArchetypePrimaryAction = {
  label: string
  href: string
}

type ArchetypeRegistrySeed = {
  id: string
  label: string
  dashboardLabel: string
  description: string
  emoji: string
  primaryAction: ArchetypePrimaryAction
  haccp: {
    label: string
    description: string
  }
}

export const ARCHETYPE_REGISTRY = [
  {
    id: 'private-chef',
    label: 'Private Chef',
    dashboardLabel: 'Private Chef',
    description: 'Solo operator doing in-home dining experiences for clients',
    emoji: '🍳',
    primaryAction: { label: 'New Event', href: '/events/new' },
    haccp: {
      label: 'Private Chef',
      description:
        'Solo operator providing in-home dining experiences. Food is prepared in client kitchens or transported from a commissary. Unique risks include unfamiliar kitchen environments, transport cold chain, and allergen management in intimate settings.',
    },
  },
  {
    id: 'caterer',
    label: 'Caterer',
    dashboardLabel: 'Caterer',
    description: 'Event-based business with a team to coordinate',
    emoji: '🎪',
    primaryAction: { label: 'New Event', href: '/events/new' },
    haccp: {
      label: 'Caterer',
      description:
        'Event-based food service for groups. Food is prepared in a commercial kitchen and transported to event venues. Key risks include large-batch production, extended holding times, transport temperature control, and serving in non-kitchen environments.',
    },
  },
  {
    id: 'meal-prep',
    label: 'Meal Prep Chef',
    dashboardLabel: 'Meal Prep',
    description: 'Weekly batch cooking and delivery for recurring clients',
    emoji: '📦',
    primaryAction: { label: 'New Prep Order', href: '/events/new' },
    haccp: {
      label: 'Meal Prep Service',
      description:
        'Batch cooking and portioning meals for weekly delivery to recurring clients. Key risks include rapid cooling of large batches, packaging integrity, labeling accuracy (use-by dates), and delivery cold chain maintenance.',
    },
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    dashboardLabel: 'Restaurant',
    description: 'Fixed-location daily service with staff and guests',
    emoji: '🏪',
    primaryAction: { label: 'New Reservation', href: '/guests/reservations' },
    haccp: {
      label: 'Restaurant',
      description:
        'Fixed-location daily food service with continuous production. Key risks include high-volume throughput, multiple simultaneous orders, holding temperatures at service line, and reheating previously prepared items.',
    },
  },
  {
    id: 'food-truck',
    label: 'Food Truck',
    dashboardLabel: 'Food Truck',
    description: 'Mobile operation focused on locations, prep, and daily service',
    emoji: '🚚',
    primaryAction: { label: 'New Booking', href: '/events/new' },
    haccp: {
      label: 'Food Truck',
      description:
        'Mobile food operation with limited space and equipment. Key risks include restricted water supply, compact storage, ambient temperature exposure, waste management on-site, and maintaining food safety in variable environments.',
    },
  },
  {
    id: 'bakery',
    label: 'Bakery / Pastry',
    dashboardLabel: 'Bakery',
    description: 'Order-driven production with recipes, clients, and schedules',
    emoji: '🧁',
    primaryAction: { label: 'New Order', href: '/bakery/orders/new' },
    haccp: {
      label: 'Bakery / Pastry Shop',
      description:
        'Order-driven production of baked goods. Key risks include allergen cross-contact (flour, nuts, dairy, eggs), cooling after baking, cream/custard temperature control, and display case management for perishable items.',
    },
  },
] as const satisfies readonly ArchetypeRegistrySeed[]

export type ArchetypeId = (typeof ARCHETYPE_REGISTRY)[number]['id']
export type ArchetypeRegistryEntry = (typeof ARCHETYPE_REGISTRY)[number]

export const DEFAULT_ARCHETYPE_ID: ArchetypeId = 'private-chef'

export const ARCHETYPE_IDS = ARCHETYPE_REGISTRY.map((archetype) => archetype.id) as ArchetypeId[]

export const ARCHETYPE_REGISTRY_BY_ID = Object.fromEntries(
  ARCHETYPE_REGISTRY.map((archetype) => [archetype.id, archetype])
) as Record<ArchetypeId, ArchetypeRegistryEntry>

export function getArchetypeRegistryEntry(
  archetypeId: ArchetypeId | null | undefined
): ArchetypeRegistryEntry | null {
  if (!archetypeId) return null
  return ARCHETYPE_REGISTRY_BY_ID[archetypeId] ?? null
}

export function isArchetypeId(value: string | null | undefined): value is ArchetypeId {
  if (!value) return false
  return ARCHETYPE_IDS.includes(value as ArchetypeId)
}
