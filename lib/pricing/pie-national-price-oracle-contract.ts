export type FinalCostingState = 'allowed' | 'allowed_with_estimate' | 'review_required' | 'blocked'

export type FallbackStep =
  | 'chef_override'
  | 'receipt_proof'
  | 'exact_sku'
  | 'exact_canonical_buyable'
  | 'buyable_equivalent'
  | 'vendor_category_sibling'
  | 'regional_average'
  | 'national_baseline'
  | 'synthetic_model'
  | 'substitution_price'

export type OracleReliabilityBucket =
  | 'direct_proof'
  | 'high_confidence'
  | 'estimate_labeled'
  | 'review_required'
  | 'blocked'

export type StateReliabilityForOracle = 'reliable' | 'usable' | 'estimated' | 'unreliable'

export type NativeTruthInvariantId =
  | 'native_data_ownership'
  | 'instant_precomputed_serving'
  | 'user_data_boundary'
  | 'external_dependency_boundary'
  | 'accuracy_honesty'
  | 'self_repair'
  | 'census_denominator'
  | 'compound_learning'
  | 'access_reliability'

export type NativeOracleServingMode =
  | 'precomputed_native_index'
  | 'native_background_repair'
  | 'request_time_crawl'
  | 'external_api_fetch'
  | 'user_supplied_market_price'

export interface NativeTruthInvariant {
  id: NativeTruthInvariantId
  rule: string
  blocksFinalCostingWhen: string[]
  proofRequired: string[]
}

export interface NativeTruthServingClaim {
  servingMode: NativeOracleServingMode
  hasNativeObservation: boolean
  precomputedForRegion: boolean
  requiresExternalCompanyAtServeTime: boolean
  usesUserSubmittedPriceAsMarketTruth: boolean
  hasProvenance: boolean
  hasFreshness: boolean
  hasConfidence: boolean
  hasRepairPath: boolean
}

export interface NativeTruthServingResult {
  finalCostingState: FinalCostingState
  reliability: OracleReliabilityBucket
  visibleLabel: string
  blockers: string[]
}

export interface PiePricingIdentity {
  id: string
  canonicalName: string
  family: string
  biologicalSource: string
  ediblePart: string
  culinaryForm: string
  processingState: string
  priceFamily: string
  buyableEquivalenceGroup: string[]
  unsafeEquivalence: string[]
  unitBasis: string[]
  yieldBasis: string
  substitutionGroup: string
  fallbackOrder: FallbackStep[]
  pricingRisks: string[]
  proofRequirements: string[]
}

export interface FallbackDecision {
  step: FallbackStep
  allowedWhen: string[]
  blockedWhen: string[]
  confidenceCap: number
  requiredProof: string[]
  visibleLabel: string
  finalCostingState: FinalCostingState
}

export interface SkuMatchInput {
  upc?: string | null
  vendorSku?: string | null
  productName: string
  canonicalIdentityId: string
  brand?: string | null
  vendorName?: string | null
  storeName?: string | null
  region?: string | null
  packSize?: string | null
  unitBasis?: string | null
  form?: string | null
  processState?: string | null
  organicConventional?: 'organic' | 'conventional' | 'unspecified'
  grade?: string | null
  cutOrSize?: string | null
  multiPack?: boolean
  catchWeight?: boolean
  drainedWeight?: boolean
}

export type SkuMatchOutcome =
  | 'exact_match'
  | 'canonical_match'
  | 'fallback_candidate'
  | 'review_required'
  | 'rejected_non_food'
  | 'rejected_prepared'
  | 'unsafe_equivalence'

export interface SkuMatchResult {
  outcome: SkuMatchOutcome
  reliability: OracleReliabilityBucket
  reasons: string[]
}

export interface UnitYieldRequirement {
  conversionClass:
    | 'direct'
    | 'requires_density_or_pack_size'
    | 'requires_each_or_bunch_yield'
    | 'requires_trim_or_cook_yield'
    | 'requires_drained_weight'
    | 'unsafe_without_manual_review'
  requiredProof: string[]
  finalCostingWithoutProof: FinalCostingState
}

export interface UnitYieldTransformExample {
  id: string
  identityId: string
  purchaseUnit: string
  recipeUnit: string
  requiredConversionProof: string[]
  yieldBasis: string
  reliabilityOutcome: FinalCostingState
}

export type SubstitutionType =
  | 'culinary_function'
  | 'dietary_allergen'
  | 'availability'
  | 'vendor'
  | 'cost_control'
  | 'client_approved'
  | 'chef_operational'
  | 'emergency'

export interface SubstitutionPricingInput {
  type: SubstitutionType
  originalIdentityId: string
  replacementIdentityId: string
  hasDietaryCheck: boolean
  hasAllergenCheck: boolean
  hasUnitYieldProof: boolean
  hasPriceProof: boolean
  approvedByClient: boolean
}

export interface SubstitutionPricingResult {
  finalCostingState: FinalCostingState
  canRewriteOriginalPriceTruth: false
  requiredProof: string[]
  label: string
}

export type SubstitutionApprovalMode =
  | 'client_required_before_final_costing'
  | 'chef_required'
  | 'chef_allowed_with_audit'
  | 'emergency_allowed_then_reconcile'

export interface SubstitutionTypeRule {
  type: SubstitutionType
  approvalMode: SubstitutionApprovalMode
  requiredChecks: string[]
  pricingRule: string
  finalCostingBeforeApproval: FinalCostingState
  auditTrail: string[]
  example: {
    original: string
    replacement: string
    reason: string
    expectedState: FinalCostingState
  }
}

export interface SkuMatchPriorityRule {
  order: number
  field: string
  rule: string
}

export interface SkuOutcomeRule {
  outcome: SkuMatchOutcome
  allowedWhen: string[]
  blockedOrDowngradedWhen: string[]
  reliability: OracleReliabilityBucket
}

export type GoldenFixtureSubstitutionState =
  | 'not_a_substitution'
  | 'substitution_requires_approval'
  | 'unsafe_equivalence_no_rewrite'
  | 'rejected_not_price_truth'

export interface GoldenPriceOracleFixture {
  id: string
  raw: string
  source: 'recipe_string' | 'vendor_sku' | 'receipt_line'
  expectedIdentityId: string
  expectedBuyableGroup: string[]
  expectedUnsafeEquivalences: string[]
  expectedUnitProof: string[]
  expectedYieldProof: string
  expectedSkuOutcome: SkuMatchOutcome
  expectedFallbackStep: FallbackStep
  expectedSubstitutionState: GoldenFixtureSubstitutionState
  expectedReliability: OracleReliabilityBucket
  sourceTransparencyLabel: string
  visibleLabel: string
}

const commonDirectFallbacks: FallbackStep[] = [
  'receipt_proof',
  'exact_sku',
  'exact_canonical_buyable',
  'buyable_equivalent',
  'regional_average',
  'national_baseline',
  'synthetic_model',
]

export const SKU_MATCH_PRIORITY_ORDER: SkuMatchPriorityRule[] = [
  {
    order: 1,
    field: 'UPC/GTIN/PLU',
    rule: 'Exact code match wins only with pack, unit, and vendor proof.',
  },
  {
    order: 2,
    field: 'vendor SKU',
    rule: 'Distributor item number can prove exact SKU within the same vendor catalog.',
  },
  {
    order: 3,
    field: 'vendor/store',
    rule: 'Store, chain, distributor, and region scope must be preserved as source proof.',
  },
  {
    order: 4,
    field: 'normalized product name',
    rule: 'Name matching can suggest canonical identity but cannot override unsafe form boundaries.',
  },
  {
    order: 5,
    field: 'brand/private label',
    rule: 'Brand differentiates SKU truth but generic private labels can map only with vendor proof.',
  },
  {
    order: 6,
    field: 'pack and multi-pack',
    rule: 'Pack size, case pack, count per pack, and multi-pack math must be explicit.',
  },
  {
    order: 7,
    field: 'unit and catch weight',
    rule: 'Unit basis, random weight, each weight, and catch weight proof are required before costing.',
  },
  {
    order: 8,
    field: 'form/process',
    rule: 'Fresh, frozen, cooked, canned, drained, prepared, smoked, dried, or extract states gate equivalence.',
  },
  {
    order: 9,
    field: 'region',
    rule: 'Regional distance downgrades confidence and cannot create local shopping proof.',
  },
  {
    order: 10,
    field: 'recency',
    rule: 'Stale exact SKU proof is still identity-safe but must be visibly downgraded.',
  },
]

export const SKU_OUTCOME_RULES: SkuOutcomeRule[] = [
  {
    outcome: 'exact_match',
    allowedWhen: [
      'Exact UPC/GTIN/PLU or vendor SKU, pack, unit, vendor/store, form, and canonical identity all agree.',
    ],
    blockedOrDowngradedWhen: [
      'Catch weight, drained weight, or edible yield proof is required and missing.',
    ],
    reliability: 'direct_proof',
  },
  {
    outcome: 'canonical_match',
    allowedWhen: [
      'Product name, pack, unit, form, and canonical identity agree without exact SKU proof.',
    ],
    blockedOrDowngradedWhen: [
      'Name match is fuzzy, brand-only, or form/process proof is incomplete.',
    ],
    reliability: 'high_confidence',
  },
  {
    outcome: 'fallback_candidate',
    allowedWhen: ['Only broad family, category, or fuzzy product evidence exists.'],
    blockedOrDowngradedWhen: [
      'Fallback crosses source, form, process, allergen, or yield boundaries.',
    ],
    reliability: 'estimate_labeled',
  },
  {
    outcome: 'review_required',
    allowedWhen: [
      'Product can become safe after catch-weight, drained-weight, pack, unit, grade, or yield proof is supplied.',
    ],
    blockedOrDowngradedWhen: ['Manual review cannot recover one canonical ingredient identity.'],
    reliability: 'review_required',
  },
  {
    outcome: 'rejected_non_food',
    allowedWhen: [
      'Catalog item is lotion, soap, cleaner, pet food, service fee, equipment, or other non-food.',
    ],
    blockedOrDowngradedWhen: ['Always blocked from ingredient price truth.'],
    reliability: 'blocked',
  },
  {
    outcome: 'rejected_prepared',
    allowedWhen: [
      'Catalog item is a prepared entree, kit, cooked product, salad kit, marinade, or ready-to-eat item.',
    ],
    blockedOrDowngradedWhen: [
      'May be reviewed as a prepared recipe component, never raw ingredient price truth.',
    ],
    reliability: 'blocked',
  },
  {
    outcome: 'unsafe_equivalence',
    allowedWhen: [
      'A nearby SKU exists but changes source, edible part, form, process, concentration, allergen, or yield basis.',
    ],
    blockedOrDowngradedWhen: ['Always blocked from rewriting exact ingredient truth.'],
    reliability: 'blocked',
  },
]

