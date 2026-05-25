import type { Sql } from 'postgres'

type PricingSql = Sql<any>

export const US_STATE_CODES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DC',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
] as const

export type StateReliabilityStatus = 'reliable' | 'usable' | 'estimated' | 'unreliable'

export type StateReliabilityBlocker =
  | 'no_local_prices'
  | 'sparse_local_prices'
  | 'sparse_store_coverage'
  | 'stale_7d'
  | 'unvalidated_accuracy'
  | 'accuracy_below_target'
  | 'synthetic_heavy'

export interface StateReliabilityTargets {
  minPricedProducts: number
  minStores: number
  minChains: number
  minFresh7dPct: number
  minFresh30dPct: number
  minResolvedCells: number
  minRealResolvedPct: number
  minAvgSourceCount: number
  minAccuracyComparisons: number
  minAccuracyPct: number
  maxMeanAbsErrorPct: number
}

export const STATE_RELIABILITY_TARGETS: StateReliabilityTargets = {
  minPricedProducts: 50_000,
  minStores: 25,
  minChains: 5,
  minFresh7dPct: 50,
  minFresh30dPct: 80,
  minResolvedCells: 10_000,
  minRealResolvedPct: 70,
  minAvgSourceCount: 3,
  minAccuracyComparisons: 30,
  minAccuracyPct: 80,
  maxMeanAbsErrorPct: 15,
}

export interface StateReliabilityMetrics {
  state: string
  pricedProducts: number
  stores: number
  chains: number
  fresh7d: number
  fresh30d: number
  fresh7dPct: number
  fresh30dPct: number
  newestSeen: string | null
  resolvedCells: number
  realResolvedCells: number
  syntheticResolvedCells: number
  realResolvedPct: number
  avgSourceCount: number
  avgConfidence: number
  accuracyComparisons: number
  accuracyPct: number | null
  meanAbsErrorPct: number | null
}

export interface StateReliabilityResult extends StateReliabilityMetrics {
  score: number
  status: StateReliabilityStatus
  blockers: StateReliabilityBlocker[]
}

export interface StateReliabilityReport {
  generatedAt: string
  targets: StateReliabilityTargets
  states: StateReliabilityResult[]
  summary: {
    totalStates: number
    reliable: number
    usable: number
    estimated: number
    unreliable: number
    unvalidated: number
  }
}

export type PriceReliabilityClaimLevel =
  | 'reliable_local'
  | 'usable_local_estimate'
  | 'state_estimate'
  | 'unreliable_state_estimate'
  | 'national_or_synthetic'
  | 'unknown_state'

export interface PriceStateReliabilityAssessment {
  state: string | null
  status: StateReliabilityStatus | null
  score: number | null
  blockers: StateReliabilityBlocker[]
  claimLevel: PriceReliabilityClaimLevel
  canClaimReliableLocal: boolean
  effectiveConfidenceScore: number
  note: string
}

type StoreAggregateRow = {
  state: string
  priced_products: number
  stores: number
  chains: number
  fresh_7d: number
  fresh_30d: number
  fresh_7d_pct: number
  fresh_30d_pct: number
  newest_seen: string | null
}

type ResolvedAggregateRow = {
  state: string
  resolved_cells: number
  real_resolved_cells: number
  synthetic_resolved_cells: number
  real_resolved_pct: number
  avg_source_count: number
  avg_confidence: number
}

type AccuracyAggregateRow = {
  state: string
  accuracy_comparisons: number
  accuracy_pct: number | null
  mean_abs_error_pct: number | null
}

function asNumber(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 10_000) / 100
}

function scoreRatio(value: number, target: number, points: number): number {
  if (target <= 0) return points
  return Math.min(points, (value / target) * points)
}

function emptyMetrics(state: string): StateReliabilityMetrics {
  return {
    state,
    pricedProducts: 0,
    stores: 0,
    chains: 0,
    fresh7d: 0,
    fresh30d: 0,
    fresh7dPct: 0,
    fresh30dPct: 0,
    newestSeen: null,
    resolvedCells: 0,
    realResolvedCells: 0,
    syntheticResolvedCells: 0,
    realResolvedPct: 0,
    avgSourceCount: 0,
    avgConfidence: 0,
    accuracyComparisons: 0,
    accuracyPct: null,
    meanAbsErrorPct: null,
  }
}

