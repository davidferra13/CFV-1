export const VENDOR_PERFORMANCE_EVENT_KINDS = [
  'on_time_delivery',
  'late_delivery',
  'missed_delivery',
  'missing_item',
  'bad_substitution',
  'approved_substitution',
  'quality_issue',
  'overcharge',
  'refund',
  'exceptional_quality',
  'communication_issue',
  'allergen_handling_issue',
  'packaging_temperature_issue',
  'minimum_order_issue',
  'lead_time_miss',
  'recovery_action',
] as const

export type VendorPerformanceEventKind = (typeof VENDOR_PERFORMANCE_EVENT_KINDS)[number]

export const VENDOR_PERFORMANCE_EVENT_STATES = [
  'draft',
  'observed',
  'vendor_acknowledged',
  'chef_confirmed',
  'disputed',
  'resolved',
  'archived',
  'unknown',
] as const

export type VendorPerformanceEventState = (typeof VENDOR_PERFORMANCE_EVENT_STATES)[number]

export const VENDOR_TRUST_VISIBILITY_LEVELS = [
  'private_chef_only',
  'chef_internal',
  'vendor_safe_followup',
  'event_safe_warning',
  'pie_reliability_signal',
  'client_public_never',
] as const

export type VendorTrustVisibility = (typeof VENDOR_TRUST_VISIBILITY_LEVELS)[number]

export const VENDOR_TRUST_BUCKETS = [
  'preferred',
  'reliable',
  'watch',
  'risky',
  'blocked',
  'unknown',
] as const

export type VendorTrustBucket = (typeof VENDOR_TRUST_BUCKETS)[number]

export const VENDOR_SOURCING_RISK_STATES = [
  'clear',
  'watch',
  'review_required',
  'blocked',
  'unknown',
] as const

export type VendorSourcingRiskState = (typeof VENDOR_SOURCING_RISK_STATES)[number]

export const VENDOR_RISK_FLAGS = [
  'unknown_reliability',
  'price_volatile',
  'unreliable_delivery',
  'quality_drift',
  'substitution_risk',
  'allergen_handling_unknown',
  'luxury_proof_weak',
  'communication_risk',
  'minimum_order_risk',
  'lead_time_risk',
  'unresolved_incident',
] as const

export type VendorRiskFlag = (typeof VENDOR_RISK_FLAGS)[number]

export type VendorTrustSignal = 'positive' | 'neutral' | 'negative' | 'unknown'
export type VendorTrustSeverity = 'low' | 'medium' | 'high' | 'critical'
export type VendorTrustConfidence = 'low' | 'medium' | 'high' | 'unknown'

export type VendorClientImportance =
  | 'routine'
  | 'high_touch'
  | 'luxury'
  | 'allergy_sensitive'
  | 'time_critical'

export type PieVendorReliabilityFinalState =
  | 'allowed'
  | 'allowed_with_warning'
  | 'review_required'
  | 'blocked'

export type VendorTrustSourceRef = {
  source:
    | 'vendor'
    | 'vendor_scorecard'
    | 'vendor_event_assignment'
    | 'event_vendor_delivery'
    | 'vendor_order'
    | 'vendor_order_item'
    | 'vendor_price_point'
    | 'vendor_price_entry'
    | 'vendor_item'
    | 'vendor_catalog_import'
    | 'vendor_document_intake'
    | 'expense'
    | 'receipt'
    | 'vendor_invoice'
    | 'purchase_order'
    | 'supplier_call'
    | 'sourcing_session'
    | 'vendor_call_metric'
    | 'chef_supplier_preference'
    | 'communication_thread'
    | 'incident'
    | 'pie_pricing'
    | 'remy_summary'
    | 'cil_signal'
    | 'manual_chef_input'
    | 'derived'
  table:
    | 'vendors'
    | 'vendor_event_assignments'
    | 'event_vendor_deliveries'
    | 'vendor_orders'
    | 'vendor_order_items'
    | 'vendor_price_points'
    | 'vendor_price_entries'
    | 'vendor_items'
    | 'expenses'
    | 'receipts'
    | 'vendor_invoices'
    | 'purchase_orders'
    | 'supplier_calls'
    | 'sourcing_sessions'
    | 'vendor_call_metrics'
    | 'chef_supplier_preferences'
    | 'communication_threads'
    | 'incidents'
    | 'derived'
  rowId: string | null
}

