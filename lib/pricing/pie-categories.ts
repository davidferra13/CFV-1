/**
 * PIE Food Category Classification
 *
 * Defines which canonical_ingredient categories count as FOOD for PIE purposes.
 * Non-food categories (household, pets, personal care, etc.) are excluded from:
 * - Census counts
 * - Coverage metrics
 * - Synthetic generation targets
 * - Compliance measurements
 *
 * This is the single source of truth. All PIE queries filter through this.
 */

/** Categories that are definitively food/beverage ingredients a chef would price */
export const PIE_FOOD_CATEGORIES = [
  'Produce',
  'Protein',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Grains & Bakery',
  'Pantry',
  'Frozen',
  'Deli',
  'Prepared Foods',
  'Snacks & Candy',
  'Snacks',
  'Condiments & Sauces',
  'Oils, Vinegars, & Spices',
  'Baking Essentials',
  'Dry Goods & Pasta',
  'Canned Goods & Soups',
  'Beverages',
  'Alcohol',
  'Breakfast',
  'International',
  'Organic',
  'Natural',
  'flipp-circular',
] as const

/** Categories explicitly excluded from PIE (non-food store products) */
export const PIE_EXCLUDED_CATEGORIES = [
  'Other',
  'Kitchen Supplies',
  'Personal Care',
  'Personal_care',
  'Household',
  'Health Care',
  'Pets',
  'Pet',
  'Baby',
  'Electronics',
  'Batteries',
  'Automotive',
  'Office',
  'Garden',
  'Clothing',
] as const

/** Categories that need manual review (could be food or not) */
export const PIE_AMBIGUOUS_CATEGORIES = ['uncategorized', 'suggested', 'flipp-circular'] as const

export type PieFoodCategory = (typeof PIE_FOOD_CATEGORIES)[number]

/**
 * Check if a canonical_ingredient category counts as food for PIE.
 * Case-insensitive match against the food list.
 */
export function isFoodCategory(category: string | null | undefined): boolean {
  if (!category) return false
  const lower = category.toLowerCase()
  return PIE_FOOD_CATEGORIES.some((c) => c.toLowerCase() === lower)
}

/**
 * SQL fragment for filtering canonical_ingredients to food-only.
 * Use in WHERE clauses: `WHERE ${PIE_FOOD_CATEGORY_SQL}`
 */
export const PIE_FOOD_CATEGORY_SQL = `ci.category IN (${PIE_FOOD_CATEGORIES.map((c) => `'${c}'`).join(', ')})`