export const PIE_NATIVE_TRUTH_INVARIANTS: NativeTruthInvariant[] = [
  {
    id: 'native_data_ownership',
    rule: 'PIE-owned observations, census rows, normalization decisions, and serving indexes are the source of market price truth.',
    blocksFinalCostingWhen: [
      'Only a remote API response exists and PIE has not stored a native observation.',
      'The source cannot be replayed, audited, or served after the remote provider is unavailable.',
    ],
    proofRequired: ['native observation id', 'canonical identity id', 'normalization lineage'],
  },
  {
    id: 'instant_precomputed_serving',
    rule: 'User workflows read from precomputed native price indexes instead of crawling or fetching during the request.',
    blocksFinalCostingWhen: [
      'Serving requires request-time crawl, scraping, or external fetch.',
      'The region/unit cell has not been precomputed or explicitly degraded.',
    ],
    proofRequired: ['serving index key', 'region cell', 'unit basis', 'computed_at timestamp'],
  },
  {
    id: 'user_data_boundary',
    rule: 'User input can personalize context but can never become canonical market price truth.',
    blocksFinalCostingWhen: [
      'A user-entered price is treated as market truth.',
      'Receipt or override data is promoted without source proof and validation.',
    ],
    proofRequired: ['source type', 'user-signal isolation', 'validation status'],
  },
  {
    id: 'external_dependency_boundary',
    rule: 'No external company can be a critical dependency for serving core PIE answers.',
    blocksFinalCostingWhen: [
      'A paid/vendor API is required at serve time.',
      'The answer cannot be served from local/native storage during external outage.',
    ],
    proofRequired: ['native fallback path', 'local cache/index proof', 'outage behavior'],
  },
  {
    id: 'accuracy_honesty',
    rule: 'Every served price carries provenance, freshness, confidence, and visible uncertainty.',
    blocksFinalCostingWhen: [
      'Freshness is unknown.',
      'Confidence is uncalibrated or hidden.',
      'The UI treats an estimate as direct proof.',
    ],
    proofRequired: ['observed_at', 'source lineage', 'confidence bucket', 'visible label'],
  },
  {
    id: 'self_repair',
    rule: 'Stale, contradictory, missing, or anomalous prices route to native repair rather than silently serving as truth.',
    blocksFinalCostingWhen: [
      'No repair path exists for stale or low-confidence cells.',
      'An anomaly is known but not quarantined or degraded.',
    ],
    proofRequired: ['repair queue entry', 'staleness policy', 'anomaly status'],
  },
  {
    id: 'census_denominator',
    rule: 'Coverage is measured against the ingredient census denominator, not against only what PIE happens to know today.',
    blocksFinalCostingWhen: [
      'Coverage is claimed without census denominator.',
      'A canonical ingredient lacks category, unit basis, or active/inactive state.',
    ],
    proofRequired: ['census ingredient id', 'category', 'standard unit', 'coverage cell'],
  },
  {
    id: 'compound_learning',
    rule: 'Validation, repair outcomes, and new observations feed future confidence and normalization decisions.',
    blocksFinalCostingWhen: [
      'Accuracy failures are logged without updating confidence or repair priorities.',
      'New observations cannot improve future serving behavior.',
    ],
    proofRequired: ['validation result', 'confidence recalibration path', 'learning event'],
  },
  {
    id: 'access_reliability',
    rule: 'All users get reliable answers from native storage with degraded labels instead of brittle blank states.',
    blocksFinalCostingWhen: [
      'A user receives no answer for an in-census ingredient without a labeled fallback.',
      'Protected access or regional availability changes the honesty of the returned number.',
    ],
    proofRequired: ['fallback label', 'role-safe response shape', 'regional degradation reason'],
  },
]

