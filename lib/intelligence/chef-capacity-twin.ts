import {
  buildClientSafeCapacitySummary,
  type CapacityConfidence,
  type CapacityConstraintSource,
  type CapacityDecisionContract,
  type CapacityDecisionSubjectType,
  type CapacityOverrideRecordContract,
  type CapacityProfileContract,
  type CapacitySeverity,
  type CapacityState,
  type ClientSafeCapacityAlternative,
  type ClientSafeCapacitySummary,
  type PrivateCapacityConstraintContract,
  type WorkloadComponent,
  type WorkloadEstimateContract,
  type WorkloadEstimateFactor,
} from './chef-capacity-twin-contract'

export type CapacityProfileSourceInput = {
  tenantId: string
  chefId: string
  capacitySettings?: {
    max_events_per_day?: number | null
    max_events_per_week?: number | null
    default_prep_hours?: number | string | null
    default_travel_minutes?: number | null
    default_shopping_hours?: number | string | null
    default_cleanup_hours?: number | string | null
    blocked_days?: string[] | null
  } | null
  legacyChef?: {
    max_hours_per_week?: number | null
    min_rest_days_per_week?: number | null
    off_days?: string[] | null
  } | null
  privateConstraintCount?: number
}

export type CapacityWorkloadInput = {
  tenantId: string
  subjectType: CapacityDecisionSubjectType
  subjectId?: string | null
  targetDate?: string | null
  guestCount?: number | null
  serviceStyle?: string | null
  menuKnown?: boolean
  locationKnown?: boolean
  staffPlanKnown?: boolean
  prepMinutes?: number | null
  shoppingMinutes?: number | null
  adminMinutes?: number | null
  travelMinutes?: number | null
  serviceMinutes?: number | null
  cleanupMinutes?: number | null
  recoveryMinutes?: number | null
  communicationMinutes?: number | null
  staffCoordinationMinutes?: number | null
  menuDevelopmentMinutes?: number | null
  loadoutMinutes?: number | null
  complexity?: 'simple' | 'moderate' | 'complex'
}

export type CapacityDecisionInput = {
  tenantId: string
  chefId: string
  subjectType: CapacityDecisionSubjectType
  subjectId?: string | null
  targetDate?: string | null
  profile: CapacityProfileContract
  workload?: WorkloadEstimateContract
  workloadInput?: Omit<
    CapacityWorkloadInput,
    'tenantId' | 'subjectType' | 'subjectId' | 'targetDate'
  >
  privateConstraints?: PrivateCapacityConstraintContract[]
  override?: CapacityOverrideRecordContract | null
  existingDayMinutes?: number
  existingWeekMinutes?: number
}

const COMPLEXITY_MULTIPLIER = {
  simple: 0.75,
  moderate: 1,
  complex: 1.35,
} as const

const SERVICE_STYLE_MULTIPLIER: Record<string, number> = {
  cocktail: 0.8,
  buffet: 0.9,
  family_style: 1,
  plated: 1.15,
  tasting_menu: 1.35,
}

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function roundMinutes(value: number): number {
  return Math.max(0, Math.round(value / 5) * 5)
}

function confidenceFor(unknownCount: number): CapacityConfidence {
  if (unknownCount === 0) return 'high'
  if (unknownCount <= 2) return 'medium'
  return 'low'
}

function factor(params: {
  component: WorkloadComponent
  estimatedMinutes: number | null
  confidence: CapacityConfidence
  source: CapacityConstraintSource
  explanation: string
}): WorkloadEstimateFactor {
  return params
}

export function buildCapacityProfile(input: CapacityProfileSourceInput): CapacityProfileContract {
  const settings = input.capacitySettings
  const legacy = input.legacyChef
  const defaultPrep = numeric(settings?.default_prep_hours)
  const defaultTravel = numeric(settings?.default_travel_minutes)
  const defaultShopping = numeric(settings?.default_shopping_hours)
  const defaultCleanup = numeric(settings?.default_cleanup_hours)
  const weeklyHours = numeric(legacy?.max_hours_per_week)

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    maxPrepMinutesPerDay: defaultPrep === null ? null : roundMinutes(defaultPrep * 60),
    maxServiceMinutesPerDay: null,
    maxTravelMinutesPerDay: defaultTravel,
    maxWorkMinutesPerWeek: weeklyHours === null ? null : roundMinutes(weeklyHours * 60),
    preferredWorkCadence: null,
    restDaysPerWeek: legacy?.min_rest_days_per_week ?? null,
    recoveryMinutesAfterEvent: defaultCleanup === null ? null : roundMinutes(defaultCleanup * 30),
    privateConstraintCount: input.privateConstraintCount ?? 0,
    sourceRefs: [
      {
        source: 'capacity_settings',
        table: 'chef_capacity_settings',
        rowId: null,
      },
      {
        source: 'scheduling_rules',
        table: 'chef_scheduling_rules',
        rowId: null,
      },
      {
        source: 'capacity_settings',
        table: 'chefs',
        rowId: input.chefId,
      },
      ...(defaultShopping === null
        ? []
        : [
            {
              source: 'capacity_settings' as const,
              table: 'derived' as const,
              rowId: null,
            },
          ]),
    ],
  }
}

