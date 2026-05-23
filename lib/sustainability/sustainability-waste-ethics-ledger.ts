import {
  buildPublicSustainabilityClaimOutput,
  canUseLeftoverPath,
  type ClaimEvidenceContract,
  type LeftoverDisposalPath,
  type LeftoverPlanContract,
  type LeftoverPlanItemContract,
  type LeftoverSafetyState,
  type SourcingClaimContract,
  type SourcingClaimKind,
  type SustainabilityPreferenceContract,
  type SustainabilitySourceRef,
  type SustainabilityWasteEthicsLedgerContract,
  type WasteEventContract,
  type WastePreventabilityState,
  type WasteReductionRecommendationContract,
} from './sustainability-waste-ethics-ledger-contract'

export type EventWasteLogSourceRow = {
  id: string
  event_id: string | null
  item_name: string
  category: string
  quantity_description: string | null
  estimated_cost_cents: number | null
  reason: string
  notes: string | null
  logged_at: string | null
}

export type EventLeftoverSourceRow = {
  id: string
  event_id: string
  item_description: string
  quantity: string | null
  packaging_type: string | null
  labeled: boolean | null
  label_text: string | null
  given_to: string | null
  storage_instructions: string | null
  created_at: string | null
}

export type SourcingEntrySourceRow = {
  id: string
  event_id: string | null
  entry_date: string | null
  ingredient_name: string
  source_type: string
  source_name: string | null
  distance_miles: number | null
  cost_cents: number | null
  weight_lbs: number | string | null
  is_organic: boolean | null
  is_local: boolean | null
  notes: string | null
  created_at: string | null
}

export type EventPlanningSourceRow = {
  id: string
  client_id: string | null
  event_date: string | null
  occasion: string | null
  status: string | null
  guest_count: number | null
  allergies: string[] | null
  dietary_restrictions: string[] | null
}

export type ClientSustainabilityPreferenceSourceRow = {
  id: string
  full_name: string
  leftovers_preference: string | null
  cleanup_expectations: string | null
}

export type SustainabilityLedgerSourceSnapshot = {
  tenantId: string
  chefId: string
  wasteLogs: EventWasteLogSourceRow[]
  leftovers: EventLeftoverSourceRow[]
  sourcingEntries: SourcingEntrySourceRow[]
  events: EventPlanningSourceRow[]
  clients: ClientSustainabilityPreferenceSourceRow[]
}

export type SustainabilityLedgerDecisionPrompt = {
  id: string
  title: string
  body: string
  href: string
  severity: 'info' | 'warning' | 'blocked'
}

export type SustainabilityWasteEthicsLedgerReadModel = {
  ledger: SustainabilityWasteEthicsLedgerContract
  publicClaims: ReturnType<typeof buildPublicSustainabilityClaimOutput>
  metrics: {
    wasteEventCount: number
    leftoverPlanCount: number
    clientPreferenceCount: number
    sourcingClaimCount: number
    publicClaimCount: number
    redactedClaimCount: number
    unsafeLeftoverPlanCount: number
    estimatedWasteCostCents: number
  }
  decisionPrompts: SustainabilityLedgerDecisionPrompt[]
}

const WASTE_CATEGORY_FALLBACK = 'other' as const

function sourceRef(
  source: SustainabilitySourceRef['source'],
  table: SustainabilitySourceRef['table'],
  rowId: string | null
): SustainabilitySourceRef {
  return { source, table, rowId }
}

function normalizeWasteCategory(category: string): WasteEventContract['category'] {
  if (
    category === 'protein' ||
    category === 'produce' ||
    category === 'dairy' ||
    category === 'grain' ||
    category === 'prepared_dish' ||
    category === 'packaging' ||
    category === 'other'
  ) {
    return category
  }
  return WASTE_CATEGORY_FALLBACK
}