export const PIE_PRICING_IDENTITIES: PiePricingIdentity[] = [
  {
    id: 'plant.tomato.fruit.fresh',
    canonicalName: 'fresh tomato',
    family: 'tomato',
    biologicalSource: 'Solanum lycopersicum',
    ediblePart: 'fruit',
    culinaryForm: 'fresh whole produce',
    processingState: 'raw',
    priceFamily: 'tomato-fresh',
    buyableEquivalenceGroup: ['roma tomato', 'vine tomato', 'beefsteak tomato'],
    unsafeEquivalence: ['tomato paste', 'passata', 'sun-dried tomato', 'tomato sauce'],
    unitBasis: ['lb', 'kg', 'each'],
    yieldBasis: 'trimmed edible weight',
    substitutionGroup: 'fresh tomato',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['variety ambiguity', 'each-weight ambiguity', 'seasonal volatility'],
    proofRequirements: ['freshness date', 'store or vendor', 'unit conversion basis'],
  },
  {
    id: 'plant.tomato.fruit.canned-drained',
    canonicalName: 'canned tomato, drained',
    family: 'canned_goods',
    biologicalSource: 'Solanum lycopersicum',
    ediblePart: 'fruit',
    culinaryForm: 'canned pieces',
    processingState: 'canned',
    priceFamily: 'tomato-canned-drained',
    buyableEquivalenceGroup: ['canned diced tomato', 'canned whole peeled tomato'],
    unsafeEquivalence: ['fresh tomato', 'tomato paste', 'tomato puree'],
    unitBasis: ['can', 'oz', 'g'],
    yieldBasis: 'drained weight',
    substitutionGroup: 'processed tomato',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['drained-weight missing', 'can size ambiguity'],
    proofRequirements: ['net weight', 'drained weight', 'can size'],
  },
  {
    id: 'plant.tomato.fruit.paste',
    canonicalName: 'tomato paste',
    family: 'tomato',
    biologicalSource: 'Solanum lycopersicum',
    ediblePart: 'concentrated fruit pulp',
    culinaryForm: 'paste',
    processingState: 'concentrated cooked',
    priceFamily: 'tomato-paste',
    buyableEquivalenceGroup: ['tomato paste tube', 'tomato paste can'],
    unsafeEquivalence: ['fresh tomato', 'canned tomato', 'tomato sauce'],
    unitBasis: ['can', 'tube', 'tbsp', 'g', 'oz'],
    yieldBasis: 'concentrate density',
    substitutionGroup: 'processed tomato',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['concentration mismatch', 'can-to-tablespoon density'],
    proofRequirements: ['net weight', 'density or spoon conversion', 'package size'],
  },
  {
    id: 'plant.coriander.leaf.fresh',
    canonicalName: 'fresh cilantro leaf',
    family: 'coriander',
    biologicalSource: 'Coriandrum sativum',
    ediblePart: 'leaf and stem',
    culinaryForm: 'fresh bunch herb',
    processingState: 'raw',
    priceFamily: 'cilantro-fresh',
    buyableEquivalenceGroup: ['cilantro bunch', 'fresh coriander leaf'],
    unsafeEquivalence: ['coriander seed', 'ground coriander', 'cilantro lime marinade'],
    unitBasis: ['bunch', 'oz', 'g', 'cup'],
    yieldBasis: 'picked leaf yield from bunch',
    substitutionGroup: 'fresh herb',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['leaf versus seed false friend', 'bunch yield ambiguity'],
    proofRequirements: ['bunch size', 'picked-leaf yield', 'freshness date'],
  },
  {
    id: 'plant.coriander.seed.ground',
    canonicalName: 'ground coriander seed',
    family: 'coriander',
    biologicalSource: 'Coriandrum sativum',
    ediblePart: 'seed',
    culinaryForm: 'ground spice',
    processingState: 'dried ground',
    priceFamily: 'coriander-seed-ground',
    buyableEquivalenceGroup: ['ground coriander', 'coriander powder'],
    unsafeEquivalence: ['fresh cilantro leaf', 'cilantro bunch'],
    unitBasis: ['jar', 'oz', 'g', 'tsp'],
    yieldBasis: 'spice density',
    substitutionGroup: 'warm spice',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['leaf versus seed false friend', 'jar size ambiguity'],
    proofRequirements: ['jar net weight', 'spoon density', 'brand or bulk proof'],
  },
  {
    id: 'plant.chile.fruit.fresh',
    canonicalName: 'fresh chile pepper',
    family: 'chile',
    biologicalSource: 'Capsicum species',
    ediblePart: 'fruit',
    culinaryForm: 'fresh pepper',
    processingState: 'raw',
    priceFamily: 'chile-fresh',
    buyableEquivalenceGroup: ['jalapeno', 'serrano', 'poblano', 'fresno chile'],
    unsafeEquivalence: ['dried chile', 'chile powder', 'hot sauce', 'peppercorn'],
    unitBasis: ['lb', 'each', 'oz'],
    yieldBasis: 'trimmed seeded yield',
    substitutionGroup: 'fresh chile',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['variety heat level', 'each-weight ambiguity'],
    proofRequirements: ['variety', 'unit weight', 'freshness date'],
  },
  {
    id: 'plant.chile.fruit.dried',
    canonicalName: 'dried chile',
    family: 'chile',
    biologicalSource: 'Capsicum species',
    ediblePart: 'fruit',
    culinaryForm: 'dried whole pepper',
    processingState: 'dried',
    priceFamily: 'chile-dried',
    buyableEquivalenceGroup: ['guajillo chile', 'ancho chile', 'arbol chile'],
    unsafeEquivalence: ['fresh chile pepper', 'hot sauce', 'chile paste'],
    unitBasis: ['bag', 'oz', 'g', 'each'],
    yieldBasis: 'stem and seed removal',
    substitutionGroup: 'dried chile',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['variety mismatch', 'hydration yield'],
    proofRequirements: ['variety', 'bag net weight', 'stem/seed trim basis'],
  },
  {
    id: 'animal.cow.milk.heavy-cream',
    canonicalName: 'heavy cream',
    family: 'dairy_cream',
    biologicalSource: 'cow milk',
    ediblePart: 'milk fat emulsion',
    culinaryForm: 'liquid dairy cream',
    processingState: 'pasteurized',
    priceFamily: 'dairy-heavy-cream',
    buyableEquivalenceGroup: ['heavy whipping cream', 'heavy cream'],
    unsafeEquivalence: ['sour cream', 'coconut cream', 'creme fraiche', 'half and half'],
    unitBasis: ['fl oz', 'pint', 'quart', 'ml', 'cup'],
    yieldBasis: 'liquid volume',
    substitutionGroup: 'cream',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['fat percentage mismatch', 'dairy versus non-dairy substitution'],
    proofRequirements: ['fat class', 'package volume', 'freshness date'],
  },
  {
    id: 'plant.coconut.endosperm.cream',
    canonicalName: 'coconut cream',
    family: 'dairy_cream',
    biologicalSource: 'Cocos nucifera',
    ediblePart: 'endosperm extract',
    culinaryForm: 'canned plant cream',
    processingState: 'extracted canned',
    priceFamily: 'coconut-cream',
    buyableEquivalenceGroup: ['coconut cream can'],
    unsafeEquivalence: ['heavy cream', 'coconut milk', 'cream of coconut'],
    unitBasis: ['can', 'fl oz', 'ml', 'g'],
    yieldBasis: 'can net volume',
    substitutionGroup: 'non-dairy cream',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['sweetened cream of coconut false friend'],
    proofRequirements: ['can size', 'sweetened/unsweetened label', 'fat content'],
  },
  {
    id: 'plant.soybean.seed.fresh-edamame',
    canonicalName: 'edamame',
    family: 'soy',
    biologicalSource: 'Glycine max',
    ediblePart: 'immature seed',
    culinaryForm: 'fresh or frozen podded bean',
    processingState: 'fresh or frozen',
    priceFamily: 'soy-edamame',
    buyableEquivalenceGroup: ['shelled edamame', 'edamame pods'],
    unsafeEquivalence: ['tofu', 'soy sauce', 'soy milk', 'soy oil'],
    unitBasis: ['lb', 'bag', 'oz', 'g'],
    yieldBasis: 'shelled seed yield if pods',
    substitutionGroup: 'green legume',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['pod versus shelled yield'],
    proofRequirements: ['shelled state', 'bag weight', 'fresh/frozen state'],
  },
  {
    id: 'plant.soybean.curd.tofu',
    canonicalName: 'tofu',
    family: 'soy',
    biologicalSource: 'Glycine max',
    ediblePart: 'coagulated soy milk curd',
    culinaryForm: 'block curd',
    processingState: 'processed',
    priceFamily: 'soy-tofu',
    buyableEquivalenceGroup: ['firm tofu', 'extra firm tofu', 'silken tofu'],
    unsafeEquivalence: ['edamame', 'soy sauce', 'tempeh', 'soy milk'],
    unitBasis: ['block', 'oz', 'g'],
    yieldBasis: 'drained block weight',
    substitutionGroup: 'plant protein',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['firmness mismatch', 'drained weight ambiguity'],
    proofRequirements: ['firmness', 'block net weight', 'drained weight'],
  },
  {
    id: 'plant.wheat.seed.flour.ap',
    canonicalName: 'all purpose flour',
    family: 'wheat',
    biologicalSource: 'Triticum aestivum',
    ediblePart: 'milled seed endosperm',
    culinaryForm: 'white flour',
    processingState: 'milled refined',
    priceFamily: 'wheat-flour-ap',
    buyableEquivalenceGroup: ['all purpose flour', 'ap flour'],
    unsafeEquivalence: ['bread flour', 'semolina', 'gluten-free flour', 'wheat berries'],
    unitBasis: ['lb', 'bag', 'g', 'cup'],
    yieldBasis: 'flour density',
    substitutionGroup: 'wheat flour',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['flour grade mismatch', 'cup-to-gram density'],
    proofRequirements: ['bag weight', 'flour grade', 'density for volume recipes'],
  },
  {
    id: 'animal.chicken.muscle.thigh-bone-in',
    canonicalName: 'bone-in chicken thigh',
    family: 'chicken',
    biologicalSource: 'Gallus gallus domesticus',
    ediblePart: 'leg muscle with bone',
    culinaryForm: 'bone-in cut',
    processingState: 'raw',
    priceFamily: 'chicken-thigh-bone-in',
    buyableEquivalenceGroup: ['bone-in chicken thighs'],
    unsafeEquivalence: [
      'boneless chicken thigh',
      'chicken breast',
      'ground chicken',
      'chicken stock',
    ],
    unitBasis: ['lb', 'kg', 'case'],
    yieldBasis: 'bone and skin trim plus cook loss',
    substitutionGroup: 'chicken dark meat',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['bone yield', 'skin-on versus skinless', 'case pack'],
    proofRequirements: ['bone/skin state', 'case pack size', 'edible yield'],
  },
  {
    id: 'animal.chicken.muscle.breast-boneless',
    canonicalName: 'boneless chicken breast',
    family: 'chicken',
    biologicalSource: 'Gallus gallus domesticus',
    ediblePart: 'breast muscle',
    culinaryForm: 'boneless cut',
    processingState: 'raw',
    priceFamily: 'chicken-breast-boneless',
    buyableEquivalenceGroup: ['boneless skinless chicken breast'],
    unsafeEquivalence: ['bone-in chicken thigh', 'whole chicken', 'prepared chicken entree'],
    unitBasis: ['lb', 'kg', 'case'],
    yieldBasis: 'trim loss',
    substitutionGroup: 'chicken white meat',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['case pack', 'enhanced/brined product'],
    proofRequirements: ['boneless/skinless state', 'case pack size', 'trim yield'],
  },
  {
    id: 'plant.citrus.fruit.lemon-fresh',
    canonicalName: 'fresh lemon',
    family: 'citrus',
    biologicalSource: 'Citrus limon',
    ediblePart: 'fruit',
    culinaryForm: 'fresh whole citrus',
    processingState: 'raw',
    priceFamily: 'lemon-fresh',
    buyableEquivalenceGroup: ['lemon', 'fresh lemon'],
    unsafeEquivalence: ['lemon juice bottle', 'lemon zest', 'lemon extract', 'lemon oil'],
    unitBasis: ['each', 'lb', 'case'],
    yieldBasis: 'juice and zest yield per fruit',
    substitutionGroup: 'acid citrus',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['juice yield', 'each-weight ambiguity'],
    proofRequirements: ['fruit count or weight', 'juice yield', 'freshness date'],
  },
  {
    id: 'plant.citrus.extract.lemon-oil',
    canonicalName: 'lemon oil',
    family: 'extract',
    biologicalSource: 'Citrus limon',
    ediblePart: 'peel volatile oil',
    culinaryForm: 'extract oil',
    processingState: 'extracted',
    priceFamily: 'lemon-oil',
    buyableEquivalenceGroup: ['lemon oil extract'],
    unsafeEquivalence: ['fresh lemon', 'lemon juice', 'lemon zest'],
    unitBasis: ['bottle', 'fl oz', 'ml', 'drop'],
    yieldBasis: 'extract potency',
    substitutionGroup: 'citrus extract',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['potency mismatch', 'extract versus fresh false equivalence'],
    proofRequirements: ['bottle volume', 'potency label', 'food grade proof'],
  },
  {
    id: 'plant.sugarcane.crystal.white',
    canonicalName: 'granulated sugar',
    family: 'sugar',
    biologicalSource: 'Saccharum officinarum or Beta vulgaris',
    ediblePart: 'refined sucrose',
    culinaryForm: 'crystal sweetener',
    processingState: 'refined',
    priceFamily: 'sugar-granulated',
    buyableEquivalenceGroup: ['white sugar', 'granulated sugar'],
    unsafeEquivalence: ['brown sugar', 'powdered sugar', 'molasses', 'maple syrup'],
    unitBasis: ['lb', 'bag', 'g', 'cup'],
    yieldBasis: 'sugar density',
    substitutionGroup: 'dry sugar',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['beet/cane marketing difference', 'cup-to-gram density'],
    proofRequirements: ['bag weight', 'sugar form', 'density for volume recipes'],
  },
  {
    id: 'plant.sugarcane.syrup.molasses',
    canonicalName: 'molasses',
    family: 'sugar',
    biologicalSource: 'sugarcane or sugar beet syrup',
    ediblePart: 'refining syrup',
    culinaryForm: 'viscous syrup',
    processingState: 'refined byproduct',
    priceFamily: 'molasses',
    buyableEquivalenceGroup: ['molasses', 'unsulphured molasses'],
    unsafeEquivalence: ['granulated sugar', 'brown sugar', 'maple syrup'],
    unitBasis: ['jar', 'fl oz', 'ml', 'tbsp'],
    yieldBasis: 'syrup density',
    substitutionGroup: 'liquid sweetener',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['blackstrap versus light molasses', 'volume-to-weight conversion'],
    proofRequirements: ['jar volume', 'molasses type', 'density'],
  },
  {
    id: 'animal.shrimp.muscle.shell-on',
    canonicalName: 'shell-on shrimp',
    family: 'seafood',
    biologicalSource: 'shrimp species',
    ediblePart: 'tail muscle with shell',
    culinaryForm: 'shell-on seafood',
    processingState: 'fresh or frozen raw',
    priceFamily: 'shrimp-shell-on',
    buyableEquivalenceGroup: ['shell-on shrimp', 'headless shell-on shrimp'],
    unsafeEquivalence: ['peeled shrimp', 'cooked shrimp', 'shrimp cocktail'],
    unitBasis: ['lb', 'count/lb', 'bag'],
    yieldBasis: 'shell removal yield',
    substitutionGroup: 'shrimp',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['count size', 'shell yield', 'frozen glaze'],
    proofRequirements: ['count per pound', 'shell/head state', 'edible yield'],
  },
  {
    id: 'animal.salmon.muscle.fillet',
    canonicalName: 'salmon fillet',
    family: 'seafood',
    biologicalSource: 'Salmo or Oncorhynchus species',
    ediblePart: 'muscle fillet',
    culinaryForm: 'fish fillet',
    processingState: 'fresh or frozen raw',
    priceFamily: 'salmon-fillet',
    buyableEquivalenceGroup: ['salmon fillet', 'atlantic salmon fillet'],
    unsafeEquivalence: ['smoked salmon', 'canned salmon', 'cod fillet'],
    unitBasis: ['lb', 'kg', 'case'],
    yieldBasis: 'skin and trim yield',
    substitutionGroup: 'fish fillet',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['species mismatch', 'wild/farmed difference', 'skin-on yield'],
    proofRequirements: ['species', 'fresh/frozen state', 'skin state', 'trim yield'],
  },
  {
    id: 'animal.cod.muscle.fillet',
    canonicalName: 'cod fillet',
    family: 'seafood',
    biologicalSource: 'Gadus species',
    ediblePart: 'muscle fillet',
    culinaryForm: 'fish fillet',
    processingState: 'fresh or frozen raw',
    priceFamily: 'cod-fillet',
    buyableEquivalenceGroup: ['cod fillet', 'atlantic cod fillet'],
    unsafeEquivalence: ['salmon fillet', 'salt cod', 'fish sticks'],
    unitBasis: ['lb', 'kg', 'case'],
    yieldBasis: 'trim yield',
    substitutionGroup: 'white fish fillet',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['species substitution', 'frozen block glaze'],
    proofRequirements: ['species', 'fresh/frozen state', 'trim yield'],
  },
  {
    id: 'plant.olive.fruit.oil-extra-virgin',
    canonicalName: 'extra virgin olive oil',
    family: 'oil',
    biologicalSource: 'Olea europaea',
    ediblePart: 'fruit oil',
    culinaryForm: 'pressed oil',
    processingState: 'cold pressed/refined class',
    priceFamily: 'olive-oil-evoo',
    buyableEquivalenceGroup: ['extra virgin olive oil', 'evoo'],
    unsafeEquivalence: ['olive oil blend', 'vegetable oil', 'olive brine'],
    unitBasis: ['bottle', 'fl oz', 'liter', 'tbsp'],
    yieldBasis: 'liquid volume',
    substitutionGroup: 'cooking oil',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['grade mismatch', 'bottle volume'],
    proofRequirements: ['oil grade', 'bottle volume', 'source freshness'],
  },
  {
    id: 'plant.basil.leaf.fresh',
    canonicalName: 'fresh basil',
    family: 'herb',
    biologicalSource: 'Ocimum basilicum',
    ediblePart: 'leaf',
    culinaryForm: 'fresh herb',
    processingState: 'raw',
    priceFamily: 'basil-fresh',
    buyableEquivalenceGroup: ['fresh basil', 'basil bunch'],
    unsafeEquivalence: ['dried basil', 'basil pesto', 'thai basil if recipe-specific'],
    unitBasis: ['bunch', 'oz', 'g', 'cup'],
    yieldBasis: 'picked leaf yield',
    substitutionGroup: 'fresh soft herb',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['variety mismatch', 'picked yield'],
    proofRequirements: ['bunch size', 'picked-leaf yield', 'freshness date'],
  },
  {
    id: 'plant.cumin.seed.ground',
    canonicalName: 'ground cumin',
    family: 'spice',
    biologicalSource: 'Cuminum cyminum',
    ediblePart: 'seed',
    culinaryForm: 'ground spice',
    processingState: 'dried ground',
    priceFamily: 'cumin-ground',
    buyableEquivalenceGroup: ['ground cumin'],
    unsafeEquivalence: ['cumin seed', 'cumin blend', 'taco seasoning'],
    unitBasis: ['jar', 'oz', 'g', 'tsp'],
    yieldBasis: 'spice density',
    substitutionGroup: 'warm spice',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['blend contamination', 'jar size'],
    proofRequirements: ['net weight', 'single-spice label', 'spoon density'],
  },
  {
    id: 'plant.blueberry.fruit.frozen',
    canonicalName: 'frozen blueberries',
    family: 'frozen_goods',
    biologicalSource: 'Vaccinium species',
    ediblePart: 'fruit',
    culinaryForm: 'frozen fruit',
    processingState: 'frozen',
    priceFamily: 'blueberry-frozen',
    buyableEquivalenceGroup: ['frozen blueberries'],
    unsafeEquivalence: ['fresh blueberries', 'blueberry pie filling', 'dried blueberries'],
    unitBasis: ['bag', 'lb', 'oz', 'g'],
    yieldBasis: 'thaw-loss if relevant',
    substitutionGroup: 'berry',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['fresh/frozen mismatch', 'thaw loss'],
    proofRequirements: ['bag weight', 'frozen state', 'thaw-loss basis'],
  },
  {
    id: 'plant.soybean.fermented.miso',
    canonicalName: 'miso',
    family: 'fermented_goods',
    biologicalSource: 'Glycine max and koji culture',
    ediblePart: 'fermented paste',
    culinaryForm: 'fermented paste',
    processingState: 'fermented',
    priceFamily: 'miso',
    buyableEquivalenceGroup: ['white miso', 'red miso'],
    unsafeEquivalence: ['soy sauce', 'tofu', 'soybean'],
    unitBasis: ['tub', 'oz', 'g', 'tbsp'],
    yieldBasis: 'paste density',
    substitutionGroup: 'fermented soy paste',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['miso type', 'paste density'],
    proofRequirements: ['miso type', 'tub weight', 'spoon density'],
  },
  {
    id: 'additive.xanthan-gum.powder',
    canonicalName: 'xanthan gum',
    family: 'additive',
    biologicalSource: 'microbial fermentation product',
    ediblePart: 'polysaccharide powder',
    culinaryForm: 'powder additive',
    processingState: 'refined additive',
    priceFamily: 'xanthan-gum',
    buyableEquivalenceGroup: ['xanthan gum powder'],
    unsafeEquivalence: ['guar gum', 'gelatin', 'cornstarch'],
    unitBasis: ['bag', 'oz', 'g', 'tsp'],
    yieldBasis: 'powder density',
    substitutionGroup: 'thickener',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['additive potency', 'spoon density'],
    proofRequirements: ['net weight', 'food grade proof', 'spoon density'],
  },
  {
    id: 'plant.bean.seed.dried',
    canonicalName: 'dried beans',
    family: 'legume',
    biologicalSource: 'Phaseolus vulgaris',
    ediblePart: 'dry seed',
    culinaryForm: 'dried whole bean',
    processingState: 'dried',
    priceFamily: 'bean-dried',
    buyableEquivalenceGroup: ['dried black beans', 'dried pinto beans'],
    unsafeEquivalence: ['canned beans', 'cooked beans', 'refried beans'],
    unitBasis: ['bag', 'lb', 'oz', 'g'],
    yieldBasis: 'hydration cooked yield',
    substitutionGroup: 'dry legume',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['dried-to-cooked yield', 'variety mismatch'],
    proofRequirements: ['bag weight', 'bean variety', 'hydration yield'],
  },
  {
    id: 'plant.vanilla.fruit.extract',
    canonicalName: 'vanilla extract',
    family: 'extract',
    biologicalSource: 'Vanilla planifolia',
    ediblePart: 'fruit extract',
    culinaryForm: 'alcohol extract',
    processingState: 'extracted',
    priceFamily: 'vanilla-extract',
    buyableEquivalenceGroup: ['pure vanilla extract'],
    unsafeEquivalence: ['vanilla bean', 'imitation vanilla', 'vanilla paste'],
    unitBasis: ['bottle', 'fl oz', 'ml', 'tsp'],
    yieldBasis: 'extract potency',
    substitutionGroup: 'vanilla',
    fallbackOrder: commonDirectFallbacks,
    pricingRisks: ['pure versus imitation', 'potency mismatch'],
    proofRequirements: ['extract type', 'bottle volume', 'food grade proof'],
  },
]

