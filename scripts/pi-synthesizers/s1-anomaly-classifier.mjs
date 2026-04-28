#!/usr/bin/env node
/**
 * S1: Price Anomaly Classifier
 * Classifies existing price_anomalies into: deal, market_event, data_error, seasonal
 * Scores severity 1-5. Filters non-food. Generates human-readable alerts.
 *
 * Schedule: Every 2 hours
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

function classifyAnomaly(anomaly, db) {
  const { ingredient_id, ingredient_name, anomaly_type, change_pct } = anomaly;

  let category = 'market_event'; // default
  let severity = 3;

  const absMag = Math.abs(change_pct || 0);
  const direction = (anomaly_type === 'spike' || change_pct > 0) ? 'spike' : 'drop';

  // Rule 1: Extreme single change = likely data error
  if (absMag > 80) {
    category = 'data_error';
    severity = 1; // low severity, probably noise
  }
  // Rule 2: Drop with moderate magnitude = likely deal/sale
  else if (direction === 'drop' && absMag >= 10 && absMag <= 60) {
    category = 'deal';
    severity = absMag > 30 ? 4 : 3;
  }
  // Rule 3: Check if multiple anomalies for same ingredient = market event
  else if (absMag > 15) {
    category = 'market_event';
    severity = absMag > 30 ? 5 : absMag > 15 ? 4 : 3;
  }
  // Rule 4: Check seasonal pattern
  else {
    const month = new Date().getMonth() + 1;
    const seasonal = db.prepare(`
      SELECT status FROM synthesis_seasonal_scores
      WHERE ingredient_id = ? AND month = ?
    `).get(ingredient_id, month);

    if (seasonal) {
      if (seasonal.status === 'off_season' && direction === 'spike') {
        category = 'seasonal';
        severity = 2; // expected
      } else if (seasonal.status === 'peak_season' && direction === 'drop') {
        category = 'seasonal';
        severity = 2;
      }
    }
  }

  // Boost severity for high-value food categories
  const ingredient = db.prepare(`
    SELECT category, is_food FROM canonical_ingredients WHERE ingredient_id = ?
  `).get(ingredient_id);

  const isFood = ingredient ? (ingredient.is_food !== 0) : true;
  if (!isFood) severity = Math.max(1, severity - 2);

  const foodCat = (ingredient?.category || '').toLowerCase();
  if (['protein', 'seafood', 'produce'].includes(foodCat)) {
    severity = Math.min(5, severity + 1);
  }

  // Generate message
  const dirLabel = direction === 'spike' ? '+' : '-';
  const roundMag = Math.round(absMag);
  const message = `${ingredient_name} ${dirLabel}${roundMag}% (${category.replace('_', ' ')})`;

  return { category, severity, direction, magnitude: absMag, message, isFood };
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S1: Anomaly Classifier ===');

  // Get unclassified anomalies from last 48 hours
  const anomalies = db.prepare(`
    SELECT
      pa.id,
      pa.canonical_ingredient_id as ingredient_id,
      ci.name as ingredient_name,
      pa.anomaly_type,
      pa.change_pct,
      pa.detected_at
    FROM price_anomalies pa
    LEFT JOIN canonical_ingredients ci ON ci.ingredient_id = pa.canonical_ingredient_id
    WHERE pa.detected_at > datetime('now', '-48 hours')
    ORDER BY pa.detected_at DESC
    LIMIT 10000
  `).all();

  console.log(`  New anomalies to classify: ${anomalies.length}`);

  if (anomalies.length === 0) {
    console.log('  Nothing new. Exiting.');
    db.close();
    return;
  }

  const insert = db.prepare(`
    INSERT INTO synthesis_anomaly_alerts
      (ingredient_id, ingredient_name, category, severity, direction, magnitude_pct, affected_stores, message, is_food, expires_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 days'))
  `);

  let counts = { deal: 0, market_event: 0, data_error: 0, seasonal: 0 };
  let foodOnly = 0;

  const processBatch = db.transaction((batch) => {
    for (const anomaly of batch) {
      if (!anomaly.ingredient_name) continue;

      const result = classifyAnomaly(anomaly, db);
      counts[result.category]++;
      if (result.isFood) foodOnly++;

      // Find affected stores for this ingredient
      const stores = db.prepare(`
        SELECT DISTINCT sr.name
        FROM current_prices cp
        JOIN source_registry sr ON sr.source_id = cp.source_id
        WHERE cp.canonical_ingredient_id = ?
        LIMIT 10
      `).all(anomaly.ingredient_id);

      const storeNames = JSON.stringify(stores.map(s => s.name));

      insert.run(
        anomaly.ingredient_id,
        anomaly.ingredient_name,
        result.category,
        result.severity,
        result.direction,
        result.magnitude,
        storeNames,
        result.message,
        result.isFood ? 1 : 0
      );
    }
  });

  // Process in batches
  const batchSize = 1000;
  for (let i = 0; i < anomalies.length; i += batchSize) {
    processBatch(anomalies.slice(i, i + batchSize));
  }

  // Expire old alerts
  const expired = db.prepare(`
    DELETE FROM synthesis_anomaly_alerts WHERE expires_at < datetime('now')
  `).run();

  console.log(`\n  Classified:`);
  console.log(`    Deals:         ${counts.deal}`);
  console.log(`    Market events: ${counts.market_event}`);
  console.log(`    Data errors:   ${counts.data_error}`);
  console.log(`    Seasonal:      ${counts.seasonal}`);
  console.log(`    Food-only:     ${foodOnly}`);
  console.log(`    Expired:       ${expired.changes}`);

  // Show top 5 high-severity alerts
  const top = db.prepare(`
    SELECT message, severity FROM synthesis_anomaly_alerts
    WHERE is_food = 1 AND severity >= 4
    ORDER BY created_at DESC LIMIT 5
  `).all();

  if (top.length) {
    console.log(`\n  Top alerts:`);
    for (const t of top) {
      console.log(`    [${t.severity}] ${t.message}`);
    }
  }

  console.log('=== S1 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
