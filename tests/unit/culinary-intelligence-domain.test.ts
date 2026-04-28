import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CULINARY_ENTITY_TYPES,
  CULINARY_ENVIRONMENT_PROFILES,
  CULINARY_FACT_TYPES,
  CULINARY_LIFECYCLE_STATES,
  CULINARY_PUBLICATION_ELIGIBILITIES,
  CULINARY_REVIEW_STATES,
  CULINARY_SOURCE_RECORD_TYPES,
  isHighImpactFactType,
  isRegulatedFactType,
  requiresJurisdictionScope,
  requiresTenantScope,
} from '../../lib/culinary-intelligence/domain'

test('culinary intelligence entity types cover food and non-food operational domains', () => {
  assert.ok(CULINARY_ENTITY_TYPES.includes('ingredient'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('equipment'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('property'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('license'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('insurance'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('vehicle'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('chemical'))
  assert.ok(CULINARY_ENTITY_TYPES.includes('operational_event'))
})

test('culinary intelligence environment profiles cover broad operator contexts', () => {
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('private_chef'))
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('restaurant'))
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('cannabis'))
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('nonprofit'))
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('yacht'))
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('commissary'))
  assert.ok(CULINARY_ENVIRONMENT_PROFILES.includes('specialty_retail'))
})

test('source record types include document, image, public, vendor, and manual evidence', () => {
  assert.ok(CULINARY_SOURCE_RECORD_TYPES.includes('public_dataset'))
  assert.ok(CULINARY_SOURCE_RECORD_TYPES.includes('recall_feed'))
  assert.ok(CULINARY_SOURCE_RECORD_TYPES.includes('uploaded_invoice'))
  assert.ok(CULINARY_SOURCE_RECORD_TYPES.includes('uploaded_insurance_certificate'))
  assert.ok(CULINARY_SOURCE_RECORD_TYPES.includes('uploaded_image'))
  assert.ok(CULINARY_SOURCE_RECORD_TYPES.includes('manual_correction'))
})

test('fact types use cents for monetary facts and include non-food claims', () => {
  assert.ok(CULINARY_FACT_TYPES.includes('price_cents'))
  assert.ok(CULINARY_FACT_TYPES.includes('replacement_cost_cents'))
  assert.ok(CULINARY_FACT_TYPES.includes('vendor_minimum_order_cents'))
  assert.ok(CULINARY_FACT_TYPES.includes('document_extracted_expense_cents'))
  assert.ok(CULINARY_FACT_TYPES.includes('equipment_capacity'))
  assert.ok(CULINARY_FACT_TYPES.includes('property_access_constraint'))
  assert.ok(CULINARY_FACT_TYPES.includes('insurance_coverage'))
  assert.ok(CULINARY_FACT_TYPES.includes('inspection_status'))
  assert.ok(CULINARY_FACT_TYPES.includes('chemical_sds'))

  const monetaryFactTypes = CULINARY_FACT_TYPES.filter(
    (factType) =>
      factType.includes('price') ||
      factType.includes('cost') ||
      factType.includes('order') ||
      factType.includes('expense')
  )

  assert.ok(monetaryFactTypes.length > 0)
  assert.ok(
    monetaryFactTypes.every((factType) => factType.endsWith('_cents')),
    `expected monetary facts to be cents based: ${monetaryFactTypes.join(', ')}`
  )
})

test('lifecycle, publication, and review states align with price intelligence language', () => {
  assert.ok(CULINARY_LIFECYCLE_STATES.includes('observed'))
  assert.ok(CULINARY_LIFECYCLE_STATES.includes('needs_review'))
  assert.ok(CULINARY_LIFECYCLE_STATES.includes('conflicting'))
  assert.ok(CULINARY_LIFECYCLE_STATES.includes('surfaceable'))
  assert.ok(CULINARY_LIFECYCLE_STATES.includes('internal_only'))
  assert.ok(CULINARY_LIFECYCLE_STATES.includes('stale'))

  assert.deepEqual(
    [...CULINARY_PUBLICATION_ELIGIBILITIES],
    ['surfaceable', 'internal_only', 'review', 'rejected']
  )

  assert.ok(CULINARY_REVIEW_STATES.includes('approved'))
  assert.ok(CULINARY_REVIEW_STATES.includes('corrected'))
  assert.ok(CULINARY_REVIEW_STATES.includes('merged'))
})

test('regulated fact helper marks compliance, recall, license, insurance, and safety facts', () => {
  assert.equal(isRegulatedFactType('allergen'), true)
  assert.equal(isRegulatedFactType('recall'), true)
  assert.equal(isRegulatedFactType('license_validity'), true)
  assert.equal(isRegulatedFactType('insurance_coverage'), true)
  assert.equal(isRegulatedFactType('chemical_sds'), true)
  assert.equal(isRegulatedFactType('identity'), false)
})

test('high impact helper marks operationally risky facts without treating all identity facts as high impact', () => {
  assert.equal(isHighImpactFactType('price_cents'), true)
  assert.equal(isHighImpactFactType('equipment_utility_requirement'), true)
  assert.equal(isHighImpactFactType('property_access_constraint'), true)
  assert.equal(isHighImpactFactType('vendor_terms'), true)
  assert.equal(isHighImpactFactType('document_identity'), false)
})

test('tenant scope helper protects private operational entities and uploaded evidence', () => {
  assert.equal(requiresTenantScope({ entityType: 'property' }), true)
  assert.equal(requiresTenantScope({ entityType: 'document' }), true)
  assert.equal(requiresTenantScope({ sourceRecordType: 'uploaded_invoice' }), true)
  assert.equal(requiresTenantScope({ sourceRecordType: 'manual_correction' }), true)
  assert.equal(requiresTenantScope({ entityType: 'ingredient' }), false)
  assert.equal(requiresTenantScope({ sourceRecordType: 'public_dataset' }), false)
  assert.equal(requiresTenantScope({ scopeKind: 'tenant' }), true)
})

test('jurisdiction scope helper marks regulatory and local rule facts', () => {
  assert.equal(requiresJurisdictionScope('permit_validity'), true)
  assert.equal(requiresJurisdictionScope('license_validity'), true)
  assert.equal(requiresJurisdictionScope('cannabis_compliance'), true)
  assert.equal(requiresJurisdictionScope('property_rule'), true)
  assert.equal(requiresJurisdictionScope('price_cents'), false)
  assert.equal(requiresJurisdictionScope('equipment_capacity'), false)
})
