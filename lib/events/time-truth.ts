const UNKNOWN_TIME_TOKENS = new Set(['tbd', 'unknown', 'n/a', 'na', 'none'])

export function normalizeEventTimeTruthValue(value: string | null | undefined): string | null {
  if (value == null) return null

  const normalized = value.trim()
  if (!normalized) return null

  if (UNKNOWN_TIME_TOKENS.has(normalized.toLowerCase())) {
    return null
  }

  return normalized
}
