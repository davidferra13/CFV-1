const DIRECTORY_WAITLIST_ENTRY_SOURCES = [
  'directory_waitlist',
  'nearby_low_density',
  'nearby_no_results',
] as const

export const DEFAULT_DIRECTORY_WAITLIST_SOURCE = DIRECTORY_WAITLIST_ENTRY_SOURCES[0]
export const NEARBY_LOW_DENSITY_WAITLIST_SOURCE = DIRECTORY_WAITLIST_ENTRY_SOURCES[1]
export const NEARBY_NO_RESULTS_WAITLIST_SOURCE = DIRECTORY_WAITLIST_ENTRY_SOURCES[2]

const DIRECTORY_WAITLIST_ENTRY_SOURCE_SET = new Set<string>(DIRECTORY_WAITLIST_ENTRY_SOURCES)

function cleanText(value?: string | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeDirectoryWaitlistSource(source?: string | null) {
  const normalized = cleanText(source)
  if (!normalized) return DEFAULT_DIRECTORY_WAITLIST_SOURCE
  return DIRECTORY_WAITLIST_ENTRY_SOURCE_SET.has(normalized)
    ? normalized
    : DEFAULT_DIRECTORY_WAITLIST_SOURCE
}

export function buildDirectoryWaitlistLocation(city: string, state: string) {
  return `${city}, ${state}`
}

export function isDirectoryWaitlistSweepEligible(source?: string | null) {
  const normalized = cleanText(source)
  return !normalized || normalized === DEFAULT_DIRECTORY_WAITLIST_SOURCE
}
