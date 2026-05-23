import type { ClientHouseholdSummary } from '@/lib/hub/household-actions'
import {
  buildClientSafeHouseholdCorrections,
  buildEventHouseholdReuseDecision,
  buildHouseholdUnknowns,
  buildStaffSafeHouseholdBriefing,
  type ClientSafeHouseholdCorrection,
  type EventHouseholdReuseDecision,
  type HouseholdAuthorityRecord,
  type HouseholdAuthorityScope,
  type HouseholdMemorySourceRef,
  type HouseholdOperationalFact,
  type HouseholdPrivacyRule,
  type HouseholdProfileContract,
  type StaffSafeHouseholdBriefing,
} from './client-household-operating-memory-contract'

type ClientMemorySource = {
  id: string
  full_name?: string | null
  email?: string | null
  partner_name?: string | null
  parking_instructions?: string | null
  access_instructions?: string | null
  security_notes?: string | null
  gate_code?: string | null
  wifi_password?: string | null
  house_rules?: string | null
  pets?: Array<{ name?: string; type?: string; notes?: string }> | null
  kitchen_constraints?: string | null
  kitchen_oven_notes?: string | null
  kitchen_burner_notes?: string | null
  kitchen_counter_notes?: string | null
  kitchen_refrigeration_notes?: string | null
  kitchen_plating_notes?: string | null
  kitchen_sink_notes?: string | null
  equipment_available?: string | null
  equipment_must_bring?: string | null
  family_notes?: string | null
  cleanup_expectations?: string | null
}

export type ClientHouseholdOperatingMemory = {
  profile: HouseholdProfileContract
  staffBriefingPreview: StaffSafeHouseholdBriefing
  clientSafeCorrections: ClientSafeHouseholdCorrection[]
  eventReusePreview: EventHouseholdReuseDecision
}

const HOUSEHOLD_STAFF_RELATIONSHIPS = new Set(['assistant', 'house_manager', 'nanny'])

function sourceRef(clientId: string): HouseholdMemorySourceRef {
  return {
    source: 'client_profile',
    table: 'clients',
    rowId: clientId,
  }
}

