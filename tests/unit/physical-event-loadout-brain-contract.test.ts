import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStaffSafeLoadoutTaskExport,
  deriveLoadoutPlanReadiness,
  deriveMostRestrictiveLoadoutReadinessState,
  hasVenueCapabilityRisk,
  isStaffSafeLoadoutVisibility,
  type LoadoutRequirementContract,
  type StaffSafeLoadoutTaskContract,
  type VenueCapabilityContract,
} from '../../lib/intelligence/physical-event-loadout-brain-contract.js'

const sourceRef = {
  source: 'event_packing_list' as const,
  table: 'event_packing_items' as const,
  rowId: 'packing-item-1',
}

function requirement(
  overrides: Partial<LoadoutRequirementContract> = {}
): LoadoutRequirementContract {
  return {
    id: 'requirement-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    eventId: 'event-1',
    menuId: 'menu-1',
    dishId: 'dish-1',
    stationId: 'station-1',
    itemName: 'Induction burner',
    category: 'cooking',
    requiredQuantity: 1,
    fulfilledQuantity: 1,
    ownershipPlan: 'owned',
    source: 'menu_dish',
    packState: 'packed',
    fulfillmentState: 'fulfilled',
    confidence: 'high',
    riskLabels: [],
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function capability(overrides: Partial<VenueCapabilityContract> = {}): VenueCapabilityContract {
  return {
    tenantId: 'tenant-1',
    eventId: 'event-1',
    venueProfileId: 'venue-1',
    kind: 'power',
    state: 'available',
    needed: true,
    label: 'Dedicated power for induction station',
    notes: null,
    sourceRefs: [
      {
        source: 'venue_profile',
        table: 'venue_profiles',
        rowId: 'venue-1',
      },
    ],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function task(overrides: Partial<StaffSafeLoadoutTaskContract> = {}): StaffSafeLoadoutTaskContract {
  return {
    id: 'task-1',
    tenantId: 'tenant-1',
    eventId: 'event-1',
    mode: 'packing',
    stationKind: 'hot',
    label: 'Pack induction burner and backup extension cord',
    instructions: 'Stage in hot station crate.',
    dueAt: null,
    privateNotes: null,
    sourceRefs: [sourceRef],
    visibility: 'staff_safe_task',
    ...overrides,
  }
}

describe('Physical Event Loadout Brain contract', () => {
  it('defines loadout readiness progression and venue unknowns as risks', () => {
    assert.equal(
      deriveMostRestrictiveLoadoutReadinessState(['ready', 'in_progress', 'at_risk']),
      'at_risk'
    )
    assert.equal(deriveMostRestrictiveLoadoutReadinessState([]), 'unknown')

    assert.equal(hasVenueCapabilityRisk(capability()), false)
    assert.equal(hasVenueCapabilityRisk(capability({ state: 'unknown' })), true)
    assert.equal(hasVenueCapabilityRisk(capability({ state: 'limited' })), true)
    assert.equal(hasVenueCapabilityRisk(capability({ state: 'unavailable' })), true)
  })

  it('derives plan readiness from requirements, pack state, and venue capabilities', () => {
    assert.equal(
      deriveLoadoutPlanReadiness({
        requirements: [requirement()],
        venueCapabilities: [capability()],
      }),
      'ready'
    )

    assert.equal(
      deriveLoadoutPlanReadiness({
        requirements: [requirement()],
        venueCapabilities: [capability({ state: 'unknown' })],
      }),
      'at_risk'
    )

    assert.equal(
      deriveLoadoutPlanReadiness({
        requirements: [
          requirement({
            fulfilledQuantity: 0,
            fulfillmentState: 'missing',
            packState: 'missing',
            riskLabels: ['backup burner not confirmed'],
          }),
        ],
        venueCapabilities: [capability()],
      }),
      'blocked'
    )
  })

  it('exports only staff-safe task copy and counts private redactions', () => {
    assert.equal(isStaffSafeLoadoutVisibility('staff_safe_task'), true)
    assert.equal(isStaffSafeLoadoutVisibility('private_only'), false)

    const exported = buildStaffSafeLoadoutTaskExport({
      tenantId: 'tenant-1',
      eventId: 'event-1',
      tasks: [
        task({ id: 'safe-task' }),
        task({
          id: 'private-task',
          label: 'Review client household elevator notes',
          privateNotes: 'Client mobility and building access details stay private.',
          visibility: 'private_only',
        }),
      ],
    })

    assert.deepEqual(
      exported.tasks.map((safeTask) => safeTask.id),
      ['safe-task']
    )
    assert.equal('privateNotes' in exported.tasks[0], false)
    assert.equal(exported.blockedPrivateTaskCount, 1)
    assert.equal(exported.visibility, 'staff_safe_task')
  })
})
