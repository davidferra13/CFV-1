// Event Total Recall - Type Definitions
// Complete event archive retrieval types for the recall system.

// ─── Event Recall (complete archive for a single event) ─────────────────────

export type RecallServiceDetails = {
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  departureTime: string | null
  durationMinutes: number | null
  locationAddress: string | null
  locationCity: string | null
  locationState: string | null
  locationZip: string | null
  locationNotes: string | null
  guestCountPlanned: number
  guestCountConfirmed: boolean
  occasion: string | null
  serviceStyle: string
  specialRequests: string | null
  kitchenNotes: string | null
  siteNotes: string | null
  accessInstructions: string | null
  cannabisPreference: boolean | null
  bookingSource: string | null
}

export type RecallMenuCourse = {
  courseNumber: number
  courseName: string
  dishName: string | null
  dishDescription: string | null
  dietaryTags: string[]
  allergenFlags: string[]
  chefNotes: string | null
  beveragePairing: string | null
  components: {
    name: string
    category: string
    recipeName: string | null
  }[]
}

export type RecallFinancial = {
  quotedPriceCents: number | null
  pricingModel: string | null
  depositAmountCents: number | null
  paymentStatus: string
  tipAmountCents: number
  totalPaidCents: number
  perHeadCostCents: number | null
  payments: {
    entryType: string
    amountCents: number
    paymentMethod: string
    description: string
    createdAt: string
  }[]
}

export type RecallContract = {
  id: string
  status: string
  bodySnapshot: string
  sentAt: string | null
  signedAt: string | null
  voidedAt: string | null
  voidReason: string | null
}

export type RecallGuest = {
  id: string
  fullName: string
  email: string | null
  rsvpStatus: string
  dietaryRestrictions: string[]
  allergies: string[]
  notes: string | null
  plusOne: boolean
  plusOneName: string | null
  actualAttended: string | null
}

export type RecallPhoto = {
  id: string
  caption: string | null
  photoType: string | null
  displayOrder: number
  createdAt: string
}

export type RecallWeather = {
  forecastHighF: number | null
  forecastLowF: number | null
  condition: string | null
  precipProbability: number | null
  windSpeedMph: number | null
  actualNotes: string | null
  capturedAt: string
}

export type RecallDebrief = {
  chefOutcomeNotes: string | null
  chefOutcomeRating: number | null
  debriefCompletedAt: string | null
  aar: {
    calmRating: number
    preparationRating: number
    executionRating: number | null
    whatWentWell: string | null
    whatWentWrong: string | null
    wouldDoDifferently: string | null
    menuPerformanceNotes: string | null
    clientBehaviorNotes: string | null
    siteNotes: string | null
    generalNotes: string | null
    forgottenItems: string[]
  } | null
}

export type RecallVenue = {
  parkingInstructions: string | null
  accessInstructions: string | null
  directionsFromRoad: string | null
  propertyRules: string[]
  kitchenZone: string | null
  diningZone: string | null
  powerAccessNotes: string | null
  waterAccessNotes: string | null
  restroomInfo: string | null
  rainBackupPlan: string | null
  farmName: string | null
}

export type EventRecall = {
  event: {
    id: string
    status: string
    createdAt: string
  }
  client: {
    id: string
    fullName: string
    preferredName: string | null
    email: string
    phone: string | null
    dietaryRestrictions: string[] | null
    allergies: string[] | null
    vibeNotes: string | null
  }
  service: RecallServiceDetails
  menu: RecallMenuCourse[]
  financial: RecallFinancial
  contract: RecallContract | null
  guests: RecallGuest[]
  photos: RecallPhoto[]
  weather: RecallWeather | null
  debrief: RecallDebrief
  venue: RecallVenue | null
}

// ─── Client Event History ───────────────────────────────────────────────────

export type ClientEventSummary = {
  id: string
  eventDate: string
  occasion: string | null
  guestCount: number
  serviceStyle: string
  status: string
  locationCity: string | null
  locationState: string | null
  quotedPriceCents: number | null
  tipAmountCents: number
  chefOutcomeRating: number | null
  menuName: string | null
  courseHighlights: string[]
  photoCount: number
}

export type ClientHistory = {
  client: {
    id: string
    fullName: string
    preferredName: string | null
    email: string
    phone: string | null
    totalEventsCount: number
    lifetimeValueCents: number
    firstEventDate: string | null
    lastEventDate: string | null
    loyaltyTier: string
  }
  events: ClientEventSummary[]
}

// ─── Past Event Search ─────────────────────────────────────────────────────

export type SearchPastEventsParams = {
  /** Free-text keyword (matches client name, dish name, occasion, location, menu name) */
  query?: string
  /** Filter by client ID */
  clientId?: string
  /** Inclusive start date (YYYY-MM-DD) */
  dateFrom?: string
  /** Inclusive end date (YYYY-MM-DD) */
  dateTo?: string
  /** Filter by occasion (birthday, anniversary, corporate, etc.) */
  occasion?: string
  /** Filter by city or state */
  location?: string
  /** Filter by event status */
  status?: string
  /** Max results (default 20) */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

export type PastEventSearchResult = {
  id: string
  eventDate: string
  occasion: string | null
  status: string
  clientName: string
  clientId: string
  guestCount: number
  serviceStyle: string
  locationCity: string | null
  locationState: string | null
  quotedPriceCents: number | null
  menuName: string | null
  courseHighlights: string[]
  chefOutcomeRating: number | null
  /** Which field(s) matched the search query */
  matchedOn: string[]
}

export type PastEventSearchResponse = {
  results: PastEventSearchResult[]
  totalCount: number
  hasMore: boolean
}

// ─── Seasonal Context ───────────────────────────────────────────────────────

export type SeasonalShift = {
  previousSeason: string
  currentSeason: string
  previousMonth: string
  currentMonth: string
  shiftDescription: string
}

export type SeasonalContext = {
  event: {
    id: string
    eventDate: string
    occasion: string | null
  }
  seasonalShift: SeasonalShift | null
  sameMonthPriorYears: {
    id: string
    eventDate: string
    occasion: string | null
    clientName: string
    menuName: string | null
  }[]
  nearbyDateEvents: {
    id: string
    eventDate: string
    occasion: string | null
    clientName: string
    daysDelta: number
  }[]
}
