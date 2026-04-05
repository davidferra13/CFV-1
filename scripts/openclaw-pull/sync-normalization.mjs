#!/usr/bin/env node

/**
 * Sync normalization mappings and auto-link chef ingredients.
 *
 * 1. Copies Pi's normalization_map to openclaw.normalization_map (for reference)
 * 2. Auto-creates ingredient_aliases linking chef ingredients to system_ingredients
 *    via trigram similarity matching
 *
 * Run after pull.mjs.
 */

import postgres from 'postgres'
import config from './config.mjs'

let Database
try {
  const mod = await import('better-sqlite3')
  Database = mod.default
} catch {
  console.error('[sync-norm] better-sqlite3 not available.')
  process.exit(1)
}

const BATCH_SIZE = 500
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

// Pi's Ollama endpoint for embeddings
const OLLAMA_URL = `http://${config.pi.host}:11434`

/**
 * Get embedding vector from Pi's Ollama (nomic-embed-text model)
 */
async function getEmbedding(text) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.embedding
  } catch {
    return null
  }
}

/**
 * Cosine similarity between two vectors
 */
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// Cache of system ingredient embeddings (built lazily)
let _systemEmbeddingsCache = null

/**
 * Semantic search: find best system_ingredient match using embeddings.
 * Falls back gracefully if Ollama is unavailable.
 */
async function semanticSearch(sql, ingredientName) {
  // Get embedding for the query ingredient
  const queryEmb = await getEmbedding(ingredientName)
  if (!queryEmb) return null

  // Build cache of system ingredient embeddings (first call only)
  if (!_systemEmbeddingsCache) {
    log('  Building semantic embedding cache (first use)...')
    const sysIngredients = await sql`
      SELECT id, name FROM system_ingredients
      ORDER BY name LIMIT 2000
    `
    _systemEmbeddingsCache = []
    // Batch embed in groups of 10 to avoid overwhelming Ollama
    for (let i = 0; i < sysIngredients.length; i += 10) {
      const batch = sysIngredients.slice(i, i + 10)
      const results = await Promise.all(
        batch.map(async (si) => {
          const emb = await getEmbedding(si.name)
          return emb ? { id: si.id, name: si.name, embedding: emb } : null
        })
      )
      _systemEmbeddingsCache.push(...results.filter(Boolean))
    }
    log(`  Cached ${_systemEmbeddingsCache.length} system ingredient embeddings`)
  }

  // Find best cosine similarity match
  let bestMatch = null
  let bestScore = 0
  for (const si of _systemEmbeddingsCache) {
    const score = cosineSim(queryEmb, si.embedding)
    if (score > bestScore) {
      bestScore = score
      bestMatch = si
    }
  }

  // Only accept matches above 0.75 cosine similarity
  if (bestMatch && bestScore >= 0.75) {
    return { id: bestMatch.id, name: bestMatch.name, score: Math.round(bestScore * 100) / 100 }
  }

  return null
}

