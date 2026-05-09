/**
 * Non-Food Product Filter
 *
 * Catches individual products that slip through category-level filtering.
 * These are non-food items that exist in grocery store databases under
 * food-adjacent categories (e.g., Kotex in "Personal Care" miscategorized
 * as "Other", Krazy Glue in "Household" leaking through ambiguous mapping).
 *
 * Applied at census ingestion and price sync time to prevent contamination.
 * Pure function, no side effects.
 */

// --- Explicit brand/product exclusions ---
// Products observed contaminating PIE data (from accuracy logs)
const EXCLUDED_BRANDS = new Set([
  'kotex',
  'u by kotex',
  'always',
  'tampax',
  'playtex',
  'stayfree',
  'depend',
  'poise',
  'tena',
  'huggies',
  'pampers',
  'luvs',
  'pull-ups',
  'krazy glue',
  'gorilla glue',
  'elmer',
  'elmers',
  "elmer's",
  'scotch tape',
  'duct tape',
  'bounty',
  'charmin',
  'quilted northern',
  'angel soft',
  'cottonelle',
  'scott tissue',
  'swiffer',
  'lysol',
  'clorox',
  'windex',
  'pledge',
  'febreze',
  'glade',
  'air wick',
  'glad bags',
  'hefty',
  'ziploc',
  'reynolds wrap',
  'duracell',
  'energizer',
  'rayovac',
  'tide',
  'gain',
  'downy',
  'bounce',
  'oxiclean',
  'shout',
  'resolve',
  'dawn dish',
  'cascade',
  'finish dishwasher',
  'palmolive dish',
  'ajax',
  'comet',
  'mr clean',
  'mr. clean',
  'pine-sol',
  'fabuloso',
  'purell',
  'band-aid',
  'band aid',
  'neosporin',
  'tylenol',
  'advil',
  'motrin',
  'benadryl',
  'zyrtec',
  'claritin',
  'pepto',
  'tums',
  'rolaids',
  'preparation h',
  'colgate',
  'crest',
  'oral-b',
  'listerine',
  'scope',
  'head & shoulders',
  'pantene',
  'herbal essences',
  'dove soap',
  'irish spring',
  'dial soap',
  'old spice',
  'degree',
  'secret deodorant',
  'gillette',
  'schick',
  'bic razor',
  'purina',
  'iams',
  'pedigree',
  'meow mix',
  'fancy feast',
  'friskies',
  'kibbles',
  'milk-bone',
  'greenies',
])

// --- Keyword patterns that indicate non-food products ---
const NON_FOOD_PATTERNS = [
  /\b(diaper|nappy|wipe|tissue|toilet paper|paper towel)\b/,
  /\b(detergent|fabric softener|dryer sheet|bleach|stain remover)\b/,
  /\b(shampoo|conditioner|body wash|beauty bar|soap|lotion|moisturizer|sunscreen)\b/,
  /\b(deodorant|antiperspirant|cologne|perfume|aftershave)\b/,
  /\b(toothpaste|toothbrush|mouthwash|dental floss)\b/,
  /\b(tampon|pad|liner|menstrual|feminine)\b/,
  /\b(battery|batteries|light bulb|extension cord)\b/,
  /\b(trash bag|garbage bag|storage bag|sandwich bag)\b/,
  /\b(aluminum foil|plastic wrap|parchment|wax paper)\b/,
  /\b(sponge|scrubber|mop|broom|dustpan)\b/,
  /\b(air freshener|candle|incense|diffuser)\b/,
  /\b(pet food|dog food|cat food|cat litter|kibble|chew toy)\b/,
  /\b(vitamin|supplement|probiotic|fiber pill|laxative)\b/,
  /\b(bandage|gauze|first aid|antiseptic|peroxide)\b/,
  /\b(insecticide|pesticide|ant trap|roach|mouse trap|rat poison)\b/,
  /\b(motor oil|windshield|antifreeze|car wash)\b/,
  /\b(notebook|pen|pencil|marker|crayon|staple)\b/,
  /\b(light bulb|led bulb|lamp|flashlight)\b/,
]

// --- Items that LOOK non-food but ARE food ---
// Prevent false positives
const FOOD_OVERRIDES = new Set([
  'bounty bar', // chocolate bar, not paper towels
  'dawn fresh', // mushroom soup brand, not dish soap
  'comet rice', // rice brand
  'glad corn', // could be corn product
  'resolve juice', // juice brand
  'angel food cake', // not angel soft toilet paper
  'irish cream', // not irish spring soap
  'old bay', // not old spice
  'dove chocolate', // not dove soap
  'dial seasoning', // not dial soap
])

/**
 * Check if a product name is likely non-food.
 * Returns true if the item should be EXCLUDED from PIE.
 *
 * @param productName - The raw product name from store data
 * @param category - Optional category for context
 */
export function isNonFood(productName: string, category?: string | null): boolean {
  const lower = productName.toLowerCase().trim()

  // Check food overrides first (prevent false positives)
  if (FOOD_OVERRIDES.has(lower)) return false
  for (const override of FOOD_OVERRIDES) {
    if (lower.includes(override)) return false
  }

  // Check excluded brands
  for (const brand of EXCLUDED_BRANDS) {
    if (lower.includes(brand)) return true
  }

  // Check keyword patterns
  for (const pattern of NON_FOOD_PATTERNS) {
    if (pattern.test(lower)) return true
  }

  // Category-based exclusion (if category provided and clearly non-food)
  if (category) {
    const catLower = category.toLowerCase()
    const nonFoodCats = [
      'personal care',
      'household',
      'pets',
      'pet',
      'baby',
      'electronics',
      'automotive',
      'office',
      'garden',
      'clothing',
      'health care',
      'beauty',
      'cleaning',
      'laundry',
      'paper products',
    ]
    if (nonFoodCats.some((c) => catLower.includes(c))) return true
  }

  return false
}

/**
 * Filter an array of products, removing non-food items.
 * Returns only items that pass the food filter.
 */
export function filterFoodOnly<T extends { name: string; category?: string | null }>(
  products: T[]
): T[] {
  return products.filter((p) => !isNonFood(p.name, p.category))
}

/**
 * Get stats on how many items would be filtered.
 * Useful for census hygiene reporting.
 */
export function getFilterStats(products: Array<{ name: string; category?: string | null }>): {
  total: number
  food: number
  nonFood: number
  nonFoodPct: number
} {
  const nonFood = products.filter((p) => isNonFood(p.name, p.category))
  return {
    total: products.length,
    food: products.length - nonFood.length,
    nonFood: nonFood.length,
    nonFoodPct:
      products.length > 0 ? Math.round((nonFood.length / products.length) * 1000) / 10 : 0,
  }
}
