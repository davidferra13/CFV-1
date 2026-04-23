export const DEFAULT_NEARBY_RADIUS_MILES = 25
export const MAX_NEARBY_RADIUS_MILES = 250
export const NEARBY_RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const

const ZIP_CODE_PATTERN = /^\d{5}(?:-\d{4})?$/

export function normalizeNearbyLocationInput(value: string | null | undefined) {
  if (typeof value !== 'string') return ''

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
}

export function buildNearbyTsQuery(value: string | null | undefined) {
  const normalized = normalizeNearbyLocationInput(value).toLowerCase()
  if (!normalized) return null

  const terms = normalized.match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) ?? []
  if (terms.length === 0) return null

  return terms.map((term) => `${term}:*`).join(' & ')
}

export function normalizeNearbyZipCode(value: string | null | undefined) {
  const normalized = normalizeNearbyLocationInput(value)
  if (!normalized) return null

  const digitsOnly = normalized.replace(/[^\d-]/g, '')
  if (!ZIP_CODE_PATTERN.test(digitsOnly)) return null
  return digitsOnly.slice(0, 5)
}

export function normalizeNearbyRadius(
  value: string | number | null | undefined,
  fallback = DEFAULT_NEARBY_RADIUS_MILES
) {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value.trim() : '', 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(MAX_NEARBY_RADIUS_MILES, Math.max(1, Math.round(parsed)))
}

export function hasNearbyCoordinates(
  lat: number | null | undefined,
  lon: number | null | undefined
) {
  return Number.isFinite(lat) && Number.isFinite(lon)
}

export function formatDistanceMiles(distanceMiles: number | null | undefined) {
  if (!Number.isFinite(distanceMiles)) return null

  const miles = Number(distanceMiles)
  const display =
    miles >= 10 ? Math.round(miles).toLocaleString() : miles.toFixed(1).replace(/\.0$/, '')

  return `${display} mi away`
}
