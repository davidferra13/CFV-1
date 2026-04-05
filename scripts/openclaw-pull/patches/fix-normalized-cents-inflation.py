"""
Fix: Normalized Cents Inflation in Pi's Enriched API

ROOT CAUSE: Pi's enriched API returns `normalized_cents` (per-standard-unit price)
for Instacart products. For items sold by oz, this multiplies price by 16 to get
per-lb equivalent. Result: $3.73/oz chocolate chips becomes $59,696 cents ($596.96/lb).

ChefFlow's $500 cap catches these, but they waste quarantine space and the real
per-oz prices never reach ChefFlow.

FIX: In Pi's enriched API response builder, return the ACTUAL price_cents (not
normalized_cents) as the primary price, with normalized_cents as a separate field
for analytics. ChefFlow already handles unit conversion in the 10-tier resolver.

Run on Pi: python3 fix-normalized-cents-inflation.py
"""

import sqlite3
import json

DB_PATH = '/home/davidferra/openclaw-prices/data/prices.db'
db = sqlite3.connect(DB_PATH)
db.row_factory = sqlite3.Row

# Step 1: Identify the scale of the problem
print("=== Normalized Cents Inflation Analysis ===\n")

inflated = db.execute("""
    SELECT source_id, COUNT(*) as cnt,
        AVG(price_cents) as avg_raw,
        AVG(normalized_cents) as avg_normalized,
        AVG(CAST(normalized_cents AS REAL) / NULLIF(price_cents, 0)) as avg_ratio
    FROM current_prices
    WHERE normalized_cents > 0 AND price_cents > 0
        AND normalized_cents > price_cents * 5
        AND (source_id LIKE 'ic-%' OR source_id LIKE '%-instacart')
    GROUP BY source_id
    HAVING COUNT(*) > 50
    ORDER BY avg_ratio DESC
""").fetchall()

print(f"Stores with inflated normalized_cents (>5x raw price):")
total_inflated = 0
for r in inflated:
    print(f"  {r['source_id']}: {r['cnt']} items, avg ratio {r['avg_ratio']:.1f}x, "
          f"avg raw ${r['avg_raw']/100:.2f}, avg normalized ${r['avg_normalized']/100:.2f}")
    total_inflated += r['cnt']

print(f"\nTotal inflated prices: {total_inflated}")

# Step 2: Show specific examples that ChefFlow is quarantining
print("\n=== Examples ChefFlow Quarantines ===\n")

examples = db.execute("""
    SELECT cp.source_id, ci.name as ingredient,
        cp.price_cents as raw_cents,
        cp.normalized_cents,
        cp.size_value, cp.size_unit,
        cp.standard_unit
    FROM current_prices cp
    JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE cp.normalized_cents >= 50000
        AND (cp.source_id LIKE 'ic-%' OR cp.source_id LIKE '%-instacart')
    ORDER BY cp.normalized_cents DESC
    LIMIT 20
""").fetchall()

for r in examples:
    print(f"  {r['ingredient']}: raw=${r['raw_cents']/100:.2f} ({r['size_value']}{r['size_unit']}), "
          f"normalized=${r['normalized_cents']/100:.2f}/{r['standard_unit']}, "
          f"store={r['source_id']}")

# Step 3: The fix recommendation
print("\n=== RECOMMENDED FIX ===")
print("""
In the enriched API response builder (services/sync-api.mjs or equivalent):

BEFORE (broken):
  price_cents: row.normalized_cents || row.price_cents

AFTER (fixed):
  price_cents: row.price_cents,
  price_per_standard_unit_cents: row.normalized_cents,
  size_value: row.size_value,
  size_unit: row.size_unit,
  standard_unit: row.standard_unit

This gives ChefFlow the REAL price and lets ChefFlow's 10-tier resolver
handle unit conversion correctly. The normalized_cents field is kept for
Pi-side analytics but never sent as the primary price.

ALTERNATIVE (simpler, less ideal):
  Cap normalized_cents at 5x the raw price_cents. If the ratio exceeds 5x,
  fall back to raw price_cents. This catches the oz*16 inflation without
  changing the API contract.
""")

db.close()
