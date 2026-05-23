export type CommitmentDomain =
  | 'pricing'
  | 'quality'
  | 'financial'
  | 'scheduling'
  | 'dietary'
  | 'menu'
  | 'closeout'
  | 'communication'
  | 'capacity'
  | 'contingency'
  | 'travel'
  | 'business_health'

export type CommitmentSource = 'chef_declared' | 'system_suggested' | 'system_accepted'
export type CommitmentStatus = 'active' | 'paused' | 'dismissed'
export type FrictionTier = 1 | 2 | 3 | 4 | 5
export type CommitmentSeason = 'peak' | 'quiet' | 'holiday' | 'custom'

export type OverrideCategory =
  | 'time_constraint'
  | 'client_request'
  | 'ingredient_substitution'
  | 'venue_change'
  | 'simplified_service'
  | 'financial_pressure'
  | 'scheduling_cascade'
  | 'chef_judgment'
  | 'other'

export type CommitmentRule =
  | { type: 'pricing_floor'; minPerHead: number }
  | { type: 'margin_floor'; maxFoodCostPercent: number }
  | { type: 'no_late_discounts'; freezeDaysBeforeEvent: number }
  | { type: 'max_events_per_week'; limit: number }
  | { type: 'min_rest_days'; days: number; perWeeks: number }
  | { type: 'max_consecutive_work_days'; limit: number }
  | { type: 'protected_time_lock'; blockIds: string[] }
  | { type: 'no_same_day_doubles_after'; hour: number }
  | { type: 'allergens_verified_before_confirm'; required: true }
  | { type: 'cross_contamination_check_required'; required: true }
  | { type: 'no_unverified_substitutions'; required: true }
  | { type: 'dietary_summary_sent_before'; days: number }
  | { type: 'menu_lock_cooldown'; hours: number }
  | { type: 'max_menu_revisions'; limit: number }
  | { type: 'no_new_dishes_within'; days: number }
  | { type: 'recipe_required_before_lock'; required: true }
  | { type: 'invoice_within_days'; days: number }
  | { type: 'payment_followup_within_days'; days: number }
  | { type: 'cost_reconciliation_required'; required: true }
  | { type: 'no_new_events_until_closeout'; maxUnclosed: number }
  | { type: 'response_time_sla'; hours: number }
  | { type: 'cadence_integrity'; required: true }
  | { type: 'no_radio_silence'; maxDays: number }
  | { type: 'post_event_followup_within'; hours: number }
  | { type: 'max_guests_without_sous'; limit: number }
  | { type: 'revenue_concentration_cap'; maxPercent: number }
  | { type: 'min_prep_time_per_tier'; hoursPerGuestTier: Record<string, number> }
  | { type: 'min_gap_between_events'; minutes: number }
  | { type: 'emergency_contacts_before_confirm'; required: true }
  | { type: 'backup_plan_for_high_value'; minEventValue: number }
  | { type: 'insurance_current_required'; required: true }
  | { type: 'equipment_checklist_before_service'; required: true }
  | { type: 'travel_time_buffer'; minutes: number }
  | { type: 'travel_plan_before_confirm'; required: true }
  | { type: 'max_distance_without_overnight'; miles: number }
  | { type: 'travel_surcharge_required'; required: true }
  | { type: 'weekly_financial_review'; required: true }
  | { type: 'quarterly_rate_review'; required: true }
  | { type: 'certification_currency'; required: true }
  | { type: 'savings_reserve_percent'; percent: number }
  | { type: 'no_free_work_tasting_fee'; minFee: number }
  | { type: 'no_free_work_revision_cap'; included: number; overageFee: number }
  | { type: 'no_free_work_consultation_fee'; minFee: number; afterMinutes: number }
  | { type: 'say_no_min_event_value'; minTotal: number }
  | { type: 'say_no_max_distance'; maxMiles: number }
  | { type: 'say_no_cancelled_clients_require_prepay'; required: true }
  | { type: 'time_of_day_no_responses_after'; hour: number }
  | { type: 'time_of_day_no_quotes_after'; hour: number }
  | { type: 'time_of_day_no_accepts_between'; startHour: number; endHour: number }
  | { type: 'recipe_tested_before_serve'; required: true }
  | { type: 'plating_standards_documented'; required: true }
  | { type: 'ingredient_quality_floor'; minGrade: string }
  | { type: 'no_shortcuts_under_pressure'; required: true }
  | { type: 'cost_tracking_per_event'; required: true }
  | { type: 'tax_prep_quarterly'; required: true }
  | { type: 'seasonal_booking_limit'; season: string; maxEvents: number }
  | { type: 'weather_contingency_outdoor'; required: true }
  | { type: 'backup_vendor_list'; required: true }
  | { type: 'equipment_failure_plan'; required: true }
  | { type: 'inquiry_acknowledgment_within'; hours: number }
  | { type: 'custom'; description: string; validatorId: string }

