/**
 * Shared contract-backed ingredient detail reads.
 *
 * The canonical selection of ingredient/store price facts must come from the
 * national price-intelligence contract, not ad hoc joins over raw product rows.
 * This module centralizes that read path for both chef and public surfaces.
 */

import { pgClient } from '@/lib/db'
import type { CatalogDetailPrice, CatalogDetailResult } from '@/lib/openclaw/catalog-types'

export type CatalogDetailVisibility = 'internal' | 'public'

export type CatalogIngredientRecord = {
  id: string
  name: string
  category: string
  standardUnit: string
}

type IngredientRow = {
  ingredient_id: string
  name: string
  category: string | null
  standard_unit: string | null
}

type ContractPriceRow = {
  store_name: string | null
  store_city: string | null
  store_state: string | null
  store_website: string | null
  price_cents: number | string | null
  price_unit: string | null
  price_type: string | null
  observation_method: string | null
  entity_source_name: string | null
  entity_source_type: string | null
  provenance_label: string | null
  confidence_score: number | string | null
  publication_eligibility: string | null
  surface_eligible: boolean | null
  lifecycle_state: string | null
  in_stock: boolean | null
  source_url: string | null
  image_url: string | null
  brand: string | null
  aisle_cat: string | null
  last_confirmed_at: string | Date | null
  last_changed_at: string | Date | null
  package_size: string | null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function normalizeCategory(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized'
}

function normalizeUnit(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'each'
}

function normalizeImage(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'none') return null
  return trimmed
}

