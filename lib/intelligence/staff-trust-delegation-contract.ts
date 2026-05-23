export const COLLABORATOR_KINDS = [
  'staff_member',
  'event_collaborator',
  'vendor',
  'delegate',
  'household_staff',
  'planner',
  'assistant',
  'contractor',
] as const

export type CollaboratorKind = (typeof COLLABORATOR_KINDS)[number]

export const DELEGATION_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'assignment_scoped',
  'staff_safe_briefing',
  'vendor_safe_briefing',
  'client_safe_status',
  'pay_private',
  'emergency_private',
  'public_none',
] as const

export type DelegationVisibilityLevel = (typeof DELEGATION_VISIBILITY_LEVELS)[number]

export const ASSIGNMENT_SCOPES = [
  'event_overview',
  'schedule',
  'arrival_logistics',
  'venue_access',
  'prep_tasks',
  'station_tasks',
  'service_tasks',
  'loadout_tasks',
  'vendor_coordination',
  'communication_thread',
  'guest_list',
  'dietary_summary',
  'client_household_memory',
  'pricing_financials',
  'contract_payment',
  'private_chef_notes',
  'performance_feedback',
] as const

export type AssignmentScope = (typeof ASSIGNMENT_SCOPES)[number]

export const SENSITIVE_ASSIGNMENT_SCOPES: readonly AssignmentScope[] = [
  'client_household_memory',
  'pricing_financials',
  'contract_payment',
  'private_chef_notes',
  'performance_feedback',
]

export const COLLABORATOR_STATUSES = [
  'candidate',
  'invited',
  'active',
  'paused',
  'restricted',
  'archived',
] as const

export type CollaboratorStatus = (typeof COLLABORATOR_STATUSES)[number]

export const DELEGATION_ASSIGNMENT_STATUSES = [
  'draft',
  'planned',
  'offered',
  'accepted',
  'declined',
  'checked_in',
  'completed',
  'cancelled',
  'blocked',
] as const

export type DelegationAssignmentStatus = (typeof DELEGATION_ASSIGNMENT_STATUSES)[number]

export const DELEGATION_CHECK_IN_STATES = [
  'not_checked_in',
  'confirmed',
  'late',
  'no_show',
  'released',
] as const

export type DelegationCheckInState = (typeof DELEGATION_CHECK_IN_STATES)[number]

export const TRUST_MEMORY_DIMENSIONS = [
  'reliability',
  'skill',
  'communication',
  'confidentiality',
  'client_fit',
  'safety',
  'punctuality',
  'recovery',
] as const

export type TrustMemoryDimension = (typeof TRUST_MEMORY_DIMENSIONS)[number]

export const TRUST_MEMORY_SIGNALS = ['positive', 'neutral', 'negative', 'unknown'] as const

export type TrustMemorySignal = (typeof TRUST_MEMORY_SIGNALS)[number]

export const TRUST_MEMORY_STATES = ['observed', 'review_needed', 'resolved', 'expired'] as const

export type TrustMemoryState = (typeof TRUST_MEMORY_STATES)[number]

export const TRAINING_CHECKLIST_STATUSES = [
  'pending',
  'in_progress',
  'complete',
  'expired',
  'waived',
  'not_applicable',
] as const

export type TrainingChecklistStatus = (typeof TRAINING_CHECKLIST_STATUSES)[number]

export const DELEGATION_ACCESS_STATES = [
  'trusted',
  'needs_training',
  'at_risk',
  'blocked',
  'unknown',
] as const

export type DelegationAccessState = (typeof DELEGATION_ACCESS_STATES)[number]

export const DELEGATION_ACCESS_STATE_RANK: Record<DelegationAccessState, number> = {
  trusted: 0,
  needs_training: 1,
  at_risk: 2,
  blocked: 3,
  unknown: 4,
}

export type DelegationConfidence = 'low' | 'medium' | 'high'

export type DelegationSourceRef = {
  source:
    | 'staff_member'
    | 'event_staff_assignment'
    | 'staff_task'
    | 'shift_assignment'
    | 'staff_onboarding'
    | 'staff_performance_score'
    | 'event_collaborator'
    | 'vendor'
    | 'vendor_event_assignment'
    | 'chef_delegate'
    | 'event'
    | 'event_day_checklist'
    | 'post_event_learning'
    | 'communication'
    | 'client_household_memory'
    | 'loadout_plan'
    | 'crisis_recovery'
    | 'compliance'
    | 'calendar'
    | 'remy_summary'
    | 'manual_chef_input'
    | 'derived'
  table:
    | 'staff_members'
    | 'event_staff_assignments'
    | 'staff_tasks'
    | 'shift_assignments'
    | 'staff_onboarding_items'
    | 'staff_performance_scores'
    | 'event_collaborators'
    | 'vendors'
    | 'vendor_event_assignments'
    | 'chef_delegates'
    | 'events'
    | 'event_day_of_checklist'
    | 'post_event_learning_entries'
    | 'communications'
    | 'client_passports'
    | 'derived'
  rowId: string | null
}

