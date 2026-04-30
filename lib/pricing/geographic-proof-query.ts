import { pgClient } from '@/lib/db'
import {
  GEOGRAPHIC_PRICING_BASKET,
  GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS,
  GEOGRAPHIC_PRICING_GEOGRAPHIES,
  type GeographicPricingBasketItem,
  type GeographicPricingGeography,
  type GeographicPricingSourceClass,
  type GeographicQuoteSafety,
} from '@/lib/pricing/geography-basket'
import {
  classifyGeographicProofCandidate,
  type GeographicProofCandidate,
} from '@/lib/pricing/geographic-proof-classifier'
import {
  scoreLocalProductMatch,
  scoreLocalUnitConversion,
} from '@/lib/pricing/geographic-proof-evidence'

export type GeographicPricingProofRow = {
  runId?: string
  geographyCode: string
  geographyName: string
  ingredientKey: string
  systemIngredientId: string | null
  canonicalIngredientId: string | null
  sourceClass: GeographicPricingSourceClass
  quoteSafety: GeographicQuoteSafety
  failureReason: string | null
  priceCents: number | null
  normalizedPriceCents: number | null
  normalizedUnit: string | null
  lowCents: number | null
  highCents: number | null
  storeId: string | null
  storeName: string | null
  storeCity: string | null
  storeState: string | null
  storeZip: string | null
  productId: string | null
  productName: string | null
  productBrand: string | null
  productSize: string | null
  sourceName: string | null
  sourceType: string | null
  observedAt: string | null
  freshnessDays: number | null
  confidence: number
  matchConfidence: number
  unitConfidence: number
  dataPoints: number
  missingProof: string[]
  evidence: Record<string, unknown>
}

export type GeographicPricingProofRunSummary = {
  id: string
  startedAt: string
  completedAt: string | null
  status: 'running' | 'success' | 'partial' | 'failed'
  requestedBy: string | null
  totalGeographies: number
  totalBasketItems: number
  expectedResultRows: number
  actualResultRows: number
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  notUsableCount: number
  metadata: Record<string, unknown>
}

export type GeographicPricingProofLatest = {
  run: GeographicPricingProofRunSummary | null
  rows: GeographicPricingProofRow[]
  geographySummaries: GeographicPricingProofGeographySummary[]
}

export type GeographicPricingProofGeographySummary = {
  geographyCode: string
  geographyName: string
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  notUsableCount: number
  worstQuoteSafety: GeographicQuoteSafety
  topFailureReasons: string[]
}

export type RunGeographicPricingProofOptions = {
  write?: boolean
  requestedBy?: string | null
  now?: Date
}

export type RunGeographicPricingProofResult = {
  success: boolean
  runId: string | null
  wrote: boolean
  totalRows: number
  expectedRows: number
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  notUsableCount: number
  rows: GeographicPricingProofRow[]
  error?: string
}

type SystemIngredientRow = {
  id: string
  name: string
  category: string
  standard_unit: string
}

type LocalCandidateRow = {
  entity_store_id: string | null
  entity_store_name: string | null
  entity_store_city: string | null
  entity_store_state: string | null
  entity_store_zip: string | null
  entity_product_id: string | null
  entity_product_name: string | null
  entity_product_brand: string | null
  entity_product_size: string | null
  entity_product_size_value: number | string | null
  entity_product_size_unit: string | null
  entity_source_name: string | null
  entity_source_type: string | null
  entity_ingredient_id: string | null
  price_cents: number | null
  normalized_price_cents: number | null
  has_standard_unit_price: boolean | null
  observed_at: string | null
  confidence: number | string | null
}

type MarketCandidateRow = {
  avg_price_cents: number | null
  min_price_cents: number | null
  max_price_cents: number | null
  median_price_cents: number | null
  price_unit: string | null
  store_count: number | null
  product_count: number | null
  state_count: number | null
  states: string[] | null
  newest_price_at: string | null
  confidence: number | string | null
}

type PublicBaselineRow = {
  item_name: string
  price_cents: number | null
  unit: string | null
  region: string | null
  observation_date: string | null
  category: string | null
}

type CategoryBaselineRow = {
  median_cents_per_unit: number | null
  most_common_unit: string | null
  ingredient_count: number | null
}

