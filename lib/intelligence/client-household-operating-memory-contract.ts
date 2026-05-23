export const HOUSEHOLD_MEMORY_FACT_KINDS = [
  'address',
  'access_instruction',
  'parking_instruction',
  'service_route',
  'pet',
  'household_staff',
  'authority',
  'kitchen_quirk',
  'equipment',
  'family_schedule',
  'privacy_rule',
  'house_rule',
  'incident',
  'client_correction',
  'event_reuse_note',
] as const

export type HouseholdMemoryFactKind = (typeof HOUSEHOLD_MEMORY_FACT_KINDS)[number]

export const HOUSEHOLD_MEMORY_FACT_STATES = [
  'draft',
  'observed',
  'confirmed',
  'client_corrected',
  'disputed',
  'stale',
  'archived',
  'unknown',
] as const

export type HouseholdMemoryFactState = (typeof HOUSEHOLD_MEMORY_FACT_STATES)[number]

export const HOUSEHOLD_MEMORY_VISIBILITY_LEVELS = [
  'private_chef_only',
  'chef_internal',
  'staff_safe',
  'vendor_safe',
  'client_safe_correction',
  'public_never',
] as const

export type HouseholdMemoryVisibility = (typeof HOUSEHOLD_MEMORY_VISIBILITY_LEVELS)[number]

export const HOUSEHOLD_AUTHORITY_ROLES = [
  'primary_client',
  'partner',
  'assistant',
  'house_manager',
  'nanny',
  'household_staff',
  'event_host',
  'payer',
  'day_of_contact',
  'property_contact',
  'restricted_contact',
] as const

export type HouseholdAuthorityRole = (typeof HOUSEHOLD_AUTHORITY_ROLES)[number]

export const HOUSEHOLD_AUTHORITY_SCOPES = [
  'booking',
  'menu',
  'dietary',
  'budget',
  'payment',
  'access',
  'schedule',
  'staff_direction',
  'privacy',
  'emergency',
  'post_event_correction',
] as const

export type HouseholdAuthorityScope = (typeof HOUSEHOLD_AUTHORITY_SCOPES)[number]

export type HouseholdMemoryConfidence = 'low' | 'medium' | 'high'

export type HouseholdMemorySourceRef = {
  source:
    | 'manual_chef_input'
    | 'client_profile'
    | 'client_passport'
    | 'client_note'
    | 'event_plan'
    | 'event_venue_details'
    | 'hub_household_member'
    | 'staff_briefing'
    | 'communication_thread'
    | 'cil_signal'
    | 'remy_private_summary'
    | 'incident'
    | 'derived'
  table:
    | 'clients'
    | 'client_passports'
    | 'client_notes'
    | 'client_kitchen_inventory'
    | 'events'
    | 'event_venue_details'
    | 'event_guests'
    | 'hub_household_members'
    | 'hub_guest_profiles'
    | 'staff_members'
    | 'event_staff_assignments'
    | 'communication_threads'
    | 'cil_signals'
    | 'derived'
  rowId: string | null
}

export type HouseholdOperationalFact = {
  id: string | null
  tenantId: string
  householdId: string
  clientId: string | null
  kind: HouseholdMemoryFactKind
  label: string
  value: string
  state: HouseholdMemoryFactState
  visibility: HouseholdMemoryVisibility
  confidence: HouseholdMemoryConfidence
  lastVerifiedAt: string | null
  staleAfter: string | null
  sourceRefs: HouseholdMemorySourceRef[]
}

export type HouseholdProfileContract = {
  tenantId: string
  householdId: string
  primaryClientId: string | null
  displayName: string
  addressSummary: string | null
  facts: HouseholdOperationalFact[]
  authorityMap: HouseholdAuthorityRecord[]
  privacyRules: HouseholdPrivacyRule[]
  openUnknowns: HouseholdUnknown[]
  visibility: 'private_chef_only'
}

export type HouseholdAuthorityRecord = {
  tenantId: string
  householdId: string
  personId: string | null
  displayName: string
  role: HouseholdAuthorityRole
  scopes: HouseholdAuthorityScope[]
  canApprove: boolean
  canCorrectClientSafeFacts: boolean
  notes: string | null
  state: 'active' | 'limited' | 'revoked' | 'unknown'
  visibility: 'private_chef_only' | 'chef_internal'
  sourceRefs: HouseholdMemorySourceRef[]
}

export type HouseholdPrivacyRule = {
  tenantId: string
  householdId: string
  label: string
  rule: string
  appliesTo: HouseholdMemoryVisibility[]
  severity: 'info' | 'warning' | 'blocker'
  sourceRefs: HouseholdMemorySourceRef[]
}

export type HouseholdUnknown = {
  tenantId: string
  householdId: string
  kind: HouseholdMemoryFactKind
  label: string
  blocksService: boolean
  requestedFromRole: HouseholdAuthorityRole | null
}

export type StaffSafeHouseholdBriefing = {
  tenantId: string
  eventId: string
  householdId: string
  facts: HouseholdOperationalFact[]
  redactedFactCount: number
  warnings: string[]
  visibility: 'staff_safe' | 'vendor_safe'
}

export type ClientSafeHouseholdCorrection = {
  tenantId: string
  householdId: string
  factId: string
  label: string
  currentClientSafeValue: string
  correctionPrompt: string
  visibility: 'client_safe_correction'
}

export type EventHouseholdReuseDecision = {
  tenantId: string
  householdId: string
  eventId: string
  reusedFactIds: string[]
  unknowns: HouseholdUnknown[]
  staleFactIds: string[]
  blockedPrivateFactCount: number
}

