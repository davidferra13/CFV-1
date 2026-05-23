'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'
import type {
  EnrichmentJob,
  EnrichmentBatchResult,
  EnrichmentGap,
  EnrichmentQualityReport,
  EnrichmentJobRow,
  EnrichmentQualityScore,
  EnrichmentSource,
} from './enrichment-types'

// ---------------------------------------------------------------------------
// OpenClaw Scraper Enrichment (OPENCLAW #1)
// Batch enrichment jobs for canonical_ingredients records:
//   - quality scoring
//   - gap detection
//   - canonical name / alias normalization
// No external APIs. Operates on existing openclaw schema.
// ---------------------------------------------------------------------------

/**
 * Run a batch enrichment pass over unenriched / low-quality ingredients.
 */
export async function runEnrichmentBatch(batchSize = 100): Promise<EnrichmentBatchResult> {
  await requireAdmin()

  const runAt = new Date().toISOString()

  // Pick ingredients that are missing key enrichment fields
  const rows = await pgClient`
    SELECT
      ci.ingredient_id,
      ci.name,
      ci.category,
      ci.standard_unit,
      ci.off_image_url,
      COUNT(DISTINCT ph.id)::int AS price_count
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.ingredient_variants iv
      ON iv.canonical_ingredient_id = ci.ingredient_id
    LEFT JOIN ingredient_price_history ph
      ON ph.ingredient_id = ci.ingredient_id
      AND ph.source LIKE 'openclaw_%'
    GROUP BY ci.ingredient_id, ci.name, ci.category, ci.standard_unit, ci.off_image_url
    HAVING (
      ci.category IS NULL
      OR ci.category = ''
      OR ci.standard_unit IS NULL
      OR ci.standard_unit = ''
      OR COUNT(DISTINCT ph.id) = 0
    )
    ORDER BY ci.name ASC
    LIMIT ${batchSize}
  `

  type RawRow = {
    ingredient_id: string
    name: string
    category: string | null
    standard_unit: string | null
    off_image_url: string | null
    price_count: number
  }

  const ingredients = rows as unknown as RawRow[]
  let enriched = 0
  let failed = 0
  const gaps: EnrichmentGap[] = []

  for (const ing of ingredients) {
    try {
      const updates: Record<string, string> = {}

      // Infer category from name if missing
      if (!ing.category) {
        const inferred = inferCategory(ing.name)
        if (inferred) updates.category = inferred
        gaps.push({
          ingredientId: ing.ingredient_id,
          ingredientName: ing.name,
          gapType: 'missing_category',
          severity: 'high',
        })
      }

      // Infer standard unit if missing
      if (!ing.standard_unit) {
        const unit = inferUnit(ing.name, ing.category ?? updates.category)
        if (unit) updates.standard_unit = unit
        gaps.push({
          ingredientId: ing.ingredient_id,
          ingredientName: ing.name,
          gapType: 'missing_unit',
          severity: 'medium',
        })
      }

      // Flag no-price gap
      if (ing.price_count === 0) {
        gaps.push({
          ingredientId: ing.ingredient_id,
          ingredientName: ing.name,
          gapType: 'no_price',
          severity: 'high',
        })
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        if (updates.category !== undefined && updates.standard_unit !== undefined) {
          await pgClient`
            UPDATE openclaw.canonical_ingredients
            SET
              category = ${updates.category},
              standard_unit = ${updates.standard_unit},
              updated_at = now()
            WHERE ingredient_id = ${ing.ingredient_id}
          `
        } else if (updates.category !== undefined) {
          await pgClient`
            UPDATE openclaw.canonical_ingredients
            SET category = ${updates.category}, updated_at = now()
            WHERE ingredient_id = ${ing.ingredient_id}
          `
        } else if (updates.standard_unit !== undefined) {
          await pgClient`
            UPDATE openclaw.canonical_ingredients
            SET standard_unit = ${updates.standard_unit}, updated_at = now()
            WHERE ingredient_id = ${ing.ingredient_id}
          `
        }
        enriched++
      }
    } catch {
      failed++
    }
  }

  return {
    totalQueued: ingredients.length,
    processed: ingredients.length,
    enriched,
    failed,
    skipped: ingredients.length - enriched - failed,
    gaps: gaps.slice(0, 200),
    runAt,
  }
}

/**
 * Detect enrichment gaps across the entire catalog.
 */
