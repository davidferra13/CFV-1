// Venue Type Modifiers
// Adjusts loadout based on where the event takes place.

import type { VenueModifier, VenueType } from '@/lib/equipment/types'
import type { LoadoutEntry } from '../types'

export const VENUE_MODIFIERS: Record<VenueType, VenueModifier> = {
  client_home: {
    venue_type: 'client_home',
    assume_available: ['Oven', 'Stovetop', 'Refrigerator', 'Sink'],
    always_bring: ['Cutting Board', "Chef's Knife", 'Knife Roll', 'Towels', 'Apron'],
    notes: 'Assume basic home kitchen. Always bring your own knives and cutting boards.',
  },
  commercial_kitchen: {
    venue_type: 'commercial_kitchen',
    assume_available: [
      'Oven',
      'Stovetop',
      'Refrigerator',
      'Sink',
      'Sheet Trays',
      'Stockpots',
      'Saute Pans',
      'Mixing Bowls',
      'Cutting Boards',
      'Walk-in Cooler',
      'Prep Tables',
      'Dish Station',
    ],
    always_bring: ['Knife Roll', 'Towels', 'Apron', 'Instant-Read Thermometer'],
    notes: 'Most equipment available. Bring specialty items and personal tools.',
  },
  outdoor: {
    venue_type: 'outdoor',
    assume_available: [],
    always_bring: [
      'Portable Burners',
      'Coolers',
      'Hand Washing Station',
      'Fire Extinguisher',
      'Folding Table',
      'Extension Cords',
      'Cutting Board',
      "Chef's Knife",
      'Knife Roll',
      'Towels',
      'Apron',
      'Trash Bags',
      'Paper Towels',
    ],
    notes: 'Assume nothing. Bring all infrastructure, cooking equipment, and safety gear.',
  },
  event_venue: {
    venue_type: 'event_venue',
    assume_available: ['Oven', 'Stovetop', 'Refrigerator', 'Sink'],
    always_bring: ['Knife Roll', 'Towels', 'Apron', 'Cutting Board'],
    notes: 'Varies wildly. Confirm equipment in advance. Assume basic kitchen only.',
  },
  office: {
    venue_type: 'office',
    assume_available: ['Microwave', 'Refrigerator', 'Sink'],
    always_bring: [
      'Portable Burner',
      'Cutting Board',
      "Chef's Knife",
      'Knife Roll',
      'Towels',
      'Apron',
      'Extension Cord',
      'Sheet Trays',
    ],
    notes: 'Usually no real kitchen. Plan for minimal infrastructure.',
  },
}

/**
 * Get venue-specific always-bring items as loadout entries.
 */
export function getVenueEquipment(venueType: VenueType | null): LoadoutEntry[] {
  if (!venueType) return []
  const mod = VENUE_MODIFIERS[venueType]

  return mod.always_bring.map((name) => ({
    name,
    canonical_name: name,
    category_slug: 'prep-tools', // generic, gets re-categorized during merge
    quantity: 1,
    scaling: 'fixed' as const,
    source_layer: 'venue_modifier' as const,
    reason: [`${mod.venue_type} venue: always bring`],
    is_essential: true,
  }))
}

/**
 * Check if venue is expected to have a given piece of equipment.
 */
export function venueHasEquipment(venueType: VenueType | null, equipmentName: string): boolean {
  if (!venueType) return false
  const mod = VENUE_MODIFIERS[venueType]
  return mod.assume_available.some((a) => a.toLowerCase() === equipmentName.toLowerCase())
}
