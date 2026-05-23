export const CAPACITY_STATES = [
  'available',
  'tight',
  'overloaded',
  'unsafe',
  'recovery_required',
  'unknown',
] as const

export type CapacityState = (typeof CAPACITY_STATES)[number]

export const CAPACITY_STATE_RANK: Record<CapacityState, number> = {
  available: 0,
  tight: 1,
  overloaded: 2,
  unsafe: 3,
  recovery_required: 4,
  unknown: 5,
}

export const WORKLOAD_COMPONENTS = [
  'shopping',
  'prep',
  'admin',
  'travel',
  'service',
  'cleanup',
  'recovery',
  'communication',
  'staff_coordination',
  'menu_development',
  'loadout',
] as const

export type WorkloadComponent = (typeof WORKLOAD_COMPONENTS)[number]

export const CAPACITY_CONSTRAINT_SOURCES = [
  'manual_chef_input',
  'event_plan',
  'menu_plan',
  'quote',
  'inquiry',
  'calendar',
  'staff_availability',
  'travel_estimate',
  'prior_event_history',
  'remy_note',
  'manual_note',
  'operational_load',
  'capacity_settings',
  'scheduling_rules',
] as const

export type CapacityConstraintSource = (typeof CAPACITY_CONSTRAINT_SOURCES)[number]

export const PRIVATE_CAPACITY_CONSTRAINT_KINDS = [
  'injury',
  'sleep_debt',
  'recovery_need',
  'caregiving_window',
  'travel_strain',
  'burnout_risk',
  'no_lift_limit',
  'cognitive_load_limit',
  'rest_day',
  'medical_appointment',
  'manual_blackout',
  'weather_sensitivity',
] as const

export type PrivateCapacityConstraintKind = (typeof PRIVATE_CAPACITY_CONSTRAINT_KINDS)[number]

export const CAPACITY_VISIBILITY_LEVELS = [
  'private_only',
  'chef_staff_private',
  'client_safe_summary',
  'public_safe_summary',
] as const

export type CapacityVisibilityLevel = (typeof CAPACITY_VISIBILITY_LEVELS)[number]

export type CapacityDecisionSubjectType =
  | 'calendar_date'
  | 'event'
  | 'inquiry'
  | 'quote'
  | 'proposal'

export type CapacitySeverity = 'info' | 'warning' | 'blocker'

export type CapacityConfidence = 'low' | 'medium' | 'high'

export type CapacityProfileContract = {
  tenantId: string
  chefId: string
  maxPrepMinutesPerDay: number | null
  maxServiceMinutesPerDay: number | null
  maxTravelMinutesPerDay: number | null
  maxWorkMinutesPerWeek: number | null
  preferredWorkCadence: 'front_loaded' | 'spread_evenly' | 'weekend_heavy' | 'custom' | null
  restDaysPerWeek: number | null
  recoveryMinutesAfterEvent: number | null
  privateConstraintCount: number
  sourceRefs: CapacitySourceRef[]
}

export type CapacitySourceRef = {
  source: CapacityConstraintSource
  table:
    | 'chef_capacity_settings'
    | 'chefs'
    | 'chef_scheduling_rules'
    | 'events'
    | 'event_prep_blocks'
    | 'chef_availability_blocks'
    | 'scheduled_calls'
    | 'inquiries'
    | 'quotes'
    | 'derived'
  rowId: string | null
}

export type WorkloadEstimateFactor = {
  component: WorkloadComponent
  estimatedMinutes: number | null
  confidence: CapacityConfidence
  source: CapacityConstraintSource
  explanation: string
}

export type WorkloadEstimateContract = {
  tenantId: string
  subjectType: CapacityDecisionSubjectType
  subjectId: string | null
  targetDate: string | null
  factors: WorkloadEstimateFactor[]
  totalKnownMinutes: number
  unknownFactors: WorkloadComponent[]
  confidence: CapacityConfidence
}

export type PrivateCapacityConstraintContract = {
  tenantId: string
  chefId: string
  kind: PrivateCapacityConstraintKind
  source: CapacityConstraintSource
  severity: CapacitySeverity
  startsAt: string | null
  endsAt: string | null
  label: string
  privateNotes: string | null
  visibility: 'private_only'
}

export type CapacityOverrideRecordContract = {
  tenantId: string
  subjectType: CapacityDecisionSubjectType
  subjectId: string
  previousState: CapacityState
  overrideReason: string
  expiresAt: string | null
  createdByUserId: string
  visibility: 'private_only'
}

export type ClientSafeCapacityAlternative = {
  kind: 'date' | 'scope' | 'staffing' | 'price' | 'decline'
  message: string
  targetDate: string | null
  visibility: 'client_safe_summary'
}

export type ClientSafeCapacitySummary = {
  tenantId: string
  subjectType: CapacityDecisionSubjectType
  subjectId: string | null
  state: CapacityState
  headline: string
  alternatives: ClientSafeCapacityAlternative[]
  unknownFactors: WorkloadComponent[]
  blockedPrivateReasonCount: number
  visibility: 'client_safe_summary'
}

export type CapacityDecisionContract = {
  tenantId: string
  subjectType: CapacityDecisionSubjectType
  subjectId: string | null
  state: CapacityState
  severity: CapacitySeverity
  chefOnlyReasons: string[]
  workload: WorkloadEstimateContract
  privateConstraints: PrivateCapacityConstraintContract[]
  override: CapacityOverrideRecordContract | null
  clientSafeAlternatives: ClientSafeCapacityAlternative[]
}