async function main() {
  const sql = postgres(config.pg.connectionString)
  const dbPath = `${config.tempDir}/openclaw-latest.db`
  const sqlite = new Database(dbPath, { readonly: true })

  log('=== Normalization Map Sync ===')

  // ── Step 1: Create normalization_map table in PG ───────────────────────
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS openclaw.normalization_map (
      raw_name TEXT PRIMARY KEY,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      method TEXT,
      confidence NUMERIC(3,2),
      confirmed BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_oc_norm_canonical
    ON openclaw.normalization_map(canonical_ingredient_id)
  `)
  log('normalization_map table ready')

  // ── Step 2: Sync normalization_map from SQLite ─────────────────────────
  const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM normalization_map').get().cnt
  log(`Found ${total} normalization mappings in SQLite`)

  let synced = 0
  let offset = 0

  while (offset < total) {
    const rows = sqlite
      .prepare(`SELECT * FROM normalization_map LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
      .all()

    for (const row of rows) {
      try {
        await sql`
          INSERT INTO openclaw.normalization_map (
            raw_name, canonical_ingredient_id, variant_id, method, confidence, confirmed
          ) VALUES (
            ${row.raw_name}, ${row.canonical_ingredient_id},
            ${row.variant_id}, ${row.method},
            ${row.confidence}, ${row.confirmed === 1}
          )
          ON CONFLICT (raw_name) DO UPDATE SET
            canonical_ingredient_id = EXCLUDED.canonical_ingredient_id,
            variant_id = EXCLUDED.variant_id,
            method = EXCLUDED.method,
            confidence = EXCLUDED.confidence,
            confirmed = EXCLUDED.confirmed
        `
        synced++
      } catch (err) { /* skip bad rows */ }
    }

    offset += BATCH_SIZE
    if (offset % 5000 === 0) log(`  Norm map: ${offset}/${total}...`)
  }
  log(`Synced ${synced} normalization mappings`)

  // ── Step 3: Auto-link chef ingredients to system_ingredients ───────────
  // system_ingredients uses UUID PKs and has 5,435 curated entries.
  // Match chef ingredients by trigram similarity.

  // Ensure pg_trgm is accessible (installed in extensions schema)
  try {
    await sql.unsafe('SET search_path TO public, extensions')
    const test = await sql`SELECT similarity('test', 'test') as sim`
    log('pg_trgm ready (similarity=' + test[0].sim + ')')
  } catch (err) {
    log('WARN: pg_trgm not available: ' + err.message)
  }

  // Get chef ingredients that don't have an alias yet
  const chefIngredients = await sql`
    SELECT i.id, i.name, i.tenant_id
    FROM ingredients i
    WHERE NOT EXISTS (
      SELECT 1 FROM ingredient_aliases ia
      WHERE ia.ingredient_id = i.id AND ia.match_method != 'dismissed'
    )
  `
  log(`Chef ingredients without aliases: ${chefIngredients.length}`)

  let aliasesCreated = 0

  for (const ing of chefIngredients) {
    // Strip recipe context in brackets, e.g. "Honey [Pistachio Baklava...]" -> "Honey"
    const stripped = ing.name.replace(/\s*\[.*?\]\s*$/, '')
    const cleanName = stripped.trim().toLowerCase()

    try {
      // Trigram similarity match against system_ingredients
      const match = await sql`
        SELECT id, name,
          similarity(LOWER(name), ${cleanName}) as sim
        FROM system_ingredients
        WHERE similarity(LOWER(name), ${cleanName}) > 0.3
        ORDER BY sim DESC
        LIMIT 1
      `

      if (match.length > 0) {
        const method = match[0].sim >= 0.8 ? 'exact' : 'trigram'
        await sql`
          INSERT INTO ingredient_aliases (
            id, tenant_id, ingredient_id, system_ingredient_id,
            match_method, similarity_score, confirmed_at, created_at
          ) VALUES (
            gen_random_uuid(), ${ing.tenant_id}, ${ing.id}, ${match[0].id},
            ${method}, ${Math.round(match[0].sim * 100) / 100}, NULL, now()
          )
          ON CONFLICT (tenant_id, ingredient_id) DO NOTHING
        `
        aliasesCreated++
        if (aliasesCreated <= 10) {
          log(`  "${ing.name}" -> "${match[0].name}" (${(match[0].sim * 100).toFixed(0)}%)`)
        }
      } else {
        // Semantic fallback: use embedding similarity via Pi's Ollama
        const semanticMatch = await semanticSearch(sql, cleanName)
        if (semanticMatch) {
          await sql`
            INSERT INTO ingredient_aliases (
              id, tenant_id, ingredient_id, system_ingredient_id,
              match_method, similarity_score, confirmed_at, created_at
            ) VALUES (
              gen_random_uuid(), ${ing.tenant_id}, ${ing.id}, ${semanticMatch.id},
              'semantic', ${semanticMatch.score}, NULL, now()
            )
            ON CONFLICT (tenant_id, ingredient_id) DO NOTHING
          `
          aliasesCreated++
          log(`  "${ing.name}" -> "${semanticMatch.name}" (semantic, ${(semanticMatch.score * 100).toFixed(0)}%)`)
        } else {
          log(`  No match for "${ing.name}"`)
        }
      }
    } catch (err) {
      log(`  Error matching "${ing.name}": ${err.message.substring(0, 80)}`)
    }
  }

  log(`Created ${aliasesCreated} ingredient aliases`)

  // ── Step 4: Summary ────────────────────────────────────────────────────
  const finalAliases = await sql`SELECT COUNT(*) as cnt FROM ingredient_aliases`
  const finalNorm = await sql`SELECT COUNT(*) as cnt FROM openclaw.normalization_map`
  const totalIngs = await sql`SELECT COUNT(*) as cnt FROM ingredients`
  const unmatched = await sql`
    SELECT COUNT(*) as cnt FROM ingredients i
    WHERE NOT EXISTS (
      SELECT 1 FROM ingredient_aliases ia WHERE ia.ingredient_id = i.id
    )
  `

  log('\n=== Final State ===')
  log(`Normalization mappings:  ${finalNorm[0].cnt}`)
  log(`Ingredient aliases:      ${finalAliases[0].cnt} / ${totalIngs[0].cnt} ingredients`)
  log(`Unmatched ingredients:   ${unmatched[0].cnt}`)
  log(`Mapping coverage:        ${((1 - unmatched[0].cnt / totalIngs[0].cnt) * 100).toFixed(1)}%`)

  sqlite.close()
  await sql.end()
}

main().catch((err) => {
  console.error('[sync-norm] Fatal:', err.message)
  process.exit(1)
})