export type CollaboratorProfileContract = {
  id: string | null
  tenantId: string
  chefId: string
  collaboratorKind: CollaboratorKind
  collaboratorId: string | null
  displayName: string
  roleLabels: string[]
  skills: string[]
  certifications: string[]
  restrictions: string[]
  trustTagIds: string[]
  contactVisibility: DelegationVisibilityLevel
  payVisibility: DelegationVisibilityLevel
  emergencyContactVisibility: DelegationVisibilityLevel
  status: CollaboratorStatus
  sourceRefs: DelegationSourceRef[]
  visibility: DelegationVisibilityLevel
}

export type DelegationAssignmentContract = {
  id: string | null
  tenantId: string
  chefId: string
  eventId: string
  collaboratorKind: CollaboratorKind
  collaboratorId: string | null
  assignmentRole: string
  status: DelegationAssignmentStatus
  checkInState: DelegationCheckInState
  requestedScopes: AssignmentScope[]
  approvedScopes: AssignmentScope[]
  taskIds: string[]
  stationIds: string[]
  trainingChecklistIds: string[]
  trustMemoryIds: string[]
  overrideReason: string | null
  privateNotes: string | null
  sourceRefs: DelegationSourceRef[]
  visibility: DelegationVisibilityLevel
}

export type TrustMemoryContract = {
  id: string | null
  tenantId: string
  chefId: string
  collaboratorKind: CollaboratorKind
  collaboratorId: string | null
  dimension: TrustMemoryDimension
  signal: TrustMemorySignal
  state: TrustMemoryState
  confidence: DelegationConfidence
  rating: number | null
  summary: string
  incidentSeverity: 'low' | 'medium' | 'high' | 'critical' | null
  clientFitTags: string[]
  eventId: string | null
  sourceRefs: DelegationSourceRef[]
  visibility: DelegationVisibilityLevel
}

export type TrainingChecklistItemContract = {
  id: string | null
  tenantId: string
  chefId: string
  collaboratorKind: CollaboratorKind
  collaboratorId: string | null
  key: string
  label: string
  status: TrainingChecklistStatus
  requiredForScopes: AssignmentScope[]
  completedAt: string | null
  expiresAt: string | null
  evidenceRef: string | null
  sourceRefs: DelegationSourceRef[]
  visibility: DelegationVisibilityLevel
}

export type EventStaffingPlannerNeedContract = {
  tenantId: string
  chefId: string
  eventId: string
  role: string
  requiredSkills: string[]
  requiredCertifications: string[]
  scopesNeeded: AssignmentScope[]
  quantity: number
  sourceRefs: DelegationSourceRef[]
  visibility: 'chef_internal'
}

export type PostEventPerformanceCaptureContract = {
  id: string | null
  tenantId: string
  chefId: string
  eventId: string
  collaboratorKind: CollaboratorKind
  collaboratorId: string | null
  assignmentId: string | null
  observedStrengths: string[]
  observedRisks: string[]
  trustMemoryIdsCreated: string[]
  followUpTrainingItemIds: string[]
  privateNotes: string | null
  sourceRefs: DelegationSourceRef[]
  visibility: 'chef_internal'
}

export type AssignmentScopedBriefing = Omit<
  DelegationAssignmentContract,
  'privateNotes' | 'visibility'
> & {
  visibility: 'staff_safe_briefing'
}

export type AssignmentScopedBriefingExport = {
  tenantId: string
  eventId: string
  assignments: AssignmentScopedBriefing[]
  blockedPrivateAssignmentCount: number
  visibility: 'staff_safe_briefing'
}

export type StaffTrustDelegationSystemContract = {
  tenantId: string
  chefId: string
  profiles: CollaboratorProfileContract[]
  assignments: DelegationAssignmentContract[]
  trustMemories: TrustMemoryContract[]
  trainingChecklistItems: TrainingChecklistItemContract[]
  staffingNeeds: EventStaffingPlannerNeedContract[]
  postEventPerformanceCaptures: PostEventPerformanceCaptureContract[]
  visibility: 'chef_internal'
}

