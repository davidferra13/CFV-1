export const CRISIS_INCIDENT_TYPES = [
  'food_safety',
  'allergy_or_dietary',
  'guest_injury',
  'property_damage',
  'equipment_failure',
  'vendor_failure',
  'staff_no_show',
  'weather_disruption',
  'payment_conflict',
  'privacy_incident',
  'client_conflict',
  'public_reputation',
  'spoiled_ingredient',
  'near_miss',
  'other',
] as const

export type CrisisIncidentType = (typeof CRISIS_INCIDENT_TYPES)[number]

export const CRISIS_SEVERITIES = ['low', 'medium', 'high', 'critical', 'unknown'] as const

export type CrisisSeverity = (typeof CRISIS_SEVERITIES)[number]

export const CRISIS_SEVERITY_RANK: Record<CrisisSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
  unknown: 0,
}

export const CRISIS_INCIDENT_STATES = [
  'draft',
  'triage',
  'active',
  'stabilized',
  'recovering',
  'monitoring',
  'resolved',
  'archived',
  'unknown',
] as const

export type CrisisIncidentState = (typeof CRISIS_INCIDENT_STATES)[number]

export const CRISIS_RECOVERY_ACTION_STATES = [
  'proposed',
  'approved',
  'in_progress',
  'waiting_on_external_party',
  'completed',
  'cancelled',
  'archived',
] as const

export type CrisisRecoveryActionState = (typeof CRISIS_RECOVERY_ACTION_STATES)[number]

export const CRISIS_EVIDENCE_STATES = [
  'captured',
  'needs_review',
  'verified',
  'disputed',
  'redacted',
  'archived',
] as const

export type CrisisEvidenceState = (typeof CRISIS_EVIDENCE_STATES)[number]

export const CRISIS_RECURRENCE_GUARD_STATES = [
  'proposed',
  'active',
  'triggered',
  'snoozed',
  'retired',
  'archived',
] as const

export type CrisisRecurrenceGuardState = (typeof CRISIS_RECURRENCE_GUARD_STATES)[number]

export const CRISIS_VISIBILITY_LEVELS = [
  'private_incident',
  'chef_internal',
  'privileged_review',
  'staff_safe_action',
  'vendor_safe_action',
  'client_safe_summary',
  'public_statement',
  'never_externalize',
] as const

export type CrisisVisibilityLevel = (typeof CRISIS_VISIBILITY_LEVELS)[number]

export type CrisisConfidence = 'low' | 'medium' | 'high'

export type CrisisRiskProfile = {
  safetyRisk: CrisisSeverity
  financialRisk: CrisisSeverity
  privacyRisk: CrisisSeverity
  relationshipRisk: CrisisSeverity
  publicReputationRisk: CrisisSeverity
  legalOrInsuranceReviewNeeded: boolean
  professionalReviewLanguageRequired: boolean
}

export type CrisisSourceRef = {
  source:
    | 'manual_chef_input'
    | 'chef_incident'
    | 'event'
    | 'client'
    | 'communication_thread'
    | 'message'
    | 'document'
    | 'media_asset'
    | 'vendor_record'
    | 'staff_record'
    | 'invoice'
    | 'payment'
    | 'claim'
    | 'compliance_packet'
    | 'household_memory'
    | 'remy_private_summary'
    | 'derived'
  table:
    | 'chef_incidents'
    | 'events'
    | 'clients'
    | 'communication_threads'
    | 'messages'
    | 'documents'
    | 'media_assets'
    | 'vendors'
    | 'staff_members'
    | 'invoices'
    | 'payments'
    | 'insurance_claims'
    | 'compliance_packets'
    | 'household_profiles'
    | 'derived'
  rowId: string | null
}

export type CrisisIncidentContract = {
  id: string | null
  tenantId: string
  chefId: string
  type: CrisisIncidentType
  title: string
  occurredAt: string | null
  detectedAt: string
  state: CrisisIncidentState
  severity: CrisisSeverity
  affectedEventId: string | null
  affectedClientId: string | null
  affectedVendorId: string | null
  affectedStaffMemberId: string | null
  ownerUserId: string | null
  riskProfile: CrisisRiskProfile
  privateSummary: string
  chefOnlyNotes: string | null
  evidenceItemIds: string[]
  recoveryActionIds: string[]
  communicationDraftIds: string[]
  recurrenceGuardIds: string[]
  sourceRefs: CrisisSourceRef[]
  visibility: 'private_incident'
}