function normalizeWasteCause(cause: string): WasteEventContract['cause'] {
  if (
    cause === 'overproduction' ||
    cause === 'spoilage' ||
    cause === 'guest_no_show' ||
    cause === 'dietary_change' ||
    cause === 'quality_issue' ||
    cause === 'trim' ||
    cause === 'expired' ||
    cause === 'packaging' ||
    cause === 'other'
  ) {
    return cause
  }
  return 'other'
}

function preventabilityForCause(cause: WasteEventContract['cause']): WastePreventabilityState {
  if (cause === 'overproduction' || cause === 'guest_no_show' || cause === 'spoilage') {
    return 'partially_avoidable'
  }
  if (cause === 'trim') return 'unavoidable'
  return 'unknown'
}

function disposalPathForGivenTo(givenTo: string | null): LeftoverDisposalPath {
  const normalized = givenTo?.trim().toLowerCase() ?? ''
  if (!normalized) return 'unknown'
  if (normalized.includes('client') || normalized.includes('host')) return 'client_keeps'
  if (normalized.includes('staff')) return 'staff_meal'
  if (normalized.includes('donat')) return 'donation'
  if (normalized.includes('compost')) return 'compost'
  if (normalized.includes('discard') || normalized.includes('trash')) return 'discard'
  return 'unknown'
}

function safetyStateForLeftover(row: EventLeftoverSourceRow): LeftoverSafetyState {
  const hasLabel = row.labeled || Boolean(row.label_text?.trim())
  const hasStorage = Boolean(row.storage_instructions?.trim())
  const path = disposalPathForGivenTo(row.given_to)

  if (path === 'discard' || path === 'compost') return 'safe'
  if (!hasLabel || !hasStorage) return 'time_temperature_unknown'
  return 'safe'
}

function claimKindForSourcingEntry(row: SourcingEntrySourceRow): SourcingClaimKind | null {
  if (row.is_local || row.source_type === 'local_farm' || row.source_type === 'farmers_market') {
    return 'local'
  }
  if (row.is_organic || row.source_type === 'organic') return 'organic'
  if (row.source_type === 'foraged') return 'foraged'
  if (row.source_type === 'garden') return 'seasonal'
  return null
}

function mapWasteEvent(
  row: EventWasteLogSourceRow,
  tenantId: string,
  chefId: string
): WasteEventContract {
  const cause = normalizeWasteCause(row.reason)
  return {
    id: row.id,
    tenantId,
    chefId,
    eventId: row.event_id,
    ingredientId: null,
    dishId: null,
    itemName: row.item_name,
    category: normalizeWasteCategory(row.category),
    cause,
    amount: row.quantity_description,
    estimatedCostCents: row.estimated_cost_cents,
    preventability: preventabilityForCause(cause),
    disposalPath: cause === 'spoilage' ? 'compost' : 'unknown',
    safetyState: cause === 'spoilage' ? 'needs_review' : 'unknown',
    notes: row.notes,
    occurredAt: row.logged_at,
    visibility: 'private_only',
    sourceRefs: [sourceRef('event_waste_log', 'event_waste_logs', row.id)],
  }
}

function mapLeftoverPlan(
  row: EventLeftoverSourceRow,
  tenantId: string,
  chefId: string
): LeftoverPlanContract {
  const disposalPath = disposalPathForGivenTo(row.given_to)
  const safetyState = safetyStateForLeftover(row)
  const item: LeftoverPlanItemContract = {
    id: row.id,
    itemName: row.item_description,
    quantity: row.quantity,
    packagingType: row.packaging_type as LeftoverPlanItemContract['packagingType'],
    labelText: row.label_text,
    storageInstructions: row.storage_instructions,
    disposalPath,
    safetyState,
  }

  return {
    id: row.id,
    tenantId,
    chefId,
    eventId: row.event_id,
    clientId: null,
    items: [item],
    clientPreferenceRef: null,
    defaultDisposalPath: disposalPath,
    safetyState,
    clientSafeSummary:
      safetyState === 'safe' && canUseLeftoverPath({ disposalPath, safetyState })
        ? `${row.item_description} planned for ${disposalPath.replace(/_/g, ' ')}.`
        : null,
    privateNotes: row.given_to ? `Disposition noted as: ${row.given_to}` : null,
    visibility: safetyState === 'safe' ? 'client_safe' : 'chef_internal',
    sourceRefs: [sourceRef('event_leftover', 'event_leftovers', row.id)],
  }
}

