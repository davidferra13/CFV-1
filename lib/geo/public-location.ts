import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  geocodeAddress as geocodeWithGeocodio,
  reverseGeocode as reverseWithGeocodio,
} from '@/lib/geo/geocodio'

type UsState = { code: string; name: string }

export type ResolvedPublicLocation = {
  query: string
  displayLabel: string
  city: string | null
  state: string | null
  zip: string | null
  lat: number
  lng: number
}

type CachedLocationRow = {
  lookup_key: string
  input_address: string
  normalized_address: string | null
  matched_address: string | null
  city: string | null
  state: string | null
  zip: string | null
  lat: number
  lng: number
  source_name: string
}

type GeocodedLocation = {
  query: string
  city: string | null
  state: string | null
  zip: string | null
  lat: number
  lng: number
  matchedAddress: string | null
  sourceName: string
}

const ZIP_CODE_PATTERN = /^\d{5}(?:-\d{4})?$/
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'ChefFlow/1.0 (directory-location-search)'

const US_STATES: readonly UsState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const

const STATE_BY_CODE = new Map(US_STATES.map((state) => [state.code, state.name]))
const STATE_BY_NAME = new Map(US_STATES.map((state) => [state.name.toLowerCase(), state]))

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeZipCode(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return null
  const digits = trimmed.replace(/[^\d-]/g, '')
  if (!ZIP_CODE_PATTERN.test(digits)) return null
  return digits.slice(0, 5)
}

export function resolveUsStateValue(value: string | null | undefined): UsState | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  if (STATE_BY_CODE.has(upper)) {
    return { code: upper, name: STATE_BY_CODE.get(upper)! }
  }

  return STATE_BY_NAME.get(trimmed.toLowerCase()) ?? null
}

export function normalizeLocationStateToken(value: string | null | undefined) {
  return (
    resolveUsStateValue(value)?.code ?? (normalizeWhitespace(value ?? '').toLowerCase() || null)
  )
}

export function formatLocationQueryValue({
  city,
  state,
  zip,
}: {
  city?: string | null
  state?: string | null
  zip?: string | null
}) {
  const normalizedZip = normalizeZipCode(zip)
  if (normalizedZip) return normalizedZip

  const normalizedState = normalizeWhitespace(state ?? '')
  const normalizedCity = normalizeWhitespace(city ?? '')
  const stateValue = resolveUsStateValue(state)?.name ?? (normalizedState || null)
  const cityValue = normalizedCity || null
  const parts = [cityValue, stateValue].filter(Boolean)
  return parts.join(', ')
}

function formatDisplayLabel({
  city,
  state,
  zip,
  fallback,
}: {
  city: string | null
  state: string | null
  zip: string | null
  fallback: string
}) {
  const location = [city, state].filter(Boolean).join(', ')
  if (zip && location) return `${zip} - ${location}`
  if (zip) return zip
  if (location) return location
  return fallback
}

function buildForwardLookupKey(query: string) {
  const normalized = normalizeWhitespace(query).toLowerCase()
  const zip = normalizeZipCode(normalized)
  return zip ? `public-location:zip:${zip}` : `public-location:query:${normalized}`
}

function buildReverseLookupKey(lat: number, lng: number) {
  return `public-location:coords:${lat.toFixed(4)},${lng.toFixed(4)}`
}

function buildSearchQuery(query: string) {
  const zip = normalizeZipCode(query)
  if (zip) return `${zip}, USA`
  return query
}

function deriveCity(address: Record<string, string | undefined>) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.county ||
    null
  )
}

function asResolvedLocation(data: GeocodedLocation | CachedLocationRow): ResolvedPublicLocation {
  const fallback =
    'matchedAddress' in data
      ? data.matchedAddress || data.query
      : data.matched_address || data.normalized_address || data.input_address
  const zip = normalizeZipCode(data.zip)
  return {
    query:
      formatLocationQueryValue({
        city: data.city,
        state: data.state,
        zip,
      }) || fallback,
    displayLabel: formatDisplayLabel({
      city: data.city,
      state: data.state,
      zip,
      fallback,
    }),
    city: data.city,
    state: data.state,
    zip,
    lat: data.lat,
    lng: data.lng,
  }
}

async function getCachedLocation(lookupKey: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('public_location_references')
    .select(
      'lookup_key, input_address, normalized_address, matched_address, city, state, zip, lat, lng, source_name'
    )
    .eq('lookup_key', lookupKey)
    .maybeSingle()

  if (error) {
    console.error('[public-location] cache lookup failed:', error)
    return null
  }

  return (data as CachedLocationRow | null) ?? null
}

async function storeCachedLocation(keys: string[], location: GeocodedLocation) {
  const supabase = createAdminClient()
  const rows = keys.map((lookupKey) => ({
    lookup_key: lookupKey,
    input_address: location.query,
    normalized_address: normalizeWhitespace(location.query),
    matched_address: location.matchedAddress,
    city: location.city,
    state: location.state,
    zip: location.zip,
    lat: location.lat,
    lng: location.lng,
    source_name: location.sourceName,
    metadata: {
      cached_by: 'directory-location-search',
    },
  }))

  const { error } = await supabase
    .from('public_location_references')
    .upsert(rows, { onConflict: 'lookup_key' })

  if (error) {
    console.error('[public-location] cache write failed:', error)
  }
}

