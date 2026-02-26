type PostgrestErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

export function isMissingSoftDeleteColumn(
  error: PostgrestErrorLike | null | undefined,
  column = 'deleted_at'
): boolean {
  if (!error) return false

  const haystack = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  const target = column.toLowerCase()
  const mentionsColumn = haystack.includes(target)
  if (!mentionsColumn) return false

  // Postgres missing-column error from SQL execution
  if (error.code === '42703' && haystack.includes('does not exist')) return true

  // PostgREST schema cache errors (column not present in exposed schema)
  if (haystack.includes('could not find') && haystack.includes('column')) return true
  if (haystack.includes('schema cache') && haystack.includes('column')) return true
  if (haystack.includes('not found') && haystack.includes('column')) return true

  return false
}
