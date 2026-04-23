#!/usr/bin/env node

import postgres from 'postgres'
import {
  buildFoodAliases,
  evaluateCanonicalFoodReadiness,
  normalizeFoodLookupKey,
  type CanonicalFoodReadinessInput,
} from '@/lib/openclaw/food-promotion'

type CanonicalCandidateRow = {
  ingredient_id: string
  name: string
  category: string | null
  standard_unit: string | null
  normalization_hits: number
}

type SystemIngredientRow = {
  id: string
  name: string
  slug: string | null
}

type ChefIngredientRow = {
  id: string
  tenant_id: string
  name: string
  system_ingredient_id: string | null
  alias_id: string | null
}

type SystemIngredientStatusRow = {
  id: string
  has_market_price: boolean
  has_documentation: boolean
}

type PreparedPromotion = {
  input: CanonicalFoodReadinessInput
  prepared: ReturnType<typeof evaluateCanonicalFoodReadiness>['systemIngredient']
}

type TrackedPromotion = {
  input: CanonicalFoodReadinessInput
  systemIngredientId: string
  systemIngredientName: string
  aliases: string[]
}

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DEFAULT_LIMIT = parsePositiveInt(process.env.OPENCLAW_FOOD_PROMOTION_LIMIT, 500)
const DEFAULT_POOL = parsePositiveInt(process.env.OPENCLAW_FOOD_PROMOTION_POOL, DEFAULT_LIMIT * 8)
const INSERT_BATCH_SIZE = 200

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readArg(name: string): string | null {
  const args = process.argv.slice(2)
  const index = args.indexOf(name)
  if (index < 0) return null
  return args[index + 1] ?? null
}

function buildCandidateInput(row: CanonicalCandidateRow): CanonicalFoodReadinessInput {
  return {
    id: row.ingredient_id,
    name: row.name,
    category: row.category,
    standardUnit: row.standard_unit,
    normalizationHits: Number(row.normalization_hits || 0),
  }
}

function uniqueAliasesForTargets(targets: TrackedPromotion[]): Map<string, string> {
  const aliasToSystemIngredientId = new Map<string, string>()
  const ambiguousAliases = new Set<string>()

  for (const target of targets) {
    for (const alias of target.aliases) {
      const current = aliasToSystemIngredientId.get(alias)
      if (current && current !== target.systemIngredientId) {
        ambiguousAliases.add(alias)
        aliasToSystemIngredientId.delete(alias)
        continue
      }

      if (!ambiguousAliases.has(alias)) {
        aliasToSystemIngredientId.set(alias, target.systemIngredientId)
      }
    }
  }

  return aliasToSystemIngredientId
}

async function loadCanonicalCandidates(
  sql: postgres.Sql,
  candidatePool: number
): Promise<CanonicalCandidateRow[]> {
  return sql<CanonicalCandidateRow[]>`
    SELECT
      ci.ingredient_id,
      ci.name,
      COALESCE(NULLIF(ci.category, ''), 'uncategorized') AS category,
      COALESCE(NULLIF(ci.standard_unit, ''), 'each') AS standard_unit,
      COUNT(nm.raw_name)::int AS normalization_hits
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN openclaw.normalization_map nm
      ON nm.canonical_ingredient_id = ci.ingredient_id
    WHERE ci.name IS NOT NULL
      AND LENGTH(TRIM(ci.name)) BETWEEN 2 AND 120
    GROUP BY ci.ingredient_id, ci.name, ci.category, ci.standard_unit
    ORDER BY COUNT(nm.raw_name) DESC, ci.name ASC
    LIMIT ${candidatePool}
  `
}

async function loadExistingSystemIngredients(sql: postgres.Sql): Promise<SystemIngredientRow[]> {
  return sql<SystemIngredientRow[]>`
    SELECT id::text, name, slug
    FROM system_ingredients
    WHERE is_active = true
  `
}

async function insertPromotions(
  sql: postgres.Sql,
  promotions: PreparedPromotion[]
): Promise<Array<{ id: string; name: string; slug: string | null }>> {
  const inserted: Array<{ id: string; name: string; slug: string | null }> = []

  for (let index = 0; index < promotions.length; index += INSERT_BATCH_SIZE) {
    const batch = promotions.slice(index, index + INSERT_BATCH_SIZE)
    if (batch.length === 0) continue

    for (const { prepared } of batch) {
      const rows = await sql<Array<{ id: string; name: string; slug: string | null }>>`
        INSERT INTO system_ingredients (
          name,
          category,
          subcategory,
          unit_type,
          standard_unit,
          slug,
          aliases,
          is_active
        ) VALUES (
          ${prepared.name},
          ${prepared.category},
          '',
          ${prepared.unitType},
          ${prepared.standardUnit},
          ${prepared.slug},
          ${prepared.aliases},
          true
        )
        ON CONFLICT DO NOTHING
        RETURNING id::text, name, slug
      `

      if (rows[0]) inserted.push(rows[0])
    }
  }

  return inserted
}