export type VendorProfileTrustSnapshot = {
  id: string | null
  tenantId: string
  chefId: string
  vendorId: string
  vendorName: string
  vendorType: string
  status: 'active' | 'inactive' | 'blocked' | 'archived' | 'unknown'
  isPreferred: boolean
  deliveryZones: string[]
  productCategories: string[]
  contactMethods: string[]
  leadTimeHours: number | null
  minimumOrderCents: number | null
  privateRelationshipNotes: string | null
  sourceRefs: VendorTrustSourceRef[]
  visibility: 'private_chef_only' | 'chef_internal'
}

export type VendorPerformanceEventContract = {
  id: string | null
  tenantId: string
  chefId: string
  vendorId: string
  eventId: string | null
  vendorOrderId: string | null
  deliveryId: string | null
  kind: VendorPerformanceEventKind
  signal: VendorTrustSignal
  state: VendorPerformanceEventState
  severity: VendorTrustSeverity
  occurredAt: string | null
  productCategory: string | null
  productName: string | null
  routeLabel: string | null
  eventType: string | null
  season: string | null
  summary: string
  requestedResolution: string | null
  riskFlags: VendorRiskFlag[]
  privateNotes: string | null
  sourceRefs: VendorTrustSourceRef[]
  visibility: VendorTrustVisibility
}

export type VendorTrustScoreContract = {
  id: string | null
  tenantId: string
  chefId: string
  vendorId: string
  productCategory: string | null
  productName: string | null
  routeLabel: string | null
  eventType: string | null
  season: string | null
  clientImportance: VendorClientImportance | null
  reliabilityScore: number | null
  trustBucket: VendorTrustBucket
  confidence: VendorTrustConfidence
  evidenceCount: number
  negativeEventCount: number
  unresolvedIncidentCount: number
  unknowns: string[]
  riskFlags: VendorRiskFlag[]
  lastEvidenceAt: string | null
  sourceRefs: VendorTrustSourceRef[]
  visibility: 'chef_internal' | 'pie_reliability_signal'
}

export type SourcingRiskContext = {
  tenantId: string
  chefId: string
  vendorId: string
  eventId: string | null
  productCategory: string | null
  productName: string | null
  routeLabel: string | null
  eventType: string | null
  season: string | null
  clientImportance: VendorClientImportance
  neededAt: string | null
}

export type VendorProcurementWarning = {
  tenantId: string
  chefId: string
  vendorId: string
  eventId: string | null
  label: string
  riskFlags: VendorRiskFlag[]
  severity: VendorTrustSeverity
  sourceRefs: VendorTrustSourceRef[]
  visibility: 'event_safe_warning' | 'chef_internal'
}

export type VendorIncidentCapturePrompt = {
  tenantId: string
  chefId: string
  vendorId: string
  eventId: string | null
  suggestedKind: VendorPerformanceEventKind
  prompt: string
  sourceRefs: VendorTrustSourceRef[]
  visibility: 'chef_internal'
}

export type VendorSourcingRiskAssessment = {
  tenantId: string
  chefId: string
  vendorId: string
  eventId: string | null
  riskState: VendorSourcingRiskState
  trustBucket: VendorTrustBucket
  unknowns: string[]
  warnings: string[]
  blockingReasons: string[]
  riskFlags: VendorRiskFlag[]
  procurementWarnings: VendorProcurementWarning[]
  incidentCapturePrompts: VendorIncidentCapturePrompt[]
  sourceRefs: VendorTrustSourceRef[]
  visibility: 'chef_internal'
}

export type PieVendorReliabilitySignal = {
  tenantId: string
  chefId: string
  vendorId: string
  eventId: string | null
  reliabilityBucket: VendorTrustBucket
  finalState: PieVendorReliabilityFinalState
  visibleLabel: string
  unknownCount: number
  warningLabels: string[]
  blockingReasons: string[]
  riskFlags: VendorRiskFlag[]
  visibility: 'pie_reliability_signal'
}

export type VendorSafeFollowupEvent = Omit<
  VendorPerformanceEventContract,
  'privateNotes' | 'visibility' | 'sourceRefs'
> & {
  sourceRefs: VendorTrustSourceRef[]
  visibility: 'vendor_safe_followup'
}

export type VendorSafeFollowupExport = {
  tenantId: string
  chefId: string
  vendorId: string
  events: VendorSafeFollowupEvent[]
  redactedEventCount: number
  visibility: 'vendor_safe_followup'
}