function confidenceFromContractSignals(input: {
  observationMethod: string | null
  sourceName: string | null
  sourceType: string | null
  provenanceLabel: string | null
}): string {
  const normalized = [
    input.observationMethod,
    input.sourceName,
    input.sourceType,
    input.provenanceLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (normalized.includes('receipt')) return 'exact_receipt'
  if (normalized.includes('instacart')) return 'instacart_adjusted'
  if (normalized.includes('flipp') || normalized.includes('flyer')) return 'flyer_scrape'
  if (
    normalized.includes('government') ||
    normalized.includes('usda') ||
    normalized.includes('bls')
  ) {
    return 'government_baseline'
  }

  return 'direct_scrape'
}

function buildEmptyDetail(ingredient: CatalogIngredientRecord): CatalogDetailResult {
  return {
    ingredient: {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      standardUnit: ingredient.standardUnit,
    },
    prices: [],
    summary: {
      storeCount: 0,
      inStockCount: 0,
      outOfStockCount: 0,
      cheapestCents: null,
      cheapestStore: null,
      avgCents: null,
      hasSourceUrls: false,
    },
  }
}

export async function getCatalogIngredientRecord(
  ingredientId: string
): Promise<CatalogIngredientRecord | null> {
  const rows = (await pgClient<IngredientRow[]>`
    SELECT
      ingredient_id,
      name,
      COALESCE(NULLIF(category, ''), 'uncategorized') AS category,
      COALESCE(NULLIF(standard_unit, ''), 'each') AS standard_unit
    FROM openclaw.canonical_ingredients
    WHERE ingredient_id = ${ingredientId}
    LIMIT 1
  `) as IngredientRow[]

  const ingredient = rows[0]
  if (!ingredient) return null

  return {
    id: ingredient.ingredient_id,
    name: ingredient.name,
    category: normalizeCategory(ingredient.category),
    standardUnit: normalizeUnit(ingredient.standard_unit),
  }
}

export async function getCatalogDetailFromContract(params: {
  ingredientId: string
  visibility: CatalogDetailVisibility
  ingredient?: CatalogIngredientRecord | null
}): Promise<CatalogDetailResult | null> {
  const ingredient = params.ingredient ?? (await getCatalogIngredientRecord(params.ingredientId))
  if (!ingredient) return null

  const rows = (await pgClient<ContractPriceRow[]>`
    WITH matched AS (
      SELECT
        pic.entity_store_name AS store_name,
        pic.entity_store_city AS store_city,
        pic.entity_store_state AS store_state,
        COALESCE(c.website_url, c.store_locator_url) AS store_website,
        COALESCE(pic.normalized_price_cents, pic.price_cents) AS price_cents,
        COALESCE(NULLIF(pic.entity_ingredient_unit, ''), 'each') AS price_unit,
        pic.price_type,
        pic.observation_method,
        pic.entity_source_name,
        pic.entity_source_type,
        pic.provenance_label,
        pic.confidence AS confidence_score,
        pic.publication_eligibility,
        pic.surface_eligible,
        pic.lifecycle_state,
        COALESCE(pic.in_stock, true) AS in_stock,
        NULL::text AS source_url,
        COALESCE(
          NULLIF(p.image_url, ''),
          NULLIF(ci.off_image_url, 'none'),
          ci.off_image_url
        ) AS image_url,
        p.brand,
        COALESCE(pc.department, pc.name) AS aisle_cat,
        pic.observed_at AS last_confirmed_at,
        pic.observed_at AS last_changed_at,
        pic.entity_product_size AS package_size,
        ROW_NUMBER() OVER (
          PARTITION BY pic.entity_store_id
          ORDER BY
            COALESCE(pic.normalized_price_cents, pic.price_cents) ASC NULLS LAST,
            pic.observed_at DESC NULLS LAST,
            pic.fact_id ASC
        ) AS store_rank
      FROM openclaw.price_intelligence_contract_v1 pic
      JOIN openclaw.canonical_ingredients ci
        ON ci.ingredient_id = pic.entity_ingredient_id
      LEFT JOIN openclaw.chains c
        ON c.id = pic.entity_chain_id
      LEFT JOIN openclaw.products p
        ON p.id = pic.entity_product_id
      LEFT JOIN openclaw.product_categories pc
        ON pc.id = p.category_id
      WHERE pic.fact_kind = 'observation'
        AND pic.entity_ingredient_id = ${params.ingredientId}
        AND pic.entity_store_id IS NOT NULL
        AND COALESCE(pic.normalized_price_cents, pic.price_cents) > 0
        AND COALESCE(pic.entity_product_is_food, true) = true
        AND (
          (${params.visibility} = 'public' AND pic.surface_eligible = true)
          OR (
            ${params.visibility} <> 'public'
            AND pic.publication_eligibility IN ('surfaceable', 'internal_only')
          )
        )
    )
    SELECT
      store_name,
      store_city,
      store_state,
      store_website,
      price_cents,
      price_unit,
      price_type,
      observation_method,
      entity_source_name,
      entity_source_type,
      provenance_label,
      confidence_score,
      publication_eligibility,
      surface_eligible,
      lifecycle_state,
      in_stock,
      source_url,
      image_url,
      brand,
      aisle_cat,
      last_confirmed_at,
      last_changed_at,
      package_size
    FROM matched
    WHERE store_rank = 1
    ORDER BY price_cents ASC NULLS LAST, store_name ASC
  `) as ContractPriceRow[]

  if (rows.length === 0) {
    return buildEmptyDetail(ingredient)
  }

  const prices: CatalogDetailPrice[] = rows.map((row) => ({
    store: row.store_name?.trim() || 'Unknown store',
    storeCity: row.store_city ?? null,
    storeState: row.store_state ?? null,
    storeWebsite: row.store_website ?? null,
    priceCents: toNumber(row.price_cents),
    priceUnit: normalizeUnit(row.price_unit || ingredient.standardUnit),
    priceType: row.price_type ?? 'retail',
    pricingTier: row.price_type ?? 'retail',
    confidence: confidenceFromContractSignals({
      observationMethod: row.observation_method,
      sourceName: row.entity_source_name,
      sourceType: row.entity_source_type,
      provenanceLabel: row.provenance_label,
    }),
    inStock: Boolean(row.in_stock),
    sourceUrl: row.source_url ?? null,
    imageUrl: normalizeImage(row.image_url),
    brand: row.brand ?? null,
    aisleCat: row.aisle_cat ?? null,
    lastConfirmedAt: toIso(row.last_confirmed_at) ?? new Date(0).toISOString(),
    lastChangedAt:
      toIso(row.last_changed_at) ?? toIso(row.last_confirmed_at) ?? new Date(0).toISOString(),
    packageSize: row.package_size ?? null,
    provenanceLabel: row.provenance_label ?? null,
    confidenceScore: toNumber(row.confidence_score),
    publicationEligibility: row.publication_eligibility ?? 'internal_only',
    surfaceEligible: Boolean(row.surface_eligible),
    lifecycleState: row.lifecycle_state ?? 'observed',
  }))

  return {
    ingredient: {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      standardUnit: ingredient.standardUnit,
    },
    prices,
    summary: {
      storeCount: prices.length,
      inStockCount: prices.filter((price) => price.inStock).length,
      outOfStockCount: prices.filter((price) => !price.inStock).length,
      cheapestCents: Math.min(...prices.map((price) => price.priceCents)),
      cheapestStore: prices.reduce((best, current) =>
        current.priceCents < best.priceCents ? current : best
      ).store,
      avgCents: Math.round(
        prices.reduce((sum, price) => sum + price.priceCents, 0) / Math.max(prices.length, 1)
      ),
      hasSourceUrls: prices.some((price) => Boolean(price.sourceUrl || price.storeWebsite)),
    },
  }
}