function memberSourceRef(memberId: string): HouseholdMemorySourceRef {
  return {
    source: 'hub_household_member',
    table: 'hub_household_members',
    rowId: memberId,
  }
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function addFact(
  facts: HouseholdOperationalFact[],
  input: Omit<
    HouseholdOperationalFact,
    'id' | 'state' | 'confidence' | 'lastVerifiedAt' | 'staleAfter'
  >
) {
  if (!clean(input.value)) return
  facts.push({
    ...input,
    id: `${input.householdId}:${input.kind}:${facts.length + 1}`,
    state: 'confirmed',
    confidence: 'medium',
    lastVerifiedAt: null,
    staleAfter: null,
  })
}

function buildAuthorityRecord(input: {
  tenantId: string
  householdId: string
  personId: string | null
  displayName: string
  role: HouseholdAuthorityRecord['role']
  scopes: HouseholdAuthorityScope[]
  notes: string | null
  sourceRefs: HouseholdMemorySourceRef[]
}): HouseholdAuthorityRecord {
  return {
    tenantId: input.tenantId,
    householdId: input.householdId,
    personId: input.personId,
    displayName: input.displayName,
    role: input.role,
    scopes: input.scopes,
    canApprove: input.scopes.length > 0,
    canCorrectClientSafeFacts: input.role === 'primary_client' || input.role === 'house_manager',
    notes: input.notes,
    state: 'active',
    visibility: 'chef_internal',
    sourceRefs: input.sourceRefs,
  }
}

function buildPrivacyRules(input: {
  tenantId: string
  householdId: string
}): HouseholdPrivacyRule[] {
  return [
    {
      tenantId: input.tenantId,
      householdId: input.householdId,
      label: 'Raw household memory is never public',
      rule: 'Do not expose access, family, security, incident, or private chef notes on public surfaces.',
      appliesTo: ['private_chef_only', 'chef_internal', 'public_never'],
      severity: 'blocker',
      sourceRefs: [{ source: 'derived', table: 'derived', rowId: null }],
    },
    {
      tenantId: input.tenantId,
      householdId: input.householdId,
      label: 'Staff briefings use approved operational facts',
      rule: 'Staff and vendors receive only staff-safe or vendor-safe facts needed for assigned work.',
      appliesTo: ['staff_safe', 'vendor_safe'],
      severity: 'warning',
      sourceRefs: [{ source: 'derived', table: 'derived', rowId: null }],
    },
  ]
}

export function buildClientHouseholdOperatingMemory(input: {
  tenantId: string
  client: ClientMemorySource
  household: ClientHouseholdSummary | null
  eventId?: string | null
}): ClientHouseholdOperatingMemory {
  const householdId = input.client.id
  const facts: HouseholdOperationalFact[] = []
  const clientSource = sourceRef(input.client.id)

  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'parking_instruction',
    label: 'Parking instructions',
    value: clean(input.client.parking_instructions) ?? '',
    visibility: 'staff_safe',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'access_instruction',
    label: 'Arrival and access path',
    value: clean(input.client.access_instructions) ?? '',
    visibility: 'staff_safe',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'privacy_rule',
    label: 'Security notes',
    value: clean(input.client.security_notes) ?? '',
    visibility: 'private_chef_only',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'privacy_rule',
    label: 'Gate code',
    value: clean(input.client.gate_code) ?? '',
    visibility: 'public_never',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'house_rule',
    label: 'House rules',
    value: clean(input.client.house_rules) ?? '',
    visibility: 'client_safe_correction',
    sourceRefs: [clientSource],
  })

  const kitchenValues = [
    input.client.kitchen_constraints,
    input.client.kitchen_oven_notes,
    input.client.kitchen_burner_notes,
    input.client.kitchen_counter_notes,
    input.client.kitchen_refrigeration_notes,
    input.client.kitchen_plating_notes,
    input.client.kitchen_sink_notes,
  ]
    .map(clean)
    .filter(Boolean)
    .join(' ')

  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'kitchen_quirk',
    label: 'Kitchen quirks',
    value: kitchenValues,
    visibility: 'staff_safe',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'equipment',
    label: 'Equipment on site',
    value: [input.client.equipment_available, input.client.equipment_must_bring]
      .map(clean)
      .filter(Boolean)
      .join(' Bring: '),
    visibility: 'client_safe_correction',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'family_schedule',
    label: 'Family context',
    value: clean(input.client.family_notes) ?? '',
    visibility: 'private_chef_only',
    sourceRefs: [clientSource],
  })
  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'service_route',
    label: 'Cleanup expectations',
    value: clean(input.client.cleanup_expectations) ?? '',
    visibility: 'staff_safe',
    sourceRefs: [clientSource],
  })

  for (const pet of input.client.pets ?? []) {
    const name = clean(pet.name) ?? clean(pet.type) ?? 'Pet'
    const value = [pet.type, pet.notes].map(clean).filter(Boolean).join(': ')
    addFact(facts, {
      tenantId: input.tenantId,
      householdId,
      clientId: input.client.id,
      kind: 'pet',
      label: `Pet: ${name}`,
      value,
      visibility: 'staff_safe',
      sourceRefs: [clientSource],
    })
  }

  const authorityMap = [
    buildAuthorityRecord({
      tenantId: input.tenantId,
      householdId,
      personId: input.client.id,
      displayName: clean(input.client.full_name) ?? clean(input.client.email) ?? 'Primary client',
      role: 'primary_client',
      scopes: ['booking', 'menu', 'dietary', 'budget', 'payment', 'post_event_correction'],
      notes: null,
      sourceRefs: [clientSource],
    }),
  ]

  addFact(facts, {
    tenantId: input.tenantId,
    householdId,
    clientId: input.client.id,
    kind: 'authority',
    label: 'Primary authority',
    value: `${clean(input.client.full_name) ?? clean(input.client.email) ?? 'Primary client'} can approve booking, menu, dietary, budget, payment, and post-event corrections.`,
    visibility: 'chef_internal',
    sourceRefs: [clientSource],
  })

  if (clean(input.client.partner_name)) {
    authorityMap.push(
      buildAuthorityRecord({
        tenantId: input.tenantId,
        householdId,
        personId: null,
        displayName: clean(input.client.partner_name) ?? 'Partner',
        role: 'partner',
        scopes: ['menu', 'dietary', 'schedule'],
        notes: 'Derived from client profile partner field.',
        sourceRefs: [clientSource],
      })
    )
  }

  for (const member of input.household?.members ?? []) {
    if (!HOUSEHOLD_STAFF_RELATIONSHIPS.has(member.relationship)) continue

    addFact(facts, {
      tenantId: input.tenantId,
      householdId,
      clientId: input.client.id,
      kind: 'household_staff',
      label: `${member.display_name} (${member.relationship.replace(/_/g, ' ')})`,
      value: member.notes ?? 'Household operator',
      visibility: 'chef_internal',
      sourceRefs: [memberSourceRef(member.id)],
    })

    authorityMap.push(
      buildAuthorityRecord({
        tenantId: input.tenantId,
        householdId,
        personId: member.id,
        displayName: member.display_name,
        role: member.relationship as HouseholdAuthorityRecord['role'],
        scopes:
          member.relationship === 'house_manager'
            ? ['access', 'schedule', 'staff_direction', 'emergency']
            : ['schedule', 'access'],
        notes: member.notes,
        sourceRefs: [memberSourceRef(member.id)],
      })
    )
  }

  const unknowns = buildHouseholdUnknowns({
    tenantId: input.tenantId,
    householdId,
    facts,
    requiredKinds: ['access_instruction', 'parking_instruction', 'kitchen_quirk', 'authority'],
  })

  const profile: HouseholdProfileContract = {
    tenantId: input.tenantId,
    householdId,
    primaryClientId: input.client.id,
    displayName: clean(input.client.full_name) ?? clean(input.client.email) ?? 'Client household',
    addressSummary: null,
    facts,
    authorityMap,
    privacyRules: buildPrivacyRules({ tenantId: input.tenantId, householdId }),
    openUnknowns: unknowns,
    visibility: 'private_chef_only',
  }

  return {
    profile,
    staffBriefingPreview: buildStaffSafeHouseholdBriefing({
      tenantId: input.tenantId,
      eventId: input.eventId ?? 'next-event',
      householdId,
      facts,
    }),
    clientSafeCorrections: buildClientSafeHouseholdCorrections({
      tenantId: input.tenantId,
      householdId,
      facts,
    }),
    eventReusePreview: buildEventHouseholdReuseDecision({
      tenantId: input.tenantId,
      householdId,
      eventId: input.eventId ?? 'next-event',
      facts,
      unknowns,
    }),
  }
}