async function backfillExactChefLinks(
  sql: postgres.Sql,
  targets: TrackedPromotion[]
): Promise<{ updatedSystemLinks: number; insertedAliases: number }> {
  const aliasToSystemIngredientId = uniqueAliasesForTargets(targets)
  const aliasKeys = [...aliasToSystemIngredientId.keys()]

  if (aliasKeys.length === 0) {
    return { updatedSystemLinks: 0, insertedAliases: 0 }
  }

  const chefIngredients = await sql<ChefIngredientRow[]>`
    SELECT
      i.id::text,
      i.tenant_id::text,
      i.name,
      i.system_ingredient_id::text,
      ia.id::text AS alias_id
    FROM ingredients i
    LEFT JOIN ingredient_aliases ia
      ON ia.tenant_id = i.tenant_id
     AND ia.ingredient_id = i.id
    WHERE i.archived = false
      AND LOWER(TRIM(i.name)) = ANY(${aliasKeys})
  `

  const systemLinkUpdates: Array<{ ingredientId: string; systemIngredientId: string }> = []
  const aliasInserts: Array<{
    tenant_id: string
    ingredient_id: string
    system_ingredient_id: string
    match_method: 'exact'
    similarity_score: number
    confirmed_at: Date
  }> = []
  const now = new Date()

  for (const ingredient of chefIngredients) {
    const aliasKey = ingredient.name.trim().toLowerCase()
    const targetId = aliasToSystemIngredientId.get(aliasKey)
    if (!targetId) continue
    if (ingredient.alias_id) continue
    if (ingredient.system_ingredient_id && ingredient.system_ingredient_id !== targetId) continue

    if (!ingredient.system_ingredient_id) {
      systemLinkUpdates.push({
        ingredientId: ingredient.id,
        systemIngredientId: targetId,
      })
    }

    aliasInserts.push({
      tenant_id: ingredient.tenant_id,
      ingredient_id: ingredient.id,
      system_ingredient_id: targetId,
      match_method: 'exact',
      similarity_score: 1,
      confirmed_at: now,
    })
  }

  let updatedSystemLinks = 0
  for (const row of systemLinkUpdates) {
    await sql`
      UPDATE ingredients
      SET system_ingredient_id = ${row.systemIngredientId}::uuid
      WHERE id = ${row.ingredientId}::uuid
        AND system_ingredient_id IS NULL
    `
    updatedSystemLinks += 1
  }

  let insertedAliases = 0
  for (let index = 0; index < aliasInserts.length; index += INSERT_BATCH_SIZE) {
    const batch = aliasInserts.slice(index, index + INSERT_BATCH_SIZE)
    if (batch.length === 0) continue

    const result = await sql`
      INSERT INTO ingredient_aliases
        ${sql(
          batch,
          'tenant_id',
          'ingredient_id',
          'system_ingredient_id',
          'match_method',
          'similarity_score',
          'confirmed_at'
        )}
      ON CONFLICT (tenant_id, ingredient_id) DO NOTHING
    `
    insertedAliases += Number(result.count || 0)
  }

  return { updatedSystemLinks, insertedAliases }
}

async function loadSystemIngredientStatuses(
  sql: postgres.Sql,
  ids: string[]
): Promise<SystemIngredientStatusRow[]> {
  if (ids.length === 0) return []

  return sql<SystemIngredientStatusRow[]>`
    SELECT
      si.id::text AS id,
      EXISTS (
        SELECT 1
        FROM openclaw.system_ingredient_prices sip
        WHERE sip.system_ingredient_id = si.id
          AND COALESCE(sip.median_price_cents, sip.avg_price_cents) > 0
      ) AS has_market_price,
      EXISTS (
        SELECT 1
        FROM ingredient_knowledge k
        WHERE k.system_ingredient_id = si.id
          AND k.needs_review = false
          AND k.wiki_summary IS NOT NULL
      ) AS has_documentation
    FROM system_ingredients si
    WHERE si.id = ANY(${ids})
  `
}

