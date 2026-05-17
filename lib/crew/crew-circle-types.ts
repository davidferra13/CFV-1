// ---------------------------------------------------------------------------
// Crew Circle Types
// Types for crew (staff/team) circles: roles, members, availability
// ---------------------------------------------------------------------------

export type CrewRole =
  | 'lead' // head chef, team lead
  | 'sous_chef' // sous chef
  | 'prep_cook' // prep cook
  | 'server' // front-of-house server
  | 'bartender' // bar staff
  | 'assistant' // general assistant
  | 'other' // catch-all

export type CrewAvailabilityStatus = 'available' | 'tentative' | 'unavailable'

export interface CrewCircle {
  id: string
  tenant_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CrewMember {
  id: string
  crew_circle_id: string
  staff_member_id: string
  role: CrewRole
  joined_at: string
  // Enriched from staff_members (not stored on this row)
  staff_name?: string
  staff_email?: string
  staff_phone?: string
}

export interface CrewAvailability {
  id: string
  crew_circle_id: string
  staff_member_id: string
  event_id: string | null
  date: string
  status: CrewAvailabilityStatus
  note: string | null
  created_at: string
  updated_at: string
}