export const UNIT_YIELD_TRANSFORM_EXAMPLES: UnitYieldTransformExample[] = [
  {
    id: 'cilantro-bunch-to-cup',
    identityId: 'plant.coriander.leaf.fresh',
    purchaseUnit: 'bunch',
    recipeUnit: 'cup',
    requiredConversionProof: ['bunch size', 'picked-leaf yield'],
    yieldBasis: 'picked leaf yield from bunch',
    reliabilityOutcome: 'blocked',
  },
  {
    id: 'basil-bunch-to-grams',
    identityId: 'plant.basil.leaf.fresh',
    purchaseUnit: 'bunch',
    recipeUnit: 'g',
    requiredConversionProof: ['bunch size', 'picked-leaf yield'],
    yieldBasis: 'picked leaf yield',
    reliabilityOutcome: 'blocked',
  },
  {
    id: 'shell-on-shrimp-to-peeled-lb',
    identityId: 'animal.shrimp.muscle.shell-on',
    purchaseUnit: 'lb',
    recipeUnit: 'lb peeled',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'shell removal yield',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'bone-in-thigh-case-to-cooked-lb',
    identityId: 'animal.chicken.muscle.thigh-bone-in',
    purchaseUnit: 'case',
    recipeUnit: 'lb cooked meat',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'bone and skin trim plus cook loss',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'canned-tomato-can-to-drained-oz',
    identityId: 'plant.tomato.fruit.canned-drained',
    purchaseUnit: 'can',
    recipeUnit: 'oz drained',
    requiredConversionProof: ['net weight', 'drained weight'],
    yieldBasis: 'drained weight',
    reliabilityOutcome: 'blocked',
  },
  {
    id: 'tomato-paste-can-to-tbsp',
    identityId: 'plant.tomato.fruit.paste',
    purchaseUnit: 'can',
    recipeUnit: 'tbsp',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'concentrate density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'flour-bag-to-cup',
    identityId: 'plant.wheat.seed.flour.ap',
    purchaseUnit: 'bag',
    recipeUnit: 'cup',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'flour density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'molasses-jar-to-tbsp',
    identityId: 'plant.sugarcane.syrup.molasses',
    purchaseUnit: 'jar',
    recipeUnit: 'tbsp',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'syrup density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'ground-coriander-jar-to-tsp',
    identityId: 'plant.coriander.seed.ground',
    purchaseUnit: 'jar',
    recipeUnit: 'tsp',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'spice density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'cumin-jar-to-tsp',
    identityId: 'plant.cumin.seed.ground',
    purchaseUnit: 'jar',
    recipeUnit: 'tsp',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'spice density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'xanthan-bag-to-grams',
    identityId: 'additive.xanthan-gum.powder',
    purchaseUnit: 'bag',
    recipeUnit: 'g',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'powder density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'vanilla-bottle-to-tsp',
    identityId: 'plant.vanilla.fruit.extract',
    purchaseUnit: 'bottle',
    recipeUnit: 'tsp',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'extract potency',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'lemon-oil-bottle-to-drop',
    identityId: 'plant.citrus.extract.lemon-oil',
    purchaseUnit: 'bottle',
    recipeUnit: 'drop',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'extract potency',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'fresh-lemon-each-to-juice',
    identityId: 'plant.citrus.fruit.lemon-fresh',
    purchaseUnit: 'each',
    recipeUnit: 'fl oz juice',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'juice and zest yield per fruit',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'fresh-lemon-case-to-zest',
    identityId: 'plant.citrus.fruit.lemon-fresh',
    purchaseUnit: 'case',
    recipeUnit: 'g zest',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'juice and zest yield per fruit',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'edamame-pods-to-shelled-oz',
    identityId: 'plant.soybean.seed.fresh-edamame',
    purchaseUnit: 'bag',
    recipeUnit: 'oz shelled',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'shelled seed yield if pods',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'tofu-block-to-drained-grams',
    identityId: 'plant.soybean.curd.tofu',
    purchaseUnit: 'block',
    recipeUnit: 'g drained',
    requiredConversionProof: ['net weight', 'drained weight'],
    yieldBasis: 'drained block weight',
    reliabilityOutcome: 'blocked',
  },
  {
    id: 'salmon-fillet-lb-to-trimmed-lb',
    identityId: 'animal.salmon.muscle.fillet',
    purchaseUnit: 'lb',
    recipeUnit: 'lb trimmed',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'skin and trim yield',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'cod-case-to-trimmed-lb',
    identityId: 'animal.cod.muscle.fillet',
    purchaseUnit: 'case',
    recipeUnit: 'lb trimmed',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'trim yield',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'boneless-breast-case-to-lb',
    identityId: 'animal.chicken.muscle.breast-boneless',
    purchaseUnit: 'case',
    recipeUnit: 'lb',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'trim loss',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'granulated-sugar-bag-to-cup',
    identityId: 'plant.sugarcane.crystal.white',
    purchaseUnit: 'bag',
    recipeUnit: 'cup',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'sugar density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'evoo-bottle-to-tbsp',
    identityId: 'plant.olive.fruit.oil-extra-virgin',
    purchaseUnit: 'bottle',
    recipeUnit: 'tbsp',
    requiredConversionProof: ['matching purchase and recipe unit'],
    yieldBasis: 'liquid volume',
    reliabilityOutcome: 'allowed',
  },
  {
    id: 'heavy-cream-quart-to-cup',
    identityId: 'animal.cow.milk.heavy-cream',
    purchaseUnit: 'quart',
    recipeUnit: 'cup',
    requiredConversionProof: ['matching purchase and recipe unit'],
    yieldBasis: 'liquid volume',
    reliabilityOutcome: 'allowed',
  },
  {
    id: 'coconut-cream-can-to-fl-oz',
    identityId: 'plant.coconut.endosperm.cream',
    purchaseUnit: 'can',
    recipeUnit: 'fl oz',
    requiredConversionProof: ['matching purchase and recipe unit'],
    yieldBasis: 'can net volume',
    reliabilityOutcome: 'allowed',
  },
  {
    id: 'fresh-tomato-each-to-lb',
    identityId: 'plant.tomato.fruit.fresh',
    purchaseUnit: 'each',
    recipeUnit: 'lb',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'trimmed edible weight',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'fresh-chile-each-to-grams',
    identityId: 'plant.chile.fruit.fresh',
    purchaseUnit: 'each',
    recipeUnit: 'g seeded',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'trimmed seeded yield',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'dried-chile-bag-to-rehydrated-grams',
    identityId: 'plant.chile.fruit.dried',
    purchaseUnit: 'bag',
    recipeUnit: 'g rehydrated',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'stem and seed removal',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'miso-tub-to-tbsp',
    identityId: 'plant.soybean.fermented.miso',
    purchaseUnit: 'tub',
    recipeUnit: 'tbsp',
    requiredConversionProof: ['can size or net weight', 'density or spoon conversion'],
    yieldBasis: 'paste density',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'frozen-blueberry-bag-to-thawed-cup',
    identityId: 'plant.blueberry.fruit.frozen',
    purchaseUnit: 'bag',
    recipeUnit: 'cup thawed',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'thaw-loss if relevant',
    reliabilityOutcome: 'review_required',
  },
  {
    id: 'dried-beans-bag-to-cooked-cup',
    identityId: 'plant.bean.seed.dried',
    purchaseUnit: 'bag',
    recipeUnit: 'cup cooked',
    requiredConversionProof: ['trim yield', 'edible yield'],
    yieldBasis: 'hydration cooked yield',
    reliabilityOutcome: 'review_required',
  },
]