function mapClientPreference(
  row: ClientSustainabilityPreferenceSourceRow,
  tenantId: string,
  chefId: string
): SustainabilityPreferenceContract | null {
  const values: SustainabilityPreferenceContract['values'] = []
  const text = `${row.leftovers_preference ?? ''} ${row.cleanup_expectations ?? ''}`.toLowerCase()

  if (!text.trim()) return null
  if (text.includes('leftover')) values.push('reduce_food_waste')
  if (text.includes('compost')) values.push('compost_when_safe')
  if (text.includes('donat')) values.push('donate_when_legal_and_safe')
  if (text.includes('reusable') || text.includes('glass')) values.push('prefer_reusable_containers')
  if (text.includes('package') || text.includes('container'))
    values.push('avoid_single_use_packaging')
  if (values.length === 0) values.push('reduce_food_waste')

  return {
    id: row.id,
    tenantId,
    chefId,
    subjectKind: 'client',
    subjectId: row.id,
    values,
    priority: 'medium',
    safetyOverrideAllowed: false,
    notes: row.leftovers_preference ?? row.cleanup_expectations,
    visibility: 'chef_internal',
    sourceRefs: [sourceRef('client_preference', 'clients', row.id)],
  }
}

function mapSourcingEntryToClaim(
  row: SourcingEntrySourceRow,
  tenantId: string,
  chefId: string
): SourcingClaimContract | null {
  const kind = claimKindForSourcingEntry(row)
  if (!kind) return null
  const evidenceRefs = [sourceRef('sourcing_entry', 'sourcing_entries', row.id)]

  return {
    id: row.id,
    tenantId,
    chefId,
    kind,
    subjectKind: row.event_id ? 'event' : 'ingredient',
    subjectId: row.event_id ?? row.ingredient_name,
    claimText: `${row.ingredient_name} has ${kind.replace(/_/g, ' ')} sourcing evidence.`,
    state: row.source_name?.trim() ? 'ready_for_review' : 'needs_evidence',
    evidenceRefs,
    approvedByUserId: null,
    approvedAt: null,
    expiresAt: null,
    visibility: 'public_candidate',
  }
}

function mapSourcingEntryToEvidence(
  row: SourcingEntrySourceRow,
  tenantId: string,
  chefId: string
): ClaimEvidenceContract | null {
  if (!claimKindForSourcingEntry(row)) return null
  return {
    id: row.id,
    tenantId,
    chefId,
    kind: row.source_name ? 'vendor_record' : 'manual_attestation',
    label: row.source_name ?? `${row.ingredient_name} sourcing entry`,
    evidenceAt: row.entry_date,
    expiresAt: null,
    sourceRef: sourceRef('sourcing_entry', 'sourcing_entries', row.id),
    confidence: row.source_name ? 'medium' : 'low',
    visibility: 'public_candidate',
  }
}