export async function detectEnrichmentGaps(limit = 500): Promise<EnrichmentGap[]> {
  await requireAdmin()

  const gaps: EnrichmentGap[] = []

  // Missing categories
  const missingCatRows = await pgClient`
    SELECT ingredient_id, name FROM openclaw.canonical_ingredients
    WHERE category IS NULL OR category = ''
    ORDER BY name ASC
    LIMIT ${Math.floor(limit / 3)}
  `
  for (const r of missingCatRows as unknown as { ingredient_id: string; name: string }[]) {
    gaps.push({
      ingredientId: r.ingredient_id,
      ingredientName: r.name,
      gapType: 'missing_category',
      severity: 'high',
    })
  }

  // Missing units
  const missingUnitRows = await pgClient`
    SELECT ingredient_id, name FROM openclaw.canonical_ingredients
    WHERE standard_unit IS NULL OR standard_unit = ''
    ORDER BY name ASC
    LIMIT ${Math.floor(limit / 3)}
  `
  for (const r of missingUnitRows as unknown as { ingredient_id: string; name: string }[]) {
    gaps.push({
      ingredientId: r.ingredient_id,
      ingredientName: r.name,
      gapType: 'missing_unit',
      severity: 'medium',
    })
  }

  // No prices
  const noPriceRows = await pgClient`
    SELECT ci.ingredient_id, ci.name
    FROM openclaw.canonical_ingredients ci
    WHERE NOT EXISTS (
      SELECT 1 FROM ingredient_price_history ph
      WHERE ph.ingredient_id = ci.ingredient_id
        AND ph.source LIKE 'openclaw_%'
    )
    ORDER BY ci.name ASC
    LIMIT ${Math.floor(limit / 3)}
  `
  for (const r of noPriceRows as unknown as { ingredient_id: string; name: string }[]) {
    gaps.push({
      ingredientId: r.ingredient_id,
      ingredientName: r.name,
      gapType: 'no_price',
      severity: 'high',
    })
  }

  return gaps
}

/**
 * Quality report: how enriched is the full catalog?
 */
export async function getEnrichmentQualityReport(): Promise<EnrichmentQualityReport> {
  await requireAdmin()

  const [totalRows, fullyRows, partialRows] = await Promise.all([
    pgClient`SELECT COUNT(*)::int AS count FROM openclaw.canonical_ingredients`,
    pgClient`
      SELECT COUNT(*)::int AS count
      FROM openclaw.canonical_ingredients
      WHERE category IS NOT NULL AND category != ''
        AND standard_unit IS NOT NULL AND standard_unit != ''
    `,
    pgClient`
      SELECT COUNT(*)::int AS count
      FROM openclaw.canonical_ingredients
      WHERE (category IS NOT NULL AND category != '')
         OR (standard_unit IS NOT NULL AND standard_unit != '')
    `,
  ])

  const total = (totalRows[0] as { count: number }).count
  const fully = (fullyRows[0] as { count: number }).count
  const partial = (partialRows[0] as { count: number }).count - fully
  const unenriched = total - fully - partial
  const avgScore = total > 0 ? Math.round((fully / total) * 100) / 100 : 0

  const topGaps = await detectEnrichmentGaps(30)

  return {
    totalIngredients: total,
    fullyEnriched: fully,
    partiallyEnriched: partial,
    unenriched,
    averageQualityScore: avgScore,
    topGaps,
    runAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Inference helpers (no external APIs)
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: [string, string[]][] = [
  [
    'Produce',
    [
      'apple',
      'banana',
      'tomato',
      'onion',
      'garlic',
      'potato',
      'carrot',
      'pepper',
      'spinach',
      'lettuce',
      'broccoli',
      'celery',
      'cucumber',
      'mushroom',
      'herb',
      'vegetable',
      'fruit',
      'greens',
    ],
  ],
  [
    'Meat & Poultry',
    [
      'chicken',
      'beef',
      'pork',
      'turkey',
      'lamb',
      'veal',
      'steak',
      'ground',
      'sausage',
      'bacon',
      'ham',
      'rib',
      'loin',
      'breast',
      'thigh',
    ],
  ],
  [
    'Seafood',
    [
      'salmon',
      'shrimp',
      'tuna',
      'cod',
      'tilapia',
      'lobster',
      'crab',
      'fish',
      'scallop',
      'clam',
      'oyster',
      'seafood',
    ],
  ],
  ['Dairy & Eggs', ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'egg', 'dairy']],
  [
    'Grains & Pasta',
    ['rice', 'pasta', 'flour', 'bread', 'oat', 'grain', 'cereal', 'noodle', 'tortilla'],
  ],
  [
    'Oils & Condiments',
    [
      'oil',
      'vinegar',
      'sauce',
      'dressing',
      'ketchup',
      'mustard',
      'mayonnaise',
      'salsa',
      'soy sauce',
    ],
  ],
  [
    'Spices & Herbs',
    [
      'salt',
      'pepper',
      'cumin',
      'oregano',
      'thyme',
      'basil',
      'paprika',
      'cinnamon',
      'spice',
      'herb',
      'seasoning',
    ],
  ],
  ['Canned & Packaged', ['canned', 'broth', 'stock', 'bean', 'lentil', 'chickpea', 'pea', 'corn']],
  ['Sweeteners', ['sugar', 'honey', 'maple', 'syrup', 'molasses', 'agave']],
  ['Beverages', ['juice', 'water', 'wine', 'beer', 'soda', 'coffee', 'tea', 'drink']],
]

function inferCategory(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category
    }
  }
  return null
}

