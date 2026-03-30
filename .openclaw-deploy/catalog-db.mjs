/**
 * OpenClaw - Catalog Database Layer
 * New tables for full store inventory catalog (Phase 2-3 of inventory evolution).
 * These tables are ADDITIVE - they do not modify any existing tables.
 */

import { getDb } from './db.mjs';

/**
 * Initialize catalog tables. Safe to call multiple times (IF NOT EXISTS).
 */
export function initCatalogSchema(db) {
  if (!db) db = getDb();

  db.exec(`
    -- Physical store locations across NE
    CREATE TABLE IF NOT EXISTS catalog_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_slug TEXT NOT NULL,
      external_store_id TEXT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL,
      lat REAL,
      lng REAL,
      phone TEXT,
      hours_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_cataloged_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chain_slug, external_store_id)
    );

    CREATE INDEX IF NOT EXISTS idx_cs_chain ON catalog_stores(chain_slug);
    CREATE INDEX IF NOT EXISTS idx_cs_state ON catalog_stores(state);
    CREATE INDEX IF NOT EXISTS idx_cs_zip ON catalog_stores(zip);

    -- Every product (SKU) from any retailer
    CREATE TABLE IF NOT EXISTS catalog_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      upc TEXT,
      size TEXT,
      size_value REAL,
      size_unit TEXT,
      category TEXT,
      department TEXT,
      is_food INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      is_organic INTEGER DEFAULT 0,
      is_store_brand INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, brand, size)
    );

    CREATE INDEX IF NOT EXISTS idx_cprod_name ON catalog_products(name);
    CREATE INDEX IF NOT EXISTS idx_cprod_upc ON catalog_products(upc);
    CREATE INDEX IF NOT EXISTS idx_cprod_category ON catalog_products(category);
    CREATE INDEX IF NOT EXISTS idx_cprod_dept ON catalog_products(department);
    CREATE INDEX IF NOT EXISTS idx_cprod_food ON catalog_products(is_food);

    -- Price per product per store (the big table)
    CREATE TABLE IF NOT EXISTS catalog_store_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES catalog_stores(id),
      product_id INTEGER NOT NULL REFERENCES catalog_products(id),
      price_cents INTEGER NOT NULL,
      sale_price_cents INTEGER,
      sale_ends_at TEXT,
      in_stock INTEGER DEFAULT 1,
      aisle TEXT,
      source TEXT NOT NULL,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(store_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_csp_store ON catalog_store_products(store_id);
    CREATE INDEX IF NOT EXISTS idx_csp_product ON catalog_store_products(product_id);
    CREATE INDEX IF NOT EXISTS idx_csp_price ON catalog_store_products(price_cents);
    CREATE INDEX IF NOT EXISTS idx_csp_seen ON catalog_store_products(last_seen_at);

    -- Scrape run audit trail
    CREATE TABLE IF NOT EXISTS catalog_scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER REFERENCES catalog_stores(id),
      chain_slug TEXT,
      scraper_name TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'full',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      products_found INTEGER DEFAULT 0,
      products_updated INTEGER DEFAULT 0,
      products_new INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      error_details TEXT,
      duration_seconds INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_csr_store ON catalog_scrape_runs(store_id);
    CREATE INDEX IF NOT EXISTS idx_csr_date ON catalog_scrape_runs(started_at);
  `);

  console.log('[catalog-db] Schema initialized (4 tables)');
  return db;
}

/**
 * Upsert a store. Returns the store row (id included).
 */
