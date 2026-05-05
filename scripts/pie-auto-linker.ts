/**
 * PIE Auto-Linker
 *
 * Populates ingredient_aliases by matching chef ingredients to system_ingredients.
 * Three-pass strategy:
 *   Pass 1: Exact match (LOWER(name) = LOWER(system.name))
 *   Pass 2: Normalized match (normalizeIngredientName on both sides)
 *   Pass 3: Trigram similarity (pg_trgm, threshold 0.45)
 *
 * Runs per-tenant. Skips ingredients that already have an alias.
 * Uses batch INSERTs (1000 rows at a time) for performance.
 *
 * Usage: npx tsx scripts/pie-auto-linker.ts [--dry-run] [--tenant <id>]
 */

import postgres from 'postgres'

// Inlined from lib/pricing/name-normalizer.ts to avoid ESM resolution issues
function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().trim()
  const prefixPattern =
    /^(fresh|organic|homemade|dried|frozen|canned|raw|cooked|roasted|grilled|steamed|boiled|fried|baked|smoked|pickled|marinated|minced|diced|chopped|sliced|shredded|grated|crushed|ground|whole|large|medium|small|extra|fine|coarse|thick|thin|boneless|skinless|trimmed|peeled|deveined|pitted|seeded|hulled|toasted|blanched|unsweetened|sweetened|salted|unsalted)\s+/
  for (let i = 0; i < 5; i++) {
    const stripped = n.replace(prefixPattern, '')
    if (stripped === n) break
    n = stripped
  }
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ')
  n = n.replace(/\s*\[[^\]]*\]\s*/g, ' ')
  n = n.replace(/\s+/g, ' ').trim()
  n = n.replace(/,\s*(brand|store|generic|organic|local|imported|domestic).*$/i, '')
  return n.trim()
}

const DRY_RUN = process.argv.includes('--dry-run')
const TENANT_FLAG = process.argv.indexOf('--tenant')
const SPECIFIC_TENANT = TENANT_FLAG >= 0 ? process.argv[TENANT_FLAG + 1] : null

const BATCH_SIZE = 1000
const TRIGRAM_THRESHOLD = 0.45

const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
)

interface SystemIngredient {
  id: string
  name: string
  normalized: string
}

async function loadSystemIngredients(): Promise<SystemIngredient[]> {
  const rows = await sql`SELECT id, name FROM system_ingredients`
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    normalized: normalizeIngredientName(r.name),
  }))
}

async function getTenants(): Promise<string[]> {
  if (SPECIFIC_TENANT) return [SPECIFIC_TENANT]
  const rows = await sql`SELECT DISTINCT tenant_id FROM ingredients WHERE tenant_id IS NOT NULL`
  return rows.map((r) => r.tenant_id)
}

async function getUnlinkedIngredients(
  tenantId: string
): Promise<Array<{ id: string; name: string }>> {
  return await sql`
    SELECT i.id, i.name
    FROM ingredients i
    WHERE i.tenant_id = ${tenantId}
      AND NOT EXISTS (
        SELECT 1 FROM ingredient_aliases ia
        WHERE ia.ingredient_id = i.id AND ia.tenant_id = ${tenantId}
      )
  `
}

async function insertAliases(
  aliases: Array<{
    tenantId: string
    ingredientId: string
    systemId: string
    method: string
    score: number | null
  }>
): Promise<number> {
  if (aliases.length === 0) return 0
  if (DRY_RUN) return aliases.length

  let inserted = 0
  for (let i = 0; i < aliases.length; i += BATCH_SIZE) {
    const batch = aliases.slice(i, i + BATCH_SIZE)
    const values = batch.map((a) => ({
      tenant_id: a.tenantId,
      ingredient_id: a.ingredientId,
      system_ingredient_id: a.systemId,
      match_method: a.method,
      similarity_score: a.score,
      confirmed_at: sql`now()`,
      confirmed_by: null,
    }))

    await sql`
      INSERT INTO ingredient_aliases ${sql(values, 'tenant_id', 'ingredient_id', 'system_ingredient_id', 'match_method', 'similarity_score', 'confirmed_at', 'confirmed_by')}
      ON CONFLICT (tenant_id, ingredient_id) DO NOTHING
    `
    inserted += batch.length
  }
  return inserted
}

