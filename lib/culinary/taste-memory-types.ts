// Chef Taste Memory & Preference Learning - Type definitions
// Tracks evolving taste preferences, flavor affinities, ingredient usage,
// and cooking style patterns to build a chef's "taste profile."

/** Individual ingredient/flavor/technique preference with rating */
export type TastePreference = {
  id: string
  tenantId: string
  ingredientName: string
  /** 1 = strongly dislike, 5 = love */
  rating: number
  notes: string | null
  /** How many times the chef has used this ingredient */
  frequencyCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

/** A pair of ingredients/flavors the chef gravitates toward using together */
export type FlavorAffinity = {
  ingredientA: string
  ingredientB: string
  /** Number of recipes where these two appear together */
  coOccurrences: number
}

/** Detected pattern from recipe/menu history */
export type CookingStylePattern = {
  patternType: 'cuisine_tendency' | 'technique_preference' | 'ingredient_category_bias' | 'seasonal_preference'
  label: string
  /** Confidence score 0-1 based on frequency relative to total */
  confidence: number
  /** Number of data points supporting this pattern */
  supportCount: number
}

/** Aggregate profile assembled from all taste memory entries */
export type TasteProfile = {
  /** Top-rated ingredients (rating >= 4) */
  topIngredients: TastePreference[]
  /** Most common ingredient pairings */
  favoriteAffinities: FlavorAffinity[]
  /** Detected style patterns */
  stylePatterns: CookingStylePattern[]
  /** Most-used ingredients by frequency */
  mostUsed: Array<{ ingredientName: string; count: number }>
  /** Total preference entries recorded */
  totalEntries: number
}

/** Single observation entry (from recipe usage, menu selection, or manual input) */
export type TasteMemoryEntry = {
  source: 'manual' | 'recipe_usage' | 'menu_selection'
  ingredientName: string
  rating: number | null
  notes: string | null
  observedAt: string
}

/** Input for recording a new taste preference */
export type RecordTastePreferenceInput = {
  ingredient: string
  rating: number
  notes?: string
}
