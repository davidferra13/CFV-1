// Default peak freshness windows by recipe category.
// Used when a recipe doesn't have explicit peak windows set.
// Values are in hours before service.

export type StorageMethod = 'room_temp' | 'fridge' | 'freezer'
export type HoldClass = 'serve_immediately' | 'hold_warm' | 'hold_cold_reheat'
export type PrepTier = 'base' | 'secondary' | 'tertiary' | 'finishing'

export interface PeakWindow {
  peakHoursMin: number
  peakHoursMax: number
  safetyHoursMax: number
  storageMethod: StorageMethod
  freezable: boolean
  holdClass: HoldClass
  prepTier: PrepTier
}

// Category defaults: conservative starting values.
// Chefs override per-recipe as they learn their dishes.
const CATEGORY_DEFAULTS: Record<string, PeakWindow> = {
  sauce: {
    peakHoursMin: 1,
    peakHoursMax: 72,
    safetyHoursMax: 96,
    storageMethod: 'fridge',
    freezable: true,
    holdClass: 'hold_warm',
    prepTier: 'secondary',
  },
  protein: {
    peakHoursMin: 0,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'serve_immediately',
    prepTier: 'finishing',
  },
  starch: {
    peakHoursMin: 1,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: true,
    holdClass: 'hold_warm',
    prepTier: 'tertiary',
  },
  vegetable: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'serve_immediately',
    prepTier: 'tertiary',
  },
  fruit: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'hold_cold_reheat',
    prepTier: 'tertiary',
  },
  dessert: {
    peakHoursMin: 2,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: true,
    holdClass: 'hold_cold_reheat',
    prepTier: 'tertiary',
  },
  bread: {
    peakHoursMin: 1,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'room_temp',
    freezable: true,
    holdClass: 'hold_warm',
    prepTier: 'secondary',
  },
  pasta: {
    peakHoursMin: 2,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: true,
    holdClass: 'hold_cold_reheat',
    prepTier: 'secondary',
  },
  soup: {
    peakHoursMin: 2,
    peakHoursMax: 72,
    safetyHoursMax: 96,
    storageMethod: 'fridge',
    freezable: true,
    holdClass: 'hold_warm',
    prepTier: 'secondary',
  },
  salad: {
    peakHoursMin: 0,
    peakHoursMax: 4,
    safetyHoursMax: 8,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'serve_immediately',
    prepTier: 'finishing',
  },
  appetizer: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'serve_immediately',
    prepTier: 'tertiary',
  },
  condiment: {
    peakHoursMin: 1,
    peakHoursMax: 168,
    safetyHoursMax: 336,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'hold_cold_reheat',
    prepTier: 'base',
  },
  beverage: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'hold_cold_reheat',
    prepTier: 'base',
  },
  other: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
    holdClass: 'serve_immediately',
    prepTier: 'tertiary',
  },
}

// Fallback for unknown categories
const FALLBACK_DEFAULT: PeakWindow = {
  peakHoursMin: 0,
  peakHoursMax: 24,
  safetyHoursMax: 48,
  storageMethod: 'fridge',
  freezable: false,
  holdClass: 'serve_immediately',
  prepTier: 'tertiary',
}

export function getCategoryDefault(category: string | null): PeakWindow {
  if (!category) return FALLBACK_DEFAULT
  return CATEGORY_DEFAULTS[category.toLowerCase()] ?? FALLBACK_DEFAULT
}

export function resolvePeakWindow(recipe: {
  peak_hours_min?: number | null
  peak_hours_max?: number | null
  safety_hours_max?: number | null
  storage_method?: string | null
  freezable?: boolean | null
  category?: string | null
  hold_class?: string | null
  prep_tier?: string | null
}): PeakWindow {
  const defaults = getCategoryDefault(recipe.category ?? null)

  return {
    peakHoursMin: recipe.peak_hours_min ?? defaults.peakHoursMin,
    peakHoursMax: recipe.peak_hours_max ?? defaults.peakHoursMax,
    safetyHoursMax: recipe.safety_hours_max ?? defaults.safetyHoursMax,
    storageMethod: (recipe.storage_method as StorageMethod) ?? defaults.storageMethod,
    freezable: recipe.freezable ?? defaults.freezable,
    holdClass: (recipe.hold_class as HoldClass) ?? defaults.holdClass,
    prepTier: (recipe.prep_tier as PrepTier) ?? defaults.prepTier,
  }
}

// Whether a recipe has explicit peak windows set (vs using defaults)
export function hasExplicitPeakWindow(recipe: {
  peak_hours_min?: number | null
  peak_hours_max?: number | null
}): boolean {
  return recipe.peak_hours_min != null && recipe.peak_hours_max != null
}

// Whether a category has specific defaults (not the generic fallback)
export function hasCategoryDefaults(category: string | null): boolean {
  if (!category) return false
  return category.toLowerCase() in CATEGORY_DEFAULTS
}