export const SUBSTITUTION_TYPE_RULES: SubstitutionTypeRule[] = [
  {
    type: 'culinary_function',
    approvalMode: 'client_required_before_final_costing',
    requiredChecks: [
      'culinary function proof',
      'client approval',
      'unit/yield proof',
      'price delta',
    ],
    pricingRule:
      'Cost the replacement identity and label the delta; never rewrite the original ingredient price.',
    finalCostingBeforeApproval: 'blocked',
    auditTrail: [
      'original identity',
      'replacement identity',
      'reason',
      'approval trail',
      'price delta',
    ],
    example: {
      original: 'fresh basil',
      replacement: 'fresh mint',
      reason: 'culinary herb swap',
      expectedState: 'allowed_with_estimate',
    },
  },
  {
    type: 'dietary_allergen',
    approvalMode: 'client_required_before_final_costing',
    requiredChecks: [
      'dietary check',
      'allergen check',
      'client approval',
      'unit/yield proof',
      'price proof',
    ],
    pricingRule:
      'Block final price costing until allergen/dietary checks and client approval are present.',
    finalCostingBeforeApproval: 'blocked',
    auditTrail: ['allergen removed', 'replacement identity', 'client approval', 'menu impact'],
    example: {
      original: 'shell-on shrimp',
      replacement: 'cod fillet',
      reason: 'shellfish allergen replacement',
      expectedState: 'allowed_with_estimate',
    },
  },
  {
    type: 'availability',
    approvalMode: 'chef_required',
    requiredChecks: ['availability proof', 'unit/yield proof', 'replacement price proof'],
    pricingRule:
      'Allow chef operational costing after proof; surface client approval if menu identity changes.',
    finalCostingBeforeApproval: 'review_required',
    auditTrail: [
      'stockout proof',
      'replacement identity',
      'replacement source',
      'chef decision',
      'price delta',
    ],
    example: {
      original: 'fresh tomato',
      replacement: 'canned tomato, drained',
      reason: 'produce unavailable',
      expectedState: 'review_required',
    },
  },
  {
    type: 'vendor',
    approvalMode: 'chef_allowed_with_audit',
    requiredChecks: ['vendor SKU proof', 'pack proof', 'unit/yield proof', 'price proof'],
    pricingRule:
      'A vendor alternative can price the replacement SKU without changing canonical truth.',
    finalCostingBeforeApproval: 'allowed_with_estimate',
    auditTrail: ['vendor', 'SKU', 'replacement identity', 'pack size', 'unit basis', 'price delta'],
    example: {
      original: 'boneless chicken breast',
      replacement: 'boneless chicken breast case pack',
      reason: 'vendor case-pack alternative',
      expectedState: 'allowed_with_estimate',
    },
  },
  {
    type: 'cost_control',
    approvalMode: 'client_required_before_final_costing',
    requiredChecks: [
      'client approval',
      'dietary check',
      'allergen check',
      'unit/yield proof',
      'price delta',
    ],
    pricingRule: 'Block client-facing final costing until the cheaper replacement is approved.',
    finalCostingBeforeApproval: 'blocked',
    auditTrail: ['margin reason', 'replacement identity', 'approval trail', 'client-facing impact'],
    example: {
      original: 'salmon fillet',
      replacement: 'cod fillet',
      reason: 'cheaper commodity substitution',
      expectedState: 'allowed_with_estimate',
    },
  },
  {
    type: 'client_approved',
    approvalMode: 'client_required_before_final_costing',
    requiredChecks: [
      'approval trail',
      'dietary check',
      'allergen check',
      'unit/yield proof',
      'price proof',
    ],
    pricingRule: 'Use replacement cost after approval and preserve original ingredient history.',
    finalCostingBeforeApproval: 'blocked',
    auditTrail: ['client approval', 'replacement identity', 'price delta', 'menu version'],
    example: {
      original: 'heavy cream',
      replacement: 'coconut cream',
      reason: 'approved non-dairy cream swap',
      expectedState: 'allowed_with_estimate',
    },
  },
  {
    type: 'chef_operational',
    approvalMode: 'chef_allowed_with_audit',
    requiredChecks: ['chef decision', 'unit/yield proof', 'price proof'],
    pricingRule: 'Chef-only operational substitutions can cost internally but remain labeled.',
    finalCostingBeforeApproval: 'allowed_with_estimate',
    auditTrail: ['chef decision', 'operational reason', 'replacement identity', 'price delta'],
    example: {
      original: 'all purpose flour',
      replacement: 'gluten-free flour blend',
      reason: 'chef-only prep adjustment pending client review',
      expectedState: 'allowed_with_estimate',
    },
  },
  {
    type: 'emergency',
    approvalMode: 'emergency_allowed_then_reconcile',
    requiredChecks: [
      'emergency reason',
      'dietary check',
      'allergen check',
      'post-event reconciliation',
    ],
    pricingRule:
      'Allow operational estimate in the moment; require reconciliation before closing final costing.',
    finalCostingBeforeApproval: 'review_required',
    auditTrail: ['emergency reason', 'replacement identity', 'time', 'reconciliation note'],
    example: {
      original: 'fresh chile pepper',
      replacement: 'dried chile',
      reason: 'last-minute vendor outage',
      expectedState: 'review_required',
    },
  },
]