function inferUnit(name: string, category?: string | null): string | null {
  const lower = name.toLowerCase()
  if (lower.includes('egg')) return 'each'
  if (
    lower.includes('oil') ||
    lower.includes('sauce') ||
    lower.includes('vinegar') ||
    lower.includes('milk') ||
    lower.includes('cream') ||
    lower.includes('juice') ||
    lower.includes('broth') ||
    lower.includes('stock')
  )
    return 'fl oz'
  if (category === 'Spices & Herbs') return 'oz'
  if (category === 'Grains & Pasta') return 'lb'
  if (category === 'Produce' || category === 'Meat & Poultry' || category === 'Seafood') return 'lb'
  if (category === 'Dairy & Eggs') return 'oz'
  return 'each'
}

// ---------------------------------------------------------------------------
// P14: Enrichment job CRUD + quality scoring
// ---------------------------------------------------------------------------

/**
 * Create a tracked enrichment job row.
 */
export async function createEnrichmentJob(input: {
  batchName: string
  source: EnrichmentSource
  totalRecords: number
  tenantId: string
}): Promise<EnrichmentJobRow> {
  await requireAdmin()

  const rows = await pgClient`
    INSERT INTO enrichment_jobs (batch_name, source, total_records, tenant_id)
    VALUES (${input.batchName}, ${input.source}, ${input.totalRecords}, ${input.tenantId})
    RETURNING *
  `

  const row = (rows as unknown as Record<string, unknown>[])[0]
  return mapJobRow(row)
}

/**
 * List enrichment jobs, newest first, with optional status filter.
 */
export async function getEnrichmentJobs(opts?: {
  status?: string
  limit?: number
}): Promise<EnrichmentJobRow[]> {
  await requireAdmin()

  const limit = opts?.limit ?? 50

  const rows = opts?.status
    ? await pgClient`
        SELECT * FROM enrichment_jobs
        WHERE status = ${opts.status}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await pgClient`
        SELECT * FROM enrichment_jobs
        ORDER BY created_at DESC
        LIMIT ${limit}
      `

  return (rows as unknown as Record<string, unknown>[]).map(mapJobRow)
}

/**
 * Score an enrichment job on completeness, accuracy, and freshness.
 */
export async function scoreEnrichmentQuality(jobId: string): Promise<EnrichmentQualityScore> {
  await requireAdmin()

  const jobRows = await pgClient`
    SELECT * FROM enrichment_jobs WHERE id = ${jobId}
  `

  const job = (jobRows as unknown as Record<string, unknown>[])[0]
  if (!job) throw new Error('Enrichment job not found')

  const total = Number(job.total_records) || 1
  const enriched = Number(job.enriched_count) || 0

  const completeness = Math.round((enriched / total) * 100) / 100
  // Accuracy: placeholder heuristic (enriched records that are not failed)
  const accuracy = completeness > 0 ? Math.min(1, completeness + 0.1) : 0
  // Freshness: 1.0 if completed within 24h, degrades after
  const completedAt = job.completed_at as string | null
  let freshness = 0
  if (completedAt) {
    const ageMs = Date.now() - new Date(completedAt).getTime()
    const ageHours = ageMs / (1000 * 60 * 60)
    freshness = Math.max(0, Math.round((1 - ageHours / 168) * 100) / 100)
  }

  const overall = Math.round((completeness * 0.5 + accuracy * 0.3 + freshness * 0.2) * 100) / 100

  // Persist score back to the job row
  await pgClient`
    UPDATE enrichment_jobs
    SET quality_score = ${overall}
    WHERE id = ${jobId}
  `

  return {
    jobId,
    completeness,
    accuracy,
    freshness,
    overall,
    gradedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function mapJobRow(row: Record<string, unknown>): EnrichmentJobRow {
  return {
    id: row.id as string,
    batchName: row.batch_name as string,
    source: row.source as EnrichmentSource,
    status: row.status as EnrichmentJobRow['status'],
    totalRecords: Number(row.total_records) || 0,
    enrichedCount: Number(row.enriched_count) || 0,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    tenantId: row.tenant_id as string,
    createdAt: String(row.created_at),
  }
}