function buildRecommendations(input: {
  tenantId: string
  chefId: string
  wasteEvents: WasteEventContract[]
  leftoverPlans: LeftoverPlanContract[]
  sourcingClaims: SourcingClaimContract[]
}): WasteReductionRecommendationContract[] {
  const recommendations: WasteReductionRecommendationContract[] = []
  const overproduction = input.wasteEvents.filter((event) => event.cause === 'overproduction')
  const spoilage = input.wasteEvents.filter((event) => event.cause === 'spoilage')
  const unsafeLeftovers = input.leftoverPlans.filter(
    (plan) =>
      !canUseLeftoverPath({ disposalPath: plan.defaultDisposalPath, safetyState: plan.safetyState })
  )
  const evidenceGaps = input.sourcingClaims.filter((claim) => claim.state === 'needs_evidence')

  if (overproduction.length > 0) {
    recommendations.push({
      id: 'overproduction-portion-review',
      tenantId: input.tenantId,
      chefId: input.chefId,
      kind: 'portion_adjustment',
      state: 'candidate',
      title: 'Review portions on repeated overproduction',
      rationale: `${overproduction.length} waste event(s) point to overproduction. Compare guest count, menu yield, and batch size before repeating those dishes.`,
      expectedImpact:
        'Lower food spend and fewer post-service discards without reducing service quality.',
      safetyState: 'safe',
      blockedReason: null,
      sourceRefs: overproduction.flatMap((event) => event.sourceRefs),
      visibility: 'chef_internal',
    })
  }

  if (spoilage.length > 0) {
    recommendations.push({
      id: 'spoilage-procurement-review',
      tenantId: input.tenantId,
      chefId: input.chefId,
      kind: 'procurement_adjustment',
      state: 'candidate',
      title: 'Tighten purchasing timing for spoilage',
      rationale: `${spoilage.length} waste event(s) were logged as spoilage. Review delivery dates, storage, and vendor timing.`,
      expectedImpact: 'Less expired inventory and clearer vendor or storage follow-up.',
      safetyState: 'needs_review',
      blockedReason: null,
      sourceRefs: spoilage.flatMap((event) => event.sourceRefs),
      visibility: 'chef_internal',
    })
  }

  if (unsafeLeftovers.length > 0) {
    recommendations.push({
      id: 'leftover-safety-block',
      tenantId: input.tenantId,
      chefId: input.chefId,
      kind: 'leftover_plan_change',
      state: 'blocked_for_safety',
      title: 'Block unsafe leftover handoff paths',
      rationale: `${unsafeLeftovers.length} leftover plan(s) are missing labeling, storage, allergen, or time-temperature proof.`,
      expectedImpact: 'Prevents unsafe donation, staff meal, or client takeaway recommendations.',
      safetyState: 'safety_blocked',
      blockedReason: 'Unknown leftover safety cannot be converted into edible recovery.',
      sourceRefs: unsafeLeftovers.flatMap((plan) => plan.sourceRefs),
      visibility: 'chef_internal',
    })
  }

  if (evidenceGaps.length > 0) {
    recommendations.push({
      id: 'public-claim-evidence-gap',
      tenantId: input.tenantId,
      chefId: input.chefId,
      kind: 'claim_evidence_gap',
      state: 'candidate',
      title: 'Attach evidence before public sustainability claims',
      rationale: `${evidenceGaps.length} sustainability claim candidate(s) need vendor, invoice, certification, photo, receipt, or ingredient-origin proof before approval.`,
      expectedImpact:
        'Keeps unsupported local, organic, foraged, or low-waste claims off public pages.',
      safetyState: 'safe',
      blockedReason: null,
      sourceRefs: evidenceGaps.flatMap((claim) => claim.evidenceRefs),
      visibility: 'chef_internal',
    })
  }

  return recommendations
}