export function normalizeStateCode(state: string | null | undefined): string | null {
  const normalized = state?.trim().toUpperCase()
  if (!normalized) return null
  return (US_STATE_CODES as readonly string[]).includes(normalized) ? normalized : null
}

export function assessPriceStateReliability(input: {
  stateReliability: StateReliabilityResult | null
  resolutionTier: string | null | undefined
  confidenceScore: number
}): PriceStateReliabilityAssessment {
  const confidenceScore = Math.max(0, Math.min(1, input.confidenceScore || 0))
  const localizedTier = input.resolutionTier === 'zip_local' || input.resolutionTier === 'regional'

  if (!localizedTier) {
    return {
      state: input.stateReliability?.state ?? null,
      status: input.stateReliability?.status ?? null,
      score: input.stateReliability?.score ?? null,
      blockers: input.stateReliability?.blockers ?? [],
      claimLevel: 'national_or_synthetic',
      canClaimReliableLocal: false,
      effectiveConfidenceScore: confidenceScore,
      note: 'Price is not based on local or regional store data.',
    }
  }

  if (!input.stateReliability) {
    return {
      state: null,
      status: null,
      score: null,
      blockers: [],
      claimLevel: 'unknown_state',
      canClaimReliableLocal: false,
      effectiveConfidenceScore: Math.min(confidenceScore, 0.3),
      note: 'State reliability could not be determined for the requested ZIP.',
    }
  }

  const caps: Record<StateReliabilityStatus, number> = {
    reliable: 1,
    usable: 0.75,
    estimated: 0.5,
    unreliable: 0.25,
  }

  const claimLevels: Record<StateReliabilityStatus, PriceReliabilityClaimLevel> = {
    reliable: 'reliable_local',
    usable: 'usable_local_estimate',
    estimated: 'state_estimate',
    unreliable: 'unreliable_state_estimate',
  }

  const notes: Record<StateReliabilityStatus, string> = {
    reliable:
      'State has enough coverage, freshness, and validation to claim reliable local pricing.',
    usable:
      'State has enough coverage for a local estimate, but not enough proof for reliable local pricing.',
    estimated:
      'State pricing is estimated or unvalidated; do not present it as reliable local pricing.',
    unreliable: 'State pricing is unreliable; treat this as a weak estimate only.',
  }

  return {
    state: input.stateReliability.state,
    status: input.stateReliability.status,
    score: input.stateReliability.score,
    blockers: input.stateReliability.blockers,
    claimLevel: claimLevels[input.stateReliability.status],
    canClaimReliableLocal: input.stateReliability.status === 'reliable',
    effectiveConfidenceScore: Math.min(confidenceScore, caps[input.stateReliability.status]),
    note: notes[input.stateReliability.status],
  }
}

