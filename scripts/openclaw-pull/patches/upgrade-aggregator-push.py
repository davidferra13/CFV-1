#!/usr/bin/env python3
"""
Add real-time anomaly push to ChefFlow webhook after detecting anomalies.
"""
import os

AGG = os.path.expanduser("~/openclaw-prices/services/aggregator.mjs")
c = open(AGG).read()

# Add push function and wire it after anomaly detection
# Find the line after anomaly detection logs the count
old_detect_end = """  console.log(`  Found ${anomalyCount} anomalies`);
}"""

new_detect_end = """  console.log(`  Found ${anomalyCount} anomalies`);

  // Push significant anomalies to ChefFlow in real-time
  if (anomalyCount > 0) {
    pushAnomalies(db, anomalyCount);
  }
}

/**
 * Push recent unacknowledged anomalies to ChefFlow's webhook endpoint.
 * Only sends anomalies with >= 40% price change (significant ones).
 */
function pushAnomalies(db, count) {
  const CHEFFLOW_URL = process.env.CHEFFLOW_URL || 'http://10.0.0.153:3000';
  const WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || 'openclaw-internal-2026';

  const significant = db.prepare(`
    SELECT pa.*, ci.name as ingredient_name, sr.name as source_name
    FROM price_anomalies pa
    JOIN canonical_ingredients ci ON pa.canonical_ingredient_id = ci.ingredient_id
    JOIN source_registry sr ON pa.source_id = sr.source_id
    WHERE pa.acknowledged = 0
      AND pa.detected_at >= datetime('now', '-1 hour')
      AND ABS(pa.change_pct) >= 40
    ORDER BY ABS(pa.change_pct) DESC
    LIMIT 10
  `).all();

  if (significant.length === 0) {
    console.log('  No significant anomalies to push (>40% change)');
    return;
  }

  console.log('  Pushing ' + significant.length + ' significant anomalies to ChefFlow...');

  for (const anomaly of significant) {
    try {
      // Use synchronous fetch via child_process (Node 22 has fetch but aggregator is sync-heavy)
      const { execSync } = require('child_process');
      const payload = JSON.stringify({
        type: 'price_anomaly',
        data: {
          ingredient_name: anomaly.ingredient_name,
          source_name: anomaly.source_name,
          old_price_cents: anomaly.old_price_cents,
          new_price_cents: anomaly.new_price_cents,
          change_pct: anomaly.change_pct,
          anomaly_type: anomaly.anomaly_type,
          detected_at: anomaly.detected_at,
        }
      });
      execSync(
        'curl -s -X POST ' + CHEFFLOW_URL + '/api/openclaw/webhook ' +
        '-H "Content-Type: application/json" ' +
        '-H "Authorization: Bearer ' + WEBHOOK_SECRET + '" ' +
        "-d '" + payload.replace(/'/g, "'\\''") + "' > /dev/null 2>&1",
        { timeout: 5000 }
      );
    } catch {
      // Non-blocking: if ChefFlow is down, just skip
    }
  }
  console.log('  Push complete');
}"""

if old_detect_end in c:
    c = c.replace(old_detect_end, new_detect_end)
    print("Added pushAnomalies() function + wired after detectAnomalies()")
else:
    print("SKIP: Could not find anomaly detection end marker")

open(AGG, "w").write(c)
print("Aggregator push upgrade complete!")
