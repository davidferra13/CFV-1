// Layer C: Component Category -> Prep Equipment
// Maps dish component types to default equipment.

import type { LoadoutEntry } from '../types'

const CATEGORY_EQUIPMENT: Record<string, { items: string[]; category_slug: string }> = {
  protein: {
    items: ['Cutting Board', 'Instant-Read Thermometer'],
    category_slug: 'prep-tools',
  },
  meat: {
    items: ['Cutting Board', 'Instant-Read Thermometer', 'Tongs'],
    category_slug: 'prep-tools',
  },
  fish: {
    items: ['Fish Spatula', 'Cutting Board'],
    category_slug: 'prep-tools',
  },
  seafood: {
    items: ['Fish Spatula', 'Cutting Board'],
    category_slug: 'prep-tools',
  },
  sauce: {
    items: ['Saucepan', 'Whisk'],
    category_slug: 'cookware',
  },
  starch: {
    items: ['Stockpot', 'Colander'],
    category_slug: 'cookware',
  },
  pasta: {
    items: ['Stockpot', 'Colander', 'Tongs'],
    category_slug: 'cookware',
  },
  vegetable: {
    items: ["Chef's Knife", 'Cutting Board'],
    category_slug: 'prep-tools',
  },
  salad: {
    items: ['Salad Spinner', 'Large Mixing Bowl', 'Tongs'],
    category_slug: 'prep-tools',
  },
  soup: {
    items: ['Stockpot', 'Ladle', 'Immersion Blender'],
    category_slug: 'cookware',
  },
  bread: {
    items: ['Sheet Tray', 'Bench Scraper', 'Digital Scale'],
    category_slug: 'bakeware',
  },
  dessert: {
    items: ['Sheet Tray', 'Mixing Bowl', 'Rubber Spatula'],
    category_slug: 'bakeware',
  },
  appetizer: {
    items: ['Small Plates', 'Tongs'],
    category_slug: 'serving',
  },
  garnish: {
    items: ['Plating Tweezers', 'Squeeze Bottles'],
    category_slug: 'serving',
  },
}

/**
 * Get default equipment for a component category.
 */
export function getCategoryEquipment(
  componentName: string,
  category: string | null,
  recipeName: string
): LoadoutEntry[] {
  if (!category) return []

  const lower = category.toLowerCase()
  const mapping = CATEGORY_EQUIPMENT[lower]
  if (!mapping) return []

  return mapping.items.map((itemName) => ({
    name: itemName,
    canonical_name: itemName,
    category_slug: mapping.category_slug,
    quantity: 1,
    scaling: 'fixed' as const,
    source_layer: 'component_category' as const,
    reason: [`${recipeName}: ${componentName} (${category})`],
    is_essential: false,
  }))
}
