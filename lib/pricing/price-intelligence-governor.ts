import { pgClient } from '@/lib/db'

export type PriceIntelligenceCoverageLevel = 'state' | 'market' | 'zip' | 'store' | 'category'

export interface PriceIntelligenceCoverageRow {
  level: PriceIntelligenceCoverageLevel
  key: string
  label: string
  state: string | null
  marketKey: string | null
  zip: string | null
  storeId: string | null
  category: string | null
  expectedCount: number
  discoveredCount: number
  observedCount: number
  inferableCount: number
  surfaceableCount: number
  staleCount: number
  needsReviewCount: number
  unreachableCount: number
  closedCount: number
  lastSeenAt: string | null
  coveragePct: number
  surfaceablePct: number
}

export interface PriceIntelligenceSummary {
  expectedSourceSurfaces: number
  discoveredSourceSurfaces: number
  discoveredStoreSurfaces: number
  catalogedStoreSurfaces: number
  freshObservedStoreSurfaces: number
  inferableStoreSurfaces: number
  surfaceableStoreSurfaces: number
  expectedCanonicalIngredients: number
  discoveredCanonicalIngredients: number
  freshObservedCanonicalIngredients: number
  inferableCanonicalIngredients: number
  surfaceableCanonicalIngredients: number
  observedPriceFacts: number
  freshObservedPriceFacts: number
  inferredPriceFacts: number
  surfaceablePriceFacts: number
  stalePriceFacts: number
  reviewPriceFacts: number
  duplicateConflictFacts: number
  syncedPriceHistoryRows: number
  syncedIngredients: number
  consumedRecipeIngredients: number
  statesCovered: number
  marketsCovered: number
  zipsCovered: number
  categoriesCovered: number
}

export interface PriceIntelligenceGovernor {
  ready: boolean
  summary: PriceIntelligenceSummary
  stateCoverage: PriceIntelligenceCoverageRow[]
  marketCoverage: PriceIntelligenceCoverageRow[]
  zipCoverage: PriceIntelligenceCoverageRow[]
  storeCoverage: PriceIntelligenceCoverageRow[]
  categoryCoverage: PriceIntelligenceCoverageRow[]
}

type ViewCheckRow = {
  has_contract: boolean | null
  has_store_frontier: boolean | null
}

type SummaryRow = {
  expected_source_surfaces: number | string | null
  discovered_source_surfaces: number | string | null
  discovered_store_surfaces: number | string | null
  cataloged_store_surfaces: number | string | null
  fresh_observed_store_surfaces: number | string | null
  inferable_store_surfaces: number | string | null
  surfaceable_store_surfaces: number | string | null
  expected_canonical_ingredients: number | string | null
  discovered_canonical_ingredients: number | string | null
  fresh_observed_canonical_ingredients: number | string | null
  inferable_canonical_ingredients: number | string | null
  surfaceable_canonical_ingredients: number | string | null
  observed_price_facts: number | string | null
  fresh_observed_price_facts: number | string | null
  inferred_price_facts: number | string | null
  surfaceable_price_facts: number | string | null
  stale_price_facts: number | string | null
  review_price_facts: number | string | null
  duplicate_conflict_facts: number | string | null
  synced_price_history_rows: number | string | null
  synced_ingredients: number | string | null
  consumed_recipe_ingredients: number | string | null
  states_covered: number | string | null
  markets_covered: number | string | null
  zips_covered: number | string | null
  categories_covered: number | string | null
}

type CoverageRow = {
  key: string | null
  label: string | null
  state: string | null
  market_key: string | null
  zip: string | null
  store_id: string | null
  category: string | null
  expected_count: number | string | null
  discovered_count: number | string | null
  observed_count: number | string | null
  inferable_count: number | string | null
  surfaceable_count: number | string | null
  stale_count: number | string | null
  needs_review_count: number | string | null
  unreachable_count: number | string | null
  closed_count: number | string | null
  last_seen_at: string | Date | null
}