async function geocodeWithNominatim(query: string): Promise<GeocodedLocation | null> {
  try {
    const params = new URLSearchParams({
      q: buildSearchQuery(query),
      format: 'jsonv2',
      limit: '1',
      addressdetails: '1',
      countrycodes: 'us',
    })

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en',
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) return null

    const payload = (await response.json()) as Array<{
      lat: string
      lon: string
      display_name: string
      address?: Record<string, string | undefined>
    }>
    const result = payload[0]
    if (!result) return null

    const city = deriveCity(result.address || {})
    const stateName =
      resolveUsStateValue(result.address?.state || null)?.name || result.address?.state || null

    return {
      query,
      city,
      state: stateName,
      zip: normalizeZipCode(result.address?.postcode),
      lat: Number.parseFloat(result.lat),
      lng: Number.parseFloat(result.lon),
      matchedAddress: result.display_name || null,
      sourceName: 'nominatim',
    }
  } catch {
    return null
  }
}

async function reverseWithNominatim(lat: number, lng: number): Promise<GeocodedLocation | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
    })

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en',
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      display_name?: string
      address?: Record<string, string | undefined>
    }

    const city = deriveCity(payload.address || {})
    const stateName =
      resolveUsStateValue(payload.address?.state || null)?.name || payload.address?.state || null
    const zip = normalizeZipCode(payload.address?.postcode)
    const query =
      formatLocationQueryValue({
        city,
        state: stateName,
        zip,
      }) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`

    return {
      query,
      city,
      state: stateName,
      zip,
      lat,
      lng,
      matchedAddress: payload.display_name || null,
      sourceName: 'nominatim-reverse',
    }
  } catch {
    return null
  }
}

async function geocodeWithFallback(query: string): Promise<GeocodedLocation | null> {
  if (process.env.GEOCODIO_API_KEY) {
    const result = await geocodeWithGeocodio(buildSearchQuery(query))
    if (result) {
      const stateName =
        resolveUsStateValue(result.address_components.state || null)?.name ||
        result.address_components.state ||
        null

      return {
        query,
        city: result.address_components.city ?? null,
        state: stateName,
        zip: normalizeZipCode(result.address_components.zip),
        lat: result.location.lat,
        lng: result.location.lng,
        matchedAddress: result.formatted_address || null,
        sourceName: 'geocodio',
      }
    }
  }

  return geocodeWithNominatim(query)
}

async function reverseWithFallback(lat: number, lng: number): Promise<GeocodedLocation | null> {
  if (process.env.GEOCODIO_API_KEY) {
    const result = await reverseWithGeocodio(lat, lng)
    if (result) {
      const stateName =
        resolveUsStateValue(result.address_components.state || null)?.name ||
        result.address_components.state ||
        null
      const zip = normalizeZipCode(result.address_components.zip)

      return {
        query:
          formatLocationQueryValue({
            city: result.address_components.city ?? null,
            state: stateName,
            zip,
          }) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: result.address_components.city ?? null,
        state: stateName,
        zip,
        lat,
        lng,
        matchedAddress: result.formatted_address || null,
        sourceName: 'geocodio-reverse',
      }
    }
  }

  return reverseWithNominatim(lat, lng)
}

export async function resolvePublicLocationQuery(query: string) {
  const normalizedQuery = normalizeWhitespace(query)
  if (!normalizedQuery) return null

  const lookupKey = buildForwardLookupKey(normalizedQuery)
  const cached = await getCachedLocation(lookupKey)
  if (cached) return asResolvedLocation(cached)

  const geocoded = await geocodeWithFallback(normalizedQuery)
  if (!geocoded) return null

  await storeCachedLocation([lookupKey], geocoded)
  return asResolvedLocation(geocoded)
}

export async function reverseResolvePublicLocation(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const reverseKey = buildReverseLookupKey(lat, lng)
  const cached = await getCachedLocation(reverseKey)
  if (cached) return asResolvedLocation(cached)

  const geocoded = await reverseWithFallback(lat, lng)
  if (!geocoded) return null

  const keys = [reverseKey]
  const forwardKey = buildForwardLookupKey(geocoded.query)
  if (forwardKey !== reverseKey) keys.push(forwardKey)

  await storeCachedLocation(keys, geocoded)
  return asResolvedLocation(geocoded)
}

export function calculateDistanceMiles(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) {
  const earthRadiusMiles = 3958.8
  const latDelta = ((toLat - fromLat) * Math.PI) / 180
  const lngDelta = ((toLng - fromLng) * Math.PI) / 180
  const fromLatRadians = (fromLat * Math.PI) / 180
  const toLatRadians = (toLat * Math.PI) / 180

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLatRadians) *
      Math.cos(toLatRadians) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusMiles * c
}
