'use server'

// External Directory Listing Actions
// Public queries + admin mutations for the /nearby directory.
// Uses admin client for all operations since this table uses service_role RLS.

import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { getCurrentUser, requireClient } from '@/lib/auth/get-user'
import { resolvePublicLocationQuery } from '@/lib/geo/public-location'
import { z } from 'zod'
import { slugify, ITEMS_PER_PAGE, normalizeUsStateCode } from './constants'
import { DIRECTORY_CANONICAL_STATE_SQL as CANONICAL_STATE_SQL } from './directory-state-sql'
import {
  findChefAccountIdByEmail,
  findDirectoryListingMatch as sharedFindDirectoryListingMatch,
  linkDirectoryListingToChefAccount,
  type DirectoryListingAccountLinkConfidence,
  type DirectoryListingAccountLinkReason,
} from './entity-resolution'
import {
  buildNearbyTsQuery,
  hasNearbyCoordinates,
  normalizeNearbyLocationInput,
  normalizeNearbyRadius,
  normalizeNearbyZipCode,
} from './nearby-search'
import {
  curateNearbyCollectionCandidates,
  type NearbyCollectionCurationSummary,
} from './nearby-collection-readiness'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DirectoryListing = {
  id: string
  name: string
  slug: string
  city: string | null
  neighborhood: string | null
  state: string | null
  cuisine_types: string[]
  business_type: string
  website_url: string | null
  status: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  hours: Record<string, string> | null
  photo_urls: string[]
  menu_url: string | null
  price_range: string | null
  source: string
  featured: boolean
  claimed_by_name: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
  lat: number | null
  lon: number | null
  postcode: string | null
  lead_score: number | null
  osm_id: string | null
  linked_chef_id: string | null
  linked_chef_confidence?: DirectoryListingAccountLinkConfidence | null
  linked_chef_reason?: DirectoryListingAccountLinkReason | null
  linked_chef_at?: string | null
  linked_chef?: DirectoryLinkedChefSummary | null
  is_favorited: boolean
}

export type DirectoryLinkedChefSummary = {
  id: string
  slug: string
  display_name: string
}

export type DirectoryListingSummary = Pick<
  DirectoryListing,
  | 'id'
  | 'name'
  | 'slug'
  | 'city'
  | 'state'
  | 'cuisine_types'
  | 'business_type'
  | 'website_url'
  | 'status'
  | 'price_range'
  | 'featured'
  | 'description'
  | 'photo_urls'
  | 'phone'
  | 'address'
  | 'lat'
  | 'lon'
  | 'lead_score'
> & {
  source?: DirectoryListing['source'] | null
  email?: DirectoryListing['email'] | null
  hours?: DirectoryListing['hours'] | null
  menu_url?: DirectoryListing['menu_url'] | null
  claimed_at?: DirectoryListing['claimed_at'] | null
  updated_at?: DirectoryListing['updated_at'] | null
  distance_miles: number | null
  is_favorited: boolean
}

export type ResolvedDirectoryLocation = {
  query: string
  displayLabel: string
  city: string | null
  state: string | null
  zip: string | null
  lat: number
  lon: number
  source: 'zip_centroid' | 'geocoded'
}

export type PaginatedListings = {
  listings: DirectoryListingSummary[]
  total: number
  page: number
  totalPages: number
  collectionReadiness?: NearbyCollectionCurationSummary | null
}

export type DirectoryStats = {
  totalListings: number
  states: { state: string; count: number }[]
  topCities: { city: string; state: string; count: number }[]
  topBusinessTypes: { businessType: string; count: number }[]
  topCityBusinessTypes: {
    city: string
    state: string
    businessType: string
    count: number
  }[]
}

type GeoDistanceStrategy = 'postgis' | 'haversine'

type DirectorySubmissionResult = {
  success: boolean
  error?: string
  slug?: string
  mode?: 'submitted' | 'claimed_existing' | 'already_claimed'
}

let geoDistanceStrategyPromise: Promise<GeoDistanceStrategy> | null = null

function buildDistanceSql(
  strategy: GeoDistanceStrategy,
  latParam: string,
  lonParam: string,
  latColumn = 'lat',
  lonColumn = 'lon'
) {
  if (strategy === 'postgis') {
    return `CASE
      WHEN ${latColumn} IS NOT NULL AND ${lonColumn} IS NOT NULL
        THEN ST_DistanceSphere(
          ST_MakePoint(${lonColumn}, ${latColumn}),
          ST_MakePoint(${lonParam}, ${latParam})
        ) / 1609.344
      ELSE NULL
    END`
  }

  return `CASE
    WHEN ${latColumn} IS NOT NULL AND ${lonColumn} IS NOT NULL
      THEN 3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${latParam})) * cos(radians(${latColumn})) *
          cos(radians(${lonColumn}) - radians(${lonParam})) +
          sin(radians(${latParam})) * sin(radians(${latColumn}))
        ))
      )
    ELSE NULL
  END`
}