type LatestRunRow = {
  id: string
  started_at: string
  completed_at: string | null
  status: GeographicPricingProofRunSummary['status']
  requested_by: string | null
  total_geographies: number
  total_basket_items: number
  expected_result_rows: number
  actual_result_rows: number
  safe_to_quote_count: number
  verify_first_count: number
  planning_only_count: number
  not_usable_count: number
  metadata: Record<string, unknown> | null
}

type ProofResultDbRow = {
  geography_code: string
  geography_name: string
  ingredient_key: string
  system_ingredient_id: string | null
  canonical_ingredient_id: string | null
  source_class: GeographicPricingSourceClass
  quote_safety: GeographicQuoteSafety
  failure_reason: string | null
  price_cents: number | null
  normalized_price_cents: number | null
  normalized_unit: string | null
  low_cents: number | null
  high_cents: number | null
  store_id: string | null
  store_name: string | null
  store_city: string | null
  store_state: string | null
  store_zip: string | null
  product_id: string | null
  product_name: string | null
  product_brand: string | null
  product_size: string | null
  source_name: string | null
  source_type: string | null
  observed_at: string | null
  freshness_days: number | null
  confidence: number | string
  match_confidence: number | string
  unit_confidence: number | string
  data_points: number
  missing_proof: string[]
  evidence: Record<string, unknown> | null
}

const TERRITORY_CODES = new Set(['PR', 'GU', 'AS', 'MP', 'VI'])
const SAFETY_RANK: Record<GeographicQuoteSafety, number> = {
  safe_to_quote: 1,
  verify_first: 2,
  planning_only: 3,
  not_usable: 4,
}

function toNumber(value: unknown): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function toPositiveInt(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.round(numberValue) : null
}

function normalizeText(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text ? text : null
}

function aliasesFor(item: GeographicPricingBasketItem): string[] {
  return Array.from(
    new Set([item.displayName, item.ingredientKey.replace(/_/g, ' '), ...item.aliases])
  )
}

function toPositiveNumber(value: unknown): number | null {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null
}

function isBetterLocalCandidate(
  candidate: GeographicProofCandidate,
  existing: GeographicProofCandidate | undefined
): boolean {
  if (!existing) return true

  const candidateFreshness = candidate.observedAt ? new Date(candidate.observedAt).getTime() : 0
  const existingFreshness = existing.observedAt ? new Date(existing.observedAt).getTime() : 0
  const candidateScore =
    (candidate.matchConfidence ?? 0) * 3 +
    (candidate.unitConfidence ?? 0) * 2 +
    (candidate.confidence ?? 0)
  const existingScore =
    (existing.matchConfidence ?? 0) * 3 +
    (existing.unitConfidence ?? 0) * 2 +
    (existing.confidence ?? 0)

  return (
    candidateScore > existingScore ||
    (candidateScore === existingScore && candidateFreshness > existingFreshness)
  )
}

async function tableExists(regclass: string): Promise<boolean> {
  const rows = await pgClient<Array<{ exists: boolean }>>`
    SELECT to_regclass(${regclass}) IS NOT NULL AS exists
  `
  return Boolean(rows[0]?.exists)
}

async function findSystemIngredient(
  item: GeographicPricingBasketItem
): Promise<SystemIngredientRow | null> {
  const aliases = aliasesFor(item)
  const rows = await pgClient<SystemIngredientRow[]>`
    SELECT id::text, name, category::text, standard_unit
    FROM system_ingredients
    WHERE is_active = true
      AND (
        lower(name) = ANY(${aliases.map((alias) => alias.toLowerCase())}::text[])
        OR EXISTS (
          SELECT 1
          FROM unnest(${aliases}::text[]) AS alias(value)
          WHERE lower(name) LIKE '%' || lower(alias.value) || '%'
             OR lower(alias.value) LIKE '%' || lower(name) || '%'
        )
      )
    ORDER BY
      CASE WHEN lower(name) = lower(${item.displayName}) THEN 0 ELSE 1 END,
      length(name)
    LIMIT 1
  `
  return rows[0] ?? null
}

async function loadLocalStoreCoverage(): Promise<Map<string, boolean>> {
  const rows = await pgClient<Array<{ state: string; count: number }>>`
    SELECT state, COUNT(*)::int AS count
    FROM openclaw.stores
    WHERE zip <> '00000'
      AND lower(city) <> 'regional'
      AND is_active = true
    GROUP BY state
  `
  return new Map(rows.map((row) => [row.state, row.count > 0]))
}

