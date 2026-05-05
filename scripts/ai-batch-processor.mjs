#!/usr/bin/env node
/**
 * AI Batch Processor - Continuous Ollama job runner for OpenClaw prices.db
 * Runs 5 AI enrichment jobs in round-robin, hammering local Gemma 4 e2b.
 * Deploy to: ~/openclaw-prices/services/ai-batch-processor.mjs
 */

import Database from 'better-sqlite3'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || resolve(__dirname, '..')
const DB_PATH = resolve(OPENCLAW_DIR, 'data', 'prices.db')
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const MAX_RETRIES = 3
const RETRY_BASE_MS = 3000
const SLEEP_ALL_DONE_MS = 60 * 60 * 1000
const TEMPERATURE = 0.1
const NUM_PREDICT = 500 // Gemma 4 thinking model needs room for reasoning tokens
const BATCH_PAUSE_MS = 200 // breathing room between items

let MODEL = 'gemma4:e2b-it-q4_K_M'

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)
const logJob = (n, msg) => log(`[Job ${n}] ${msg}`)

// ---------------------------------------------------------------------------
// Ollama
// ---------------------------------------------------------------------------

async function detectModel() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { models = [] } = await res.json()
    const names = models.map((m) => m.name)
    log(`Available models: ${names.join(', ')}`)
    // Prefer e2b (smaller, fits in RAM) over full gemma4
    const e2b = names.find((n) => n.includes('e2b'))
    const gemma4 = names.find((n) => n.startsWith('gemma4') && !n.includes('e2b'))
    const gemma3 = names.find((n) => n.startsWith('gemma3'))
    MODEL = e2b || gemma3 || gemma4 || names[0] || MODEL
    log(`Selected model: ${MODEL}`)
  } catch (err) {
    log(`WARNING: Could not list models (${err.message}). Using ${MODEL}`)
  }
}

async function askOllama(prompt) {
  let lastErr
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)
      // Use chat API, not generate - Gemma 4 thinking model burns invisible
      // reasoning tokens in generate mode but chat extracts visible content
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          options: { temperature: TEMPERATURE, num_predict: NUM_PREDICT },
        }),
      })
      clearTimeout(timeout)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const data = await res.json()
      // Gemma 4 e2b returns thinking in message.thinking and answer in
      // message.content. Sometimes content is empty and answer is at the
      // end of the thinking block. Extract from whichever has content.
      let answer = (data.message?.content || '').trim()
      if (!answer && data.message?.thinking) {
        // Pull last non-empty line from thinking as the answer
        const lines = data.message.thinking.trim().split('\n').filter(Boolean)
        answer = (lines[lines.length - 1] || '').replace(/^[\s*-]+/, '').trim()
      }
      if (!answer) throw new Error('Empty response')
      return answer
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1)
        log(`Ollama error (${attempt}/${MAX_RETRIES}): ${err.message}. Retry in ${delay}ms`)
        await sleep(delay)
      }
    }
  }
  throw lastErr
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

function openDb() {
  const db = new Database(DB_PATH, { readonly: false })
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 10000')
  return db
}

function tableExists(db, table) {
  return db.prepare(`SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name=?`).get(table).c > 0
}

function columnExists(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)
}

