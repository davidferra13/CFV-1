'use server'

// Chef as Consumer - Local Food Actions
// Farmers markets, food trucks, restaurants, specialty shops nearby.
// Reuses: lib/discover (directory listings), lib/ingredients, PIE seasonal data.
// Zero new tables. Queries existing directory_listings + seasonal calendar.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getAccountLocation } from '@/lib/location/account-location'
import { getSeasonalCalendarData } from '@/lib/openclaw/seasonal-calendar-actions'
import type { LocalFoodFilters, LocalFoodListing, SeasonalPick } from './consumer-types'

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Browse nearby food sources: restaurants, markets, food trucks, bakeries, etc.
 * Uses the existing directory_listings table (same data as /nearby).
 * Falls back to account-anchored location when no explicit coords provided.
 */
export async function browseLocalFood(
  filters: LocalFoodFilters = {}
): Promise<{ listings: LocalFoodListing[]; total: number; error: string | null }> {
  try {
    const user = await requireChef()
    const db = createServerClient()

    // Resolve location: explicit params > account-anchored > skip geo filtering
    let lat = filters.lat ?? null
    let lng = filters.lng ?? null
    const radiusMiles = filters.radiusMiles ?? 25

    if (lat == null || lng == null) {
      const location = await getAccountLocation().catch(() => null)
      if (location?.lat && location?.lng) {
        lat = location.lat
        lng = location.lng
      }
    }

    // Build query against directory_listings
    let query = db
      .from('directory_listings')
      .select(
        'id, name, slug, business_type, cuisine_types, city, state, address, phone, price_range, description, photo_urls, lat, lon'
      )
      .eq('status', 'approved')
      .limit(40)

    // Filter by business type
    if (filters.businessType) {
      query = query.eq('business_type', filters.businessType)
    }

    // Filter by cuisine type
    if (filters.cuisineType) {
      query = query.contains('cuisine_types', [filters.cuisineType])
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('[browseLocalFood] Query failed:', error.message)
      return { listings: [], total: 0, error: 'Failed to load local food' }
    }

    // Compute distance and filter by radius if we have coordinates
    let listings: LocalFoodListing[] = (rows ?? []).map((row: any) => {
      let distanceMiles: number | null = null
      if (lat != null && lng != null && row.lat != null && row.lon != null) {
        distanceMiles = haversineDistance(lat, lng, Number(row.lat), Number(row.lon))
      }

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        businessType: row.business_type,
        cuisineTypes: row.cuisine_types ?? [],
        city: row.city ?? null,
        state: row.state ?? null,
        address: row.address ?? null,
        phone: row.phone ?? null,
        priceRange: row.price_range ?? null,
        distanceMiles: distanceMiles != null ? Math.round(distanceMiles * 10) / 10 : null,
        photoUrls: row.photo_urls ?? [],
        description: row.description ?? null,
      }
    })

    // Apply radius filter
    if (lat != null && lng != null) {
      listings = listings.filter((l) => l.distanceMiles == null || l.distanceMiles <= radiusMiles)
    }

    // Sort by distance (closest first), null distances last
    listings.sort((a, b) => {
      if (a.distanceMiles == null && b.distanceMiles == null) return 0
      if (a.distanceMiles == null) return 1
      if (b.distanceMiles == null) return -1
      return a.distanceMiles - b.distanceMiles
    })

    return { listings, total: listings.length, error: null }
  } catch (err) {
    console.error('[browseLocalFood]', err)
    return { listings: [], total: 0, error: 'Failed to load local food' }
  }
}

/**
 * What's in season right now, based on PIE seasonal data.
 * Uses the existing seasonal calendar (ingredient_seasonality table).
 * Returns peaking-now and last-chance items for the current month.
 */
export async function getSeasonalPicks(
  region: string = 'northeast'
): Promise<{ picks: SeasonalPick[]; currentMonth: number; error: string | null }> {
  try {
    await requireChef()

    const calendarData = await getSeasonalCalendarData(undefined, region)

    // Combine peaking now + last chance as "seasonal picks"
    const picks: SeasonalPick[] = [...calendarData.peakingNow, ...calendarData.lastChance].map(
      (item) => ({
        ingredientName: item.ingredientName,
        category: item.category,
        peakMonths: item.peakMonths,
        isYearRound: item.isYearRound,
        imageUrl: item.imageUrl,
        flavorProfile: item.flavorProfile,
        culinaryUses: item.culinaryUses,
        typicalPairings: item.typicalPairings,
        bestPriceCents: item.bestPriceCents,
        bestPriceStore: item.bestPriceStore,
      })
    )

    return { picks, currentMonth: calendarData.currentMonth, error: null }
  } catch (err) {
    console.error('[getSeasonalPicks]', err)
    return {
      picks: [],
      currentMonth: new Date().getMonth() + 1,
      error: 'Failed to load seasonal data',
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Haversine distance between two lat/lng points in miles.
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
