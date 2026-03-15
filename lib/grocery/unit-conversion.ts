// Unit Conversion - Deterministic
// Pure math for converting between compatible measurement units.
// No AI needed. Formula > AI.

// ── Unit Aliases ──────────────────────────────────────────────────────
// Normalize free-text units to canonical forms

const UNIT_ALIASES: Record<string, string> = {
  // Volume
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  qt: 'quart',
  quart: 'quart',
  quarts: 'quart',
  gal: 'gallon',
  gallon: 'gallon',
  gallons: 'gallon',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  'fl oz': 'fl_oz',
  'fluid ounce': 'fl_oz',
  'fluid ounces': 'fl_oz',

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

  // Count-based
  pinch: 'pinch',
  dash: 'dash',
  clove: 'clove',
  cloves: 'clove',
  bunch: 'bunch',
  bunches: 'bunch',
  piece: 'piece',
  pieces: 'piece',
  whole: 'piece',
  each: 'piece',
  can: 'can',
  cans: 'can',
  head: 'head',
  heads: 'head',
  sprig: 'sprig',
  sprigs: 'sprig',
  slice: 'slice',
  slices: 'slice',
  '': 'piece',
}

// ── Volume conversions (everything to tsp as base) ────────────────────
const VOLUME_TO_TSP: Record<string, number> = {
  tsp: 1,
  tbsp: 3,
  fl_oz: 6,
  cup: 48,
  quart: 192,
  gallon: 768,
  ml: 1 / 4.929,
  l: 202.884,
}

// ── Weight conversions (everything to oz as base) ─────────────────────
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  lb: 16,
  g: 1 / 28.3495,
  kg: 35.274,
}

/**
 * Normalize a free-text unit string to its canonical form.
 */
export function normalizeUnit(unit: string): string {
  return UNIT_ALIASES[unit.toLowerCase().trim()] ?? unit.toLowerCase().trim()
}

/**
 * Check if two units can be converted to each other.
 */
export function canConvert(unitA: string, unitB: string): boolean {
  const a = normalizeUnit(unitA)
  const b = normalizeUnit(unitB)
  if (a === b) return true
  const bothVolume = a in VOLUME_TO_TSP && b in VOLUME_TO_TSP
  const bothWeight = a in WEIGHT_TO_OZ && b in WEIGHT_TO_OZ
  return bothVolume || bothWeight
}

/**
 * Convert a quantity from one unit to a common base unit within its group.
 * Returns { quantity, unit } in the most readable unit for the magnitude.
 */
export function convertToCommonUnit(
  qty: number,
  fromUnit: string
): { quantity: number; unit: string } {
  const normalized = normalizeUnit(fromUnit)

  if (normalized in VOLUME_TO_TSP) {
    const totalTsp = qty * VOLUME_TO_TSP[normalized]
    return pickReadableVolume(totalTsp)
  }

  if (normalized in WEIGHT_TO_OZ) {
    const totalOz = qty * WEIGHT_TO_OZ[normalized]
    return pickReadableWeight(totalOz)
  }

  // Not a convertible unit, return as-is
  return { quantity: qty, unit: normalized }
}

/**
 * Add two quantities that may have different (but compatible) units.
 * Returns the sum in the most readable unit.
 */
export function addQuantities(
  qtyA: number,
  unitA: string,
  qtyB: number,
  unitB: string
): { quantity: number; unit: string } {
  const a = normalizeUnit(unitA)
  const b = normalizeUnit(unitB)

  if (a === b) {
    return { quantity: round(qtyA + qtyB), unit: a }
  }

  // Volume
  if (a in VOLUME_TO_TSP && b in VOLUME_TO_TSP) {
    const totalTsp = qtyA * VOLUME_TO_TSP[a] + qtyB * VOLUME_TO_TSP[b]
    return pickReadableVolume(totalTsp)
  }

  // Weight
  if (a in WEIGHT_TO_OZ && b in WEIGHT_TO_OZ) {
    const totalOz = qtyA * WEIGHT_TO_OZ[a] + qtyB * WEIGHT_TO_OZ[b]
    return pickReadableWeight(totalOz)
  }

  // Incompatible units, just sum the numbers (best effort)
  return { quantity: round(qtyA + qtyB), unit: a }
}

// ── Internal helpers ──────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function pickReadableVolume(totalTsp: number): { quantity: number; unit: string } {
  if (totalTsp >= 768) return { quantity: round(totalTsp / 768), unit: 'gallon' }
  if (totalTsp >= 192) return { quantity: round(totalTsp / 192), unit: 'quart' }
  if (totalTsp >= 48) return { quantity: round(totalTsp / 48), unit: 'cup' }
  if (totalTsp >= 3) return { quantity: round(totalTsp / 3), unit: 'tbsp' }
  return { quantity: round(totalTsp), unit: 'tsp' }
}

function pickReadableWeight(totalOz: number): { quantity: number; unit: string } {
  if (totalOz >= 16) return { quantity: round(totalOz / 16), unit: 'lb' }
  return { quantity: round(totalOz), unit: 'oz' }
}

/**
 * Format a quantity + unit for display.
 * Handles fractions nicely (e.g., 0.5 cup -> "1/2 cup").
 */
export function formatQuantity(qty: number, unit: string): string {
  if (qty <= 0) return ''

  // Common fractions for readability
  const fractions: [number, string][] = [
    [0.25, '1/4'],
    [0.33, '1/3'],
    [0.5, '1/2'],
    [0.67, '2/3'],
    [0.75, '3/4'],
  ]

  const whole = Math.floor(qty)
  const remainder = qty - whole

  let display = ''
  if (whole > 0 && remainder < 0.1) {
    display = `${whole}`
  } else if (whole > 0) {
    const fraction = fractions.find(([val]) => Math.abs(remainder - val) < 0.05)
    display = fraction ? `${whole} ${fraction[1]}` : `${round(qty)}`
  } else {
    const fraction = fractions.find(([val]) => Math.abs(qty - val) < 0.05)
    display = fraction ? fraction[1] : `${round(qty)}`
  }

  return unit ? `${display} ${unit}` : display
}
