import type {
  FinalCostingState,
  NativeOracleServingMode,
  OracleReliabilityBucket,
} from './pie-national-price-oracle-contract.js'

export type NativeServingFreshnessBucket = 'fresh_7d' | 'usable_14d' | 'stale_30d' | 'expired'

export type NativeServingRepairAction =
  | 'refresh_native_observation'
  | 'seed_regional_cell'
  | 'quarantine_anomaly'
  | 'validate_repair_estimate'
  | 'recompute_unit_basis'

export type NativeServingRepairStatus =
  | 'healthy'
  | 'refresh_needed'
  | 'missing_region'
  | 'anomaly_quarantined'
  | 'repair_estimate'
  | 'blocked'

export type NativeServingAnomalyStatus = 'none' | 'suspected' | 'quarantined'

export interface NativeServingIndexKeyInput {
  canonicalIdentityId: string
  pricingRegion: string
  unitBasis: string
  freshnessBucket: NativeServingFreshnessBucket
}

export interface NativeServingIndexProvenance {
  nativeObservationId: string
  observationSource: 'openclaw_store_observation' | 'usda_baseline' | 'native_repair_model'
  normalizationLineageId: string
  censusIngredientId: string
}

export interface NativeServingConfidence {
  bucket: OracleReliabilityBucket
  score: number
  calibrationVersion: string
}

export interface NativeServingUncertainty {
  rangePct: number
  reason: string
}

export interface NativeServingRepairState {
  status: NativeServingRepairStatus
  actions: NativeServingRepairAction[]
}

export interface NativeServingIndexCell {
  key: string
  canonicalIdentityId: string
  pricingRegion: string
  unitBasis: string
  freshnessBucket: NativeServingFreshnessBucket
  priceCents: number | null
  currency: 'USD'
  provenance: NativeServingIndexProvenance
  observedAt: string
  computedAt: string
  confidence: NativeServingConfidence
  uncertainty: NativeServingUncertainty
  sourceLineage: string[]
  repair: NativeServingRepairState
  anomalyStatus: NativeServingAnomalyStatus
}

export interface NativeServingIndexFixture {
  id: string
  servingMode: NativeOracleServingMode
  precomputedForRegion: boolean
  requiresExternalCompanyAtServeTime: boolean
  usesUserSubmittedPriceAsMarketTruth: boolean
  requiresTenantOrUserData: boolean
  cell: NativeServingIndexCell
}

export interface NativeServingIndexEvaluation {
  finalCostingState: FinalCostingState
  reliability: OracleReliabilityBucket
  visibleLabel: string
  blockers: string[]
  degradedLabels: string[]
  repairActions: NativeServingRepairAction[]
  canServeDuringExternalOutage: boolean
  requiresTenantOrUserData: boolean
}

export const NATIVE_SERVING_INDEX_KEY_PARTS = [
  'canonicalIdentityId',
  'pricingRegion',
  'unitBasis',
  'freshnessBucket',
] as const

export const BLOCKED_NATIVE_SERVING_MODES: NativeOracleServingMode[] = [
  'external_api_fetch',
  'request_time_crawl',
  'user_supplied_market_price',
]

export function makeNativeServingIndexKey(input: NativeServingIndexKeyInput) {
  return NATIVE_SERVING_INDEX_KEY_PARTS.map((part) => input[part]).join('::')
}

function makeCell(
  input: Omit<NativeServingIndexCell, 'key' | 'currency' | 'provenance' | 'sourceLineage'> & {
    provenance?: Partial<NativeServingIndexProvenance>
    sourceLineage?: string[]
  }
): NativeServingIndexCell {
  return {
    ...input,
    key: makeNativeServingIndexKey(input),
    currency: 'USD',
    provenance: {
      nativeObservationId:
        input.provenance?.nativeObservationId ?? `obs-${input.canonicalIdentityId}`,
      observationSource: input.provenance?.observationSource ?? 'openclaw_store_observation',
      normalizationLineageId:
        input.provenance?.normalizationLineageId ?? `norm-${input.canonicalIdentityId}`,
      censusIngredientId: input.provenance?.censusIngredientId ?? input.canonicalIdentityId,
    },
    sourceLineage: input.sourceLineage ?? ['openclaw.native_observations', 'pie.serving_index'],
  }
}