async function loadLocalCandidatesByGeography(
  item: GeographicPricingBasketItem
): Promise<Map<string, GeographicProofCandidate>> {
  const aliases = aliasesFor(item)
  const searchText = aliases.slice(0, 3).join(' ')
  let rows: LocalCandidateRow[] = []
  try {
    rows = await pgClient<LocalCandidateRow[]>`
      WITH matched_products AS (
        SELECT
          p.id,
          p.name,
          p.brand,
          p.size,
          p.size_value,
          p.size_unit,
          CASE
            WHEN lower(p.name) = ANY(${aliases.map((alias) => alias.toLowerCase())}::text[]) THEN 1
            WHEN EXISTS (
              SELECT 1
              FROM unnest(${aliases}::text[]) AS alias(value)
              WHERE lower(p.name) LIKE lower(alias.value) || '%'
            ) THEN 2
            WHEN EXISTS (
              SELECT 1
              FROM unnest(${aliases}::text[]) AS alias(value)
              WHERE lower(p.name) LIKE '%' || lower(alias.value) || '%'
            ) THEN 3
            ELSE 4
          END AS match_rank
        FROM openclaw.products p
        WHERE COALESCE(p.is_food, true) = true
          AND (
            to_tsvector('english', p.name) @@ plainto_tsquery('english', ${searchText})
            OR EXISTS (
              SELECT 1
              FROM unnest(${aliases}::text[]) AS alias(value)
              WHERE lower(p.name) LIKE '%' || lower(alias.value) || '%'
            )
        )
        LIMIT 500
      ),
      ranked_candidates AS (
        SELECT
          s.id::text AS entity_store_id,
          s.name AS entity_store_name,
          s.city AS entity_store_city,
          s.state AS entity_store_state,
          s.zip AS entity_store_zip,
          mp.id::text AS entity_product_id,
          mp.name AS entity_product_name,
          mp.brand AS entity_product_brand,
          mp.size AS entity_product_size,
          mp.size_value AS entity_product_size_value,
          mp.size_unit AS entity_product_size_unit,
          c.name AS entity_source_name,
          COALESCE(sp.source, c.scraper_type, c.source_type) AS entity_source_type,
          NULL::text AS entity_ingredient_id,
          COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::int AS price_cents,
          COALESCE(
            NULLIF(sp.price_per_standard_unit_cents, 0),
            NULLIF(sp.sale_price_cents, 0),
            sp.price_cents
          )::int AS normalized_price_cents,
          (NULLIF(sp.price_per_standard_unit_cents, 0) IS NOT NULL) AS has_standard_unit_price,
          sp.last_seen_at::text AS observed_at,
          (
            CASE
              WHEN sp.last_seen_at > now() - interval '7 days' THEN 0.80
              WHEN sp.last_seen_at > now() - interval '14 days' THEN 0.68
              ELSE 0.52
            END
          )::numeric AS confidence,
          row_number() OVER (
            PARTITION BY s.state
            ORDER BY
              CASE WHEN sp.last_seen_at > now() - interval '7 days' THEN 0 ELSE 1 END,
              (
                CASE
                  WHEN sp.last_seen_at > now() - interval '7 days' THEN 0.80
                  WHEN sp.last_seen_at > now() - interval '14 days' THEN 0.68
                  ELSE 0.52
                END
              ) DESC,
              mp.match_rank ASC,
              CASE WHEN NULLIF(sp.price_per_standard_unit_cents, 0) IS NOT NULL THEN 0 ELSE 1 END,
              sp.last_seen_at DESC
          ) AS state_rank
        FROM matched_products mp
        JOIN openclaw.store_products sp ON sp.product_id = mp.id
        JOIN openclaw.stores s ON s.id = sp.store_id
        JOIN openclaw.chains c ON c.id = s.chain_id
        WHERE s.zip <> '00000'
          AND lower(s.city) <> 'regional'
          AND COALESCE(s.is_active, true) = true
          AND sp.price_cents > 0
          AND sp.last_seen_at > now() - interval '30 days'
      )
      SELECT
        entity_store_id,
        entity_store_name,
        entity_store_city,
        entity_store_state,
        entity_store_zip,
        entity_product_id,
        entity_product_name,
        entity_product_brand,
        entity_product_size,
        entity_product_size_value,
        entity_product_size_unit,
        entity_source_name,
        entity_source_type,
        entity_ingredient_id,
        price_cents,
        normalized_price_cents,
        has_standard_unit_price,
        observed_at,
        confidence
      FROM ranked_candidates
      WHERE state_rank <= 12
    `
  } catch (error) {
    console.warn(
      `[geographic-pricing-proof] Local candidate lookup failed for ${item.ingredientKey}:`,
      error
    )
    return new Map()
  }

  const candidates = new Map<string, GeographicProofCandidate>()
  for (const row of rows) {
    if (!row.entity_store_state) continue
    const matchScore = scoreLocalProductMatch(row.entity_product_name, item)
    const unitScore = scoreLocalUnitConversion({
      hasStandardUnitPrice: Boolean(row.has_standard_unit_price),
      targetUnit: item.targetUnit,
      productSizeValue: toPositiveNumber(row.entity_product_size_value),
      productSizeUnit: row.entity_product_size_unit,
    })
    const candidate: GeographicProofCandidate = {
      kind: 'store_observed',
      priceCents: row.price_cents,
      normalizedPriceCents: row.normalized_price_cents,
      normalizedUnit: item.targetUnit,
      geographyCode: row.entity_store_state,
      storeId: row.entity_store_id,
      storeName: row.entity_store_name,
      storeCity: row.entity_store_city,
      storeState: row.entity_store_state,
      storeZip: row.entity_store_zip,
      productId: row.entity_product_id,
      productName: row.entity_product_name,
      productBrand: row.entity_product_brand,
      productSize: row.entity_product_size,
      sourceName: row.entity_source_name,
      sourceType: row.entity_source_type,
      observedAt: row.observed_at,
      confidence: toNumber(row.confidence),
      matchConfidence: row.entity_ingredient_id
        ? Math.max(0.8, matchScore.confidence)
        : matchScore.confidence,
      unitConfidence: unitScore.confidence,
      dataPoints: 1,
      canonicalIngredientId: row.entity_ingredient_id,
      evidence: {
        candidate: 'openclaw_store_products',
        hasStandardUnitPrice: row.has_standard_unit_price,
        productSizeValue: toPositiveNumber(row.entity_product_size_value),
        productSizeUnit: row.entity_product_size_unit,
        matchReason: matchScore.reason,
        matchedAlias: matchScore.matchedAlias,
        unitReason: unitScore.reason,
      },
    }

    if (isBetterLocalCandidate(candidate, candidates.get(row.entity_store_state))) {
      candidates.set(row.entity_store_state, candidate)
    }
  }

  return candidates
}

