// Universal Unit Conversion Engine - Deterministic
// Single canonical module for all culinary unit conversions.
// Handles same-type (volume-to-volume, weight-to-weight),
// cross-type (volume-to-weight via ingredient density), and cost normalization.
// Formula > AI. No LLM calls, ever.

// ── Canonical Unit Aliases ──────────────────────────────────────────────────
// Unifies aliases from grocery/unit-conversion.ts, formulas/unit-conversions.ts,
// and recipes/ingredient-parser.ts into one source of truth.

const UNIT_ALIASES: Record<string, string> = {
  // Volume
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  t: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  T: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  'fl oz': 'fl_oz',
  fl_oz: 'fl_oz',
  'fluid ounce': 'fl_oz',
  'fluid ounces': 'fl_oz',
  floz: 'fl_oz',
  pt: 'pint',
  pint: 'pint',
  pints: 'pint',
  qt: 'quart',
  quart: 'quart',
  quarts: 'quart',
  gal: 'gallon',
  gallon: 'gallon',
  gallons: 'gallon',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  dl: 'dl',
  deciliter: 'dl',
  deciliters: 'dl',

  // Weight
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  mg: 'mg',
  milligram: 'mg',
  milligrams: 'mg',

  // Count-based (not convertible to weight/volume)
  each: 'each',
  ea: 'each',
  piece: 'each',
  pieces: 'each',
  whole: 'each',
  unit: 'each',
  pinch: 'pinch',
  dash: 'dash',
  clove: 'clove',
  cloves: 'clove',
  bunch: 'bunch',
  bunches: 'bunch',
  head: 'head',
  heads: 'head',
  sprig: 'sprig',
  sprigs: 'sprig',
  slice: 'slice',
  slices: 'slice',
  can: 'can',
  cans: 'can',
  stick: 'stick',
  sticks: 'stick',
  package: 'package',
  packages: 'package',
  bag: 'bag',
  bags: 'bag',
  bottle: 'bottle',
  bottles: 'bottle',
  jar: 'jar',
  jars: 'jar',
}

// ── Volume conversions (base unit: ml) ──────────────────────────────────────
const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.929,
  tbsp: 14.787,
  fl_oz: 29.574,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
  ml: 1,
  dl: 100,
  l: 1000,
}

// ── Weight conversions (base unit: grams) ───────────────────────────────────
const WEIGHT_TO_G: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
}

// ── Unit type detection ─────────────────────────────────────────────────────

export type UnitType = 'volume' | 'weight' | 'count' | 'unknown'

export function getUnitType(unit: string): UnitType {
  const normalized = normalizeUnit(unit)
  if (normalized in VOLUME_TO_ML) return 'volume'
  if (normalized in WEIGHT_TO_G) return 'weight'
  // Known count-based units
  const countUnits = [
    'each',
    'pinch',
    'dash',
    'clove',
    'bunch',
    'head',
    'sprig',
    'slice',
    'can',
    'stick',
    'package',
    'bag',
    'bottle',
    'jar',
  ]
  if (countUnits.includes(normalized)) return 'count'
  return 'unknown'
}

// ── Normalize ───────────────────────────────────────────────────────────────

export function normalizeUnit(unit: string): string {
  const trimmed = unit.trim()
  // Check case-sensitive first ('T' = tablespoon in recipe shorthand)
  if (trimmed === 'T') return 'tbsp'
  const lower = trimmed.toLowerCase()
  return UNIT_ALIASES[lower] ?? lower
}

// ── Same-type conversion ────────────────────────────────────────────────────

/**
 * Convert a quantity between two units of the same type (volume-to-volume or weight-to-weight).
 * Returns null if conversion is not possible (different types or unknown units).
 *
 * For cross-type conversions (volume-to-weight), use convertWithDensity().
 */
export function convertQuantity(qty: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)

  if (from === to) return qty

  // Volume to volume
  if (from in VOLUME_TO_ML && to in VOLUME_TO_ML) {
    const ml = qty * VOLUME_TO_ML[from]
    return round4(ml / VOLUME_TO_ML[to])
  }

  // Weight to weight
  if (from in WEIGHT_TO_G && to in WEIGHT_TO_G) {
    const g = qty * WEIGHT_TO_G[from]
    return round4(g / WEIGHT_TO_G[to])
  }

  return null
}

