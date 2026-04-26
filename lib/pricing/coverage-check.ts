/** Check if pricing intelligence is available for a chef's region */
export function hasPricingCoverage(currencyCode: string): boolean {
  // Pricing engine is US-only. Expand this list as coverage grows.
  return currencyCode === 'USD'
}
