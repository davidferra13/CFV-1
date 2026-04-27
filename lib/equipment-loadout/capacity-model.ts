// Capacity Model - Portions per unit for scalable equipment
// Used to calculate how many of each item you need for N guests.

import type { CapacityEntry } from '@/lib/equipment/types'

export const CAPACITY_MODEL: CapacityEntry[] = [
  // Bakeware
  { canonical_name: 'Half Sheet Tray', size_label: 'half', portions_per_unit: 8 },
  { canonical_name: 'Full Sheet Tray', size_label: 'full', portions_per_unit: 16 },
  { canonical_name: 'Quarter Sheet Tray', size_label: 'quarter', portions_per_unit: 4 },

  // Cookware
  { canonical_name: 'Saute Pan', size_label: '10 inch', portions_per_unit: 4 },
  { canonical_name: 'Saute Pan', size_label: '12 inch', portions_per_unit: 6 },
  { canonical_name: 'Saute Pan', size_label: '14 inch', portions_per_unit: 8 },
  { canonical_name: 'Saucepan', size_label: '2 qt', portions_per_unit: 4 },
  { canonical_name: 'Saucepan', size_label: '4 qt', portions_per_unit: 8 },
  { canonical_name: 'Stockpot', size_label: '8 qt', portions_per_unit: 12 },
  { canonical_name: 'Stockpot', size_label: '12 qt', portions_per_unit: 20 },
  { canonical_name: 'Stockpot', size_label: '16 qt', portions_per_unit: 30 },
  { canonical_name: 'Dutch Oven', size_label: '5 qt', portions_per_unit: 6 },
  { canonical_name: 'Dutch Oven', size_label: '7 qt', portions_per_unit: 10 },
  { canonical_name: 'Roasting Pan', size_label: 'standard', portions_per_unit: 8 },
  { canonical_name: 'Cast Iron Skillet', size_label: '10 inch', portions_per_unit: 4 },
  { canonical_name: 'Cast Iron Skillet', size_label: '12 inch', portions_per_unit: 6 },

  // Transport
  { canonical_name: 'Hotel Pan', size_label: 'full', portions_per_unit: 20 },
  { canonical_name: 'Hotel Pan', size_label: 'half', portions_per_unit: 10 },
  { canonical_name: 'Hotel Pan', size_label: 'third', portions_per_unit: 6 },

  // Serving
  { canonical_name: 'Chafing Dish', size_label: 'full', portions_per_unit: 20 },
  { canonical_name: 'Chafing Dish', size_label: 'half', portions_per_unit: 10 },
  { canonical_name: 'Large Platter', size_label: 'standard', portions_per_unit: 12 },
]

/**
 * Get portions per unit for a given item.
 * Falls back to a default if no match.
 */
export function getPortionsPerUnit(canonicalName: string, sizeLabel?: string | null): number {
  const match = CAPACITY_MODEL.find(
    (c) =>
      c.canonical_name.toLowerCase() === canonicalName.toLowerCase() &&
      (!sizeLabel || c.size_label.toLowerCase() === sizeLabel.toLowerCase())
  )
  // If exact match found, use it. Otherwise try just by name.
  if (match) return match.portions_per_unit

  const nameOnly = CAPACITY_MODEL.find(
    (c) => c.canonical_name.toLowerCase() === canonicalName.toLowerCase()
  )
  if (nameOnly) return nameOnly.portions_per_unit

  // Default: 6 portions per unit
  return 6
}
