/**
 * Deterministic verification path for the Yield Normalization Engine.
 * The local OpenClaw mirror may be empty, so this script seeds fixture rows,
 * proves exact usable-cost outputs, and cleans up only those fixture rows.
 */

import { closeDb, getDb } from '../../.openclaw-build/lib/db.mjs';
import { runYieldNormalizer } from '../../.openclaw-build/services/yield-normalizer.mjs';

const FIXTURE_SOURCE_ID = 'yield-normalization-fixture';

const FIXTURES = [
  {
    currentPriceId: 'yield-fixture:chicken-whole',
    canonicalIngredientId: 'chicken-whole',
    rawProductName: 'Whole Chicken',
    rawPriceCents: 399,
    unit: 'lb',
    expectedYield: 0.62,
    expectedUsableCents: 644,
  },
  {
    currentPriceId: 'yield-fixture:beef-chuck-roast',
    canonicalIngredientId: 'beef-chuck-roast',
    rawProductName: 'Beef Chuck Roast',
    rawPriceCents: 749,
    unit: 'lb',
    expectedYield: 0.66,
    expectedUsableCents: 1135,
  },
  {
    currentPriceId: 'yield-fixture:salmon-whole',
    canonicalIngredientId: 'salmon-whole',
    rawProductName: 'Whole Salmon',
    rawPriceCents: 899,
    unit: 'lb',
    expectedYield: 0.56,
    expectedUsableCents: 1605,
  },
  {
    currentPriceId: 'yield-fixture:potato-russet',
    canonicalIngredientId: 'potato-russet',
    rawProductName: 'Russet Potatoes',
    rawPriceCents: 129,
    unit: 'lb',
    expectedYield: 0.74,
    expectedUsableCents: 174,
  },
  {
    currentPriceId: 'yield-fixture:spinach',
    canonicalIngredientId: 'spinach',
    rawProductName: 'Fresh Spinach',
    rawPriceCents: 349,
    unit: 'lb',
    expectedYield: 0.70,
    expectedUsableCents: 499,
  },
  {
    currentPriceId: 'yield-fixture:parsley',
    canonicalIngredientId: 'parsley',
    rawProductName: 'Italian Parsley',
    rawPriceCents: 179,
    unit: 'bunch',
    expectedYield: 0.72,
    expectedUsableCents: 249,
  },
  {
    currentPriceId: 'yield-fixture:lemon',
    canonicalIngredientId: 'lemon',
    rawProductName: 'Fresh Lemons',
    rawPriceCents: 199,
    unit: 'lb',
    expectedYield: 0.55,
    expectedUsableCents: 362,
  },
  {
    currentPriceId: 'yield-fixture:yellow-onion',
    canonicalIngredientId: 'yellow-onion',
    rawProductName: 'Yellow Onions',
    rawPriceCents: 129,
    unit: 'lb',
    expectedYield: 0.88,
    expectedUsableCents: 147,
  },
  {
    currentPriceId: 'yield-fixture:garlic',
    canonicalIngredientId: 'garlic',
    rawProductName: 'Fresh Garlic',
    rawPriceCents: 299,
    unit: 'lb',
    expectedYield: 0.82,
    expectedUsableCents: 365,
  },
  {
    currentPriceId: 'yield-fixture:romaine-lettuce',
    canonicalIngredientId: 'romaine-lettuce',
    rawProductName: 'Romaine Lettuce',
    rawPriceCents: 249,
    unit: 'each',
    expectedYield: 0.84,
    expectedUsableCents: 296,
  },
];

const FIXTURE_IDS = FIXTURES.map((fixture) => fixture.currentPriceId);
const FIXTURE_ID_PLACEHOLDERS = FIXTURE_IDS.map(() => '?').join(', ');

function cleanupFixtures(db) {
  const cleanup = db.transaction(() => {
    db.prepare(`
      DELETE FROM true_costs
      WHERE current_price_id IN (${FIXTURE_ID_PLACEHOLDERS})
    `).run(...FIXTURE_IDS);

    db.prepare(`
      DELETE FROM current_prices
      WHERE id IN (${FIXTURE_ID_PLACEHOLDERS})
    `).run(...FIXTURE_IDS);

    db.prepare(`
      DELETE FROM source_registry
      WHERE source_id = ?
    `).run(FIXTURE_SOURCE_ID);
  });

  cleanup();
}