/**
 * Convert a quantity between volume and weight using ingredient-specific density.
 * Density is expressed as grams per ml (g/ml).
 *
 * Common densities: water = 1.0, flour = 0.53, sugar = 0.85, butter = 0.91
 *
 * Returns null if either unit is not volume/weight, or density is not provided
 * when needed for cross-type conversion.
 */
export function convertWithDensity(
  qty: number,
  fromUnit: string,
  toUnit: string,
  densityGPerMl: number | null | undefined
): number | null {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)

  if (from === to) return qty

  // Same-type: no density needed
  const sameType = convertQuantity(qty, fromUnit, toUnit)
  if (sameType !== null) return sameType

  // Cross-type: need density
  if (!densityGPerMl || densityGPerMl <= 0) return null

  const fromType = getUnitType(from)
  const toType = getUnitType(to)

  // Volume -> Weight: convert volume to ml, multiply by density to get grams, convert grams to target weight
  if (fromType === 'volume' && toType === 'weight') {
    const ml = qty * VOLUME_TO_ML[from]
    const grams = ml * densityGPerMl
    return round4(grams / WEIGHT_TO_G[to])
  }

  // Weight -> Volume: convert weight to grams, divide by density to get ml, convert ml to target volume
  if (fromType === 'weight' && toType === 'volume') {
    const grams = qty * WEIGHT_TO_G[from]
    const ml = grams / densityGPerMl
    return round4(ml / VOLUME_TO_ML[to])
  }

  return null
}

// ── Cost normalization ──────────────────────────────────────────────────────

/**
 * Normalize a cost from one unit to another.
 * If the ingredient costs 500 cents per lb, and the recipe uses cups,
 * this converts to cents-per-cup using density.
 *
 * Returns null if conversion is not possible.
 */
export function convertCostToUnit(
  costCents: number,
  costUnit: string,
  targetUnit: string,
  densityGPerMl?: number | null
): number | null {
  // How many targetUnit fit in 1 costUnit?
  const oneOfCostInTarget = convertWithDensity(1, costUnit, targetUnit, densityGPerMl)
  if (oneOfCostInTarget === null || oneOfCostInTarget <= 0) return null

  // costCents per costUnit / (targetUnits per costUnit) = costCents per targetUnit
  return Math.round(costCents / oneOfCostInTarget)
}

/**
 * Calculate the cost of a specific quantity of an ingredient.
 * costCents is the price for 1 unit of costUnit.
 * Returns the cost in cents for qty of recipeUnit.
 *
 * Example: flour costs 300 cents per lb. Recipe uses 2 cups.
 *   computeIngredientCost(2, 'cup', 300, 'lb', 0.53) -> cost for 2 cups of flour
 */
export function computeIngredientCost(
  qty: number,
  recipeUnit: string,
  costPerUnitCents: number,
  costUnit: string,
  densityGPerMl?: number | null
): number | null {
  const from = normalizeUnit(recipeUnit)
  const to = normalizeUnit(costUnit)

  // Same unit: simple multiplication
  if (from === to) {
    return Math.round(qty * costPerUnitCents)
  }

  // Convert qty from recipeUnit to costUnit
  const qtyInCostUnit = convertWithDensity(qty, recipeUnit, costUnit, densityGPerMl)
  if (qtyInCostUnit === null) return null

  return Math.round(qtyInCostUnit * costPerUnitCents)
}

// ── Common Ingredient Densities (g/ml) ──────────────────────────────────────
// Fallback values for when the ingredient record doesn't have weight_to_volume_ratio.
// Sources: USDA FoodData Central, King Arthur Baking weight charts, CIA Baking & Pastry.
// These are approximations for the most common pantry items.