function addRadiusBoundingBox(
  conditions: string[],
  params: Array<string | number>,
  paramIndex: number,
  userLat: number,
  userLon: number,
  radiusMiles: number
) {
  const latDelta = radiusMiles / 69
  const milesPerLonDegree = Math.max(Math.abs(Math.cos((userLat * Math.PI) / 180)) * 69.172, 0.01)
  const lonDelta = Math.min(180, radiusMiles / milesPerLonDegree)

  conditions.push('lat IS NOT NULL', 'lon IS NOT NULL')
  conditions.push(`lat BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
  params.push(userLat - latDelta, userLat + latDelta)
  paramIndex += 2
  conditions.push(`lon BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
  params.push(userLon - lonDelta, userLon + lonDelta)
  return paramIndex + 2
}

function normalizeMatchName(value: string) {
  return value.replace(/['’]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalizeDirectoryListingSummary(row: any): DirectoryListingSummary {
  return {
    ...row,
    lat: row.lat != null ? Number(row.lat) : null,
    lon: row.lon != null ? Number(row.lon) : null,
    lead_score: row.lead_score != null ? Number(row.lead_score) : null,
    claimed_at: normalizeDirectoryDateValue(row.claimed_at),
    updated_at: normalizeDirectoryDateValue(row.updated_at),
    distance_miles:
      row.distance_miles != null ? Math.round(Number(row.distance_miles) * 10) / 10 : null,
    is_favorited: Boolean(row.is_favorited),
  }
}

function normalizeDirectoryDateValue(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' ? value : null
}

function normalizeDirectoryListing(row: any): DirectoryListing {
  return {
    ...(row as DirectoryListing),
    state: normalizeUsStateCode(row.state) ?? row.state,
    lat: row.lat != null ? Number(row.lat) : null,
    lon: row.lon != null ? Number(row.lon) : null,
    lead_score: row.lead_score != null ? Number(row.lead_score) : null,
    claimed_at: normalizeDirectoryDateValue(row.claimed_at),
    linked_chef_at: normalizeDirectoryDateValue(row.linked_chef_at),
    is_favorited: Boolean(row.is_favorited),
    linked_chef: row.linked_chef ?? null,
  }
}

async function getPublicLinkedChefSummary(
  db: any,
  chefId: string
): Promise<DirectoryLinkedChefSummary | null> {
  const { data, error } = await db
    .from('chefs')
    .select(
      `
      id,
      slug,
      display_name,
      business_name,
      directory_approved,
      chef_preferences!inner(network_discoverable)
    `
    )
    .eq('id', chefId)
    .eq('directory_approved', true)
    .eq('chef_preferences.network_discoverable', true)
    .not('slug', 'is', null)
    .maybeSingle()

  if (error || !data) return null

  const chef = data as {
    id: string
    slug: string
    display_name: string | null
    business_name: string | null
  }

  return {
    id: chef.id,
    slug: chef.slug,
    display_name: chef.display_name || chef.business_name || 'Chef',
  }
}

async function getAdminLinkedChefMap(db: any, chefIds: string[]) {
  if (chefIds.length === 0) return new Map<string, DirectoryLinkedChefSummary>()

  const { data, error } = await db
    .from('chefs')
    .select('id, slug, display_name, business_name')
    .in('id', chefIds)

  if (error) {
    console.error('[getAdminLinkedChefMap]', error)
    return new Map<string, DirectoryLinkedChefSummary>()
  }

  return new Map(
    (((data as any[] | null) ?? []).map((chef) => [
      chef.id as string,
      {
        id: chef.id as string,
        slug: (chef.slug as string | null) || '',
        display_name:
          (chef.display_name as string | null) || (chef.business_name as string | null) || 'Chef',
      },
    ]) as Array<[string, DirectoryLinkedChefSummary]>)
  )
}

async function tryLinkListingToChefByEmail(
  db: any,
  input: {
    listingId: string
    email: string
    confidence: DirectoryListingAccountLinkConfidence
    reason: DirectoryListingAccountLinkReason
  }
) {
  const chefId = await findChefAccountIdByEmail(db, input.email)
  if (!chefId) return null

  try {
    return await linkDirectoryListingToChefAccount(db, {
      listingId: input.listingId,
      chefId,
      confidence: input.confidence,
      reason: input.reason,
    })
  } catch (err) {
    console.error('[tryLinkListingToChefByEmail]', err)
    return null
  }
}

type DirectoryFavoriteHydratable = {
  id: string
  is_favorited?: boolean
}

type DirectoryFavoriteRow = {
  listing_id: string
}

type DirectoryListingQueryOptions = {
  includeViewerState?: boolean
}

async function getViewerClientId(includeViewerState: boolean): Promise<string | null> {
  if (!includeViewerState) return null
  const user = await getCurrentUser()
  return user?.role === 'client' ? user.entityId : null
}

async function hydrateDirectoryFavoriteFlags<T extends DirectoryFavoriteHydratable>(
  db: any,
  listings: T[],
  options: DirectoryListingQueryOptions = {}
): Promise<Array<T & { is_favorited: boolean }>> {
  if (listings.length === 0) return listings.map((listing) => ({ ...listing, is_favorited: false }))

  const clientId = await getViewerClientId(options.includeViewerState === true)
  if (!clientId) {
    return listings.map((listing) => ({ ...listing, is_favorited: Boolean(listing.is_favorited) }))
  }

  const listingIds = Array.from(new Set(listings.map((listing) => listing.id)))
  const { data, error } = await db
    .from('directory_listing_favorites')
    .select('listing_id')
    .eq('client_id', clientId)
    .in('listing_id', listingIds)

  if (error) {
    console.error('[hydrateDirectoryFavoriteFlags]', error)
    return listings.map((listing) => ({ ...listing, is_favorited: Boolean(listing.is_favorited) }))
  }

  const favorites = new Set(
    ((data as DirectoryFavoriteRow[] | null) ?? []).map((row) => row.listing_id)
  )

  return listings.map((listing) => ({
    ...listing,
    is_favorited: favorites.has(listing.id),
  }))
}

async function getGeoDistanceStrategy(): Promise<GeoDistanceStrategy> {
  if (!geoDistanceStrategyPromise) {
    geoDistanceStrategyPromise = (async () => {
      try {
        const rows = await pgClient`
          SELECT EXISTS (
            SELECT 1
            FROM pg_extension
            WHERE extname = 'postgis'
          ) AS enabled
        `

        return rows[0]?.enabled ? 'postgis' : 'haversine'
      } catch {
        return 'haversine'
      }
    })()
  }

  return geoDistanceStrategyPromise
}

// ─── Public Queries ───────────────────────────────────────────────────────────

export type DiscoverFilters = {
  query?: string
  businessType?: string
  cuisine?: string
  city?: string
  state?: string
  priceRange?: string
  page?: number
  resultMode?: 'browse' | 'curated_collection'
  radiusMiles?: number
  /** User latitude for proximity sorting (optional, from browser geolocation) */
  userLat?: number
  /** User longitude for proximity sorting (optional, from browser geolocation) */
  userLon?: number
}

function formatResolvedLocationDisplayLabel({
  zip,
  city,
  state,
  fallback,
}: {
  zip?: string | null
  city?: string | null
  state?: string | null
  fallback: string
}) {
  const location = [city, state].filter(Boolean).join(', ')
  if (zip && location) return `${zip} - ${location}`
  if (zip) return zip
  if (location) return location
  return fallback
}

async function resolveZipCentroidLocation(
  zipCode: string
): Promise<ResolvedDirectoryLocation | null> {
  try {
    const rows = (await pgClient.unsafe(
      `SELECT zip, city, state, lat, lng
       FROM openclaw.zip_centroids
       WHERE zip = $1
       LIMIT 1`,
      [zipCode]
    )) as Array<{
      zip: string
      city: string | null
      state: string | null
      lat: number
      lng: number
    }>

    const row = rows[0]
    if (!row) return null

    const state = normalizeUsStateCode(row.state) ?? row.state ?? null

    return {
      query: zipCode,
      displayLabel: formatResolvedLocationDisplayLabel({
        zip: row.zip,
        city: row.city,
        state,
        fallback: zipCode,
      }),
      city: row.city ?? null,
      state,
      zip: row.zip ?? zipCode,
      lat: Number(row.lat),
      lon: Number(row.lng),
      source: 'zip_centroid',
    }
  } catch (err) {
    console.error('[resolveZipCentroidLocation]', err)
    return null
  }
}

export async function resolveDirectoryLocationQuery(query: string): Promise<{
  data: ResolvedDirectoryLocation | null
  error: string | null
}> {
  const normalizedQuery = normalizeNearbyLocationInput(query)
  if (!normalizedQuery) return { data: null, error: null }

  const zipCode = normalizeNearbyZipCode(normalizedQuery)
  if (zipCode) {
    const zipLocation = await resolveZipCentroidLocation(zipCode)
    if (zipLocation) {
      return { data: zipLocation, error: null }
    }
  }

  const geocoded = await resolvePublicLocationQuery(normalizedQuery)
  if (!geocoded.data) {
    return { data: null, error: geocoded.error }
  }

  return {
    data: {
      query: normalizedQuery,
      displayLabel: geocoded.data.displayLabel || normalizedQuery,
      city: geocoded.data.city,
      state: normalizeUsStateCode(geocoded.data.state) ?? geocoded.data.state,
      zip: geocoded.data.zip,
      lat: geocoded.data.lat,
      lon: geocoded.data.lng,
      source: 'geocoded',
    },
    error: geocoded.error,
  }
}

export async function getDirectoryListings(
  filters: DiscoverFilters = {},
  options: DirectoryListingQueryOptions = {}
): Promise<PaginatedListings> {
  const page = Math.max(1, filters.page || 1)
  const offset = (page - 1) * ITEMS_PER_PAGE
  const normalizedStateFilter = filters.state ? normalizeUsStateCode(filters.state) : null
  const hasLocationSearch = hasNearbyCoordinates(filters.userLat, filters.userLon)
  const radiusMiles =
    hasLocationSearch && filters.radiusMiles != null
      ? normalizeNearbyRadius(filters.radiusMiles)
      : null

  if (filters.state && !normalizedStateFilter) {
    return { listings: [], total: 0, page, totalPages: 1 }
  }

  try {
    const db = createServerClient({ admin: true })
    const conditions: string[] = ["status IN ('discovered', 'claimed', 'verified')"]
    const params: Array<string | number> = []
    let paramIndex = 1
    const tsQuery = buildNearbyTsQuery(filters.query)
    let textRankSql = '0::real'

    if (tsQuery) {
      const tsQueryParam = `$${paramIndex}`
      conditions.push(`search_vector @@ to_tsquery('english', ${tsQueryParam})`)
      params.push(tsQuery)
      paramIndex++
      textRankSql = `ts_rank_cd(search_vector, to_tsquery('english', ${tsQueryParam}))`
    }

    if (filters.businessType) {
      conditions.push(`business_type = $${paramIndex}`)
      params.push(filters.businessType)
      paramIndex++
    }

    if (filters.cuisine) {
      conditions.push(`$${paramIndex} = ANY(cuisine_types)`)
      params.push(filters.cuisine)
      paramIndex++
    }

    if (normalizedStateFilter) {
      conditions.push(`${CANONICAL_STATE_SQL} = $${paramIndex}`)
      params.push(normalizedStateFilter)
      paramIndex++
    }

    if (filters.city) {
      conditions.push(`city ILIKE $${paramIndex}`)
      params.push(`%${filters.city}%`)
      paramIndex++
    }

    if (filters.priceRange) {
      conditions.push(`price_range = $${paramIndex}`)
      params.push(filters.priceRange)
      paramIndex++
    }

    const queryConditions = [...conditions]
    const queryParams = [...params]
    let queryParamIndex = paramIndex
    let distanceSql = 'NULL::double precision'
    let filteredWhereClause = ''

    if (hasLocationSearch && filters.userLat != null && filters.userLon != null) {
      const geoStrategy = await getGeoDistanceStrategy()
      const latParam = `$${queryParamIndex}`
      const lonParam = `$${queryParamIndex + 1}`
      queryParams.push(filters.userLat, filters.userLon)
      queryParamIndex += 2

      if (radiusMiles != null) {
        queryParamIndex = addRadiusBoundingBox(
          queryConditions,
          queryParams,
          queryParamIndex,
          filters.userLat,
          filters.userLon,
          radiusMiles
        )
      }

      distanceSql = `${buildDistanceSql(geoStrategy, latParam, lonParam)}::double precision`

      if (radiusMiles != null) {
        filteredWhereClause = `WHERE distance_miles IS NOT NULL AND distance_miles <= $${queryParamIndex}`
        queryParams.push(radiusMiles)
        queryParamIndex++
      }
    }

    const queryWhereClause = queryConditions.join(' AND ')
    const candidateQuery = `SELECT id, name, slug, city, ${CANONICAL_STATE_SQL} as state, cuisine_types, business_type, website_url,
              status, price_range, featured, description, photo_urls, phone, email, address, hours, menu_url, source, claimed_at, updated_at,
              lat::double precision as lat, lon::double precision as lon, lead_score,
              ${distanceSql} as distance_miles, ${textRankSql} as text_rank
       FROM directory_listings
       WHERE ${queryWhereClause}`

    let orderBy: string
    if (tsQuery && hasLocationSearch) {
      orderBy = `text_rank DESC,
        CASE WHEN distance_miles IS NULL THEN 1 ELSE 0 END ASC,
        distance_miles ASC NULLS LAST,
        featured DESC,
        (CASE WHEN photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0 THEN 0 ELSE 1 END),
        lead_score DESC NULLS LAST,
        name ASC`
    } else if (tsQuery) {
      orderBy = `text_rank DESC, featured DESC, (CASE WHEN photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0 THEN 0 ELSE 1 END), lead_score DESC NULLS LAST, name ASC`
    } else if (hasLocationSearch) {
      orderBy = `CASE WHEN distance_miles IS NULL THEN 1 ELSE 0 END ASC,
        distance_miles ASC NULLS LAST,
        featured DESC,
        lead_score DESC NULLS LAST,
        name ASC`
    } else {
      orderBy = `featured DESC, (CASE WHEN photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0 THEN 0 ELSE 1 END), lead_score DESC NULLS LAST, name ASC`
    }

    if (filters.resultMode === 'curated_collection') {
      const candidateRows = await pgClient.unsafe(
        `SELECT *
         FROM (${candidateQuery}) directory_candidates
         ${filteredWhereClause}
         ORDER BY ${orderBy}`,
        queryParams
      )

      const curated = curateNearbyCollectionCandidates(
        (candidateRows as any[]).map(normalizeDirectoryListingSummary),
        page,
        ITEMS_PER_PAGE
      )
      const favoriteAwareListings = await hydrateDirectoryFavoriteFlags(
        db,
        curated.listings,
        options
      )

      return {
        listings: favoriteAwareListings,
        total: curated.total,
        page: curated.page,
        totalPages: curated.totalPages,
        collectionReadiness: curated.summary,
      }
    }

    const countPromise =
      radiusMiles != null
        ? pgClient.unsafe(
            `SELECT count(*) as count
             FROM (${candidateQuery}) directory_candidates
             ${filteredWhereClause}`,
            queryParams
          )
        : pgClient.unsafe(
            `SELECT count(*) as count
             FROM directory_listings
             WHERE ${queryWhereClause}`,
            params
          )

    const dataPromise = pgClient.unsafe(
      `SELECT *
       FROM (${candidateQuery}) directory_candidates
       ${filteredWhereClause}
       ORDER BY ${orderBy}
       LIMIT $${queryParamIndex} OFFSET $${queryParamIndex + 1}`,
      [...queryParams, ITEMS_PER_PAGE, offset]
    )

    const [countResult, dataResult] = await Promise.all([countPromise, dataPromise])
    const total = parseInt(countResult[0].count, 10)
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
    const listings = await hydrateDirectoryFavoriteFlags(
      db,
      (dataResult as any[]).map(normalizeDirectoryListingSummary),
      options
    )

    return {
      listings,
      total,
      page,
      totalPages,
    }
  } catch (err) {
    console.error('[getDirectoryListings]', err)
    return { listings: [], total: 0, page: 1, totalPages: 1 }
  }
}

export async function getDirectoryListingBySlug(
  slug: string,
  options: DirectoryListingQueryOptions = {}
): Promise<DirectoryListing | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('directory_listings')
    .select('*')
    .eq('slug', slug)
    .neq('status', 'removed')
    .single()

  if (error || !data) {
    return null
  }

  const hydrated = await hydrateDirectoryFavoriteFlags(
    db,
    [
      {
        ...normalizeDirectoryListing(data),
        is_favorited: false,
      },
    ],
    options
  )

  const listing = hydrated[0] ?? null
  if (!listing) return null

  const linkedChef =
    listing.linked_chef_id != null
      ? await getPublicLinkedChefSummary(db, listing.linked_chef_id)
      : null

  return {
    ...listing,
    linked_chef: linkedChef,
  }
}

export async function getDirectoryFacets(): Promise<{
  businessTypes: { value: string; count: number }[]
  cuisines: { value: string; count: number }[]
  states: { value: string; count: number }[]
}> {
  try {
    const [typeRows, stateRows] = await Promise.all([
      pgClient`
        SELECT business_type as value, count(*)::int as count
        FROM directory_listings
        WHERE status IN ('discovered', 'claimed', 'verified')
        GROUP BY business_type
        ORDER BY count DESC
      `,
      pgClient`
        SELECT canonical_state as value, count(*)::int as count
        FROM (
          SELECT ${pgClient.unsafe(CANONICAL_STATE_SQL)} as canonical_state
          FROM directory_listings
          WHERE status IN ('discovered', 'claimed', 'verified')
        ) states
        WHERE canonical_state IS NOT NULL
        GROUP BY canonical_state
        ORDER BY canonical_state
      `,
    ])

    // Cuisine facets need unnest since it's an array column
    const cuisineRows = await pgClient`
      SELECT c as value, count(*)::int as count
      FROM directory_listings, unnest(cuisine_types) as c
      WHERE status IN ('discovered', 'claimed', 'verified')
      GROUP BY c
      ORDER BY count DESC
    `

    return {
      businessTypes: typeRows as unknown as { value: string; count: number }[],
      cuisines: cuisineRows as unknown as { value: string; count: number }[],
      states: stateRows as unknown as { value: string; count: number }[],
    }
  } catch (err) {
    console.error('[getDirectoryFacets]', err)
    return { businessTypes: [], cuisines: [], states: [] }
  }
}

// ─── Directory Stats (for landing page) ──────────────────────────────────────

export async function getDirectoryStats(): Promise<DirectoryStats> {
  try {
    const BASE_WHERE = "status IN ('discovered', 'claimed', 'verified')"
    const [totalResult, stateResults, cityResults, businessTypeResults, cityTypeResults] =
      await Promise.all([
        pgClient.unsafe(
          `SELECT count(*)::int as count FROM directory_listings
           WHERE ${BASE_WHERE}`
        ),
        pgClient.unsafe(
          `SELECT canonical_state as state, count(*)::int as count
           FROM (
             SELECT ${CANONICAL_STATE_SQL} as canonical_state
             FROM directory_listings
             WHERE ${BASE_WHERE}
           ) states
           WHERE canonical_state IS NOT NULL
           GROUP BY canonical_state
           ORDER BY canonical_state`
        ),
        pgClient.unsafe(
          `SELECT city, canonical_state as state, count(*)::int as count
           FROM (
             SELECT city, ${CANONICAL_STATE_SQL} as canonical_state
             FROM directory_listings
             WHERE ${BASE_WHERE} AND city IS NOT NULL AND city != 'unknown'
           ) cities
           WHERE canonical_state IS NOT NULL
           GROUP BY city, canonical_state
           ORDER BY count DESC
           LIMIT 20`
        ),
        pgClient.unsafe(
          `SELECT business_type as "businessType", count(*)::int as count
           FROM directory_listings
           WHERE ${BASE_WHERE}
           GROUP BY business_type
           ORDER BY count DESC
           LIMIT 8`
        ),
        pgClient.unsafe(
          `SELECT city, canonical_state as state, business_type as "businessType", count(*)::int as count
           FROM (
             SELECT city, ${CANONICAL_STATE_SQL} as canonical_state, business_type
             FROM directory_listings
             WHERE ${BASE_WHERE} AND city IS NOT NULL AND city != 'unknown'
           ) city_types
           WHERE canonical_state IS NOT NULL
           GROUP BY city, canonical_state, business_type
           ORDER BY count DESC, city ASC, business_type ASC
           LIMIT 48`
        ),
      ])

    return {
      totalListings: totalResult[0]?.count || 0,
      states: stateResults as unknown as { state: string; count: number }[],
      topCities: cityResults as unknown as { city: string; state: string; count: number }[],
      topBusinessTypes: businessTypeResults as unknown as {
        businessType: string
        count: number
      }[],
      topCityBusinessTypes: cityTypeResults as unknown as {
        city: string
        state: string
        businessType: string
        count: number
      }[],
    }
  } catch (err) {
    console.error('[getDirectoryStats]', err)
    return {
      totalListings: 0,
      states: [],
      topCities: [],
      topBusinessTypes: [],
      topCityBusinessTypes: [],
    }
  }
}

// ─── Public Submissions ───────────────────────────────────────────────────────

export type FavoriteDirectoryListingSummary = DirectoryListingSummary & {
  favorited_at: string
}

export async function toggleDirectoryListingFavorite(
  listingId: string
): Promise<{ success: true; isFavorited: boolean }> {
  const client = await requireClient()
  const db = createServerClient({ admin: true })
  const parsedListingId = z.string().uuid().parse(listingId)

  const { data: listing, error: listingError } = await db
    .from('directory_listings')
    .select('id, slug')
    .eq('id', parsedListingId)
    .neq('status', 'removed')
    .maybeSingle()

  if (listingError) {
    console.error('[toggleDirectoryListingFavorite] Listing lookup failed:', listingError)
    throw new Error('Could not load this listing')
  }

  if (!listing) {
    throw new Error('This listing is no longer available')
  }

  const { data: existing, error: existingError } = await db
    .from('directory_listing_favorites')
    .select('id')
    .eq('client_id', client.entityId)
    .eq('listing_id', parsedListingId)
    .maybeSingle()

  if (existingError) {
    console.error(
      '[toggleDirectoryListingFavorite] Existing favorite lookup failed:',
      existingError
    )
    throw new Error('Could not update favorites')
  }

  let isFavorited = false

  if (existing?.id) {
    const { error: deleteError } = await db
      .from('directory_listing_favorites')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      console.error('[toggleDirectoryListingFavorite] Delete failed:', deleteError)
      throw new Error('Could not remove favorite')
    }
  } else {
    const { error: insertError } = await db.from('directory_listing_favorites').insert({
      client_id: client.entityId,
      listing_id: parsedListingId,
    })

    if (insertError) {
      console.error('[toggleDirectoryListingFavorite] Insert failed:', insertError)
      throw new Error('Could not save favorite')
    }

    isFavorited = true
  }

  revalidatePath('/nearby')
  revalidatePath(`/nearby/${listing.slug}`)
  revalidatePath('/my-hub')
  revalidatePath('/my-hub/favorite-operators')

  return { success: true, isFavorited }
}

export async function getMyFavoriteDirectoryListings(): Promise<FavoriteDirectoryListingSummary[]> {
  const client = await requireClient()
  const db = createServerClient({ admin: true })

  const { data: favoriteRows, error: favoritesError } = await db
    .from('directory_listing_favorites')
    .select('listing_id, created_at')
    .eq('client_id', client.entityId)
    .order('created_at', { ascending: false })

  if (favoritesError) {
    console.error('[getMyFavoriteDirectoryListings] Favorite lookup failed:', favoritesError)
    return []
  }

  const favorites = (favoriteRows as Array<{ listing_id: string; created_at: string }> | null) ?? []
  if (favorites.length === 0) return []

  const listingIds = favorites.map((favorite) => favorite.listing_id)
  const { data: listingRows, error: listingsError } = await db
    .from('directory_listings')
    .select(
      'id, name, slug, city, state, cuisine_types, business_type, website_url, status, price_range, featured, description, photo_urls, phone, address, lat, lon, lead_score, source, email, hours, menu_url, claimed_at, updated_at'
    )
    .in('id', listingIds)
    .neq('status', 'removed')

  if (listingsError) {
    console.error('[getMyFavoriteDirectoryListings] Listing lookup failed:', listingsError)
    return []
  }

  const listingMap = new Map(
    ((listingRows as any[] | null) ?? []).map((row) => [
      row.id as string,
      normalizeDirectoryListingSummary({ ...row, distance_miles: null, is_favorited: true }),
    ])
  )

  return favorites.flatMap((favorite) => {
    const listing = listingMap.get(favorite.listing_id)
    if (!listing) return []

    return [
      {
        ...listing,
        is_favorited: true,
        favorited_at: normalizeDirectoryDateValue(favorite.created_at) ?? favorite.created_at,
      },
    ]
  })
}

export async function submitDirectoryListing(input: {
  name: string
  businessType: string
  city: string
  state: string
  cuisineTypes: string[]
  websiteUrl?: string
  email: string
  phone?: string
  description?: string
}): Promise<DirectorySubmissionResult> {
  if (!input.name.trim() || !input.email.trim()) {
    return { success: false, error: 'Name and email are required.' }
  }

  const db = createServerClient({ admin: true })
  const name = input.name.trim()
  const city = input.city?.trim() || ''
  const state = input.state?.trim() || null
  const email = input.email.trim()
  const phone = input.phone?.trim() || null
  const websiteUrl = input.websiteUrl?.trim() || null
  const description = input.description?.trim() || null

  const existingMatch = await sharedFindDirectoryListingMatch(db, {
    businessName: name,
    city,
    state,
  })

  if (existingMatch) {
    if (existingMatch.status === 'claimed' || existingMatch.status === 'verified') {
      return {
        success: false,
        slug: existingMatch.slug,
        mode: 'already_claimed',
        error:
          'We already have this business in Nearby. Use the existing listing instead of creating a duplicate.',
      }
    }

    const claimResult = await requestListingClaim({
      listingId: existingMatch.id,
      name,
      email,
      phone: phone || undefined,
    })

    if (!claimResult.success) {
      return { success: false, error: claimResult.error || 'Failed to claim the existing listing.' }
    }

    const updates: Record<string, any> = {}
    if (websiteUrl) updates.website_url = websiteUrl
    if (phone) updates.phone = phone
    if (description) updates.description = description
    if (input.cuisineTypes.length > 0) updates.cuisine_types = input.cuisineTypes

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await db
        .from('directory_listings')
        .update(updates)
        .eq('id', existingMatch.id)

      if (updateError) {
        console.error('[submitDirectoryListing] existing listing enrichment failed', updateError)
      }
    }

    return {
      success: true,
      slug: claimResult.slug || existingMatch.slug,
      mode: 'claimed_existing',
    }
  }

  const baseSlug = slugify(`${name}-${city || 'us'}`)

  // Ensure unique slug
  const { data: existing } = await db
    .from('directory_listings')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { error } = await db.from('directory_listings').insert({
    name,
    slug,
    business_type: input.businessType,
    city: city || null,
    state,
    cuisine_types: input.cuisineTypes,
    website_url: websiteUrl,
    email,
    phone,
    description,
    status: 'pending_submission',
    source: 'submission',
    claimed_by_email: email,
    claimed_by_name: name,
  })

  if (error) {
    console.error('[submitDirectoryListing]', error)
    return { success: false, error: 'Failed to submit listing. Please try again.' }
  }

  // Non-blocking: send welcome email to the submitter
  try {
    // Fetch the inserted listing to get the ID
    const { data: inserted } = await db
      .from('directory_listings')
      .select('id')
      .eq('slug', slug)
      .single()

    if (inserted) {
      await tryLinkListingToChefByEmail(db, {
        listingId: inserted.id,
        email,
        confidence: 'high',
        reason: 'listing_email_exact',
      })

      const { sendDirectoryWelcomeEmail } = await import('./outreach')
      sendDirectoryWelcomeEmail({
        listingId: inserted.id,
        businessName: name,
        businessType: input.businessType,
        slug,
        recipientEmail: email,
      }).catch((err) => console.error('[non-blocking] Welcome email failed', err))
    }
  } catch (err) {
    console.error('[non-blocking] Welcome email setup failed', err)
  }

  revalidatePath('/nearby')
  revalidatePath('/admin/directory-listings')
  return { success: true, slug, mode: 'submitted' }
}