export const FALLBACK_DECISION_TABLE: FallbackDecision[] = [
  {
    step: 'chef_override',
    allowedWhen: ['chef explicitly confirmed the price and unit'],
    blockedWhen: ['override is stale or unit is missing'],
    confidenceCap: 0.98,
    requiredProof: ['chef confirmation', 'unit', 'timestamp'],
    visibleLabel: 'Chef confirmed price',
    finalCostingState: 'allowed',
  },
  {
    step: 'receipt_proof',
    allowedWhen: ['tenant receipt or vendor invoice proves the item'],
    blockedWhen: ['receipt is from another tenant or lacks unit'],
    confidenceCap: 0.95,
    requiredProof: ['tenant receipt', 'purchase unit', 'purchase date'],
    visibleLabel: 'Receipt proved price',
    finalCostingState: 'allowed',
  },
  {
    step: 'exact_sku',
    allowedWhen: ['UPC/GTIN or vendor SKU matches exact product, pack, and form'],
    blockedWhen: ['pack, form, or unit conflicts with the recipe need'],
    confidenceCap: 0.9,
    requiredProof: ['UPC or vendor SKU', 'pack size', 'form', 'freshness'],
    visibleLabel: 'Exact SKU price',
    finalCostingState: 'allowed',
  },
  {
    step: 'exact_canonical_buyable',
    allowedWhen: ['canonical buyable identity and unit basis match'],
    blockedWhen: ['identity is ambiguous or unsafe-equivalent only'],
    confidenceCap: 0.82,
    requiredProof: ['canonical identity', 'unit basis', 'freshness'],
    visibleLabel: 'Exact buyable identity',
    finalCostingState: 'allowed',
  },
  {
    step: 'buyable_equivalent',
    allowedWhen: ['identity is in approved buyable equivalence group'],
    blockedWhen: ['equivalence crosses form, process, allergen, or yield boundary'],
    confidenceCap: 0.72,
    requiredProof: ['equivalence group', 'unit conversion', 'yield basis'],
    visibleLabel: 'Buyable equivalent',
    finalCostingState: 'allowed_with_estimate',
  },
  {
    step: 'vendor_category_sibling',
    allowedWhen: ['same vendor/category sibling is the best available fallback'],
    blockedWhen: ['sibling differs by form, cut, species, or prepared state'],
    confidenceCap: 0.55,
    requiredProof: ['vendor/category sibling', 'visible estimate label'],
    visibleLabel: 'Vendor/category estimate',
    finalCostingState: 'review_required',
  },
  {
    step: 'regional_average',
    allowedWhen: ['regional observations are fresh and state reliability is usable or reliable'],
    blockedWhen: ['state is unreliable or freshness is missing'],
    confidenceCap: 0.5,
    requiredProof: ['region', 'source count', 'freshness', 'state reliability'],
    visibleLabel: 'Regional estimate',
    finalCostingState: 'allowed_with_estimate',
  },
  {
    step: 'national_baseline',
    allowedWhen: ['no local/regional proof exists and caller accepts benchmark only'],
    blockedWhen: ['client-facing final quote requires local proof'],
    confidenceCap: 0.35,
    requiredProof: ['national source', 'visible benchmark label'],
    visibleLabel: 'National benchmark',
    finalCostingState: 'review_required',
  },
  {
    step: 'synthetic_model',
    allowedWhen: ['no observed price exists and the system must return a bounded estimate'],
    blockedWhen: ['UI hides synthetic label or final quote treats it as truth'],
    confidenceCap: 0.15,
    requiredProof: ['model name', 'floor category', 'visible synthetic label'],
    visibleLabel: 'Synthetic estimate',
    finalCostingState: 'review_required',
  },
  {
    step: 'substitution_price',
    allowedWhen: ['substitution is approved and price delta is explicitly labeled'],
    blockedWhen: ['approval, allergen check, or unit/yield proof is missing'],
    confidenceCap: 0.45,
    requiredProof: ['replacement identity', 'approval state', 'price delta', 'audit trail'],
    visibleLabel: 'Substitution estimate',
    finalCostingState: 'review_required',
  },
]

const mandatoryFamilies = [
  'tomato',
  'coriander',
  'chile',
  'dairy_cream',
  'soy',
  'wheat',
  'chicken',
  'citrus',
  'sugar',
  'seafood',
  'herb',
  'oil',
  'spice',
  'canned_goods',
  'frozen_goods',
  'fermented_goods',
  'extract',
  'additive',
]

export function getOracleCompletionReport() {
  const families = [...new Set(PIE_PRICING_IDENTITIES.map((identity) => identity.family))].sort()
  return {
    identityCount: PIE_PRICING_IDENTITIES.length,
    families,
    missingFamilies: mandatoryFamilies.filter((family) => !families.includes(family)),
    fallbackSteps: FALLBACK_DECISION_TABLE.map((row) => row.step),
    skuPrioritySteps: SKU_MATCH_PRIORITY_ORDER.map((row) => row.field),
    skuOutcomes: SKU_OUTCOME_RULES.map((row) => row.outcome),
    unitYieldExampleCount: UNIT_YIELD_TRANSFORM_EXAMPLES.length,
    substitutionTypes: SUBSTITUTION_TYPE_RULES.map((row) => row.type),
    nativeTruthInvariants: PIE_NATIVE_TRUTH_INVARIANTS.map((row) => row.id),
  }
}

export function evaluateNativeTruthServingClaim(
  claim: NativeTruthServingClaim
): NativeTruthServingResult {
  const blockers: string[] = []

  if (claim.requiresExternalCompanyAtServeTime) {
    blockers.push('external company required at serve time')
  }
  if (claim.usesUserSubmittedPriceAsMarketTruth) {
    blockers.push('user-submitted price cannot become market truth')
  }
  if (claim.servingMode === 'external_api_fetch') {
    blockers.push('external API fetch is not native serving')
  }
  if (claim.servingMode === 'user_supplied_market_price') {
    blockers.push('user-supplied market price is not canonical truth')
  }
  if (claim.servingMode === 'request_time_crawl') {
    blockers.push('request-time crawl is not instant precomputed serving')
  }

  if (blockers.length > 0) {
    return {
      finalCostingState: 'blocked',
      reliability: 'blocked',
      visibleLabel: 'Blocked from native price truth',
      blockers,
    }
  }

  if (!claim.hasProvenance) blockers.push('provenance missing')
  if (!claim.hasFreshness) blockers.push('freshness missing')
  if (!claim.hasConfidence) blockers.push('confidence missing')
  if (!claim.hasRepairPath) blockers.push('repair path missing')

  if (!claim.hasNativeObservation || !claim.precomputedForRegion) {
    blockers.push('native regional price cell not precomputed')
  }

  if (blockers.length > 0) {
    return {
      finalCostingState: 'review_required',
      reliability: 'review_required',
      visibleLabel: 'Native truth incomplete',
      blockers,
    }
  }

  return {
    finalCostingState:
      claim.servingMode === 'native_background_repair' ? 'allowed_with_estimate' : 'allowed',
    reliability:
      claim.servingMode === 'native_background_repair' ? 'estimate_labeled' : 'direct_proof',
    visibleLabel:
      claim.servingMode === 'native_background_repair'
        ? 'Native repair estimate'
        : 'Native price truth',
    blockers,
  }
}

export function evaluateFallbackClaim(input: {
  step: FallbackStep
  stateReliability: StateReliabilityForOracle
  hasFreshnessProof: boolean
  hasUnitProof: boolean
  hasYieldProof: boolean
  substitutionApproved: boolean
}) {
  const decision = FALLBACK_DECISION_TABLE.find((row) => row.step === input.step)
  if (!decision) throw new Error(`Unknown fallback step: ${input.step}`)

  const blockers: string[] = []
  if (!input.hasUnitProof) blockers.push('unit proof missing')
  if (!input.hasYieldProof) blockers.push('yield proof missing')
  if (input.step === 'substitution_price' && !input.substitutionApproved) {
    blockers.push('substitution approval missing')
  }
  if (
    input.step === 'regional_average' &&
    (input.stateReliability === 'unreliable' || !input.hasFreshnessProof)
  ) {
    blockers.push('regional freshness or reliability missing')
  }

  if (blockers.length > 0) {
    return {
      finalCostingState: 'blocked' as FinalCostingState,
      confidenceCap: Math.min(decision.confidenceCap, 0.1),
      visibleLabel: decision.visibleLabel,
      blockers,
    }
  }

  if (input.step === 'synthetic_model' || input.stateReliability === 'estimated') {
    return {
      finalCostingState: 'review_required' as FinalCostingState,
      confidenceCap: decision.confidenceCap,
      visibleLabel: decision.visibleLabel,
      blockers,
    }
  }

  return {
    finalCostingState: decision.finalCostingState,
    confidenceCap: decision.confidenceCap,
    visibleLabel: decision.visibleLabel,
    blockers,
  }
}

