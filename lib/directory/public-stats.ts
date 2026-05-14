/**
 * Public Platform Stats
 *
 * Derives real, database-backed statistics for display on the public homepage.
 * All values are computed from actual discoverable chef records only.
 * Returns null for any stat that cannot be computed from real data.
 *
 * IMPORTANT: This file must never fall back to hardcoded or estimated values.
 * If a stat is zero or insufficient, return null so the UI can hide it.
 */

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { normalizeCuisineList } from '@/lib/constants/cuisines'
import { isFounderEmail } from '@/lib/platform/owner-account'

export type PublicPlatformStats = {
  /** Count of directory-approved, discoverable chefs. Null if none. */
  verifiedChefCount: number | null
  /** Count of distinct cuisine types across all discoverable chefs. Null if none. */
  cuisineTypeCount: number | null
  /** Count of distinct service cities across all discoverable chefs. Null if none. */
  cityCoveredCount: number | null
  /**
   * Weighted average rating across discoverable chefs who have review data.
   * Null if there are no chefs with at least 1 review.
   * Only included when backed by a meaningful number of reviews.
   */
  avgRating: number | null
}

/** Minimum thresholds before stats are shown publicly. Below these = null (hidden). */
const PUBLIC_DISPLAY_THRESHOLDS = {
  /** Minimum discoverable chefs before showing chef count */
  minChefs: 5,
  /** Minimum distinct cuisine types before showing cuisine count */
  minCuisines: 3,
  /** Minimum distinct cities before showing city count */
  minCities: 3,
  /** Minimum total reviews across all chefs before showing avg rating */
  minReviewsForRating: 5,
} as const

export const getPublicPlatformStats = unstable_cache(
  getPublicPlatformStatsUncached,
  ['public-platform-stats'],
  { revalidate: 300, tags: ['directory-chefs', 'public-platform-stats'] }
)

async function getPublicPlatformStatsUncached(): Promise<PublicPlatformStats> {
  try {
    const db = createServerClient({ admin: true })

    // Step 1: get all chef IDs that are directory-approved and discoverable.
    // Uses the same !inner join + filter pattern as getDiscoverableChefs.
    const { data: chefs, error: chefsError } = await (db as any)
      .from('chefs')
      .select('id, email, directory_approved, chef_preferences!inner(network_discoverable)')
      .not('slug', 'is', null)
      .eq('chef_preferences.network_discoverable', true)
      .limit(500)

    if (chefsError) {
      console.error('[getPublicPlatformStats] chefs query error:', chefsError)
      return emptyStats()
    }

    // Apply the same approval filter as getDiscoverableChefs
    const approved = (chefs || []).filter((c: any) => {
      const isFounder = isFounderEmail(c.email)
      if (!c.directory_approved && !isFounder) return false
      const email = (c.email || '').toLowerCase()
      if (email.endsWith('@local.chefflow')) return false
      if (email.includes('demo@') || email.includes('test@')) return false
      return true
    })

    const verifiedChefCount =
      approved.length >= PUBLIC_DISPLAY_THRESHOLDS.minChefs ? approved.length : null

    if (approved.length === 0) {
      return emptyStats()
    }

    const chefIds = approved.map((c: any) => c.id as string)

    // Step 2: fetch cuisine types and location data from marketplace profiles + listings in parallel
    const [marketplaceResult, listingResult] = await Promise.all([
      (db as any)
        .from('chef_marketplace_profiles')
        .select('chef_id, cuisine_types, service_area_city, avg_rating, review_count')
        .in('chef_id', chefIds),
      (db as any)
        .from('chef_directory_listings')
        .select('chef_id, cuisines, city')
        .in('chef_id', chefIds),
    ])

    const marketplaceRows: any[] = marketplaceResult.data ?? []
    const listingRows: any[] = listingResult.data ?? []

    // --- Cuisine types ---
    const cuisineSet = new Set<string>()
    const addCuisineValues = (values: unknown) => {
      if (!Array.isArray(values)) return

      for (const cuisine of normalizeCuisineList(
        values.filter((value): value is string => typeof value === 'string')
      )) {
        cuisineSet.add(cuisine)
      }
    }

    for (const row of marketplaceRows) {
      addCuisineValues(row.cuisine_types)
    }
    for (const row of listingRows) {
      addCuisineValues(row.cuisines)
    }
    const cuisineTypeCount =
      cuisineSet.size >= PUBLIC_DISPLAY_THRESHOLDS.minCuisines ? cuisineSet.size : null

    // --- Cities covered ---
    const citySet = new Set<string>()
    for (const row of marketplaceRows) {
      if (row.service_area_city && typeof row.service_area_city === 'string') {
        citySet.add(row.service_area_city.toLowerCase().trim())
      }
    }
    for (const row of listingRows) {
      if (row.city && typeof row.city === 'string') {
        citySet.add(row.city.toLowerCase().trim())
      }
    }
    const cityCoveredCount =
      citySet.size >= PUBLIC_DISPLAY_THRESHOLDS.minCities ? citySet.size : null

    // --- Average rating (weighted by review_count) ---
    let totalWeightedRating = 0
    let totalReviews = 0
    for (const row of marketplaceRows) {
      const rating =
        typeof row.avg_rating === 'number' ? row.avg_rating : parseFloat(row.avg_rating)
      const count =
        typeof row.review_count === 'number' ? row.review_count : parseInt(row.review_count)
      if (
        Number.isFinite(rating) &&
        rating > 0 &&
        Number.isFinite(count) &&
        count >= PUBLIC_DISPLAY_THRESHOLDS.minReviewsForRating
      ) {
        totalWeightedRating += rating * count
        totalReviews += count
      }
    }
    const avgRating =
      totalReviews >= PUBLIC_DISPLAY_THRESHOLDS.minReviewsForRating
        ? Math.round((totalWeightedRating / totalReviews) * 10) / 10
        : null

    return {
      verifiedChefCount,
      cuisineTypeCount,
      cityCoveredCount,
      avgRating,
    }
  } catch (err) {
    console.error('[getPublicPlatformStats] unexpected error:', err)
    return emptyStats()
  }
}

function emptyStats(): PublicPlatformStats {
  return {
    verifiedChefCount: null,
    cuisineTypeCount: null,
    cityCoveredCount: null,
    avgRating: null,
  }
}