const EMPTY_SUMMARY: PriceIntelligenceSummary = {
  expectedSourceSurfaces: 0,
  discoveredSourceSurfaces: 0,
  discoveredStoreSurfaces: 0,
  catalogedStoreSurfaces: 0,
  freshObservedStoreSurfaces: 0,
  inferableStoreSurfaces: 0,
  surfaceableStoreSurfaces: 0,
  expectedCanonicalIngredients: 0,
  discoveredCanonicalIngredients: 0,
  freshObservedCanonicalIngredients: 0,
  inferableCanonicalIngredients: 0,
  surfaceableCanonicalIngredients: 0,
  observedPriceFacts: 0,
  freshObservedPriceFacts: 0,
  inferredPriceFacts: 0,
  surfaceablePriceFacts: 0,
  stalePriceFacts: 0,
  reviewPriceFacts: 0,
  duplicateConflictFacts: 0,
  syncedPriceHistoryRows: 0,
  syncedIngredients: 0,
  consumedRecipeIngredients: 0,
  statesCovered: 0,
  marketsCovered: 0,
  zipsCovered: 0,
  categoriesCovered: 0,
}

function toInt(value: unknown): number {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function toPct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function mapCoverageRow(
  level: PriceIntelligenceCoverageLevel,
  row: CoverageRow
): PriceIntelligenceCoverageRow {
  const expectedCount = toInt(row.expected_count)
  const discoveredCount = toInt(row.discovered_count)
  const surfaceableCount = toInt(row.surfaceable_count)

  return {
    level,
    key: row.key ?? `${level}-unknown`,
    label: row.label ?? row.key ?? 'Unknown',
    state: row.state ?? null,
    marketKey: row.market_key ?? null,
    zip: row.zip ?? null,
    storeId: row.store_id ?? null,
    category: row.category ?? null,
    expectedCount,
    discoveredCount,
    observedCount: toInt(row.observed_count),
    inferableCount: toInt(row.inferable_count),
    surfaceableCount,
    staleCount: toInt(row.stale_count),
    needsReviewCount: toInt(row.needs_review_count),
    unreachableCount: toInt(row.unreachable_count),
    closedCount: toInt(row.closed_count),
    lastSeenAt: toIso(row.last_seen_at),
    coveragePct: toPct(discoveredCount, expectedCount),
    surfaceablePct: toPct(surfaceableCount, expectedCount),
  }
}

async function hasGovernorViews(): Promise<boolean> {
  try {
    const rows = (await pgClient`
      SELECT
        to_regclass('openclaw.price_intelligence_contract_v1') IS NOT NULL AS has_contract,
        to_regclass('openclaw.price_intelligence_store_frontier_v1') IS NOT NULL AS has_store_frontier
    `) as unknown as ViewCheckRow[]

    const row = rows[0]
    return Boolean(row?.has_contract && row?.has_store_frontier)
  } catch {
    return false
  }
}

async function getSummary(): Promise<PriceIntelligenceSummary> {
  const rows = (await pgClient`
    WITH manifest_rollup AS (
      SELECT
        COUNT(*)::int AS expected_source_surfaces,
        COUNT(*) FILTER (
          WHERE status IN ('scanning', 'complete', 'failed', 'skipped')
        )::int AS discovered_source_surfaces
      FROM openclaw.source_manifest
    ),
    store_rollup AS (
      SELECT
        COUNT(*)::int AS discovered_store_surfaces,
        COUNT(*) FILTER (
          WHERE last_cataloged_at IS NOT NULL OR observed_fact_count > 0
        )::int AS cataloged_store_surfaces,
        COUNT(*) FILTER (
          WHERE fresh_observed_fact_count > 0
        )::int AS fresh_observed_store_surfaces,
        COUNT(*) FILTER (
          WHERE has_inference_model = true AND fresh_observed_fact_count = 0
        )::int AS inferable_store_surfaces,
        COUNT(*) FILTER (
          WHERE surfaceable_fact_count > 0
        )::int AS surfaceable_store_surfaces,
        COUNT(DISTINCT store_state)::int AS states_covered,
        COUNT(DISTINCT market_key)::int AS markets_covered,
        COUNT(DISTINCT store_zip)::int AS zips_covered
      FROM openclaw.price_intelligence_store_frontier_v1
    ),
    contract_rollup AS (
      SELECT
        COUNT(*) FILTER (
          WHERE fact_kind = 'observation'
        )::int AS observed_price_facts,
        COUNT(*) FILTER (
          WHERE fact_kind = 'observation'
            AND lifecycle_state = 'observed'
        )::int AS fresh_observed_price_facts,
        COUNT(*) FILTER (
          WHERE fact_kind = 'inference'
        )::int AS inferred_price_facts,
        COUNT(*) FILTER (
          WHERE surface_eligible = true
        )::int AS surfaceable_price_facts,
        COUNT(*) FILTER (
          WHERE lifecycle_state = 'stale'
        )::int AS stale_price_facts,
        COUNT(*) FILTER (
          WHERE lifecycle_state IN ('needs_review', 'conflicting')
        )::int AS review_price_facts,
        COUNT(*) FILTER (
          WHERE duplicate_link_conflict = true
        )::int AS duplicate_conflict_facts,
        COUNT(DISTINCT entity_ingredient_category)::int AS categories_covered,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND fact_kind IN ('observation', 'inference')
        )::int AS discovered_canonical_ingredients,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND fact_kind = 'observation'
            AND lifecycle_state = 'observed'
        )::int AS fresh_observed_canonical_ingredients,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND fact_kind = 'inference'
        )::int AS inferable_canonical_ingredients,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND surface_eligible = true
        )::int AS surfaceable_canonical_ingredients
      FROM openclaw.price_intelligence_contract_v1
    ),
    canonical_rollup AS (
      SELECT COUNT(*)::int AS expected_canonical_ingredients
      FROM openclaw.canonical_ingredients
    ),
    history_rollup AS (
      SELECT COUNT(*)::int AS synced_price_history_rows
      FROM ingredient_price_history
      WHERE source LIKE 'openclaw_%'
    ),
    synced_ingredient_rollup AS (
      SELECT COUNT(DISTINCT id)::int AS synced_ingredients
      FROM ingredients
      WHERE last_price_source IS NOT NULL
        AND (
          last_price_source LIKE 'openclaw_%'
          OR last_price_source IN ('regional_average', 'market_aggregate', 'category_baseline', 'government')
        )
    ),
    recipe_rollup AS (
      SELECT COUNT(DISTINCT ri.ingredient_id)::int AS consumed_recipe_ingredients
      FROM recipe_ingredients ri
      JOIN ingredients i
        ON i.id = ri.ingredient_id
      WHERE i.last_price_source IS NOT NULL
        AND (
          i.last_price_source LIKE 'openclaw_%'
          OR i.last_price_source IN ('regional_average', 'market_aggregate', 'category_baseline', 'government')
        )
    )
    SELECT
      mr.expected_source_surfaces,
      mr.discovered_source_surfaces,
      sr.discovered_store_surfaces,
      sr.cataloged_store_surfaces,
      sr.fresh_observed_store_surfaces,
      sr.inferable_store_surfaces,
      sr.surfaceable_store_surfaces,
      cr2.expected_canonical_ingredients,
      cr.discovered_canonical_ingredients,
      cr.fresh_observed_canonical_ingredients,
      cr.inferable_canonical_ingredients,
      cr.surfaceable_canonical_ingredients,
      cr.observed_price_facts,
      cr.fresh_observed_price_facts,
      cr.inferred_price_facts,
      cr.surfaceable_price_facts,
      cr.stale_price_facts,
      cr.review_price_facts,
      cr.duplicate_conflict_facts,
      hr.synced_price_history_rows,
      sir.synced_ingredients,
      rr.consumed_recipe_ingredients,
      sr.states_covered,
      sr.markets_covered,
      sr.zips_covered,
      cr.categories_covered
    FROM manifest_rollup mr
    CROSS JOIN store_rollup sr
    CROSS JOIN contract_rollup cr
    CROSS JOIN canonical_rollup cr2
    CROSS JOIN history_rollup hr
    CROSS JOIN synced_ingredient_rollup sir
    CROSS JOIN recipe_rollup rr
  `) as unknown as SummaryRow[]

  const row = rows[0]
  if (!row) return { ...EMPTY_SUMMARY }

  return {
    expectedSourceSurfaces: toInt(row.expected_source_surfaces),
    discoveredSourceSurfaces: toInt(row.discovered_source_surfaces),
    discoveredStoreSurfaces: toInt(row.discovered_store_surfaces),
    catalogedStoreSurfaces: toInt(row.cataloged_store_surfaces),
    freshObservedStoreSurfaces: toInt(row.fresh_observed_store_surfaces),
    inferableStoreSurfaces: toInt(row.inferable_store_surfaces),
    surfaceableStoreSurfaces: toInt(row.surfaceable_store_surfaces),
    expectedCanonicalIngredients: toInt(row.expected_canonical_ingredients),
    discoveredCanonicalIngredients: toInt(row.discovered_canonical_ingredients),
    freshObservedCanonicalIngredients: toInt(row.fresh_observed_canonical_ingredients),
    inferableCanonicalIngredients: toInt(row.inferable_canonical_ingredients),
    surfaceableCanonicalIngredients: toInt(row.surfaceable_canonical_ingredients),
    observedPriceFacts: toInt(row.observed_price_facts),
    freshObservedPriceFacts: toInt(row.fresh_observed_price_facts),
    inferredPriceFacts: toInt(row.inferred_price_facts),
    surfaceablePriceFacts: toInt(row.surfaceable_price_facts),
    stalePriceFacts: toInt(row.stale_price_facts),
    reviewPriceFacts: toInt(row.review_price_facts),
    duplicateConflictFacts: toInt(row.duplicate_conflict_facts),
    syncedPriceHistoryRows: toInt(row.synced_price_history_rows),
    syncedIngredients: toInt(row.synced_ingredients),
    consumedRecipeIngredients: toInt(row.consumed_recipe_ingredients),
    statesCovered: toInt(row.states_covered),
    marketsCovered: toInt(row.markets_covered),
    zipsCovered: toInt(row.zips_covered),
    categoriesCovered: toInt(row.categories_covered),
  }
}

async function getStateCoverage(limit: number): Promise<PriceIntelligenceCoverageRow[]> {
  const rows = (await pgClient`
    SELECT
      store_state AS key,
      store_state AS label,
      store_state AS state,
      NULL::text AS market_key,
      NULL::text AS zip,
      NULL::text AS store_id,
      NULL::text AS category,
      COUNT(*)::int AS expected_count,
      COUNT(*) FILTER (
        WHERE last_cataloged_at IS NOT NULL OR observed_fact_count > 0
      )::int AS discovered_count,
      COUNT(*) FILTER (
        WHERE fresh_observed_fact_count > 0
      )::int AS observed_count,
      COUNT(*) FILTER (
        WHERE has_inference_model = true AND fresh_observed_fact_count = 0
      )::int AS inferable_count,
      COUNT(*) FILTER (
        WHERE surfaceable_fact_count > 0
      )::int AS surfaceable_count,
      COUNT(*) FILTER (
        WHERE stale_fact_count > 0
      )::int AS stale_count,
      COUNT(*) FILTER (
        WHERE needs_review_fact_count > 0
      )::int AS needs_review_count,
      COUNT(*) FILTER (
        WHERE lifecycle_state = 'unreachable'
      )::int AS unreachable_count,
      COUNT(*) FILTER (
        WHERE lifecycle_state = 'closed'
      )::int AS closed_count,
      MAX(COALESCE(last_observed_at, last_cataloged_at)) AS last_seen_at
    FROM openclaw.price_intelligence_store_frontier_v1
    WHERE store_state IS NOT NULL
    GROUP BY store_state
    ORDER BY surfaceable_count DESC, observed_count DESC, expected_count DESC, store_state ASC
    LIMIT ${limit}
  `) as unknown as CoverageRow[]

  return rows.map((row) => mapCoverageRow('state', row))
}

async function getMarketCoverage(limit: number): Promise<PriceIntelligenceCoverageRow[]> {
  const rows = (await pgClient`
    SELECT
      market_key AS key,
      market_label AS label,
      MIN(store_state) AS state,
      market_key,
      NULL::text AS zip,
      NULL::text AS store_id,
      NULL::text AS category,
      COUNT(*)::int AS expected_count,
      COUNT(*) FILTER (
        WHERE last_cataloged_at IS NOT NULL OR observed_fact_count > 0
      )::int AS discovered_count,
      COUNT(*) FILTER (
        WHERE fresh_observed_fact_count > 0
      )::int AS observed_count,
      COUNT(*) FILTER (
        WHERE has_inference_model = true AND fresh_observed_fact_count = 0
      )::int AS inferable_count,
      COUNT(*) FILTER (
        WHERE surfaceable_fact_count > 0
      )::int AS surfaceable_count,
      COUNT(*) FILTER (
        WHERE stale_fact_count > 0
      )::int AS stale_count,
      COUNT(*) FILTER (
        WHERE needs_review_fact_count > 0
      )::int AS needs_review_count,
      COUNT(*) FILTER (
        WHERE lifecycle_state = 'unreachable'
      )::int AS unreachable_count,
      COUNT(*) FILTER (
        WHERE lifecycle_state = 'closed'
      )::int AS closed_count,
      MAX(COALESCE(last_observed_at, last_cataloged_at)) AS last_seen_at
    FROM openclaw.price_intelligence_store_frontier_v1
    WHERE market_key IS NOT NULL
    GROUP BY market_key, market_label
    ORDER BY surfaceable_count DESC, observed_count DESC, expected_count DESC, market_label ASC
    LIMIT ${limit}
  `) as unknown as CoverageRow[]

  return rows.map((row) => mapCoverageRow('market', row))
}

async function getZipCoverage(limit: number): Promise<PriceIntelligenceCoverageRow[]> {
  const rows = (await pgClient`
    SELECT
      store_zip AS key,
      store_zip AS label,
      MIN(store_state) AS state,
      MIN(market_key) AS market_key,
      store_zip AS zip,
      NULL::text AS store_id,
      NULL::text AS category,
      COUNT(*)::int AS expected_count,
      COUNT(*) FILTER (
        WHERE last_cataloged_at IS NOT NULL OR observed_fact_count > 0
      )::int AS discovered_count,
      COUNT(*) FILTER (
        WHERE fresh_observed_fact_count > 0
      )::int AS observed_count,
      COUNT(*) FILTER (
        WHERE has_inference_model = true AND fresh_observed_fact_count = 0
      )::int AS inferable_count,
      COUNT(*) FILTER (
        WHERE surfaceable_fact_count > 0
      )::int AS surfaceable_count,
      COUNT(*) FILTER (
        WHERE stale_fact_count > 0
      )::int AS stale_count,
      COUNT(*) FILTER (
        WHERE needs_review_fact_count > 0
      )::int AS needs_review_count,
      COUNT(*) FILTER (
        WHERE lifecycle_state = 'unreachable'
      )::int AS unreachable_count,
      COUNT(*) FILTER (
        WHERE lifecycle_state = 'closed'
      )::int AS closed_count,
      MAX(COALESCE(last_observed_at, last_cataloged_at)) AS last_seen_at
    FROM openclaw.price_intelligence_store_frontier_v1
    WHERE store_zip IS NOT NULL
    GROUP BY store_zip
    ORDER BY surfaceable_count DESC, observed_count DESC, expected_count DESC, store_zip ASC
    LIMIT ${limit}
  `) as unknown as CoverageRow[]

  return rows.map((row) => mapCoverageRow('zip', row))
}

async function getStoreCoverage(limit: number): Promise<PriceIntelligenceCoverageRow[]> {
  const rows = (await pgClient`
    SELECT
      store_id::text AS key,
      source_name || ' - ' || store_name AS label,
      store_state AS state,
      market_key,
      store_zip AS zip,
      store_id::text AS store_id,
      NULL::text AS category,
      1::int AS expected_count,
      CASE
        WHEN last_cataloged_at IS NOT NULL OR observed_fact_count > 0 THEN 1
        ELSE 0
      END::int AS discovered_count,
      fresh_observed_fact_count::int AS observed_count,
      CASE
        WHEN has_inference_model = true AND fresh_observed_fact_count = 0 THEN 1
        ELSE 0
      END::int AS inferable_count,
      surfaceable_fact_count::int AS surfaceable_count,
      stale_fact_count::int AS stale_count,
      needs_review_fact_count::int AS needs_review_count,
      CASE WHEN lifecycle_state = 'unreachable' THEN 1 ELSE 0 END::int AS unreachable_count,
      CASE WHEN lifecycle_state = 'closed' THEN 1 ELSE 0 END::int AS closed_count,
      COALESCE(last_observed_at, last_cataloged_at) AS last_seen_at
    FROM openclaw.price_intelligence_store_frontier_v1
    ORDER BY surfaceable_fact_count DESC, fresh_observed_fact_count DESC, source_name ASC, store_name ASC
    LIMIT ${limit}
  `) as unknown as CoverageRow[]

  return rows.map((row) => mapCoverageRow('store', row))
}

async function getCategoryCoverage(limit: number): Promise<PriceIntelligenceCoverageRow[]> {
  const rows = (await pgClient`
    WITH category_expected AS (
      SELECT
        category,
        COUNT(*)::int AS expected_count
      FROM openclaw.canonical_ingredients
      WHERE category IS NOT NULL
      GROUP BY category
    ),
    category_rollup AS (
      SELECT
        entity_ingredient_category AS category,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND fact_kind IN ('observation', 'inference')
        )::int AS discovered_count,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND fact_kind = 'observation'
            AND lifecycle_state = 'observed'
        )::int AS observed_count,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND fact_kind = 'inference'
        )::int AS inferable_count,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND surface_eligible = true
        )::int AS surfaceable_count,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND lifecycle_state = 'stale'
        )::int AS stale_count,
        COUNT(DISTINCT entity_ingredient_id) FILTER (
          WHERE entity_ingredient_id IS NOT NULL
            AND lifecycle_state IN ('needs_review', 'conflicting')
        )::int AS needs_review_count,
        MAX(observed_at) AS last_seen_at
      FROM openclaw.price_intelligence_contract_v1
      WHERE entity_ingredient_category IS NOT NULL
      GROUP BY entity_ingredient_category
    )
    SELECT
      ce.category AS key,
      ce.category AS label,
      NULL::text AS state,
      NULL::text AS market_key,
      NULL::text AS zip,
      NULL::text AS store_id,
      ce.category,
      ce.expected_count,
      COALESCE(cr.discovered_count, 0)::int AS discovered_count,
      COALESCE(cr.observed_count, 0)::int AS observed_count,
      COALESCE(cr.inferable_count, 0)::int AS inferable_count,
      COALESCE(cr.surfaceable_count, 0)::int AS surfaceable_count,
      COALESCE(cr.stale_count, 0)::int AS stale_count,
      COALESCE(cr.needs_review_count, 0)::int AS needs_review_count,
      0::int AS unreachable_count,
      0::int AS closed_count,
      cr.last_seen_at
    FROM category_expected ce
    LEFT JOIN category_rollup cr
      ON cr.category = ce.category
    ORDER BY surfaceable_count DESC, observed_count DESC, expected_count DESC, ce.category ASC
    LIMIT ${limit}
  `) as unknown as CoverageRow[]

  return rows.map((row) => mapCoverageRow('category', row))
}

export async function getPriceIntelligenceGovernor(limit = 8): Promise<PriceIntelligenceGovernor> {
  const safeLimit = Math.max(1, Math.min(limit, 25))
  const ready = await hasGovernorViews()

  if (!ready) {
    return {
      ready: false,
      summary: { ...EMPTY_SUMMARY },
      stateCoverage: [],
      marketCoverage: [],
      zipCoverage: [],
      storeCoverage: [],
      categoryCoverage: [],
    }
  }

  const [summary, stateCoverage, marketCoverage, zipCoverage, storeCoverage, categoryCoverage] =
    await Promise.all([
      getSummary(),
      getStateCoverage(safeLimit),
      getMarketCoverage(safeLimit),
      getZipCoverage(safeLimit),
      getStoreCoverage(safeLimit),
      getCategoryCoverage(safeLimit),
    ])

  return {
    ready: true,
    summary,
    stateCoverage,
    marketCoverage,
    zipCoverage,
    storeCoverage,
    categoryCoverage,
  }
}
