// Chef Event Briefing - types for pre-event intelligence documents

// ---------------------------------------------------------------------------
// Raw aggregated context (no AI, pure data)
// ---------------------------------------------------------------------------

export type BriefingContext = {
  event: {
    id: string
    occasion: string | null
    eventDate: string
    serveTime: string | null
    arrivalTime: string | null
    guestCount: number | null
    guestCountConfirmed: number | null
    serviceStyle: string | null
    status: string
    specialRequests: string | null
    notes: string | null
    dietaryNotes: string | null
    allergies: string[]
    dietaryRestrictions: string[]
    locationAddress: string | null
    locationCity: string | null
    locationNotes: string | null
    accessInstructions: string | null
    siteNotes: string | null
    alcoholBeingServed: boolean | null
  }
  client: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
  clientMemories: Array<{
    key: string
    value: unknown
    confidence: number
    pinned: boolean
  }>
  pastEvents: Array<{
    id: string
    occasion: string | null
    eventDate: string
    guestCount: number | null
    status: string
    chefOutcomeNotes: string | null
    chefOutcomeRating: number | null
  }>
  menus: Array<{
    name: string
    serviceStyle: string | null
    dishes: Array<{
      name: string | null
      courseName: string
      description: string | null
      dietaryTags: string[]
      allergenFlags: string[]
    }>
  }>
  financial: {
    quotedPriceCents: number | null
    totalPaidCents: number
    outstandingBalanceCents: number
    paymentStatus: string | null
  }
  prepStatus: {
    groceryListReady: boolean
    prepListReady: boolean
    equipmentListReady: boolean
    packingListReady: boolean
    timelineReady: boolean
    travelRouteReady: boolean
  }
  travelInfo: {
    distanceMiles: number
    durationMinutes: number
  } | null
  weather: {
    summary: string
    temperatureF: number
    precipChance: number
  } | null
  recentMessages: Array<{
    content: string
    senderName: string | null
    createdAt: string
  }>
}

// ---------------------------------------------------------------------------
// AI-generated briefing document
// ---------------------------------------------------------------------------

export type BriefingSection = {
  title: string
  content: string
  priority: 'high' | 'medium' | 'low'
}

export type BriefingRedFlag = {
  label: string
  details: string
  severity: 'critical' | 'warning'
}

export type BriefingDocument = {
  eventId: string
  generatedAt: string
  sections: {
    clientRecap: string
    eventVitals: string
    dietaryRiskSummary: string
    menuIntelligence: string
    clientHistory: string
    logistics: string
    financialContext: string
    prepStatus: string
    talkingPoints: string[]
    redFlags: BriefingRedFlag[]
  }
  fullDocument: string // pre-formatted plaintext for print/copy
  staleAfter: string // ISO timestamp; re-generate if event updated after this
}

// ---------------------------------------------------------------------------
// Fallback (when AI is offline)
// ---------------------------------------------------------------------------

export type BriefingFallback = {
  type: 'fallback'
  context: BriefingContext
  generatedAt: string
}
