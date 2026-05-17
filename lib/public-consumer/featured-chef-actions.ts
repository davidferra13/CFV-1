'use server'

// Featured Chef Public Proof & Booking Server Actions
// Public read-only actions for homepage featured chefs, proof elements,
// booking CTAs, and feature rotation.
//
// Source of truth for public reviews: getPublicChefReviewFeed()
// Source of truth for chef data: getDiscoverableChefs() + getPublicChefProfile()
// NEVER use the dormant testimonials table for public proof.

import { getDiscoverableChefs, type DirectoryChef } from '@/lib/directory/actions'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import { createServerClient } from '@/lib/db/server'

import type { FeaturedChef, ChefProof, BookingCTA, FeatureScore } from './featured-chef-types'

// ============================================
// HELPERS
// ============================================

function locationLabel(
  city: string | null | undefined,
  state: string | null | undefined
): string | null {
  if (city && state) return `${city}, ${state}`
  return state || city || null
}

/**
 * Compute a composite feature score for rotation ranking.
 * Higher score = more likely to be featured.
 * Factors: rating quality, review volume, activity, completeness, visual presence.
 */
function computeFeatureScore(chef: DirectoryChef): FeatureScore {
  const disc = chef.discovery
  const avgRating = disc.avg_rating ?? 0
  const reviewCount = disc.review_count ?? 0
  const completeness = disc.completeness_score ?? 0
  const accepting = disc.accepting_inquiries ?? false
  const hasImage = !!(chef.profile_image_url || disc.hero_image_url)

  // Weighted scoring:
  // - Rating quality (0-25): high ratings matter
  // - Review volume (0-20): more reviews = more proof
  // - Completeness (0-20): well-filled profiles rank higher
  // - Accepting inquiries (0-15): active chefs preferred
  // - Visual presence (0-10): image presence boosts
  // - Partner count (0-10): venue partnerships add credibility
  let score = 0
  score += Math.min(25, avgRating * 5)
  score += Math.min(20, reviewCount * 2)
  score += Math.min(20, completeness * 0.2)
  score += accepting ? 15 : 0
  score += hasImage ? 10 : 0
  score += Math.min(10, chef.partners.length * 3)

  return {
    chefId: chef.id,
    avgRating,
    reviewCount,
    completedEventCount: 0, // Populated separately when needed
    acceptingInquiries: accepting,
    completenessScore: completeness,
    hasImage,
    score,
  }
}

// ============================================
// 1. GET FEATURED CHEFS (homepage/discovery)
// ============================================

/**
 * Returns chefs selected for homepage featuring, sorted by feature score.
 * Public, no auth. Reuses getDiscoverableChefs() as the data source.
 *
 * @param limit - Max chefs to return (default 6)
 */
export async function getFeaturedChefs(limit = 6): Promise<FeaturedChef[]> {
  const allChefs = await getDiscoverableChefs()

  // Score and rank
  const scored = allChefs.map((chef) => ({
    chef,
    fs: computeFeatureScore(chef),
  }))

  // Sort by score descending, then by review count as tiebreaker
  scored.sort((a, b) => {
    if (b.fs.score !== a.fs.score) return b.fs.score - a.fs.score
    return (b.fs.reviewCount ?? 0) - (a.fs.reviewCount ?? 0)
  })

  return scored.slice(0, limit).map(({ chef, fs }) => {
    const disc = chef.discovery
    const showWebsite = chef.show_website_on_public_profile && !!chef.website_url

    return {
      id: chef.id,
      slug: chef.slug,
      displayName: chef.display_name,
      tagline: chef.tagline ?? disc.highlight_text ?? null,
      profileImageUrl: chef.profile_image_url ?? disc.hero_image_url ?? null,
      locationLabel:
        locationLabel(disc.service_area_city, disc.service_area_state) ||
        locationLabel(
          chef.directory_listing_location?.city,
          chef.directory_listing_location?.state
        ),
      cuisines: (disc.cuisine_types ?? []).slice(0, 3),
      serviceTypes: (disc.service_types ?? []).slice(0, 3),
      avgRating: disc.avg_rating ?? null,
      reviewCount: disc.review_count ?? null,
      googleReviewUrl: chef.google_review_url ?? null,
      showWebsite,
      websiteUrl: showWebsite ? chef.website_url : null,
      preferredInquiryDestination: chef.preferred_inquiry_destination ?? 'both',
      acceptingInquiries: disc.accepting_inquiries ?? false,
      featureScore: fs.score,
      isInstantBook: chef.booking_model === 'instant_book' && chef.booking_enabled,
      bookingSlug: chef.booking_slug ?? null,
    }
  })
}

// ============================================
// 2. GET CHEF PUBLIC PROOF
// ============================================

/**
 * Returns public proof elements for a chef by slug.
 * Used on the public profile proof summary and inquiry page context card.
 * Public, no auth. Uses the canonical unified review feed.
 *
 * @param chefSlug - The chef's public URL slug
 * @param excerptCount - Number of review excerpts to include (default 3)
 */
