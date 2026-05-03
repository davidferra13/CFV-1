export const SERVICE_SIMULATION_ENGINE_VERSION = 'v3' as const

export type ServiceSimulationPhaseKey =
  | 'core_facts'
  | 'menu_guest_truth'
  | 'grocery_sourcing'
  | 'prep'
  | 'equipment_packing'
  | 'travel_arrival'
  | 'service'
  | 'close_out'

export type ServiceSimulationPhaseStatus = 'ready' | 'attention' | 'waiting' | 'complete'

export type ServiceSimulationIssue = {
  id: string
  label: string
  detail: string
  route: string
  ctaLabel: string
}

export type ServiceSimulationSeverityBand = 'must_fix' | 'should_verify' | 'optional_improvement'

export type ServiceSimulationActionItem = ServiceSimulationIssue & {
  key: string
  phaseKey: ServiceSimulationPhaseKey
  phaseLabel: string
  phaseStatus: ServiceSimulationPhaseStatus
  source: 'proof'
  severity: ServiceSimulationSeverityBand
}

export type ServiceSimulationRollup = {
  readinessScore: number
  readinessLabel: string
  criticalBlockerCount: number
  warningCount: number
  optionalImprovementCount: number
  topConcern: ServiceSimulationActionItem | null
}

export type ServiceSimulationNextAction = {
  label: string
  detail: string
  route: string
  ctaLabel: string
}

export type ServiceSimulationPhase = {
  key: ServiceSimulationPhaseKey
  label: string
  status: ServiceSimulationPhaseStatus
  summary: string
  missingItems: ServiceSimulationIssue[]
  riskFlags: ServiceSimulationIssue[]
  nextAction: ServiceSimulationNextAction | null
}

export type ServiceSimulationProofId =
  | 'front_of_house_menu'
  | 'prep_timeline'
  | 'packing_list'
  | 'dietary_constraints'
  | 'allergen_safety'
  | 'arrival_logistics'
  | 'service_plan_flow'

export type ServiceSimulationProofStatus = 'verified' | 'stale' | 'unverified'
export type ServiceSimulationProofSeverity = 'critical' | 'warning' | 'advisory'

export type ServiceSimulationVerifyAction = {
  route: string
  uiTarget: string
  ctaLabel: string
}

export type ServiceSimulationProof = {
  id: ServiceSimulationProofId
  label: string
  status: ServiceSimulationProofStatus
  lastVerifiedAt: string | null
  staleReason: string | null
  blocking: boolean
  severity: ServiceSimulationProofSeverity
  sourceOfTruth: string
  verifyAction: ServiceSimulationVerifyAction
}

export type ServiceSimulationReadiness = {
  overallScore: number
  counts: {
    blockers: number
    risks: number
    stale: number
  }
  mostLikelyFailurePoint: ServiceSimulationProof | null
  proofs: ServiceSimulationProof[]
}

export type ServiceSimulationResult = {
  engineVersion: typeof SERVICE_SIMULATION_ENGINE_VERSION
  summary: string
  phases: ServiceSimulationPhase[]
  proofs: ServiceSimulationProof[]
  readiness: ServiceSimulationReadiness
  actionItems: ServiceSimulationActionItem[]
  severityBands: {
    mustFix: ServiceSimulationActionItem[]
    shouldVerify: ServiceSimulationActionItem[]
    optionalImprovement: ServiceSimulationActionItem[]
  }
  rollup: ServiceSimulationRollup
  counts: {
    attention: number
    waiting: number
    ready: number
    complete: number
  }
}

