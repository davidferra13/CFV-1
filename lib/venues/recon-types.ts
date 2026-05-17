export type VenueType = 'residential' | 'commercial_kitchen' | 'outdoor' | 'venue_hall' | 'restaurant' | 'office' | 'other'

export interface VenueProfile {
  id: string
  tenant_id: string
  venue_name: string
  address: string | null
  venue_type: VenueType | null
  kitchen_notes: string | null
  equipment_available: string[]
  oven_type: string | null
  oven_count: number | null
  burner_count: number | null
  counter_space_rating: number | null // 1-5
  has_full_kitchen: boolean | null
  has_refrigeration: boolean | null
  has_freezer: boolean | null
  has_running_water: boolean | null
  refrigeration_notes: string | null
  parking_notes: string | null
  access_instructions: string | null
  power_outlets: string | null
  water_access: string | null
  photos: string[]
  quirks: string | null
  notes: string | null
  last_visited_at: string | null
  visit_count: number
  created_at: string
  updated_at: string
}

export interface VenueReconChecklist {
  hasOven: boolean | null
  hasGrill: boolean | null
  hasStoveTop: boolean | null
  hasRunningWater: boolean | null
  hasPowerOutlets: boolean | null
  hasRefrigeration: boolean | null
  hasCounterSpace: boolean | null
  hasParking: boolean | null
}
