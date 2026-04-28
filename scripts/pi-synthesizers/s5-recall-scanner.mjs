#!/usr/bin/env node
/**
 * S5: Recall Safety Scanner
 * Matches FDA recalls against canonical ingredients.
 * Classifies severity. Generates per-ingredient alerts.
 *
 * Schedule: Every 6 hours
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

function fuzzyMatch(recallText, ingredientName) {
  const recallLower = recallText.toLowerCase();
  const ingLower = ingredientName.toLowerCase();

  // Exact substring match
  if (recallLower.includes(ingLower) || ingLower.includes(recallLower)) {
    return 1.0;
  }

  // Word overlap
  const recallWords = new Set(recallLower.split(/\s+/).filter(w => w.length > 2));
  const ingWords = ingLower.split(/\s+/).filter(w => w.length > 2);

  if (ingWords.length === 0) return 0;

  let matches = 0;
  for (const word of ingWords) {
    if (recallWords.has(word)) matches++;
  }

  return matches / ingWords.length;
}

async function main() {
  const db = new Database(DB_PATH, { timeout: 300000 });
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 300000');

  console.log('\n=== S5: Recall Safety Scanner ===');

  // Get active recalls
  const recalls = db.prepare(`
    SELECT * FROM fda_recalls
    WHERE COALESCE(status, '') != 'terminated'
    ORDER BY report_date DESC
  `).all();

  console.log(`  Active recalls: ${recalls.length}`);

  if (recalls.length === 0) {
    console.log('  No active recalls. Exiting.');
    db.close();
    return;
  }

  // Get food ingredients for matching
  const ingredients = db.prepare(`
    SELECT ingredient_id as id, name, category FROM canonical_ingredients
    WHERE is_food = 1
  `).all();

  console.log(`  Food ingredients to check: ${ingredients.length}`);

  const insert = db.prepare(`
    INSERT INTO synthesis_recall_alerts
      (recall_id, ingredient_id, ingredient_name, brand, severity, recall_class,
       reason, affected_products, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))
  `);

  // Clear existing and rebuild
  db.prepare(`DELETE FROM synthesis_recall_alerts`).run();

  let alertCount = 0;

  const processBatch = db.transaction(() => {
    for (const recall of recalls) {
      const recallText = [
        recall.product_description || '',
        recall.reason || '',
        recall.recalling_firm || '',
      ].join(' ').toLowerCase();

      if (!recallText.trim()) continue;

      // Determine recall class and severity
      let recallClass = recall.classification || 'III';
      let severity;
      if (recallClass.includes('I') && !recallClass.includes('II')) {
        severity = 'critical';
        recallClass = 'I';
      } else if (recallClass.includes('II') && !recallClass.includes('III')) {
        severity = 'warning';
        recallClass = 'II';
      } else {
        severity = 'info';
        recallClass = 'III';
      }

      // Match against ingredients
      for (const ing of ingredients) {
        const score = fuzzyMatch(recallText, ing.name);
        if (score < 0.6) continue;

        const brand = recall.recalling_firm || null;
        const reason = recall.reason || 'FDA recall';
        const products = JSON.stringify({
          description: recall.product_description,
          firm: recall.recalling_firm,
          distribution: recall.distribution_pattern,
        });

        insert.run(
          recall.id || null,
          ing.id,
          ing.name,
          brand,
          severity,
          recallClass,
          reason,
          products
        );
        alertCount++;
      }
    }
  });

  processBatch();

  console.log(`\n  Recall alerts generated: ${alertCount}`);

  // Show critical alerts
  const critical = db.prepare(`
    SELECT ingredient_name, brand, reason, severity
    FROM synthesis_recall_alerts
    WHERE severity = 'critical'
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  if (critical.length) {
    console.log(`\n  CRITICAL recalls affecting ingredients:`);
    for (const c of critical) {
      console.log(`    [${c.severity}] ${c.ingredient_name} - ${c.brand}: ${c.reason.substring(0, 80)}`);
    }
  }

  console.log('=== S5 Complete ===\n');
  db.close();
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
