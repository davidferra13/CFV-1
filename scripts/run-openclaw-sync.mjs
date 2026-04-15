/**
 * Manual OpenClaw sync script.
 * Pulls prices from Pi and writes to local PostgreSQL.
 *
 * Now includes a validation gate: every price is checked before insertion.
 * Rejected prices go to openclaw.quarantined_prices instead of
 * ingredient_price_history. Each run is logged to openclaw.sync_audit_log.
 */
import postgres from 'postgres'

const PI_URL = 'http://10.0.0.177:8081'
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const sql = postgres(DB_URL)

// --- Inline validators (mirrors lib/openclaw/price-validator.ts) ---
// The .ts module can't be imported directly from .mjs, so we inline the
// validation logic here. Keep these in sync with the canonical TypeScript file.

function validatePrice(priceCents, ingredientName) {
  if (priceCents == null || !Number.isFinite(priceCents)) {
    return { valid: false, reason: `Invalid price value (${priceCents}) for "${ingredientName}"` }
  }
  if (priceCents <= 0) {
    return { valid: false, reason: `Price must be > 0, got ${priceCents} cents for "${ingredientName}"` }
  }
  if (priceCents === 1) {
    return { valid: false, reason: `Price is exactly 1 cent for "${ingredientName}" (likely scraper placeholder)` }
  }
  if (priceCents >= 100_000) {
    return { valid: false, reason: `Price ${priceCents} cents ($${(priceCents / 100).toFixed(2)}) exceeds $1000 limit for "${ingredientName}"` }
  }
  return { valid: true }
}

function validatePriceChange(oldPriceCents, newPriceCents, ingredientName) {
  if (oldPriceCents == null || oldPriceCents <= 0) {
    return { valid: true }
  }
  // Skip spike check when old price looks like a per-unit price and new looks
  // like a per-lb/per-package price. Per-unit prices are usually < $1.50 (150c).
  // Comparing $0.14/lemon to $5/lb will always look like a 35x spike but is valid.
  if (oldPriceCents < 150 && newPriceCents > 200) {
    return { valid: true }
  }
  const ratio = newPriceCents / oldPriceCents
  if (ratio > 20) {
    return { valid: false, reason: `Price spike: ${oldPriceCents}c -> ${newPriceCents}c (${ratio.toFixed(1)}x) for "${ingredientName}"` }
  }
  if (ratio < 0.05) {
    return { valid: false, reason: `Price crash: ${oldPriceCents}c -> ${newPriceCents}c (${ratio.toFixed(2)}x) for "${ingredientName}"` }
  }
  return { valid: true }
}

// --- Quarantine helper ---

async function quarantine(source, ingredientName, priceCents, oldPriceCents, reason, rawData) {
  try {
    await sql`
      INSERT INTO openclaw.quarantined_prices
        (source, ingredient_name, price_cents, old_price_cents, rejection_reason, raw_data)
      VALUES (
        ${source}, ${ingredientName}, ${priceCents}, ${oldPriceCents},
        ${reason}, ${rawData ? JSON.stringify(rawData) : null}
      )
    `
  } catch (err) {
    console.warn(`  [quarantine] Failed to log rejected price: ${err.message?.substring(0, 80)}`)
  }
}

// --- Original helpers ---

function tierToSource(tier) {
  if (tier === 'flyer_scrape') return 'openclaw_flyer'
  if (tier === 'direct_scrape') return 'openclaw_scrape'
  if (tier.includes('instacart')) return 'openclaw_instacart'
  if (tier === 'government_baseline') return 'openclaw_government'
  return 'openclaw_flyer'
}

function tierToConfidence(tier) {
  if (tier === 'exact_receipt') return 0.95
  if (tier === 'direct_scrape') return 0.85
  if (tier.includes('flyer')) return 0.7
  if (tier.includes('instacart')) return 0.6
  if (tier === 'government_baseline') return 0.4
  return 0.5
}

