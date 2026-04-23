const UNKNOWN_LOCATION_TOKENS = new Set([
  'tbd',
  't.b.d.',
  'to be determined',
  'unknown',
  'not set',
  'not yet set',
  'n/a',
  'na',
])

export function normalizeLocationTruthValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (UNKNOWN_LOCATION_TOKENS.has(trimmed.toLowerCase())) return null
  return trimmed
}

export function hasMeaningfulLocationTruth(
  values: Array<string | null | undefined>
): boolean {
  return values.some((value) => normalizeLocationTruthValue(value) !== null)
}

export function formatMeaningfulLocationTruth(
  values: Array<string | null | undefined>
): string | null {
  const pieces = values
    .map((value) => normalizeLocationTruthValue(value))
    .filter((value): value is string => value !== null)

  if (pieces.length === 0) return null
  return pieces.join(', ')
}
