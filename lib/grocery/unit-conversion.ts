// Unit normalization and quantity arithmetic for grocery list consolidation
// Companion to lib/formulas/unit-conversions.ts (which handles weight/temp conversions)

const UNIT_ALIASES: Record<string, string> = {
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
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  each: 'each',
  ea: 'each',
  bunch: 'bunch',
  bunches: 'bunch',
  can: 'can',
  cans: 'can',
  clove: 'clove',
  cloves: 'clove',
  head: 'head',
  heads: 'head',
  piece: 'piece',
  pieces: 'piece',
  pint: 'pint',
  pints: 'pint',
  quart: 'quart',
  quarts: 'quart',
  gallon: 'gallon',
  gallons: 'gallon',
}

// Conversion factors to a base unit within each family
const WEIGHT_TO_G: Record<string, number> = { g: 1, oz: 28.3495, lb: 453.592, kg: 1000 }
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  tsp: 4.929,
  tbsp: 14.787,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  l: 1000,
  gallon: 3785.41,
}

export function normalizeUnit(unit: string | null): string {
  if (!unit) return 'each'
  const lower = unit.trim().toLowerCase()
  return UNIT_ALIASES[lower] ?? lower
}

export function canConvert(unitA: string, unitB: string): boolean {
  const a = normalizeUnit(unitA)
  const b = normalizeUnit(unitB)
  if (a === b) return true
  if (a in WEIGHT_TO_G && b in WEIGHT_TO_G) return true
  if (a in VOLUME_TO_ML && b in VOLUME_TO_ML) return true
  return false
}

export function addQuantities(
  qtyA: number,
  unitA: string,
  qtyB: number,
  unitB: string
): { quantity: number; unit: string } {
  const a = normalizeUnit(unitA)
  const b = normalizeUnit(unitB)

  if (a === b) return { quantity: qtyA + qtyB, unit: a }

  // Weight family
  if (a in WEIGHT_TO_G && b in WEIGHT_TO_G) {
    const totalG = qtyA * WEIGHT_TO_G[a] + qtyB * WEIGHT_TO_G[b]
    // Return in the larger unit
    if (totalG >= 1000) return { quantity: Math.round(totalG / 10) / 100, unit: 'kg' }
    if (totalG >= 453) return { quantity: Math.round((totalG / 453.592) * 100) / 100, unit: 'lb' }
    if (totalG >= 28) return { quantity: Math.round((totalG / 28.3495) * 100) / 100, unit: 'oz' }
    return { quantity: Math.round(totalG * 100) / 100, unit: 'g' }
  }

  // Volume family
  if (a in VOLUME_TO_ML && b in VOLUME_TO_ML) {
    const totalMl = qtyA * VOLUME_TO_ML[a] + qtyB * VOLUME_TO_ML[b]
    if (totalMl >= 3785)
      return { quantity: Math.round((totalMl / 3785.41) * 100) / 100, unit: 'gallon' }
    if (totalMl >= 946)
      return { quantity: Math.round((totalMl / 946.353) * 100) / 100, unit: 'quart' }
    if (totalMl >= 236)
      return { quantity: Math.round((totalMl / 236.588) * 100) / 100, unit: 'cup' }
    if (totalMl >= 14) return { quantity: Math.round((totalMl / 14.787) * 100) / 100, unit: 'tbsp' }
    return { quantity: Math.round(totalMl * 100) / 100, unit: 'ml' }
  }

  // Incompatible units - just add and keep first unit
  return { quantity: qtyA + qtyB, unit: a }
}

export function formatQuantity(quantity: number, unit: string): string {
  const normalized = normalizeUnit(unit)
  const rounded = Math.round(quantity * 100) / 100
  // Clean up trailing zeros
  const num =
    rounded % 1 === 0
      ? rounded.toString()
      : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${num} ${normalized}`
}
