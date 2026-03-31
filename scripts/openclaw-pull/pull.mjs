#!/usr/bin/env node

/**
 * OpenClaw Pull Service
 *
 * Downloads the full SQLite database from the Pi, then upserts:
 *   catalog_stores   -> openclaw.stores
 *   catalog_products  -> openclaw.products
 *   catalog_store_products -> openclaw.store_products
 *
 * Run manually: node scripts/openclaw-pull/pull.mjs
 * Or via Windows Scheduled Task (hourly).
 */

import { writeFileSync, mkdirSync, statSync } from 'fs'
import config from './config.mjs'

let Database
try {
  const mod = await import('better-sqlite3')
  Database = mod.default
} catch {
  console.error('[openclaw-pull] better-sqlite3 not available.')
  console.error('  npm install --save-dev better-sqlite3')
  process.exit(1)
}

import postgres from 'postgres'

const BATCH_SIZE = 500

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

async function main() {
  const startedAt = new Date()
  log('Starting OpenClaw pull...')

  mkdirSync(config.tempDir, { recursive: true })

  // ── Step 1: Download SQLite ────────────────────────────────────────────
  log(`Fetching SQLite from http://${config.pi.host}:${config.pi.port}${config.pi.dbEndpoint}`)
  let buffer
  try {
    const res = await fetch(
      `http://${config.pi.host}:${config.pi.port}${config.pi.dbEndpoint}`,
      { signal: AbortSignal.timeout(config.pi.timeoutMs) }
    )
    if (!res.ok) throw new Error(`Pi returned ${res.status}: ${res.statusText}`)
    buffer = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    log(`ERROR: Pi unreachable - ${err.message}`)
    process.exit(1)
  }

  const dbPath = `${config.tempDir}/openclaw-latest.db`
  writeFileSync(dbPath, buffer)
  const fileSize = statSync(dbPath).size
  log(`Downloaded ${(fileSize / 1024 / 1024).toFixed(1)}MB SQLite database`)

  if (buffer.length < 100 || buffer.toString('utf8', 0, 16) !== 'SQLite format 3\0') {
    log('ERROR: Downloaded file is not a valid SQLite database')
    process.exit(1)
  }

  // ── Step 2: Open SQLite ────────────────────────────────────────────────
  const sqlite = new Database(dbPath, { readonly: true })
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name)
  log(`SQLite tables: ${tables.join(', ')}`)

  // ── Step 3: Connect to PostgreSQL ──────────────────────────────────────
  const sql = postgres(config.pg.connectionString)

  let storesSynced = 0
  let productsSynced = 0
  let pricesSynced = 0
  let errors = 0
  const errorDetails = []

  // ID maps: SQLite integer ID -> PostgreSQL UUID
  const storeIdMap = new Map()   // sqlite store.id -> pg store uuid
  const productIdMap = new Map() // sqlite product.id -> pg product uuid

  // ── Step 4: Sync chains from source_registry ───────────────────────────
  // Load chain slug -> PG UUID mapping (seeded by migration)
  const pgChains = await sql`SELECT id, slug FROM openclaw.chains`
  const chainSlugToUuid = new Map()
  for (const c of pgChains) chainSlugToUuid.set(c.slug, c.id)
  log(`PG chains loaded: ${chainSlugToUuid.size}`)

  // ── Step 5: Sync stores ────────────────────────────────────────────────
  if (tables.includes('catalog_stores')) {
    const stores = sqlite.prepare('SELECT * FROM catalog_stores WHERE is_active = 1').all()
    log(`Found ${stores.length} active stores in SQLite`)

    for (const store of stores) {
      try {
        const chainId = chainSlugToUuid.get(store.chain_slug)
        if (!chainId) {
          log(`  WARN: Unknown chain "${store.chain_slug}", skipping "${store.name}"`)
          continue
        }

        const rows = await sql`
          INSERT INTO openclaw.stores (
            chain_id, external_store_id, name, address, city, state, zip,
            lat, lng, phone, hours_json, last_cataloged_at
          ) VALUES (
            ${chainId}, ${store.external_store_id || String(store.id)},
            ${store.name}, ${store.address},
            ${store.city || 'Unknown'}, ${store.state || 'MA'}, ${store.zip || '00000'},
            ${store.lat}, ${store.lng}, ${store.phone},
            ${store.hours_json ? JSON.parse(store.hours_json) : null},
            ${store.last_cataloged_at ? new Date(store.last_cataloged_at) : null}
          )
          ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip = EXCLUDED.zip,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            phone = EXCLUDED.phone,
            hours_json = EXCLUDED.hours_json,
            last_cataloged_at = EXCLUDED.last_cataloged_at,
            updated_at = now()
          RETURNING id
        `
        storeIdMap.set(store.id, rows[0].id)
        storesSynced++
      } catch (err) {
        errors++
        if (errorDetails.length < 20) errorDetails.push(`Store "${store.name}": ${err.message}`)
      }
    }
    log(`Synced ${storesSynced} stores, mapped ${storeIdMap.size} IDs`)
  } else {
    log('WARN: No catalog_stores table in SQLite')
  }

  // ── Step 6: Sync products ──────────────────────────────────────────────
  if (tables.includes('catalog_products')) {
    const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM catalog_products').get().cnt
    log(`Found ${total} products in SQLite, syncing in batches of ${BATCH_SIZE}...`)

    // Category cache: slug -> PG UUID
    const categoryCache = new Map()

    let offset = 0
    while (offset < total) {
      const products = sqlite
        .prepare(`SELECT * FROM catalog_products LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
        .all()

      for (const product of products) {
        try {
          // Resolve category
          let categoryId = null
          if (product.category) {
            const catSlug = product.category
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')

            if (categoryCache.has(catSlug)) {
              categoryId = categoryCache.get(catSlug)
            } else {
              const catRows = await sql`
                INSERT INTO openclaw.product_categories (name, slug, department, is_food)
                VALUES (${product.category}, ${catSlug}, ${product.department || product.category}, ${product.is_food === 1})
                ON CONFLICT (slug) DO UPDATE SET
                  name = EXCLUDED.name,
                  department = EXCLUDED.department
                RETURNING id
              `
              categoryId = catRows[0]?.id ?? null
              if (categoryId) categoryCache.set(catSlug, categoryId)
            }
          }

          // Upsert product. Use UPC as conflict key when available, else name+brand.
          let pgProductId = null

          if (product.upc) {
            const rows = await sql`
              INSERT INTO openclaw.products (
                name, brand, upc, size, size_value, size_unit,
                category_id, image_url, is_organic, is_store_brand
              ) VALUES (
                ${product.name}, ${product.brand}, ${product.upc},
                ${product.size}, ${product.size_value}, ${product.size_unit},
                ${categoryId}, ${product.image_url},
                ${product.is_organic === 1}, ${product.is_store_brand === 1}
              )
              ON CONFLICT (upc) WHERE upc IS NOT NULL DO UPDATE SET
                name = EXCLUDED.name,
                brand = EXCLUDED.brand,
                size = EXCLUDED.size,
                size_value = EXCLUDED.size_value,
                size_unit = EXCLUDED.size_unit,
                category_id = EXCLUDED.category_id,
                image_url = EXCLUDED.image_url,
                is_organic = EXCLUDED.is_organic,
                is_store_brand = EXCLUDED.is_store_brand,
                updated_at = now()
              RETURNING id
            `
            pgProductId = rows[0]?.id
          }

          if (!pgProductId) {
            // No UPC or conflict on UPC didn't fire. Insert with gen UUID.
            const rows = await sql`
              INSERT INTO openclaw.products (
                name, brand, upc, size, size_value, size_unit,
                category_id, image_url, is_organic, is_store_brand
              ) VALUES (
                ${product.name}, ${product.brand}, ${product.upc},
                ${product.size}, ${product.size_value}, ${product.size_unit},
                ${categoryId}, ${product.image_url},
                ${product.is_organic === 1}, ${product.is_store_brand === 1}
              )
              ON CONFLICT DO NOTHING
              RETURNING id
            `
            pgProductId = rows[0]?.id

            // If DO NOTHING fired (duplicate), look it up
            if (!pgProductId && product.upc) {
              const existing = await sql`
                SELECT id FROM openclaw.products WHERE upc = ${product.upc} LIMIT 1
              `
              pgProductId = existing[0]?.id
            }
            if (!pgProductId) {
              // Last resort: match by name+brand
              const existing = await sql`
                SELECT id FROM openclaw.products
                WHERE name = ${product.name}
                  AND (brand = ${product.brand} OR (brand IS NULL AND ${product.brand} IS NULL))
                LIMIT 1
              `
              pgProductId = existing[0]?.id
            }
          }

          if (pgProductId) {
            productIdMap.set(product.id, pgProductId)
            productsSynced++
          }
        } catch (err) {
          errors++
          if (errorDetails.length < 20) errorDetails.push(`Product "${product.name}": ${err.message}`)
        }
      }

      offset += BATCH_SIZE
      if (offset % 5000 === 0) log(`  Products: ${offset}/${total}...`)
    }
    log(`Synced ${productsSynced} products, mapped ${productIdMap.size} IDs`)
  } else {
    log('WARN: No catalog_products table in SQLite')
  }

  // ── Step 7: Sync store_products (prices) ───────────────────────────────
  if (tables.includes('catalog_store_products')) {
    const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM catalog_store_products').get().cnt
    log(`Found ${total} store_products in SQLite, syncing...`)

    let skippedNoMap = 0
    let skippedZero = 0
    let offset = 0

    while (offset < total) {
      const rows = sqlite
        .prepare(`SELECT * FROM catalog_store_products LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
        .all()

      for (const sp of rows) {
        if (!sp.price_cents || sp.price_cents <= 0) {
          skippedZero++
          continue
        }

        const pgStoreId = storeIdMap.get(sp.store_id)
        const pgProductId = productIdMap.get(sp.product_id)

        if (!pgStoreId || !pgProductId) {
          skippedNoMap++
          continue
        }

        try {
          await sql`
            INSERT INTO openclaw.store_products (
              store_id, product_id, price_cents, sale_price_cents, sale_ends_at,
              in_stock, aisle, source, last_seen_at
            ) VALUES (
              ${pgStoreId}, ${pgProductId}, ${sp.price_cents},
              ${sp.sale_price_cents || null},
              ${sp.sale_ends_at ? new Date(sp.sale_ends_at) : null},
              ${sp.in_stock === 1}, ${sp.aisle}, ${sp.source || 'pull'},
              ${sp.last_seen_at ? new Date(sp.last_seen_at) : new Date()}
            )
            ON CONFLICT (store_id, product_id) DO UPDATE SET
              price_cents = EXCLUDED.price_cents,
              sale_price_cents = EXCLUDED.sale_price_cents,
              sale_ends_at = EXCLUDED.sale_ends_at,
              in_stock = EXCLUDED.in_stock,
              aisle = EXCLUDED.aisle,
              source = EXCLUDED.source,
              last_seen_at = EXCLUDED.last_seen_at
          `
          pricesSynced++
        } catch (err) {
          errors++
          if (errorDetails.length < 20) errorDetails.push(`Price store=${sp.store_id} prod=${sp.product_id}: ${err.message}`)
        }
      }

      offset += BATCH_SIZE
      if (offset % 10000 === 0) log(`  Prices: ${offset}/${total}...`)
    }

    log(`Synced ${pricesSynced} prices (skipped: ${skippedNoMap} unmapped, ${skippedZero} zero-price)`)
  } else {
    log('WARN: No catalog_store_products table in SQLite')
  }

  // ── Step 8: Log sync run ───────────────────────────────────────────────
  const finishedAt = new Date()
  const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)

  await sql`
    INSERT INTO openclaw.sync_runs (
      started_at, finished_at, sqlite_size_bytes,
      stores_synced, products_synced, prices_synced,
      errors, error_details, duration_seconds
    ) VALUES (
      ${startedAt}, ${finishedAt}, ${fileSize},
      ${storesSynced}, ${productsSynced}, ${pricesSynced},
      ${errors}, ${errorDetails.length > 0 ? errorDetails.join('\n') : null},
      ${durationSeconds}
    )
  `

  log(`\nDone in ${durationSeconds}s`)
  log(`  Stores:   ${storesSynced}`)
  log(`  Products: ${productsSynced}`)
  log(`  Prices:   ${pricesSynced}`)
  log(`  Errors:   ${errors}`)
  if (errorDetails.length > 0) {
    log(`  First errors:`)
    errorDetails.slice(0, 5).forEach((e) => log(`    ${e}`))
  }

  await sql.end()
  sqlite.close()
}

main().catch((err) => {
  console.error('[openclaw-pull] Fatal:', err.message)
  process.exit(1)
})
