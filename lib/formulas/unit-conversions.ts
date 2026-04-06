// Unit Conversions - Deterministic Formulas
// Temperature (Fahrenheit ↔ Celsius) and Imperial ↔ Metric for cooking.
// These are exact mathematical formulas. No AI needed, ever.
//
// Weight and volume factors sourced from canonical knowledge layer
// (lib/costing/knowledge.ts) to eliminate duplicated magic numbers.

import { WEIGHT_CONVERSIONS, VOLUME_CONVERSIONS } from '@/lib/costing/knowledge'

// ── Temperature ────────────────────────────────────────────────────────────

/** Fahrenheit to Celsius: C = (F - 32) × 5/9 */
export function fToC(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 100) / 100
}

/** Celsius to Fahrenheit: F = C × 9/5 + 32 */
export function cToF(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 100) / 100
}

// ── Weight ─────────────────────────────────────────────────────────────────

/** Ounces to grams */
export function ozToG(ounces: number): number {
  return Math.round(ounces * WEIGHT_CONVERSIONS.OZ_TO_G * 100) / 100
}

/** Grams to ounces */
export function gToOz(grams: number): number {
  return Math.round((grams / WEIGHT_CONVERSIONS.OZ_TO_G) * 100) / 100
}

/** Pounds to kilograms */
export function lbToKg(pounds: number): number {
  return (
    Math.round(((pounds * WEIGHT_CONVERSIONS.LB_TO_G) / WEIGHT_CONVERSIONS.KG_TO_G) * 100) / 100
  )
}

/** Kilograms to pounds */
export function kgToLb(kilograms: number): number {
  return Math.round(kilograms * WEIGHT_CONVERSIONS.KG_TO_LB * 100) / 100
}

/** Pounds to grams */
export function lbToG(pounds: number): number {
  return Math.round(pounds * WEIGHT_CONVERSIONS.LB_TO_G * 100) / 100
}

/** Grams to pounds */
export function gToLb(grams: number): number {
  return Math.round((grams / WEIGHT_CONVERSIONS.LB_TO_G) * 100) / 100
}

// ── Volume ─────────────────────────────────────────────────────────────────

/** Fluid ounces to milliliters */
export function flozToMl(fluidOunces: number): number {
  return Math.round(fluidOunces * VOLUME_CONVERSIONS.FL_OZ_TO_ML * 100) / 100
}

/** Milliliters to fluid ounces */
export function mlToFloz(milliliters: number): number {
  return Math.round((milliliters / VOLUME_CONVERSIONS.FL_OZ_TO_ML) * 100) / 100
}

/** Cups to milliliters */
export function cupToMl(cups: number): number {
  return Math.round(cups * VOLUME_CONVERSIONS.CUP_TO_ML * 100) / 100
}

/** Milliliters to cups */
export function mlToCup(milliliters: number): number {
  return Math.round((milliliters / VOLUME_CONVERSIONS.CUP_TO_ML) * 100) / 100
}

/** Tablespoons to milliliters */
export function tbspToMl(tablespoons: number): number {
  return Math.round(tablespoons * VOLUME_CONVERSIONS.TBSP_TO_ML * 100) / 100
}

/** Milliliters to tablespoons */
export function mlToTbsp(milliliters: number): number {
  return Math.round((milliliters / VOLUME_CONVERSIONS.TBSP_TO_ML) * 100) / 100
}

/** Teaspoons to milliliters */
export function tspToMl(teaspoons: number): number {
  return Math.round(teaspoons * VOLUME_CONVERSIONS.TSP_TO_ML * 100) / 100
}

/** Milliliters to teaspoons */
export function mlToTsp(milliliters: number): number {
  return Math.round((milliliters / VOLUME_CONVERSIONS.TSP_TO_ML) * 100) / 100
}

/** Gallons to liters */
export function galToL(gallons: number): number {
  return Math.round(gallons * VOLUME_CONVERSIONS.GALLON_TO_L * 100) / 100
}