export type VendorTrustLedgerContract = {
  tenantId: string
  chefId: string
  profiles: VendorProfileTrustSnapshot[]
  performanceEvents: VendorPerformanceEventContract[]
  trustScores: VendorTrustScoreContract[]
  sourcingRiskAssessments: VendorSourcingRiskAssessment[]
  pieReliabilitySignals: PieVendorReliabilitySignal[]
  visibility: 'chef_internal'
}

const TRUST_BUCKET_RANK: Record<VendorTrustBucket, number> = {
  preferred: 0,
  reliable: 1,
  watch: 2,
  risky: 3,
  blocked: 4,
  unknown: 5,
}

const NON_RESOLVED_STATES = new Set<VendorPerformanceEventState>([
  'draft',
  'observed',
  'vendor_acknowledged',
  'chef_confirmed',
  'disputed',
  'unknown',
])

const NEGATIVE_EVENT_KINDS = new Set<VendorPerformanceEventKind>([
  'late_delivery',
  'missed_delivery',
  'missing_item',
  'bad_substitution',
  'quality_issue',
  'overcharge',
  'communication_issue',
  'allergen_handling_issue',
  'packaging_temperature_issue',
  'minimum_order_issue',
  'lead_time_miss',
])

export function isVendorSafeTrustVisibility(
  visibility: VendorTrustVisibility
): visibility is 'vendor_safe_followup' {
  return visibility === 'vendor_safe_followup'
}

export function requiresChefOnlyVendorTrustVisibility(visibility: VendorTrustVisibility): boolean {
  return (
    visibility === 'private_chef_only' ||
    visibility === 'chef_internal' ||
    visibility === 'client_public_never'
  )
}

export function deriveMostRestrictiveVendorTrustBucket(
  buckets: readonly VendorTrustBucket[]
): VendorTrustBucket {
  if (buckets.length === 0) return 'unknown'

  return buckets.reduce((current, candidate) =>
    TRUST_BUCKET_RANK[candidate] > TRUST_BUCKET_RANK[current] ? candidate : current
  )
}

function scoreMatchesContext(
  score: VendorTrustScoreContract,
  context: SourcingRiskContext
): boolean {
  if (score.vendorId !== context.vendorId) return false
  if (
    score.productCategory &&
    context.productCategory &&
    score.productCategory !== context.productCategory
  ) {
    return false
  }
  if (score.productName && context.productName && score.productName !== context.productName) {
    return false
  }
  if (score.routeLabel && context.routeLabel && score.routeLabel !== context.routeLabel)
    return false
  if (score.eventType && context.eventType && score.eventType !== context.eventType) return false
  if (score.season && context.season && score.season !== context.season) return false
  if (
    score.clientImportance &&
    context.clientImportance &&
    score.clientImportance !== context.clientImportance
  ) {
    return false
  }
  return true
}

function riskFlagsFromEvent(event: VendorPerformanceEventContract): VendorRiskFlag[] {
  const flags = new Set<VendorRiskFlag>(event.riskFlags)

  if (event.kind === 'late_delivery' || event.kind === 'missed_delivery') {
    flags.add('unreliable_delivery')
  }
  if (event.kind === 'missing_item' || event.kind === 'bad_substitution') {
    flags.add('substitution_risk')
  }
  if (event.kind === 'quality_issue' || event.kind === 'packaging_temperature_issue') {
    flags.add('quality_drift')
  }
  if (event.kind === 'overcharge' || event.kind === 'refund') {
    flags.add('price_volatile')
  }
  if (event.kind === 'allergen_handling_issue') {
    flags.add('allergen_handling_unknown')
  }
  if (event.kind === 'communication_issue') {
    flags.add('communication_risk')
  }
  if (event.kind === 'minimum_order_issue') {
    flags.add('minimum_order_risk')
  }
  if (event.kind === 'lead_time_miss') {
    flags.add('lead_time_risk')
  }
  if (NON_RESOLVED_STATES.has(event.state) && event.signal === 'negative') {
    flags.add('unresolved_incident')
  }

  return Array.from(flags)
}

