export const CULINARY_ENTITY_TYPES = [
  'ingredient',
  'product',
  'upc',
  'brand',
  'vendor',
  'store',
  'farm',
  'equipment',
  'packaging',
  'location',
  'property',
  'document',
  'image',
  'source_record',
  'license',
  'permit',
  'insurance',
  'inspection',
  'vehicle',
  'chemical',
  'person',
  'organization',
  'operational_event',
] as const

export type CulinaryEntityType = (typeof CULINARY_ENTITY_TYPES)[number]

export const CULINARY_ENVIRONMENT_PROFILES = [
  'restaurant',
  'catering',
  'private_chef',
  'institutional',
  'hospitality',
  'mobile',
  'farm',
  'vendor',
  'distributor',
  'cannabis',
  'nonprofit',
  'bakery',
  'commissary',
  'yacht',
  'specialty_retail',
] as const

export type CulinaryEnvironmentProfile = (typeof CULINARY_ENVIRONMENT_PROFILES)[number]

export const CULINARY_SOURCE_RECORD_TYPES = [
  'api_capture',
  'website_capture',
  'scrape_snapshot',
  'public_dataset',
  'regulatory_lookup',
  'recall_feed',
  'uploaded_receipt',
  'uploaded_invoice',
  'uploaded_quote',
  'uploaded_catalog',
  'uploaded_permit',
  'uploaded_license',
  'uploaded_insurance_certificate',
  'uploaded_inspection_report',
  'uploaded_sds',
  'uploaded_contract',
  'uploaded_image',
  'uploaded_document',
  'ocr_text',
  'email',
  'vendor_feed',
  'manual_confirmation',
  'manual_correction',
  'reviewer_note',
] as const

export type CulinarySourceRecordType = (typeof CULINARY_SOURCE_RECORD_TYPES)[number]

export const CULINARY_FACT_TYPES = [
  'price_cents',
  'normalized_price_cents',
  'replacement_cost_cents',
  'availability',
  'identity',
  'unit',
  'pack',
  'yield',
  'storage',
  'shelf_life',
  'allergen',
  'food_safety_compliance',
  'cannabis_compliance',
  'alcohol_compliance',
  'equipment_capacity',
  'equipment_status',
  'equipment_utility_requirement',
  'equipment_service_history',
  'equipment_recall_status',
  'property_kitchen_constraint',
  'property_access_constraint',
  'property_utility_constraint',
  'property_storage_constraint',
  'property_rule',
  'license_validity',
  'permit_validity',
  'insurance_coverage',
  'inspection_status',
  'recall',
  'vendor_terms',
  'vendor_delivery_window',
  'vendor_minimum_order_cents',
  'document_extraction',
  'document_extracted_expense_cents',
  'document_identity',
  'chemical_sds',
  'chemical_storage',
  'packaging_food_contact',
  'packaging_temperature_tolerance',
  'vehicle_status',
  'vehicle_maintenance',
  'operational_event_constraint',
] as const

export type CulinaryFactType = (typeof CULINARY_FACT_TYPES)[number]

export const CULINARY_LIFECYCLE_STATES = [
  'captured',
  'parsed',
  'candidate',
  'discoverable',
  'source_live',
  'observed',
  'inferable',
  'needs_review',
  'conflicting',
  'verified',
  'surfaceable',
  'internal_only',
  'stale',
  'unreachable',
  'closed',
  'rejected',
  'superseded',
  'archived',
] as const

export type CulinaryLifecycleState = (typeof CULINARY_LIFECYCLE_STATES)[number]

export const CULINARY_PUBLICATION_ELIGIBILITIES = [
  'surfaceable',
  'internal_only',
  'review',
  'rejected',
] as const

export type CulinaryPublicationEligibility = (typeof CULINARY_PUBLICATION_ELIGIBILITIES)[number]

export const CULINARY_REVIEW_STATES = [
  'unreviewed',
  'needs_review',
  'in_review',
  'approved',
  'corrected',
  'dismissed',
  'merged',
  'rejected',
  'superseded',
] as const

export type CulinaryReviewState = (typeof CULINARY_REVIEW_STATES)[number]

export type CulinaryScopeKind = 'tenant' | 'system' | 'public'