/** Liters to gallons */
export function lToGal(liters: number): number {
  return Math.round((liters / VOLUME_CONVERSIONS.GALLON_TO_L) * 100) / 100
}

/** Quarts to liters */
export function qtToL(quarts: number): number {
  return Math.round(quarts * VOLUME_CONVERSIONS.QUART_TO_L * 100) / 100
}

/** Liters to quarts */
export function lToQt(liters: number): number {
  return Math.round((liters / VOLUME_CONVERSIONS.QUART_TO_L) * 100) / 100
}

/** Pints to milliliters */
export function ptToMl(pints: number): number {
  return Math.round(pints * VOLUME_CONVERSIONS.PINT_TO_ML * 100) / 100
}

/** Milliliters to pints */
export function mlToPt(milliliters: number): number {
  return Math.round((milliliters / VOLUME_CONVERSIONS.PINT_TO_ML) * 100) / 100
}

// ── Length / Distance (useful for pan sizes, etc.) ─────────────────────────

/** Inches to centimeters: 1 in = 2.54 cm (exact) */
export function inToCm(inches: number): number {
  return Math.round(inches * 2.54 * 100) / 100
}

/** Centimeters to inches */
export function cmToIn(centimeters: number): number {
  return Math.round((centimeters / 2.54) * 100) / 100
}

// ── Cooking-specific conversions ───────────────────────────────────────────

/** Common cooking volume equivalents (US) - derived from canonical constants */
export const VOLUME_EQUIVALENTS = {
  '1 cup': {
    tbsp: 16,
    tsp: 48,
    floz: VOLUME_CONVERSIONS.CUP_TO_FL_OZ,
    ml: VOLUME_CONVERSIONS.CUP_TO_ML,
  },
  '1 tbsp': { tsp: VOLUME_CONVERSIONS.TBSP_TO_TSP, floz: 0.5, ml: VOLUME_CONVERSIONS.TBSP_TO_ML },
  '1 tsp': { ml: VOLUME_CONVERSIONS.TSP_TO_ML },
  '1 quart': {
    cups: 4,
    pints: VOLUME_CONVERSIONS.QUART_TO_PINTS,
    floz: 32,
    ml: VOLUME_CONVERSIONS.QUART_TO_ML,
  },
  '1 gallon': {
    quarts: VOLUME_CONVERSIONS.GALLON_TO_QUARTS,
    cups: 16,
    floz: 128,
    liters: VOLUME_CONVERSIONS.GALLON_TO_L,
  },
  '1 pint': { cups: VOLUME_CONVERSIONS.PINT_TO_CUPS, floz: 16, ml: VOLUME_CONVERSIONS.PINT_TO_ML },
  '1 stick butter': { tbsp: 8, cups: 0.5, oz: 4, g: 113.4 },
} as const

// ── Generic converter ──────────────────────────────────────────────────────

export type UnitCategory = 'temperature' | 'weight' | 'volume' | 'length'

export type ConversionResult = {
  from: { value: number; unit: string }
  to: { value: number; unit: string }
  formula: string
}

const CONVERTERS: Record<
  string,
  { fn: (v: number) => number; toUnit: string; formula: string; category: UnitCategory }
