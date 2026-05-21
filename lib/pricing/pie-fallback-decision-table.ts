export type PieFinalCostingState =
  | 'allowed'
  | 'allowed_with_estimate'
  | 'review_required'
  | 'blocked'

export type PieFallbackStepId =
  | 'direct_proof'
  | 'sku_proof'
  | 'canonical_proof'
  | 'equivalent_proof'
  | 'sibling_fallback'
  | 'regional_fallback'
  | 'national_fallback'
  | 'synthetic_fallback'
  | 'substitution_fallback'

export type PieFallbackSourceKind =
  | 'chef_override'
  | 'receipt_proof'
  | 'exact_sku'
  | 'exact_canonical_buyable'
  | 'buyable_equivalent'
  | 'vendor_category_sibling'
  | 'regional_average'
  | 'national_baseline'
  | 'synthetic_floor'
  | 'synthetic_model'
  | 'substitution_price'

export type PieFallbackRegionStoreScope =
  | 'same_store'
  | 'same_chain_same_region'
  | 'same_region'
  | 'neighbor_region'
  | 'national'
  | 'unknown'

export type PieReliabilityRiskCode =
  | 'ambiguous_string'
  | 'form_collapse'
  | 'unit_mismatch'
  | 'missing_yield'
  | 'prepared_sku'
  | 'cultural_false_friend'
  | 'stale_price'
  | 'region_drift'
  | 'substitution_drift'
  | 'synthetic_fallback'

export type PieReliabilityRiskSeverity = 'low' | 'medium' | 'high' | 'blocker'

export interface PieFallbackFreshnessRequirement {
  readonly maxAgeDays: number | null
  readonly requirement: string
}

export interface PieFallbackRegionStorePenalties {
  readonly sameStore: number
  readonly sameChainSameRegion: number
  readonly sameRegion: number
  readonly neighborRegion: number
  readonly national: number
  readonly unknown: number
}

export interface PieFallbackDecisionRow {
  readonly step: PieFallbackStepId
  readonly order: number
  readonly sourceKinds: readonly PieFallbackSourceKind[]
  readonly label: string
  readonly allowedConditions: readonly string[]
  readonly blockedConditions: readonly string[]
  readonly confidenceMultiplier: number
  readonly proofRequirements: readonly string[]
  readonly freshness: PieFallbackFreshnessRequirement
  readonly regionStorePenalties: PieFallbackRegionStorePenalties
  readonly visibleLabel: string
  readonly visibleLabelRequirement: string
  readonly sourceTransparency: readonly string[]
  readonly hardStopRules: readonly string[]
  readonly downgradeRules: readonly string[]
  readonly finalCostingState: PieFinalCostingState
}

export interface PieReliabilityRiskDefinition {
  readonly code: PieReliabilityRiskCode
  readonly label: string
  readonly severity: PieReliabilityRiskSeverity
  readonly confidenceMultiplier: number
  readonly maxFinalCostingState: PieFinalCostingState
  readonly detectionSignals: readonly string[]
  readonly hardStopRules: readonly string[]
  readonly downgradeRules: readonly string[]
  readonly requiredResolutionProof: readonly string[]
  readonly sourceTransparency: readonly string[]
}

export interface EvaluatePieFallbackContractInput {
  readonly step: PieFallbackStepId
  readonly baseConfidence?: number
  readonly presentProof?: readonly string[]
  readonly riskCodes?: readonly PieReliabilityRiskCode[]
  readonly sourceAgeDays?: number | null
  readonly regionStoreScope?: PieFallbackRegionStoreScope
  readonly substitutionApproved?: boolean
}

export interface PieFallbackContractEvaluation {
  readonly step: PieFallbackStepId
  readonly finalCostingState: PieFinalCostingState
  readonly confidenceScore: number
  readonly confidenceMultiplier: number
  readonly visibleLabel: string
  readonly sourceTransparency: readonly string[]
  readonly requiredProof: readonly string[]
  readonly missingProof: readonly string[]
  readonly hardStops: readonly string[]
  readonly downgrades: readonly string[]
  readonly risks: readonly PieReliabilityRiskDefinition[]
}

