// Client Intelligence Pre-Event Checklist
// Computed at render time from existing data. Never persisted.

export const LIFESTYLE_TAG_OPTIONS = [
  'health_conscious',
  'foodie',
  'entertainer',
  'fitness',
  'vegan_household',
  'kosher',
  'halal',
] as const

export type LifestyleTag = (typeof LIFESTYLE_TAG_OPTIONS)[number]

export const LIFESTYLE_TAG_LABELS: Record<LifestyleTag, string> = {
  health_conscious: 'Health Conscious',
  foodie: 'Foodie',
  entertainer: 'Entertainer',
  fitness: 'Fitness',
  vegan_household: 'Vegan Household',
  kosher: 'Kosher',
  halal: 'Halal',
}

export const KITCHEN_QUALITY_OPTIONS = ['basic', 'decent', 'well_equipped', 'professional'] as const
export type KitchenQuality = (typeof KITCHEN_QUALITY_OPTIONS)[number]

export const KITCHEN_QUALITY_LABELS: Record<KitchenQuality, string> = {
  basic: 'Basic',
  decent: 'Decent',
  well_equipped: 'Well-equipped',
  professional: 'Professional',
}

export const COMPANY_INDUSTRY_OPTIONS = [
  'Tech',
  'Finance',
  'Law',
  'Healthcare',
  'Hospitality',
  'Education',
  'Non-profit',
  'Government',
  'Other',
] as const

export interface IntelChecklistItem {
  id: string
  label: string
  category:
    | 'dietary'
    | 'kitchen'
    | 'guest'
    | 'household'
    | 'vibe'
    | 'budget'
    | 'contact'
    | 'social'
    | 'access'
    | 'referral'
    | 'children'
  /** True = relevant for event-scoped checklist */
  eventRelevant: boolean
}

export interface ClientProfile {
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  kitchen_quality?: string | null
  typical_guest_count?: string | null
  household_size?: number | null
  children_ages?: string | null
  preferred_contact_method?: string | null
  instagram_handle?: string | null
  social_media_links?: Array<{ platform: string; url: string }> | null
  neighborhood_notes?: string | null
  referral_source?: string | null
  budget_range_min_cents?: number | null
  budget_range_max_cents?: number | null
}

export interface EventDetail {
  guest_count?: number | null
  vibe_atmosphere?: string | null
  budget_cents?: number | null
  quoted_price_cents?: number | null
}

export interface KitchenAssessment {
  id: string
  client_id: string
}

export interface HouseholdMember {
  id: string
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  age_group?: string | null
}

/**
 * Compute which intel gaps exist for a client, optionally scoped to an event.
 * Returns only incomplete items (completed items vanish).
 */
export function computeIntelChecklist(
  client: ClientProfile,
  event?: EventDetail,
  kitchenAssessments?: KitchenAssessment[],
  householdMembers?: HouseholdMember[]
): IntelChecklistItem[] {
  const gaps: IntelChecklistItem[] = []

  // Dietary restrictions confirmed
  const hasDietary = client.dietary_restrictions && client.dietary_restrictions.length > 0
  const memberHasDietary = householdMembers?.some(
    (m) => m.dietary_restrictions && m.dietary_restrictions.length > 0
  )
  if (!hasDietary && !memberHasDietary) {
    gaps.push({
      id: 'dietary',
      label: 'Dietary restrictions confirmed?',
      category: 'dietary',
      eventRelevant: true,
    })
  }

  // Allergies documented
  const hasAllergies = client.allergies && client.allergies.length > 0
  const memberHasAllergies = householdMembers?.some((m) => m.allergies && m.allergies.length > 0)
  if (!hasAllergies && !memberHasAllergies) {
    gaps.push({
      id: 'allergies',
      label: 'Allergies documented?',
      category: 'dietary',
      eventRelevant: true,
    })
  }

  // Kitchen assessed
  const hasKitchenAssessment = kitchenAssessments && kitchenAssessments.length > 0
  const hasKitchenQuality = !!client.kitchen_quality
  if (!hasKitchenAssessment && !hasKitchenQuality) {
    gaps.push({
      id: 'kitchen',
      label: 'Kitchen assessed?',
      category: 'kitchen',
      eventRelevant: true,
    })
  }

  // Guest count confirmed
  const hasGuestCount =
    !!client.typical_guest_count || (event && event.guest_count != null && event.guest_count > 0)
  if (!hasGuestCount) {
    gaps.push({
      id: 'guest_count',
      label: 'Guest count confirmed?',
      category: 'guest',
      eventRelevant: true,
    })
  }

  // Household size known
  if (client.household_size == null) {
    gaps.push({
      id: 'household_size',
      label: 'Household size known?',
      category: 'household',
      eventRelevant: false,
    })
  }

  // Children accounted for
  const hasChildrenInfo = !!client.children_ages
  const hasChildMember = householdMembers?.some(
    (m) => m.age_group === 'child' || m.age_group === 'toddler' || m.age_group === 'infant'
  )
  const smallHousehold =
    client.household_size != null && client.household_size <= 2 && !hasChildMember
  if (!hasChildrenInfo && !smallHousehold) {
    gaps.push({
      id: 'children',
      label: 'Children accounted for?',
      category: 'children',
      eventRelevant: false,
    })
  }

  // Theme/vibe discussed
  if (event && !event.vibe_atmosphere) {
    gaps.push({
      id: 'vibe',
      label: 'Theme/vibe discussed?',
      category: 'vibe',
      eventRelevant: true,
    })
  }

  // Budget range established
  const hasBudget = client.budget_range_min_cents != null || client.budget_range_max_cents != null
  const eventHasBudget = event && (event.budget_cents != null || event.quoted_price_cents != null)
  if (!hasBudget && !eventHasBudget) {
    gaps.push({
      id: 'budget',
      label: 'Budget range established?',
      category: 'budget',
      eventRelevant: true,
    })
  }

  // Contact preference set
  if (!client.preferred_contact_method) {
    gaps.push({
      id: 'contact',
      label: 'Contact preference set?',
      category: 'contact',
      eventRelevant: false,
    })
  }

  // Social links captured
  const hasSocial =
    !!client.instagram_handle || (client.social_media_links && client.social_media_links.length > 0)
  if (!hasSocial) {
    gaps.push({
      id: 'social',
      label: 'Social links captured?',
      category: 'social',
      eventRelevant: false,
    })
  }

  // Parking/access noted
  if (!client.neighborhood_notes) {
    gaps.push({
      id: 'parking',
      label: 'Parking/access noted?',
      category: 'access',
      eventRelevant: true,
    })
  }

  // Referral source recorded
  if (!client.referral_source) {
    gaps.push({
      id: 'referral',
      label: 'Referral source recorded?',
      category: 'referral',
      eventRelevant: false,
    })
  }

  return gaps
}

/**
 * Filter to event-relevant items only.
 */
export function getEventScopedChecklist(items: IntelChecklistItem[]): IntelChecklistItem[] {
  return items.filter((item) => item.eventRelevant)
}