export function deriveVendorSourcingRiskAssessment(input: {
  profile: VendorProfileTrustSnapshot
  context: SourcingRiskContext
  trustScores: readonly VendorTrustScoreContract[]
  recentEvents: readonly VendorPerformanceEventContract[]
}): VendorSourcingRiskAssessment {
  const matchingScores = input.trustScores.filter((score) =>
    scoreMatchesContext(score, input.context)
  )
  const matchingEvents = input.recentEvents.filter(
    (event) => event.vendorId === input.context.vendorId
  )
  const matchingBuckets = matchingScores.map((score) => score.trustBucket)
  const unknowns = new Set<string>()
  const warnings = new Set<string>()
  const blockingReasons = new Set<string>()
  const riskFlags = new Set<VendorRiskFlag>()
  const sourceRefs: VendorTrustSourceRef[] = [...input.profile.sourceRefs]

  if (input.profile.status === 'blocked' || input.profile.status === 'archived') {
    blockingReasons.add('Vendor profile is not available for procurement.')
  }

  if (matchingScores.length === 0) {
    unknowns.add('No matching reliability evidence for this sourcing context.')
    riskFlags.add('unknown_reliability')
  }

  for (const score of matchingScores) {
    sourceRefs.push(...score.sourceRefs)
    score.unknowns.forEach((unknown) => unknowns.add(unknown))
    score.riskFlags.forEach((flag) => riskFlags.add(flag))

    if (score.trustBucket === 'blocked') {
      blockingReasons.add('Matching vendor trust score is blocked.')
    } else if (score.trustBucket === 'risky') {
      warnings.add('Matching vendor trust score is risky.')
    } else if (score.trustBucket === 'watch') {
      warnings.add('Matching vendor trust score requires watch.')
    } else if (score.trustBucket === 'unknown') {
      unknowns.add('Matching vendor trust score is unknown.')
      riskFlags.add('unknown_reliability')
    }

    if (score.unresolvedIncidentCount > 0) {
      riskFlags.add('unresolved_incident')
      warnings.add('Vendor has unresolved incident evidence.')
    }
  }

  for (const event of matchingEvents) {
    sourceRefs.push(...event.sourceRefs)
    riskFlagsFromEvent(event).forEach((flag) => riskFlags.add(flag))

    const activeNegative = event.signal === 'negative' && NON_RESOLVED_STATES.has(event.state)
    if (!activeNegative && event.signal !== 'unknown') continue

    if (event.signal === 'unknown') {
      unknowns.add(`Vendor event ${event.kind} has unknown outcome.`)
      riskFlags.add('unknown_reliability')
      continue
    }

    if (event.severity === 'high' || event.severity === 'critical') {
      blockingReasons.add(`Unresolved ${event.kind.replaceAll('_', ' ')} event requires review.`)
    } else if (NEGATIVE_EVENT_KINDS.has(event.kind)) {
      warnings.add(`Recent ${event.kind.replaceAll('_', ' ')} event may affect sourcing.`)
    }
  }

  if (input.context.clientImportance === 'allergy_sensitive') {
    const hasAllergenEvidence = matchingScores.some(
      (score) => !score.riskFlags.includes('allergen_handling_unknown') && score.evidenceCount > 0
    )
    if (!hasAllergenEvidence) {
      unknowns.add('Allergen handling reliability is not proven for this vendor.')
      riskFlags.add('allergen_handling_unknown')
    }
  }

  if (input.context.clientImportance === 'luxury') {
    const hasLuxuryEvidence = matchingScores.some(
      (score) => score.clientImportance === 'luxury' && score.evidenceCount > 0
    )
    if (!hasLuxuryEvidence) {
      warnings.add('Luxury-event vendor proof is weak or missing.')
      riskFlags.add('luxury_proof_weak')
    }
  }

  const trustBucket = deriveMostRestrictiveVendorTrustBucket(matchingBuckets)
  const riskState = deriveVendorSourcingRiskState({
    trustBucket,
    unknownCount: unknowns.size,
    warningCount: warnings.size,
    blockingCount: blockingReasons.size,
  })
  const warningList = Array.from(warnings)
  const riskFlagList = Array.from(riskFlags)

  return {
    tenantId: input.context.tenantId,
    chefId: input.context.chefId,
    vendorId: input.context.vendorId,
    eventId: input.context.eventId,
    riskState,
    trustBucket,
    unknowns: Array.from(unknowns),
    warnings: warningList,
    blockingReasons: Array.from(blockingReasons),
    riskFlags: riskFlagList,
    procurementWarnings: warningList.map((label) => ({
      tenantId: input.context.tenantId,
      chefId: input.context.chefId,
      vendorId: input.context.vendorId,
      eventId: input.context.eventId,
      label,
      riskFlags: riskFlagList,
      severity: riskFlagList.includes('unresolved_incident') ? 'high' : 'medium',
      sourceRefs,
      visibility: 'event_safe_warning',
    })),
    incidentCapturePrompts: riskFlagList.includes('unresolved_incident')
      ? []
      : buildIncidentCapturePrompts(input.context, riskFlagList, sourceRefs),
    sourceRefs,
    visibility: 'chef_internal',
  }
}