export function scoreStateReliability(
  metrics: StateReliabilityMetrics,
  targets: StateReliabilityTargets = STATE_RELIABILITY_TARGETS
): StateReliabilityResult {
  const blockers: StateReliabilityBlocker[] = []

  if (metrics.pricedProducts === 0) blockers.push('no_local_prices')
  if (metrics.pricedProducts > 0 && metrics.pricedProducts < targets.minPricedProducts) {
    blockers.push('sparse_local_prices')
  }
  if (metrics.stores < targets.minStores || metrics.chains < targets.minChains) {
    blockers.push('sparse_store_coverage')
  }
  if (metrics.fresh7dPct < targets.minFresh7dPct) blockers.push('stale_7d')
  if (metrics.accuracyComparisons < targets.minAccuracyComparisons) {
    blockers.push('unvalidated_accuracy')
  }
  if (
    metrics.accuracyComparisons >= targets.minAccuracyComparisons &&
    ((metrics.accuracyPct ?? 0) < targets.minAccuracyPct ||
      (metrics.meanAbsErrorPct ?? 100) > targets.maxMeanAbsErrorPct)
  ) {
    blockers.push('accuracy_below_target')
  }
  if (metrics.resolvedCells > 0 && metrics.realResolvedPct < targets.minRealResolvedPct) {
    blockers.push('synthetic_heavy')
  }

  const coverageScore =
    scoreRatio(metrics.pricedProducts, targets.minPricedProducts, 15) +
    scoreRatio(metrics.stores, targets.minStores, 10) +
    scoreRatio(metrics.chains, targets.minChains, 5)

  const freshnessScore =
    scoreRatio(metrics.fresh7dPct, targets.minFresh7dPct, 20) +
    scoreRatio(metrics.fresh30dPct, targets.minFresh30dPct, 10)

  const resolutionScore =
    scoreRatio(metrics.resolvedCells, targets.minResolvedCells, 5) +
    scoreRatio(metrics.realResolvedPct, targets.minRealResolvedPct, 10) +
    scoreRatio(metrics.avgSourceCount, targets.minAvgSourceCount, 5)

  const accuracyScore =
    metrics.accuracyComparisons >= targets.minAccuracyComparisons
      ? scoreRatio(metrics.accuracyPct ?? 0, targets.minAccuracyPct, 12) +
        scoreRatio(
          Math.max(0, targets.maxMeanAbsErrorPct * 2 - (metrics.meanAbsErrorPct ?? 100)),
          targets.maxMeanAbsErrorPct * 2,
          8
        )
      : scoreRatio(metrics.accuracyComparisons, targets.minAccuracyComparisons, 6)

  const score = Math.round(
    Math.min(100, coverageScore + freshnessScore + resolutionScore + accuracyScore)
  )

  const hardBlockers = new Set<StateReliabilityBlocker>([
    'no_local_prices',
    'stale_7d',
    'accuracy_below_target',
    'synthetic_heavy',
  ])
  const hasHardBlocker = blockers.some((b) => hardBlockers.has(b))
  const hasReliabilityBlocker = blockers.includes('unvalidated_accuracy') || hasHardBlocker

  let status: StateReliabilityStatus
  if (score >= 80 && !hasReliabilityBlocker) {
    status = 'reliable'
  } else if (score >= 60 && !hasHardBlocker) {
    status = 'usable'
  } else if (score >= 35) {
    status = 'estimated'
  } else {
    status = 'unreliable'
  }

  return {
    ...metrics,
    score,
    status,
    blockers,
  }
}

export async function getStateFromZip(sql: PricingSql, zipCode: string): Promise<string | null> {
  const normalizedZip = zipCode.trim().match(/\d{5}/)?.[0]
  if (!normalizedZip) return null

  const centroidRows = (await sql`
    SELECT upper(trim(state)) AS state
    FROM openclaw.zip_centroids
    WHERE zip = ${normalizedZip}
      AND state IS NOT NULL
      AND trim(state) != ''
    LIMIT 1
  `) as unknown as Array<{ state: string | null }>

  const centroidState = normalizeStateCode(centroidRows[0]?.state)
  if (centroidState) return centroidState

  const storeRows = (await sql`
    SELECT upper(trim(state)) AS state
    FROM openclaw.stores
    WHERE zip = ${normalizedZip}
      AND state IS NOT NULL
      AND trim(state) != ''
    GROUP BY upper(trim(state))
    ORDER BY count(*) DESC
    LIMIT 1
  `) as unknown as Array<{ state: string | null }>

  return normalizeStateCode(storeRows[0]?.state)
}

