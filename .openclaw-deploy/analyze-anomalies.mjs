/**
 * Analyze and bulk-ack price anomalies
 *
 * Usage:
 *   node analyze-anomalies.mjs              # analyze only
 *   node analyze-anomalies.mjs --ack-old    # ack anomalies older than 7 days
 *   node analyze-anomalies.mjs --ack-small  # ack anomalies with < 20% change
 *   node analyze-anomalies.mjs --ack-all    # ack everything (fresh start)
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '..', 'data', 'prices.db'));

const mode = process.argv[2];

// Analyze
const total = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0").get().c;
const byType = db.prepare("SELECT anomaly_type, COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 GROUP BY anomaly_type ORDER BY c DESC").all();

console.log(`Total unacked anomalies: ${total}`);
console.log('\nBy type:');
for (const r of byType) console.log(`  ${r.anomaly_type}: ${r.c}`);

// Age analysis
const old7d = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 AND detected_at < datetime('now', '-7 days')").get().c;
const old30d = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 AND detected_at < datetime('now', '-30 days')").get().c;
const today = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 AND detected_at >= datetime('now', '-1 day')").get().c;

console.log('\nBy age:');
console.log(`  Today: ${today}`);
console.log(`  Older than 7 days: ${old7d}`);
console.log(`  Older than 30 days: ${old30d}`);

// Small changes (noise)
const small = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 AND ABS(change_pct) < 20").get().c;
const medium = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 AND ABS(change_pct) >= 20 AND ABS(change_pct) < 50").get().c;
const large = db.prepare("SELECT COUNT(*) as c FROM price_anomalies WHERE acknowledged = 0 AND ABS(change_pct) >= 50").get().c;

console.log('\nBy magnitude:');
console.log(`  < 20% change (noise): ${small}`);
console.log(`  20-50% change: ${medium}`);
console.log(`  > 50% change (significant): ${large}`);

// Samples
const samples = db.prepare("SELECT anomaly_type, canonical_ingredient_id, old_price_cents, new_price_cents, change_pct, detected_at FROM price_anomalies WHERE acknowledged = 0 ORDER BY ABS(change_pct) DESC LIMIT 5").all();
console.log('\nTop 5 by magnitude:');
for (const s of samples) {
  const old = s.old_price_cents ? `$${(s.old_price_cents / 100).toFixed(2)}` : 'N/A';
  const nw = s.new_price_cents ? `$${(s.new_price_cents / 100).toFixed(2)}` : 'N/A';
  console.log(`  ${s.anomaly_type}: ${s.canonical_ingredient_id} ${old} -> ${nw} (${(s.change_pct || 0).toFixed(0)}%)`);
}

// Actions
if (mode === '--ack-old') {
  const result = db.prepare("UPDATE price_anomalies SET acknowledged = 1 WHERE acknowledged = 0 AND detected_at < datetime('now', '-7 days')").run();
  console.log(`\nAcked ${result.changes} anomalies older than 7 days`);
} else if (mode === '--ack-small') {
  const result = db.prepare("UPDATE price_anomalies SET acknowledged = 1 WHERE acknowledged = 0 AND ABS(change_pct) < 20").run();
  console.log(`\nAcked ${result.changes} anomalies with < 20% change`);
} else if (mode === '--ack-all') {
  const result = db.prepare("UPDATE price_anomalies SET acknowledged = 1 WHERE acknowledged = 0").run();
  console.log(`\nAcked all ${result.changes} anomalies (fresh start)`);
} else {
  console.log('\nRecommendation:');
  console.log(`  --ack-old    would clear ${old7d} stale anomalies`);
  console.log(`  --ack-small  would clear ${small} noise anomalies`);
  console.log(`  --ack-all    would clear all ${total} (fresh start for aggregator)`);
  console.log('  Best approach: --ack-old first, then --ack-small');
}

db.close();
