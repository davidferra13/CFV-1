/**
 * OpenCLAW Region Configuration
 *
 * DB-driven pricing regions with hardcoded fallback for the original 4 regions.
 * The pricing_regions table (~400 entries) is the source of truth for national
 * pricing. The legacy REGIONS array is kept for backwards compat with scrapers
 * that reference region IDs directly.
 *
 * Not a 'use server' file. Pure config + DB lookups.
 */

// ---------------------------------------------------------------------------
// Legacy hardcoded regions (used by Pi scrapers, catalog UI store picker)
// ---------------------------------------------------------------------------

export interface Region {
  id: string
  label: string
  lat: number
  lng: number
  zip: string
  state: string
  radiusMiles: number
}

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

/** Get a legacy region by ID */
export function getRegion(regionId: string): Region | undefined {
  return REGIONS.find((r) => r.id === regionId)
}

/** Get a legacy region by zip code */
export function getRegionByZip(zip: string): Region | undefined {
  return REGIONS.find((r) => r.zip === zip)
}

/** Estimate coordinates for a zip code using region data */
export function estimateCoordsFromRegions(zip: string): [number, number] | null {
  const exactMatch = REGIONS.find((r) => r.zip === zip)
  if (exactMatch) return [exactMatch.lat, exactMatch.lng]

  const prefix = zip.substring(0, 3)
  const prefixMatch = REGIONS.find((r) => r.zip.startsWith(prefix))
  if (prefixMatch) return [prefixMatch.lat, prefixMatch.lng]

  return null
}

/** Get all region IDs for dropdowns */
export function getRegionOptions(): Array<{ value: string; label: string }> {
  return REGIONS.map((r) => ({ value: r.id, label: r.label }))
}

// ---------------------------------------------------------------------------
// DB-driven pricing regions (national coverage)
// ---------------------------------------------------------------------------

export interface PricingRegion {
  id: string
  name: string
  slug: string
  cbsaCode: string | null
  state: string
  states: string[]
  regionType: 'metro' | 'micro' | 'rural'
  costIndex: number
  lat: number | null
  lng: number | null
}

/**
 * Resolve a ZIP code to its pricing region via the database.
 * Returns the pre-assigned pricing region from openclaw.zip_centroids.
 * Falls back to legacy region matching if DB lookup fails.
 */
export async function resolvePricingRegion(zip: string): Promise<PricingRegion | null> {
  try {
    // Dynamic import to avoid circular deps in non-server contexts
    const { pgClient } = await import('@/lib/db')
    const sql = pgClient

    const rows = await sql`
      SELECT pr.id, pr.name, pr.slug, pr.cbsa_code, pr.state, pr.states,
             pr.region_type, pr.cost_index, pr.lat, pr.lng
      FROM openclaw.pricing_regions pr
      JOIN openclaw.zip_centroids zc ON zc.pricing_region_id = pr.id
      WHERE zc.zip = ${zip}
      LIMIT 1
    `

    if (rows.length > 0) {
      const r = rows[0]
      return {
        id: r.id as string,
        name: r.name as string,
        slug: r.slug as string,
        cbsaCode: (r.cbsa_code as string) || null,
        state: r.state as string,
        states: (r.states as string[]) || [],
        regionType: r.region_type as 'metro' | 'micro' | 'rural',
        costIndex: Number(r.cost_index),
        lat: r.lat ? Number(r.lat) : null,
        lng: r.lng ? Number(r.lng) : null,
      }
    }

    return null
  } catch {
    // Table may not exist yet; gracefully return null
    return null
  }
}

/**
 * Get all active pricing regions (for dropdowns, coverage maps).
 */
export async function getAllPricingRegions(): Promise<PricingRegion[]> {
  try {
    const { pgClient } = await import('@/lib/db')
    const sql = pgClient

    const rows = await sql`
      SELECT id, name, slug, cbsa_code, state, states,
             region_type, cost_index, lat, lng
      FROM openclaw.pricing_regions
      WHERE is_active = true
      ORDER BY population DESC NULLS LAST, name ASC
    `

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      cbsaCode: (r.cbsa_code as string) || null,
      state: r.state as string,
      states: (r.states as string[]) || [],
      regionType: r.region_type as 'metro' | 'micro' | 'rural',
      costIndex: Number(r.cost_index),
      lat: r.lat ? Number(r.lat) : null,
      lng: r.lng ? Number(r.lng) : null,
    }))
  } catch {
    return []
  }
}