export async function getStateReliabilityForState(
  sql: PricingSql,
  state: string,
  targets: StateReliabilityTargets = STATE_RELIABILITY_TARGETS
): Promise<StateReliabilityResult | null> {
  const stateCode = normalizeStateCode(state)
  if (!stateCode) return null

  const [storeRows, resolvedRows, accuracyRows] = (await Promise.all([
    sql`
      SELECT
        upper(trim(s.state)) AS state,
        count(*) FILTER (WHERE sp.price_cents > 0)::int AS priced_products,
        count(DISTINCT s.id)::int AS stores,
        count(DISTINCT s.chain_id) FILTER (WHERE s.chain_id IS NOT NULL)::int AS chains,
        count(*) FILTER (
          WHERE sp.price_cents > 0
            AND sp.last_seen_at > now() - interval '7 days'
        )::int AS fresh_7d,
        count(*) FILTER (
          WHERE sp.price_cents > 0
            AND sp.last_seen_at > now() - interval '30 days'
        )::int AS fresh_30d,
        round(
          100.0 * count(*) FILTER (
            WHERE sp.price_cents > 0
              AND sp.last_seen_at > now() - interval '7 days'
          ) / greatest(count(*) FILTER (WHERE sp.price_cents > 0), 1),
          2
        )::float AS fresh_7d_pct,
        round(
          100.0 * count(*) FILTER (
            WHERE sp.price_cents > 0
              AND sp.last_seen_at > now() - interval '30 days'
          ) / greatest(count(*) FILTER (WHERE sp.price_cents > 0), 1),
          2
        )::float AS fresh_30d_pct,
        max(sp.last_seen_at)::text AS newest_seen
      FROM openclaw.store_products sp
      JOIN openclaw.stores s ON s.id = sp.store_id
      WHERE s.state IS NOT NULL
        AND trim(s.state) != ''
        AND upper(trim(s.state)) = ${stateCode}
      GROUP BY upper(trim(s.state))
    `,
    sql`
      SELECT
        upper(trim(pr.state)) AS state,
        count(*)::int AS resolved_cells,
        count(*) FILTER (WHERE coalesce(rp.is_synthetic, false) = false)::int AS real_resolved_cells,
        count(*) FILTER (WHERE coalesce(rp.is_synthetic, false) = true)::int AS synthetic_resolved_cells,
        round(
          100.0 * count(*) FILTER (WHERE coalesce(rp.is_synthetic, false) = false)
          / greatest(count(*), 1),
          2
        )::float AS real_resolved_pct,
        round(avg(coalesce(rp.source_count, 0))::numeric, 2)::float AS avg_source_count,
        round(avg(coalesce(rp.confidence, 0))::numeric, 3)::float AS avg_confidence
      FROM openclaw.resolved_prices rp
      JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
      WHERE pr.state IS NOT NULL
        AND trim(pr.state) != ''
        AND upper(trim(pr.state)) = ${stateCode}
        AND rp.price_type = 'retail'
      GROUP BY upper(trim(pr.state))
    `,
    sql`
      SELECT
        upper(trim(pr.state)) AS state,
        count(*) FILTER (WHERE pp.actual_cents IS NOT NULL)::int AS accuracy_comparisons,
        round(
          100.0 * count(*) FILTER (
            WHERE pp.actual_cents IS NOT NULL
              AND pp.abs_error_pct IS NOT NULL
              AND pp.abs_error_pct <= 15
          ) / greatest(count(*) FILTER (WHERE pp.actual_cents IS NOT NULL), 1),
          2
        )::float AS accuracy_pct,
        round((avg(pp.abs_error_pct) FILTER (WHERE pp.abs_error_pct IS NOT NULL))::numeric, 2)::float
          AS mean_abs_error_pct
      FROM openclaw.price_predictions pp
      JOIN openclaw.pricing_regions pr ON pr.id = pp.pricing_region_id
      WHERE pr.state IS NOT NULL
        AND trim(pr.state) != ''
        AND upper(trim(pr.state)) = ${stateCode}
      GROUP BY upper(trim(pr.state))
    `,
  ])) as unknown as [StoreAggregateRow[], ResolvedAggregateRow[], AccuracyAggregateRow[]]

  const store = storeRows[0]
  const resolved = resolvedRows[0]
  const accuracy = accuracyRows[0]
  const metrics: StateReliabilityMetrics = {
    ...emptyMetrics(stateCode),
    pricedProducts: asNumber(store?.priced_products),
    stores: asNumber(store?.stores),
    chains: asNumber(store?.chains),
    fresh7d: asNumber(store?.fresh_7d),
    fresh30d: asNumber(store?.fresh_30d),
    fresh7dPct: asNumber(store?.fresh_7d_pct),
    fresh30dPct: asNumber(store?.fresh_30d_pct),
    newestSeen: store?.newest_seen ?? null,
    resolvedCells: asNumber(resolved?.resolved_cells),
    realResolvedCells: asNumber(resolved?.real_resolved_cells),
    syntheticResolvedCells: asNumber(resolved?.synthetic_resolved_cells),
    realResolvedPct:
      resolved?.real_resolved_pct !== undefined
        ? asNumber(resolved.real_resolved_pct)
        : pct(asNumber(resolved?.real_resolved_cells), asNumber(resolved?.resolved_cells)),
    avgSourceCount: asNumber(resolved?.avg_source_count),
    avgConfidence: asNumber(resolved?.avg_confidence),
    accuracyComparisons: asNumber(accuracy?.accuracy_comparisons),
    accuracyPct:
      accuracy?.accuracy_pct === null || accuracy?.accuracy_pct === undefined
        ? null
        : asNumber(accuracy.accuracy_pct),
    meanAbsErrorPct:
      accuracy?.mean_abs_error_pct === null || accuracy?.mean_abs_error_pct === undefined
        ? null
        : asNumber(accuracy.mean_abs_error_pct),
  }

  return scoreStateReliability(metrics, targets)
}