export async function submitNomination(input: {
  businessName: string
  businessType: string
  city?: string
  state?: string
  websiteUrl?: string
  nominatorName?: string
  nominatorEmail?: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.businessName.trim()) {
    return { success: false, error: 'Business name is required.' }
  }

  const db = createServerClient({ admin: true })

  const { error } = await db.from('directory_nominations').insert({
    business_name: input.businessName.trim(),
    business_type: input.businessType || 'restaurant',
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    website_url: input.websiteUrl?.trim() || null,
    nominator_name: input.nominatorName?.trim() || null,
    nominator_email: input.nominatorEmail?.trim() || null,
    reason: input.reason?.trim() || null,
  })

  if (error) {
    console.error('[submitNomination]', error)
    return { success: false, error: 'Failed to submit nomination.' }
  }

  return { success: true }
}

// ─── Claim & Removal ─────────────────────────────────────────────────────────

export async function requestListingClaim(input: {
  listingId: string
  name: string
  email: string
  phone?: string
  verificationNote?: string
}): Promise<{ success: boolean; error?: string; slug?: string }> {
  if (!input.name.trim() || !input.email.trim()) {
    return { success: false, error: 'Name and email are required.' }
  }

  const db = createServerClient({ admin: true })

  // Check listing exists and isn't already claimed
  const { data: listing } = await db
    .from('directory_listings')
    .select('id, status, slug, name')
    .eq('id', input.listingId)
    .single()

  if (!listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.status === 'claimed' || listing.status === 'verified') {
    return { success: false, error: 'This listing has already been claimed.' }
  }

  const claimToken = crypto.randomUUID()

  const { data: claimedListing, error } = await db
    .from('directory_listings')
    .update({
      status: 'claimed',
      claimed_by_name: input.name.trim(),
      claimed_by_email: input.email.trim(),
      claimed_at: new Date().toISOString(),
      claim_token: claimToken,
    })
    .eq('id', input.listingId)
    .eq('status', listing.status)
    .select('slug, name')
    .maybeSingle()

  if (error) {
    console.error('[requestListingClaim]', error)
    return { success: false, error: 'Failed to process claim.' }
  }

  if (!claimedListing) {
    return { success: false, error: 'This listing has already been claimed.' }
  }

  const claimedListingRecord = claimedListing as { name: string; slug: string }

  await tryLinkListingToChefByEmail(db, {
    listingId: input.listingId,
    email: input.email.trim(),
    confidence: 'high',
    reason: 'claimed_email_exact',
  })

  // Non-blocking: send claimed email
  try {
    const { sendDirectoryClaimedEmail } = await import('./outreach')
    sendDirectoryClaimedEmail({
      listingId: input.listingId,
      businessName: claimedListingRecord.name,
      claimerName: input.name.trim(),
      slug: claimedListingRecord.slug,
      recipientEmail: input.email.trim(),
    }).catch((err) => console.error('[non-blocking] Claimed email failed', err))
  } catch (err) {
    console.error('[non-blocking] Claimed email setup failed', err)
  }

  revalidatePath('/nearby')
  revalidatePath(`/nearby/${claimedListingRecord.slug}`)
  revalidatePath(`/nearby/${claimedListingRecord.slug}/enhance`)
  revalidatePath('/admin/directory-listings')
  return { success: true, slug: claimedListingRecord.slug }
}