export function estimateCapacityWorkload(input: CapacityWorkloadInput): WorkloadEstimateContract {
  const complexity = input.complexity ?? 'moderate'
  const multiplier = COMPLEXITY_MULTIPLIER[complexity]
  const guestCount = input.guestCount ?? null
  const serviceMultiplier = SERVICE_STYLE_MULTIPLIER[input.serviceStyle ?? ''] ?? 1
  const hasMenu = input.menuKnown === true
  const hasLocation = input.locationKnown === true
  const hasStaffPlan = input.staffPlanKnown === true

  const serviceMinutes =
    input.serviceMinutes ??
    (guestCount === null ? null : roundMinutes(Math.max(120, guestCount * 11 * serviceMultiplier)))
  const prepMinutes =
    input.prepMinutes ??
    (!hasMenu || guestCount === null
      ? null
      : roundMinutes(Math.max(90, guestCount * 7 * multiplier)))
  const shoppingMinutes =
    input.shoppingMinutes ?? (!hasMenu ? null : roundMinutes(60 + (guestCount ?? 8) * 3))
  const travelMinutes = input.travelMinutes ?? (!hasLocation ? null : 30)
  const cleanupMinutes =
    input.cleanupMinutes ??
    (guestCount === null ? null : roundMinutes(Math.max(45, guestCount * 4)))
  const recoveryMinutes =
    input.recoveryMinutes ??
    (serviceMinutes === null ? null : serviceMinutes >= 240 || complexity === 'complex' ? 120 : 45)
  const staffCoordinationMinutes =
    input.staffCoordinationMinutes ??
    (guestCount === null
      ? null
      : !hasStaffPlan && guestCount >= 12
        ? null
        : guestCount >= 12
          ? 30
          : 10)
  const loadoutMinutes =
    input.loadoutMinutes ??
    (guestCount === null || !hasLocation ? null : roundMinutes(30 + guestCount * 2))
  const menuDevelopmentMinutes =
    input.menuDevelopmentMinutes ?? (!hasMenu ? null : complexity === 'complex' ? 90 : 35)

  const factors = [
    factor({
      component: 'shopping',
      estimatedMinutes: shoppingMinutes,
      confidence: shoppingMinutes === null ? 'low' : 'medium',
      source: hasMenu ? 'menu_plan' : 'inquiry',
      explanation:
        shoppingMinutes === null
          ? 'Menu or shopping requirements are not known yet.'
          : 'Shopping load is derived from menu readiness and guest count.',
    }),
    factor({
      component: 'prep',
      estimatedMinutes: prepMinutes,
      confidence: prepMinutes === null ? 'low' : 'medium',
      source: hasMenu ? 'menu_plan' : 'inquiry',
      explanation:
        prepMinutes === null
          ? 'Prep load needs menu and guest-count details.'
          : 'Prep load is estimated from menu complexity and guest count.',
    }),
    factor({
      component: 'admin',
      estimatedMinutes: input.adminMinutes ?? 30,
      confidence: 'medium',
      source: input.subjectType === 'quote' ? 'quote' : 'inquiry',
      explanation: 'Admin load covers review, coordination, and booking paperwork.',
    }),
    factor({
      component: 'travel',
      estimatedMinutes: travelMinutes,
      confidence: travelMinutes === null ? 'low' : 'medium',
      source: hasLocation ? 'travel_estimate' : 'inquiry',
      explanation:
        travelMinutes === null
          ? 'Travel load needs a venue or location.'
          : 'Travel load is derived from known or default travel time.',
    }),
    factor({
      component: 'service',
      estimatedMinutes: serviceMinutes,
      confidence: serviceMinutes === null ? 'low' : 'medium',
      source: input.subjectType === 'event' ? 'event_plan' : 'inquiry',
      explanation:
        serviceMinutes === null
          ? 'Service load needs a guest count.'
          : 'Service load is estimated from guest count and service style.',
    }),
    factor({
      component: 'cleanup',
      estimatedMinutes: cleanupMinutes,
      confidence: cleanupMinutes === null ? 'low' : 'medium',
      source: input.subjectType === 'event' ? 'event_plan' : 'inquiry',
      explanation:
        cleanupMinutes === null
          ? 'Cleanup load needs guest-count or scope details.'
          : 'Cleanup load is estimated from event size.',
    }),
    factor({
      component: 'recovery',
      estimatedMinutes: recoveryMinutes,
      confidence: recoveryMinutes === null ? 'low' : 'medium',
      source: 'capacity_settings',
      explanation:
        recoveryMinutes === null
          ? 'Recovery need cannot be estimated until service load is known.'
          : 'Recovery load reflects service duration and event complexity.',
    }),
    factor({
      component: 'communication',
      estimatedMinutes: input.communicationMinutes ?? 20,
      confidence: 'medium',
      source: 'manual_note',
      explanation: 'Communication load covers client and team follow-up.',
    }),
    factor({
      component: 'staff_coordination',
      estimatedMinutes: staffCoordinationMinutes,
      confidence: staffCoordinationMinutes === null ? 'low' : 'medium',
      source: hasStaffPlan ? 'staff_availability' : 'inquiry',
      explanation:
        staffCoordinationMinutes === null
          ? 'Staffing load needs guest-count and staff-plan details.'
          : 'Staffing load is estimated from event size and staff plan readiness.',
    }),
    factor({
      component: 'menu_development',
      estimatedMinutes: menuDevelopmentMinutes,
      confidence: menuDevelopmentMinutes === null ? 'low' : 'medium',
      source: hasMenu ? 'menu_plan' : 'inquiry',
      explanation:
        menuDevelopmentMinutes === null
          ? 'Menu development load needs menu direction.'
          : 'Menu development load is estimated from menu complexity.',
    }),
    factor({
      component: 'loadout',
      estimatedMinutes: loadoutMinutes,
      confidence: loadoutMinutes === null ? 'low' : 'medium',
      source: hasLocation ? 'event_plan' : 'inquiry',
      explanation:
        loadoutMinutes === null
          ? 'Loadout load needs guest-count and location details.'
          : 'Loadout load is estimated from event size and venue knowledge.',
    }),
  ]

  const unknownFactors = factors
    .filter((item) => item.estimatedMinutes === null)
    .map((item) => item.component)
  const totalKnownMinutes = factors.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0)

  return {
    tenantId: input.tenantId,
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    targetDate: input.targetDate ?? null,
    factors,
    totalKnownMinutes,
    unknownFactors,
    confidence: confidenceFor(unknownFactors.length),
  }
}