const REGION_STORE_PENALTIES: Record<
  'direct' | 'local' | 'equivalent' | 'broad' | 'modeled' | 'substitution',
  PieFallbackRegionStorePenalties
> = {
  direct: {
    sameStore: 1,
    sameChainSameRegion: 0.98,
    sameRegion: 0.95,
    neighborRegion: 0.85,
    national: 0.75,
    unknown: 0.7,
  },
  local: {
    sameStore: 1,
    sameChainSameRegion: 0.95,
    sameRegion: 0.9,
    neighborRegion: 0.78,
    national: 0.68,
    unknown: 0.62,
  },
  equivalent: {
    sameStore: 0.95,
    sameChainSameRegion: 0.9,
    sameRegion: 0.84,
    neighborRegion: 0.72,
    national: 0.6,
    unknown: 0.55,
  },
  broad: {
    sameStore: 0.9,
    sameChainSameRegion: 0.86,
    sameRegion: 0.8,
    neighborRegion: 0.68,
    national: 0.58,
    unknown: 0.5,
  },
  modeled: {
    sameStore: 0.75,
    sameChainSameRegion: 0.72,
    sameRegion: 0.68,
    neighborRegion: 0.6,
    national: 0.52,
    unknown: 0.45,
  },
  substitution: {
    sameStore: 0.85,
    sameChainSameRegion: 0.8,
    sameRegion: 0.72,
    neighborRegion: 0.62,
    national: 0.5,
    unknown: 0.45,
  },
}

