// ---------------------------------------------------------------------------
// Marisol Circle Bridge: Types
// Scheduling context, suggestions, and coordination status for circle events.
// ---------------------------------------------------------------------------

import type { CircleCollaboratorRole } from './collaborator-types'

// ---------------------------------------------------------------------------
// Circle member with dietary context
// ---------------------------------------------------------------------------

export type CircleMemberProfile = {
  profileId: string
  displayName: string | null
  email: string | null
  role: CircleCollaboratorRole | 'owner'
  dietaryRestrictions: string[]
  allergies: string[]
}

// ---------------------------------------------------------------------------
// Dietary aggregation across all circle members
// ---------------------------------------------------------------------------

export type CircleDietaryBrief = {
  totalMembers: number
  membersWithData: number
  allergySummary: Record<string, number>
  restrictionSummary: Record<string, number>
  safeAssumptions: string[]
}

// ---------------------------------------------------------------------------
// Past event summary (lightweight, for pattern detection)
// ---------------------------------------------------------------------------

export type CirclePastEvent = {
  eventId: string
  eventDate: string
  menuName: string | null
  guestCount: number
  status: string
}

// ---------------------------------------------------------------------------
// Full scheduling context for a circle
// ---------------------------------------------------------------------------

export type CircleSchedulingContext = {
  circleId: string
  circleName: string
  members: CircleMemberProfile[]
  dietaryBrief: CircleDietaryBrief
  pastEvents: CirclePastEvent[]
  collaborators: Array<{
    userId: string
    displayName: string | null
    role: CircleCollaboratorRole
  }>
  /** Average days between events, null if fewer than 2 events */
  averageFrequencyDays: number | null
  lastEventDate: string | null
  nextScheduledDate: string | null
}

// ---------------------------------------------------------------------------
// Suggestion for the next circle event
// ---------------------------------------------------------------------------

export type CircleSuggestion = {
  suggestedDate: string | null
  reasoning: string
  menuDirection: string | null
  avoidRepeats: string[]
  seasonalNotes: string[]
  dietaryReminders: string[]
}

// ---------------------------------------------------------------------------
// Per-circle coordination status (used in overview)
// ---------------------------------------------------------------------------

export type CircleCoordinationEntry = {
  circleId: string
  circleName: string
  memberCount: number
  upcomingEventDate: string | null
  lastEventDate: string | null
  averageFrequencyDays: number | null
  daysSinceLastEvent: number | null
  /** True when no event in longer than the average frequency */
  overdueForScheduling: boolean
  membersChangedSinceLastEvent: number
}

export type CircleCoordinationOverview = {
  circles: CircleCoordinationEntry[]
  overdueCount: number
  totalUpcoming: number
}
