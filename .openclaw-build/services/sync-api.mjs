/**
 * OpenClaw Price Intelligence - Sync API
 * Simple HTTP server for PC to pull price data and view status.
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, getStats, DB_PATH } from '../lib/db.mjs';
import { smartLookup, batchLookup, COMMON_ALIASES } from '../lib/smart-lookup.mjs';

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

    // Get canonical ingredients list
    if (path === '/api/ingredients') {
      const search = url.searchParams.get('search');
      let query = 'SELECT * FROM canonical_ingredients';
      const params = [];

      if (search) {
        query += ' WHERE name LIKE ? OR ingredient_id LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY name';

      const rows = db.prepare(query).all(...params);
      return jsonResponse(res, { count: rows.length, ingredients: rows });
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
