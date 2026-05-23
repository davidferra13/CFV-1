import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PHYSICAL_OPERATION_PRIMITIVE_REGISTRY,
  PHYSICAL_OPERATION_PROGRAM_FAMILIES,
  deriveMostRestrictivePhysicalReadinessState,
  findPhysicalOperationPrimitiveCandidates,
  getMissingRequiredPhysicalOperationPrimitiveKinds,
  getPhysicalOperationPrimitive,
  isStaffOrVendorSafePhysicalVisibility,
  listPhysicalOperationPrimitivesByKind,
  requiresChefInternalPhysicalVisibility,
  type PhysicalOperationPrimitiveDefinition,
} from '../../lib/operations/physical-operations-primitive-registry.js'

describe('Physical Operations primitive registry', () => {
  it('covers every required physical-operation concept with reuse guidance', () => {
    assert.deepEqual(getMissingRequiredPhysicalOperationPrimitiveKinds(), [])

    for (const primitive of PHYSICAL_OPERATION_PRIMITIVE_REGISTRY) {
      assert.ok(primitive.ownerModule.length > 0, `${primitive.key} needs owner module`)
      assert.ok(primitive.sourceModules.length > 0, `${primitive.key} needs source modules`)
      assert.ok(primitive.integrationPoints.length > 0, `${primitive.key} needs integration points`)
      assert.ok(primitive.reuseGuidance.length > 0, `${primitive.key} needs reuse guidance`)
      assert.ok(primitive.doNotDuplicateAs.length > 0, `${primitive.key} needs duplicate aliases`)
      assert.ok(primitive.canonicalStateFields.length > 0, `${primitive.key} needs states`)
    }
  })

  it('exposes shared equipment, venue, station, storage, transport, cleanup, waste, and staff task primitives', () => {
    assert.deepEqual(
      listPhysicalOperationPrimitivesByKind('equipment').map((primitive) => primitive.key),
      ['equipment_item', 'equipment_requirement']
    )

    const requiredKeys = new Set(
      PHYSICAL_OPERATION_PRIMITIVE_REGISTRY.map((primitive) => primitive.key)
    )

    for (const key of [
      'venue_capability',
      'work_station',
      'station_assignment',
      'loadout_container',
      'transport_leg',
      'transport_condition',
      'storage_zone',
      'cleanup_step',
      'waste_stream',
      'staff_task',
    ] satisfies PhysicalOperationPrimitiveDefinition['key'][]) {
      assert.equal(requiredKeys.has(key), true, `${key} should be registered`)
    }
  })

  it('keeps likely program families attached to the primitives they should reuse', () => {
    assert.equal(PHYSICAL_OPERATION_PROGRAM_FAMILIES.includes('physical_event_loadout_brain'), true)
    assert.equal(
      getPhysicalOperationPrimitive('waste_stream').reusableBy.includes(
        'sustainability_waste_ethics_ledger'
      ),
      true
    )
    assert.equal(
      getPhysicalOperationPrimitive('storage_zone').reusableBy.includes(
        'client_household_operating_memory'
      ),
      true
    )
    assert.equal(
      getPhysicalOperationPrimitive('staff_task').reusableBy.includes('staff_trust_delegation'),
      true
    )
    assert.equal(
      getPhysicalOperationPrimitive('transport_leg').reusableBy.includes('vendor_trust_ledger'),
      true
    )
    assert.equal(
      getPhysicalOperationPrimitive('equipment_requirement').reusableBy.includes(
        'event_readiness_bus'
      ),
      true
    )
  })

  it('defines shared readiness and visibility guards', () => {
    assert.equal(
      deriveMostRestrictivePhysicalReadinessState(['ready', 'in_progress', 'at_risk']),
      'at_risk'
    )
    assert.equal(deriveMostRestrictivePhysicalReadinessState(['ready', 'blocked']), 'blocked')
    assert.equal(deriveMostRestrictivePhysicalReadinessState([]), 'unknown')

    assert.equal(isStaffOrVendorSafePhysicalVisibility('staff_safe_task'), true)
    assert.equal(isStaffOrVendorSafePhysicalVisibility('vendor_safe_task'), true)
    assert.equal(isStaffOrVendorSafePhysicalVisibility('chef_internal'), false)

    assert.equal(requiresChefInternalPhysicalVisibility('private_only'), true)
    assert.equal(requiresChefInternalPhysicalVisibility('chef_internal'), true)
    assert.equal(requiresChefInternalPhysicalVisibility('client_safe_summary'), false)
  })

  it('maps duplicate aliases back to canonical primitives', () => {
    assert.deepEqual(
      findPhysicalOperationPrimitiveCandidates('gear').map((primitive) => primitive.key),
      ['equipment_item']
    )
    assert.deepEqual(
      findPhysicalOperationPrimitiveCandidates('cooler list').map((primitive) => primitive.key),
      ['loadout_container']
    )
    assert.deepEqual(
      findPhysicalOperationPrimitiveCandidates('route issue').map((primitive) => primitive.key),
      ['transport_condition']
    )
    assert.deepEqual(
      findPhysicalOperationPrimitiveCandidates('crew todo').map((primitive) => primitive.key),
      ['staff_task']
    )
  })
})