export const CLIENT_SAFE_CAPACITY_STATE_COPY: Record<
  CapacityState,
  { headline: string; disclosureLevel: 'none' | 'safe_capacity_summary' }
> = {
  available: {
    headline: 'This date looks workable.',
    disclosureLevel: 'safe_capacity_summary',
  },
  tight: {
    headline: 'This date may need a lighter scope or different timing.',
    disclosureLevel: 'safe_capacity_summary',
  },
  overloaded: {
    headline: 'This date is not realistic without changing the plan.',
    disclosureLevel: 'safe_capacity_summary',
  },
  unsafe: {
    headline: 'This request needs a different date or scope.',
    disclosureLevel: 'safe_capacity_summary',
  },
  recovery_required: {
    headline: 'The earliest realistic date is later than requested.',
    disclosureLevel: 'safe_capacity_summary',
  },
  unknown: {
    headline: 'More schedule details are needed before confirming.',
    disclosureLevel: 'safe_capacity_summary',
  },
}

export type CapacitySourceSystem =
  | 'chef_capacity_settings'
  | 'chef_scheduling_rules'
  | 'chefs'
  | 'events'
  | 'event_prep_blocks'
  | 'chef_availability_blocks'
  | 'scheduled_calls'
  | 'inquiries'
  | 'quotes'
  | 'calendar'
  | 'remy'

const REQUIRED_CAPACITY_SOURCE_SYSTEMS: Record<
  CapacityDecisionSubjectType,
  CapacitySourceSystem[]
> = {
  calendar_date: [
    'chef_capacity_settings',
    'chef_scheduling_rules',
    'chefs',
    'events',
    'event_prep_blocks',
    'chef_availability_blocks',
    'scheduled_calls',
    'calendar',
  ],
  event: [
    'chef_capacity_settings',
    'chef_scheduling_rules',
    'chefs',
    'events',
    'event_prep_blocks',
    'scheduled_calls',
  ],
  inquiry: [
    'chef_capacity_settings',
    'chef_scheduling_rules',
    'chefs',
    'events',
    'inquiries',
    'calendar',
  ],
  quote: [
    'chef_capacity_settings',
    'chef_scheduling_rules',
    'chefs',
    'events',
    'event_prep_blocks',
    'quotes',
    'inquiries',
  ],
  proposal: [
    'chef_capacity_settings',
    'chef_scheduling_rules',
    'chefs',
    'events',
    'quotes',
    'inquiries',
  ],
}

const PRIVATE_CAPACITY_LEAK_TERMS = [
  'injury',
  'sleep',
  'family',
  'caregiving',
  'burnout',
  'recovery',
  'medical',
  'no-lift',
  'no lift',
  'cognitive',
] as const

export function deriveMostRestrictiveCapacityState(
  states: readonly CapacityState[]
): CapacityState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    CAPACITY_STATE_RANK[candidate] > CAPACITY_STATE_RANK[current] ? candidate : current
  )
}

export function isPrivateCapacityConstraintKind(
  value: string
): value is PrivateCapacityConstraintKind {
  return (PRIVATE_CAPACITY_CONSTRAINT_KINDS as readonly string[]).includes(value)
}

export function isClientSafeCapacityVisibility(visibility: CapacityVisibilityLevel): boolean {
  return visibility === 'client_safe_summary' || visibility === 'public_safe_summary'
}

export function isPrivateCapacityVisibility(visibility: CapacityVisibilityLevel): boolean {
  return visibility === 'private_only' || visibility === 'chef_staff_private'
}

export function toClientSafeCapacityHeadline(state: CapacityState): string {
  return CLIENT_SAFE_CAPACITY_STATE_COPY[state].headline
}

export function getRequiredCapacitySourceSystems(
  subjectType: CapacityDecisionSubjectType
): CapacitySourceSystem[] {
  return [...REQUIRED_CAPACITY_SOURCE_SYSTEMS[subjectType]]
}

export function containsPrivateCapacityLeak(value: string): boolean {
  const lower = value.toLowerCase()
  return PRIVATE_CAPACITY_LEAK_TERMS.some((term) => lower.includes(term))
}

export function buildClientSafeCapacitySummary(
  decision: CapacityDecisionContract
): ClientSafeCapacitySummary {
  const alternatives = decision.clientSafeAlternatives.filter(
    (alternative) =>
      alternative.visibility === 'client_safe_summary' &&
      !containsPrivateCapacityLeak(alternative.message)
  )
  const redactedAlternativeCount = decision.clientSafeAlternatives.length - alternatives.length
  const redactedChefReasonCount = decision.chefOnlyReasons.filter(
    containsPrivateCapacityLeak
  ).length
  const clientSafeState: CapacityState =
    decision.state === 'recovery_required' ? 'unsafe' : decision.state

  return {
    tenantId: decision.tenantId,
    subjectType: decision.subjectType,
    subjectId: decision.subjectId,
    state: clientSafeState,
    headline: toClientSafeCapacityHeadline(decision.state),
    alternatives,
    unknownFactors: [...decision.workload.unknownFactors],
    blockedPrivateReasonCount:
      decision.privateConstraints.length + redactedAlternativeCount + redactedChefReasonCount,
    visibility: 'client_safe_summary',
  }
}
