import type { ArchetypeId } from '@/lib/archetypes/presets'
import type { OperationalDocumentType } from '@/lib/documents/template-catalog'

export type ArchetypeDocumentPack = {
  archetype: ArchetypeId
  title: string
  subtitle: string
  recommendedOperationalDocs: OperationalDocumentType[]
  optionalOperationalDocs: OperationalDocumentType[]
  futureDocs: string[]
}

const PRIVATE_CHEF_PACK: ArchetypeDocumentPack = {
  archetype: 'private-chef',
  title: 'Private Chef Event Pack',
  subtitle: 'Full-service in-home dinner workflow from shopping to reset.',
  recommendedOperationalDocs: [
    'summary',
    'grocery',
    'foh',
    'prep',
    'execution',
    'checklist',
    'packing',
    'reset',
    'travel',
    'shots',
  ],
  optionalOperationalDocs: [],
  futureDocs: [],
}

const CATERER_PACK: ArchetypeDocumentPack = {
  archetype: 'caterer',
  title: 'Catering Event Pack',
  subtitle: 'Operational packet for team-based offsite events.',
  recommendedOperationalDocs: [
    'summary',
    'grocery',
    'prep',
    'execution',
    'checklist',
    'packing',
    'reset',
    'travel',
  ],
  optionalOperationalDocs: ['foh', 'shots'],
  futureDocs: ['Crew assignments sheet', 'Production kitchen load sheet'],
}

const MEAL_PREP_PACK: ArchetypeDocumentPack = {
  archetype: 'meal-prep',
  title: 'Meal Prep Run Pack',
  subtitle: 'Batch-cooking focused packet adapted from event docs.',
  recommendedOperationalDocs: ['grocery', 'prep', 'packing', 'checklist', 'reset'],
  optionalOperationalDocs: ['summary', 'travel'],
  futureDocs: ['Delivery manifest', 'Weekly production run sheet'],
}

const RESTAURANT_PACK: ArchetypeDocumentPack = {
  archetype: 'restaurant',
  title: 'Restaurant Private Event Pack',
  subtitle: 'Best for buyouts, chef tables, and private dining nights.',
  recommendedOperationalDocs: ['foh', 'prep', 'execution', 'checklist', 'shots'],
  optionalOperationalDocs: ['summary', 'grocery', 'packing', 'reset'],
  futureDocs: ['Banquet BEO export', 'FOH staffing lineup sheet'],
}

const FOOD_TRUCK_PACK: ArchetypeDocumentPack = {
  archetype: 'food-truck',
  title: 'Food Truck Service Pack',
  subtitle: 'Mobile-service packet with route and loadout emphasis.',
  recommendedOperationalDocs: [
    'grocery',
    'prep',
    'execution',
    'checklist',
    'packing',
    'travel',
    'reset',
  ],
  optionalOperationalDocs: ['summary', 'shots'],
  futureDocs: ['Commissary load-in sheet', 'Service window throughput sheet'],
}

const BAKERY_PACK: ArchetypeDocumentPack = {
  archetype: 'bakery',
  title: 'Bakery Event Order Pack',
  subtitle: 'Order-production packet for custom event bakes.',
  recommendedOperationalDocs: ['grocery', 'prep', 'checklist', 'packing'],
  optionalOperationalDocs: ['summary', 'travel', 'reset'],
  futureDocs: ['Bake timeline board', 'Order fulfillment and labeling sheet'],
}

const PACKS_BY_ARCHETYPE: Record<ArchetypeId, ArchetypeDocumentPack> = {
  'private-chef': PRIVATE_CHEF_PACK,
  caterer: CATERER_PACK,
  'meal-prep': MEAL_PREP_PACK,
  restaurant: RESTAURANT_PACK,
  'food-truck': FOOD_TRUCK_PACK,
  bakery: BAKERY_PACK,
}

export function getArchetypeDocumentPack(archetype: ArchetypeId | null): ArchetypeDocumentPack {
  if (!archetype) return PRIVATE_CHEF_PACK
  return PACKS_BY_ARCHETYPE[archetype] ?? PRIVATE_CHEF_PACK
}