const PRIVATE_HOUSEHOLD_TERMS = [
  'gate code',
  'lockbox',
  'wifi password',
  'security code',
  'alarm code',
  'family conflict',
  'family dynamics',
  'confidential',
  'private note',
  'red flag',
  'staff issue',
  'staff reliability',
] as const

const FACT_STATE_RANK: Record<HouseholdMemoryFactState, number> = {
  confirmed: 0,
  client_corrected: 1,
  observed: 2,
  draft: 3,
  disputed: 4,
  stale: 5,
  archived: 6,
  unknown: 7,
}

export function deriveMostRestrictiveHouseholdFactState(
  states: readonly HouseholdMemoryFactState[]
): HouseholdMemoryFactState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    FACT_STATE_RANK[candidate] > FACT_STATE_RANK[current] ? candidate : current
  )
}

export function isStaffSafeHouseholdVisibility(
  visibility: HouseholdMemoryVisibility
): visibility is 'staff_safe' {
  return visibility === 'staff_safe'
}

export function isVendorSafeHouseholdVisibility(
  visibility: HouseholdMemoryVisibility
): visibility is 'vendor_safe' {
  return visibility === 'vendor_safe'
}

export function isClientCorrectableHouseholdVisibility(
  visibility: HouseholdMemoryVisibility
): visibility is 'client_safe_correction' {
  return visibility === 'client_safe_correction'
}

export function containsPrivateHouseholdLeak(value: string): boolean {
  const normalized = value.toLowerCase()
  return PRIVATE_HOUSEHOLD_TERMS.some((term) => normalized.includes(term))
}

export function buildStaffSafeHouseholdBriefing(input: {
  tenantId: string
  eventId: string
  householdId: string
  facts: HouseholdOperationalFact[]
  audience?: 'staff' | 'vendor'
}): StaffSafeHouseholdBriefing {
  const visibility = input.audience === 'vendor' ? 'vendor_safe' : 'staff_safe'
  const facts = input.facts.filter((fact) =>
    visibility === 'vendor_safe'
      ? isVendorSafeHouseholdVisibility(fact.visibility)
      : isStaffSafeHouseholdVisibility(fact.visibility)
  )
  const warnings = facts
    .filter(
      (fact) => fact.state === 'stale' || fact.state === 'disputed' || fact.state === 'unknown'
    )
    .map((fact) => fact.label)

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    householdId: input.householdId,
    facts,
    redactedFactCount: input.facts.length - facts.length,
    warnings,
    visibility,
  }
}

export function buildClientSafeHouseholdCorrections(input: {
  tenantId: string
  householdId: string
  facts: HouseholdOperationalFact[]
}): ClientSafeHouseholdCorrection[] {
  return input.facts
    .filter((fact) => isClientCorrectableHouseholdVisibility(fact.visibility))
    .filter((fact) => fact.state !== 'archived')
    .filter(
      (fact) =>
        !containsPrivateHouseholdLeak(fact.label) && !containsPrivateHouseholdLeak(fact.value)
    )
    .map((fact) => ({
      tenantId: input.tenantId,
      householdId: input.householdId,
      factId: fact.id ?? `${fact.kind}:${fact.label}`,
      label: fact.label,
      currentClientSafeValue: fact.value,
      correctionPrompt: `Confirm or correct ${fact.label.toLowerCase()}.`,
      visibility: 'client_safe_correction',
    }))
}

export function buildEventHouseholdReuseDecision(input: {
  tenantId: string
  householdId: string
  eventId: string
  facts: HouseholdOperationalFact[]
  unknowns?: HouseholdUnknown[]
}): EventHouseholdReuseDecision {
  const reusableStates = new Set<HouseholdMemoryFactState>(['confirmed', 'client_corrected'])
  const staleStates = new Set<HouseholdMemoryFactState>(['stale', 'disputed', 'unknown'])
  const reusedFactIds: string[] = []
  const staleFactIds: string[] = []
  let blockedPrivateFactCount = 0

  for (const fact of input.facts) {
    const factId = fact.id ?? `${fact.kind}:${fact.label}`

    if (staleStates.has(fact.state)) {
      staleFactIds.push(factId)
      continue
    }

    if (fact.state === 'archived') continue

    if (fact.visibility === 'public_never') {
      blockedPrivateFactCount++
      continue
    }

    if (reusableStates.has(fact.state)) {
      reusedFactIds.push(factId)
    }
  }

  return {
    tenantId: input.tenantId,
    householdId: input.householdId,
    eventId: input.eventId,
    reusedFactIds,
    unknowns: input.unknowns ?? [],
    staleFactIds,
    blockedPrivateFactCount,
  }
}

export function buildHouseholdUnknowns(input: {
  tenantId: string
  householdId: string
  facts: HouseholdOperationalFact[]
  requiredKinds: HouseholdMemoryFactKind[]
}): HouseholdUnknown[] {
  const currentKinds = new Set(
    input.facts
      .filter((fact) => fact.state !== 'archived')
      .filter((fact) => fact.value.trim().length > 0)
      .map((fact) => fact.kind)
  )

  return input.requiredKinds
    .filter((kind) => !currentKinds.has(kind))
    .map((kind) => ({
      tenantId: input.tenantId,
      householdId: input.householdId,
      kind,
      label: `Missing ${kind.replace(/_/g, ' ')}`,
      blocksService: ['access_instruction', 'parking_instruction', 'kitchen_quirk'].includes(kind),
      requestedFromRole: kind === 'authority' ? 'primary_client' : null,
    }))
}
