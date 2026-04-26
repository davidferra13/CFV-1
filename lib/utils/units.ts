export type MeasurementSystem = 'imperial' | 'metric'

const CONVERSIONS: Record<string, { metric: string; factor: number }> = {
  oz: { metric: 'g', factor: 28.3495 },
  lb: { metric: 'kg', factor: 0.453592 },
  'fl oz': { metric: 'mL', factor: 29.5735 },
  cup: { metric: 'mL', factor: 236.588 },
  gal: { metric: 'L', factor: 3.78541 },
  tsp: { metric: 'mL', factor: 4.92892 },
  tbsp: { metric: 'mL', factor: 14.7868 },
}

/** Convert a quantity for display in the user's preferred system */
export function displayQuantity(
  amount: number,
  unit: string,
  system: MeasurementSystem
): { amount: number; unit: string } {
  if (system === 'imperial') return { amount, unit }

  const conv = CONVERSIONS[unit.toLowerCase()]
  if (!conv) return { amount, unit } // unknown unit, pass through

  return {
    amount: Math.round(amount * conv.factor * 100) / 100,
    unit: conv.metric,
  }
}

/** Convert temperature for display */
export function displayTemp(
  fahrenheit: number,
  system: MeasurementSystem
): { value: number; unit: string } {
  if (system === 'imperial') return { value: fahrenheit, unit: 'F' }
  return { value: Math.round(((fahrenheit - 32) * 5) / 9), unit: 'C' }
}
