type PostgrestErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

const SOURCING_COLUMNS = [
  'asset_state',
  'brand',
  'model',
  'canonical_name',
  'quantity_owned',
  'storage_location',
  'source_name',
  'source_kind',
  'source_url',
  'source_sku',
  'source_price_cents',
  'source_last_verified_at',
] as const

export function isMissingEquipmentSourcingColumn(error: PostgrestErrorLike | null | undefined) {
  if (!error) return false

  const haystack = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()

  if (!SOURCING_COLUMNS.some((column) => haystack.includes(column))) return false

  if (error.code === '42703' && haystack.includes('does not exist')) return true
  if (haystack.includes('could not find') && haystack.includes('column')) return true
  if (haystack.includes('schema cache') && haystack.includes('column')) return true
  if (haystack.includes('not found') && haystack.includes('column')) return true

  return false
}