async function main() {
  const syncStartedAt = new Date()
  let totalProcessed = 0
  let totalAccepted = 0
  let totalQuarantined = 0
  let totalSkipped = 0

  // 1. Load all ingredients across all tenants
  const rows = await sql`
    SELECT id, name, tenant_id, last_price_cents
    FROM ingredients
  `
  console.log(`Ingredients in DB: ${rows.length}`)

  // 2. Deduplicate names + normalize USDA-style compound names for lookup.
  // USDA names follow "Primary, Modifier, Modifier..." pattern.
  // "Broccoli, Frozen, Spears, Unprepared" → "broccoli" for lookup.
  // Multiple originals may collapse to the same lookup key; results are
  // applied to all originals that share that key.
  const rawNames = [...new Set(rows.map(r => r.name.trim()))]
  console.log(`Unique names to look up: ${rawNames.length}`)

  function normalizeForLookup(name) {
    // Take first comma-segment, lowercase, strip trailing punctuation
    const base = name.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9 &'-]/g, '').trim()
    return base.length >= 3 ? base : name.toLowerCase().trim()
  }

  // Map: normalized lookup key → array of original names it covers
  const normToOriginals = new Map()
  for (const name of rawNames) {
    const key = normalizeForLookup(name)
    if (!normToOriginals.has(key)) normToOriginals.set(key, [])
    normToOriginals.get(key).push(name)
  }
  const names = [...normToOriginals.keys()]
  console.log(`Normalized lookup keys: ${names.length} (collapsed from ${rawNames.length})`)

  // 3. Call Pi enriched endpoint in chunks to avoid 5000-item limit
  const CHUNK = 5000
  const allResults = {}
  for (let i = 0; i < names.length; i += CHUNK) {
    const chunk = names.slice(i, i + CHUNK)
    const res = await fetch(`${PI_URL}/api/prices/enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: chunk }),
    })
    const data = await res.json()
    Object.assign(allResults, data.results || {})
    if (names.length > CHUNK) console.log(`  Pi lookup: ${Math.min(i + CHUNK, names.length)}/${names.length} names queried`)
  }

  let matched = 0
  let notFound = 0
  let priceRows = 0
  const notFoundNames = []
  const _osd = new Date()
  const today = `${_osd.getFullYear()}-${String(_osd.getMonth() + 1).padStart(2, '0')}-${String(_osd.getDate()).padStart(2, '0')}`

  // 4. Process each result - apply to all original names covered by this lookup key
  for (const [lookupKey, result] of Object.entries(allResults)) {
    const originals = normToOriginals.get(lookupKey) || [lookupKey]
    for (const name of originals) {
    const tenantIngs = rows.filter(r => r.name.trim() === name)

    if (!result || !result.best_price) {
      notFound += tenantIngs.length
      totalSkipped += tenantIngs.length
      notFoundNames.push(name)
      continue
    }
    matched += tenantIngs.length

    for (const ing of tenantIngs) {
      // 4a. Write ALL store prices to ingredient_price_history (with validation)
      for (const sp of result.all_prices) {
        totalProcessed++
        const source = tierToSource(sp.tier)
        const priceCents = sp.normalized_cents

        // --- Validation gate ---
        const priceCheck = validatePrice(priceCents, ing.name)
        if (!priceCheck.valid) {
          totalQuarantined++
          await quarantine(source, ing.name, priceCents, ing.last_price_cents, priceCheck.reason, {
            store: sp.store, tier: sp.tier, unit: sp.normalized_unit,
          })
          continue
        }

        // Check for suspicious price swings against existing price
        const changeCheck = validatePriceChange(ing.last_price_cents, priceCents, ing.name)
        if (!changeCheck.valid) {
          totalQuarantined++
          await quarantine(source, ing.name, priceCents, ing.last_price_cents, changeCheck.reason, {
            store: sp.store, tier: sp.tier, unit: sp.normalized_unit,
          })
          continue
        }

        // --- Passed validation, insert ---
        try {
          await sql`
            INSERT INTO ingredient_price_history
              (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
               quantity, unit, purchase_date, store_name, source, notes)
            VALUES (
              gen_random_uuid(), ${ing.id}, ${ing.tenant_id},
              ${priceCents}, ${priceCents},
              1, ${sp.normalized_unit}, ${today},
              ${sp.store}, ${source},
              ${'Synced from OpenClaw - ' + sp.store}
            )
            ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
              WHERE source LIKE 'openclaw_%'
            DO UPDATE SET
              price_cents = EXCLUDED.price_cents,
              price_per_unit_cents = EXCLUDED.price_per_unit_cents,
              unit = EXCLUDED.unit,
              notes = EXCLUDED.notes
          `
          priceRows++
          totalAccepted++
        } catch (err) {
          totalSkipped++
          console.warn(`  Skip: ${ing.name} @ ${sp.store}: ${err.message?.substring(0, 80)}`)
        }
      }

      // 4b. Update ingredient row with best price (also validated)
      const bp = result.best_price
      const bpCheck = validatePrice(bp.normalized_cents, ing.name)
      if (!bpCheck.valid) {
        // Don't update the ingredient row with a bad best price
        continue
      }
      const bpChangeCheck = validatePriceChange(ing.last_price_cents, bp.normalized_cents, ing.name)
      if (!bpChangeCheck.valid) {
        // Don't update the ingredient row with a suspicious price swing
        continue
      }

      const conf = tierToConfidence(bp.tier)
      const src = tierToSource(bp.tier)

      try {
        await sql`
          UPDATE ingredients SET
            last_price_cents = ${bp.normalized_cents},
            last_price_date = ${today},
            price_unit = ${bp.normalized_unit},
            last_price_source = ${src},
            last_price_store = ${bp.store},
            last_price_confidence = ${conf},
            price_trend_direction = ${result.trend?.direction ?? null},
            price_trend_pct = ${result.trend?.change_7d_pct ?? null}
          WHERE id = ${ing.id}
        `
      } catch (err) {
        // Fallback if enrichment columns don't exist
        await sql`
          UPDATE ingredients SET
            last_price_cents = ${bp.normalized_cents},
            last_price_date = ${today},
            price_unit = ${bp.normalized_unit}
          WHERE id = ${ing.id}
        `
      }
    } // end for (const ing of tenantIngs)
    } // end for (const name of originals)
  }

  // --- Sync Results ---
  console.log('\n--- Sync Results ---')
  console.log(`Matched:       ${matched}`)
  console.log(`Not found:     ${notFound}`)
  console.log(`Price rows:    ${priceRows}`)
  if (notFoundNames.length > 0) {
    console.log(`Not found:     ${notFoundNames.join(', ')}`)
  }

  // --- Validation Summary ---
  console.log('\n--- Validation Summary ---')
  console.log(`${totalAccepted} accepted, ${totalQuarantined} quarantined, ${totalSkipped} skipped (${totalProcessed} processed)`)

  // 5. Quick verification
  const priceCount = await sql`SELECT COUNT(*) as cnt FROM ingredient_price_history`
  const pricedIngs = await sql`
    SELECT COUNT(*) as cnt FROM ingredients
    WHERE last_price_cents IS NOT NULL
  `
  const quarantineCount = await sql`
    SELECT COUNT(*) as cnt FROM openclaw.quarantined_prices WHERE NOT reviewed
  `
  console.log(`\n--- Verification ---`)
  console.log(`ingredient_price_history rows: ${priceCount[0].cnt}`)
  console.log(`Ingredients with prices:       ${pricedIngs[0].cnt} / ${rows.length}`)
  console.log(`Quarantined (unreviewed):      ${quarantineCount[0].cnt}`)

  // 6. Log to sync_audit_log
  const syncCompletedAt = new Date()
  try {
    await sql`
      INSERT INTO openclaw.sync_audit_log
        (sync_type, started_at, completed_at, records_processed,
         records_accepted, records_quarantined, records_skipped, metadata)
      VALUES (
        'price_sync', ${syncStartedAt}, ${syncCompletedAt},
        ${totalProcessed}, ${totalAccepted}, ${totalQuarantined}, ${totalSkipped},
        ${JSON.stringify({
          ingredients_count: rows.length,
          unique_names: names.length,
          matched,
          not_found: notFound,
          not_found_names: notFoundNames.slice(0, 50),
        })}
      )
    `
  } catch (err) {
    console.warn(`  [audit] Failed to log sync run: ${err.message?.substring(0, 80)}`)
  }

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
