/** Allergy Severity Tiers - Type definitions */

export type AllergySeverity = 'preference' | 'intolerance' | 'allergy'

/** Color coding for severity display */
export const SEVERITY_COLORS: Record<AllergySeverity, string> = {
  preference: 'yellow',
  intolerance: 'orange',
  allergy: 'red',
}

/** Display labels for severity tiers */
export const SEVERITY_LABELS: Record<AllergySeverity, string> = {
  preference: 'Preference',
  intolerance: 'Intolerance',
  allergy: 'Allergy',
}

/** Protocol descriptions per severity tier */
export const SEVERITY_PROTOCOLS: Record<AllergySeverity, string> = {
  preference: 'Avoid in their dishes. Cross-contact OK.',
  intolerance: 'Avoid in their dishes. Minimize cross-contact.',
  allergy: 'Zero tolerance. Separate prep. No cross-contact. Verify every ingredient.',
}

export type GuestAllergy = {
  id: string
  guest_id: string
  tenant_id: string
  allergen: string
  severity: AllergySeverity
  notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  has_epipen: boolean
  created_at: string
  updated_at: string
}

export type EmergencyInfo = {
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  has_epipen: boolean
}

export type SetGuestAllergySeverityInput = {
  allergen: string
  severity: AllergySeverity
  notes?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  has_epipen?: boolean
}

/** Aggregated allergy report for an event, grouped by severity tier */
export type AllergyReport = {
  allergies: AllergyReportEntry[]
  intolerances: AllergyReportEntry[]
  preferences: AllergyReportEntry[]
  total_guests_with_restrictions: number
}

export type AllergyReportEntry = {
  guest_id: string
  guest_name: string
  allergen: string
  severity: AllergySeverity
  notes: string | null
  has_epipen: boolean
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

/** Cross-contamination risk for a dish at an event */
export type CrossContaminationRisk = {
  dish_id: string
  dish_name: string
  allergen: string
  severity: AllergySeverity
  affected_guests: Array<{
    guest_id: string
    guest_name: string
    has_epipen: boolean
  }>
}

/** Kitchen-ready briefing for an event */
export type KitchenAllergyBriefing = {
  event_id: string
  event_name: string | null
  critical_allergies: BriefingEntry[]
  intolerances: BriefingEntry[]
  preferences: BriefingEntry[]
  separation_protocols: string[]
}

export type BriefingEntry = {
  guest_name: string
  allergen: string
  severity: AllergySeverity
  protocol: string
  has_epipen: boolean
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}
