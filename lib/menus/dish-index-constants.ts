// Dish Index constants - exported separately from server actions so they can be
// used in client components without triggering the 'use server' object export restriction.

export const DISH_COURSES = [
  'amuse',
  'canapé',
  'appetizer',
  'soup',
  'salad',
  'fish',
  'entrée',
  'cheese',
  'dessert',
  'side',
  'beverage',
  'other',
] as const

export type DishCourse = (typeof DISH_COURSES)[number]

export const DISH_COURSE_LABELS: Record<DishCourse, string> = {
  amuse: 'Amuse-Bouche',
  canapé: 'Canapé',
  appetizer: 'Appetizer',
  soup: 'Soup',
  salad: 'Salad',
  fish: 'Fish Course',
  entrée: 'Entrée',
  cheese: 'Cheese Course',
  dessert: 'Dessert',
  side: 'Side',
  beverage: 'Beverage',
  other: 'Other',
}

export const ROTATION_STATUSES = ['active', 'resting', 'retired', 'testing'] as const
export type RotationStatus = (typeof ROTATION_STATUSES)[number]

export const ROTATION_STATUS_LABELS: Record<RotationStatus, string> = {
  active: 'Active',
  resting: 'Resting',
  retired: 'Retired',
  testing: 'Testing',
}

export const ROTATION_STATUS_COLORS: Record<RotationStatus, string> = {
  active: 'bg-green-900 text-green-400',
  resting: 'bg-amber-900 text-amber-400',
  retired: 'bg-stone-800 text-stone-500',
  testing: 'bg-blue-900 text-blue-400',
}

export const PREP_COMPLEXITIES = ['quick', 'moderate', 'intensive'] as const
export type PrepComplexity = (typeof PREP_COMPLEXITIES)[number]

export const PLATING_DIFFICULTIES = ['simple', 'moderate', 'architectural'] as const
export type PlatingDifficulty = (typeof PLATING_DIFFICULTIES)[number]

export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export const DIETARY_TAG_OPTIONS = ['GF', 'DF', 'V', 'VG', 'NF', 'SF', 'EF', 'KO', 'HA'] as const

export const ALLERGEN_FLAG_OPTIONS = ['SH', 'DA', 'EG', 'TN', 'PN', 'SY', 'FI', 'GL', 'SE'] as const

/** Normalize a dish name to a canonical form for deduplication */
export function canonicalizeDishName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '')
    .trim()
}
