// Default peak freshness windows by recipe category.
// Used when a recipe doesn't have explicit peak windows set.
// Values are in hours before service.

export type StorageMethod = 'room_temp' | 'fridge' | 'freezer'

export interface PeakWindow {
  peakHoursMin: number
  peakHoursMax: number
  safetyHoursMax: number
  storageMethod: StorageMethod
  freezable: boolean
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
  },
  protein: {
    peakHoursMin: 0,
    peakHoursMax: 1,
    safetyHoursMax: 2,
    storageMethod: 'room_temp',
    freezable: false,
  },
  starch: {
    peakHoursMin: 1,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: true,
  },
  vegetable: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
  },
  fruit: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
  },
  dessert: {
    peakHoursMin: 2,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: true,
  },
  bread: {
    peakHoursMin: 1,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'room_temp',
    freezable: true,
  },
  pasta: {
    peakHoursMin: 2,
    peakHoursMax: 48,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: true,
  },
  soup: {
    peakHoursMin: 2,
    peakHoursMax: 72,
    safetyHoursMax: 96,
    storageMethod: 'fridge',
    freezable: true,
  },
  salad: {
    peakHoursMin: 0,
    peakHoursMax: 4,
    safetyHoursMax: 8,
    storageMethod: 'fridge',
    freezable: false,
  },
  appetizer: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
  },
  condiment: {
    peakHoursMin: 1,
    peakHoursMax: 168,
    safetyHoursMax: 336,
    storageMethod: 'fridge',
    freezable: false,
  },
  beverage: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 72,
    storageMethod: 'fridge',
    freezable: false,
  },
  other: {
    peakHoursMin: 0,
    peakHoursMax: 24,
    safetyHoursMax: 48,
    storageMethod: 'fridge',
    freezable: false,
  },
}

// Fallback for unknown categories
const FALLBACK_DEFAULT: PeakWindow = {
  peakHoursMin: 0,
  peakHoursMax: 24,
  safetyHoursMax: 48,
  storageMethod: 'fridge',
  freezable: false,
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
}): PeakWindow {
  const defaults = getCategoryDefault(recipe.category ?? null)

  return {
    peakHoursMin: recipe.peak_hours_min ?? defaults.peakHoursMin,
    peakHoursMax: recipe.peak_hours_max ?? defaults.peakHoursMax,
    safetyHoursMax: recipe.safety_hours_max ?? defaults.safetyHoursMax,
    storageMethod: (recipe.storage_method as StorageMethod) ?? defaults.storageMethod,
    freezable: recipe.freezable ?? defaults.freezable,
  }
}

// Whether a recipe has explicit peak windows set (vs using defaults)
export function hasExplicitPeakWindow(recipe: {
  peak_hours_min?: number | null
  peak_hours_max?: number | null
}): boolean {
  return recipe.peak_hours_min != null && recipe.peak_hours_max != null
}