/**
 * Claim a listing by fuzzy matching on business name + city + state.
 * Used by the /discover/join page (outreach funnel).
 * Public (no auth) - operators clicking from invitation email are not logged in.
 */
export async function claimListingByMatch(input: {
  businessName: string
  email: string
  city: string
  state?: string
  phone?: string
  website?: string
  ref?: string
}): Promise<{
  success: boolean
  listingId?: string
  slug?: string
  isNew?: boolean
  error?: string
}> {
  if (!input.businessName.trim() || !input.email.trim()) {
    return { success: false, error: 'Business name and email are required.' }
  }

  const db = createServerClient({ admin: true })

  // Step 1: If ref param exists, try to decrypt to listing ID
  if (input.ref) {
    const { decryptRef } = await import('./outreach-crypto')
    const listingId = decryptRef(input.ref)
    if (listingId) {
      const { data: listing } = await db
        .from('directory_listings')
        .select('id, status, slug')
        .eq('id', listingId)
        .maybeSingle()

      if (listing && !['claimed', 'verified', 'removed'].includes((listing as any).status)) {
        const result = await requestListingClaim({
          listingId: (listing as any).id,
          name: input.businessName.trim(),
          email: input.email.trim(),
          phone: input.phone,
        })
        if (result.success) {
          // Mark outreach status
          await db
            .from('directory_listings')
            .update({
              outreach_status: 'claimed_via_outreach',
            })
            .eq('id', (listing as any).id)
          return { success: true, listingId: (listing as any).id, slug: (listing as any).slug }
        }
      }
    }
  }

  // Step 2: Tier 1 - Exact name + city + state match
  const name = input.businessName.trim()
  const city = input.city.trim()
  const state = input.state?.trim() || null
  const existingMatch = await sharedFindDirectoryListingMatch(db, {
    businessName: name,
    city,
    state,
  })

  if (existingMatch) {
    if (existingMatch.status === 'claimed' || existingMatch.status === 'verified') {
      return {
        success: false,
        slug: existingMatch.slug,
        error: 'This listing has already been claimed.',
      }
    }

    const result = await requestListingClaim({
      listingId: existingMatch.id,
      name: input.businessName.trim(),
      email: input.email.trim(),
      phone: input.phone,
    })
    if (result.success) {
      await db
        .from('directory_listings')
        .update({
          outreach_status: 'claimed_via_outreach',
        })
        .eq('id', existingMatch.id)
      return {
        success: true,
        listingId: existingMatch.id,
        slug: result.slug || existingMatch.slug,
      }
    }
  }

  // Step 3: No match. Create a new pending_submission listing.
  const slug = slugify(name) + '-' + city.toLowerCase().replace(/\s+/g, '-')

  const { data: newListing, error: insertError } = await db
    .from('directory_listings')
    .insert({
      name: name,
      slug,
      city,
      state,
      email: input.email.trim(),
      phone: input.phone || null,
      website_url: input.website || null,
      business_type: 'restaurant',
      status: 'pending_submission',
      source: 'submission',
    })
    .select('id, slug')
    .single()

  if (insertError) {
    console.error('[claimListingByMatch] Insert failed:', insertError)
    return { success: false, error: 'Failed to create listing.' }
  }

  if ((newListing as any)?.id) {
    await tryLinkListingToChefByEmail(db, {
      listingId: (newListing as any).id,
      email: input.email.trim(),
      confidence: 'high',
      reason: 'listing_email_exact',
    })
  }

  revalidatePath('/admin/directory-listings')

  return {
    success: true,
    listingId: (newListing as any)?.id,
    slug: (newListing as any)?.slug,
    isNew: true,
  }
}

