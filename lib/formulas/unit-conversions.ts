// Unit Conversions — Deterministic Formulas
// Temperature (Fahrenheit ↔ Celsius) and Imperial ↔ Metric for cooking.
// These are exact mathematical formulas. No AI needed, ever.

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

/** Ounces to grams: 1 oz = 28.3495 g */
export function ozToG(ounces: number): number {
  return Math.round(ounces * 28.3495 * 100) / 100
}

/** Grams to ounces: 1 g = 0.035274 oz */
export function gToOz(grams: number): number {
  return Math.round(grams * 0.035274 * 100) / 100
}

/** Pounds to kilograms: 1 lb = 0.453592 kg */
export function lbToKg(pounds: number): number {
  return Math.round(pounds * 0.453592 * 100) / 100
}

/** Kilograms to pounds: 1 kg = 2.20462 lb */
export function kgToLb(kilograms: number): number {
  return Math.round(kilograms * 2.20462 * 100) / 100
}

/** Pounds to grams */
export function lbToG(pounds: number): number {
  return Math.round(pounds * 453.592 * 100) / 100
}

/** Grams to pounds */
export function gToLb(grams: number): number {
  return Math.round((grams / 453.592) * 100) / 100
}

// ── Volume ─────────────────────────────────────────────────────────────────

/** Fluid ounces to milliliters: 1 fl oz = 29.5735 mL */
export function flozToMl(fluidOunces: number): number {
  return Math.round(fluidOunces * 29.5735 * 100) / 100
}

/** Milliliters to fluid ounces: 1 mL = 0.033814 fl oz */
export function mlToFloz(milliliters: number): number {
  return Math.round(milliliters * 0.033814 * 100) / 100
}

/** Cups to milliliters: 1 cup = 236.588 mL */
export function cupToMl(cups: number): number {
  return Math.round(cups * 236.588 * 100) / 100
}

/** Milliliters to cups: 1 mL = 0.00422675 cups */
export function mlToCup(milliliters: number): number {
  return Math.round(milliliters * 0.00422675 * 100) / 100
}

/** Tablespoons to milliliters: 1 tbsp = 14.7868 mL */
export function tbspToMl(tablespoons: number): number {
  return Math.round(tablespoons * 14.7868 * 100) / 100
}

/** Milliliters to tablespoons */
export function mlToTbsp(milliliters: number): number {
  return Math.round((milliliters / 14.7868) * 100) / 100
}

/** Teaspoons to milliliters: 1 tsp = 4.92892 mL */
export function tspToMl(teaspoons: number): number {
  return Math.round(teaspoons * 4.92892 * 100) / 100
}

/** Milliliters to teaspoons */
export function mlToTsp(milliliters: number): number {
  return Math.round((milliliters / 4.92892) * 100) / 100
}

/** Gallons to liters: 1 gal = 3.78541 L */
export function galToL(gallons: number): number {
  return Math.round(gallons * 3.78541 * 100) / 100
}

/** Liters to gallons */
export function lToGal(liters: number): number {
  return Math.round((liters / 3.78541) * 100) / 100
}

/** Quarts to liters: 1 qt = 0.946353 L */
export function qtToL(quarts: number): number {
  return Math.round(quarts * 0.946353 * 100) / 100
}

/** Liters to quarts */
export function lToQt(liters: number): number {
  return Math.round((liters / 0.946353) * 100) / 100
}

/** Pints to milliliters: 1 pt = 473.176 mL */
export function ptToMl(pints: number): number {
  return Math.round(pints * 473.176 * 100) / 100
}

/** Milliliters to pints */
export function mlToPt(milliliters: number): number {
  return Math.round((milliliters / 473.176) * 100) / 100
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

/** Common cooking volume equivalents (US) */
export const VOLUME_EQUIVALENTS = {
  '1 cup': { tbsp: 16, tsp: 48, floz: 8, ml: 236.588 },
  '1 tbsp': { tsp: 3, floz: 0.5, ml: 14.7868 },
  '1 tsp': { ml: 4.92892 },
  '1 quart': { cups: 4, pints: 2, floz: 32, ml: 946.353 },
  '1 gallon': { quarts: 4, cups: 16, floz: 128, liters: 3.78541 },
  '1 pint': { cups: 2, floz: 16, ml: 473.176 },
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
  f_to_c: { fn: fToC, toUnit: '°C', formula: '(°F - 32) × 5/9', category: 'temperature' },
  c_to_f: { fn: cToF, toUnit: '°F', formula: '°C × 9/5 + 32', category: 'temperature' },
  oz_to_g: { fn: ozToG, toUnit: 'g', formula: 'oz × 28.3495', category: 'weight' },
  g_to_oz: { fn: gToOz, toUnit: 'oz', formula: 'g × 0.035274', category: 'weight' },
  lb_to_kg: { fn: lbToKg, toUnit: 'kg', formula: 'lb × 0.453592', category: 'weight' },
  kg_to_lb: { fn: kgToLb, toUnit: 'lb', formula: 'kg × 2.20462', category: 'weight' },
  cup_to_ml: { fn: cupToMl, toUnit: 'mL', formula: 'cups × 236.588', category: 'volume' },
  ml_to_cup: { fn: mlToCup, toUnit: 'cups', formula: 'mL × 0.00422675', category: 'volume' },
  tbsp_to_ml: { fn: tbspToMl, toUnit: 'mL', formula: 'tbsp × 14.7868', category: 'volume' },
  ml_to_tbsp: { fn: mlToTbsp, toUnit: 'tbsp', formula: 'mL / 14.7868', category: 'volume' },
  tsp_to_ml: { fn: tspToMl, toUnit: 'mL', formula: 'tsp × 4.92892', category: 'volume' },
  ml_to_tsp: { fn: mlToTsp, toUnit: 'tsp', formula: 'mL / 4.92892', category: 'volume' },
  gal_to_l: { fn: galToL, toUnit: 'L', formula: 'gal × 3.78541', category: 'volume' },
  l_to_gal: { fn: lToGal, toUnit: 'gal', formula: 'L / 3.78541', category: 'volume' },
  floz_to_ml: { fn: flozToMl, toUnit: 'mL', formula: 'fl oz × 29.5735', category: 'volume' },
  ml_to_floz: { fn: mlToFloz, toUnit: 'fl oz', formula: 'mL × 0.033814', category: 'volume' },
  in_to_cm: { fn: inToCm, toUnit: 'cm', formula: 'in × 2.54', category: 'length' },
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