export function upsertStore(db, { chainSlug, externalStoreId, name, address, city, state, zip, lat, lng, phone, hoursJson }) {
  const existing = db.prepare(
    'SELECT id FROM catalog_stores WHERE chain_slug = ? AND external_store_id = ?'
  ).get(chainSlug, externalStoreId);

  if (existing) {
    db.prepare(`
      UPDATE catalog_stores SET name = ?, address = ?, city = ?, state = ?, zip = ?,
        lat = COALESCE(?, lat), lng = COALESCE(?, lng), phone = COALESCE(?, phone),
        hours_json = COALESCE(?, hours_json), updated_at = datetime('now')
      WHERE id = ?
    `).run(name, address, city, state, zip, lat, lng, phone, hoursJson, existing.id);
    return { id: existing.id, isNew: false };
  }

  const result = db.prepare(`
    INSERT INTO catalog_stores (chain_slug, external_store_id, name, address, city, state, zip, lat, lng, phone, hours_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(chainSlug, externalStoreId, name, address, city, state, zip, lat, lng, phone, hoursJson);
  return { id: result.lastInsertRowid, isNew: true };
}

/**
 * Upsert a product. Returns the product row (id included).
 */
export function upsertProduct(db, { name, brand, upc, size, sizeValue, sizeUnit, category, department, isFood, imageUrl, isOrganic, isStoreBrand }) {
  const existing = db.prepare(
    'SELECT id FROM catalog_products WHERE name = ? AND brand IS ? AND size IS ?'
  ).get(name, brand || null, size || null);

  if (existing) {
    db.prepare(`
      UPDATE catalog_products SET
        upc = COALESCE(?, upc), category = COALESCE(?, category),
        department = COALESCE(?, department), is_food = COALESCE(?, is_food),
        image_url = COALESCE(?, image_url), is_organic = COALESCE(?, is_organic),
        is_store_brand = COALESCE(?, is_store_brand),
        size_value = COALESCE(?, size_value), size_unit = COALESCE(?, size_unit),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(upc, category, department, isFood ? 1 : 0, imageUrl, isOrganic ? 1 : 0, isStoreBrand ? 1 : 0, sizeValue, sizeUnit, existing.id);
    return { id: existing.id, isNew: false };
  }

  const result = db.prepare(`
    INSERT INTO catalog_products (name, brand, upc, size, size_value, size_unit, category, department, is_food, image_url, is_organic, is_store_brand)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, brand || null, upc || null, size || null, sizeValue || null, sizeUnit || null,
    category || null, department || null, isFood !== undefined ? (isFood ? 1 : 0) : 1,
    imageUrl || null, isOrganic ? 1 : 0, isStoreBrand ? 1 : 0);
  return { id: result.lastInsertRowid, isNew: true };
}

/**
 * Upsert a store-product price. Returns 'new', 'changed', or 'unchanged'.
 */
export function upsertStoreProduct(db, { storeId, productId, priceCents, salePriceCents, saleEndsAt, inStock, aisle, source }) {
  const now = new Date().toISOString();
  const existing = db.prepare(
    'SELECT id, price_cents FROM catalog_store_products WHERE store_id = ? AND product_id = ?'
  ).get(storeId, productId);

  if (!existing) {
    db.prepare(`
      INSERT INTO catalog_store_products (store_id, product_id, price_cents, sale_price_cents, sale_ends_at, in_stock, aisle, source, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(storeId, productId, priceCents, salePriceCents || null, saleEndsAt || null,
      inStock !== undefined ? (inStock ? 1 : 0) : 1, aisle || null, source, now);
    return 'new';
  }

  if (existing.price_cents !== priceCents) {
    db.prepare(`
      UPDATE catalog_store_products SET price_cents = ?, sale_price_cents = ?, sale_ends_at = ?,
        in_stock = ?, aisle = COALESCE(?, aisle), source = ?, last_seen_at = ?
      WHERE id = ?
    `).run(priceCents, salePriceCents || null, saleEndsAt || null,
      inStock !== undefined ? (inStock ? 1 : 0) : 1, aisle, source, now, existing.id);
    return 'changed';
  }

  db.prepare('UPDATE catalog_store_products SET last_seen_at = ?, in_stock = ? WHERE id = ?')
    .run(now, inStock !== undefined ? (inStock ? 1 : 0) : 1, existing.id);
  return 'unchanged';
}

/**
 * Start a scrape run, returns the run ID.
 */
export function startScrapeRun(db, { storeId, chainSlug, scraperName, scope }) {
  const result = db.prepare(`
    INSERT INTO catalog_scrape_runs (store_id, chain_slug, scraper_name, scope)
    VALUES (?, ?, ?, ?)
  `).run(storeId || null, chainSlug || null, scraperName, scope || 'full');
  return result.lastInsertRowid;
}

/**
 * Finish a scrape run with stats.
 */
export function finishScrapeRun(db, runId, { productsFound, productsUpdated, productsNew, errors, errorDetails }) {
  const run = db.prepare('SELECT started_at FROM catalog_scrape_runs WHERE id = ?').get(runId);
  const startMs = run ? new Date(run.started_at + 'Z').getTime() : Date.now();
  const durationSeconds = Math.round((Date.now() - startMs) / 1000);

  db.prepare(`
    UPDATE catalog_scrape_runs SET
      finished_at = datetime('now'), products_found = ?, products_updated = ?,
      products_new = ?, errors = ?, error_details = ?, duration_seconds = ?
    WHERE id = ?
  `).run(productsFound || 0, productsUpdated || 0, productsNew || 0,
    errors || 0, errorDetails || null, durationSeconds, runId);
}

export function getCatalogStats(db) {
  const stores = db.prepare('SELECT COUNT(*) as c FROM catalog_stores').get();
  const products = db.prepare('SELECT COUNT(*) as c FROM catalog_products').get();
  const storeProducts = db.prepare('SELECT COUNT(*) as c FROM catalog_store_products').get();
  const runs = db.prepare('SELECT COUNT(*) as c FROM catalog_scrape_runs').get();
  return {
    stores: stores.c,
    products: products.c,
    storeProducts: storeProducts.c,
    scrapeRuns: runs.c,
  };
}