export async function requestListingRemoval(input: {
  listingId: string
  reason: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  if (!input.reason.trim() || !input.email.trim()) {
    return { success: false, error: 'Reason and email are required.' }
  }

  const db = createServerClient({ admin: true })

  const { error } = await db
    .from('directory_listings')
    .update({
      removal_requested_at: new Date().toISOString(),
      removal_reason: `${input.email}: ${input.reason.trim()}`,
    })
    .eq('id', input.listingId)

  if (error) {
    console.error('[requestListingRemoval]', error)
    return { success: false, error: 'Failed to submit removal request.' }
  }

  return { success: true }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function adminGetAllListings(): Promise<DirectoryListing[]> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('directory_listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[adminGetAllListings]', error)
    return []
  }

  const listings = ((data as any[] | null) ?? []).map((row) =>
    normalizeDirectoryListing({ ...row, is_favorited: false })
  )
  const chefIds = Array.from(
    new Set(listings.map((listing) => listing.linked_chef_id).filter(Boolean) as string[])
  )
  const linkedChefMap = await getAdminLinkedChefMap(db, chefIds)

  return listings.map((listing) => ({
    ...listing,
    linked_chef: listing.linked_chef_id ? linkedChefMap.get(listing.linked_chef_id) ?? null : null,
  }))
}