export type CrisisEvidenceItemContract = {
  id: string | null
  tenantId: string
  incidentId: string
  kind:
    | 'photo'
    | 'receipt'
    | 'message'
    | 'email'
    | 'call_note'
    | 'witness_note'
    | 'temperature_log'
    | 'invoice'
    | 'payment_record'
    | 'vendor_confirmation'
    | 'staff_note'
    | 'public_review'
    | 'policy_document'
    | 'other'
  capturedAt: string
  capturedByUserId: string | null
  label: string
  description: string | null
  storageRef: string | null
  sourceRefs: CrisisSourceRef[]
  state: CrisisEvidenceState
  visibility: CrisisVisibilityLevel
}

export type CrisisRecoveryActionContract = {
  id: string | null
  tenantId: string
  incidentId: string
  kind:
    | 'stabilize_safety'
    | 'apology'
    | 'refund_or_credit'
    | 'remake_or_replacement'
    | 'vendor_claim'
    | 'insurance_note'
    | 'client_follow_up'
    | 'staff_coaching'
    | 'policy_change'
    | 'communication'
    | 'documentation'
    | 'professional_review'
  label: string
  ownerUserId: string | null
  dueAt: string | null
  completedAt: string | null
  state: CrisisRecoveryActionState
  promisedToClient: boolean
  externalPartyId: string | null
  linkedEvidenceItemIds: string[]
  visibility: CrisisVisibilityLevel
}

export type CrisisCommunicationDraftContract = {
  id: string | null
  tenantId: string
  incidentId: string
  audience: 'chef_only' | 'client' | 'vendor' | 'staff' | 'insurer' | 'public'
  channel: 'email' | 'sms' | 'phone_script' | 'portal_note' | 'public_statement'
  purpose:
    | 'acknowledgement'
    | 'apology'
    | 'status_update'
    | 'evidence_request'
    | 'resolution_offer'
    | 'follow_up'
    | 'public_response'
  body: string
  state: 'draft' | 'needs_review' | 'approved' | 'sent' | 'archived'
  approvedByUserId: string | null
  approvedAt: string | null
  blockedSensitiveFactors: string[]
  visibility: CrisisVisibilityLevel
}

export type CrisisRecurrenceGuardContract = {
  id: string | null
  tenantId: string
  incidentId: string
  kind:
    | 'allergy_cross_check'
    | 'vendor_confirmation'
    | 'equipment_backup'
    | 'staffing_backup'
    | 'weather_plan'
    | 'payment_checkpoint'
    | 'privacy_check'
    | 'client_expectation_check'
    | 'ingredient_quality_check'
    | 'documentation_required'
  triggerContext:
    | 'event_planning'
    | 'quote_review'
    | 'client_booking'
    | 'vendor_order'
    | 'staff_assignment'
    | 'day_of_service'
    | 'post_event'
  label: string
  state: CrisisRecurrenceGuardState
  severity: CrisisSeverity
  triggerBeforeHours: number | null
  sourceIncidentId: string
  visibility: 'private_incident' | 'chef_internal' | 'staff_safe_action' | 'vendor_safe_action'
}

export type CrisisTimelineEntryContract = {
  id: string | null
  tenantId: string
  incidentId: string
  occurredAt: string
  kind:
    | 'incident_detected'
    | 'triage_update'
    | 'evidence_added'
    | 'action_created'
    | 'action_completed'
    | 'communication_sent'
    | 'guard_created'
    | 'status_changed'
  label: string
  sourceRefs: CrisisSourceRef[]
  visibility: CrisisVisibilityLevel
}

export type CrisisDashboardPriorityCard = {
  tenantId: string
  incidentId: string
  title: string
  severity: CrisisSeverity
  state: CrisisIncidentState
  priorityScore: number
  nextActionLabels: string[]
  recurrenceGuardLabels: string[]
  visibility: 'chef_internal'
}

export type ClientSafeCrisisSummary = {
  tenantId: string
  incidentId: string
  headline: string
  recoveryCommitments: string[]
  blockedPrivateFactorCount: number
  visibility: 'client_safe_summary'
}

