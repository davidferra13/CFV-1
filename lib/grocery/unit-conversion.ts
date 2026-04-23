// Unit normalization and quantity arithmetic for grocery list consolidation
// Companion to lib/formulas/unit-conversions.ts (which handles weight/temp conversions)
// Conversion factors sourced from canonical knowledge layer (lib/costing/knowledge.ts).

import { WEIGHT_CONVERSIONS, VOLUME_CONVERSIONS } from '@/lib/costing/knowledge'
import { normalizeUnit as engineNormalizeUnit } from '@/lib/units/conversion-engine'

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

// Conversion factors to a base unit within each family (from canonical knowledge layer)
const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  oz: WEIGHT_CONVERSIONS.OZ_TO_G,
  lb: WEIGHT_CONVERSIONS.LB_TO_G,
  kg: WEIGHT_CONVERSIONS.KG_TO_G,
}
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  tsp: VOLUME_CONVERSIONS.TSP_TO_ML,
  tbsp: VOLUME_CONVERSIONS.TBSP_TO_ML,
  cup: VOLUME_CONVERSIONS.CUP_TO_ML,
  pint: VOLUME_CONVERSIONS.PINT_TO_ML,
  quart: VOLUME_CONVERSIONS.QUART_TO_ML,
  l: VOLUME_CONVERSIONS.L_TO_ML,
  gallon: VOLUME_CONVERSIONS.GALLON_TO_ML,
}

/**
 * Normalize a unit string. Delegates to the canonical conversion engine normalizer
 * which has a richer alias set (fl oz, dl, mg, sprig, slice, stick, package, bag, bottle, jar).
 * This wrapper handles the null case (conversion engine requires string).
 */
export function normalizeUnit(unit: string | null): string {
  if (!unit) return 'each'
  return engineNormalizeUnit(unit)
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
    if (totalG >= WEIGHT_CONVERSIONS.KG_TO_G)
      return { quantity: Math.round(totalG / 10) / 100, unit: 'kg' }
    if (totalG >= WEIGHT_CONVERSIONS.LB_TO_G)
      return { quantity: Math.round((totalG / WEIGHT_CONVERSIONS.LB_TO_G) * 100) / 100, unit: 'lb' }
    if (totalG >= WEIGHT_CONVERSIONS.OZ_TO_G)
      return { quantity: Math.round((totalG / WEIGHT_CONVERSIONS.OZ_TO_G) * 100) / 100, unit: 'oz' }
    return { quantity: Math.round(totalG * 100) / 100, unit: 'g' }
  }

  // Volume family
  if (a in VOLUME_TO_ML && b in VOLUME_TO_ML) {
    const totalMl = qtyA * VOLUME_TO_ML[a] + qtyB * VOLUME_TO_ML[b]
    if (totalMl >= VOLUME_CONVERSIONS.GALLON_TO_ML)
      return {
        quantity: Math.round((totalMl / VOLUME_CONVERSIONS.GALLON_TO_ML) * 100) / 100,
        unit: 'gallon',
      }
    if (totalMl >= VOLUME_CONVERSIONS.QUART_TO_ML)
      return {
        quantity: Math.round((totalMl / VOLUME_CONVERSIONS.QUART_TO_ML) * 100) / 100,
        unit: 'quart',
      }
    if (totalMl >= VOLUME_CONVERSIONS.CUP_TO_ML)
      return {
        quantity: Math.round((totalMl / VOLUME_CONVERSIONS.CUP_TO_ML) * 100) / 100,
        unit: 'cup',
      }
    if (totalMl >= VOLUME_CONVERSIONS.TBSP_TO_ML)
      return {
        quantity: Math.round((totalMl / VOLUME_CONVERSIONS.TBSP_TO_ML) * 100) / 100,
        unit: 'tbsp',
      }
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