export const NATIVE_SERVING_INDEX_FIXTURES: NativeServingIndexFixture[] = [
  {
    id: 'direct-native-truth',
    servingMode: 'precomputed_native_index',
    precomputedForRegion: true,
    requiresExternalCompanyAtServeTime: false,
    usesUserSubmittedPriceAsMarketTruth: false,
    requiresTenantOrUserData: false,
    cell: makeCell({
      canonicalIdentityId: 'plant.tomato.fruit.fresh',
      pricingRegion: 'us-ca-los-angeles',
      unitBasis: 'lb',
      freshnessBucket: 'fresh_7d',
      priceCents: 349,
      observedAt: '2026-05-20T12:00:00.000Z',
      computedAt: '2026-05-20T13:00:00.000Z',
      confidence: { bucket: 'direct_proof', score: 0.96, calibrationVersion: 'pie-v1' },
      uncertainty: { rangePct: 4, reason: 'multi-source regional agreement' },
      repair: { status: 'healthy', actions: [] },
      anomalyStatus: 'none',
    }),
  },
  {
    id: 'stale-but-servable',
    servingMode: 'precomputed_native_index',
    precomputedForRegion: true,
    requiresExternalCompanyAtServeTime: false,
    usesUserSubmittedPriceAsMarketTruth: false,
    requiresTenantOrUserData: false,
    cell: makeCell({
      canonicalIdentityId: 'plant.basil.leaf.fresh',
      pricingRegion: 'us-ny-new-york',
      unitBasis: 'bunch',
      freshnessBucket: 'stale_30d',
      priceCents: 229,
      observedAt: '2026-04-25T12:00:00.000Z',
      computedAt: '2026-05-20T13:00:00.000Z',
      confidence: { bucket: 'estimate_labeled', score: 0.62, calibrationVersion: 'pie-v1' },
      uncertainty: { rangePct: 18, reason: 'stale herb cell' },
      repair: { status: 'refresh_needed', actions: ['refresh_native_observation'] },
      anomalyStatus: 'none',
    }),
  },
  {
    id: 'missing-regional-cell',
    servingMode: 'precomputed_native_index',
    precomputedForRegion: false,
    requiresExternalCompanyAtServeTime: false,
    usesUserSubmittedPriceAsMarketTruth: false,
    requiresTenantOrUserData: false,
    cell: makeCell({
      canonicalIdentityId: 'animal.salmon.muscle.fillet',
      pricingRegion: 'us-ak-anchorage',
      unitBasis: 'lb',
      freshnessBucket: 'expired',
      priceCents: null,
      observedAt: '2026-03-15T12:00:00.000Z',
      computedAt: '2026-05-20T13:00:00.000Z',
      confidence: { bucket: 'review_required', score: 0.2, calibrationVersion: 'pie-v1' },
      uncertainty: { rangePct: 100, reason: 'regional cell missing' },
      repair: { status: 'missing_region', actions: ['seed_regional_cell'] },
      anomalyStatus: 'none',
    }),
  },
  {
    id: 'external-dependency-blocked',
    servingMode: 'external_api_fetch',
    precomputedForRegion: true,
    requiresExternalCompanyAtServeTime: true,
    usesUserSubmittedPriceAsMarketTruth: false,
    requiresTenantOrUserData: false,
    cell: makeCell({
      canonicalIdentityId: 'plant.wheat.seed.flour.ap',
      pricingRegion: 'us-il-chicago',
      unitBasis: 'lb',
      freshnessBucket: 'fresh_7d',
      priceCents: 88,
      observedAt: '2026-05-20T12:00:00.000Z',
      computedAt: '2026-05-20T13:00:00.000Z',
      confidence: { bucket: 'blocked', score: 0, calibrationVersion: 'pie-v1' },
      uncertainty: { rangePct: 100, reason: 'requires external provider at serve time' },
      repair: { status: 'blocked', actions: ['seed_regional_cell'] },
      anomalyStatus: 'none',
    }),
  },
  {
    id: 'user-price-blocked',
    servingMode: 'user_supplied_market_price',
    precomputedForRegion: false,
    requiresExternalCompanyAtServeTime: false,
    usesUserSubmittedPriceAsMarketTruth: true,
    requiresTenantOrUserData: true,
    cell: makeCell({
      canonicalIdentityId: 'plant.olive.fruit.oil-extra-virgin',
      pricingRegion: 'us-tx-austin',
      unitBasis: 'liter',
      freshnessBucket: 'fresh_7d',
      priceCents: 1499,
      observedAt: '2026-05-20T12:00:00.000Z',
      computedAt: '2026-05-20T13:00:00.000Z',
      confidence: { bucket: 'blocked', score: 0, calibrationVersion: 'pie-v1' },
      uncertainty: { rangePct: 100, reason: 'user-entered price cannot become market truth' },
      repair: { status: 'blocked', actions: ['seed_regional_cell'] },
      anomalyStatus: 'none',
    }),
  },
  {
    id: 'repair-estimate',
    servingMode: 'native_background_repair',
    precomputedForRegion: true,
    requiresExternalCompanyAtServeTime: false,
    usesUserSubmittedPriceAsMarketTruth: false,
    requiresTenantOrUserData: false,
    cell: makeCell({
      canonicalIdentityId: 'plant.vanilla.fruit.extract',
      pricingRegion: 'us-wa-seattle',
      unitBasis: 'fl_oz',
      freshnessBucket: 'usable_14d',
      priceCents: 238,
      observedAt: '2026-05-10T12:00:00.000Z',
      computedAt: '2026-05-20T13:00:00.000Z',
      confidence: { bucket: 'estimate_labeled', score: 0.7, calibrationVersion: 'pie-v1' },
      uncertainty: { rangePct: 12, reason: 'native repair model interpolation' },
      sourceLineage: [
        'openclaw.native_observations',
        'pie.native_repair_model',
        'pie.serving_index',
      ],
      provenance: { observationSource: 'native_repair_model' },
      repair: { status: 'repair_estimate', actions: ['validate_repair_estimate'] },
      anomalyStatus: 'none',
    }),
  },
]

