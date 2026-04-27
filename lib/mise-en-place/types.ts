// Mise en Place types
// "Everything in its place" - unified pre-service preparation board

// Kitchen station (French brigade-inspired, simplified for private chef)
export type MiseStation =
  | 'saucier' // Sauces, sauteing, braising
  | 'garde_manger' // Cold prep, salads, charcuterie, amuse
  | 'patissier' // Pastry, desserts, baking
  | 'rotisseur' // Roasting, grilling, proteins
  | 'entremetier' // Soups, vegetables, starches
  | 'general' // Unclassifiable or multi-station

export const STATION_LABELS: Record<MiseStation, string> = {
  saucier: 'Saucier',
  garde_manger: 'Garde Manger',
  patissier: 'Patissier',
  rotisseur: 'Rotisseur',
  entremetier: 'Entremetier',
  general: 'General Prep',
}

export const STATION_DESCRIPTIONS: Record<MiseStation, string> = {
  saucier: 'Sauces, sautes, braises',
  garde_manger: 'Cold prep, salads, assembly',
  patissier: 'Pastry, desserts, baking',
  rotisseur: 'Roasting, grilling, proteins',
  entremetier: 'Soups, vegetables, starches',
  general: 'Multi-station items',
}

// One ingredient in the mise en place
export interface MiseIngredient {
  ingredientId: string
  name: string
  totalQuantity: number
  unit: string
  category: string
  allergenFlags: string[]
  // Where this ingredient is used
  sources: {
    recipeName: string
    componentId: string
    componentName: string
    dishName: string
    courseName: string
    quantity: number
    prepNotes: string | null
  }[]
  // Lifecycle state
  buyQuantity: number // yield-adjusted
  yieldPct: number
  sourced: boolean // has purchase transaction
  purchasedQty: number | null
  costCents: number | null
  // Mise state (checked off = prepped and ready)
  prepped: boolean
}

// Equipment item for the event
export interface MiseEquipment {
  id: string
  name: string
  category: 'cooking' | 'serving' | 'transport' | 'setup' | 'cleaning' | 'other'
  quantity: number
  source: 'owned' | 'rental' | 'venue_provided'
  packed: boolean
  returned: boolean
  notes: string | null
}

// A recipe/component in the mise en place, organized by station
export interface MiseComponent {
  componentId: string
  componentName: string
  recipeName: string | null
  recipeId: string | null
  dishName: string
  courseName: string
  courseNumber: number
  station: MiseStation
  // Timing
  holdClass: string | null // serve_immediately, hold_warm, hold_cold_reheat
  prepTier: string | null // base, secondary, tertiary, finishing
  activeMinutes: number
  passiveMinutes: number
  totalMinutes: number
  // Peak window
  peakHoursMin: number | null
  peakHoursMax: number | null
  storageMethod: string | null
  freezable: boolean
  // Ingredients for THIS component
  ingredients: MiseIngredient[]
  // Status
  prepped: boolean
}

// A station card with all its components and ingredients
export interface MiseStationCard {
  station: MiseStation
  label: string
  description: string
  components: MiseComponent[]
  // Aggregated from components
  totalActiveMinutes: number
  totalPassiveMinutes: number
  ingredientCount: number
  preppedCount: number
  // Allergens present at this station
  allergens: string[]
}

// Pack manifest item (everything that travels to the venue)
export interface PackItem {
  name: string
  category: string
  quantity: number
  source: 'owned' | 'rental' | 'venue_provided'
  packed: boolean
  type: 'equipment' | 'ingredient' | 'container'
}

// Allergen zone map (which dishes/stations have which allergens)
export interface AllergenZone {
  allergen: string
  stations: MiseStation[]
  dishes: string[]
  ingredients: string[]
}

// Consolidated ingredient (aggregated across all components)
export interface ConsolidatedIngredient {
  ingredientId: string
  name: string
  totalQuantity: number
  buyQuantity: number
  unit: string
  category: string
  allergenFlags: string[]
  sources: {
    recipeName: string
    componentId: string
    componentName: string
    dishName: string
    courseName: string
    quantity: number
    prepNotes: string | null
  }[]
  yieldPct: number
  sourced: boolean
  purchasedQty: number | null
  costCents: number | null
  prepped: boolean
}

// Course card (components grouped by course for fire-order view)
export interface MiseCourseCard {
  courseNumber: number
  courseName: string
  components: MiseComponent[]
  totalActiveMinutes: number
  totalPassiveMinutes: number
  allergens: string[]
}

// Timeline slot (for the timing rail)
export interface TimelineSlot {
  label: string // "T-72h", "T-48h", "T-24h", "T-4h", "T-1h", "Service"
  hoursBeforeService: number
  components: {
    componentName: string
    recipeName: string | null
    station: MiseStation
    holdClass: string | null
    activeMinutes: number
  }[]
}

// The full mise en place board
export interface MiseEnPlaceBoard {
  eventId: string
  eventName: string
  eventDate: string
  serveTime: string | null
  guestCount: number
  serviceStyle: string | null
  clientName: string | null
  // Station cards (station view)
  stations: MiseStationCard[]
  // Course cards (fire-order view)
  courses: MiseCourseCard[]
  // Consolidated ingredient list (shopping view)
  consolidatedIngredients: ConsolidatedIngredient[]
  // Timeline slots (timing rail)
  timelineSlots: TimelineSlot[]
  // Equipment
  equipment: MiseEquipment[]
  // Pack manifest
  packManifest: PackItem[]
  // Allergen map
  allergenZones: AllergenZone[]
  // Readiness
  readiness: {
    score: number // 0-100
    status: 'READY' | 'AT_RISK' | 'NOT_READY'
    totalIngredients: number
    sourcedIngredients: number
    preppedIngredients: number
    totalComponents: number
    preppedComponents: number
    totalEquipment: number
    packedEquipment: number
  }
  // Timeline integration
  groceryDeadline: string | null
  prepDeadline: string | null
  // Cost snapshot
  estimatedFoodCostCents: number
}
