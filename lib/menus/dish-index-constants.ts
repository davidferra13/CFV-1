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

/** Course-specific colors for visual distinction across the dish index */
export const DISH_COURSE_COLORS: Record<
  DishCourse,
  { bg: string; text: string; border: string; stripe: string }
> = {
  amuse: {
    bg: 'bg-fuchsia-900/20',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-700/40',
    stripe: 'bg-fuchsia-500',
  },
  canapé: {
    bg: 'bg-pink-900/20',
    text: 'text-pink-400',
    border: 'border-pink-700/40',
    stripe: 'bg-pink-500',
  },
  appetizer: {
    bg: 'bg-orange-900/20',
    text: 'text-orange-400',
    border: 'border-orange-700/40',
    stripe: 'bg-orange-500',
  },
  soup: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    border: 'border-amber-700/40',
    stripe: 'bg-amber-500',
  },
  salad: {
    bg: 'bg-lime-900/20',
    text: 'text-lime-400',
    border: 'border-lime-700/40',
    stripe: 'bg-lime-500',
  },
  fish: {
    bg: 'bg-cyan-900/20',
    text: 'text-cyan-400',
    border: 'border-cyan-700/40',
    stripe: 'bg-cyan-500',
  },
  entrée: {
    bg: 'bg-red-900/20',
    text: 'text-red-400',
    border: 'border-red-700/40',
    stripe: 'bg-red-500',
  },
  cheese: {
    bg: 'bg-yellow-900/20',
    text: 'text-yellow-400',
    border: 'border-yellow-700/40',
    stripe: 'bg-yellow-500',
  },
  dessert: {
    bg: 'bg-violet-900/20',
    text: 'text-violet-400',
    border: 'border-violet-700/40',
    stripe: 'bg-violet-500',
  },
  side: {
    bg: 'bg-teal-900/20',
    text: 'text-teal-400',
    border: 'border-teal-700/40',
    stripe: 'bg-teal-500',
  },
  beverage: {
    bg: 'bg-sky-900/20',
    text: 'text-sky-400',
    border: 'border-sky-700/40',
    stripe: 'bg-sky-500',
  },
  other: {
    bg: 'bg-stone-800/40',
    text: 'text-stone-400',
    border: 'border-stone-700/40',
    stripe: 'bg-stone-500',
  },
}

/** Emoji icons per course for visual scanning */
export const DISH_COURSE_ICONS: Record<DishCourse, string> = {
  amuse: '🥄',
  canapé: '🍢',
  appetizer: '🥗',
  soup: '🍲',
  salad: '🥬',
  fish: '🐟',
  entrée: '🥩',
  cheese: '🧀',
  dessert: '🍰',
  side: '🥕',
  beverage: '🍷',
  other: '📋',
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
  testing: 'bg-brand-900 text-brand-400',
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
