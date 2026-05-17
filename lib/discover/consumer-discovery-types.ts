// Consumer Discovery Types
// Public types for occasion-based chef search, availability, and discovery filters.
// Complements lib/public-consumer/ (feed + menu spotlight) with occasion/availability primitives.

// ---- Occasion Types ----

export const OCCASION_TYPES = [
  'birthday',
  'anniversary',
  'date_night',
  'dinner_party',
  'corporate',
  'team_building',
  'holiday',
  'bridal_shower',
  'baby_shower',
  'graduation',
  'rehearsal_dinner',
  'engagement',
  'retirement',
  'housewarming',
  'game_day',
  'family_reunion',
  'wellness_retreat',
  'fundraiser',
  'other',
] as const

export type OccasionType = (typeof OCCASION_TYPES)[number]

export interface OccasionOption {
  value: OccasionType
  label: string
  description: string
  defaultPartySize: number
  suggestedStyles: string[]
}

// ---- Discovery Filters ----

export interface DiscoveryFilters {
  occasion?: OccasionType
  location?: string
  cuisineType?: string
  priceRange?: string
  minGuests?: number
  maxGuests?: number
  dateFrom?: string
  dateTo?: string
  serviceType?: string
  dietaryNeeds?: string[]
  acceptingOnly?: boolean
  page?: number
  limit?: number
}

// ---- Discovery Chef (public card model) ----

export interface DiscoveryChef {
  id: string
  slug: string
  displayName: string
  tagline: string | null
  profileImageUrl: string | null
  heroImageUrl: string | null
  cuisineTypes: string[]
  serviceTypes: string[]
  dietarySpecialties: string[]
  priceRange: string | null
  locationLabel: string | null
  city: string | null
  state: string | null
  avgRating: number | null
  reviewCount: number
  acceptingInquiries: boolean
  nextAvailableDate: string | null
  leadTimeDays: number | null
  isInstantBook: boolean
  bookingSlug: string | null
  /** Relevance score for ranking (higher = better match) */
  relevanceScore: number
}

// ---- Chef Availability ----

export interface ChefAvailabilitySlot {
  date: string
  available: boolean
  /** Reason when unavailable (e.g. "booked", "blocked", "lead_time") */
  reason?: string
}

export interface ChefAvailabilityResult {
  chefId: string
  slots: ChefAvailabilitySlot[]
  leadTimeDays: number | null
  nextAvailableDate: string | null
  acceptingInquiries: boolean
}

// ---- Cuisine Category (with chef counts) ----

export interface CuisineCategoryWithCount {
  value: string
  label: string
  chefCount: number
}

// ---- Popular Occasion (with metadata) ----

export interface PopularOccasion {
  value: OccasionType
  label: string
  description: string
  chefCount: number
  defaultPartySize: number
}

// ---- Chef Quick Profile (summary for discovery cards) ----

export interface ChefQuickProfile {
  id: string
  slug: string
  displayName: string
  tagline: string | null
  profileImageUrl: string | null
  heroImageUrl: string | null
  cuisineTypes: string[]
  serviceTypes: string[]
  dietarySpecialties: string[]
  priceRange: string | null
  locationLabel: string | null
  avgRating: number | null
  reviewCount: number
  acceptingInquiries: boolean
  nextAvailableDate: string | null
  leadTimeDays: number | null
  isInstantBook: boolean
  bookingSlug: string | null
  highlightText: string | null
  partnerCount: number
  /** Whether the chef has a featured or showcase menu */
  hasMenuSpotlight: boolean
}