async function main() {
  const requestedLimit = parsePositiveInt(readArg('--limit') ?? undefined, DEFAULT_LIMIT)
  const candidatePool = parsePositiveInt(readArg('--pool') ?? undefined, DEFAULT_POOL)
  const sql = postgres(DATABASE_URL, { max: 4, idle_timeout: 20 })

  console.log('=== OpenClaw Food Promotion ===')
  console.log(`Promotion limit: ${requestedLimit}`)
  console.log(`Candidate pool: ${candidatePool}`)

  try {
    const [candidateRows, existingRows] = await Promise.all([
      loadCanonicalCandidates(sql, candidatePool),
      loadExistingSystemIngredients(sql),
    ])

    const existingByKey = new Map<string, SystemIngredientRow>()
    const existingBySlug = new Map<string, SystemIngredientRow>()

    for (const row of existingRows) {
      existingByKey.set(normalizeFoodLookupKey(row.name), row)
      if (row.slug) existingBySlug.set(row.slug, row)
    }

    const promotions: PreparedPromotion[] = []
    const trackedBySystemIngredientId = new Map<string, TrackedPromotion>()
    const seenPlannedKeys = new Set<string>()
    const seenPlannedSlugs = new Set<string>()

    let scanned = 0
    let skippedNonPromotable = 0
    let matchedExisting = 0

    for (const row of candidateRows) {
      scanned += 1
      const input = buildCandidateInput(row)
      const readiness = evaluateCanonicalFoodReadiness(input)

      if (!readiness.promotable) {
        skippedNonPromotable += 1
        continue
      }

      const lookupKey = normalizeFoodLookupKey(row.name)
      const existing =
        existingByKey.get(lookupKey) ?? existingBySlug.get(readiness.systemIngredient.slug)

      if (existing) {
        matchedExisting += 1
        if (!trackedBySystemIngredientId.has(existing.id)) {
          trackedBySystemIngredientId.set(existing.id, {
            input,
            systemIngredientId: existing.id,
            systemIngredientName: existing.name,
            aliases: buildFoodAliases(existing.name),
          })
        }
        continue
      }

      if (seenPlannedKeys.has(lookupKey) || seenPlannedSlugs.has(readiness.systemIngredient.slug)) {
        continue
      }

      promotions.push({
        input,
        prepared: readiness.systemIngredient,
      })
      seenPlannedKeys.add(lookupKey)
      seenPlannedSlugs.add(readiness.systemIngredient.slug)

      if (promotions.length >= requestedLimit) {
        break
      }
    }

    const insertedRows = await insertPromotions(sql, promotions)
    const plannedByLookup = new Map<string, PreparedPromotion>()
    const plannedBySlug = new Map<string, PreparedPromotion>()
    for (const promotion of promotions) {
      plannedByLookup.set(normalizeFoodLookupKey(promotion.prepared.name), promotion)
      plannedBySlug.set(promotion.prepared.slug, promotion)
    }

    for (const row of insertedRows) {
      const planned =
        (row.slug ? plannedBySlug.get(row.slug) : null) ??
        plannedByLookup.get(normalizeFoodLookupKey(row.name))
      if (!planned) continue

      trackedBySystemIngredientId.set(row.id, {
        input: planned.input,
        systemIngredientId: row.id,
        systemIngredientName: row.name,
        aliases: planned.prepared.aliases,
      })
    }

    const trackedTargets = [...trackedBySystemIngredientId.values()]
    const exactLinkResult = await backfillExactChefLinks(sql, trackedTargets)
    const statuses = await loadSystemIngredientStatuses(
      sql,
      trackedTargets.map((target) => target.systemIngredientId)
    )
    const statusById = new Map(statuses.map((row) => [row.id, row]))

    let chefFlowReady = 0
    let fullyReady = 0
    let missingPricing = 0
    let missingDocumentation = 0

    for (const target of trackedTargets) {
      const status = statusById.get(target.systemIngredientId)
      const readiness = evaluateCanonicalFoodReadiness({
        ...target.input,
        hasCatalogFoodMatch: true,
        hasMarketPrice: status?.has_market_price === true,
        hasDocumentation: status?.has_documentation === true,
      })

      if (readiness.chefFlowReady) chefFlowReady += 1
      if (readiness.fullyReady) fullyReady += 1
      if (!readiness.hasMarketPrice) missingPricing += 1
      if (!readiness.hasDocumentation) missingDocumentation += 1
    }

    console.log('')
    console.log('Summary')
    console.log(`  canonical candidates scanned: ${scanned}`)
    console.log(`  promotable candidates selected: ${promotions.length}`)
    console.log(`  already in system_ingredients: ${matchedExisting}`)
    console.log(`  new system_ingredients inserted: ${insertedRows.length}`)
    console.log(
      `  exact ingredient.system_ingredient_id backfills: ${exactLinkResult.updatedSystemLinks}`
    )
    console.log(`  exact ingredient_aliases inserted: ${exactLinkResult.insertedAliases}`)
    console.log(`  tracked promoted/existing foods: ${trackedTargets.length}`)
    console.log(`  Chef Flow ready now: ${chefFlowReady}`)
    console.log(`  fully documented + priced now: ${fullyReady}`)
    console.log(`  missing market price: ${missingPricing}`)
    console.log(`  missing documentation: ${missingDocumentation}`)
    console.log(`  skipped by food-readiness policy: ${skippedNonPromotable}`)
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('[openclaw-promote-foods] Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
})