export type CrisisAndRecoveryStudioContract = {
  tenantId: string
  chefId: string
  incidents: CrisisIncidentContract[]
  evidenceItems: CrisisEvidenceItemContract[]
  recoveryActions: CrisisRecoveryActionContract[]
  communicationDrafts: CrisisCommunicationDraftContract[]
  recurrenceGuards: CrisisRecurrenceGuardContract[]
  timelineEntries: CrisisTimelineEntryContract[]
  visibility: 'private_incident'
}

export function deriveHighestCrisisSeverity(severities: readonly CrisisSeverity[]): CrisisSeverity {
  if (severities.length === 0) return 'unknown'
  return severities.reduce((current, candidate) =>
    CRISIS_SEVERITY_RANK[candidate] > CRISIS_SEVERITY_RANK[current] ? candidate : current
  )
}

export function deriveIncidentSeverityFromRiskProfile(profile: CrisisRiskProfile): CrisisSeverity {
  return deriveHighestCrisisSeverity([
    profile.safetyRisk,
    profile.financialRisk,
    profile.privacyRisk,
    profile.relationshipRisk,
    profile.publicReputationRisk,
  ])
}

export function isSensitiveCrisisVisibility(
  visibility: CrisisVisibilityLevel
): visibility is 'private_incident' | 'chef_internal' | 'privileged_review' | 'never_externalize' {
  return (
    visibility === 'private_incident' ||
    visibility === 'chef_internal' ||
    visibility === 'privileged_review' ||
    visibility === 'never_externalize'
  )
}

export function canSendCrisisCommunicationDraft(draft: CrisisCommunicationDraftContract): boolean {
  return (
    draft.state === 'approved' &&
    draft.approvedByUserId !== null &&
    draft.approvedAt !== null &&
    draft.blockedSensitiveFactors.length === 0 &&
    (draft.visibility === 'client_safe_summary' ||
      draft.visibility === 'vendor_safe_action' ||
      draft.visibility === 'staff_safe_action' ||
      draft.visibility === 'public_statement')
  )
}

export function buildClientSafeCrisisSummary(input: {
  incident: CrisisIncidentContract
  recoveryActions: CrisisRecoveryActionContract[]
}): ClientSafeCrisisSummary {
  const recoveryCommitments = input.recoveryActions
    .filter((action) => action.promisedToClient && action.visibility === 'client_safe_summary')
    .map((action) => action.label)
    .slice(0, 4)

  return {
    tenantId: input.incident.tenantId,
    incidentId: input.incident.id ?? 'pending',
    headline:
      input.incident.state === 'resolved'
        ? 'This issue has been resolved.'
        : 'This issue is being handled with follow-up tracked.',
    recoveryCommitments,
    blockedPrivateFactorCount:
      input.recoveryActions.length -
      recoveryCommitments.length +
      input.incident.evidenceItemIds.length,
    visibility: 'client_safe_summary',
  }
}

export function buildCrisisDashboardPriorityCards(input: {
  incidents: CrisisIncidentContract[]
  recoveryActions: CrisisRecoveryActionContract[]
  recurrenceGuards: CrisisRecurrenceGuardContract[]
  now: Date
}): CrisisDashboardPriorityCard[] {
  return input.incidents
    .filter((incident) => incident.state !== 'resolved' && incident.state !== 'archived')
    .map((incident) => {
      const actions = input.recoveryActions.filter((action) => action.incidentId === incident.id)
      const guards = input.recurrenceGuards.filter(
        (guard) => guard.sourceIncidentId === incident.id && guard.state === 'active'
      )
      const overdueActions = actions.filter(
        (action) =>
          action.dueAt !== null &&
          action.completedAt === null &&
          new Date(action.dueAt).getTime() < input.now.getTime()
      )

      return {
        tenantId: incident.tenantId,
        incidentId: incident.id ?? 'pending',
        title: incident.title,
        severity: incident.severity,
        state: incident.state,
        priorityScore:
          CRISIS_SEVERITY_RANK[incident.severity] * 100 +
          overdueActions.length * 25 +
          actions.filter((action) => action.state !== 'completed' && action.state !== 'archived')
            .length *
            10 +
          guards.length * 5,
        nextActionLabels: actions
          .filter((action) => action.state !== 'completed' && action.state !== 'archived')
          .map((action) => action.label)
          .slice(0, 3),
        recurrenceGuardLabels: guards.map((guard) => guard.label).slice(0, 3),
        visibility: 'chef_internal' as const,
      }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
}
