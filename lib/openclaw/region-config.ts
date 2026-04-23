/**
 * OpenCLAW Region Configuration
 * Defines geographic regions for price scraping and store lookup.
 * Adding a new region = one line in the REGIONS array. No code changes needed.
 *
 * Not a 'use server' file. Pure config, imported by both server and client code.
 */

export interface Region {
  id: string
  label: string
  lat: number
  lng: number
  zip: string
  state: string
  radiusMiles: number
}

/**
 * All supported regions. Add new regions here.
 * No code changes, no migrations, no deploys needed.
 */
export const REGIONS: Region[] = [
  {
    id: 'haverhill-ma',
    label: 'Haverhill / Merrimack Valley, MA',
    lat: 42.7762,
    lng: -71.0773,
    zip: '01835',
    state: 'MA',
    radiusMiles: 25,
  },
  {
    id: 'portland-me',
    label: 'Portland, ME',
    lat: 43.6591,
    lng: -70.2568,
    zip: '04101',
    state: 'ME',
    radiusMiles: 25,
  },
  {
    id: 'boston-ma',
    label: 'Boston, MA',
    lat: 42.3601,
    lng: -71.0589,
    zip: '02101',
    state: 'MA',
    radiusMiles: 15,
  },
  {
    id: 'portsmouth-nh',
    label: 'Portsmouth, NH',
    lat: 43.0718,
    lng: -70.7626,
    zip: '03801',
    state: 'NH',
    radiusMiles: 25,
  },
]

/** Get a region by ID */
export function getRegion(regionId: string): Region | undefined {
  return REGIONS.find((r) => r.id === regionId)
}

/** Get a region by zip code */
export function getRegionByZip(zip: string): Region | undefined {
  return REGIONS.find((r) => r.zip === zip)
}

/** Estimate coordinates for a zip code using region data */
export function estimateCoordsFromRegions(zip: string): [number, number] | null {
  // Exact zip match
  const exactMatch = REGIONS.find((r) => r.zip === zip)
  if (exactMatch) return [exactMatch.lat, exactMatch.lng]

  // 3-digit prefix match for rough area
  const prefix = zip.substring(0, 3)
  const prefixMatch = REGIONS.find((r) => r.zip.startsWith(prefix))
  if (prefixMatch) return [prefixMatch.lat, prefixMatch.lng]

  return null
}

/** Get all region IDs for dropdowns */
export function getRegionOptions(): Array<{ value: string; label: string }> {
  return REGIONS.map((r) => ({ value: r.id, label: r.label }))
}
