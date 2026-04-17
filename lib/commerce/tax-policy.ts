import type { TaxClass } from './constants'

const NON_TAXABLE_CLASSES = new Set<TaxClass>(['exempt', 'zero'])

export function isTaxableTaxClass(taxClass: TaxClass | null | undefined): boolean {
  const resolved = (taxClass ?? 'standard') as TaxClass
  return !NON_TAXABLE_CLASSES.has(resolved)
}

export function hasTaxableItems(items: Array<{ taxClass?: TaxClass | null | undefined }>): boolean {
  return items.some((item) => isTaxableTaxClass(item.taxClass))
}

/**
 * Compute tax cents for a line item using the tenant's configured tax rate.
 * Reads from sales_tax_settings (state_rate_bps + local_rate_bps).
 * Returns 0 if tax is disabled, not configured, or item is exempt.
 */
export function computeLineTaxCents(
  lineTotalCents: number,
  taxClass: TaxClass | null | undefined,
  taxRateBps: number
): number {
  if (!isTaxableTaxClass(taxClass)) return 0
  if (taxRateBps <= 0) return 0
  return Math.round((lineTotalCents * taxRateBps) / 10000)
}

/**
 * Fetch the tenant's combined tax rate in basis points.
 * Returns 0 if tax is disabled or not configured.
 */
export async function getTenantTaxRateBps(db: any, tenantId: string): Promise<number> {
  const { data } = await db
    .from('sales_tax_settings')
    .select('enabled, state_rate_bps, local_rate_bps')
    .eq('chef_id', tenantId)
    .maybeSingle()

  if (!data || !data.enabled) return 0
  return (data.state_rate_bps ?? 0) + (data.local_rate_bps ?? 0)
}