function seedFixtures(db) {
  const insertFixtureRows = db.transaction(() => {
    db.prepare(`
      INSERT INTO source_registry (
        source_id,
        name,
        type,
        scrape_method,
        status,
        pricing_tier,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'active', 'retail', ?, datetime('now'), datetime('now'))
      ON CONFLICT(source_id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        scrape_method = excluded.scrape_method,
        status = 'active',
        pricing_tier = excluded.pricing_tier,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(
      FIXTURE_SOURCE_ID,
      'Yield Normalization Verification Fixture',
      'verification',
      'fixture',
      'Deterministic local fixture rows for Yield Normalization Engine verification.'
    );

    const insertCurrentPrice = db.prepare(`
      INSERT INTO current_prices (
        id,
        source_id,
        canonical_ingredient_id,
        raw_product_name,
        price_cents,
        price_unit,
        price_per_standard_unit_cents,
        standard_unit,
        package_size,
        price_type,
        pricing_tier,
        confidence,
        in_stock,
        last_confirmed_at,
        last_changed_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'regular', 'retail', 'fixture', 1, datetime('now'), datetime('now'), datetime('now'))
    `);

    for (const fixture of FIXTURES) {
      insertCurrentPrice.run(
        fixture.currentPriceId,
        FIXTURE_SOURCE_ID,
        fixture.canonicalIngredientId,
        fixture.rawProductName,
        fixture.rawPriceCents,
        fixture.unit,
        fixture.rawPriceCents,
        fixture.unit,
        `1 ${fixture.unit}`
      );
    }
  });

  insertFixtureRows();
}

function loadFixtureResults(db) {
  return db.prepare(`
    SELECT
      tc.current_price_id,
      tc.source_id,
      ci.name,
      cp.raw_product_name,
      tc.raw_price_cents,
      tc.edible_yield_pct,
      tc.cost_per_usable_unit_cents
    FROM true_costs tc
    JOIN current_prices cp ON cp.id = tc.current_price_id
    JOIN canonical_ingredients ci ON ci.ingredient_id = tc.canonical_ingredient_id
    WHERE tc.current_price_id IN (${FIXTURE_ID_PLACEHOLDERS})
    ORDER BY tc.cost_per_usable_unit_cents DESC, tc.current_price_id ASC
  `).all(...FIXTURE_IDS);
}

function countRemainingFixtures(db) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM current_prices
    WHERE id IN (${FIXTURE_ID_PLACEHOLDERS})
  `).get(...FIXTURE_IDS).count;
}

function assertFixtureResults(rows) {
  const byId = new Map(rows.map((row) => [row.current_price_id, row]));
  const failures = [];

  for (const fixture of FIXTURES) {
    const row = byId.get(fixture.currentPriceId);
    if (!row) {
      failures.push(`${fixture.currentPriceId}: missing true_costs row`);
      continue;
    }

    if (row.source_id !== FIXTURE_SOURCE_ID) {
      failures.push(`${fixture.currentPriceId}: source ${row.source_id} !== ${FIXTURE_SOURCE_ID}`);
    }
    if (Number(row.raw_price_cents) !== fixture.rawPriceCents) {
      failures.push(`${fixture.currentPriceId}: raw cents ${row.raw_price_cents} !== ${fixture.rawPriceCents}`);
    }
    if (Number(row.edible_yield_pct) !== fixture.expectedYield) {
      failures.push(`${fixture.currentPriceId}: yield ${row.edible_yield_pct} !== ${fixture.expectedYield}`);
    }
    if (Number(row.cost_per_usable_unit_cents) !== fixture.expectedUsableCents) {
      failures.push(
        `${fixture.currentPriceId}: usable cents ${row.cost_per_usable_unit_cents} !== ${fixture.expectedUsableCents}`
      );
    }
  }

  if (rows.length !== FIXTURES.length) {
    failures.push(`fixture row count ${rows.length} !== ${FIXTURES.length}`);
  }

  if (failures.length > 0) {
    throw new Error(`Yield normalization verification failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  }
}

function printSummary(summary, rows) {
  console.log('[yield-normalization-verifier] total fixture rows processed:', summary.processedCount);
  console.log('[yield-normalization-verifier] total matches:', summary.matchedCount);
  console.log('[yield-normalization-verifier] total skipped:', summary.skippedCount);
  console.log('[yield-normalization-verifier] sample computed rows:');

  for (const row of rows.slice(0, 5)) {
    console.log(
      `  ${row.name} | raw=${row.raw_price_cents}c | ` +
        `yield=${row.edible_yield_pct} | usable=${row.cost_per_usable_unit_cents}c | ` +
        `${row.raw_product_name}`
    );
  }
}

async function main() {
  const db = getDb();
  let failure = null;

  try {
    cleanupFixtures(db);
    await runYieldNormalizer({
      currentPriceIds: [],
      clearExistingTrueCosts: false,
      log: false,
    });
    seedFixtures(db);

    const summary = await runYieldNormalizer({
      currentPriceIds: FIXTURE_IDS,
      clearExistingTrueCosts: false,
      log: false,
    });
    const rows = loadFixtureResults(db);

    assertFixtureResults(rows);
    printSummary(summary, rows);
  } catch (error) {
    failure = error;
  }

  try {
    cleanupFixtures(db);
    const remainingFixtures = countRemainingFixtures(db);
    if (remainingFixtures !== 0) {
      throw new Error(`fixture cleanup left ${remainingFixtures} current_prices rows behind`);
    }
  } catch (error) {
    failure = failure
      ? new Error(`${failure.message}\nCleanup failure: ${error.message}`)
      : error;
  } finally {
    closeDb();
  }

  if (failure) {
    console.error('[yield-normalization-verifier] FAILED:', failure.message);
    process.exit(1);
  }

  console.log('[yield-normalization-verifier] PASS');
}

main();