export async function getChefPublicProof(
  chefSlug: string,
  excerptCount = 3
): Promise<ChefProof | null> {
  const profile = await getPublicChefProfile(chefSlug)
  if (!profile) return null

  const chef = profile.chef
  const reviewFeed = await getPublicChefReviewFeed(chef.id)

  // Count completed events for this chef (public stat)
  let completedEventCount = 0
  try {
    const db: any = createServerClient({ admin: true })
    const { count, error } = await db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chef.id)
      .eq('status', 'completed')

    if (!error && count !== null) {
      completedEventCount = count
    }
  } catch {
    // Non-critical; degrade gracefully
  }

  const showWebsite = (chef.show_website_on_public_profile ?? false) && !!chef.website_url

  return {
    avgRating: reviewFeed.stats.averageRating,
    totalReviews: reviewFeed.stats.totalReviews,
    platformBreakdown: reviewFeed.stats.platformBreakdown,
    cuisineSpecialties: (chef.discovery.cuisine_types ?? []).slice(0, 5),
    completedEventCount,
    reviewExcerpts: reviewFeed.reviews.slice(0, excerptCount),
    googleReviewUrl: chef.google_review_url ?? null,
    hasPublicWebsite: showWebsite,
    websiteUrl: showWebsite ? chef.website_url : null,
  }
}

// ============================================
// 3. GET CHEF BOOKING CTA
// ============================================

/**
 * Returns booking call-to-action data for a chef by slug.
 * Includes availability signals, pricing hints, and CTA routing.
 * Public, no auth.
 *
 * @param chefSlug - The chef's public URL slug
 */
export async function getChefBookingCTA(chefSlug: string): Promise<BookingCTA | null> {
  const profile = await getPublicChefProfile(chefSlug)
  if (!profile) return null

  const chef = profile.chef

  // Fetch availability signals if the chef has them enabled
  let nextAvailableDate: string | null = null
  if (chef.show_availability_signals) {
    try {
      const signals = await getPublicAvailabilitySignals(chef.id)
      if (signals.length > 0) {
        nextAvailableDate = signals[0].start_date
      }
    } catch {
      // Non-critical; degrade gracefully
    }
  }

  // Determine starting price from booking config or marketplace data
  const startingPriceCents = chef.booking_base_price_cents ?? null

  const showWebsite = (chef.show_website_on_public_profile ?? false) && !!chef.website_url
  const isInstantBook = chef.booking_model === 'instant_book' && chef.booking_enabled

  const inquirySlug = chef.inquiry_slug || chef.public_slug || chef.slug
  const inquiryPath = `/chef/${inquirySlug}/inquire`

  return {
    acceptingInquiries: chef.discovery.accepting_inquiries ?? false,
    preferredDestination: chef.preferred_inquiry_destination ?? 'both',
    nextAvailableDate,
    startingPriceCents,
    minNoticeDays: chef.booking_min_notice_days ?? null,
    inquiryPath,
    websiteUrl: showWebsite ? chef.website_url : null,
    isInstantBook,
    bookingPath: isInstantBook && chef.booking_slug ? `/book/${chef.booking_slug}` : null,
  }
}

// ============================================
// 4. ROTATE FEATURES
// ============================================

/**
 * Algorithm to select which chefs get featured.
 * Returns scored and ranked chefs based on ratings, activity,
 * response time, and profile completeness.
 *
 * This is a deterministic scoring function (not random rotation).
 * Chefs with higher composite scores rank higher.
 *
 * Public, no auth. Read-only.
 *
 * @param maxResults - Maximum number of scored results (default 12)
 */
export async function rotateFeatures(maxResults = 12): Promise<FeatureScore[]> {
  const allChefs = await getDiscoverableChefs()
  const db: any = createServerClient({ admin: true })

  // Score all chefs
  const scores = allChefs.map((chef) => computeFeatureScore(chef))

  // Enrich with completed event counts in a single query
  const chefIds = allChefs.map((c) => c.id)
  if (chefIds.length > 0) {
    try {
      const { data, error } = await db
        .from('events')
        .select('tenant_id')
        .in('tenant_id', chefIds)
        .eq('status', 'completed')

      if (!error && data) {
        // Count events per chef
        const countMap = new Map<string, number>()
        for (const row of data as { tenant_id: string }[]) {
          countMap.set(row.tenant_id, (countMap.get(row.tenant_id) ?? 0) + 1)
        }

        for (const fs of scores) {
          const eventCount = countMap.get(fs.chefId) ?? 0
          fs.completedEventCount = eventCount
          // Boost score by event activity (up to 15 points)
          fs.score += Math.min(15, eventCount * 3)
        }
      }
    } catch {
      // Non-critical; scores still valid without event enrichment
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  return scores.slice(0, maxResults)
}
