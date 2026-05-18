// Dietary Outreach Types

export type DietaryOutreachStatus = 'sent' | 'opened' | 'responded' | 'expired'

export type AllergySeverity = 'preference' | 'intolerance' | 'allergy' | 'life_threatening'

export type SpiceTolerance = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot'

export type DietaryOutreachRecord = {
  id: string
  event_id: string
  guest_id: string
  tenant_id: string
  token: string
  sent_at: string
  opened_at: string | null
  responded_at: string | null
  response_data: DietaryResponseData | null
  expires_at: string
  status: DietaryOutreachStatus
}

export type DietaryResponseData = {
  dietary_restrictions: string[]
  allergies: string[]
  allergy_severity: AllergySeverity | null
  spice_tolerance: SpiceTolerance | null
  notes?: string
}

export type GuestOutreachInfo = {
  guest_id: string
  guest_name: string
  email: string | null
  status: DietaryOutreachStatus | 'not_sent'
  sent_at: string | null
  responded_at: string | null
  dietary_restrictions: string[]
  allergies: string[]
}

export const COMMON_DIETARY_RESTRICTIONS = [
  'gluten-free',
  'dairy-free',
  'vegan',
  'vegetarian',
  'nut-free',
  'shellfish-free',
  'kosher',
  'halal',
] as const

export const ALLERGY_SEVERITY_OPTIONS: { value: AllergySeverity; label: string }[] = [
  { value: 'preference', label: 'Preference (I avoid it when possible)' },
  { value: 'intolerance', label: 'Intolerance (causes discomfort)' },
  { value: 'allergy', label: 'Allergy (causes a reaction)' },
  { value: 'life_threatening', label: 'Life-threatening (anaphylaxis risk)' },
]

export const SPICE_TOLERANCE_OPTIONS: { value: SpiceTolerance; label: string }[] = [
  { value: 'none', label: 'No spice' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
  { value: 'extra_hot', label: 'Extra hot' },
]
