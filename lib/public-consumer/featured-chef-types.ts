// Featured Chef Public Proof & Booking Types
// Used by featured-chef-actions.ts and public UI surfaces.
// All types represent public-safe, read-only data shapes.

import type { PublicReviewItem, PublicReviewStats } from '@/lib/reviews/public-actions'

// ============================================
// FEATURE SCORING
// ============================================

/** Weights and computed score for the rotation algorithm. */
export type FeatureScore = {
  chefId: string
  /** Average rating from unified review feed (0-5). */
  avgRating: number
  /** Total review count across all public sources. */
  reviewCount: number
  /** Number of completed events for this chef. */
  completedEventCount: number
  /** Whether the chef is currently accepting inquiries. */
  acceptingInquiries: boolean
  /** Discovery profile completeness (0-100). */
  completenessScore: number
  /** Whether the chef has a profile image or hero image. */
  hasImage: boolean
  /** Composite score used for rotation ranking. */
  score: number
}

// ============================================
// CHEF PROOF
// ============================================

/** Public proof elements for a chef profile or inquiry page context card. */
export type ChefProof = {
  /** Overall average rating across all public review sources. */
  avgRating: number
  /** Total number of public reviews. */
  totalReviews: number
  /** Breakdown by platform (Google, ChefFlow, Guest, etc.). */
  platformBreakdown: PublicReviewStats['platformBreakdown']
  /** Cuisine specialties from discovery profile. */
  cuisineSpecialties: string[]
  /** Number of completed events (only shown when > 0). */
  completedEventCount: number
  /** Up to N review excerpts for compact display. */
  reviewExcerpts: PublicReviewItem[]
  /** Google review URL when present. */
  googleReviewUrl: string | null
  /** Whether chef has a public website link. */
  hasPublicWebsite: boolean
  /** Website URL (only populated when show_website_on_public_profile is true). */
  websiteUrl: string | null
}

// ============================================
// BOOKING CTA
// ============================================

/** Booking call-to-action data for the public chef page and inquiry page. */
export type BookingCTA = {
  /** Whether the chef is accepting inquiries right now. */
  acceptingInquiries: boolean
  /** Where the chef prefers inquiries to go: 'both' | 'chefflow_only' | 'website_only'. */
  preferredDestination: string
  /** Next available date from availability signals (null if hidden or none). */
  nextAvailableDate: string | null
  /** Starting price in cents from marketplace profile or booking config. */
  startingPriceCents: number | null
  /** Minimum lead time in days. */
  minNoticeDays: number | null
  /** The internal inquiry slug (e.g. /chef/{slug}/inquire). */
  inquiryPath: string
  /** External website URL (only when allowed by public visibility). */
  websiteUrl: string | null
  /** Whether the chef supports instant booking. */
  isInstantBook: boolean
  /** Instant booking path (e.g. /book/{booking_slug}). */
  bookingPath: string | null
}

// ============================================
// FEATURED CHEF (HOMEPAGE CARD)
// ============================================

/** A chef selected for homepage/discovery featuring. */
export type FeaturedChef = {
  id: string
  slug: string
  displayName: string
  tagline: string | null
  profileImageUrl: string | null
  /** Location label (city, state). */
  locationLabel: string | null
  /** Top cuisine types. */
  cuisines: string[]
  /** Service types offered. */
  serviceTypes: string[]
  /** Average rating (null if no reviews). */
  avgRating: number | null
  /** Total review count (null if no reviews). */
  reviewCount: number | null
  /** Google review URL when present. */
  googleReviewUrl: string | null
  /** Whether the website link is visible publicly. */
  showWebsite: boolean
  /** Website URL (only when showWebsite is true). */
  websiteUrl: string | null
  /** Preferred inquiry destination for CTA routing. */
  preferredInquiryDestination: string
  /** Whether the chef is accepting inquiries. */
  acceptingInquiries: boolean
  /** The feature score that determined selection. */
  featureScore: number
  /** Whether instant booking is available. */
  isInstantBook: boolean
  /** Booking slug for instant book path. */
  bookingSlug: string | null
}
