// Client Passport types
// Portable client preference profile, notes, special dates, and AI insights

export type ServiceStyle =
  | 'formal_plated'
  | 'family_style'
  | 'buffet'
  | 'cocktail'
  | 'tasting_menu'
  | 'no_preference'

export type CommunicationMode = 'direct' | 'delegate_only' | 'delegate_preferred'
export type ContactMethod = 'email' | 'sms' | 'phone' | 'circle'
export type ChefAutonomyLevel = 'full' | 'high' | 'moderate' | 'low'
export type SpecialDateRecurrence = 'annual' | 'once'

export interface PassportLocation {
  label: string
  address?: string
  city: string
  state: string
}

export interface ClientPassport {
  id: string
  tenant_id: string
  client_id: string
  communication_mode: CommunicationMode
  preferred_contact_method: ContactMethod | null
  chef_autonomy_level: ChefAutonomyLevel
  auto_approve_under_cents: number | null
  max_interaction_rounds: number | null
  standing_instructions: string | null
  default_guest_count: number | null
  budget_range_min_cents: number | null
  budget_range_max_cents: number | null
  service_style: ServiceStyle | null
  default_locations: PassportLocation[]
  delegate_name: string | null
  delegate_email: string | null
  delegate_phone: string | null
  created_at: string
  updated_at: string
}

export interface ClientNote {
  id: string
  tenant_id: string
  client_id: string
  content: string
  is_confidential: boolean
  category: string
  pinned: boolean
  event_id: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface SpecialDate {
  id: string
  client_id: string
  tenant_id: string
  label: string
  date: string
  recurrence: SpecialDateRecurrence
  notes: string | null
  created_at: string
}

export interface ClientInsight {
  category: 'preference_pattern' | 'spending_trend' | 'scheduling_pattern' | 'dietary_evolution'
  title: string
  summary: string
  confidence: number
  evidence_count: number
}

export interface ClientPassportFull {
  passport: ClientPassport | null
  notes: ClientNote[]
  specialDates: SpecialDate[]
  insights: ClientInsight[]
}
