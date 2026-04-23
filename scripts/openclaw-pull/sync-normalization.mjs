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

// Pi's Ollama endpoint for local Gemma 4 matching
const OLLAMA_URL = `http://${config.pi.host}:11434`
const GEMMA_MODEL = process.env.OPENCLAW_LOCAL_MODEL || process.env.OLLAMA_MODEL || 'gemma4'
const GEMMA_KEEP_ALIVE = process.env.OPENCLAW_OLLAMA_KEEP_ALIVE || '30m'
const MATCH_CONCURRENCY = parsePositiveInt(process.env.OPENCLAW_MATCH_CONCURRENCY, 8)
const GEMMA_SHORTLIST_SIZE = parsePositiveInt(process.env.OPENCLAW_GEMMA_SHORTLIST_SIZE, 12)
const TRIGRAM_EXACT_THRESHOLD = parseFloat(process.env.OPENCLAW_TRIGRAM_EXACT_THRESHOLD || '0.8')
const TRIGRAM_SHORTLIST_THRESHOLD = parseFloat(process.env.OPENCLAW_TRIGRAM_SHORTLIST_THRESHOLD || '0.18')
const GEMMA_MIN_CONFIDENCE = parseFloat(process.env.OPENCLAW_GEMMA_MIN_CONFIDENCE || '0.7')

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function chunk(items, size) {
  const batches = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

/**
 * Build a deterministic shortlist, then let Gemma 4 decide whether
 * any candidate is actually the same ingredient.
 */
async function getCandidateShortlist(sql, ingredientName) {
  let candidates = await sql`
    SELECT
      id,
      name,
      extensions.similarity(LOWER(name), ${ingredientName}) AS sim
    FROM system_ingredients
    WHERE extensions.similarity(LOWER(name), ${ingredientName}) > ${TRIGRAM_SHORTLIST_THRESHOLD}
    ORDER BY sim DESC, name ASC
    LIMIT ${GEMMA_SHORTLIST_SIZE}
  `

  if (candidates.length === 0) {
    candidates = await sql`
      SELECT
        id,
        name,
        extensions.similarity(LOWER(name), ${ingredientName}) AS sim
      FROM system_ingredients
      ORDER BY sim DESC, name ASC
      LIMIT ${GEMMA_SHORTLIST_SIZE}
    `
  }

  return candidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    sim: Number(candidate.sim || 0),
  }))
}

async function reviewShortlistWithGemma(ingredientName, candidates) {
  if (candidates.length === 0) return null

  const prompt = [
    'You are matching a chef ingredient name to a curated canonical ingredient shortlist.',
    'Choose exactly one candidate only if it is clearly the same ingredient.',
    'If none are a strong match, return null.',
    'Do not generalize across different foods, cuts, species, or substitutes.',
    'Respond with JSON only in this exact shape:',
    '{"matchId": "candidate-id-or-null", "confidence": 0.0, "reason": "short reason"}',
    '',
    `Ingredient: ${ingredientName}`,
    'Candidates:',
    ...candidates.map((candidate, index) => (
      `${index + 1}. id=${candidate.id}; name=${candidate.name}; trigram=${candidate.sim.toFixed(2)}`
    )),
  ].join('\n')

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        prompt,
        stream: false,
        keep_alive: GEMMA_KEEP_ALIVE,
        options: { temperature: 0, num_predict: 180 },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const parsed = extractJsonObject(data.response || '')
    if (!parsed) return null

    const confidence = Number(parsed.confidence || 0)
    const matchId = typeof parsed.matchId === 'string' ? parsed.matchId : null
    if (!matchId) return null

    const selected = candidates.find((candidate) => candidate.id === matchId)
    if (!selected) return null

    return {
      id: selected.id,
      name: selected.name,
      confidence,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    }
  } catch {
    return null
  }
}

async function createAlias(sql, ingredient, systemIngredientId, method, score) {
  await sql`
    INSERT INTO ingredient_aliases (
      id, tenant_id, ingredient_id, system_ingredient_id,
      match_method, similarity_score, confirmed_at, created_at
    ) VALUES (
      gen_random_uuid(), ${ingredient.tenant_id}, ${ingredient.id}, ${systemIngredientId},
      ${method}, ${score}, NULL, now()
    )
    ON CONFLICT (tenant_id, ingredient_id) DO NOTHING
  `
}

async function processIngredient(sql, ingredient) {
  const stripped = ingredient.name.replace(/\s*\[.*?\]\s*$/, '')
  const cleanName = stripped.trim().toLowerCase()
  const candidates = await getCandidateShortlist(sql, cleanName)
  const bestCandidate = candidates[0] || null

  if (bestCandidate && bestCandidate.sim >= TRIGRAM_EXACT_THRESHOLD) {
    const method = bestCandidate.sim >= 0.95 ? 'exact' : 'trigram'
    const score = Math.round(bestCandidate.sim * 100) / 100
    await createAlias(sql, ingredient, bestCandidate.id, method, score)
    return {
      outcome: 'matched',
      message: `  "${ingredient.name}" -> "${bestCandidate.name}" (${(score * 100).toFixed(0)}%)`,
    }
  }

  const gemmaMatch = await reviewShortlistWithGemma(cleanName, candidates)
  if (gemmaMatch && gemmaMatch.confidence >= GEMMA_MIN_CONFIDENCE) {
    const score = Math.round(gemmaMatch.confidence * 100) / 100
    await createAlias(sql, ingredient, gemmaMatch.id, 'semantic', score)
    return {
      outcome: 'matched',
      message: `  "${ingredient.name}" -> "${gemmaMatch.name}" (gemma, ${(score * 100).toFixed(0)}%)`,
    }
  }

  return {
    outcome: 'unmatched',
    message: `  No match for "${ingredient.name}"`,
  }
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
  // The normalization_map table was added to the Pi schema in April 2026.
  // Older SQLite snapshots won't have it - skip gracefully.
  const hasNormTable = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='normalization_map'`
  ).get()
  if (!hasNormTable) {
    log('normalization_map table not in SQLite snapshot - skipping (old snapshot or pull failed)')
    sqlite.close()
    await sql.end()
    process.exit(0)
  }

  const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM normalization_map').get().cnt
  log(`Found ${total} normalization mappings in SQLite`)

  let synced = 0
  let offset = 0

  while (offset < total) {
    const rows = sqlite
      .prepare(`SELECT * FROM normalization_map LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
      .all()

    await Promise.all(rows.map(async (row) => {
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
    }))

    offset += BATCH_SIZE
    if (offset % 5000 === 0) log(`  Norm map: ${offset}/${total}...`)
  }
  log(`Synced ${synced} normalization mappings`)

  // ── Step 3: Auto-link chef ingredients to system_ingredients ───────────
  // system_ingredients uses UUID PKs and has 5,435 curated entries.
  // Match chef ingredients by trigram similarity.

  // Ensure pg_trgm is accessible (installed in extensions schema)
  try {
    const test = await sql`SELECT extensions.similarity('test', 'test') as sim`
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

  for (const batch of chunk(chefIngredients, MATCH_CONCURRENCY)) {
    const results = await Promise.all(batch.map(async (ingredient) => {
      try {
        return await processIngredient(sql, ingredient)
      } catch (err) {
        return {
          outcome: 'error',
          message: `  Error matching "${ingredient.name}": ${err.message.substring(0, 80)}`,
        }
      }
    }))

    for (const result of results) {
      if (result.outcome === 'matched') aliasesCreated++
      log(result.message)
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