async function findMarketCandidate(
  geography: GeographicPricingGeography,
  systemIngredient: SystemIngredientRow | null
): Promise<GeographicProofCandidate | null> {
  if (!systemIngredient) return null
  const rows = await pgClient<MarketCandidateRow[]>`
    SELECT
      avg_price_cents::int,
      min_price_cents::int,
      max_price_cents::int,
      median_price_cents::int,
      price_unit,
      store_count::int,
      product_count::int,
      state_count::int,
      states,
      newest_price_at::text,
      confidence
    FROM openclaw.system_ingredient_prices
    WHERE system_ingredient_id = ${systemIngredient.id}
      AND COALESCE(median_price_cents, avg_price_cents) > 0
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  const states = row.states ?? []
  const coversState = states.includes(geography.code)
  const confidence = Math.min(toNumber(row.confidence) + (coversState ? 0.1 : 0), 0.75)
  const priceCents = toPositiveInt(row.median_price_cents ?? row.avg_price_cents)

  return {
    kind: coversState && !TERRITORY_CODES.has(geography.code) ? 'market_state' : 'market_national',
    priceCents,
    normalizedPriceCents: priceCents,
    normalizedUnit: row.price_unit,
    lowCents: row.min_price_cents,
    highCents: row.max_price_cents,
    observedAt: row.newest_price_at,
    confidence,
    matchConfidence: 0.72,
    unitConfidence: row.price_unit ? 0.74 : 0.3,
    dataPoints: row.store_count ?? 0,
    systemIngredientId: systemIngredient.id,
    evidence: {
      candidate: 'system_ingredient_prices',
      storeCount: row.store_count,
      productCount: row.product_count,
      stateCount: row.state_count,
      coversState,
    },
  }
}

async function findPublicBaselineCandidate(
  item: GeographicPricingBasketItem
): Promise<GeographicProofCandidate | null> {
  const aliases = aliasesFor(item)
  const rows = await pgClient<PublicBaselineRow[]>`
    SELECT item_name, price_cents::int, unit, region, observation_date::text, category
    FROM openclaw.usda_price_baselines
    WHERE price_cents > 0
      AND (
        lower(category) = lower(${item.category})
        OR EXISTS (
          SELECT 1
          FROM unnest(${aliases}::text[]) AS alias(value)
          WHERE lower(item_name) LIKE '%' || lower(alias.value) || '%'
             OR lower(alias.value) LIKE '%' || lower(item_name) || '%'
        )
      )
    ORDER BY
      CASE WHEN region = 'us_average' THEN 0 ELSE 1 END,
      observation_date DESC
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    kind: 'public_baseline',
    priceCents: row.price_cents,
    normalizedPriceCents: row.price_cents,
    normalizedUnit: normalizeText(row.unit) ?? item.targetUnit,
    observedAt: row.observation_date,
    confidence: 0.42,
    matchConfidence: 0.65,
    unitConfidence: row.unit ? 0.65 : 0.3,
    dataPoints: 1,
    sourceName: 'USDA/BLS baseline',
    sourceType: 'public_baseline',
    evidence: {
      candidate: 'usda_price_baselines',
      itemName: row.item_name,
      region: row.region,
      category: row.category,
    },
  }
}

