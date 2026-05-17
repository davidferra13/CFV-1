'use server'

// Chef as Consumer - Discover Actions
// Browse food experiences from within the chef portal.
// Reuses: lib/directory, lib/discover, lib/public-consumer.
// Chef's own listing is excluded from results.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getAccountLocation } from '@/lib/location/account-location'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import type { ChefExperienceCard, ChefConsumerFeedSection, ExploreFilters } from './consumer-types'

// ── Helpers ─────────────────────────────────────────────────────────────

function toExperienceCard(chef: any, selfChefId: string): ChefExperienceCard | null {
  // Exclude the browsing chef's own listing
  if (chef.id === selfChefId) return null

  return {
    chefId: chef.id,
    slug: chef.slug,
    displayName: chef.display_name || chef.business_name || 'Chef',
    tagline: chef.tagline ?? null,
    profileImageUrl: chef.profile_image_url ?? null,
    cuisineTypes: chef.discovery?.cuisine_types ?? [],
    serviceArea: chef.discovery?.service_area ?? null,
    distanceMiles: chef.distance_miles ?? null,
    bookingEnabled: chef.booking_enabled ?? false,
    bookingModel: chef.booking_model ?? 'inquiry_first',
    isFounder: chef.is_founder ?? false,
  }
}

function matchesFilters(card: ChefExperienceCard, filters: ExploreFilters): boolean {
  if (filters.cuisineType) {
    const target = filters.cuisineType.toLowerCase()
    const match = card.cuisineTypes.some((c) => c.toLowerCase().includes(target))
    if (!match) return false
  }

  if (filters.maxDistanceMiles != null && card.distanceMiles != null) {
    if (card.distanceMiles > filters.maxDistanceMiles) return false
  }

  if (filters.bookingModel && card.bookingModel !== filters.bookingModel) {
    return false
  }

  if (filters.query) {
    const q = filters.query.toLowerCase()
    const haystack = [card.displayName, card.tagline, ...card.cuisineTypes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }

  return true
}

// ── Public Actions ──────────────────────────────────────────────────────

/**
 * Browse other chefs' public profiles and offerings.
 * Excludes the current chef's own listing.
 * Location-aware when the chef has an account-anchored zip.
 */
export async function browseChefExperiences(
  filters: ExploreFilters = {}
): Promise<{ cards: ChefExperienceCard[]; total: number; error: string | null }> {
  try {
    const user = await requireChef()
    const allChefs = await getDiscoverableChefs()

    const cards: ChefExperienceCard[] = []
    for (const chef of allChefs) {
      const card = toExperienceCard(chef, user.entityId)
      if (card && matchesFilters(card, filters)) {
        cards.push(card)
      }
    }

    // Sort: bookable first, then by distance if available
    cards.sort((a, b) => {
      if (a.bookingEnabled !== b.bookingEnabled) return a.bookingEnabled ? -1 : 1
      if (a.distanceMiles != null && b.distanceMiles != null) {
        return a.distanceMiles - b.distanceMiles
      }
      return 0
    })

    return { cards, total: cards.length, error: null }
  } catch (err) {
    console.error('[browseChefExperiences]', err)
    return { cards: [], total: 0, error: 'Failed to load chef experiences' }
  }
}

/**
 * Curated feed for the chef's Explore landing page.
 * Returns sections: nearby, bookable now, new on platform.
 * Uses account-anchored location when available.
 */
export async function getChefConsumerFeed(): Promise<{
  sections: ChefConsumerFeedSection[]
  error: string | null
}> {
  try {
    const user = await requireChef()
    const allChefs = await getDiscoverableChefs()
    const location = await getAccountLocation().catch(() => null)

    const allCards: ChefExperienceCard[] = []
    for (const chef of allChefs) {
      const card = toExperienceCard(chef, user.entityId)
      if (card) allCards.push(card)
    }

    const sections: ChefConsumerFeedSection[] = []

    // Section 1: Nearby (if location available)
    if (location?.lat && location?.lng) {
      const nearby = allCards
        .filter((c) => c.distanceMiles != null && c.distanceMiles <= (location.radiusMiles || 25))
        .sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999))
        .slice(0, 8)

      if (nearby.length > 0) {
        sections.push({ label: 'Nearby', items: nearby })
      }
    }

    // Section 2: Bookable now
    const bookable = allCards.filter((c) => c.bookingEnabled).slice(0, 8)
    if (bookable.length > 0) {
      sections.push({ label: 'Book a Chef', items: bookable })
    }

    // Section 3: Recently added (use array order from getDiscoverableChefs, already sorted by created_at desc)
    const recent = allCards.slice(0, 6)
    if (recent.length > 0) {
      sections.push({ label: 'New on ChefFlow', items: recent })
    }

    return { sections, error: null }
  } catch (err) {
    console.error('[getChefConsumerFeed]', err)
    return { sections: [], error: 'Failed to load feed' }
  }
}
