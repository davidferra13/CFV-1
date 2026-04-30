#!/usr/bin/env node

import postgres from 'postgres'

const args = process.argv.slice(2)
const write = args.includes('--write')
const repairExisting = args.includes('--repair-existing')
const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const sql = postgres(connectionString, {
  max: 2,
  idle_timeout: 10,
  connect_timeout: 10,
  connection: { statement_timeout: 60000 },
})

const normalizedCentsSql = sql`
  CASE
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('lb', 'lbs', 'pound', 'pounds') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('oz', 'ounce', 'ounces') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value * 16)
    WHEN p.size_value > 0 AND lower(p.size_unit) = 'kg' THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value / 2.20462)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('g', 'gram', 'grams') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value * 453.592)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('fl oz', 'floz', 'fluid ounce', 'fluid ounces') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('gal', 'gallon', 'gallons') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value / 128)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('l', 'liter', 'liters') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value / 33.814)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('ml', 'milliliter', 'milliliters') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value * 29.5735)
    WHEN p.size_value > 0 AND lower(p.size_unit) IN ('ct', 'count', 'each', 'ea', 'unit', 'units') THEN
      ROUND(COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::numeric / p.size_value)
    ELSE NULL
  END
`

const normalizedUnitSql = sql`
  CASE
    WHEN lower(p.size_unit) IN ('lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 'kg', 'g', 'gram', 'grams') THEN 'lb'
    WHEN lower(p.size_unit) IN ('fl oz', 'floz', 'fluid ounce', 'fluid ounces', 'gal', 'gallon', 'gallons', 'l', 'liter', 'liters', 'ml', 'milliliter', 'milliliters') THEN 'fl oz'
    WHEN lower(p.size_unit) IN ('ct', 'count', 'each', 'ea', 'unit', 'units') THEN 'each'
    ELSE NULL
  END
`

async function loadSummary() {
  const rows = await sql`
    WITH computed AS (
      SELECT
        sp.id,
        p.size_unit,
        sp.price_per_standard_unit_cents,
        ${normalizedCentsSql}::int AS computed_cents,
        ${normalizedUnitSql} AS computed_unit
      FROM openclaw.store_products sp
      JOIN openclaw.products p ON p.id = sp.product_id
      WHERE COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents) > 0
        AND COALESCE(p.is_food, true) = true
        AND p.size_value > 0
        AND p.size_unit IS NOT NULL
    )
    SELECT
      COUNT(*)::int AS eligible_rows,
      COUNT(*) FILTER (
        WHERE computed_cents > 0
          AND computed_cents < 50000
          AND COALESCE(price_per_standard_unit_cents, 0) <= 0
      )::int AS missing_standard_unit_rows,
      COUNT(*) FILTER (
        WHERE computed_cents > 0
          AND computed_cents < 50000
          AND price_per_standard_unit_cents IS NOT NULL
          AND price_per_standard_unit_cents > 0
          AND price_per_standard_unit_cents <> computed_cents
      )::int AS different_existing_rows,
      COUNT(*) FILTER (WHERE computed_unit = 'lb')::int AS lb_rows,
      COUNT(*) FILTER (WHERE computed_unit = 'fl oz')::int AS fl_oz_rows,
      COUNT(*) FILTER (WHERE computed_unit = 'each')::int AS each_rows
    FROM computed
  `
  return rows[0]
}

async function loadSamples() {
  return await sql`
    WITH computed AS (
      SELECT
        sp.id,
        p.name,
        p.size,
        p.size_value,
        p.size_unit,
        COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents)::int AS price_cents,
        sp.price_per_standard_unit_cents,
        ${normalizedCentsSql}::int AS computed_cents,
        ${normalizedUnitSql} AS computed_unit
      FROM openclaw.store_products sp
      JOIN openclaw.products p ON p.id = sp.product_id
      WHERE COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents) > 0
        AND COALESCE(p.is_food, true) = true
        AND p.size_value > 0
        AND p.size_unit IS NOT NULL
    )
    SELECT *
    FROM computed
    WHERE computed_cents > 0
      AND computed_cents < 50000
      AND (
        COALESCE(price_per_standard_unit_cents, 0) <= 0
        OR (${repairExisting} = true AND price_per_standard_unit_cents <> computed_cents)
      )
    ORDER BY id
    LIMIT 20
  `
}

async function applyUpdate() {
  const rows = await sql`
    WITH computed AS (
      SELECT
        sp.id,
        ${normalizedCentsSql}::int AS computed_cents
      FROM openclaw.store_products sp
      JOIN openclaw.products p ON p.id = sp.product_id
      WHERE COALESCE(NULLIF(sp.sale_price_cents, 0), sp.price_cents) > 0
        AND COALESCE(p.is_food, true) = true
        AND p.size_value > 0
        AND p.size_unit IS NOT NULL
    )
    UPDATE openclaw.store_products sp
    SET price_per_standard_unit_cents = computed.computed_cents
    FROM computed
    WHERE sp.id = computed.id
      AND computed.computed_cents > 0
      AND computed.computed_cents < 50000
      AND (
        COALESCE(sp.price_per_standard_unit_cents, 0) <= 0
        OR (${repairExisting} = true AND sp.price_per_standard_unit_cents <> computed.computed_cents)
      )
    RETURNING sp.id
  `
  return rows.length
}

try {
  const before = await loadSummary()
  const samples = await loadSamples()
  const updatedRows = write ? await applyUpdate() : 0
  const after = write ? await loadSummary() : before

  console.log(
    JSON.stringify(
      {
        success: true,
        mode: write ? 'write' : 'dry-run',
        repairExisting,
        before,
        updatedRows,
        after,
        samples,
      },
      null,
      2
    )
  )
} catch (error) {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unit normalization audit failed.',
      },
      null,
      2
    )
  )
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 1 })
}