export function deriveCapacityState(params: {
  profile: CapacityProfileContract
  workload: WorkloadEstimateContract
  privateConstraints?: PrivateCapacityConstraintContract[]
  existingDayMinutes?: number
  existingWeekMinutes?: number
}): CapacityState {
  const constraints = params.privateConstraints ?? []
  if (constraints.some((constraint) => constraint.severity === 'blocker')) return 'unsafe'
  if (
    constraints.some(
      (constraint) =>
        constraint.kind === 'recovery_need' ||
        constraint.kind === 'rest_day' ||
        constraint.kind === 'medical_appointment'
    )
  ) {
    return 'recovery_required'
  }

  const known = params.workload.totalKnownMinutes
  const dayMinutes = (params.existingDayMinutes ?? 0) + known
  const weekMinutes = (params.existingWeekMinutes ?? 0) + known
  const prepLimit = params.profile.maxPrepMinutesPerDay
  const travelLimit = params.profile.maxTravelMinutesPerDay
  const weekLimit = params.profile.maxWorkMinutesPerWeek

  if (weekLimit !== null && weekMinutes > weekLimit * 1.15) return 'unsafe'
  if (weekLimit !== null && weekMinutes > weekLimit) return 'overloaded'
  if (prepLimit !== null) {
    const prep = params.workload.factors.find((item) => item.component === 'prep')?.estimatedMinutes
    if (prep !== null && prep !== undefined && prep > prepLimit * 1.2) return 'unsafe'
    if (prep !== null && prep !== undefined && prep > prepLimit) return 'overloaded'
  }
  if (travelLimit !== null) {
    const travel = params.workload.factors.find(
      (item) => item.component === 'travel'
    )?.estimatedMinutes
    if (travel !== null && travel !== undefined && travel > travelLimit) return 'overloaded'
  }
  if (dayMinutes >= 720) return 'unsafe'
  if (dayMinutes >= 600) return 'overloaded'
  if (dayMinutes >= 420) return 'tight'
  if (params.workload.unknownFactors.length >= 4) return known > 0 ? 'tight' : 'unknown'
  if (params.workload.unknownFactors.length > 0) return known >= 300 ? 'tight' : 'unknown'
  if (constraints.some((constraint) => constraint.severity === 'warning')) return 'tight'
  return 'available'
}

