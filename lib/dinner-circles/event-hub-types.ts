// ---------------------------------------------------------------------------
// Dinner Circle Event Hub: shared types
// ---------------------------------------------------------------------------

/** Author type for circle updates */
export type CircleUpdateAuthorType = 'chef' | 'host' | 'system'

/** A single update posted to the circle feed */
export type CircleUpdate = {
  id: string
  circleId: string
  authorType: CircleUpdateAuthorType
  authorName: string
  content: string
  pinned: boolean
  /** ISO timestamp; if set and in the future, update is hidden until then */
  revealAt: string | null
  createdAt: string
}

/** Circle-level settings (stored as jsonb on hub_groups or circle_settings table) */
export type CircleHubSettings = {
  occasion: string | null
  theme: string | null
  dressCode: string | null
  vibe: string | null
  chatEnabled: boolean
  guestPhotosEnabled: boolean
  guestListVisible: boolean
  /** Sections hidden until reveal time (surprise events) */
  hiddenSections: string[]
}

/** Overview section data */
export type CircleOverview = {
  circleName: string
  eventDate: string | null
  serveTime: string | null
  occasion: string | null
  theme: string | null
  dressCode: string | null
  vibe: string | null
  chefName: string
  guestCount: number
  locationCity: string | null
  locationState: string | null
}

/** A single guest entry in the guest list */
export type CircleGuestEntry = {
  profileId: string
  displayName: string
  role: string
  joinedAt: string
  /** Only present for chef/host views */
  dietaryRestrictions?: string[]
  allergies?: string[]
  rsvpStatus?: string
}

/** Aggregated dietary summary for the circle */
export type CircleDietarySummary = {
  totalGuests: number
  responded: number
  counts: {
    allergies: number
    vegetarian: number
    vegan: number
    glutenFree: number
    noRestrictions: number
    other: number
  }
  /** Only populated for chef/host; individual guest details */
  guests: Array<{
    name: string
    restrictions: string[]
    allergies: string[]
    hasResponded: boolean
  }>
}

/** Event details section */
export type CircleEventDetails = {
  locationAddress: string | null
  locationCity: string | null
  locationState: string | null
  locationZip: string | null
  locationNotes: string | null
  accessInstructions: string | null
  eventDate: string | null
  serveTime: string | null
  arrivalTime: string | null
  dressCode: string | null
  specialRequests: string | null
}

/** Personalized guest view */
export type CircleGuestView = {
  profileId: string
  displayName: string
  dietaryStatus: 'submitted' | 'pending'
  dietaryRestrictions: string[]
  allergies: string[]
  rsvpStatus: string | null
  role: string
  overview: CircleOverview
  details: CircleEventDetails
  settings: CircleHubSettings
}

/** Full hub data for the circle (chef/host view) */
export type CircleEventHub = {
  circleId: string
  eventId: string | null
  tenantId: string | null
  overview: CircleOverview
  details: CircleEventDetails
  settings: CircleHubSettings
  guests: CircleGuestEntry[]
  updates: CircleUpdate[]
  dietarySummary: CircleDietarySummary
}
