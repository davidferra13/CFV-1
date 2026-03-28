/**
 * OpenClaw Price Intelligence - Database Layer
 * SQLite database for current prices, change log, and source registry.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, 'prices.db');

let _db = null;

export function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    -- Source Registry: every place that sells food
    CREATE TABLE IF NOT EXISTS source_registry (
      source_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      chain_id TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      lat REAL,
      lon REAL,
      website TEXT,
      phone TEXT,
      scrape_method TEXT NOT NULL DEFAULT 'none',
      scrape_url TEXT,
      has_online_pricing INTEGER DEFAULT 0,
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      loyalty_card_available INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      discovery_source TEXT,
      last_scraped_at TEXT,
      last_discovery_check_at TEXT,
      scrape_interval_days INTEGER DEFAULT 4,
      scrape_failures_consecutive INTEGER DEFAULT 0,
      instacart_markup_pct REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Canonical Ingredients: the master list
    CREATE TABLE IF NOT EXISTS canonical_ingredients (
      ingredient_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      standard_unit TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Ingredient Variants
    CREATE TABLE IF NOT EXISTS ingredient_variants (
      variant_id TEXT PRIMARY KEY,
      ingredient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (ingredient_id) REFERENCES canonical_ingredients(ingredient_id)
    );

    -- Current Snapshot: latest known price per product per source
    CREATE TABLE IF NOT EXISTS current_prices (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      raw_product_name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      price_unit TEXT NOT NULL,
      price_per_standard_unit_cents INTEGER,
      standard_unit TEXT,
      package_size TEXT,
      price_type TEXT NOT NULL DEFAULT 'regular',
      sale_start_date TEXT,
      sale_end_date TEXT,
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      confidence TEXT NOT NULL DEFAULT 'government_baseline',
      instacart_markup_applied_pct REAL,
      source_url TEXT,
      last_confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES source_registry(source_id),
      FOREIGN KEY (canonical_ingredient_id) REFERENCES canonical_ingredients(ingredient_id)
    );

    CREATE INDEX IF NOT EXISTS idx_cp_ingredient ON current_prices(canonical_ingredient_id);
    CREATE INDEX IF NOT EXISTS idx_cp_source ON current_prices(source_id);
    CREATE INDEX IF NOT EXISTS idx_cp_tier ON current_prices(pricing_tier);

    -- Change Log: records only actual price changes
    CREATE TABLE IF NOT EXISTS price_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      old_price_cents INTEGER,
      new_price_cents INTEGER NOT NULL,
      price_unit TEXT NOT NULL,
      price_type TEXT NOT NULL DEFAULT 'regular',
      pricing_tier TEXT NOT NULL DEFAULT 'retail',
      change_pct REAL,
      observed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pc_ingredient_date ON price_changes(canonical_ingredient_id, observed_at);
    CREATE INDEX IF NOT EXISTS idx_pc_source_date ON price_changes(source_id, observed_at);

    -- Normalization mappings: cached rule + model results
    CREATE TABLE IF NOT EXISTS normalization_map (
      raw_name TEXT PRIMARY KEY,
      canonical_ingredient_id TEXT NOT NULL,
      variant_id TEXT,
      method TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      confirmed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (canonical_ingredient_id) REFERENCES canonical_ingredients(ingredient_id)
    );
  `);
}

/**
 * Upsert a price into current_prices. Returns 'new', 'changed', or 'unchanged'.
 */
export function upsertPrice(db, {
  sourceId, canonicalIngredientId, variantId, rawProductName,
  priceCents, priceUnit, pricePerStandardUnitCents, standardUnit,
  packageSize, priceType, pricingTier, confidence,
  instacartMarkupPct, sourceUrl, saleDates
}) {
  const id = `${sourceId}:${canonicalIngredientId}:${variantId || 'default'}`;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT price_cents FROM current_prices WHERE id = ?').get(id);

  if (!existing) {
    // New product
    db.prepare(`
      INSERT INTO current_prices (
        id, source_id, canonical_ingredient_id, variant_id, raw_product_name,
        price_cents, price_unit, price_per_standard_unit_cents, standard_unit,
        package_size, price_type, pricing_tier, confidence,
        instacart_markup_applied_pct, source_url,
        sale_start_date, sale_end_date,
        last_confirmed_at, last_changed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sourceId, canonicalIngredientId, variantId, rawProductName,
      priceCents, priceUnit, pricePerStandardUnitCents, standardUnit,
      packageSize, priceType || 'regular', pricingTier || 'retail', confidence,
      instacartMarkupPct, sourceUrl,
      saleDates?.start || null, saleDates?.end || null,
      now, now, now
    );

    // Log the change
    db.prepare(`
      INSERT INTO price_changes (source_id, canonical_ingredient_id, variant_id, old_price_cents, new_price_cents, price_unit, price_type, pricing_tier, observed_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
    `).run(sourceId, canonicalIngredientId, variantId, priceCents, priceUnit, priceType || 'regular', pricingTier || 'retail', now);

    return 'new';
  }

  if (existing.price_cents !== priceCents) {
    // Price changed
    const changePct = existing.price_cents > 0
      ? ((priceCents - existing.price_cents) / existing.price_cents) * 100
      : null;

    db.prepare(`
      UPDATE current_prices SET
        price_cents = ?, raw_product_name = ?,
        price_per_standard_unit_cents = ?, package_size = ?,
        price_type = ?, confidence = ?,
        instacart_markup_applied_pct = ?, source_url = ?,
        sale_start_date = ?, sale_end_date = ?,
        last_confirmed_at = ?, last_changed_at = ?
      WHERE id = ?
    `).run(
      priceCents, rawProductName,
      pricePerStandardUnitCents, packageSize,
      priceType || 'regular', confidence,
      instacartMarkupPct, sourceUrl,
      saleDates?.start || null, saleDates?.end || null,
      now, now, id
    );

    // Log the change
    db.prepare(`
      INSERT INTO price_changes (source_id, canonical_ingredient_id, variant_id, old_price_cents, new_price_cents, price_unit, price_type, pricing_tier, change_pct, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sourceId, canonicalIngredientId, variantId, existing.price_cents, priceCents, priceUnit, priceType || 'regular', pricingTier || 'retail', changePct, now);

    return 'changed';
  }

  // Price unchanged - just update confirmation timestamp
  db.prepare('UPDATE current_prices SET last_confirmed_at = ? WHERE id = ?').run(now, id);
  return 'unchanged';
}

export function getStats(db) {
  const sources = db.prepare('SELECT COUNT(*) as count FROM source_registry').get();
  const ingredients = db.prepare('SELECT COUNT(*) as count FROM canonical_ingredients').get();
  const prices = db.prepare('SELECT COUNT(*) as count FROM current_prices').get();
  const changes = db.prepare('SELECT COUNT(*) as count FROM price_changes').get();
  const normMaps = db.prepare('SELECT COUNT(*) as count FROM normalization_map').get();

  return {
    sources: sources.count,
    canonicalIngredients: ingredients.count,
    currentPrices: prices.count,
    priceChanges: changes.count,
    normalizationMappings: normMaps.count
  };
}

export { DB_PATH, DATA_DIR };