async function findCategoryBaselineCandidate(
  item: GeographicPricingBasketItem
): Promise<GeographicProofCandidate | null> {
  const rows = await pgClient<CategoryBaselineRow[]>`
    SELECT
      median_cents_per_unit::int,
      most_common_unit,
      ingredient_count::int
    FROM category_price_baselines
    WHERE category::text = ${item.category}
      AND median_cents_per_unit > 0
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null
  return {
    kind: 'category_baseline',
    priceCents: row.median_cents_per_unit,
    normalizedPriceCents: row.median_cents_per_unit,
    normalizedUnit: row.most_common_unit ?? item.targetUnit,
    confidence: 0.3,
    matchConfidence: 0.45,
    unitConfidence: row.most_common_unit ? 0.55 : 0.25,
    dataPoints: row.ingredient_count ?? 0,
    sourceName: 'Category baseline',
    sourceType: 'category_baseline',
    evidence: { candidate: 'category_price_baselines', ingredientCount: row.ingredient_count },
  }
}

async function pickCandidate(
  geography: GeographicPricingGeography,
  item: GeographicPricingBasketItem,
  systemIngredient: SystemIngredientRow | null,
  localCandidate: GeographicProofCandidate | null
): Promise<GeographicProofCandidate | null> {
  return (
    localCandidate ??
    (await findMarketCandidate(geography, systemIngredient)) ??
    (await findPublicBaselineCandidate(item)) ??
    (await findCategoryBaselineCandidate(item)) ?? {
      kind: 'modeled_fallback',
      priceCents: 399,
      normalizedPriceCents: 399,
      normalizedUnit: item.targetUnit,
      confidence: 0.18,
      matchConfidence: 0.25,
      unitConfidence: 0.35,
      dataPoints: 0,
      evidence: { candidate: 'modeled_category_fallback', category: item.category },
    }
  )
}

function buildProofRow(input: {
  geography: GeographicPricingGeography
  item: GeographicPricingBasketItem
  candidate: GeographicProofCandidate | null
  systemIngredient: SystemIngredientRow | null
  localStores: boolean
  now: Date
}): GeographicPricingProofRow {
  const classification = classifyGeographicProofCandidate(input.candidate, {
    geographyCode: input.geography.code,
    hasLocalStores: input.localStores,
    now: input.now,
  })

  return {
    geographyCode: input.geography.code,
    geographyName: input.geography.name,
    ingredientKey: input.item.ingredientKey,
    systemIngredientId: input.candidate?.systemIngredientId ?? input.systemIngredient?.id ?? null,
    canonicalIngredientId: input.candidate?.canonicalIngredientId ?? null,
    sourceClass: classification.sourceClass,
    quoteSafety: classification.quoteSafety,
    failureReason: classification.failureReason,
    priceCents: classification.priceCents,
    normalizedPriceCents: classification.normalizedPriceCents,
    normalizedUnit: classification.normalizedUnit,
    lowCents: classification.lowCents,
    highCents: classification.highCents,
    storeId: input.candidate?.storeId ?? null,
    storeName: input.candidate?.storeName ?? null,
    storeCity: input.candidate?.storeCity ?? null,
    storeState: input.candidate?.storeState ?? null,
    storeZip: input.candidate?.storeZip ?? null,
    productId: input.candidate?.productId ?? null,
    productName: input.candidate?.productName ?? null,
    productBrand: input.candidate?.productBrand ?? null,
    productSize: input.candidate?.productSize ?? null,
    sourceName: input.candidate?.sourceName ?? null,
    sourceType: input.candidate?.sourceType ?? null,
    observedAt: input.candidate?.observedAt ?? null,
    freshnessDays: classification.freshnessDays,
    confidence: classification.confidence,
    matchConfidence: classification.matchConfidence,
    unitConfidence: classification.unitConfidence,
    dataPoints: classification.dataPoints,
    missingProof: classification.missingProof,
    evidence: {
      ...classification.evidence,
      targetUnit: input.item.targetUnit,
      hasLocalStores: input.localStores,
    },
  }
}

export async function buildGeographicPricingProofRows(
  options: { now?: Date } = {}
): Promise<GeographicPricingProofRow[]> {
  const now = options.now ?? new Date()
  const systemIngredientByKey = new Map<string, SystemIngredientRow | null>()
  const localCandidatesByKey = new Map<string, Map<string, GeographicProofCandidate>>()

  for (const item of GEOGRAPHIC_PRICING_BASKET) {
    const [systemIngredient, localCandidates] = await Promise.all([
      findSystemIngredient(item),
      loadLocalCandidatesByGeography(item),
    ])
    systemIngredientByKey.set(item.ingredientKey, systemIngredient)
    localCandidatesByKey.set(item.ingredientKey, localCandidates)
  }

  const localStoreCoverage = await loadLocalStoreCoverage()
  const rows: GeographicPricingProofRow[] = []
  for (const geography of GEOGRAPHIC_PRICING_GEOGRAPHIES) {
    const localStores = localStoreCoverage.get(geography.code) ?? false
    for (const item of GEOGRAPHIC_PRICING_BASKET) {
      const systemIngredient = systemIngredientByKey.get(item.ingredientKey) ?? null
      const localCandidate =
        localCandidatesByKey.get(item.ingredientKey)?.get(geography.code) ?? null
      const candidate =
        geography.kind === 'territory' && !localStores
          ? null
          : await pickCandidate(geography, item, systemIngredient, localCandidate)
      rows.push(buildProofRow({ geography, item, candidate, systemIngredient, localStores, now }))
    }
  }

  return rows
}

function countSafety(rows: GeographicPricingProofRow[], safety: GeographicQuoteSafety): number {
  return rows.filter((row) => row.quoteSafety === safety).length
}

async function ensureProofTablesExist(): Promise<void> {
  const exists = await tableExists('openclaw.geographic_pricing_proof_runs')
  if (!exists) {
    throw new Error(
      'Geographic pricing proof tables are missing. Apply the additive migration first.'
    )
  }
}

async function insertProofRun(
  rows: GeographicPricingProofRow[],
  requestedBy: string | null
): Promise<string> {
  await ensureProofTablesExist()

  return pgClient.begin(async (txSql) => {
    const runRows = await txSql<Array<{ id: string }>>`
      INSERT INTO openclaw.geographic_pricing_proof_runs (
        status,
        requested_by,
        total_geographies,
        total_basket_items,
        expected_result_rows,
        actual_result_rows,
        safe_to_quote_count,
        verify_first_count,
        planning_only_count,
        not_usable_count,
        metadata
      )
      VALUES (
        'running',
        ${requestedBy},
        ${GEOGRAPHIC_PRICING_GEOGRAPHIES.length},
        ${GEOGRAPHIC_PRICING_BASKET.length},
        ${GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS},
        0,
        0,
        0,
        0,
        0,
        ${JSON.stringify({ source: 'geographic_pricing_proof_harness' })}::jsonb
      )
      RETURNING id::text
    `
    const runId = runRows[0]?.id
    if (!runId) throw new Error('Could not create geographic pricing proof run.')

    for (const row of rows) {
      await txSql`
        INSERT INTO openclaw.geographic_pricing_proof_results (
          run_id,
          geography_code,
          geography_name,
          ingredient_key,
          system_ingredient_id,
          canonical_ingredient_id,
          source_class,
          quote_safety,
          failure_reason,
          price_cents,
          normalized_price_cents,
          normalized_unit,
          low_cents,
          high_cents,
          store_id,
          store_name,
          store_city,
          store_state,
          store_zip,
          product_id,
          product_name,
          product_brand,
          product_size,
          source_name,
          source_type,
          observed_at,
          freshness_days,
          confidence,
          match_confidence,
          unit_confidence,
          data_points,
          missing_proof,
          evidence
        )
        VALUES (
          ${runId},
          ${row.geographyCode},
          ${row.geographyName},
          ${row.ingredientKey},
          ${row.systemIngredientId},
          ${row.canonicalIngredientId},
          ${row.sourceClass},
          ${row.quoteSafety},
          ${row.failureReason},
          ${row.priceCents},
          ${row.normalizedPriceCents},
          ${row.normalizedUnit},
          ${row.lowCents},
          ${row.highCents},
          ${row.storeId},
          ${row.storeName},
          ${row.storeCity},
          ${row.storeState},
          ${row.storeZip},
          ${row.productId},
          ${row.productName},
          ${row.productBrand},
          ${row.productSize},
          ${row.sourceName},
          ${row.sourceType},
          ${row.observedAt},
          ${row.freshnessDays},
          ${row.confidence},
          ${row.matchConfidence},
          ${row.unitConfidence},
          ${row.dataPoints},
          ${row.missingProof},
          ${JSON.stringify(row.evidence)}::jsonb
        )
      `
    }

    await txSql`
      UPDATE openclaw.geographic_pricing_proof_runs
      SET completed_at = now(),
          status = ${rows.length === GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS ? 'success' : 'partial'},
          actual_result_rows = ${rows.length},
          safe_to_quote_count = ${countSafety(rows, 'safe_to_quote')},
          verify_first_count = ${countSafety(rows, 'verify_first')},
          planning_only_count = ${countSafety(rows, 'planning_only')},
          not_usable_count = ${countSafety(rows, 'not_usable')},
          metadata = ${JSON.stringify({
            source: 'geographic_pricing_proof_harness',
            expectedRows: GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS,
          })}::jsonb
      WHERE id = ${runId}
    `

    return runId
  })
}

export async function runGeographicPricingProof(
  options: RunGeographicPricingProofOptions = {}
): Promise<RunGeographicPricingProofResult> {
  try {
    const rows = await buildGeographicPricingProofRows({ now: options.now })
    const runId = options.write ? await insertProofRun(rows, options.requestedBy ?? null) : null

    return {
      success: true,
      runId,
      wrote: Boolean(options.write),
      totalRows: rows.length,
      expectedRows: GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS,
      safeToQuoteCount: countSafety(rows, 'safe_to_quote'),
      verifyFirstCount: countSafety(rows, 'verify_first'),
      planningOnlyCount: countSafety(rows, 'planning_only'),
      notUsableCount: countSafety(rows, 'not_usable'),
      rows,
    }
  } catch (error) {
    return {
      success: false,
      runId: null,
      wrote: false,
      totalRows: 0,
      expectedRows: GEOGRAPHIC_PRICING_EXPECTED_RESULT_ROWS,
      safeToQuoteCount: 0,
      verifyFirstCount: 0,
      planningOnlyCount: 0,
      notUsableCount: 0,
      rows: [],
      error: error instanceof Error ? error.message : 'Geographic pricing proof failed.',
    }
  }
}

function mapRun(row: LatestRunRow): GeographicPricingProofRunSummary {
  return {
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    requestedBy: row.requested_by,
    totalGeographies: row.total_geographies,
    totalBasketItems: row.total_basket_items,
    expectedResultRows: row.expected_result_rows,
    actualResultRows: row.actual_result_rows,
    safeToQuoteCount: row.safe_to_quote_count,
    verifyFirstCount: row.verify_first_count,
    planningOnlyCount: row.planning_only_count,
    notUsableCount: row.not_usable_count,
    metadata: row.metadata ?? {},
  }
}

function mapProofRow(row: ProofResultDbRow): GeographicPricingProofRow {
  return {
    geographyCode: row.geography_code,
    geographyName: row.geography_name,
    ingredientKey: row.ingredient_key,
    systemIngredientId: row.system_ingredient_id,
    canonicalIngredientId: row.canonical_ingredient_id,
    sourceClass: row.source_class,
    quoteSafety: row.quote_safety,
    failureReason: row.failure_reason,
    priceCents: row.price_cents,
    normalizedPriceCents: row.normalized_price_cents,
    normalizedUnit: row.normalized_unit,
    lowCents: row.low_cents,
    highCents: row.high_cents,
    storeId: row.store_id,
    storeName: row.store_name,
    storeCity: row.store_city,
    storeState: row.store_state,
    storeZip: row.store_zip,
    productId: row.product_id,
    productName: row.product_name,
    productBrand: row.product_brand,
    productSize: row.product_size,
    sourceName: row.source_name,
    sourceType: row.source_type,
    observedAt: row.observed_at,
    freshnessDays: row.freshness_days,
    confidence: toNumber(row.confidence),
    matchConfidence: toNumber(row.match_confidence),
    unitConfidence: toNumber(row.unit_confidence),
    dataPoints: row.data_points,
    missingProof: row.missing_proof ?? [],
    evidence: row.evidence ?? {},
  }
}

export function summarizeGeographicProofRows(
  rows: GeographicPricingProofRow[]
): GeographicPricingProofGeographySummary[] {
  const byGeography = new Map<string, GeographicPricingProofRow[]>()
  for (const row of rows) {
    const existing = byGeography.get(row.geographyCode) ?? []
    existing.push(row)
    byGeography.set(row.geographyCode, existing)
  }

  return Array.from(byGeography.entries())
    .map(([geographyCode, geographyRows]) => {
      const reasonCounts = new Map<string, number>()
      for (const row of geographyRows) {
        if (!row.failureReason) continue
        reasonCounts.set(row.failureReason, (reasonCounts.get(row.failureReason) ?? 0) + 1)
      }

      const worstQuoteSafety = geographyRows.reduce<GeographicQuoteSafety>(
        (worst, row) =>
          SAFETY_RANK[row.quoteSafety] > SAFETY_RANK[worst] ? row.quoteSafety : worst,
        'safe_to_quote'
      )

      return {
        geographyCode,
        geographyName: geographyRows[0]?.geographyName ?? geographyCode,
        safeToQuoteCount: geographyRows.filter((row) => row.quoteSafety === 'safe_to_quote').length,
        verifyFirstCount: geographyRows.filter((row) => row.quoteSafety === 'verify_first').length,
        planningOnlyCount: geographyRows.filter((row) => row.quoteSafety === 'planning_only')
          .length,
        notUsableCount: geographyRows.filter((row) => row.quoteSafety === 'not_usable').length,
        worstQuoteSafety,
        topFailureReasons: Array.from(reasonCounts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 3)
          .map(([reason]) => reason),
      }
    })
    .sort((a, b) => a.geographyName.localeCompare(b.geographyName))
}

export async function getLatestGeographicPricingProof(): Promise<GeographicPricingProofLatest> {
  const exists = await tableExists('openclaw.geographic_pricing_proof_runs')
  if (!exists) {
    return { run: null, rows: [], geographySummaries: [] }
  }

  const runRows = await pgClient<LatestRunRow[]>`
    SELECT
      id::text,
      started_at::text,
      completed_at::text,
      status,
      requested_by,
      total_geographies::int,
      total_basket_items::int,
      expected_result_rows::int,
      actual_result_rows::int,
      safe_to_quote_count::int,
      verify_first_count::int,
      planning_only_count::int,
      not_usable_count::int,
      metadata
    FROM openclaw.geographic_pricing_proof_runs
    ORDER BY started_at DESC
    LIMIT 1
  `
  const run = runRows[0] ? mapRun(runRows[0]) : null
  if (!run) return { run: null, rows: [], geographySummaries: [] }

  const rows = await pgClient<ProofResultDbRow[]>`
    SELECT
      geography_code,
      geography_name,
      ingredient_key,
      system_ingredient_id::text,
      canonical_ingredient_id,
      source_class,
      quote_safety,
      failure_reason,
      price_cents::int,
      normalized_price_cents::int,
      normalized_unit,
      low_cents::int,
      high_cents::int,
      store_id::text,
      store_name,
      store_city,
      store_state,
      store_zip,
      product_id::text,
      product_name,
      product_brand,
      product_size,
      source_name,
      source_type,
      observed_at::text,
      freshness_days::int,
      confidence,
      match_confidence,
      unit_confidence,
      data_points::int,
      missing_proof,
      evidence
    FROM openclaw.geographic_pricing_proof_results
    WHERE run_id = ${run.id}
    ORDER BY geography_name, ingredient_key
  `
  const mappedRows = rows.map(mapProofRow)
  return {
    run,
    rows: mappedRows,
    geographySummaries: summarizeGeographicProofRows(mappedRows),
  }
}