export const COMMON_DENSITIES: Record<string, number> = {
  // Flours & starches
  'all-purpose flour': 0.53,
  'all purpose flour': 0.53,
  'ap flour': 0.53,
  flour: 0.53,
  'bread flour': 0.55,
  'cake flour': 0.49,
  'pastry flour': 0.51,
  'whole wheat flour': 0.51,
  'rye flour': 0.46,
  'almond flour': 0.4,
  'coconut flour': 0.5,
  cornstarch: 0.54,
  'corn starch': 0.54,
  'potato starch': 0.65,
  'tapioca starch': 0.54,
  arrowroot: 0.54,

  // Sugars
  'granulated sugar': 0.85,
  sugar: 0.85,
  'white sugar': 0.85,
  'brown sugar': 0.83,
  'light brown sugar': 0.83,
  'dark brown sugar': 0.83,
  'powdered sugar': 0.56,
  'confectioners sugar': 0.56,
  'icing sugar': 0.56,
  honey: 1.42,
  'maple syrup': 1.33,
  molasses: 1.42,
  'agave nectar': 1.36,
  'corn syrup': 1.38,

  // Fats & oils
  butter: 0.91,
  'unsalted butter': 0.91,
  'salted butter': 0.91,
  'olive oil': 0.92,
  'vegetable oil': 0.92,
  'canola oil': 0.92,
  'coconut oil': 0.92,
  'sesame oil': 0.92,
  lard: 0.92,
  shortening: 0.82,

  // Dairy
  milk: 1.03,
  'whole milk': 1.03,
  'heavy cream': 1.01,
  'whipping cream': 1.01,
  'half and half': 1.02,
  'sour cream': 1.01,
  'cream cheese': 1.02,
  yogurt: 1.04,
  'greek yogurt': 1.1,
  buttermilk: 1.03,

  // Liquids
  water: 1.0,
  'chicken stock': 1.01,
  'chicken broth': 1.01,
  'beef stock': 1.01,
  'beef broth': 1.01,
  'vegetable stock': 1.0,
  'fish stock': 1.0,
  wine: 0.99,
  'white wine': 0.99,
  'red wine': 0.99,
  vinegar: 1.01,
  'soy sauce': 1.15,
  'fish sauce': 1.2,

  // Grains & legumes (dry)
  rice: 0.79,
  'white rice': 0.79,
  'brown rice': 0.75,
  oats: 0.35,
  'rolled oats': 0.35,
  quinoa: 0.72,
  couscous: 0.63,
  'dried lentils': 0.77,
  'dried beans': 0.77,

  // Nuts & seeds
  almonds: 0.6,
  walnuts: 0.46,
  pecans: 0.42,
  'pine nuts': 0.58,
  'sesame seeds': 0.6,
  'chia seeds': 0.65,
  'flax seeds': 0.53,
  'peanut butter': 1.08,

  // Common baking
  'cocoa powder': 0.42,
  'baking powder': 0.92,
  'baking soda': 0.92,
  salt: 1.22,
  'kosher salt': 0.64,
  'sea salt': 1.1,

  // Produce (approximate, for common prep states)
  'tomato paste': 1.1,
  'tomato sauce': 1.05,
  'canned tomatoes': 1.06,
}

/**
 * Look up a common density by ingredient name.
 * Tries exact match first, then checks if the name contains any known ingredient.
 * Returns null if no density is found.
 */
export function lookupDensity(ingredientName: string): number | null {
  const lower = ingredientName.toLowerCase().trim()

  // Exact match
  if (lower in COMMON_DENSITIES) return COMMON_DENSITIES[lower]

  // Partial match (e.g., "organic all-purpose flour" should match "all-purpose flour")
  for (const [key, value] of Object.entries(COMMON_DENSITIES)) {
    if (lower.includes(key)) return value
  }

  return null
}

// ── Compatibility check ─────────────────────────────────────────────────────

/**
 * Check if two units can be converted to each other.
 * If densityGPerMl is provided, cross-type (volume/weight) conversions are also possible.
 */
export function canConvert(unitA: string, unitB: string, densityGPerMl?: number | null): boolean {
  const a = normalizeUnit(unitA)
  const b = normalizeUnit(unitB)
  if (a === b) return true

  const typeA = getUnitType(a)
  const typeB = getUnitType(b)

  // Same type
  if (typeA === typeB && typeA !== 'unknown' && typeA !== 'count') return true

  // Cross-type with density
  if (densityGPerMl && densityGPerMl > 0) {
    const volumeWeight =
      (typeA === 'volume' && typeB === 'weight') || (typeA === 'weight' && typeB === 'volume')
    if (volumeWeight) return true
  }

  return false
}

// ── Internal helpers ────────────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