export function isAssignmentScopedDelegationVisibility(
  visibility: DelegationVisibilityLevel
): visibility is 'assignment_scoped' | 'staff_safe_briefing' | 'vendor_safe_briefing' {
  return (
    visibility === 'assignment_scoped' ||
    visibility === 'staff_safe_briefing' ||
    visibility === 'vendor_safe_briefing'
  )
}

export function requiresChefOnlyDelegationVisibility(
  visibility: DelegationVisibilityLevel
): boolean {
  return (
    visibility === 'private_only' ||
    visibility === 'chef_internal' ||
    visibility === 'pay_private' ||
    visibility === 'emergency_private'
  )
}

export function deriveMostRestrictiveDelegationAccessState(
  states: readonly DelegationAccessState[]
): DelegationAccessState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    DELEGATION_ACCESS_STATE_RANK[candidate] > DELEGATION_ACCESS_STATE_RANK[current]
      ? candidate
      : current
  )
}

export function getDisallowedAssignmentScopes(input: {
  collaboratorKind: CollaboratorKind
  requestedScopes: readonly AssignmentScope[]
  overrideReason: string | null
}): AssignmentScope[] {
  if (input.overrideReason?.trim()) return []

  const sensitiveScopes = new Set<AssignmentScope>(SENSITIVE_ASSIGNMENT_SCOPES)
  const routinelyTrustedKinds = new Set<CollaboratorKind>(['delegate'])

  if (routinelyTrustedKinds.has(input.collaboratorKind)) {
    return input.requestedScopes.filter(
      (scope) => scope === 'private_chef_notes' || scope === 'performance_feedback'
    )
  }

  return input.requestedScopes.filter((scope) => sensitiveScopes.has(scope))
}

export function deriveAssignmentTrustState(input: {
  profile: CollaboratorProfileContract
  assignment: DelegationAssignmentContract
  trustMemories: readonly TrustMemoryContract[]
  trainingItems: readonly TrainingChecklistItemContract[]
}): DelegationAccessState {
  const states: DelegationAccessState[] = []

  if (input.profile.status === 'archived' || input.profile.status === 'restricted') {
    states.push('blocked')
  }

  if (input.assignment.status === 'blocked' || input.assignment.checkInState === 'no_show') {
    states.push('blocked')
  }

  if (input.profile.restrictions.length > 0) {
    states.push('at_risk')
  }

  const disallowedScopes = getDisallowedAssignmentScopes({
    collaboratorKind: input.assignment.collaboratorKind,
    requestedScopes: input.assignment.approvedScopes,
    overrideReason: input.assignment.overrideReason,
  })
  if (disallowedScopes.length > 0) {
    states.push('blocked')
  }

  const requiredTraining = input.trainingItems.filter((item) =>
    item.requiredForScopes.some((scope) => input.assignment.approvedScopes.includes(scope))
  )

  if (
    requiredTraining.some(
      (item) =>
        item.status === 'pending' || item.status === 'in_progress' || item.status === 'expired'
    )
  ) {
    states.push('needs_training')
  }

  for (const memory of input.trustMemories) {
    if (memory.state === 'expired' || memory.state === 'resolved') continue

    if (memory.signal === 'negative') {
      if (
        memory.incidentSeverity === 'high' ||
        memory.incidentSeverity === 'critical' ||
        (memory.rating !== null && memory.rating <= 1)
      ) {
        states.push('blocked')
      } else {
        states.push('at_risk')
      }
    } else if (memory.signal === 'unknown') {
      states.push('unknown')
    }
  }

  if (states.length === 0) states.push('trusted')
  return deriveMostRestrictiveDelegationAccessState(states)
}

export function buildAssignmentScopedBriefingExport(input: {
  tenantId: string
  eventId: string
  assignments: readonly DelegationAssignmentContract[]
}): AssignmentScopedBriefingExport {
  const assignments = input.assignments
    .filter((assignment) => assignment.visibility === 'assignment_scoped')
    .map(({ privateNotes: _privateNotes, visibility: _visibility, ...assignment }) => ({
      ...assignment,
      visibility: 'staff_safe_briefing' as const,
    }))

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    assignments,
    blockedPrivateAssignmentCount: input.assignments.length - assignments.length,
    visibility: 'staff_safe_briefing',
  }
}
