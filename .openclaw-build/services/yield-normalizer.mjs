/**
 * OpenClaw - Yield Normalization Engine
 *
 * Converts raw ingredient pricing into usable-cost pricing by applying
 * yield profiles to current_prices rows.
 */

import { getDb } from '../lib/db.mjs';
import { normalizeUnitName } from '../lib/unit-normalization.mjs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const CHECKPOINT_KEY = 'yield-normalization';
const SOURCE_ID = 'yield-normalization';
const DEFAULT_BATCH_SIZE = Math.max(
  50,
  Number.parseInt(process.env.YIELD_NORMALIZER_BATCH_SIZE || '250', 10) || 250
);
const MAX_BATCH_RETRIES = 3;

const YIELD_SEEDS = [
  {
    seedId: 'chicken-whole',
    name: 'Whole Chicken',
    aliases: ['whole chicken'],
    category: 'poultry',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.62,
    trimLossPct: 0.28,
    cookLossPct: 0.10,
    notes: 'Whole bird fabricated and cooked to usable meat yield.',
    source: 'chef_standard',
  },
  {
    seedId: 'chicken-breast-boneless-skinless',
    name: 'Chicken Breast, Boneless Skinless',
    aliases: ['boneless skinless chicken breast', 'chicken breast'],
    category: 'poultry',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.82,
    trimLossPct: 0.05,
    cookLossPct: 0.13,
    notes: 'Boneless skinless breast after light trim and standard cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'chicken-thigh-bone-in',
    name: 'Chicken Thigh, Bone-In',
    aliases: ['bone-in chicken thigh', 'chicken thigh bone in'],
    category: 'poultry',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.71,
    trimLossPct: 0.17,
    cookLossPct: 0.12,
    notes: 'Bone-in thighs with skin and bone loss plus normal cook shrink.',
    source: 'chef_standard',
  },
  {
    seedId: 'turkey-whole',
    name: 'Whole Turkey',
    aliases: ['whole turkey'],
    category: 'poultry',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.60,
    trimLossPct: 0.30,
    cookLossPct: 0.10,
    notes: 'Whole bird yield after fabrication and roast shrink.',
    source: 'chef_standard',
  },
  {
    seedId: 'duck-breast',
    name: 'Duck Breast',
    aliases: ['duck breast'],
    category: 'poultry',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.76,
    trimLossPct: 0.08,
    cookLossPct: 0.16,
    notes: 'Trimmed duck breast after rendered fat loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'beef-chuck-roast',
    name: 'Beef Chuck Roast',
    aliases: ['chuck roast', 'beef chuck'],
    category: 'beef',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.66,
    trimLossPct: 0.18,
    cookLossPct: 0.16,
    notes: 'Chuck roast after seam trim and braise loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'beef-strip-loin',
    name: 'Beef Strip Loin',
    aliases: ['strip loin', 'strip steak'],
    category: 'beef',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.79,
    trimLossPct: 0.09,
    cookLossPct: 0.12,
    notes: 'Strip loin after trim and portion cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'beef-tenderloin-whole',
    name: 'Beef Tenderloin, Whole',
    aliases: ['whole beef tenderloin', 'beef tenderloin'],
    category: 'beef',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.78,
    trimLossPct: 0.12,
    cookLossPct: 0.10,
    notes: 'Whole tenderloin trimmed and portioned for service.',
    source: 'chef_standard',
  },
  {
    seedId: 'ground-beef-80-20',
    name: 'Ground Beef 80/20',
    aliases: ['ground beef', 'ground beef 80 20'],
    category: 'beef',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.74,
    trimLossPct: 0.00,
    cookLossPct: 0.26,
    notes: 'Ground beef after rendered fat and moisture loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'salmon-whole',
    name: 'Whole Salmon',
    aliases: ['whole salmon'],
    category: 'seafood',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.56,
    trimLossPct: 0.28,
    cookLossPct: 0.16,
    notes: 'Whole fish after head, frame, skin, and cook shrink.',
    source: 'chef_standard',
  },
  {
    seedId: 'salmon-fillet',
    name: 'Salmon Fillet',
    aliases: ['salmon fillet'],
    category: 'seafood',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.83,
    trimLossPct: 0.05,
    cookLossPct: 0.12,
    notes: 'Portion-cut salmon fillet after light trim and cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'cod-fillet',
    name: 'Cod Fillet',
    aliases: ['cod fillet'],
    category: 'seafood',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.86,
    trimLossPct: 0.04,
    cookLossPct: 0.10,
    notes: 'Skinless cod fillet with standard cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'branzino-whole',
    name: 'Whole Branzino',
    aliases: ['whole branzino', 'branzino'],
    category: 'seafood',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.44,
    trimLossPct: 0.38,
    cookLossPct: 0.18,
    notes: 'Whole branzino after gutting, filleting, and cooking.',
    source: 'chef_standard',
  },
  {
    seedId: 'shrimp-head-on-shell-on',
    name: 'Shrimp, Head-On Shell-On',
    aliases: ['head on shrimp', 'shell on shrimp'],
    category: 'seafood',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.49,
    trimLossPct: 0.36,
    cookLossPct: 0.15,
    notes: 'Head-on shell-on shrimp after peel, devein, and cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'potato-russet',
    name: 'Potato, Russet',
    aliases: ['russet potato', 'potato'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.74,
    trimLossPct: 0.18,
    cookLossPct: 0.08,
    notes: 'Russet potato peeled and cooked.',
    source: 'chef_standard',
  },
  {
    seedId: 'sweet-potato',
    name: 'Sweet Potato',
    aliases: ['sweet potato'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.80,
    trimLossPct: 0.12,
    cookLossPct: 0.08,
    notes: 'Sweet potato peeled and roasted.',
    source: 'chef_standard',
  },
  {
    seedId: 'carrot',
    name: 'Carrot',
    aliases: ['carrots'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.82,
    trimLossPct: 0.10,
    cookLossPct: 0.08,
    notes: 'Carrot peeled and trimmed for hot prep.',
    source: 'chef_standard',
  },
  {
    seedId: 'beet',
    name: 'Beet',
    aliases: ['beets'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.72,
    trimLossPct: 0.18,
    cookLossPct: 0.10,
    notes: 'Beet peeled and roasted.',
    source: 'chef_standard',
  },
  {
    seedId: 'spinach',
    name: 'Spinach',
    aliases: ['baby spinach'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.70,
    trimLossPct: 0.12,
    cookLossPct: 0.18,
    notes: 'Spinach after wash, stem trim, and saute shrink.',
    source: 'chef_standard',
  },
  {
    seedId: 'kale',
    name: 'Kale',
    aliases: ['curly kale', 'lacinato kale'],
    category: 'produce',
    standardUnit: 'bunch',
    purchaseUnit: 'bunch',
    usableUnit: 'bunch',
    edibleYieldPct: 0.62,
    trimLossPct: 0.23,
    cookLossPct: 0.15,
    notes: 'Kale bunch after de-stemming and cook shrink.',
    source: 'chef_standard',
  },
  {
    seedId: 'romaine-lettuce',
    name: 'Romaine Lettuce',
    aliases: ['romaine'],
    category: 'produce',
    standardUnit: 'each',
    purchaseUnit: 'each',
    usableUnit: 'each',
    edibleYieldPct: 0.84,
    trimLossPct: 0.16,
    cookLossPct: 0.00,
    notes: 'Romaine head after core and outer-leaf trim.',
    source: 'chef_standard',
  },
  {
    seedId: 'parsley',
    name: 'Parsley',
    aliases: ['flat leaf parsley', 'italian parsley'],
    category: 'herbs',
    standardUnit: 'bunch',
    purchaseUnit: 'bunch',
    usableUnit: 'bunch',
    edibleYieldPct: 0.72,
    trimLossPct: 0.28,
    cookLossPct: 0.00,
    notes: 'Parsley bunch with stem trim for leaf use.',
    source: 'chef_standard',
  },
  {
    seedId: 'cilantro',
    name: 'Cilantro',
    aliases: ['coriander leaves'],
    category: 'herbs',
    standardUnit: 'bunch',
    purchaseUnit: 'bunch',
    usableUnit: 'bunch',
    edibleYieldPct: 0.70,
    trimLossPct: 0.30,
    cookLossPct: 0.00,
    notes: 'Cilantro bunch after stem trim and sorting.',
    source: 'chef_standard',
  },
  {
    seedId: 'thyme',
    name: 'Thyme',
    aliases: ['fresh thyme'],
    category: 'herbs',
    standardUnit: 'bunch',
    purchaseUnit: 'bunch',
    usableUnit: 'bunch',
    edibleYieldPct: 0.48,
    trimLossPct: 0.52,
    cookLossPct: 0.00,
    notes: 'Fresh thyme bunch stripped for leaf-only yield.',
    source: 'chef_standard',
  },
  {
    seedId: 'lemon',
    name: 'Lemon',
    aliases: ['lemons'],
    category: 'fruit',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.55,
    trimLossPct: 0.45,
    cookLossPct: 0.00,
    notes: 'Lemon usable juice and zest yield after peel and pith loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'lime',
    name: 'Lime',
    aliases: ['limes'],
    category: 'fruit',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.52,
    trimLossPct: 0.48,
    cookLossPct: 0.00,
    notes: 'Lime usable juice and zest yield.',
    source: 'chef_standard',
  },
  {
    seedId: 'orange',
    name: 'Orange',
    aliases: ['oranges'],
    category: 'fruit',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.63,
    trimLossPct: 0.37,
    cookLossPct: 0.00,
    notes: 'Orange usable segmented or juiced yield.',
    source: 'chef_standard',
  },
  {
    seedId: 'pineapple',
    name: 'Pineapple',
    aliases: ['whole pineapple'],
    category: 'fruit',
    standardUnit: 'each',
    purchaseUnit: 'each',
    usableUnit: 'each',
    edibleYieldPct: 0.51,
    trimLossPct: 0.49,
    cookLossPct: 0.00,
    notes: 'Whole pineapple after crown, peel, eyes, and core removal.',
    source: 'chef_standard',
  },
  {
    seedId: 'yellow-onion',
    name: 'Yellow Onion',
    aliases: ['yellow onions', 'onion'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.88,
    trimLossPct: 0.10,
    cookLossPct: 0.02,
    notes: 'Yellow onion after peel, root trim, and light cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'red-onion',
    name: 'Red Onion',
    aliases: ['red onions'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.87,
    trimLossPct: 0.11,
    cookLossPct: 0.02,
    notes: 'Red onion after peel, root trim, and light cook loss.',
    source: 'chef_standard',
  },
  {
    seedId: 'garlic',
    name: 'Garlic',
    aliases: ['garlic cloves'],
    category: 'produce',
    standardUnit: 'lb',
    purchaseUnit: 'lb',
    usableUnit: 'lb',
    edibleYieldPct: 0.82,
    trimLossPct: 0.18,
    cookLossPct: 0.00,
    notes: 'Whole garlic after root, skin, and germ loss.',
    source: 'chef_standard',
  },
];

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCurrentPriceColumnSet(db) {
  return new Set(
    db.prepare("PRAGMA table_info(current_prices)").all().map((column) => column.name)
  );
}

function resolveCanonicalIngredientId(db, seed, findExistingByName, insertCanonical) {
  const existingById = db
    .prepare('SELECT ingredient_id FROM canonical_ingredients WHERE ingredient_id = ? LIMIT 1')
    .get(seed.seedId);
  if (existingById?.ingredient_id) return existingById.ingredient_id;

  const namesToCheck = [seed.name, ...(seed.aliases || [])];
  for (const candidateName of namesToCheck) {
    const existing = findExistingByName.get(normalizeName(candidateName));
    if (existing?.ingredient_id) {
      return existing.ingredient_id;
    }
  }

  insertCanonical.run(seed.seedId, seed.name, seed.category, seed.standardUnit);
  return seed.seedId;
}

function ensureYieldDataset(db) {
  const findExistingByName = db.prepare(`
    SELECT ingredient_id
    FROM canonical_ingredients
    WHERE lower(name) = ?
    LIMIT 1
  `);
  const insertCanonical = db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `);
  const upsertYield = db.prepare(`
    INSERT INTO ingredient_yields (
      canonical_ingredient_id,
      purchase_unit,
      edible_yield_pct,
      trim_loss_pct,
      cook_loss_pct,
      usable_unit,
      notes,
      source,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(canonical_ingredient_id, purchase_unit) DO UPDATE SET
      edible_yield_pct = excluded.edible_yield_pct,
      trim_loss_pct = excluded.trim_loss_pct,
      cook_loss_pct = excluded.cook_loss_pct,
      usable_unit = excluded.usable_unit,
      notes = excluded.notes,
      source = excluded.source,
      updated_at = excluded.updated_at
  `);

  const seeded = db.transaction(() => {
    let seedCount = 0;
    for (const seed of YIELD_SEEDS) {
      const canonicalIngredientId = resolveCanonicalIngredientId(
        db,
        seed,
        findExistingByName,
        insertCanonical
      );

      upsertYield.run(
        canonicalIngredientId,
        seed.purchaseUnit,
        seed.edibleYieldPct,
        seed.trimLossPct,
        seed.cookLossPct,
        seed.usableUnit,
        seed.notes,
        seed.source,
        new Date().toISOString()
      );
      seedCount += 1;
    }
    return seedCount;
  });

  return seeded();
}

function ensureDerivedSource(db) {
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
    SOURCE_ID,
    'Ingredient Yield Normalization Engine',
    'derived',
    'computed',
    'Derived usable-cost engine fed by current_prices and ingredient_yields.'
  );
}

function ensureCheckpoint(db) {
  db.prepare(`
    INSERT OR IGNORE INTO yield_normalizer_checkpoints (
      checkpoint_key,
      last_current_price_rowid,
      processed_count,
      matched_count,
      skipped_count,
      status,
      updated_at
    ) VALUES (?, 0, 0, 0, 0, 'idle', datetime('now'))
  `).run(CHECKPOINT_KEY);

  return db.prepare(`
    SELECT *
    FROM yield_normalizer_checkpoints
    WHERE checkpoint_key = ?
  `).get(CHECKPOINT_KEY);
}

function loadYieldProfiles(db) {
  const rows = db.prepare(`
    SELECT canonical_ingredient_id, purchase_unit, edible_yield_pct, usable_unit
    FROM ingredient_yields
    WHERE edible_yield_pct IS NOT NULL
      AND edible_yield_pct > 0
  `).all();

  const map = new Map();
  for (const row of rows) {
    const key = `${row.canonical_ingredient_id}::${normalizeUnitName(row.purchase_unit)}`;
    map.set(key, {
      edibleYieldPct: Number(row.edible_yield_pct),
      usableUnit: row.usable_unit,
    });
  }
  return map;
}

function resolveEffectivePrice(row) {
  const candidates = [
    [row.normalized_price_cents, row.normalized_unit],
    [row.price_per_standard_unit_cents, row.standard_unit],
    [row.price_cents, row.price_unit],
  ];

  for (const [rawPrice, rawUnit] of candidates) {
    const priceCents = Number(rawPrice);
    const purchaseUnit = rawUnit ? normalizeUnitName(rawUnit) : '';
    if (Number.isFinite(priceCents) && priceCents > 0 && purchaseUnit) {
      return {
        rawPriceCents: Math.round(priceCents),
        purchaseUnit,
      };
    }
  }

  return null;
}

function normalizeCurrentPriceIds(value) {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function buildCurrentPriceIdFilter(currentPriceIds, columnName = 'id') {
  if (!currentPriceIds) return { sql: '', params: [] };
  if (currentPriceIds.length === 0) return { sql: ' AND 1 = 0', params: [] };

  return {
    sql: ` AND ${columnName} IN (${currentPriceIds.map(() => '?').join(', ')})`,
    params: currentPriceIds,
  };
}

function countCurrentPriceRows(db, currentPriceIds) {
  const filter = buildCurrentPriceIdFilter(currentPriceIds, 'id');
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM current_prices
    WHERE 1 = 1
      ${filter.sql}
  `).get(...filter.params).count;
}

function selectBatchRows(db, hasNormalizedColumns, lastRowId, batchSize, currentPriceIds = null) {
  const normalizedColumns = hasNormalizedColumns ? ', normalized_price_cents, normalized_unit' : '';
  const filter = buildCurrentPriceIdFilter(currentPriceIds, 'id');
  return db.prepare(`
    SELECT
      rowid AS current_price_rowid,
      id AS current_price_id,
      source_id,
      canonical_ingredient_id,
      raw_product_name,
      price_cents,
      price_unit,
      price_per_standard_unit_cents,
      standard_unit,
      package_size
      ${normalizedColumns}
    FROM current_prices
    WHERE rowid > ?
      ${filter.sql}
    ORDER BY rowid ASC
    LIMIT ?
  `).all(lastRowId, ...filter.params, batchSize);
}

async function runWithRetry(work, label, logger = console) {
  let attempt = 0;
  while (attempt < MAX_BATCH_RETRIES) {
    attempt += 1;
    try {
      return work();
    } catch (error) {
      if (attempt >= MAX_BATCH_RETRIES) {
        throw error;
      }
      logger.warn(`[yield-normalizer] retry ${attempt}/${MAX_BATCH_RETRIES - 1} after ${label}: ${error.message}`);
      await sleep(attempt * 150);
    }
  }
  return null;
}

function buildSamples(db, currentPriceIds = null) {
  const filter = buildCurrentPriceIdFilter(currentPriceIds, 'tc.current_price_id');
  return db.prepare(`
    SELECT
      tc.source_id,
      ci.name,
      cp.raw_product_name,
      tc.raw_price_cents,
      tc.edible_yield_pct,
      tc.cost_per_usable_unit_cents
    FROM true_costs tc
    JOIN canonical_ingredients ci ON ci.ingredient_id = tc.canonical_ingredient_id
    JOIN current_prices cp ON cp.id = tc.current_price_id
    WHERE 1 = 1
      ${filter.sql}
    ORDER BY tc.calculated_at DESC, tc.cost_per_usable_unit_cents DESC
    LIMIT 5
  `).all(...filter.params);
}

export async function runYieldNormalizer(options = {}) {
  const db = options.db || getDb();
  const currentPriceIds = normalizeCurrentPriceIds(options.currentPriceIds);
  const batchSize = Math.max(
    1,
    Number.parseInt(options.batchSize || DEFAULT_BATCH_SIZE, 10) || DEFAULT_BATCH_SIZE
  );
  const clearExistingTrueCosts = options.clearExistingTrueCosts !== false;
  const shouldLog = options.log !== false;
  const logger = options.logger || console;
  const checkpoint = ensureCheckpoint(db);
  const totalPriceRows = countCurrentPriceRows(db, currentPriceIds);
  const maxRowId = db.prepare('SELECT COALESCE(MAX(rowid), 0) AS maxRowId FROM current_prices').get().maxRowId;
  const hasNormalizedColumns = (() => {
    const columns = getCurrentPriceColumnSet(db);
    return columns.has('normalized_price_cents') && columns.has('normalized_unit');
  })();

  const seededYieldCount = ensureYieldDataset(db);
  ensureDerivedSource(db);

  const canResume = options.resume !== false && currentPriceIds === null;
  const shouldResume =
    canResume &&
    checkpoint.status === 'running' &&
    Number(checkpoint.last_current_price_rowid || 0) > 0 &&
    Number(checkpoint.last_current_price_rowid || 0) < Number(maxRowId || 0);

  const initializeRun = db.transaction(() => {
    if (!shouldResume) {
      if (clearExistingTrueCosts) {
        db.prepare('DELETE FROM true_costs').run();
      }
      db.prepare(`
        UPDATE yield_normalizer_checkpoints
        SET last_current_price_rowid = 0,
            processed_count = 0,
            matched_count = 0,
            skipped_count = 0,
            status = 'running',
            last_error = NULL,
            updated_at = datetime('now')
        WHERE checkpoint_key = ?
      `).run(CHECKPOINT_KEY);
      return {
        lastRowId: 0,
        processedCount: 0,
        matchedCount: 0,
        skippedCount: 0,
      };
    }

    db.prepare(`
      UPDATE yield_normalizer_checkpoints
      SET status = 'running',
          last_error = NULL,
          updated_at = datetime('now')
      WHERE checkpoint_key = ?
    `).run(CHECKPOINT_KEY);

    return {
      lastRowId: Number(checkpoint.last_current_price_rowid || 0),
      processedCount: Number(checkpoint.processed_count || 0),
      matchedCount: Number(checkpoint.matched_count || 0),
      skippedCount: Number(checkpoint.skipped_count || 0),
    };
  });

  const state = initializeRun();
  const yieldProfiles = loadYieldProfiles(db);
  const upsertTrueCost = db.prepare(`
    INSERT INTO true_costs (
      current_price_id,
      source_id,
      canonical_ingredient_id,
      raw_price_cents,
      edible_yield_pct,
      cost_per_usable_unit_cents,
      calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(current_price_id) DO UPDATE SET
      source_id = excluded.source_id,
      canonical_ingredient_id = excluded.canonical_ingredient_id,
      raw_price_cents = excluded.raw_price_cents,
      edible_yield_pct = excluded.edible_yield_pct,
      cost_per_usable_unit_cents = excluded.cost_per_usable_unit_cents,
      calculated_at = excluded.calculated_at
  `);
  const updateCheckpoint = db.prepare(`
    UPDATE yield_normalizer_checkpoints
    SET last_current_price_rowid = ?,
        processed_count = ?,
        matched_count = ?,
        skipped_count = ?,
        status = ?,
        last_error = ?,
        updated_at = datetime('now')
    WHERE checkpoint_key = ?
  `);

  const persistBatch = db.transaction((results, nextState) => {
    for (const result of results) {
      upsertTrueCost.run(
        result.currentPriceId,
        result.sourceId,
        result.canonicalIngredientId,
        result.rawPriceCents,
        result.edibleYieldPct,
        result.costPerUsableUnitCents,
        result.calculatedAt
      );
    }

    updateCheckpoint.run(
      nextState.lastRowId,
      nextState.processedCount,
      nextState.matchedCount,
      nextState.skippedCount,
      'running',
      null,
      CHECKPOINT_KEY
    );
  });

  try {
    while (true) {
      const rows = selectBatchRows(db, hasNormalizedColumns, state.lastRowId, batchSize, currentPriceIds);
      if (rows.length === 0) break;

      const batchResults = [];
      for (const row of rows) {
        state.lastRowId = Number(row.current_price_rowid);
        state.processedCount += 1;

        const effectivePrice = resolveEffectivePrice(row);
        if (!effectivePrice) {
          state.skippedCount += 1;
          continue;
        }

        const yieldProfile = yieldProfiles.get(
          `${row.canonical_ingredient_id}::${effectivePrice.purchaseUnit}`
        );
        if (!yieldProfile || !Number.isFinite(yieldProfile.edibleYieldPct) || yieldProfile.edibleYieldPct <= 0) {
          state.skippedCount += 1;
          continue;
        }

        batchResults.push({
          currentPriceId: row.current_price_id,
          sourceId: row.source_id,
          canonicalIngredientId: row.canonical_ingredient_id,
          rawPriceCents: effectivePrice.rawPriceCents,
          edibleYieldPct: yieldProfile.edibleYieldPct,
          costPerUsableUnitCents: Math.round(
            effectivePrice.rawPriceCents / yieldProfile.edibleYieldPct
          ),
          calculatedAt: new Date().toISOString(),
        });
        state.matchedCount += 1;
      }

      await runWithRetry(
        () => persistBatch(batchResults, state),
        `batch ending at rowid ${state.lastRowId}`,
        logger
      );
    }

    updateCheckpoint.run(
      state.lastRowId,
      state.processedCount,
      state.matchedCount,
      state.skippedCount,
      'completed',
      null,
      CHECKPOINT_KEY
    );

    const samples = buildSamples(db, currentPriceIds);
    if (shouldLog) {
      logger.log(`[yield-normalizer] yield profiles seeded: ${seededYieldCount}`);
      logger.log(`[yield-normalizer] total price rows processed: ${state.processedCount}`);
      logger.log(`[yield-normalizer] total yield matches: ${state.matchedCount}`);
      logger.log(`[yield-normalizer] total skipped rows: ${state.skippedCount}`);
      logger.log('[yield-normalizer] sample computed rows:');
      if (samples.length === 0) {
        logger.log('  (no computed rows)');
      } else {
        for (const sample of samples) {
          logger.log(
            `  ${sample.name} | ${sample.source_id} | raw=${sample.raw_price_cents}c | ` +
              `yield=${sample.edible_yield_pct} | usable=${sample.cost_per_usable_unit_cents}c | ` +
              `${sample.raw_product_name}`
          );
        }
      }

      if (totalPriceRows === 0) {
        logger.log('[yield-normalizer] current_prices is empty in this local mirror.');
      }
    }

    return {
      seededYieldCount,
      totalPriceRows,
      processedCount: state.processedCount,
      matchedCount: state.matchedCount,
      skippedCount: state.skippedCount,
      samples,
    };
  } catch (error) {
    updateCheckpoint.run(
      state.lastRowId,
      state.processedCount,
      state.matchedCount,
      state.skippedCount,
      'failed',
      error.message,
      CHECKPOINT_KEY
    );
    throw error;
  }
}

function isDirectCliRun() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
}

if (isDirectCliRun()) {
  runYieldNormalizer().catch((error) => {
    console.error('[yield-normalizer] FATAL:', error.message);
    process.exit(1);
  });
}