export async function adminUpdateListingStatus(
  listingId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const updates: Record<string, any> = { status }
  if (status === 'removed') {
    updates.removed_at = new Date().toISOString()
  }

  // Fetch listing details before update (for email)
  const { data: listingBefore } = await db
    .from('directory_listings')
    .select('name, slug, claimed_by_email, email')
    .eq('id', listingId)
    .single()

  const { error } = await db.from('directory_listings').update(updates).eq('id', listingId)

  if (error) {
    console.error('[adminUpdateListingStatus]', error)
    return { success: false, error: 'Failed to update status.' }
  }

  // Non-blocking: send verified email when status changes to verified
  if (status === 'verified' && listingBefore) {
    const recipientEmail = (listingBefore as any).claimed_by_email || (listingBefore as any).email
    if (recipientEmail) {
      const { sendDirectoryVerifiedEmail } = await import('./outreach')
      sendDirectoryVerifiedEmail({
        listingId,
        businessName: (listingBefore as any).name,
        slug: (listingBefore as any).slug,
        recipientEmail,
      }).catch((err) => console.error('[non-blocking] Verified email failed', err))
    }
  }

  revalidatePath('/nearby')
  revalidatePath('/admin/directory-listings')
  return { success: true }
}

export async function adminCreateListing(input: {
  name: string
  businessType: string
  city?: string
  state?: string
  cuisineTypes: string[]
  websiteUrl?: string
  source?: string
}): Promise<{ success: boolean; error?: string; slug?: string }> {
  await requireAdmin()
  if (!input.name.trim()) {
    return { success: false, error: 'Name is required.' }
  }

  const db = createServerClient({ admin: true })

  const baseSlug = slugify(`${input.name}-${input.city || 'us'}`)

  const { data: existing } = await db
    .from('directory_listings')
    .select('slug')
    .like('slug', `${baseSlug}%`)

  let slug = baseSlug
  if (existing && existing.length > 0) {
    slug = `${baseSlug}-${existing.length + 1}`
  }

  const { error } = await db.from('directory_listings').insert({
    name: input.name.trim(),
    slug,
    business_type: input.businessType || 'restaurant',
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    cuisine_types: input.cuisineTypes || [],
    website_url: input.websiteUrl?.trim() || null,
    status: 'discovered',
    source: input.source || 'manual',
  })

  if (error) {
    console.error('[adminCreateListing]', error)
    return { success: false, error: 'Failed to create listing.' }
  }

  revalidatePath('/nearby')
  revalidatePath('/admin/directory-listings')
  return { success: true, slug }
}