function ensureColumn(db, table, column, type = 'TEXT') {
  if (!columnExists(db, table, column)) {
    log(`Adding column ${table}.${column} (${type})`)
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}

// ---------------------------------------------------------------------------
// Job definitions (CORRECT table names from prices.db schema)
// ---------------------------------------------------------------------------

function buildJobs(db) {
  const jobs = []

  // Job 1: Ingredient Name Normalization
  // Table: canonical_ingredients (ingredient_id, name, category, ...)
  if (tableExists(db, 'canonical_ingredients')) {
    ensureColumn(db, 'canonical_ingredients', 'ai_normalized')
    jobs.push({
      id: 1,
      name: 'Ingredient Normalization',
      query: `SELECT ingredient_id as id, name FROM canonical_ingredients WHERE ai_normalized IS NULL LIMIT 50`,
      countQuery: `SELECT count(*) as c FROM canonical_ingredients WHERE ai_normalized IS NULL`,
      update: db.prepare(`UPDATE canonical_ingredients SET ai_normalized = ? WHERE ingredient_id = ?`),
      buildPrompt: (row) =>
        `Normalize this grocery ingredient to a clean, singular, lowercase form. Remove brands, sizes, quantities. Reply with ONLY the normalized name. Input: ${row.name}`,
      extractResult: (answer) => answer.toLowerCase().replace(/[^a-z0-9 _-]/g, '').trim(),
    })
  }

  // Job 2: Product Category Classification
  // Table: catalog_products (id, name, brand, category, department, ...)
  if (tableExists(db, 'catalog_products')) {
    ensureColumn(db, 'catalog_products', 'ai_category')
    const validCats = new Set([
      'produce', 'meat', 'seafood', 'dairy', 'bakery', 'frozen', 'canned',
      'dry_goods', 'beverages', 'snacks', 'condiments', 'spices',
      'household', 'personal_care', 'other',
    ])
    jobs.push({
      id: 2,
      name: 'Product Classification',
      query: `SELECT id, name FROM catalog_products WHERE ai_category IS NULL AND is_food = 1 LIMIT 50`,
      countQuery: `SELECT count(*) as c FROM catalog_products WHERE ai_category IS NULL AND is_food = 1`,
      update: db.prepare(`UPDATE catalog_products SET ai_category = ? WHERE id = ?`),
      buildPrompt: (row) =>
        `Classify this grocery product into ONE category: produce, meat, seafood, dairy, bakery, frozen, canned, dry_goods, beverages, snacks, condiments, spices, household, personal_care, other. Reply ONLY the category. Product: ${row.name}`,
      extractResult: (answer) => {
        const c = answer.toLowerCase().replace(/[^a-z_]/g, '').trim()
        return validCats.has(c) ? c : 'other'
      },
    })
  }

  // Job 3: Price Anomaly Descriptions
  // Table: price_anomalies (id, canonical_ingredient_id, anomaly_type, ...)
  // Join: canonical_ingredients on ingredient_id
  if (tableExists(db, 'price_anomalies') && tableExists(db, 'canonical_ingredients')) {
    ensureColumn(db, 'price_anomalies', 'ai_description')
    jobs.push({
      id: 3,
      name: 'Anomaly Descriptions',
      query: `SELECT a.id, a.anomaly_type, a.change_pct, i.name
              FROM price_anomalies a
              JOIN canonical_ingredients i ON a.canonical_ingredient_id = i.ingredient_id
              WHERE a.ai_description IS NULL LIMIT 20`,
      countQuery: `SELECT count(*) as c FROM price_anomalies WHERE ai_description IS NULL`,
      update: db.prepare(`UPDATE price_anomalies SET ai_description = ? WHERE id = ?`),
      buildPrompt: (row) =>
        `One sentence: explain this price anomaly for a chef. ${row.name} had a ${row.anomaly_type} (${row.change_pct ? row.change_pct.toFixed(1) + '%' : 'unknown'} change). Why might this happen?`,
      extractResult: (answer) => answer.split('\n')[0].trim().slice(0, 500),
    })
  }

  // Job 4: Store Descriptions
  // Table: catalog_stores (id, chain_slug, name, city, state, ...)
  // Also store_locations has store_type
  if (tableExists(db, 'catalog_stores')) {
    ensureColumn(db, 'catalog_stores', 'ai_description')
    jobs.push({
      id: 4,
      name: 'Store Descriptions',
      query: `SELECT id, name, chain_slug, city, state FROM catalog_stores WHERE ai_description IS NULL LIMIT 30`,
      countQuery: `SELECT count(*) as c FROM catalog_stores WHERE ai_description IS NULL`,
      update: db.prepare(`UPDATE catalog_stores SET ai_description = ? WHERE id = ?`),
      buildPrompt: (row) =>
        `In 10 words or less, describe this store for a chef: ${row.name} (${row.chain_slug || 'independent'}) in ${row.city || '?'}, ${row.state || '?'}`,
      extractResult: (answer) => answer.split('\n')[0].trim().slice(0, 200),
    })
  }

  // Job 5: Seasonal Tips
  // Table: synthesis_seasonal_scores (id, ingredient_id, ingredient_name, month, ...)
  if (tableExists(db, 'synthesis_seasonal_scores')) {
    ensureColumn(db, 'synthesis_seasonal_scores', 'ai_tip')
    jobs.push({
      id: 5,
      name: 'Seasonal Tips',
      query: `SELECT id, ingredient_name as name, month, availability_score as score
              FROM synthesis_seasonal_scores WHERE ai_tip IS NULL LIMIT 20`,
      countQuery: `SELECT count(*) as c FROM synthesis_seasonal_scores WHERE ai_tip IS NULL`,
      update: db.prepare(`UPDATE synthesis_seasonal_scores SET ai_tip = ? WHERE id = ?`),
      buildPrompt: (row) =>
        `One sentence chef tip about ${row.name} in month ${row.month} (availability: ${row.score}/100)`,
      extractResult: (answer) => answer.split('\n')[0].trim().slice(0, 500),
    })
  }

  return jobs
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runJobBatch(db, job) {
  const rows = db.prepare(job.query).all()
  if (!rows.length) return 0

  const remaining = db.prepare(job.countQuery).get().c
  logJob(job.id, `${job.name}: ${rows.length} items, ${remaining.toLocaleString()} remaining`)

  let processed = 0
  for (const row of rows) {
    try {
      const raw = await askOllama(job.buildPrompt(row))
      const result = job.extractResult(raw)
      if (result) {
        job.update.run(result, row.id)
        processed++
      }
    } catch (err) {
      logJob(job.id, `ERROR id=${row.id}: ${err.message}`)
      job.update.run(`[ERROR] ${err.message}`.slice(0, 200), row.id)
    }
    await sleep(BATCH_PAUSE_MS)
  }

  logJob(job.id, `Done: ${processed}/${rows.length}`)
  return processed
}

async function main() {
  log('=== AI Batch Processor starting ===')
  log(`DB: ${DB_PATH}`)
  await detectModel()

  const db = openDb()
  let jobs = buildJobs(db)

  if (!jobs.length) {
    log('No eligible tables found.')
    db.close()
    return
  }

  log(`${jobs.length} jobs initialized:`)
  for (const job of jobs) {
    const c = db.prepare(job.countQuery).get().c
    logJob(job.id, `${job.name}: ${c.toLocaleString()} pending`)
  }

  while (true) {
    let total = 0
    for (const job of jobs) {
      try {
        total += await runJobBatch(db, job)
      } catch (err) {
        logJob(job.id, `BATCH ERROR: ${err.message}`)
      }
    }
    if (total === 0) {
      log(`All jobs idle. Sleeping 60 min...`)
      await sleep(SLEEP_ALL_DONE_MS)
      jobs = buildJobs(db)
    } else {
      await sleep(500)
    }
  }
}

main().catch((err) => {
  console.error(`FATAL: ${err.message}\n${err.stack}`)
  process.exit(1)
})