export type CulinaryMoneyValue = {
  readonly amountCents: number
  readonly currency: string
}

export type CulinaryCandidateFact = {
  readonly entityType: CulinaryEntityType
  readonly factType: CulinaryFactType
  readonly sourceRecordType: CulinarySourceRecordType
  readonly scopeKind: CulinaryScopeKind
  readonly lifecycleState: CulinaryLifecycleState
  readonly publicationEligibility: CulinaryPublicationEligibility
  readonly reviewState: CulinaryReviewState
  readonly confidence: number
  readonly observedAt: string
  readonly tenantId?: string
  readonly jurisdiction?: string
}

const REGULATED_FACT_TYPES = new Set<CulinaryFactType>([
  'allergen',
  'food_safety_compliance',
  'cannabis_compliance',
  'alcohol_compliance',
  'equipment_recall_status',
  'license_validity',
  'permit_validity',
  'insurance_coverage',
  'inspection_status',
  'recall',
  'chemical_sds',
  'chemical_storage',
  'packaging_food_contact',
  'packaging_temperature_tolerance',
])

const HIGH_IMPACT_FACT_TYPES = new Set<CulinaryFactType>([
  'price_cents',
  'normalized_price_cents',
  'replacement_cost_cents',
  'vendor_minimum_order_cents',
  'document_extracted_expense_cents',
  'availability',
  'yield',
  'storage',
  'shelf_life',
  'allergen',
  'food_safety_compliance',
  'cannabis_compliance',
  'alcohol_compliance',
  'equipment_capacity',
  'equipment_status',
  'equipment_utility_requirement',
  'equipment_recall_status',
  'property_kitchen_constraint',
  'property_access_constraint',
  'property_utility_constraint',
  'license_validity',
  'permit_validity',
  'insurance_coverage',
  'inspection_status',
  'recall',
  'vendor_terms',
])

const JURISDICTION_SCOPED_FACT_TYPES = new Set<CulinaryFactType>([
  'food_safety_compliance',
  'cannabis_compliance',
  'alcohol_compliance',
  'license_validity',
  'permit_validity',
  'insurance_coverage',
  'inspection_status',
  'recall',
  'property_rule',
  'chemical_sds',
  'packaging_food_contact',
])

const TENANT_PRIVATE_ENTITY_TYPES = new Set<CulinaryEntityType>([
  'vendor',
  'store',
  'farm',
  'equipment',
  'packaging',
  'location',
  'property',
  'document',
  'image',
  'source_record',
  'license',
  'permit',
  'insurance',
  'inspection',
  'vehicle',
  'chemical',
  'person',
  'organization',
  'operational_event',
])

const TENANT_PRIVATE_SOURCE_RECORD_TYPES = new Set<CulinarySourceRecordType>([
  'uploaded_receipt',
  'uploaded_invoice',
  'uploaded_quote',
  'uploaded_catalog',
  'uploaded_permit',
  'uploaded_license',
  'uploaded_insurance_certificate',
  'uploaded_inspection_report',
  'uploaded_sds',
  'uploaded_contract',
  'uploaded_image',
  'uploaded_document',
  'ocr_text',
  'email',
  'vendor_feed',
  'manual_confirmation',
  'manual_correction',
  'reviewer_note',
])

export function isRegulatedFactType(factType: CulinaryFactType): boolean {
  return REGULATED_FACT_TYPES.has(factType)
}

export function isHighImpactFactType(factType: CulinaryFactType): boolean {
  return HIGH_IMPACT_FACT_TYPES.has(factType)
}

export function requiresTenantScope(input: {
  readonly entityType?: CulinaryEntityType
  readonly sourceRecordType?: CulinarySourceRecordType
  readonly scopeKind?: CulinaryScopeKind
}): boolean {
  if (input.scopeKind === 'tenant') {
    return true
  }

  return Boolean(
    (input.entityType && TENANT_PRIVATE_ENTITY_TYPES.has(input.entityType)) ||
    (input.sourceRecordType && TENANT_PRIVATE_SOURCE_RECORD_TYPES.has(input.sourceRecordType))
  )
}

export function requiresJurisdictionScope(factType: CulinaryFactType): boolean {
  return JURISDICTION_SCOPED_FACT_TYPES.has(factType)
}