// ─── Profile Enhancement (Claimed Listings) ──────────────────────────────────

export async function enhanceDirectoryListing(input: {
  listingId: string
  description?: string
  address?: string
  phone?: string
  menuUrl?: string
  hours?: Record<string, string>
}): Promise<{ success: boolean; error?: string }> {
  const db = createServerClient({ admin: true })

  // Verify listing exists and is claimed/verified
  const { data: listing } = await db
    .from('directory_listings')
    .select('id, status')
    .eq('id', input.listingId)
    .single()

  if (!listing) {
    return { success: false, error: 'Listing not found.' }
  }

  if (listing.status !== 'claimed' && listing.status !== 'verified') {
    return { success: false, error: 'Only claimed listings can be enhanced.' }
  }

  const updates: Record<string, any> = {}
  if (input.description !== undefined) updates.description = input.description.trim() || null
  if (input.address !== undefined) updates.address = input.address.trim() || null
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null
  if (input.menuUrl !== undefined) updates.menu_url = input.menuUrl.trim() || null
  if (input.hours !== undefined) updates.hours = input.hours

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await db.from('directory_listings').update(updates).eq('id', input.listingId)

  if (error) {
    console.error('[enhanceDirectoryListing]', error)
    return { success: false, error: 'Failed to update listing.' }
  }

  revalidatePath('/nearby')
  return { success: true }
}

export async function adminGetNominations(): Promise<any[]> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('directory_nominations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[adminGetNominations]', error)
    return []
  }

  return data || []
}

export async function adminReviewNomination(
  nominationId: string,
  status: 'approved' | 'rejected' | 'duplicate'
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { error } = await db
    .from('directory_nominations')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', nominationId)

  if (error) {
    console.error('[adminReviewNomination]', error)
    return { success: false, error: 'Failed to review nomination.' }
  }

  return { success: true }
}