function deriveVendorSourcingRiskState(input: {
  trustBucket: VendorTrustBucket
  unknownCount: number
  warningCount: number
  blockingCount: number
}): VendorSourcingRiskState {
  if (input.blockingCount > 0 || input.trustBucket === 'blocked') return 'blocked'
  if (input.trustBucket === 'unknown') return 'unknown'
  if (input.unknownCount > 0) return 'review_required'
  if (input.warningCount > 0 || input.trustBucket === 'watch' || input.trustBucket === 'risky') {
    return 'watch'
  }
  return 'clear'
}

function buildIncidentCapturePrompts(
  context: SourcingRiskContext,
  riskFlags: readonly VendorRiskFlag[],
  sourceRefs: readonly VendorTrustSourceRef[]
): VendorIncidentCapturePrompt[] {
  const prompts: VendorIncidentCapturePrompt[] = []

  if (riskFlags.includes('unreliable_delivery')) {
    prompts.push({
      tenantId: context.tenantId,
      chefId: context.chefId,
      vendorId: context.vendorId,
      eventId: context.eventId,
      suggestedKind: 'late_delivery',
      prompt: 'Capture delivery timing, promised arrival, actual arrival, and event impact.',
      sourceRefs: [...sourceRefs],
      visibility: 'chef_internal',
    })
  }

  if (riskFlags.includes('substitution_risk')) {
    prompts.push({
      tenantId: context.tenantId,
      chefId: context.chefId,
      vendorId: context.vendorId,
      eventId: context.eventId,
      suggestedKind: 'bad_substitution',
      prompt: 'Capture ordered item, substituted item, approval state, and menu impact.',
      sourceRefs: [...sourceRefs],
      visibility: 'chef_internal',
    })
  }

  if (riskFlags.includes('quality_drift')) {
    prompts.push({
      tenantId: context.tenantId,
      chefId: context.chefId,
      vendorId: context.vendorId,
      eventId: context.eventId,
      suggestedKind: 'quality_issue',
      prompt: 'Capture quality issue, affected product, replacement path, and recovery outcome.',
      sourceRefs: [...sourceRefs],
      visibility: 'chef_internal',
    })
  }

  return prompts
}

export function buildPieVendorReliabilitySignal(
  assessment: VendorSourcingRiskAssessment
): PieVendorReliabilitySignal {
  const finalState: PieVendorReliabilityFinalState =
    assessment.riskState === 'blocked'
      ? 'blocked'
      : assessment.riskState === 'review_required' || assessment.riskState === 'unknown'
        ? 'review_required'
        : assessment.riskState === 'watch'
          ? 'allowed_with_warning'
          : 'allowed'

  return {
    tenantId: assessment.tenantId,
    chefId: assessment.chefId,
    vendorId: assessment.vendorId,
    eventId: assessment.eventId,
    reliabilityBucket: assessment.trustBucket,
    finalState,
    visibleLabel: buildPieReliabilityLabel(assessment),
    unknownCount: assessment.unknowns.length,
    warningLabels: assessment.warnings,
    blockingReasons: assessment.blockingReasons,
    riskFlags: assessment.riskFlags,
    visibility: 'pie_reliability_signal',
  }
}

function buildPieReliabilityLabel(assessment: VendorSourcingRiskAssessment): string {
  if (assessment.riskState === 'blocked') return 'Vendor reliability blocked pending review'
  if (assessment.riskState === 'unknown') return 'Vendor reliability unknown'
  if (assessment.riskState === 'review_required') return 'Vendor reliability needs review'
  if (assessment.riskState === 'watch') return 'Vendor reliability warning'
  return 'Vendor reliability clear'
}

export function buildVendorSafeFollowupExport(input: {
  tenantId: string
  chefId: string
  vendorId: string
  events: readonly VendorPerformanceEventContract[]
}): VendorSafeFollowupExport {
  const events = input.events
    .filter(
      (event) => event.vendorId === input.vendorId && event.visibility === 'vendor_safe_followup'
    )
    .map(({ privateNotes: _privateNotes, visibility: _visibility, sourceRefs, ...event }) => ({
      ...event,
      sourceRefs: sourceRefs.filter((sourceRef) => sourceRef.source !== 'remy_summary'),
      visibility: 'vendor_safe_followup' as const,
    }))

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    vendorId: input.vendorId,
    events,
    redactedEventCount: input.events.length - events.length,
    visibility: 'vendor_safe_followup',
  }
}