export type ServiceSimulationContext = {
  referenceDate: string
  event: {
    id: string
    occasion: string | null
    status: string
    updatedAt: string | null
    eventDate: string | null
    eventTime: string | null
    serveTime: string | null
    arrivalTime: string | null
    guestCount: number | null
    locationAddress: string | null
    locationCity: string | null
    locationState: string | null
    locationZip: string | null
    accessInstructions: string | null
    dietaryRestrictions: string[]
    allergies: string[]
    serviceStyle: string | null
    specialRequests: string | null
    groceryListReady: boolean
    prepListReady: boolean
    packingListReady: boolean
    equipmentListReady: boolean
    timelineReady: boolean
    executionSheetReady: boolean
    nonNegotiablesChecked: boolean
    carPacked: boolean
    carPackedAt: string | null
    shoppingCompletedAt: string | null
    prepCompletedAt: string | null
    serviceStartedAt: string | null
    serviceCompletedAt: string | null
    resetComplete: boolean
    resetCompletedAt: string | null
    followUpSent: boolean
    financiallyClosed: boolean
    menuApprovalStatus: string | null
    menuApprovedAt: string | null
  }
  menu: {
    attached: boolean
    menuIds: string[]
    menuNames: string[]
    menuStatuses: string[]
    dishCount: number
    componentCount: number
    makeAheadComponentCount: number
    updatedAtFingerprint: string | null
    finalizedAt: string | null
  }
  documents: {
    groceryListReady: boolean
    groceryListMissing: string[]
    frontOfHouseMenuReady: boolean
    frontOfHouseMenuGeneratedAt: string | null
    prepSheetReady: boolean
    prepSheetMissing: string[]
    prepSheetGeneratedAt: string | null
    executionSheetReady: boolean
    executionSheetMissing: string[]
    executionSheetGeneratedAt: string | null
    packingListReady: boolean
    packingListMissing: string[]
    packingListGeneratedAt: string | null
    travelRouteReady: boolean
    travelRouteMissing: string[]
    travelRouteGeneratedAt: string | null
  }
  guests: {
    totalCount: number
    attendingCount: number
    accountedGuestCount: number
    unresolvedGuestCount: number
    latestUpdatedAt: string | null
  }
  prep: {
    blockCount: number
    completedBlockCount: number
    timelineDayCount: number
    timelineItemCount: number
    untimedItemCount: number
    latestUpdatedAt: string | null
  }
  packing: {
    confirmationCount: number
    lastConfirmedAt: string | null
  }
  travel: {
    totalLegCount: number
    serviceLegCount: number
    plannedLegCount: number
    inProgressLegCount: number
    completedLegCount: number
    latestUpdatedAt: string | null
  }
  dop: {
    completed: number
    total: number
  } | null
  allergenConflicts: {
    checked: boolean
    hasConflicts: boolean
    conflicts: Array<{ allergen: string; severity: string; menuItem?: string }>
    checkedAt: string | null
  }
  closeOut: {
    aarFiled: boolean
    resetComplete: boolean
    followUpSent: boolean
    financiallyClosed: boolean
    allComplete: boolean
  } | null
}

export type ServiceSimulationContextSnapshot = {
  eventStatus: string
  eventUpdatedAt: string
  guestCount: number | null
  eventDate: string | null
  eventTime: string | null
  serveTime: string | null
  arrivalTime: string | null
  locationAddress: string
  locationCity: string
  locationState: string
  locationZip: string
  accessInstructions: string
  dietaryRestrictions: string[]
  allergies: string[]
  menuAttached: boolean
  menuIds: string[]
  menuStatuses: string[]
  menuDishCount: number
  menuComponentCount: number
  menuMakeAheadComponentCount: number
  menuUpdatedAtFingerprint: string
  menuFinalizedAt: string
  menuApprovalStatus: string
  groceryListReady: boolean
  frontOfHouseMenuReady: boolean
  prepSheetReady: boolean
  executionSheetReady: boolean
  packingListReady: boolean
  travelRouteReady: boolean
  guestRecordCount: number
  attendingGuestCount: number
  accountedGuestCount: number
  prepBlockCount: number
  completedPrepBlockCount: number
  prepTimelineItemCount: number
  untimedPrepItemCount: number
  prepLatestUpdatedAt: string
  packingConfirmationCount: number
  packingLastConfirmedAt: string
  carPacked: boolean
  serviceLegCount: number
  plannedTravelLegCount: number
  travelLatestUpdatedAt: string
  serviceStarted: boolean
  serviceCompleted: boolean
  dopCompleted: number
  dopTotal: number
  resetComplete: boolean
  followUpSent: boolean
  financiallyClosed: boolean
}

export type ServiceSimulationStaleReasonCode =
  | 'status'
  | 'guest_count'
  | 'schedule'
  | 'location'
  | 'dietary'
  | 'menu'
  | 'grocery'
  | 'documents'
  | 'prep'
  | 'packing'
  | 'travel'
  | 'dop'
  | 'service'
  | 'close_out'
  | 'engine'

export type ServiceSimulationStaleReason = {
  code: ServiceSimulationStaleReasonCode
  label: string
  detail: string
}

export type ServiceSimulationPanelState = {
  status: 'unsimulated' | 'current' | 'stale'
  simulation: ServiceSimulationResult
  latestRun: {
    id: string
    createdAt: string
    engineVersion: string
  } | null
  staleReasons: ServiceSimulationStaleReason[]
}

export type ServiceSimulationTransitionTarget = 'confirmed' | 'in_progress' | 'completed'

export type ServiceSimulationTransitionGate = {
  target: ServiceSimulationTransitionTarget
  status: 'clear' | 'soft' | 'hard'
  title: string
  summary: string
  reasons: Array<{
    code: 'unsimulated' | 'stale' | 'critical' | 'warning'
    label: string
    detail: string
  }>
}
