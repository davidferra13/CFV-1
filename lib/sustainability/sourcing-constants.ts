// Shared constants for sourcing display.
// Extracted from sourcing-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export type SourceType =
  | 'local_farm'
  | 'farmers_market'
  | 'organic'
  | 'conventional'
  | 'imported'
  | 'foraged'
  | 'garden'
  | 'specialty'

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  local_farm: 'Local Farm',
  farmers_market: "Farmer's Market",
  organic: 'Organic Supplier',
  conventional: 'Conventional',
  imported: 'Imported',
  foraged: 'Foraged',
  garden: 'Garden Grown',
  specialty: 'Specialty Purveyor',
}

export const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  local_farm: '#22c55e',
  farmers_market: '#84cc16',
  organic: '#10b981',
  conventional: '#94a3b8',
  imported: '#f97316',
  foraged: '#06b6d4',
  garden: '#14b8a6',
  specialty: '#8b5cf6',
}
