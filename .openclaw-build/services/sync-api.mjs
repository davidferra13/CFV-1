/**
 * OpenClaw Price Intelligence - Sync API
 * Simple HTTP server for PC to pull price data and view status.
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, getStats, DB_PATH, upsertPrice } from '../lib/db.mjs';
import { smartLookup, batchLookup, COMMON_ALIASES } from '../lib/smart-lookup.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8081;

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data, null, 2));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    const db = getDb();

    // Health check
    if (path === '/health') {
      return jsonResponse(res, { status: 'ok', timestamp: new Date().toISOString() });
    }

    // Database stats
    if (path === '/api/stats') {
      const stats = getStats(db);
      const lastScrape = db.prepare('SELECT MAX(last_scraped_at) as last FROM source_registry').get();
      return jsonResponse(res, {
        ...stats,
        lastScrapeAt: lastScrape?.last,
        dbPath: DB_PATH,
        timestamp: new Date().toISOString()
      });
    }

    // Download the SQLite database file (for PC sync)
    if (path === '/api/sync/database') {
      try {
        const dbFile = readFileSync(DB_PATH);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="prices.db"',
          'Content-Length': dbFile.length
        });
        return res.end(dbFile);
      } catch (err) {
        return jsonResponse(res, { error: 'Database file not found' }, 404);
      }
    }

    // Get all current prices (JSON)
    if (path === '/api/prices') {
      const tier = url.searchParams.get('tier'); // retail, wholesale, farm_direct
      const ingredient = url.searchParams.get('ingredient');
      const source = url.searchParams.get('source');
      const limit = parseInt(url.searchParams.get('limit') || '500');

      let query = `
        SELECT cp.*, ci.name as ingredient_name, ci.category, sr.name as source_name, sr.city, sr.state
        FROM current_prices cp
        JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
        JOIN source_registry sr ON cp.source_id = sr.source_id
        WHERE 1=1
      `;
      const params = [];

      if (tier) { query += ' AND cp.pricing_tier = ?'; params.push(tier); }
      if (ingredient) { query += ' AND (ci.name LIKE ? OR cp.canonical_ingredient_id LIKE ?)'; params.push(`%${ingredient}%`, `%${ingredient}%`); }
      if (source) { query += ' AND (sr.name LIKE ? OR cp.source_id LIKE ?)'; params.push(`%${source}%`, `%${source}%`); }

      query += ' ORDER BY ci.name, cp.price_cents ASC LIMIT ?';
      params.push(limit);

      const rows = db.prepare(query).all(...params);
      return jsonResponse(res, { count: rows.length, prices: rows });
    }

    // Get price for a specific ingredient across all sources
    if (path.startsWith('/api/prices/ingredient/')) {
      const ingredientId = path.split('/').pop();
      const rows = db.prepare(`
        SELECT cp.*, sr.name as source_name, sr.city, sr.state, sr.pricing_tier as source_tier
        FROM current_prices cp
        JOIN source_registry sr ON cp.source_id = sr.source_id
        WHERE cp.canonical_ingredient_id = ?
        ORDER BY cp.price_cents ASC
      `).all(ingredientId);

      const ingredient = db.prepare('SELECT * FROM canonical_ingredients WHERE ingredient_id = ?').get(ingredientId);

      return jsonResponse(res, {
        ingredient,
        priceCount: rows.length,
        prices: rows,
        cheapest: rows[0] || null,
        mostExpensive: rows[rows.length - 1] || null,
        avgCents: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.price_cents, 0) / rows.length) : null
      });
    }

    // Get all sources
    if (path === '/api/sources') {
      const rows = db.prepare('SELECT * FROM source_registry ORDER BY name').all();
      return jsonResponse(res, { count: rows.length, sources: rows });
    }

    // Get price changes (recent)
    if (path === '/api/changes') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const rows = db.prepare(`
        SELECT pc.*, ci.name as ingredient_name, sr.name as source_name
        FROM price_changes pc
        JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
        JOIN source_registry sr ON pc.source_id = sr.source_id
        ORDER BY pc.observed_at DESC
        LIMIT ?
      `).all(limit);
      return jsonResponse(res, { count: rows.length, changes: rows });
    }

    // Smart lookup - find an ingredient with price priority
    if (path === '/api/lookup') {
      const q = url.searchParams.get('q');
      if (!q) return jsonResponse(res, { error: 'Missing ?q= parameter' }, 400);

      const result = smartLookup(db, q);
      if (!result) return jsonResponse(res, { query: q, found: false, ingredient: null });

      // Get all prices for this ingredient
      const prices = db.prepare(`
        SELECT cp.price_cents, cp.price_unit, cp.raw_product_name, sr.name as source_name, sr.pricing_tier
        FROM current_prices cp
        JOIN source_registry sr ON cp.source_id = sr.source_id
        WHERE cp.canonical_ingredient_id = ?
        ORDER BY cp.price_cents ASC
      `).all(result.ingredient_id);

      return jsonResponse(res, {
        query: q,
        found: true,
        ingredient: {
          id: result.ingredient_id,
          name: result.name,
          category: result.category,
          bestPrice: result.best_price ? {
            cents: result.best_price,
            display: `$${(result.best_price / 100).toFixed(2)}`,
            unit: result.best_unit,
            store: result.best_store,
          } : null,
          priceCount: result.price_count,
          prices,
        }
      });
    }

    // Batch lookup - look up multiple items at once
    if (path === '/api/lookup/batch') {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const { items } = JSON.parse(body);
            if (!Array.isArray(items)) return jsonResponse(res, { error: 'items must be an array' }, 400);

            const results = {};
            for (const item of items.slice(0, 200)) {
              const result = smartLookup(db, item);
              results[item] = result ? {
                id: result.ingredient_id,
                name: result.name,
                category: result.category,
                bestPrice: result.best_price ? {
                  cents: result.best_price,
                  display: `$${(result.best_price / 100).toFixed(2)}`,
                  unit: result.best_unit,
                  store: result.best_store,
                } : null,
                priceCount: result.price_count,
              } : null;
            }

            return jsonResponse(res, { count: items.length, results });
          } catch (err) {
            return jsonResponse(res, { error: 'Invalid JSON body' }, 400);
          }
        });
        return; // async handler
      }
      return jsonResponse(res, { error: 'POST required with { items: ["chicken breast", "salmon", ...] }' }, 405);
    }

    // Enriched price lookup - used by ChefFlow sync (V2)
    // Returns normalized prices, all store variants, and trend data
    if (path === '/api/prices/enriched' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { items } = JSON.parse(body);
          if (!Array.isArray(items)) return jsonResponse(res, { error: 'items must be an array' }, 400);

          const results = {};

          // Unit normalization map
          const UNIT_NORM = {
            'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
            'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
            'gallon': 'gallon', 'gal': 'gallon',
            'dozen': 'dozen', 'doz': 'dozen',
            'each': 'each', 'ea': 'each', 'ct': 'each', 'count': 'each',
            'bunch': 'bunch', 'head': 'head', 'bag': 'bag', 'pint': 'pint',
            'quart': 'quart', 'qt': 'quart', 'liter': 'liter',
          };

          function normalizeUnit(unit) {
            if (!unit) return 'each';
            const lower = unit.toLowerCase().trim();
            return UNIT_NORM[lower] || lower;
          }

          // Price-per-standard-unit normalization
          function normalizeCents(cents, unit) {
            const u = normalizeUnit(unit);
            // Convert oz to lb equivalent for comparison
            if (u === 'oz') return Math.round(cents * 16);
            return cents;
          }

          for (const item of items.slice(0, 200)) {
            const result = smartLookup(db, item);
            if (!result) {
              results[item] = null;
              continue;
            }

            // Get ALL prices for this ingredient
            const allPrices = db.prepare(`
              SELECT cp.price_cents, cp.price_unit, cp.raw_product_name,
                     sr.name as source_name, sr.pricing_tier,
                     cp.last_confirmed_at, cp.source_id
              FROM current_prices cp
              JOIN source_registry sr ON cp.source_id = sr.source_id
              WHERE cp.canonical_ingredient_id = ?
              ORDER BY cp.price_cents ASC
            `).all(result.ingredient_id);

            // Build enriched price objects
            const enrichedPrices = allPrices.map(p => ({
              cents: p.price_cents,
              normalized_cents: normalizeCents(p.price_cents, p.price_unit),
              normalized_unit: normalizeUnit(p.price_unit),
              original_unit: p.price_unit || 'each',
              store: p.source_name,
              tier: p.pricing_tier || 'retail',
              confirmed_at: p.last_confirmed_at || new Date().toISOString(),
            }));

            // Best price = lowest normalized cents
            const bestPrice = enrichedPrices.length > 0
              ? enrichedPrices.reduce((a, b) => a.normalized_cents < b.normalized_cents ? a : b)
              : null;

            // Trend: compare current best to 7-day-old prices (if we have history)
            let trend = null;
            try {
              const weekAgo = db.prepare(`
                SELECT AVG(price_cents) as avg_price
                FROM price_changes
                WHERE canonical_ingredient_id = ?
                  AND observed_at >= datetime('now', '-14 days')
                  AND observed_at < datetime('now', '-7 days')
              `).get(result.ingredient_id);

              if (weekAgo?.avg_price && bestPrice) {
                const oldAvg = weekAgo.avg_price;
                const changePct = Math.round(((bestPrice.cents - oldAvg) / oldAvg) * 100);
                trend = {
                  direction: changePct > 2 ? 'up' : changePct < -2 ? 'down' : 'flat',
                  change_7d_pct: changePct,
                  change_30d_pct: null,
                };
              }
            } catch (e) {}

            results[item] = {
              canonical_id: result.ingredient_id,
              name: result.name,
              category: result.category || 'uncategorized',
              best_price: bestPrice,
              all_prices: enrichedPrices,
              trend,
              price_count: enrichedPrices.length,
            };
          }

          return jsonResponse(res, { results });
        } catch (err) {
          return jsonResponse(res, { error: 'Invalid JSON: ' + err.message }, 400);
        }
      });
      return;
    }

    // Catalog suggestion - ChefFlow feeds back unmatched ingredient names
    if (path === '/api/catalog/suggest' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { items } = JSON.parse(body);
          if (!Array.isArray(items)) return jsonResponse(res, { error: 'items must be an array' }, 400);

          let added = 0;
          for (const name of items.slice(0, 500)) {
            if (!name || typeof name !== 'string') continue;
            const ingredientId = name.toLowerCase().trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 80);

            if (!ingredientId) continue;

            try {
              db.prepare(`
                INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
                VALUES (?, ?, ?, ?)
              `).run(ingredientId, name.substring(0, 100), 'suggested', 'each');
              added++;
            } catch (e) {}
          }

          return jsonResponse(res, { received: items.length, added });
        } catch (err) {
          return jsonResponse(res, { error: 'Invalid JSON' }, 400);
        }
      });
      return;
    }

    // Shopping optimizer - find cheapest store combination for a list of ingredients
    if (path === '/api/optimize/shopping-list' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { items } = JSON.parse(body);
          if (!Array.isArray(items)) return jsonResponse(res, { error: 'items must be an array' }, 400);

          const ingredientPrices = [];
          const allStores = new Set();

          for (const item of items.slice(0, 100)) {
            const name = typeof item === 'string' ? item : item.name;
            if (!name) continue;

            const result = smartLookup(db, name);
            if (!result) {
              ingredientPrices.push({ name, found: false, prices: {} });
              continue;
            }

            const prices = db.prepare(`
              SELECT cp.price_cents, cp.price_unit, sr.name as store_name
              FROM current_prices cp
              JOIN source_registry sr ON cp.source_id = sr.source_id
              WHERE cp.canonical_ingredient_id = ?
              ORDER BY cp.price_cents ASC
            `).all(result.ingredient_id);

            const byStore = {};
            for (const p of prices) {
              allStores.add(p.store_name);
              if (!byStore[p.store_name] || p.price_cents < byStore[p.store_name]) {
                byStore[p.store_name] = p.price_cents;
              }
            }

            ingredientPrices.push({
              name,
              canonicalName: result.name,
              found: true,
              bestPrice: prices[0]?.price_cents || null,
              bestStore: prices[0]?.store_name || null,
              prices: byStore,
            });
          }

          // Single-store totals
          const storeNames = [...allStores];
          const singleStoreTotals = {};
          for (const store of storeNames) {
            let total = 0, missing = 0;
            for (const ing of ingredientPrices) {
              if (!ing.found) { missing++; continue; }
              if (ing.prices[store]) { total += ing.prices[store]; }
              else { missing++; }
            }
            singleStoreTotals[store] = { totalCents: total, missing, available: ingredientPrices.length - missing };
          }

          // Optimal multi-store split
          let optimalTotal = 0, optimalMissing = 0;
          const optimalList = [];
          for (const ing of ingredientPrices) {
            if (!ing.found || !ing.bestPrice) { optimalMissing++; continue; }
            optimalTotal += ing.bestPrice;
            optimalList.push({ name: ing.canonicalName || ing.name, priceCents: ing.bestPrice, store: ing.bestStore });
          }

          const ranked = Object.entries(singleStoreTotals)
            .filter(([, v]) => v.available > 0)
            .sort((a, b) => (a[1].totalCents / a[1].available) - (b[1].totalCents / b[1].available))
            .map(([store, data]) => ({
              store, totalCents: data.totalCents, totalDisplay: `$${(data.totalCents / 100).toFixed(2)}`,
              available: data.available, missing: data.missing,
            }));

          return jsonResponse(res, {
            itemCount: items.length,
            found: ingredientPrices.filter(i => i.found).length,
            notFound: ingredientPrices.filter(i => !i.found).length,
            optimal: {
              totalCents: optimalTotal, totalDisplay: `$${(optimalTotal / 100).toFixed(2)}`,
              missing: optimalMissing, items: optimalList,
              savings: ranked[0] ? ranked[0].totalCents - optimalTotal : 0,
            },
            singleStoreRanking: ranked,
          });
        } catch (err) {
          return jsonResponse(res, { error: 'Invalid JSON: ' + err.message }, 400);
        }
      });
      return;
    }

    // Price drop alerts
    if (path === '/api/alerts/price-drops') {
      const threshold = parseInt(url.searchParams.get('threshold') || '15');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      const alerts = db.prepare(`
        SELECT
          ci.ingredient_id, ci.name, ci.category,
          MIN(cp.price_cents) as current_best,
          (SELECT AVG(pc.new_price_cents)
           FROM price_changes pc
           WHERE pc.canonical_ingredient_id = ci.ingredient_id
             AND pc.observed_at >= datetime('now', '-30 days')
          ) as avg_30d,
          (SELECT sr.name FROM source_registry sr
           JOIN current_prices cp2 ON cp2.source_id = sr.source_id
           WHERE cp2.canonical_ingredient_id = ci.ingredient_id
           ORDER BY cp2.price_cents ASC LIMIT 1
          ) as cheapest_store
        FROM canonical_ingredients ci
        JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
        GROUP BY ci.ingredient_id
        HAVING avg_30d IS NOT NULL
          AND current_best < avg_30d * (1 - ? / 100.0)
        ORDER BY (avg_30d - current_best) * 100.0 / avg_30d DESC
        LIMIT ?
      `).all(threshold / 100, limit);

      const formatted = alerts.map(a => ({
        ingredientId: a.ingredient_id,
        name: a.name,
        category: a.category,
        currentBestCents: Math.round(a.current_best),
        avg30dCents: Math.round(a.avg_30d),
        dropPct: Math.round((a.avg_30d - a.current_best) * 100 / a.avg_30d),
        cheapestStore: a.cheapest_store,
      }));

      return jsonResponse(res, { threshold, count: formatted.length, alerts: formatted });
    }

    // Price freshness report
    if (path === '/api/freshness') {
      const report = db.prepare(`
        SELECT
          CASE
            WHEN julianday('now') - julianday(last_confirmed_at) <= 3 THEN 'current'
            WHEN julianday('now') - julianday(last_confirmed_at) <= 14 THEN 'recent'
            WHEN julianday('now') - julianday(last_confirmed_at) <= 30 THEN 'stale'
            ELSE 'expired'
          END as freshness,
          COUNT(*) as count
        FROM current_prices
        WHERE last_confirmed_at IS NOT NULL
        GROUP BY freshness
      `).all();

      const total = report.reduce((s, r) => s + r.count, 0);
      return jsonResponse(res, {
        total,
        breakdown: report,
        percentCurrent: total > 0 ? Math.round((report.find(r => r.freshness === 'current')?.count || 0) * 100 / total) : 0,
      });
    }

    // Get canonical ingredients list (with full filtering)
    if (path === '/api/ingredients') {
      const search = url.searchParams.get('search');
      const category = url.searchParams.get('category');
      const store = url.searchParams.get('store');
      const pricedOnly = url.searchParams.get('priced_only') === '1';
      const sort = url.searchParams.get('sort') || 'name'; // name, price, stores, updated
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '0'), 500);
      const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
      const offset = (page - 1) * (limit || 50);

      // Build query with optional price/store joins
      const needsPriceJoin = pricedOnly || store || sort === 'price' || sort === 'stores' || sort === 'updated';

      let countQuery, dataQuery;
      const countParams = [];
      const dataParams = [];

      if (needsPriceJoin) {
        // Join with current_prices and source_registry for filtering
        const baseFrom = `
          FROM canonical_ingredients ci
          LEFT JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
          LEFT JOIN source_registry sr ON cp.source_id = sr.source_id
        `;
        let where = ' WHERE 1=1';

        if (search) {
          where += ' AND (ci.name LIKE ? OR ci.ingredient_id LIKE ?)';
          countParams.push(`%${search}%`, `%${search}%`);
          dataParams.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
          where += ' AND ci.category = ?';
          countParams.push(category);
          dataParams.push(category);
        }
        if (store) {
          where += ' AND (sr.name LIKE ? OR cp.source_id LIKE ?)';
          countParams.push(`%${store}%`, `%${store}%`);
          dataParams.push(`%${store}%`, `%${store}%`);
        }
        if (pricedOnly) {
          where += ' AND cp.price_cents IS NOT NULL';
        }

        countQuery = `SELECT COUNT(DISTINCT ci.ingredient_id) as total ${baseFrom} ${where}`;

        let orderBy = ' ORDER BY ci.name';
        if (sort === 'price') orderBy = ' ORDER BY MIN(cp.price_cents) ASC NULLS LAST, ci.name';
        if (sort === 'stores') orderBy = ' ORDER BY COUNT(DISTINCT cp.source_id) DESC, ci.name';
        if (sort === 'updated') orderBy = ' ORDER BY MAX(cp.last_confirmed_at) DESC NULLS LAST, ci.name';

        dataQuery = `
          SELECT ci.ingredient_id, ci.name, ci.category, ci.standard_unit, ci.created_at,
                 MIN(cp.price_cents) as best_price_cents,
                 (SELECT sr2.name FROM current_prices cp2 JOIN source_registry sr2 ON cp2.source_id = sr2.source_id
                  WHERE cp2.canonical_ingredient_id = ci.ingredient_id ORDER BY cp2.price_cents ASC LIMIT 1) as best_price_store,
                 ci.standard_unit as best_price_unit,
                 COUNT(DISTINCT cp.source_id) as price_count,
                 MAX(cp.last_confirmed_at) as last_updated
          ${baseFrom} ${where}
          GROUP BY ci.ingredient_id
          ${orderBy}
        `;
      } else {
        // Simple query without joins
        let where = '';
        if (search) {
          where = ' WHERE (name LIKE ? OR ingredient_id LIKE ?)';
          countParams.push(`%${search}%`, `%${search}%`);
          dataParams.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
          where += (where ? ' AND' : ' WHERE') + ' category = ?';
          countParams.push(category);
          dataParams.push(category);
        }

        countQuery = `SELECT COUNT(*) as total FROM canonical_ingredients ${where}`;
        dataQuery = `SELECT *, NULL as best_price_cents, NULL as best_price_store, NULL as best_price_unit, 0 as price_count, NULL as last_updated FROM canonical_ingredients ${where} ORDER BY name`;
      }

      const totalRow = db.prepare(countQuery).get(...countParams);
      const total = totalRow?.total || 0;

      if (limit > 0) {
        dataQuery += ' LIMIT ? OFFSET ?';
        dataParams.push(limit, offset);
      }

      const rows = db.prepare(dataQuery).all(...dataParams);

      return jsonResponse(res, {
        count: rows.length,
        total,
        page: limit > 0 ? page : 1,
        pages: limit > 0 ? Math.ceil(total / limit) : 1,
        ingredients: rows.map(r => ({
          ingredient_id: r.ingredient_id,
          name: r.name,
          category: r.category,
          standard_unit: r.standard_unit,
          created_at: r.created_at,
          best_price_cents: r.best_price_cents || null,
          best_price_store: r.best_price_store || null,
          best_price_unit: r.best_price_unit || r.standard_unit,
          price_count: r.price_count || 0,
          last_updated: r.last_updated || null,
        })),
      });
    }

    // Simple status page (HTML)
    if (path === '/' || path === '/dashboard') {
      const stats = getStats(db);
      const recentPrices = db.prepare(`
        SELECT ci.name, cp.price_cents, cp.price_unit, sr.name as source_name, cp.last_confirmed_at
        FROM current_prices cp
        JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
        JOIN source_registry sr ON cp.source_id = sr.source_id
        ORDER BY cp.last_confirmed_at DESC
        LIMIT 25
      `).all();

      const priceRows = recentPrices.map(p =>
        `<tr><td>${p.name}</td><td>$${(p.price_cents / 100).toFixed(2)}/${p.price_unit}</td><td>${p.source_name}</td><td>${p.last_confirmed_at || '-'}</td></tr>`
      ).join('\n');

      const html = `<!DOCTYPE html>
<html><head><title>OpenClaw Price Intelligence</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0a0a0a; color: #e0e0e0; }
  h1 { color: #4ade80; } h2 { color: #a78bfa; margin-top: 30px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #333; }
  th { color: #a78bfa; font-weight: 600; }
  .stat { display: inline-block; background: #1a1a2e; padding: 15px 25px; border-radius: 8px; margin: 5px; }
  .stat .num { font-size: 28px; font-weight: bold; color: #4ade80; }
  .stat .label { font-size: 12px; color: #888; text-transform: uppercase; }
</style>
</head><body>
<h1>OpenClaw Price Intelligence</h1>
<div>
  <div class="stat"><div class="num">${stats.sources}</div><div class="label">Sources</div></div>
  <div class="stat"><div class="num">${stats.canonicalIngredients}</div><div class="label">Ingredients</div></div>
  <div class="stat"><div class="num">${stats.currentPrices}</div><div class="label">Current Prices</div></div>
  <div class="stat"><div class="num">${stats.priceChanges}</div><div class="label">Changes Logged</div></div>
</div>
<h2>Recent Prices</h2>
<table><tr><th>Ingredient</th><th>Price</th><th>Source</th><th>Updated</th></tr>
${priceRows}
</table>
<h2>API Endpoints</h2>
<ul>
  <li><a href="/api/stats">/api/stats</a> - Database statistics</li>
  <li><a href="/api/prices">/api/prices</a> - All current prices (?ingredient=chicken&tier=retail)</li>
  <li><a href="/api/prices/ingredient/eggs-large">/api/prices/ingredient/{id}</a> - Price for one ingredient across sources</li>
  <li><a href="/api/sources">/api/sources</a> - All sources in registry</li>
  <li><a href="/api/changes">/api/changes</a> - Recent price changes</li>
  <li><a href="/api/ingredients">/api/ingredients</a> - Canonical ingredient list (?search=chicken)</li>
  <li><strong><a href="/api/lookup?q=chicken+breast">/api/lookup?q=</a> - Smart lookup (alias-aware, price-prioritized)</strong></li>
  <li><a href="/api/sync/database">/api/sync/database</a> - Download SQLite database file</li>
</ul>
</body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    }

    // Enriched price lookup - full context for ChefFlow sync (Phase 3)
    if (path === '/api/prices/enriched' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const start = Date.now();
          const { items } = JSON.parse(body);
          if (!Array.isArray(items)) return jsonResponse(res, { error: 'items must be an array' }, 400);

          const results = {};
          for (const item of items.slice(0, 500)) {
            results[item] = smartLookupEnriched(db, item);
          }

          return jsonResponse(res, {
            results,
            lookup_ms: Date.now() - start,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          return jsonResponse(res, { error: 'Invalid JSON body: ' + err.message }, 400);
        }
      });
      return;
    }

    // Catalog suggest - add unmatched ingredient names for catalog growth (Phase 3.5)
    if (path === '/api/catalog/suggest' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { items } = JSON.parse(body);
          if (!Array.isArray(items)) return jsonResponse(res, { error: 'items must be an array' }, 400);

          let added = 0;
          let skipped = 0;

          for (const name of items.slice(0, 500)) {
            if (!name || typeof name !== 'string' || name.trim().length < 2) {
              skipped++;
              continue;
            }

            const slug = name.toLowerCase().trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 80);

            if (!slug) { skipped++; continue; }

            // Check if already exists
            const existing = db.prepare('SELECT 1 FROM canonical_ingredients WHERE ingredient_id = ?').get(slug);
            if (existing) {
              skipped++;
              continue;
            }

            // Insert as unpriced, uncategorized entry
            try {
              db.prepare(`
                INSERT INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
                VALUES (?, ?, 'uncategorized', 'each')
              `).run(slug, name.trim().substring(0, 100));
              added++;
            } catch {
              skipped++; // duplicate or constraint violation
            }
          }

          const totalCatalog = db.prepare('SELECT COUNT(*) as count FROM canonical_ingredients').get();
          return jsonResponse(res, {
            added,
            skipped,
            total_catalog: totalCatalog.count,
          });
        } catch (err) {
          return jsonResponse(res, { error: 'Invalid JSON body: ' + err.message }, 400);
        }
      });
      return;
    }

    // Batch import prices (from Windows scraper)
    if (path === '/api/prices/batch' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { prices } = JSON.parse(body);
          if (!Array.isArray(prices)) return jsonResponse(res, { error: 'prices must be an array' }, 400);

          const cachedMappings = loadCachedMappings(db);

          let imported = 0, skipped = 0, errors = 0;

          // Ensure source exists
          const ensureSource = db.prepare(`
            INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, has_online_pricing, pricing_tier, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const seenSources = new Set();

          for (const p of prices) {
            try {
              if (!p.rawProductName || !p.priceCents) { skipped++; continue; }

              // Ensure source
              if (!seenSources.has(p.sourceId)) {
                ensureSource.run(
                  p.sourceId, p.sourceId, 'instacart_api', p.sourceId.replace('-instacart', ''),
                  'MA', 'instacart_catalog', 1, p.pricingTier || 'retail', 'active',
                  `Imported from Windows Playwright scraper. Markup adjustment: ${p.instacartMarkupPct || 0}%`
                );
                seenSources.add(p.sourceId);
              }

              // Normalize product name to canonical ingredient
              const normalized = normalizeByRules(p.rawProductName, cachedMappings);
              let ingredientId;

              if (normalized) {
                ingredientId = normalized.ingredientId;
                saveMapping(db, p.rawProductName, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);
              } else {
                // Create a raw ingredient entry
                ingredientId = p.rawProductName.toLowerCase().trim()
                  .replace(/[^a-z0-9\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/-+/g, '-')
                  .substring(0, 80);

                if (!ingredientId) { skipped++; continue; }

                db.prepare(`
                  INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
                  VALUES (?, ?, ?, ?)
                `).run(ingredientId, p.rawProductName.substring(0, 100), 'uncategorized', p.priceUnit || 'each');
              }

              const result = upsertPrice(db, {
                sourceId: p.sourceId,
                canonicalIngredientId: ingredientId,
                variantId: null,
                rawProductName: p.rawProductName,
                priceCents: p.priceCents,
                priceUnit: p.priceUnit || 'each',
                pricePerStandardUnitCents: p.priceCents,
                standardUnit: p.priceUnit || 'each',
                packageSize: p.packageSize || null,
                priceType: p.priceType || 'regular',
                pricingTier: p.pricingTier || 'retail',
                confidence: p.confidence || 'instacart_catalog',
                instacartMarkupPct: p.instacartMarkupPct || null,
                sourceUrl: null,
              });

              imported++;
            } catch (err) {
              errors++;
            }
          }

          return jsonResponse(res, { imported, skipped, errors, total: prices.length });
        } catch (err) {
          return jsonResponse(res, { error: 'Invalid JSON: ' + err.message }, 400);
        }
      });
      return;
    }

    // Single price import
    if (path === '/api/price' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const price = JSON.parse(body);
          // Redirect to batch with single item
          const batchReq = { ...req, url: '/api/prices/batch', method: 'POST' };
          return jsonResponse(res, { status: 'use /api/prices/batch with { prices: [...] }' }, 200);
        } catch (err) {
          return jsonResponse(res, { error: err.message }, 400);
        }
      });
      return;
    }

    // 404
    jsonResponse(res, { error: 'Not found' }, 404);

  } catch (err) {
    console.error('Request error:', err);
    jsonResponse(res, { error: err.message }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenClaw Sync API running on http://0.0.0.0:${PORT}`);
  console.log(`Dashboard: http://10.0.0.177:${PORT}/dashboard`);
  console.log(`Sync endpoint: http://10.0.0.177:${PORT}/api/sync/database`);
});