export function evaluateNativeServingIndexRequest(
  fixture: NativeServingIndexFixture
): NativeServingIndexEvaluation {
  const blockers: string[] = []
  const degradedLabels: string[] = []
  const repairActions = new Set<NativeServingRepairAction>(fixture.cell.repair.actions)

  if (fixture.requiresExternalCompanyAtServeTime) {
    blockers.push('external company required at serve time')
  }
  if (fixture.usesUserSubmittedPriceAsMarketTruth) {
    blockers.push('user-submitted price cannot become market truth')
  }
  if (fixture.servingMode === 'external_api_fetch') {
    blockers.push('external API fetch is not native serving')
  }
  if (fixture.servingMode === 'request_time_crawl') {
    blockers.push('request-time crawl is not instant precomputed serving')
  }
  if (fixture.servingMode === 'user_supplied_market_price') {
    blockers.push('user-supplied market price is not canonical truth')
  }

  if (fixture.cell.freshnessBucket === 'stale_30d' || fixture.cell.freshnessBucket === 'expired') {
    degradedLabels.push('Stale native price')
    repairActions.add('refresh_native_observation')
  }
  if (!fixture.precomputedForRegion || fixture.cell.priceCents === null) {
    degradedLabels.push('Regional price missing')
    repairActions.add('seed_regional_cell')
  }
  if (fixture.cell.anomalyStatus !== 'none') {
    degradedLabels.push('Anomalous price')
    repairActions.add('quarantine_anomaly')
  }
  if (fixture.cell.repair.status === 'repair_estimate') {
    degradedLabels.push('Repair estimate')
    repairActions.add('validate_repair_estimate')
  }

  const canServeDuringExternalOutage =
    !fixture.requiresExternalCompanyAtServeTime &&
    fixture.servingMode !== 'external_api_fetch' &&
    fixture.servingMode !== 'request_time_crawl'

  if (blockers.length > 0) {
    return {
      finalCostingState: 'blocked',
      reliability: 'blocked',
      visibleLabel: 'Blocked from native price truth',
      blockers,
      degradedLabels,
      repairActions: [...repairActions],
      canServeDuringExternalOutage,
      requiresTenantOrUserData: fixture.requiresTenantOrUserData,
    }
  }

  if (!fixture.precomputedForRegion || fixture.cell.priceCents === null) {
    return {
      finalCostingState: 'review_required',
      reliability: 'review_required',
      visibleLabel: 'Native regional cell required',
      blockers,
      degradedLabels,
      repairActions: [...repairActions],
      canServeDuringExternalOutage,
      requiresTenantOrUserData: fixture.requiresTenantOrUserData,
    }
  }

  if (degradedLabels.length > 0 || fixture.servingMode === 'native_background_repair') {
    return {
      finalCostingState: 'allowed_with_estimate',
      reliability: 'estimate_labeled',
      visibleLabel:
        fixture.servingMode === 'native_background_repair'
          ? 'Native repair estimate'
          : 'Degraded native price truth',
      blockers,
      degradedLabels,
      repairActions: [...repairActions],
      canServeDuringExternalOutage,
      requiresTenantOrUserData: fixture.requiresTenantOrUserData,
    }
  }

  return {
    finalCostingState: 'allowed',
    reliability: 'direct_proof',
    visibleLabel: 'Native price truth',
    blockers,
    degradedLabels,
    repairActions: [...repairActions],
    canServeDuringExternalOutage,
    requiresTenantOrUserData: fixture.requiresTenantOrUserData,
  }
}

export function getNativeServingIndexContractReport() {
  const fixtureIds = new Set(NATIVE_SERVING_INDEX_FIXTURES.map((fixture) => fixture.id))
  const requiredFixtures = [
    'direct-native-truth',
    'stale-but-servable',
    'missing-regional-cell',
    'external-dependency-blocked',
    'user-price-blocked',
    'repair-estimate',
  ]

  return {
    keyParts: [...NATIVE_SERVING_INDEX_KEY_PARTS],
    fixtureCount: NATIVE_SERVING_INDEX_FIXTURES.length,
    missingFixtureScenarios: requiredFixtures.filter((fixture) => !fixtureIds.has(fixture)),
    blockedServingModes: [...BLOCKED_NATIVE_SERVING_MODES],
  }
}
