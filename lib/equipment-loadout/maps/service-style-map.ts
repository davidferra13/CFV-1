// Layer D: Service Style -> Service Equipment
// Maps service style to required serviceware with per-guest scaling.

import type { LoadoutEntry } from '../types'

interface ServiceEquipmentDef {
  name: string
  category_slug: string
  scaling: 'fixed' | 'per_guest' | 'scalable'
  factor: number // multiplier for per_guest, or fixed count
  buffer: number // extra percentage (0.1 = 10%)
  is_essential: boolean
}

const SERVICE_EQUIPMENT: Record<string, ServiceEquipmentDef[]> = {
  plated: [
    {
      name: 'Dinner Plates',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.15,
      is_essential: true,
    },
    {
      name: 'Salad Plates',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: true,
    },
    {
      name: 'Flatware Sets',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.15,
      is_essential: true,
    },
    {
      name: 'Water Glasses',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: true,
    },
    {
      name: 'Wine Glasses',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: false,
    },
    {
      name: 'Cloth Napkins',
      category_slug: 'linens-consumables',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.15,
      is_essential: true,
    },
  ],
  buffet: [
    {
      name: 'Chafing Dishes',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 1,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Sterno Cans',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 2,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Serving Spoons',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 1,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Serving Tongs',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 1,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Plates',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1.5,
      buffer: 0.1,
      is_essential: true,
    },
    {
      name: 'Flatware Sets',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.15,
      is_essential: true,
    },
    {
      name: 'Napkins',
      category_slug: 'linens-consumables',
      scaling: 'per_guest',
      factor: 2,
      buffer: 0,
      is_essential: true,
    },
  ],
  cocktail: [
    {
      name: 'Cocktail Napkins',
      category_slug: 'linens-consumables',
      scaling: 'per_guest',
      factor: 3,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Picks/Skewers',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 4,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Small Plates',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 2,
      buffer: 0.1,
      is_essential: true,
    },
    {
      name: 'Small Platters',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 4,
      buffer: 0,
      is_essential: true,
    },
  ],
  tasting_menu: [
    {
      name: 'Small Plates',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: true,
    },
    {
      name: 'Tasting Spoons',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: false,
    },
    {
      name: 'Squeeze Bottles',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 4,
      buffer: 0,
      is_essential: false,
    },
    {
      name: 'Ring Molds',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 4,
      buffer: 0,
      is_essential: false,
    },
    {
      name: 'Flatware Sets',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.15,
      is_essential: true,
    },
  ],
  family_style: [
    {
      name: 'Large Platters',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 1,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Serving Spoons',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 1,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Serving Forks',
      category_slug: 'serving',
      scaling: 'fixed',
      factor: 1,
      buffer: 0,
      is_essential: true,
    },
    {
      name: 'Dinner Plates',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: true,
    },
    {
      name: 'Flatware Sets',
      category_slug: 'serving',
      scaling: 'per_guest',
      factor: 1,
      buffer: 0.1,
      is_essential: true,
    },
  ],
}

/**
 * Generate service equipment entries based on style and guest count.
 * For per-course items in tasting menus, multiply by courseCount.
 */
export function getServiceStyleEquipment(
  serviceStyle: string | null,
  guestCount: number,
  courseCount?: number
): LoadoutEntry[] {
  if (!serviceStyle) return []

  const normalized = serviceStyle.toLowerCase().replace(/[\s-]+/g, '_')
  const defs = SERVICE_EQUIPMENT[normalized]
  if (!defs) return []

  const perCourseMultiplier = normalized === 'tasting_menu' && courseCount ? courseCount : 1

  return defs.map((def) => {
    let quantity: number
    if (def.scaling === 'per_guest') {
      quantity = Math.ceil(guestCount * def.factor * (1 + def.buffer) * perCourseMultiplier)
    } else {
      quantity = def.factor
    }

    return {
      name: def.name,
      canonical_name: def.name,
      category_slug: def.category_slug,
      quantity,
      scaling: def.scaling,
      source_layer: 'service_style' as const,
      reason: [`${serviceStyle} service for ${guestCount} guests`],
      is_essential: def.is_essential,
    }
  })
}