export function buildCapacityChefOnlyReasons(params: {
  state: CapacityState
  workload: WorkloadEstimateContract
  privateConstraints: PrivateCapacityConstraintContract[]
}): string[] {
  const reasons: string[] = []
  if (params.workload.unknownFactors.length > 0) {
    reasons.push(`Unknown workload factors: ${params.workload.unknownFactors.join(', ')}`)
  }
  if (params.workload.totalKnownMinutes >= 420) {
    reasons.push(`Known workload is ${params.workload.totalKnownMinutes} minutes before unknowns.`)
  }
  for (const constraint of params.privateConstraints) {
    reasons.push(`${constraint.label} (${constraint.severity})`)
  }
  if (params.state === 'available' && reasons.length === 0) {
    reasons.push('Known workload fits current capacity profile.')
  }
  return reasons
}

export function buildClientSafeCapacityAlternatives(
  state: CapacityState,
  targetDate: string | null
): ClientSafeCapacityAlternative[] {
  if (state === 'available') {
    return [
      {
        kind: 'scope',
        message: 'This plan looks workable as currently described.',
        targetDate,
        visibility: 'client_safe_summary',
      },
    ]
  }
  if (state === 'tight') {
    return [
      {
        kind: 'scope',
        message: 'A lighter scope or more focused menu would make this easier to confirm.',
        targetDate,
        visibility: 'client_safe_summary',
      },
      {
        kind: 'staffing',
        message: 'Additional support may make this timing realistic.',
        targetDate,
        visibility: 'client_safe_summary',
      },
    ]
  }
  if (state === 'overloaded') {
    return [
      {
        kind: 'date',
        message: 'A nearby alternate date would be more realistic.',
        targetDate: null,
        visibility: 'client_safe_summary',
      },
      {
        kind: 'scope',
        message: 'A narrower scope could make the request feasible.',
        targetDate,
        visibility: 'client_safe_summary',
      },
    ]
  }
  if (state === 'unsafe' || state === 'recovery_required') {
    return [
      {
        kind: 'date',
        message: 'The earliest realistic date is later than requested.',
        targetDate: null,
        visibility: 'client_safe_summary',
      },
      {
        kind: 'decline',
        message: 'This request should not be confirmed as currently timed.',
        targetDate,
        visibility: 'client_safe_summary',
      },
    ]
  }
  return [
    {
      kind: 'date',
      message: 'More schedule and event details are needed before confirming.',
      targetDate,
      visibility: 'client_safe_summary',
    },
  ]
}

export function deriveCapacityDecision(input: CapacityDecisionInput): CapacityDecisionContract {
  const workload =
    input.workload ??
    estimateCapacityWorkload({
      tenantId: input.tenantId,
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
      targetDate: input.targetDate ?? null,
      ...input.workloadInput,
    })
  const privateConstraints = input.privateConstraints ?? []
  const baseState = deriveCapacityState({
    profile: input.profile,
    workload,
    privateConstraints,
    existingDayMinutes: input.existingDayMinutes,
    existingWeekMinutes: input.existingWeekMinutes,
  })
  const state = input.override ? 'tight' : baseState
  const severity: CapacitySeverity =
    state === 'unsafe' || state === 'overloaded'
      ? 'blocker'
      : state === 'tight' || state === 'recovery_required' || state === 'unknown'
        ? 'warning'
        : 'info'

  return {
    tenantId: input.tenantId,
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    state,
    severity,
    chefOnlyReasons: buildCapacityChefOnlyReasons({ state, workload, privateConstraints }),
    workload,
    privateConstraints,
    override: input.override ?? null,
    clientSafeAlternatives: buildClientSafeCapacityAlternatives(state, workload.targetDate),
  }
}

export function buildClientSafeCapacityGate(
  decision: CapacityDecisionContract
): ClientSafeCapacitySummary {
  return buildClientSafeCapacitySummary(decision)
}