const preparedPatterns =
  /\b(prepared|dinner kit|meal kit|cooked|ready to eat|entree|marinade|sauce|soup|salad kit)\b/i
const nonFoodPatterns = /\b(lotion|soap|detergent|cleaner|pet food|cat litter|shampoo|deodorant)\b/i

export function classifySkuMatch(input: SkuMatchInput): SkuMatchResult {
  const reasons: string[] = []
  const name = input.productName.toLowerCase()
  const identity = PIE_PRICING_IDENTITIES.find((item) => item.id === input.canonicalIdentityId)

  if (nonFoodPatterns.test(name)) {
    return {
      outcome: 'rejected_non_food',
      reliability: 'blocked',
      reasons: ['Product is non-food and cannot seed ingredient price truth.'],
    }
  }
  if (preparedPatterns.test(name) || input.form === 'prepared') {
    return {
      outcome: 'rejected_prepared',
      reliability: 'blocked',
      reasons: ['Prepared foods cannot seed raw ingredient price truth.'],
    }
  }
  if (!identity) {
    return {
      outcome: 'unsafe_equivalence',
      reliability: 'blocked',
      reasons: ['Canonical identity is unknown.'],
    }
  }
  if (input.catchWeight || /random weight/i.test(input.packSize || '')) {
    reasons.push('Catch-weight product requires received weight proof.')
    return { outcome: 'review_required', reliability: 'review_required', reasons }
  }
  if (identity.yieldBasis.includes('drained') && !input.drainedWeight) {
    reasons.push('Drained-weight item needs drained weight proof before final costing.')
    return { outcome: 'review_required', reliability: 'review_required', reasons }
  }
  if ((input.upc || input.vendorSku) && input.packSize && input.unitBasis && input.form) {
    return {
      outcome: 'exact_match',
      reliability: 'direct_proof',
      reasons: ['SKU, pack, unit, form, and canonical identity are present.'],
    }
  }
  if (input.packSize && input.unitBasis) {
    return {
      outcome: 'canonical_match',
      reliability: 'high_confidence',
      reasons: ['Canonical identity and unit basis are present without exact SKU proof.'],
    }
  }
  return {
    outcome: 'fallback_candidate',
    reliability: 'estimate_labeled',
    reasons: ['Only fuzzy product identity is available.'],
  }
}

export function getUnitYieldRequirement(
  identityId: string,
  purchaseUnit: string,
  recipeUnit: string
): UnitYieldRequirement {
  const identity = PIE_PRICING_IDENTITIES.find((item) => item.id === identityId)
  if (!identity) {
    return {
      conversionClass: 'unsafe_without_manual_review',
      requiredProof: ['known canonical identity'],
      finalCostingWithoutProof: 'blocked',
    }
  }

  const unitsMatch = purchaseUnit.toLowerCase() === recipeUnit.toLowerCase()
  if (unitsMatch && !/yield|trim|drained|density|loss|shell|bone/i.test(identity.yieldBasis)) {
    return {
      conversionClass: 'direct',
      requiredProof: ['matching purchase and recipe unit'],
      finalCostingWithoutProof: 'allowed',
    }
  }

  if (/bunch|picked leaf/.test(identity.yieldBasis) || purchaseUnit === 'bunch') {
    return {
      conversionClass: 'requires_each_or_bunch_yield',
      requiredProof: ['bunch size', 'picked-leaf yield'],
      finalCostingWithoutProof: 'blocked',
    }
  }
  if (/drained/.test(identity.yieldBasis)) {
    return {
      conversionClass: 'requires_drained_weight',
      requiredProof: ['net weight', 'drained weight'],
      finalCostingWithoutProof: 'blocked',
    }
  }
  if (/density|concentrate|paste|syrup|spice|flour|extract|powder/.test(identity.yieldBasis)) {
    return {
      conversionClass: 'requires_density_or_pack_size',
      requiredProof: ['can size or net weight', 'density or spoon conversion'],
      finalCostingWithoutProof: 'review_required',
    }
  }
  if (/trim|cook|shell|bone|skin|loss|yield/.test(identity.yieldBasis)) {
    return {
      conversionClass: 'requires_trim_or_cook_yield',
      requiredProof: ['trim yield', 'edible yield'],
      finalCostingWithoutProof: 'review_required',
    }
  }

  return {
    conversionClass: 'requires_density_or_pack_size',
    requiredProof: ['unit conversion proof'],
    finalCostingWithoutProof: 'review_required',
  }
}

export function evaluateSubstitutionPricing(
  input: SubstitutionPricingInput
): SubstitutionPricingResult {
  const requiredProof = ['replacement identity', 'price delta', 'audit trail']
  const needsClientApproval =
    input.type === 'client_approved' ||
    input.type === 'dietary_allergen' ||
    input.type === 'cost_control' ||
    input.type === 'culinary_function'

  if (needsClientApproval) requiredProof.push('client approval')
  if (!input.hasDietaryCheck) requiredProof.push('dietary check')
  if (!input.hasAllergenCheck) requiredProof.push('allergen check')
  if (!input.hasUnitYieldProof) requiredProof.push('unit/yield proof')
  if (!input.hasPriceProof) requiredProof.push('replacement price proof')

  const hardBlocked =
    !input.hasAllergenCheck ||
    !input.hasDietaryCheck ||
    !input.hasUnitYieldProof ||
    !input.hasPriceProof ||
    (needsClientApproval && !input.approvedByClient)

  if (hardBlocked) {
    return {
      finalCostingState: 'blocked',
      canRewriteOriginalPriceTruth: false,
      requiredProof,
      label: 'Substitution blocked',
    }
  }

  return {
    finalCostingState: input.type === 'chef_operational' ? 'allowed' : 'allowed_with_estimate',
    canRewriteOriginalPriceTruth: false,
    requiredProof,
    label: 'Substitution price delta',
  }
}

function fixtureSubstitutionState(
  skuOutcome: SkuMatchOutcome,
  fallbackStep: FallbackStep
): GoldenFixtureSubstitutionState {
  if (skuOutcome === 'rejected_non_food' || skuOutcome === 'rejected_prepared') {
    return 'rejected_not_price_truth'
  }
  if (skuOutcome === 'unsafe_equivalence') return 'unsafe_equivalence_no_rewrite'
  if (fallbackStep === 'substitution_price') return 'substitution_requires_approval'
  return 'not_a_substitution'
}

const fixtureRows: Array<
  [
    string,
    string,
    GoldenPriceOracleFixture['source'],
    string,
    SkuMatchOutcome,
    FallbackStep,
    OracleReliabilityBucket,
    string,
  ]
