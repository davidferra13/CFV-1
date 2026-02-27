// API Ninjas — free sales tax API by ZIP code
// https://api-ninjas.com/api/salestax
// 100,000 requests/month free, no credit card

const API_NINJAS_BASE = 'https://api.api-ninjas.com/v1'

export interface SalesTaxResult {
  zip_code: string
  federal_rate: number // Always 0 for US (no federal sales tax)
  state_rate: number
  county_rate: number
  city_rate: number
  combined_rate: number // Total effective rate
  state: string
}

export interface TaxCalculation {
  subtotalCents: number
  taxRate: number // Combined rate as decimal (e.g. 0.0825)
  taxAmountCents: number
  totalCents: number
  breakdown: {
    state: number
    county: number
    city: number
  }
}

function getApiKey(): string {
  const key = process.env.API_NINJAS_KEY
  if (!key) throw new Error('API_NINJAS_KEY not set in .env.local')
  return key
}

/**
 * Get sales tax rate for a US ZIP code.
 */
export async function getSalesTaxRate(zipCode: string): Promise<SalesTaxResult | null> {
  try {
    const res = await fetch(`${API_NINJAS_BASE}/salestax?zip_code=${zipCode}`, {
      headers: { 'X-Api-Key': getApiKey() },
      next: { revalidate: 86400 * 7 }, // cache 7 days — tax rates change slowly
    })
    if (!res.ok) return null
    const data = await res.json()
    // API returns an array, take the first result
    const result = Array.isArray(data) ? data[0] : data
    if (!result) return null

    return {
      zip_code: result.zip_code ?? zipCode,
      federal_rate: parseFloat(result.federal_rate) || 0,
      state_rate: parseFloat(result.state_rate) || 0,
      county_rate: parseFloat(result.county_rate) || 0,
      city_rate: parseFloat(result.city_rate) || 0,
      combined_rate: parseFloat(result.combined_rate) || 0,
      state: result.state ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Calculate tax on an amount (in cents) for a given ZIP code.
 * Returns the full breakdown — state, county, city.
 */
export async function calculateSalesTax(
  subtotalCents: number,
  zipCode: string
): Promise<TaxCalculation | null> {
  const rates = await getSalesTaxRate(zipCode)
  if (!rates) return null

  const taxRate = rates.combined_rate
  const taxAmountCents = Math.round(subtotalCents * taxRate)

  return {
    subtotalCents,
    taxRate,
    taxAmountCents,
    totalCents: subtotalCents + taxAmountCents,
    breakdown: {
      state: rates.state_rate,
      county: rates.county_rate,
      city: rates.city_rate,
    },
  }
}

/**
 * Format a tax rate as a percentage string.
 * e.g. 0.0825 → "8.25%"
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}
