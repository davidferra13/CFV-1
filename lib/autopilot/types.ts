// Autopilot types
// Represents a client/event pair that needs a status update from the chef

export type PendingClientUpdate = {
  eventId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  occasion: string | null
  eventDate: string
  guestCount: number | null
  eventStatus: string
  locationCity: string | null
  quoteStatus: string | null
  quotedPriceCents: number | null
  /** Days since last real outbound contact (email, text, phone). null = never contacted. */
  daysSinceLastContact: number | null
  lastContactAt: string | null
  /** Summarized context for draft generation */
  contextSummary: string
}

export type AutopilotDraft = {
  subject: string
  body: string
}

export type AutopilotApproveInput = {
  eventId: string
  clientId: string
  clientEmail: string
  chefEmail: string
  subject: string
  body: string
}