function buildDecisionPrompts(input: {
  wasteEvents: WasteEventContract[]
  leftoverPlans: LeftoverPlanContract[]
  recommendations: WasteReductionRecommendationContract[]
  sourcingClaims: SourcingClaimContract[]
}): SustainabilityLedgerDecisionPrompt[] {
  const prompts: SustainabilityLedgerDecisionPrompt[] = []
  const safetyBlock = input.recommendations.find((item) => item.state === 'blocked_for_safety')
  const evidenceGap = input.recommendations.find((item) => item.kind === 'claim_evidence_gap')
  const overproduction = input.recommendations.find((item) => item.kind === 'portion_adjustment')

  if (safetyBlock) {
    prompts.push({
      id: 'leftover-safety-block',
      title: 'Leftover path needs safety proof',
      body: safetyBlock.rationale,
      href: '/events',
      severity: 'blocked',
    })
  }

  if (evidenceGap) {
    prompts.push({
      id: 'public-claim-review',
      title: 'Public sustainability claims are held for evidence',
      body: evidenceGap.rationale,
      href: '/culinary/sourcing',
      severity: 'warning',
    })
  }

  if (overproduction) {
    prompts.push({
      id: 'portion-review',
      title: 'Use waste signals before the next similar menu',
      body: overproduction.rationale,
      href: '/menus',
      severity: 'info',
    })
  }

  if (prompts.length === 0) {
    prompts.push({
      id: 'empty-ledger-start',
      title: 'Start with event closeout',
      body: 'Capture one waste event, leftover plan, or sourcing entry after service to unlock evidence-aware recommendations.',
      href: '/events',
      severity: 'info',
    })
  }

  return prompts
}

export function buildSustainabilityWasteEthicsLedgerReadModel(
  snapshot: SustainabilityLedgerSourceSnapshot
): SustainabilityWasteEthicsLedgerReadModel {
  const wasteEvents = snapshot.wasteLogs.map((row) =>
    mapWasteEvent(row, snapshot.tenantId, snapshot.chefId)
  )
  const leftoverPlans = snapshot.leftovers.map((row) =>
    mapLeftoverPlan(row, snapshot.tenantId, snapshot.chefId)
  )
  const preferences = snapshot.clients
    .map((row) => mapClientPreference(row, snapshot.tenantId, snapshot.chefId))
    .filter((row): row is SustainabilityPreferenceContract => Boolean(row))
  const sourcingClaims = snapshot.sourcingEntries
    .map((row) => mapSourcingEntryToClaim(row, snapshot.tenantId, snapshot.chefId))
    .filter((row): row is SourcingClaimContract => Boolean(row))
  const claimEvidence = snapshot.sourcingEntries
    .map((row) => mapSourcingEntryToEvidence(row, snapshot.tenantId, snapshot.chefId))
    .filter((row): row is ClaimEvidenceContract => Boolean(row))
  const recommendations = buildRecommendations({
    tenantId: snapshot.tenantId,
    chefId: snapshot.chefId,
    wasteEvents,
    leftoverPlans,
    sourcingClaims,
  })

  const ledger: SustainabilityWasteEthicsLedgerContract = {
    tenantId: snapshot.tenantId,
    chefId: snapshot.chefId,
    wasteEvents,
    leftoverPlans,
    preferences,
    sourcingClaims,
    claimEvidence,
    recommendations,
    visibility: 'private_only',
  }
  const publicClaims = buildPublicSustainabilityClaimOutput({
    tenantId: snapshot.tenantId,
    chefId: snapshot.chefId,
    claims: sourcingClaims,
  })
  const unsafeLeftoverPlanCount = leftoverPlans.filter(
    (plan) =>
      !canUseLeftoverPath({ disposalPath: plan.defaultDisposalPath, safetyState: plan.safetyState })
  ).length

  return {
    ledger,
    publicClaims,
    metrics: {
      wasteEventCount: wasteEvents.length,
      leftoverPlanCount: leftoverPlans.length,
      clientPreferenceCount: preferences.length,
      sourcingClaimCount: sourcingClaims.length,
      publicClaimCount: publicClaims.approvedClaims.length,
      redactedClaimCount: publicClaims.redactedClaimCount,
      unsafeLeftoverPlanCount,
      estimatedWasteCostCents: wasteEvents.reduce(
        (sum, event) => sum + (event.estimatedCostCents ?? 0),
        0
      ),
    },
    decisionPrompts: buildDecisionPrompts({
      wasteEvents,
      leftoverPlans,
      recommendations,
      sourcingClaims,
    }),
  }
}
