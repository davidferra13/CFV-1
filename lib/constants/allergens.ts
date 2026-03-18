// Common Food Allergens - hardcoded reference list
// Based on FDA Big 9 (FALCPA + FASTER Act) plus common culinary allergens.
// Used by the allergy picker UI on events, clients, booking forms, and RSVP.
// Alphabetical within each tier for easy scanning.

/** FDA Big 9 - legally required allergen labeling in the US */
export const FDA_BIG_9 = [
  'Crustacean shellfish',
  'Eggs',
  'Fish',
  'Milk',
  'Peanuts',
  'Sesame',
  'Soybeans',
  'Tree nuts',
  'Wheat',
] as const

/** Common culinary allergens beyond the Big 9 */
export const COMMON_ALLERGENS = [
  'Alcohol',
  'Avocado',
  'Celery',
  'Citrus',
  'Coconut',
  'Corn',
  'Garlic',
  'Gluten',
  'Lupin',
  'Mollusks',
  'Mustard',
  'Nightshades',
  'Onion',
  'Red meat',
  'Sulfites',
] as const

/** Full combined list - Big 9 first (bolded in UI), then common, all alphabetical within group */
export const ALL_ALLERGENS = [...FDA_BIG_9, ...COMMON_ALLERGENS] as const

export type AllergenName = (typeof ALL_ALLERGENS)[number]

/** Short display labels for tight spaces (PDF tags, badges) */
export const ALLERGEN_SHORT: Record<string, string> = {
  'Crustacean shellfish': 'Shellfish',
  'Tree nuts': 'Tree Nuts',
  Soybeans: 'Soy',
  Nightshades: 'Nightshade',
}

/** Get display-friendly short name */
export function allergenShortName(name: string): string {
  return ALLERGEN_SHORT[name] ?? name
}
