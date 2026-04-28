/**
 * Synthesis API Routes
 * Add to the OpenClaw dashboard server (port 8090).
 * Exposes all synthesis tables as JSON endpoints for ChefFlow to pull.
 *
 * Usage: import { initSynthesisRoutes } from './synthesis-routes.mjs';
 *        initSynthesisRoutes(app, openDb);
 */

export function initSynthesisRoutes(app, openDb, Database) {

  // === Anomaly Alerts ===
  // GET /api/synthesis/anomalies?severity=3&food_only=1&limit=100
  app.get('/api/synthesis/anomalies', function(req, res) {
    try {
      const db = openDb();
      const severity = parseInt(req.query.severity) || 3;
      const foodOnly = req.query.food_only !== '0';
      const limit = Math.min(parseInt(req.query.limit) || 100, 500);
      const unsyncedOnly = req.query.unsynced === '1';

      let sql = `SELECT * FROM synthesis_anomaly_alerts WHERE severity >= ?`;
      const params = [severity];

      if (foodOnly) { sql += ' AND is_food = 1'; }
      if (unsyncedOnly) { sql += ' AND synced_to_chefflow = 0'; }
      sql += ` AND (expires_at IS NULL OR expires_at > datetime('now'))`;
      sql += ' ORDER BY severity DESC, created_at DESC';

      const rows = db.prepare(sql).all(...params).slice(0, limit);
      db.close();

      res.json({ data: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mark anomalies as synced
  app.post('/api/synthesis/anomalies/mark-synced', function(req, res) {
    try {
      const ids = req.body.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array required' });
      }
      // openDb() returns readonly; open writable for updates
      const readDb = openDb();
      const dbPath = readDb.name;
      readDb.close();

      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('busy_timeout = 30000');

      const placeholders = ids.map(() => '?').join(',');
      const result = db.prepare(
        `UPDATE synthesis_anomaly_alerts SET synced_to_chefflow = 1 WHERE id IN (${placeholders})`
      ).run(...ids);
      db.close();

      res.json({ updated: result.changes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Seasonal Scores ===
  // GET /api/synthesis/seasonal?month=4&status=peak_season&limit=200
  app.get('/api/synthesis/seasonal', function(req, res) {
    try {
      const db = openDb();
      const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
      const status = req.query.status;
      const limit = Math.min(parseInt(req.query.limit) || 200, 1000);

      let sql = `SELECT * FROM synthesis_seasonal_scores WHERE month = ?`;
      const params = [month];

      if (status) { sql += ' AND status = ?'; params.push(status); }
      sql += ' ORDER BY value_score DESC';

      const rows = db.prepare(sql).all(...params).slice(0, limit);
      db.close();

      res.json({ data: rows, count: rows.length, month });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Store Rankings ===
  // GET /api/synthesis/store-rankings?ingredient=salmon&top=5
  app.get('/api/synthesis/store-rankings', function(req, res) {
    try {
      const db = openDb();
      const ingredient = req.query.ingredient;
      const top = Math.min(parseInt(req.query.top) || 5, 20);

      let sql, params;
      if (ingredient) {
        sql = `SELECT * FROM synthesis_store_rankings
               WHERE ingredient_name LIKE ? AND rank <= ?
               ORDER BY ingredient_name, rank`;
        params = [`%${ingredient}%`, top];
      } else {
        sql = `SELECT * FROM synthesis_store_rankings
               WHERE rank <= ?
               ORDER BY ingredient_name, rank`;
        params = [top];
      }

      const rows = db.prepare(sql).all(...params);
      db.close();

      res.json({ data: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Price Velocity ===
  // GET /api/synthesis/velocity?status=spiking&limit=50
  app.get('/api/synthesis/velocity', function(req, res) {
    try {
      const db = openDb();
      const status = req.query.status;
      const limit = Math.min(parseInt(req.query.limit) || 50, 500);

      let sql = `SELECT * FROM synthesis_price_velocity`;
      const params = [];

      if (status) { sql += ' WHERE status = ?'; params.push(status); }
      sql += ' ORDER BY stability_score ASC';

      const rows = db.prepare(sql).all(...params).slice(0, limit);
      db.close();

      res.json({ data: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Recall Alerts ===
  // GET /api/synthesis/recalls?severity=critical
  app.get('/api/synthesis/recalls', function(req, res) {
    try {
      const db = openDb();
      const severity = req.query.severity;

      let sql = `SELECT * FROM synthesis_recall_alerts
                 WHERE expires_at IS NULL OR expires_at > datetime('now')`;
      const params = [];

      if (severity) { sql += ' AND severity = ?'; params.push(severity); }
      sql += ' ORDER BY created_at DESC';

      const rows = db.prepare(sql).all(...params);
      db.close();

      res.json({ data: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Category Benchmarks ===
  // GET /api/synthesis/benchmarks
  app.get('/api/synthesis/benchmarks', function(req, res) {
    try {
      const db = openDb();
      const rows = db.prepare(`
        SELECT * FROM synthesis_category_benchmarks
        ORDER BY sample_size DESC
      `).all();
      db.close();

      // Compute total dinner index
      const dinnerIndex = rows.reduce((s, r) => s + (r.dinner_index_cents || 0), 0);

      res.json({ data: rows, count: rows.length, dinner_index_cents: dinnerIndex });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Substitutions ===
  // GET /api/synthesis/substitutions?ingredient=salmon&limit=10
  app.get('/api/synthesis/substitutions', function(req, res) {
    try {
      const db = openDb();
      const ingredient = req.query.ingredient;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);

      let sql, params;
      if (ingredient) {
        sql = `SELECT * FROM synthesis_substitutions
               WHERE ingredient_name LIKE ? AND confidence >= 0.5
               ORDER BY confidence DESC, price_delta_pct ASC`;
        params = [`%${ingredient}%`];
      } else {
        sql = `SELECT * FROM synthesis_substitutions
               WHERE confidence >= 0.6
               ORDER BY confidence DESC, price_delta_pct ASC`;
        params = [];
      }

      const rows = db.prepare(sql).all(...params).slice(0, limit);
      db.close();

      res.json({ data: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Local Markets ===
  // GET /api/synthesis/markets?lat=42.7&lng=-71.1&radius=50&open_only=1
  app.get('/api/synthesis/markets', function(req, res) {
    try {
      const db = openDb();
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = parseFloat(req.query.radius) || 50; // km
      const openOnly = req.query.open_only !== '0';

      let sql, params;
      if (!isNaN(lat) && !isNaN(lng)) {
        // Haversine approximation for nearby markets
        const latDelta = radius / 111; // ~111km per degree
        const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

        sql = `SELECT *,
               (ABS(lat - ?) + ABS(lng - ?)) as sort_dist
               FROM synthesis_local_markets
               WHERE lat BETWEEN ? AND ?
               AND lng BETWEEN ? AND ?`;
        params = [lat, lng, lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta];

        if (openOnly) { sql += ' AND is_open_this_week = 1'; }
        sql += ' ORDER BY sort_dist ASC';
      } else {
        sql = `SELECT * FROM synthesis_local_markets`;
        params = [];
        if (openOnly) { sql += ' WHERE is_open_this_week = 1'; }
        sql += ' ORDER BY product_count DESC';
      }

      const rows = db.prepare(sql).all(...params).slice(0, 100);
      db.close();

      res.json({ data: rows, count: rows.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Bulk Export (for nightly sync) ===
  // GET /api/synthesis/export?tables=all
  app.get('/api/synthesis/export', function(req, res) {
    try {
      const db = openDb();
      const tables = (req.query.tables || 'all').split(',');

      const result = {};
      const EXPORTS = {
        anomalies: `SELECT * FROM synthesis_anomaly_alerts WHERE is_food = 1 AND severity >= 3 AND synced_to_chefflow = 0 AND (expires_at IS NULL OR expires_at > datetime('now'))`,
        seasonal: `SELECT * FROM synthesis_seasonal_scores WHERE updated_at > datetime('now', '-2 days')`,
        store_rankings: `SELECT * FROM synthesis_store_rankings WHERE rank <= 5`,
        velocity: `SELECT * FROM synthesis_price_velocity`,
        recalls: `SELECT * FROM synthesis_recall_alerts WHERE synced_to_chefflow = 0`,
        benchmarks: `SELECT * FROM synthesis_category_benchmarks`,
        substitutions: `SELECT * FROM synthesis_substitutions WHERE confidence >= 0.5`,
        markets: `SELECT * FROM synthesis_local_markets WHERE is_open_this_week = 1`,
      };

      for (const [name, sql] of Object.entries(EXPORTS)) {
        if (tables[0] !== 'all' && !tables.includes(name)) continue;
        try { result[name] = db.prepare(sql).all(); }
        catch (e) { result[name] = { error: e.message }; }
      }

      db.close();

      result._meta = {
        exported_at: new Date().toISOString(),
        counts: Object.fromEntries(
          Object.entries(result)
            .filter(([k]) => k !== '_meta')
            .map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        ),
      };

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // === Summary Dashboard ===
  // GET /api/synthesis/summary
  app.get('/api/synthesis/summary', function(req, res) {
    try {
      const db = openDb();

      const summary = {
        anomalies: db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN severity >= 4 THEN 1 ELSE 0 END) as high_severity FROM synthesis_anomaly_alerts WHERE is_food = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))`).get(),
        seasonal: db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'peak_season' THEN 1 ELSE 0 END) as in_season FROM synthesis_seasonal_scores WHERE month = ?`).get(new Date().getMonth() + 1),
        velocity: db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'spiking' THEN 1 ELSE 0 END) as spiking, SUM(CASE WHEN status = 'volatile' THEN 1 ELSE 0 END) as volatile FROM synthesis_price_velocity`).get(),
        recalls: db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical FROM synthesis_recall_alerts`).get(),
        benchmarks: db.prepare(`SELECT COUNT(*) as categories FROM synthesis_category_benchmarks`).get(),
        substitutions: db.prepare(`SELECT COUNT(*) as total FROM synthesis_substitutions WHERE confidence >= 0.5`).get(),
        markets: db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN is_open_this_week = 1 THEN 1 ELSE 0 END) as open_now FROM synthesis_local_markets`).get(),
        last_updated: db.prepare(`SELECT MAX(updated_at) as ts FROM synthesis_price_velocity`).get()?.ts,
      };

      db.close();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log('  Synthesis API routes loaded (/api/synthesis/*)');
}
