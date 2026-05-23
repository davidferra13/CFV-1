import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildClientHouseholdOperatingMemory,
  type ClientHouseholdOperatingMemory,
} from '../../lib/intelligence/client-household-operating-memory'
import {
  buildClientSafeHouseholdCorrections,
  buildEventHouseholdReuseDecision,
  buildStaffSafeHouseholdBriefing,
  containsPrivateHouseholdLeak,
  deriveMostRestrictiveHouseholdFactState,
  type HouseholdOperationalFact,
} from '../../lib/intelligence/client-household-operating-memory-contract'

const baseFact: HouseholdOperationalFact = {
  id: 'fact-1',
  tenantId: 'tenant-1',
  householdId: 'client-1',
  clientId: 'client-1',
  kind: 'access_instruction',
  label: 'Arrival path',
  value: 'Use the service elevator and call the doorman.',
  state: 'confirmed',
  visibility: 'staff_safe',
  confidence: 'high',
  lastVerifiedAt: null,
  staleAfter: null,
  sourceRefs: [{ source: 'client_profile', table: 'clients', rowId: 'client-1' }],
}

function buildMemory(): ClientHouseholdOperatingMemory {
  return buildClientHouseholdOperatingMemory({
    tenantId: 'tenant-1',
    client: {
      id: 'client-1',
      full_name: 'Avery Household',
      email: 'avery@example.com',
      partner_name: 'Jordan',
      parking_instructions: 'Use loading zone after 5 PM.',
      access_instructions: 'Service elevator opens at 4 PM.',
      security_notes: 'Private note: alarm is sensitive.',
      gate_code: 'Gate code 1234',
      house_rules: 'Shoes off past the kitchen.',
      pets: [{ name: 'Miso', type: 'Dog', notes: 'Keep away from prep table.' }],
      kitchen_constraints: 'Induction cooktop runs cold.',
      equipment_available: 'Vitamix and sheet pans.',
      equipment_must_bring: 'Bring extra hotel pans.',
      family_notes: 'Private family dynamics stay chef-only.',
      cleanup_expectations: 'Pack compost separately.',
    },
    household: {
      members: [
        {
          id: 'member-1',
          profile_id: 'profile-1',
          display_name: 'Morgan',
          relationship: 'house_manager',
          age_group: 'adult',
          dietary_restrictions: [],
          allergies: [],
          dislikes: [],
          favorites: [],
          notes: 'Can approve arrival timing.',
          sort_order: 0,
          created_at: '2026-05-21T00:00:00.000Z',
          updated_at: '2026-05-21T00:00:00.000Z',
        },
      ],
      allAllergies: [],
      allDietary: [],
      adultCount: 1,
      childCount: 0,
      hasHubProfile: true,
    },
  })
}

test('household memory ranks restrictive fact states and detects private leak terms', () => {
  assert.equal(
    deriveMostRestrictiveHouseholdFactState(['confirmed', 'stale', 'client_corrected']),
    'stale'
  )
  assert.equal(deriveMostRestrictiveHouseholdFactState([]), 'unknown')
  assert.equal(containsPrivateHouseholdLeak('Gate code should not leave chef mode'), true)
  assert.equal(containsPrivateHouseholdLeak('Use the service elevator'), false)
})

test('staff briefing redacts chef-only and public-never household facts', () => {
  const briefing = buildStaffSafeHouseholdBriefing({
    tenantId: 'tenant-1',
    eventId: 'event-1',
    householdId: 'client-1',
    facts: [
      baseFact,
      { ...baseFact, id: 'fact-2', label: 'Family dynamics', visibility: 'private_chef_only' },
      { ...baseFact, id: 'fact-3', label: 'Gate code', visibility: 'public_never' },
    ],
  })

  assert.deepEqual(
    briefing.facts.map((fact) => fact.id),
    ['fact-1']
  )
  assert.equal(briefing.redactedFactCount, 2)
  assert.equal(JSON.stringify(briefing).includes('Gate code'), false)
})

test('client-safe corrections exclude chef-only leak language', () => {
  const corrections = buildClientSafeHouseholdCorrections({
    tenantId: 'tenant-1',
    householdId: 'client-1',
    facts: [
      {
        ...baseFact,
        id: 'client-safe',
        label: 'Parking instructions',
        value: 'Use north garage.',
        visibility: 'client_safe_correction',
      },
      {
        ...baseFact,
        id: 'leaky',
        label: 'Gate code',
        value: 'Gate code 1234',
        visibility: 'client_safe_correction',
      },
    ],
  })

  assert.deepEqual(
    corrections.map((correction) => correction.factId),
    ['client-safe']
  )
  assert.equal(JSON.stringify(corrections).includes('1234'), false)
})

test('event reuse keeps stale and public-never facts out of reusable event packets', () => {
  const decision = buildEventHouseholdReuseDecision({
    tenantId: 'tenant-1',
    householdId: 'client-1',
    eventId: 'event-1',
    facts: [
      baseFact,
      { ...baseFact, id: 'corrected', state: 'client_corrected' },
      { ...baseFact, id: 'stale', state: 'stale' },
      { ...baseFact, id: 'public-never', visibility: 'public_never' },
    ],
  })

  assert.deepEqual(decision.reusedFactIds, ['fact-1', 'corrected'])
  assert.deepEqual(decision.staleFactIds, ['stale'])
  assert.equal(decision.blockedPrivateFactCount, 1)
})

test('client profile read model covers operating memory outcomes without duplicate storage', () => {
  const memory = buildMemory()

  assert.equal(memory.profile.tenantId, 'tenant-1')
  assert.equal(
    memory.profile.facts.some((fact) => fact.kind === 'access_instruction'),
    true
  )
  assert.equal(
    memory.profile.facts.some((fact) => fact.kind === 'kitchen_quirk'),
    true
  )
  assert.equal(
    memory.profile.authorityMap.some((record) => record.role === 'house_manager'),
    true
  )
  assert.equal(
    memory.staffBriefingPreview.facts.every((fact) => fact.visibility === 'staff_safe'),
    true
  )
  assert.equal(
    JSON.stringify(memory.clientSafeCorrections).includes('Private family dynamics'),
    false
  )
  assert.equal(memory.eventReusePreview.reusedFactIds.length > 0, true)
})