> = [
  [
    'fresh-roma-tomato',
    'Roma tomatoes 25 lb case',
    'vendor_sku',
    'plant.tomato.fruit.fresh',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'fresh-tomato-each',
    '6 large tomatoes',
    'recipe_string',
    'plant.tomato.fruit.fresh',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'canned-diced-tomato',
    'No. 10 can diced tomatoes drained',
    'vendor_sku',
    'plant.tomato.fruit.canned-drained',
    'review_required',
    'buyable_equivalent',
    'review_required',
    'Drained weight required',
  ],
  [
    'tomato-paste-can',
    'Tomato paste 6 oz can',
    'vendor_sku',
    'plant.tomato.fruit.paste',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'tomato-sauce-false-friend',
    'tomato sauce',
    'recipe_string',
    'plant.tomato.fruit.paste',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Unsafe equivalence',
  ],
  [
    'cilantro-bunch',
    '2 bunches cilantro',
    'recipe_string',
    'plant.coriander.leaf.fresh',
    'canonical_match',
    'exact_canonical_buyable',
    'review_required',
    'Bunch yield required',
  ],
  [
    'coriander-ground',
    'Ground coriander 16 oz jar',
    'vendor_sku',
    'plant.coriander.seed.ground',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'coriander-leaf-false-friend',
    'fresh coriander leaves',
    'recipe_string',
    'plant.coriander.leaf.fresh',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'jalapeno-fresh',
    'Fresh jalapeno peppers',
    'vendor_sku',
    'plant.chile.fruit.fresh',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'guajillo-dried',
    'Dried guajillo chiles 8 oz bag',
    'vendor_sku',
    'plant.chile.fruit.dried',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'chile-powder-unsafe',
    'chili powder blend',
    'vendor_sku',
    'plant.chile.fruit.dried',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Blend cannot seed dried chile truth',
  ],
  [
    'heavy-cream-quart',
    'Heavy whipping cream quart',
    'vendor_sku',
    'animal.cow.milk.heavy-cream',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'sour-cream-unsafe',
    'sour cream tub',
    'vendor_sku',
    'animal.cow.milk.heavy-cream',
    'unsafe_equivalence',
    'substitution_price',
    'blocked',
    'Cream type mismatch',
  ],
  [
    'coconut-cream-can',
    'Unsweetened coconut cream 13.5 fl oz',
    'vendor_sku',
    'plant.coconut.endosperm.cream',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'cream-of-coconut-unsafe',
    'sweetened cream of coconut',
    'vendor_sku',
    'plant.coconut.endosperm.cream',
    'unsafe_equivalence',
    'substitution_price',
    'blocked',
    'Sweetened false friend',
  ],
  [
    'edamame-shelled',
    'Frozen shelled edamame 12 oz',
    'vendor_sku',
    'plant.soybean.seed.fresh-edamame',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'edamame-pods',
    'edamame pods',
    'recipe_string',
    'plant.soybean.seed.fresh-edamame',
    'fallback_candidate',
    'buyable_equivalent',
    'review_required',
    'Shelled yield required',
  ],
  [
    'firm-tofu',
    'Extra firm tofu 14 oz block',
    'vendor_sku',
    'plant.soybean.curd.tofu',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'soy-sauce-unsafe',
    'soy sauce',
    'recipe_string',
    'plant.soybean.curd.tofu',
    'unsafe_equivalence',
    'substitution_price',
    'blocked',
    'Soy form mismatch',
  ],
  [
    'ap-flour',
    'All purpose flour 25 lb bag',
    'vendor_sku',
    'plant.wheat.seed.flour.ap',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'flour-cups',
    '3 cups AP flour',
    'recipe_string',
    'plant.wheat.seed.flour.ap',
    'canonical_match',
    'exact_canonical_buyable',
    'review_required',
    'Density required',
  ],
  [
    'gluten-free-flour-sub',
    'gluten free flour blend',
    'recipe_string',
    'plant.wheat.seed.flour.ap',
    'unsafe_equivalence',
    'substitution_price',
    'review_required',
    'Substitution approval required',
  ],
  [
    'bone-in-thigh',
    'Bone-in chicken thighs 40 lb case',
    'vendor_sku',
    'animal.chicken.muscle.thigh-bone-in',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'boneless-breast',
    'Boneless skinless chicken breast',
    'vendor_sku',
    'animal.chicken.muscle.breast-boneless',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'chicken-kit-reject',
    'Cilantro lime chicken prepared dinner kit',
    'vendor_sku',
    'animal.chicken.muscle.breast-boneless',
    'rejected_prepared',
    'substitution_price',
    'blocked',
    'Prepared rejected',
  ],
  [
    'fresh-lemon',
    'Fresh lemons 115 count case',
    'vendor_sku',
    'plant.citrus.fruit.lemon-fresh',
    'canonical_match',
    'exact_canonical_buyable',
    'review_required',
    'Juice yield required',
  ],
  [
    'lemon-juice-unsafe',
    'bottled lemon juice',
    'vendor_sku',
    'plant.citrus.fruit.lemon-fresh',
    'unsafe_equivalence',
    'substitution_price',
    'blocked',
    'Juice is not whole lemon',
  ],
  [
    'lemon-oil',
    'Lemon oil extract 2 fl oz',
    'vendor_sku',
    'plant.citrus.extract.lemon-oil',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'granulated-sugar',
    'Granulated sugar 50 lb bag',
    'vendor_sku',
    'plant.sugarcane.crystal.white',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'powdered-sugar-unsafe',
    'powdered sugar',
    'recipe_string',
    'plant.sugarcane.crystal.white',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Sugar form mismatch',
  ],
  [
    'molasses',
    'Unsulphured molasses gallon',
    'vendor_sku',
    'plant.sugarcane.syrup.molasses',
    'canonical_match',
    'exact_canonical_buyable',
    'review_required',
    'Syrup density required',
  ],
  [
    'shell-on-shrimp',
    '16/20 shell-on shrimp random weight',
    'vendor_sku',
    'animal.shrimp.muscle.shell-on',
    'review_required',
    'buyable_equivalent',
    'review_required',
    'Shell yield required',
  ],
  [
    'peeled-shrimp-unsafe',
    'peeled cooked shrimp cocktail',
    'vendor_sku',
    'animal.shrimp.muscle.shell-on',
    'rejected_prepared',
    'substitution_price',
    'blocked',
    'Prepared rejected',
  ],
  [
    'salmon-fillet',
    'Atlantic salmon fillet lb',
    'vendor_sku',
    'animal.salmon.muscle.fillet',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'cod-substitution',
    'cod fillet as salmon replacement',
    'recipe_string',
    'animal.cod.muscle.fillet',
    'fallback_candidate',
    'substitution_price',
    'review_required',
    'Substitution estimate',
  ],
  [
    'evoo-bottle',
    'Extra virgin olive oil 1 liter',
    'vendor_sku',
    'plant.olive.fruit.oil-extra-virgin',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'vegetable-oil-unsafe',
    'vegetable oil gallon',
    'vendor_sku',
    'plant.olive.fruit.oil-extra-virgin',
    'unsafe_equivalence',
    'substitution_price',
    'blocked',
    'Oil grade mismatch',
  ],
  [
    'fresh-basil',
    'Fresh basil bunch',
    'vendor_sku',
    'plant.basil.leaf.fresh',
    'canonical_match',
    'exact_canonical_buyable',
    'review_required',
    'Picked leaf yield required',
  ],
  [
    'dried-basil-unsafe',
    'dried basil jar',
    'vendor_sku',
    'plant.basil.leaf.fresh',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Fresh/dried mismatch',
  ],
  [
    'ground-cumin',
    'Ground cumin 18 oz jar',
    'vendor_sku',
    'plant.cumin.seed.ground',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'taco-seasoning-unsafe',
    'taco seasoning blend',
    'vendor_sku',
    'plant.cumin.seed.ground',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Blend cannot seed cumin truth',
  ],
  [
    'frozen-blueberry',
    'Frozen blueberries 5 lb bag',
    'vendor_sku',
    'plant.blueberry.fruit.frozen',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'fresh-blueberry-sibling',
    'Fresh blueberries pint',
    'vendor_sku',
    'plant.blueberry.fruit.frozen',
    'unsafe_equivalence',
    'regional_average',
    'review_required',
    'Fresh/frozen mismatch',
  ],
  [
    'white-miso',
    'White miso paste tub',
    'vendor_sku',
    'plant.soybean.fermented.miso',
    'canonical_match',
    'exact_canonical_buyable',
    'high_confidence',
    'Exact buyable identity',
  ],
  [
    'soy-sauce-miso-unsafe',
    'soy sauce bottle',
    'vendor_sku',
    'plant.soybean.fermented.miso',
    'unsafe_equivalence',
    'substitution_price',
    'blocked',
    'Fermented soy form mismatch',
  ],
  [
    'xanthan-gum',
    'Xanthan gum powder 8 oz',
    'vendor_sku',
    'additive.xanthan-gum.powder',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'guar-gum-substitution',
    'guar gum as xanthan substitute',
    'recipe_string',
    'additive.xanthan-gum.powder',
    'fallback_candidate',
    'substitution_price',
    'review_required',
    'Substitution estimate',
  ],
  [
    'dried-beans',
    'Dried black beans 25 lb bag',
    'vendor_sku',
    'plant.bean.seed.dried',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'canned-beans-unsafe',
    'canned black beans drained',
    'vendor_sku',
    'plant.bean.seed.dried',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Dried/canned mismatch',
  ],
  [
    'vanilla-extract',
    'Pure vanilla extract 16 fl oz',
    'vendor_sku',
    'plant.vanilla.fruit.extract',
    'exact_match',
    'exact_sku',
    'direct_proof',
    'Exact SKU price',
  ],
  [
    'imitation-vanilla-unsafe',
    'imitation vanilla flavor',
    'vendor_sku',
    'plant.vanilla.fruit.extract',
    'unsafe_equivalence',
    'vendor_category_sibling',
    'blocked',
    'Pure/imitation mismatch',
  ],
  [
    'regional-average-only',
    'regional market tomato benchmark',
    'receipt_line',
    'plant.tomato.fruit.fresh',
    'fallback_candidate',
    'regional_average',
    'estimate_labeled',
    'Regional estimate',
  ],
  [
    'national-baseline-only',
    'national saffron-like spice baseline',
    'recipe_string',
    'plant.cumin.seed.ground',
    'fallback_candidate',
    'national_baseline',
    'review_required',
    'National benchmark',
  ],
  [
    'synthetic-floor-only',
    'unknown specialty pantry flower',
    'recipe_string',
    'plant.wheat.seed.flour.ap',
    'fallback_candidate',
    'synthetic_model',
    'review_required',
    'Synthetic estimate',
  ],
]

export const GOLDEN_PRICE_ORACLE_FIXTURES: GoldenPriceOracleFixture[] = fixtureRows.map(
  ([
    id,
    raw,
    source,
    expectedIdentityId,
    expectedSkuOutcome,
    expectedFallbackStep,
    expectedReliability,
    visibleLabel,
  ]) => {
    const identity = PIE_PRICING_IDENTITIES.find((item) => item.id === expectedIdentityId)

    return {
      id,
      raw,
      source,
      expectedIdentityId,
      expectedBuyableGroup: identity?.buyableEquivalenceGroup ?? [],
      expectedUnsafeEquivalences: identity?.unsafeEquivalence ?? [],
      expectedUnitProof: identity?.unitBasis ?? [],
      expectedYieldProof: identity?.yieldBasis ?? 'unknown yield basis',
      expectedSkuOutcome,
      expectedFallbackStep,
      expectedSubstitutionState: fixtureSubstitutionState(expectedSkuOutcome, expectedFallbackStep),
      expectedReliability,
      sourceTransparencyLabel: visibleLabel,
      visibleLabel,
    }
  }
)

const requiredFixtureScenarios = [
  'fresh-roma-tomato',
  'canned-diced-tomato',
  'tomato-paste-can',
  'cilantro-bunch',
  'coriander-ground',
  'shell-on-shrimp',
  'bone-in-thigh',
  'heavy-cream-quart',
  'coconut-cream-can',
  'dried-beans',
  'synthetic-floor-only',
]

export function validateGoldenFixtures() {
  const ids = new Set(GOLDEN_PRICE_ORACLE_FIXTURES.map((fixture) => fixture.id))
  return {
    fixtureCount: GOLDEN_PRICE_ORACLE_FIXTURES.length,
    missingRequiredScenarios: requiredFixtureScenarios.filter((scenario) => !ids.has(scenario)),
    reliabilityBuckets: [
      ...new Set(GOLDEN_PRICE_ORACLE_FIXTURES.map((fixture) => fixture.expectedReliability)),
    ].sort(),
    fallbackSteps: [
      ...new Set(GOLDEN_PRICE_ORACLE_FIXTURES.map((fixture) => fixture.expectedFallbackStep)),
    ].sort(),
  }
}