async function run() {
  console.log(`PIE Auto-Linker${DRY_RUN ? ' [DRY RUN]' : ''}`)
  console.log('Loading system ingredients...')
  const systemIngredients = await loadSystemIngredients()
  console.log(`  ${systemIngredients.length} system ingredients loaded`)

  // Build lookup maps
  const exactMap = new Map<string, string>() // lowercase name -> system id
  const normalizedMap = new Map<string, string>() // normalized name -> system id
  for (const si of systemIngredients) {
    const lower = si.name.toLowerCase().trim()
    if (!exactMap.has(lower)) exactMap.set(lower, si.id)
    if (si.normalized && !normalizedMap.has(si.normalized)) {
      normalizedMap.set(si.normalized, si.id)
    }
  }
  console.log(`  Exact lookup: ${exactMap.size} entries`)
  console.log(`  Normalized lookup: ${normalizedMap.size} entries`)

  const tenants = await getTenants()
  console.log(`\nProcessing ${tenants.length} tenants...`)

  let totalExact = 0
  let totalNormalized = 0
  let totalTrigram = 0
  let totalSkipped = 0

  for (const tenantId of tenants) {
    const unlinked = await getUnlinkedIngredients(tenantId)
    if (unlinked.length === 0) {
      console.log(`  Tenant ${tenantId.slice(0, 8)}: no unlinked ingredients`)
      continue
    }

    console.log(`  Tenant ${tenantId.slice(0, 8)}: ${unlinked.length} unlinked ingredients`)

    const exactMatches: Array<{
      tenantId: string
      ingredientId: string
      systemId: string
      method: string
      score: number | null
    }> = []
    const normalizedMatches: Array<{
      tenantId: string
      ingredientId: string
      systemId: string
      method: string
      score: number | null
    }> = []
    const needTrigram: Array<{ id: string; name: string }> = []

    // Pass 1 & 2: Exact and normalized matching (in-memory, fast)
    for (const ing of unlinked) {
      const lower = ing.name.toLowerCase().trim()
      const exactId = exactMap.get(lower)
      if (exactId) {
        exactMatches.push({
          tenantId,
          ingredientId: ing.id,
          systemId: exactId,
          method: 'exact',
          score: 1.0,
        })
        continue
      }

      const normalized = normalizeIngredientName(ing.name)
      const normId = normalizedMap.get(normalized)
      if (normId) {
        normalizedMatches.push({
          tenantId,
          ingredientId: ing.id,
          systemId: normId,
          method: 'trigram', // Using 'trigram' since schema CHECK only allows manual/trigram/exact/dismissed
          score: 0.9, // High score for normalized match
        })
        continue
      }

      needTrigram.push(ing)
    }

    // Insert exact + normalized matches
    const exactInserted = await insertAliases(exactMatches)
    const normInserted = await insertAliases(normalizedMatches)
    totalExact += exactInserted
    totalNormalized += normInserted

    // Pass 3: Trigram matching via PostgreSQL (batched to avoid timeout)
    let trigramInserted = 0
    if (needTrigram.length > 0) {
      console.log(`    Trigram matching ${needTrigram.length} remaining...`)

      // Process in chunks to avoid massive queries
      const TRIGRAM_BATCH = 500
      for (let i = 0; i < needTrigram.length; i += TRIGRAM_BATCH) {
        const chunk = needTrigram.slice(i, i + TRIGRAM_BATCH)
        const names = chunk.map((c) => normalizeIngredientName(c.name))

        // Use pg_trgm to find best match for each ingredient
        const matches = await sql`
          WITH inputs AS (
            SELECT unnest(${names}::text[]) AS norm_name,
                   unnest(${chunk.map((c) => c.id)}::uuid[]) AS ingredient_id
          )
          SELECT DISTINCT ON (i.ingredient_id)
            i.ingredient_id,
            si.id AS system_id,
            similarity(i.norm_name, LOWER(si.name)) AS score
          FROM inputs i
          CROSS JOIN LATERAL (
            SELECT id, name
            FROM system_ingredients
            WHERE similarity(i.norm_name, LOWER(name)) > ${TRIGRAM_THRESHOLD}
            ORDER BY similarity(i.norm_name, LOWER(name)) DESC
            LIMIT 1
          ) si
          ORDER BY i.ingredient_id, score DESC
        `

        const trigramAliases = matches.map((m) => ({
          tenantId,
          ingredientId: m.ingredient_id,
          systemId: m.system_id,
          method: 'trigram' as const,
          score: parseFloat(m.score),
        }))

        const count = await insertAliases(trigramAliases)
        trigramInserted += count
      }
    }

    totalTrigram += trigramInserted
    totalSkipped += needTrigram.length - trigramInserted

    console.log(
      `    Results: exact=${exactInserted} normalized=${normInserted} trigram=${trigramInserted} unmatched=${needTrigram.length - trigramInserted}`
    )
  }

  console.log(`\n=== FINAL RESULTS${DRY_RUN ? ' (DRY RUN)' : ''} ===`)
  console.log(`Exact matches:      ${totalExact}`)
  console.log(`Normalized matches: ${totalNormalized}`)
  console.log(`Trigram matches:    ${totalTrigram}`)
  console.log(`Total linked:       ${totalExact + totalNormalized + totalTrigram}`)
  console.log(`Unmatched:          ${totalSkipped}`)

  await sql.end()
}

run().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
