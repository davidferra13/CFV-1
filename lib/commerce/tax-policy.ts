import type { TaxClass } from './constants'

const NON_TAXABLE_CLASSES = new Set<TaxClass>(['exempt', 'zero'])

export function isTaxableTaxClass(taxClass: TaxClass | null | undefined): boolean {
  const resolved = (taxClass ?? 'standard') as TaxClass
  return !NON_TAXABLE_CLASSES.has(resolved)
}

export function hasTaxableItems(items: Array<{ taxClass?: TaxClass | null | undefined }>): boolean {
  return items.some((item) => isTaxableTaxClass(item.taxClass))
}