export interface Commitment {
  id: string
  tenantId: string
  domain: CommitmentDomain
  source: CommitmentSource
  rule: CommitmentRule
  status: CommitmentStatus
  frictionLevel: FrictionTier
  overrideCount: number
  lastOverrideAt: Date | null
  currentStreak: number
  longestStreak: number
  futureSelfletter: string | null
  seasonalProfile: CommitmentSeason | null
  createdAt: Date
  updatedAt: Date
}

export interface CommitmentOverride {
  id: string
  commitmentId: string
  tenantId: string
  category: OverrideCategory | null
  reason: string
  frictionTierAtOverride: FrictionTier
  regretPrediction: number | null
  context: Record<string, unknown> | null
  createdAt: Date
}

export interface CommitmentSuggestion {
  id: string
  tenantId: string
  domain: CommitmentDomain
  suggestedRule: CommitmentRule
  rationale: string
  evidence: Record<string, unknown> | null
  status: 'pending' | 'accepted' | 'dismissed'
  respondedAt: Date | null
  dismissedReason: string | null
  createdAt: Date
}

export const DOMAIN_DEFAULT_TIERS: Record<CommitmentDomain, FrictionTier> = {
  pricing: 1,
  quality: 2,
  financial: 1,
  scheduling: 1,
  dietary: 3,
  menu: 1,
  closeout: 1,
  communication: 1,
  capacity: 1,
  contingency: 2,
  travel: 1,
  business_health: 1,
}

export const DOMAIN_LABELS: Record<CommitmentDomain, string> = {
  pricing: 'Pricing',
  quality: 'Quality Standards',
  financial: 'Financial Discipline',
  scheduling: 'Scheduling',
  dietary: 'Dietary Safety',
  menu: 'Menu Integrity',
  closeout: 'Closeout',
  communication: 'Communication',
  capacity: 'Capacity',
  contingency: 'Contingency',
  travel: 'Travel',
  business_health: 'Business Health',
}

export const OVERRIDE_CATEGORY_LABELS: Record<OverrideCategory, string> = {
  time_constraint: 'Not enough time',
  client_request: 'Client asked for this',
  ingredient_substitution: 'Ingredient not available',
  venue_change: 'Venue requirements changed',
  simplified_service: 'Simplifying service scope',
  financial_pressure: 'Need the revenue',
  scheduling_cascade: 'Domino from another commitment',
  chef_judgment: 'Professional judgment call',
  other: 'Other reason',
}

export const DOMAIN_SEVERITY_ORDER: CommitmentDomain[] = [
  'dietary',
  'quality',
  'contingency',
  'pricing',
  'financial',
  'scheduling',
  'capacity',
  'closeout',
  'communication',
  'menu',
  'travel',
  'business_health',
]

export interface CommitmentIntegrityScore {
  overall: number
  byDomain: Partial<Record<CommitmentDomain, number>>
  trend: 'improving' | 'stable' | 'declining'
  windowDays: 90
}

export interface FrictionCheckResult {
  blocked: false
  tier: FrictionTier
  commitment: Commitment
  streakAtRisk: number | null
  overridesInWindow: { last30: number; last60: number; last90: number }
  hasConsequenceCorrelation: boolean
  ruleDescription: string
}
