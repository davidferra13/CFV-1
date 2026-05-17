export interface ClientRelationshipProfile {
  clientId: string
  name: string
  lifetimeValueCents: number
  totalEvents: number
  avgEventValueCents: number
  firstEventDate: string | null
  lastEventDate: string | null
  daysSinceLastEvent: number | null
  bookingFrequencyDays: number | null
  communicationCount: number
  lastCommunicationDate: string | null
  avgRating: number | null
  dietaryNotes: string[]
  preferredServiceStyle: string | null
  relationshipHealth: 'thriving' | 'stable' | 'cooling' | 'at_risk' | 'dormant'
  tags: string[]
}

export interface RelationshipHealthFactors {
  recency: number // 0-100
  frequency: number // 0-100
  value: number // 0-100
  satisfaction: number // 0-100
  overall: number // weighted average
}

export interface ClientBookingPatterns {
  clientId: string
  totalEvents: number
  avgLeadTimeDays: number | null
  preferredDaysOfWeek: string[]
  preferredMonths: number[]
  avgGuestCount: number | null
  preferredServiceStyle: string | null
  seasonalBreakdown: Record<string, number>
}