export async function getStateReliabilityForZip(
  sql: PricingSql,
  zipCode: string,
  targets: StateReliabilityTargets = STATE_RELIABILITY_TARGETS
): Promise<StateReliabilityResult | null> {
  const state = await getStateFromZip(sql, zipCode)
  return state ? getStateReliabilityForState(sql, state, targets) : null
}

export async function getStateReliabilityReport(
  sql: PricingSql,
  targets: StateReliabilityTargets = STATE_RELIABILITY_TARGETS
): Promise<StateReliabilityReport> {
  const storeRows = (await sql`
    SELECT
      upper(trim(s.state)) AS state,
      count(*) FILTER (WHERE sp.price_cents > 0)::int AS priced_products,
      count(DISTINCT s.id)::int AS stores,
      count(DISTINCT s.chain_id) FILTER (WHERE s.chain_id IS NOT NULL)::int AS chains,
      count(*) FILTER (
        WHERE sp.price_cents > 0
          AND sp.last_seen_at > now() - interval '7 days'
      )::int AS fresh_7d,
      count(*) FILTER (
        WHERE sp.price_cents > 0
          AND sp.last_seen_at > now() - interval '30 days'
      )::int AS fresh_30d,
      round(
        100.0 * count(*) FILTER (
          WHERE sp.price_cents > 0
            AND sp.last_seen_at > now() - interval '7 days'
        ) / greatest(count(*) FILTER (WHERE sp.price_cents > 0), 1),
        2
      )::float AS fresh_7d_pct,
      round(
        100.0 * count(*) FILTER (
          WHERE sp.price_cents > 0
            AND sp.last_seen_at > now() - interval '30 days'
        ) / greatest(count(*) FILTER (WHERE sp.price_cents > 0), 1),
        2
      )::float AS fresh_30d_pct,
      max(sp.last_seen_at)::text AS newest_seen
    FROM openclaw.store_products sp
    JOIN openclaw.stores s ON s.id = sp.store_id
    WHERE s.state IS NOT NULL
      AND trim(s.state) != ''
      AND upper(trim(s.state)) = ANY(${US_STATE_CODES as unknown as string[]})
    GROUP BY upper(trim(s.state))
  `) as unknown as StoreAggregateRow[]

  const resolvedRows = (await sql`
    SELECT
      upper(trim(pr.state)) AS state,
      count(*)::int AS resolved_cells,
      count(*) FILTER (WHERE coalesce(rp.is_synthetic, false) = false)::int AS real_resolved_cells,
      count(*) FILTER (WHERE coalesce(rp.is_synthetic, false) = true)::int AS synthetic_resolved_cells,
      round(
        100.0 * count(*) FILTER (WHERE coalesce(rp.is_synthetic, false) = false)
        / greatest(count(*), 1),
        2
      )::float AS real_resolved_pct,
      round(avg(coalesce(rp.source_count, 0))::numeric, 2)::float AS avg_source_count,
      round(avg(coalesce(rp.confidence, 0))::numeric, 3)::float AS avg_confidence
    FROM openclaw.resolved_prices rp
    JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
    WHERE pr.state IS NOT NULL
      AND trim(pr.state) != ''
      AND upper(trim(pr.state)) = ANY(${US_STATE_CODES as unknown as string[]})
      AND rp.price_type = 'retail'
    GROUP BY upper(trim(pr.state))
  `) as unknown as ResolvedAggregateRow[]

  const accuracyRows = (await sql`
    SELECT
      upper(trim(pr.state)) AS state,
      count(*) FILTER (WHERE pp.actual_cents IS NOT NULL)::int AS accuracy_comparisons,
      round(
        100.0 * count(*) FILTER (
          WHERE pp.actual_cents IS NOT NULL
            AND pp.abs_error_pct IS NOT NULL
            AND pp.abs_error_pct <= 15
        ) / greatest(count(*) FILTER (WHERE pp.actual_cents IS NOT NULL), 1),
        2
      )::float AS accuracy_pct,
      round((avg(pp.abs_error_pct) FILTER (WHERE pp.abs_error_pct IS NOT NULL))::numeric, 2)::float
        AS mean_abs_error_pct
    FROM openclaw.price_predictions pp
    JOIN openclaw.pricing_regions pr ON pr.id = pp.pricing_region_id
    WHERE pr.state IS NOT NULL
      AND trim(pr.state) != ''
      AND upper(trim(pr.state)) = ANY(${US_STATE_CODES as unknown as string[]})
    GROUP BY upper(trim(pr.state))
  `) as unknown as AccuracyAggregateRow[]

  const storeByState = new Map(storeRows.map((row) => [row.state, row]))
  const resolvedByState = new Map(resolvedRows.map((row) => [row.state, row]))
  const accuracyByState = new Map(accuracyRows.map((row) => [row.state, row]))

  const states = US_STATE_CODES.map((state) => {
    const store = storeByState.get(state)
    const resolved = resolvedByState.get(state)
    const accuracy = accuracyByState.get(state)

    const metrics: StateReliabilityMetrics = {
      state,
      pricedProducts: asNumber(store?.priced_products),
      stores: asNumber(store?.stores),
      chains: asNumber(store?.chains),
      fresh7d: asNumber(store?.fresh_7d),
      fresh30d: asNumber(store?.fresh_30d),
      fresh7dPct: asNumber(store?.fresh_7d_pct),
      fresh30dPct: asNumber(store?.fresh_30d_pct),
      newestSeen: store?.newest_seen ?? null,
      resolvedCells: asNumber(resolved?.resolved_cells),
      realResolvedCells: asNumber(resolved?.real_resolved_cells),
      syntheticResolvedCells: asNumber(resolved?.synthetic_resolved_cells),
      realResolvedPct:
        resolved?.real_resolved_pct !== undefined
          ? asNumber(resolved.real_resolved_pct)
          : pct(asNumber(resolved?.real_resolved_cells), asNumber(resolved?.resolved_cells)),
      avgSourceCount: asNumber(resolved?.avg_source_count),
      avgConfidence: asNumber(resolved?.avg_confidence),
      accuracyComparisons: asNumber(accuracy?.accuracy_comparisons),
      accuracyPct:
        accuracy?.accuracy_pct === null || accuracy?.accuracy_pct === undefined
          ? null
          : asNumber(accuracy.accuracy_pct),
      meanAbsErrorPct:
        accuracy?.mean_abs_error_pct === null || accuracy?.mean_abs_error_pct === undefined
          ? null
          : asNumber(accuracy.mean_abs_error_pct),
    }

    return scoreStateReliability(metrics, targets)
  }).sort((a, b) => b.score - a.score || a.state.localeCompare(b.state))

  const summary = {
    totalStates: states.length,
    reliable: states.filter((s) => s.status === 'reliable').length,
    usable: states.filter((s) => s.status === 'usable').length,
    estimated: states.filter((s) => s.status === 'estimated').length,
    unreliable: states.filter((s) => s.status === 'unreliable').length,
    unvalidated: states.filter((s) => s.blockers.includes('unvalidated_accuracy')).length,
  }

  return {
    generatedAt: new Date().toISOString(),
    targets,
    states,
    summary,
  }
}