> = {
  f_to_c: { fn: fToC, toUnit: '°C', formula: '(°F - 32) x 5/9', category: 'temperature' },
  c_to_f: { fn: cToF, toUnit: '°F', formula: '°C x 9/5 + 32', category: 'temperature' },
  oz_to_g: {
    fn: ozToG,
    toUnit: 'g',
    formula: `oz x ${WEIGHT_CONVERSIONS.OZ_TO_G}`,
    category: 'weight',
  },
  g_to_oz: {
    fn: gToOz,
    toUnit: 'oz',
    formula: `g / ${WEIGHT_CONVERSIONS.OZ_TO_G}`,
    category: 'weight',
  },
  lb_to_kg: {
    fn: lbToKg,
    toUnit: 'kg',
    formula: `lb x ${WEIGHT_CONVERSIONS.LB_TO_G} / 1000`,
    category: 'weight',
  },
  kg_to_lb: {
    fn: kgToLb,
    toUnit: 'lb',
    formula: `kg x ${WEIGHT_CONVERSIONS.KG_TO_LB}`,
    category: 'weight',
  },
  cup_to_ml: {
    fn: cupToMl,
    toUnit: 'mL',
    formula: `cups x ${VOLUME_CONVERSIONS.CUP_TO_ML}`,
    category: 'volume',
  },
  ml_to_cup: {
    fn: mlToCup,
    toUnit: 'cups',
    formula: `mL / ${VOLUME_CONVERSIONS.CUP_TO_ML}`,
    category: 'volume',
  },
  tbsp_to_ml: {
    fn: tbspToMl,
    toUnit: 'mL',
    formula: `tbsp x ${VOLUME_CONVERSIONS.TBSP_TO_ML}`,
    category: 'volume',
  },
  ml_to_tbsp: {
    fn: mlToTbsp,
    toUnit: 'tbsp',
    formula: `mL / ${VOLUME_CONVERSIONS.TBSP_TO_ML}`,
    category: 'volume',
  },
  tsp_to_ml: {
    fn: tspToMl,
    toUnit: 'mL',
    formula: `tsp x ${VOLUME_CONVERSIONS.TSP_TO_ML}`,
    category: 'volume',
  },
  ml_to_tsp: {
    fn: mlToTsp,
    toUnit: 'tsp',
    formula: `mL / ${VOLUME_CONVERSIONS.TSP_TO_ML}`,
    category: 'volume',
  },
  gal_to_l: {
    fn: galToL,
    toUnit: 'L',
    formula: `gal x ${VOLUME_CONVERSIONS.GALLON_TO_L}`,
    category: 'volume',
  },
  l_to_gal: {
    fn: lToGal,
    toUnit: 'gal',
    formula: `L / ${VOLUME_CONVERSIONS.GALLON_TO_L}`,
    category: 'volume',
  },
  floz_to_ml: {
    fn: flozToMl,
    toUnit: 'mL',
    formula: `fl oz x ${VOLUME_CONVERSIONS.FL_OZ_TO_ML}`,
    category: 'volume',
  },
  ml_to_floz: {
    fn: mlToFloz,
    toUnit: 'fl oz',
    formula: `mL / ${VOLUME_CONVERSIONS.FL_OZ_TO_ML}`,
    category: 'volume',
  },
  in_to_cm: { fn: inToCm, toUnit: 'cm', formula: 'in x 2.54', category: 'length' },
  cm_to_in: { fn: cmToIn, toUnit: 'in', formula: 'cm / 2.54', category: 'length' },
}

/**
 * Generic conversion by key. Use for UI dropdowns or API calls.
 * Example: convert(350, 'f_to_c') → { from: { value: 350, unit: '°F' }, to: { value: 176.67, unit: '°C' }, formula: '(°F - 32) × 5/9' }
 */
export function convert(value: number, conversionKey: string): ConversionResult | null {
  const converter = CONVERTERS[conversionKey]
  if (!converter) return null

  const fromUnit = conversionKey.split('_to_')[0].replace('_', ' ')
  return {
    from: { value, unit: fromUnit },
    to: { value: converter.fn(value), unit: converter.toUnit },
    formula: converter.formula,
  }
}

/** List all available conversions (for UI dropdown) */
export function listConversions(): Array<{ key: string; label: string; category: UnitCategory }> {
  return Object.entries(CONVERTERS).map(([key, { toUnit, category }]) => {
    const [from] = key.split('_to_')
    return {
      key,
      label: `${from.replace('_', ' ')} → ${toUnit}`,
      category,
    }
  })
}