export const PIE_FALLBACK_DECISION_TABLE: readonly PieFallbackDecisionRow[] = [
  {
    step: 'direct_proof',
    order: 1,
    sourceKinds: ['chef_override', 'receipt_proof'],
    label: 'Direct proof',
    allowedConditions: [
      'Chef-entered override or receipt line is tied to the canonical ingredient identity.',
      'Purchase unit, pack size, store/vendor, timestamp, and paid price are present.',
      'Manual override has an audit reason and does not contradict locked dietary or tenant policy.',
    ],
    blockedConditions: [
      'Receipt or override cannot be tied to one canonical ingredient identity.',
      'Price is copied from a prepared dish, bundle, meal kit, or non-food product.',
      'Unit or yield conversion needed for recipe costing is missing.',
    ],
    confidenceMultiplier: 1,
    proofRequirements: [
      'chef override or receipt image/line proof',
      'canonical ingredient identity',
      'paid price and purchase unit',
      'store or vendor',
      'observed or purchase date',
      'unit and yield basis',
    ],
    freshness: {
      maxAgeDays: 30,
      requirement: 'Receipt and override proof should be current within 30 days for final costing.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.direct,
    visibleLabel: 'Receipt or chef proof',
    visibleLabelRequirement:
      'Show as direct proof with source, date, unit, and override/receipt provenance.',
    sourceTransparency: [
      'source type',
      'store or vendor name',
      'purchase date',
      'purchase unit',
      'chef override reason when present',
    ],
    hardStopRules: [
      'Block if the proof belongs to a prepared SKU, non-food SKU, or another canonical ingredient.',
      'Block final costing if unit conversion or edible yield proof is required and absent.',
    ],
    downgradeRules: [
      'Downgrade to allowed_with_estimate when proof is older than freshness policy but still identity-safe.',
      'Downgrade to review_required when the receipt text is ambiguous but recoverable by manual review.',
    ],
    finalCostingState: 'allowed',
  },
  {
    step: 'sku_proof',
    order: 2,
    sourceKinds: ['exact_sku'],
    label: 'Exact SKU proof',
    allowedConditions: [
      'UPC, GTIN, PLU, vendor SKU, or distributor item number exactly matches the buyable item.',
      'Pack size, unit, brand/vendor, and canonical identity all match the priced SKU.',
      'SKU is a raw or standard buyable ingredient, not a prepared dish.',
    ],
    blockedConditions: [
      'SKU is a prepared product, mixed kit, cooked item, or service fee.',
      'SKU pack size, form, or unit cannot be normalized to the recipe basis.',
      'Exact product identity conflicts with the canonical ingredient identity.',
    ],
    confidenceMultiplier: 0.96,
    proofRequirements: [
      'exact SKU or UPC',
      'canonical ingredient identity',
      'pack size',
      'purchase unit',
      'store or vendor',
      'observed date',
    ],
    freshness: {
      maxAgeDays: 14,
      requirement: 'Exact SKU proof should be observed within 14 days for final costing.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.local,
    visibleLabel: 'Exact SKU price',
    visibleLabelRequirement: 'Show exact SKU, vendor/store, pack size, and observed date.',
    sourceTransparency: [
      'SKU or UPC',
      'product name',
      'pack size',
      'store or vendor',
      'observed date',
    ],
    hardStopRules: [
      'Block if SKU proof is prepared, non-food, or unsafe for the canonical ingredient.',
      'Block if catch weight, drained weight, trim yield, or edible yield is required and absent.',
    ],
    downgradeRules: [
      'Downgrade to allowed_with_estimate when the SKU is exact but older than freshness policy.',
      'Downgrade to review_required when pack size or catch weight needs manual confirmation.',
    ],
    finalCostingState: 'allowed',
  },
  {
    step: 'canonical_proof',
    order: 3,
    sourceKinds: ['exact_canonical_buyable'],
    label: 'Exact canonical buyable proof',
    allowedConditions: [
      'Product maps to the exact canonical buyable identity without SKU proof.',
      'Culinary form, processing state, unit basis, and pack basis match the ingredient.',
      'Source is recent enough for the ingredient volatility class.',
    ],
    blockedConditions: [
      'Canonical identity is inferred from a vague string only.',
      'Form, processing state, edible part, or species/variety changes the price truth.',
      'Required unit or yield basis is absent.',
    ],
    confidenceMultiplier: 0.9,
    proofRequirements: [
      'canonical buyable identity',
      'product/source name',
      'unit and pack basis',
      'observed date',
      'form and processing state',
    ],
    freshness: {
      maxAgeDays: 14,
      requirement: 'Canonical buyable proof should be observed within 14 days.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.local,
    visibleLabel: 'Canonical buyable price',
    visibleLabelRequirement: 'Show that the price is canonical proof, not an exact SKU.',
    sourceTransparency: [
      'canonical identity',
      'product/source name',
      'unit basis',
      'pack basis',
      'observed date',
    ],
    hardStopRules: [
      'Block if form collapse could merge fresh, dried, canned, extract, cooked, or prepared forms.',
      'Block if unit mismatch prevents conversion into the recipe unit.',
    ],
    downgradeRules: [
      'Downgrade to allowed_with_estimate when source is local but stale.',
      'Downgrade to review_required when only partial product evidence is present.',
    ],
    finalCostingState: 'allowed',
  },
  {
    step: 'equivalent_proof',
    order: 4,
    sourceKinds: ['buyable_equivalent'],
    label: 'Buyable equivalent proof',
    allowedConditions: [
      'Equivalent item is in the same buyable equivalence group.',
      'Culinary use, edible part, processing state, unit basis, and yield basis are compatible.',
      'Equivalent source is disclosed and does not overwrite exact ingredient truth.',
    ],
    blockedConditions: [
      'Equivalent changes form, concentration, species, allergen state, or edible yield materially.',
      'Equivalent is a substitution rather than a same-truth buyable.',
      'Equivalence group has not been curated or approved.',
    ],
    confidenceMultiplier: 0.82,
    proofRequirements: [
      'curated equivalence group',
      'replacement/source product identity',
      'unit and yield compatibility',
      'observed date',
      'store or vendor',
    ],
    freshness: {
      maxAgeDays: 14,
      requirement: 'Equivalent proof should be observed within 14 days.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.equivalent,
    visibleLabel: 'Equivalent buyable estimate',
    visibleLabelRequirement: 'Show equivalent item name and why it is equivalent.',
    sourceTransparency: [
      'equivalent product name',
      'equivalence group',
      'store or vendor',
      'observed date',
      'unit/yield basis',
    ],
    hardStopRules: [
      'Block if unsafe equivalence is detected.',
      'Block if allergen, dietary, form, or yield drift changes the ingredient truth.',
    ],
    downgradeRules: [
      'Downgrade to review_required when equivalence is inferred rather than curated.',
      'Downgrade to review_required when the equivalent is outside the requested region.',
    ],
    finalCostingState: 'allowed_with_estimate',
  },
  {
    step: 'sibling_fallback',
    order: 5,
    sourceKinds: ['vendor_category_sibling'],
    label: 'Vendor/category sibling fallback',
    allowedConditions: [
      'Sibling product is from the same vendor/category family and same broad culinary form.',
      'No exact SKU, canonical proof, or curated equivalent is available.',
      'Estimate is clearly labeled as a sibling fallback.',
    ],
    blockedConditions: [
      'Sibling is a different form, prepared item, different edible part, or culturally false friend.',
      'Sibling price would be used as direct proof for the original ingredient.',
      'Category is too broad to preserve price truth.',
    ],
    confidenceMultiplier: 0.68,
    proofRequirements: [
      'sibling product identity',
      'vendor/category family',
      'reason exact proof is unavailable',
      'unit basis',
      'observed date',
    ],
    freshness: {
      maxAgeDays: 14,
      requirement: 'Sibling fallback should use a recent observation within 14 days.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.broad,
    visibleLabel: 'Sibling category estimate',
    visibleLabelRequirement: 'Label as sibling/category estimate and show the sibling item.',
    sourceTransparency: [
      'sibling item name',
      'vendor/category family',
      'observed date',
      'unit basis',
      'missing exact proof reason',
    ],
    hardStopRules: [
      'Block if sibling crosses canonical form, edible part, concentration, species, or prepared/raw boundary.',
      'Block if category family is too broad to defend the estimate.',
    ],
    downgradeRules: [
      'Downgrade to review_required when sibling spread is high or only one sibling exists.',
      'Downgrade to review_required when store or region differs from the requested context.',
    ],
    finalCostingState: 'allowed_with_estimate',
  },
  {
    step: 'regional_fallback',
    order: 6,
    sourceKinds: ['regional_average'],
    label: 'Regional average fallback',
    allowedConditions: [
      'Regional market data exists for the same canonical identity or tightly curated category.',
      'Regional sample size and freshness meet minimum policy.',
      'No stronger local, exact, canonical, equivalent, or sibling proof exists.',
    ],
    blockedConditions: [
      'Region has unreliable coverage or no recent market observations.',
      'Regional category collapses unsafe forms or prepared products.',
      'Estimate is presented as a store-specific shopping promise.',
    ],
    confidenceMultiplier: 0.58,
    proofRequirements: [
      'region identifier',
      'sample size',
      'source set',
      'freshness window',
      'canonical identity or curated category',
    ],
    freshness: {
      maxAgeDays: 21,
      requirement: 'Regional average should use observations within 21 days.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.broad,
    visibleLabel: 'Regional estimate',
    visibleLabelRequirement: 'Label as regional estimate and never as local shelf price.',
    sourceTransparency: [
      'region',
      'sample size',
      'source set',
      'freshness window',
      'category basis',
    ],
    hardStopRules: [
      'Block if regional coverage is unreliable or source freshness is unknown.',
      'Block shopping-safe claims; this cannot promise a specific store price.',
    ],
    downgradeRules: [
      'Downgrade to review_required when sample size is thin, volatile, or state reliability is weak.',
      'Downgrade to review_required when requested store/metro is outside the sampled region.',
    ],
    finalCostingState: 'allowed_with_estimate',
  },
  {
    step: 'national_fallback',
    order: 7,
    sourceKinds: ['national_baseline'],
    label: 'National baseline fallback',
    allowedConditions: [
      'National baseline exists for the canonical identity or defensible commodity/category group.',
      'Regional/local proof is missing or below reliability threshold.',
      'Use is limited to planning, quoting review, or rough cost context.',
    ],
    blockedConditions: [
      'Ingredient has severe local volatility and no region adjustment.',
      'National baseline is stale, synthetic, or category-collapsed without disclosure.',
      'Output is being used for final event quote without review when margin risk is material.',
    ],
    confidenceMultiplier: 0.46,
    proofRequirements: [
      'national baseline source',
      'commodity/category basis',
      'sample size or source rationale',
      'freshness window',
      'local proof unavailable reason',
    ],
    freshness: {
      maxAgeDays: 45,
      requirement:
        'National baselines should be refreshed within 45 days unless source cadence is slower.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.broad,
    visibleLabel: 'National benchmark',
    visibleLabelRequirement: 'Label as national benchmark and show that it is not local proof.',
    sourceTransparency: [
      'national source',
      'commodity/category basis',
      'freshness window',
      'sample rationale',
      'local proof unavailable reason',
    ],
    hardStopRules: [
      'Block final allowed costing when region drift is material and no adjustment exists.',
      'Block if national category cannot preserve canonical identity.',
    ],
    downgradeRules: [
      'Downgrade to review_required for volatile produce, seafood, specialty, or imported ingredients.',
      'Downgrade to review_required when the baseline source cadence is unknown.',
    ],
    finalCostingState: 'review_required',
  },
  {
    step: 'synthetic_fallback',
    order: 8,
    sourceKinds: ['synthetic_floor', 'synthetic_model'],
    label: 'Synthetic floor/model fallback',
    allowedConditions: [
      'No direct, SKU, canonical, equivalent, sibling, regional, or national price is reliable.',
      'Model/floor method is deterministic and exposes assumptions.',
      'Use is limited to gap surfacing, draft costing, or manual review queues.',
    ],
    blockedConditions: [
      'Synthetic value is used as proof of a market price.',
      'Model lacks a floor basis, comparable group, or uncertainty disclosure.',
      'Output would materially affect a client quote without human review.',
    ],
    confidenceMultiplier: 0.28,
    proofRequirements: [
      'model or floor version',
      'assumption set',
      'comparable group when present',
      'uncertainty band',
      'reason no market proof exists',
    ],
    freshness: {
      maxAgeDays: null,
      requirement:
        'Synthetic fallback freshness follows model versioning, not market observation age.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.modeled,
    visibleLabel: 'Synthetic estimate',
    visibleLabelRequirement: 'Label as synthetic/model estimate with assumption disclosure.',
    sourceTransparency: [
      'model or floor version',
      'assumption set',
      'uncertainty band',
      'missing market proof reason',
    ],
    hardStopRules: [
      'Block allowed and allowed_with_estimate final costing for client-facing price commitments.',
      'Block if synthetic assumptions are unavailable or non-deterministic.',
    ],
    downgradeRules: [
      'Always require review before final costing.',
      'Route to data acquisition when a market proof source should exist.',
    ],
    finalCostingState: 'review_required',
  },
  {
    step: 'substitution_fallback',
    order: 9,
    sourceKinds: ['substitution_price'],
    label: 'Substitution price fallback',
    allowedConditions: [
      'Replacement ingredient is intentionally selected and approved for the use case.',
      'Dietary, allergen, culinary function, unit, yield, and price proof exist for the replacement.',
      'Substitution price is stored as replacement cost, not original ingredient truth.',
    ],
    blockedConditions: [
      'Client, dietary, allergen, or chef approval is missing when required.',
      'Replacement ingredient cannot perform the same culinary role.',
      'Substitution price would overwrite the original ingredient market truth.',
    ],
    confidenceMultiplier: 0.4,
    proofRequirements: [
      'replacement canonical identity',
      'approval trail',
      'dietary and allergen check',
      'replacement price proof',
      'unit and yield compatibility',
    ],
    freshness: {
      maxAgeDays: 14,
      requirement: 'Replacement price proof should be observed within 14 days.',
    },
    regionStorePenalties: REGION_STORE_PENALTIES.substitution,
    visibleLabel: 'Substitution estimate',
    visibleLabelRequirement:
      'Label as substitution estimate and show replacement identity, approval, and delta.',
    sourceTransparency: [
      'replacement identity',
      'approval trail',
      'replacement price source',
      'unit/yield compatibility',
      'price delta',
    ],
    hardStopRules: [
      'Block if substitution approval, allergen check, dietary check, or replacement price proof is missing.',
      'Block rewriting the original ingredient price truth from substitution data.',
    ],
    downgradeRules: [
      'Downgrade to review_required when substitution is operational but not client-approved.',
      'Downgrade to review_required when replacement source is stale or nonlocal.',
    ],
    finalCostingState: 'allowed_with_estimate',
  },
]

export const FALLBACK_DECISION_TABLE = PIE_FALLBACK_DECISION_TABLE

export const PIE_RELIABILITY_RISK_DEFINITIONS: readonly PieReliabilityRiskDefinition[] = [
  {
    code: 'ambiguous_string',
    label: 'Ambiguous string',
    severity: 'medium',
    confidenceMultiplier: 0.75,
    maxFinalCostingState: 'review_required',
    detectionSignals: ['raw ingredient text maps to multiple canonical identities'],
    hardStopRules: ['Block direct proof claims until the canonical identity is selected.'],
    downgradeRules: ['Downgrade any non-blocked fallback to review_required.'],
    requiredResolutionProof: ['canonical identity selection', 'disambiguation reason'],
    sourceTransparency: ['raw string', 'candidate identities', 'selected identity'],
  },
  {
    code: 'form_collapse',
    label: 'Form collapse',
    severity: 'high',
    confidenceMultiplier: 0.45,
    maxFinalCostingState: 'blocked',
    detectionSignals: ['fresh/dried/canned/extract/prepared forms share a price family'],
    hardStopRules: ['Block when form or processing state changes price truth.'],
    downgradeRules: ['Downgrade to review_required only after form proof is partially recovered.'],
    requiredResolutionProof: ['form proof', 'processing state proof', 'safe equivalence rule'],
    sourceTransparency: ['requested form', 'priced form', 'form difference'],
  },
  {
    code: 'unit_mismatch',
    label: 'Unit mismatch',
    severity: 'blocker',
    confidenceMultiplier: 0.35,
    maxFinalCostingState: 'blocked',
    detectionSignals: ['purchase unit cannot convert into recipe unit'],
    hardStopRules: ['Block final costing until unit conversion proof exists.'],
    downgradeRules: ['No downgrade is safe without unit proof.'],
    requiredResolutionProof: ['purchase unit', 'recipe unit', 'conversion basis'],
    sourceTransparency: ['purchase unit', 'recipe unit', 'conversion basis'],
  },
  {
    code: 'missing_yield',
    label: 'Missing yield',
    severity: 'blocker',
    confidenceMultiplier: 0.4,
    maxFinalCostingState: 'blocked',
    detectionSignals: ['trim, bone, shell, drained, cooked, picked, or density yield is required'],
    hardStopRules: ['Block final costing when edible yield is required and missing.'],
    downgradeRules: ['Downgrade only to review_required when a conservative yield band exists.'],
    requiredResolutionProof: ['yield basis', 'edible portion conversion'],
    sourceTransparency: ['yield basis', 'missing yield class'],
  },
  {
    code: 'prepared_sku',
    label: 'Prepared SKU',
    severity: 'blocker',
    confidenceMultiplier: 0,
    maxFinalCostingState: 'blocked',
    detectionSignals: [
      'SKU is cooked, ready-to-eat, kit, entree, marinade, salad kit, or prepared sauce',
    ],
    hardStopRules: ['Block prepared SKUs from seeding raw ingredient price truth.'],
    downgradeRules: [
      'Prepared SKU may only become substitution or recipe-component evidence after review.',
    ],
    requiredResolutionProof: ['raw ingredient SKU or explicit component split'],
    sourceTransparency: ['prepared product name', 'prepared/raw reason'],
  },
  {
    code: 'cultural_false_friend',
    label: 'Cultural false friend',
    severity: 'high',
    confidenceMultiplier: 0.3,
    maxFinalCostingState: 'blocked',
    detectionSignals: [
      'same or translated name points to different plant part, species, form, or cuisine-specific item',
    ],
    hardStopRules: [
      'Block until culinary identity, edible part, and regional naming are resolved.',
    ],
    downgradeRules: ['Downgrade to review_required when candidates are known but not selected.'],
    requiredResolutionProof: ['culinary identity', 'edible part', 'locale or cuisine context'],
    sourceTransparency: ['raw name', 'locale/cuisine context', 'selected culinary identity'],
  },
  {
    code: 'stale_price',
    label: 'Stale price',
    severity: 'medium',
    confidenceMultiplier: 0.72,
    maxFinalCostingState: 'allowed_with_estimate',
    detectionSignals: ['source age exceeds fallback freshness requirement'],
    hardStopRules: [
      'Block if stale proof is the only source for volatile or client-committed costing.',
    ],
    downgradeRules: [
      'Downgrade allowed proof to allowed_with_estimate or review_required by volatility.',
    ],
    requiredResolutionProof: ['fresh source timestamp or accepted stale-source rationale'],
    sourceTransparency: ['observed date', 'freshness policy', 'source age'],
  },
  {
    code: 'region_drift',
    label: 'Region drift',
    severity: 'medium',
    confidenceMultiplier: 0.7,
    maxFinalCostingState: 'allowed_with_estimate',
    detectionSignals: ['priced region does not match requested chef, store, metro, or state'],
    hardStopRules: [
      'Block local-shopping claims when source region differs from requested region.',
    ],
    downgradeRules: ['Downgrade final costing by region distance and state reliability.'],
    requiredResolutionProof: ['requested region', 'source region', 'region adjustment rationale'],
    sourceTransparency: ['requested region', 'source region', 'region/store penalty'],
  },
  {
    code: 'substitution_drift',
    label: 'Substitution drift',
    severity: 'high',
    confidenceMultiplier: 0.5,
    maxFinalCostingState: 'review_required',
    detectionSignals: [
      'replacement differs in function, allergen, dietary status, yield, or culinary outcome',
    ],
    hardStopRules: [
      'Block unapproved substitutions and substitutions that alter dietary/allergen truth.',
    ],
    downgradeRules: [
      'Downgrade approved substitutions to review_required when price delta or function is uncertain.',
    ],
    requiredResolutionProof: [
      'approval trail',
      'culinary function proof',
      'dietary and allergen check',
    ],
    sourceTransparency: [
      'original identity',
      'replacement identity',
      'approval trail',
      'price delta',
    ],
  },
  {
    code: 'synthetic_fallback',
    label: 'Synthetic fallback',
    severity: 'high',
    confidenceMultiplier: 0.45,
    maxFinalCostingState: 'review_required',
    detectionSignals: [
      'price comes from a model, floor, synthetic comparable, or missing-market estimate',
    ],
    hardStopRules: ['Block treating synthetic values as observed market proof.'],
    downgradeRules: ['Always require review before quote commitment or final event costing.'],
    requiredResolutionProof: ['model version', 'assumption set', 'uncertainty band'],
    sourceTransparency: [
      'model version',
      'assumptions',
      'uncertainty band',
      'missing proof reason',
    ],
  },
]

export const RELIABILITY_RISK_DEFINITIONS = PIE_RELIABILITY_RISK_DEFINITIONS

const stateRank: Record<PieFinalCostingState, number> = {
  blocked: 0,
  review_required: 1,
  allowed_with_estimate: 2,
  allowed: 3,
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function mostRestrictiveState(
  current: PieFinalCostingState,
  candidate: PieFinalCostingState
): PieFinalCostingState {
  return stateRank[candidate] < stateRank[current] ? candidate : current
}

function regionPenaltyFor(
  row: PieFallbackDecisionRow,
  scope: PieFallbackRegionStoreScope | undefined
): number {
  switch (scope ?? 'same_store') {
    case 'same_store':
      return row.regionStorePenalties.sameStore
    case 'same_chain_same_region':
      return row.regionStorePenalties.sameChainSameRegion
    case 'same_region':
      return row.regionStorePenalties.sameRegion
    case 'neighbor_region':
      return row.regionStorePenalties.neighborRegion
    case 'national':
      return row.regionStorePenalties.national
    case 'unknown':
      return row.regionStorePenalties.unknown
  }
}

export function getPieFallbackDecisionRow(step: PieFallbackStepId): PieFallbackDecisionRow {
  const row = PIE_FALLBACK_DECISION_TABLE.find((candidate) => candidate.step === step)
  if (!row) throw new Error(`Unknown PIE fallback step: ${step}`)
  return row
}

export function getPieReliabilityRiskDefinition(
  code: PieReliabilityRiskCode
): PieReliabilityRiskDefinition {
  const risk = PIE_RELIABILITY_RISK_DEFINITIONS.find((candidate) => candidate.code === code)
  if (!risk) throw new Error(`Unknown PIE reliability risk: ${code}`)
  return risk
}

export function evaluatePieFallbackContract(
  input: EvaluatePieFallbackContractInput
): PieFallbackContractEvaluation {
  const row = getPieFallbackDecisionRow(input.step)
  const presentProof = new Set(input.presentProof ?? [])
  const risks = (input.riskCodes ?? []).map(getPieReliabilityRiskDefinition)
  const requiredProof = new Set(row.proofRequirements)
  const hardStops = new Set<string>()
  const downgrades = new Set<string>()

  for (const risk of risks) {
    for (const proof of risk.requiredResolutionProof) requiredProof.add(proof)
    for (const rule of risk.hardStopRules) {
      if (risk.maxFinalCostingState === 'blocked') hardStops.add(rule)
    }
    for (const rule of risk.downgradeRules) downgrades.add(rule)
  }

  if (input.step === 'substitution_fallback' && input.substitutionApproved !== true) {
    hardStops.add('Block substitution fallback until required approval is present.')
    requiredProof.add('substitution approval')
  }

  if (
    row.freshness.maxAgeDays !== null &&
    input.sourceAgeDays !== null &&
    input.sourceAgeDays !== undefined
  ) {
    if (input.sourceAgeDays > row.freshness.maxAgeDays) {
      downgrades.add(
        `Source is ${input.sourceAgeDays} days old; policy max is ${row.freshness.maxAgeDays}.`
      )
      requiredProof.add('fresh source timestamp or stale-source rationale')
    }
  }

  const missingProof = Array.from(requiredProof).filter((proof) => !presentProof.has(proof))
  if (missingProof.length > 0) {
    downgrades.add('Required proof is missing for the selected fallback step.')
  }

  let finalCostingState = row.finalCostingState
  for (const risk of risks) {
    finalCostingState = mostRestrictiveState(finalCostingState, risk.maxFinalCostingState)
  }

  if (hardStops.size > 0) {
    finalCostingState = 'blocked'
  } else if (missingProof.length > 0) {
    if (row.step === 'direct_proof' || row.step === 'sku_proof' || row.step === 'canonical_proof') {
      finalCostingState = 'blocked'
    } else {
      finalCostingState = mostRestrictiveState(finalCostingState, 'review_required')
    }
  } else if (downgrades.size > 0) {
    finalCostingState = mostRestrictiveState(finalCostingState, 'allowed_with_estimate')
  }

  const riskMultiplier = risks.reduce((score, risk) => score * risk.confidenceMultiplier, 1)
  const confidenceMultiplier = clamp01(
    row.confidenceMultiplier * regionPenaltyFor(row, input.regionStoreScope) * riskMultiplier
  )
  const confidenceScore = clamp01((input.baseConfidence ?? 1) * confidenceMultiplier)

  return {
    step: row.step,
    finalCostingState,
    confidenceScore,
    confidenceMultiplier,
    visibleLabel: row.visibleLabel,
    sourceTransparency: row.sourceTransparency,
    requiredProof: Array.from(requiredProof),
    missingProof,
    hardStops: Array.from(hardStops),
    downgrades: Array.from(downgrades),
    risks,
  }
}

export function getPieFallbackCompletionReport() {
  const steps = PIE_FALLBACK_DECISION_TABLE.map((row) => row.step)
  const risks = PIE_RELIABILITY_RISK_DEFINITIONS.map((risk) => risk.code)

  return {
    stepCount: steps.length,
    steps,
    riskCount: risks.length,
    risks,
    finalCostingStates: Object.keys(stateRank) as PieFinalCostingState[],
  }
}
