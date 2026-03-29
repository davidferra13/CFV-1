#!/usr/bin/env python3
"""Add staleness rule to watchdog.mjs"""

PATH_FILE = '/home/davidferra/openclaw-prices/services/watchdog.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

if 'Staleness rule' in content:
    print('SKIP: Staleness rule already exists')
    exit(0)

staleness_code = """
  // Staleness rule: mark items out of stock if not confirmed in 7 days
  // Government/wholesale sources exempt (they report monthly/quarterly)
  try {
    const staleResult = db.prepare(`
      UPDATE current_prices
      SET in_stock = 0
      WHERE in_stock = 1
        AND last_confirmed_at < datetime('now', '-7 days')
        AND source_id NOT IN (
          SELECT source_id FROM source_registry
          WHERE type IN ('government', 'wholesale', 'index')
        )
    `).run();
    if (staleResult.changes > 0) {
      log('INFO', 'Marked ' + staleResult.changes + ' stale items as out of stock (not confirmed in 7+ days)');
    }
  } catch (err) {
    log('WARN', 'Staleness check failed: ' + err.message);
  }

"""

# Insert before the final log line
marker = "  log('INFO', '=== Watchdog check complete ===\\n');"
if marker in content:
    content = content.replace(marker, staleness_code + marker)
    with open(PATH_FILE, 'w') as f:
        f.write(content)
    print('Added staleness rule to watchdog.mjs')
else:
    print('ERROR: Could not find insertion point')
