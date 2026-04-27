// Loadout Generator - Input/Output Types

import type { VenueType } from '@/lib/equipment/types'

/** Input data for the loadout generator (fetched by server action, passed to pure function) */
export interface LoadoutInput {
  event_id: string
  guest_count: number
  service_style: string | null // plated, buffet, cocktail, family_style, tasting_menu
  venue_type: VenueType | null
  recipes: LoadoutRecipe[]
  inventory: InventoryItem[]
  same_day_events?: SameDayEvent[]
}

export interface LoadoutRecipe {
  id: string
  name: string
  method: string | null
  equipment: string[] // existing recipes.equipment text array
  components: LoadoutComponent[]
}

export interface LoadoutComponent {
  name: string
  category: string | null // protein, starch, sauce, dessert, etc.
  technique_notes: string | null
}

export interface InventoryItem {
  id: string
  name: string
  canonical_name: string | null
  category_slug: string | null
  quantity_owned: number
  status: string
  size_label: string | null
  tags: string[] | null
}

export interface SameDayEvent {
  event_id: string
  event_name: string
  equipment_ids: string[] // equipment allocated to that event
}

/** A single item in the generated loadout */
export interface LoadoutEntry {
  name: string
  canonical_name: string | null
  category_slug: string
  quantity: number
  scaling: 'fixed' | 'per_guest' | 'scalable'
  source_layer:
    | 'recipe_explicit'
    | 'technique_inference'
    | 'component_category'
    | 'service_style'
    | 'venue_modifier'
  reason: string[]
  is_essential: boolean
}
