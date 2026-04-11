#!/usr/bin/env node
/**
 * Propagate Market Prices to Chef Ingredients
 *
 * Closes the pipeline gap between openclaw.system_ingredient_prices and
 * ingredient_price_history.
 *
 * Chain:
 *   ingredient_aliases.ingredient_id → ingredients (chef's ingredient, per tenant)
 *   ingredient_aliases.system_ingredient_id → system_ingredients
 *   openclaw.system_ingredient_prices.system_ingredient_id → aggregated market price
 *
 * This is entirely local — no Pi API calls. Runs after sync-system-ingredient-prices.mjs
 * has populated system_ingredient_prices from the local openclaw.store_products mirror.
 *
 * Usage: node scripts/propagate-market-prices-to-ingredients.mjs
 */

import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL)
const today = new Date().toISOString().split('T')[0]

async function main() {
  console.log('=== Propagate Market Prices to Chef Ingredients ===')
  console.log(`Date: ${today}`)

  // Step 1: Count scope
  const [scope] = await sql`
    SELECT COUNT(*) AS alias_count
    FROM ingredient_aliases ia
    JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
    WHERE ia.match_method != 'dismissed'
      AND sip.median_price_cents > 0
  `
  console.log(`Aliases with market prices: ${scope.alias_count}`)

  // Step 2: Upsert into ingredient_price_history from local market averages.
  // Source = 'openclaw_market' so it doesn't collide with store-specific prices.
  // Store name = 'Market Average (' + state_count + ' states)' for transparency.
  const insertResult = await sql`
    INSERT INTO ingredient_price_history (
      id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
      quantity, unit, purchase_date, store_name, source, notes
    )
    SELECT
      gen_random_uuid(),
      ia.ingredient_id,
      i.tenant_id,
      sip.median_price_cents,
      sip.median_price_cents,
      1,
      sip.price_unit,
      ${today}::date,
      'Market Average (' || sip.state_count || ' states)',
      'openclaw_market',
      'Market avg: ' || sip.store_count || ' stores, ' || sip.state_count || ' states, confidence ' || sip.confidence
    FROM ingredient_aliases ia
    JOIN ingredients i ON i.id = ia.ingredient_id
    JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
    WHERE ia.match_method != 'dismissed'
      AND sip.median_price_cents > 0
      AND sip.store_count >= 1
    ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
      WHERE source LIKE 'openclaw_%'
    DO UPDATE SET
      price_cents        = EXCLUDED.price_cents,
      price_per_unit_cents = EXCLUDED.price_per_unit_cents,
      unit               = EXCLUDED.unit,
      notes              = EXCLUDED.notes
  `
  console.log(`ingredient_price_history upserted: ${insertResult.count} rows`)

  // Step 3: Update ingredients.last_price_cents for any ingredient that doesn't
  // already have a more confident store-specific price from today.
  // Only update if: no existing price, or existing price is also a market average.
  const updateResult = await sql`
    UPDATE ingredients i
    SET
      last_price_cents    = sip.median_price_cents,
      last_price_date     = ${today}::date,
      price_unit          = sip.price_unit,
      last_price_source   = 'openclaw_market'
    FROM ingredient_aliases ia
    JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
    WHERE ia.ingredient_id = i.id
      AND ia.match_method != 'dismissed'
      AND sip.median_price_cents > 0
      AND sip.store_count >= 1
      AND (
        i.last_price_cents IS NULL
        OR i.last_price_source = 'openclaw_market'
        OR i.last_price_date < (${today}::date - interval '7 days')
      )
  `
  console.log(`ingredients.last_price_cents updated: ${updateResult.count} rows`)

  // Step 4: Summary
  const [pricedAfter] = await sql`
    SELECT COUNT(*) AS cnt FROM ingredients WHERE last_price_cents IS NOT NULL
  `
  const [totalIngs] = await sql`SELECT COUNT(*) AS cnt FROM ingredients`
  const pct = totalIngs.cnt > 0 ? ((pricedAfter.cnt / totalIngs.cnt) * 100).toFixed(1) : '0'
  console.log(`\nIngredients with prices: ${pricedAfter.cnt} / ${totalIngs.cnt} (${pct}%)`)

  await sql.end()
  console.log('Done.')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
