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

export function normalizeEventTimezoneTruthValue(value: string | null | undefined): string {
  const fallback = 'America/New_York'
  if (value == null) return fallback

  const normalized = value.trim()
  if (!normalized || UNKNOWN_TIME_TOKENS.has(normalized.toLowerCase())) {
    return fallback
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized }).format(new Date())
    return normalized
  } catch {
    return fallback
  }
}
