// Chef as Consumer - Shared Types
// Types for the Explore section: discover, book, community events, local food.
// Zero new tables. These types describe views on existing data.

// ── Discover ────────────────────────────────────────────────────────────

export type ChefExperienceCard = {
  chefId: string
  slug: string
  displayName: string
  tagline: string | null
  profileImageUrl: string | null
  cuisineTypes: string[]
  serviceArea: string | null
  distanceMiles: number | null
  bookingEnabled: boolean
  bookingModel: 'inquiry_first' | 'instant_book'
  isFounder: boolean
}

export type ChefConsumerFeedSection = {
  label: string
  items: ChefExperienceCard[]
}

export type ExploreFilters = {
  cuisineType?: string
  maxDistanceMiles?: number
  bookingModel?: 'inquiry_first' | 'instant_book'
  query?: string
}

// ── Book ────────────────────────────────────────────────────────────────

export type BookingAsClientInput = {
  chefId: string
  chefSlug: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  eventDate: string
  guestCount: number
  occasion: string
  location: string
  dietaryRestrictions?: string[]
  notes?: string
}

export type MyBookingAsClient = {
  inquiryId: string
  chefName: string
  chefSlug: string | null
  chefProfileImageUrl: string | null
  status: string
  eventDate: string | null
  guestCount: number | null
  occasion: string | null
  createdAt: string
}

// ── Community Events ────────────────────────────────────────────────────

export type PeerEventCard = {
  eventId: string
  title: string
  chefName: string
  chefSlug: string | null
  chefProfileImageUrl: string | null
  eventDate: string | null
  venueName: string | null
  venueCity: string | null
  venueState: string | null
  ticketPriceCents: number | null
  capacity: number | null
  ticketsSold: number
  spotsRemaining: number | null
  shareToken: string | null
  eventType: 'ticketed' | 'popup' | 'circle'
}

export type MyTicket = {
  ticketId: string
  eventId: string
  eventTitle: string
  chefName: string
  eventDate: string | null
  quantity: number
  totalCents: number
  paymentStatus: string
  purchasedAt: string
}

// ── Local Food ──────────────────────────────────────────────────────────

export type LocalFoodFilters = {
  lat?: number
  lng?: number
  zip?: string
  radiusMiles?: number
  businessType?: string
  cuisineType?: string
}

export type LocalFoodListing = {
  id: string
  name: string
  slug: string
  businessType: string
  cuisineTypes: string[]
  city: string | null
  state: string | null
  address: string | null
  phone: string | null
  priceRange: string | null
  distanceMiles: number | null
  photoUrls: string[]
  description: string | null
}

export type SeasonalPick = {
  ingredientName: string
  category: string | null
  peakMonths: number[]
  isYearRound: boolean
  imageUrl: string | null
  flavorProfile: string | null
  culinaryUses: string | null
  typicalPairings: string[]
  bestPriceCents: number | null
  bestPriceStore: string | null
}
