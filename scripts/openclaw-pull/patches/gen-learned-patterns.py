"""
OpenClaw Learned Pattern Generator (Opus Distillation Task 2)

Analyzes price_changes, price_anomalies, and current_prices to generate
actionable learned patterns for the aggregator and cross-matcher.

Run on Pi: python3 gen-learned-patterns.py
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = '/home/davidferra/openclaw-prices/data/prices.db'

db = sqlite3.connect(DB_PATH)
db.row_factory = sqlite3.Row

patterns = []

# ============================================================
# 1. STORE PRICE TIER PATTERNS
# ============================================================
print("1. Store price tier patterns...")

store_stats = db.execute("""
    SELECT source_id,
        COUNT(*) as product_count,
        AVG(price_cents) as avg_price,
        AVG(price_per_standard_unit_cents) as avg_per_unit
    FROM current_prices
    WHERE price_cents > 0 AND price_cents < 100000
    GROUP BY source_id
    HAVING COUNT(*) > 500
    ORDER BY avg_per_unit
""").fetchall()

if store_stats:
    valid = [r for r in store_stats if r['avg_per_unit']]
    if valid:
        overall_avg = sum(r['avg_per_unit'] for r in valid) / len(valid)
        for r in valid:
            ratio = r['avg_per_unit'] / overall_avg
            tier = 'budget' if ratio < 0.85 else 'mid' if ratio < 1.15 else 'premium'
            patterns.append({
                'pattern_type': 'store_price_tier',
                'ingredient_category': 'All',
                'pattern_data': json.dumps({
                    'source': r['source_id'],
                    'product_count': r['product_count'],
                    'avg_price_cents': round(r['avg_price']),
                    'avg_per_unit_cents': round(r['avg_per_unit']),
                    'ratio_to_average': round(ratio, 3),
                    'tier': tier
                }),
                'observations': r['product_count']
            })

print(f"   {len(patterns)} patterns")

# ============================================================
# 2. CATEGORY PRICE DISTRIBUTION
# ============================================================
print("2. Category price distribution...")
start = len(patterns)

cat_stats = db.execute("""
    SELECT ci.category,
        COUNT(DISTINCT ci.ingredient_id) as ingredients,
        COUNT(cp.id) as price_points,
        AVG(cp.price_per_standard_unit_cents) as avg_per_unit,
        MIN(cp.price_per_standard_unit_cents) as min_per_unit,
        MAX(cp.price_per_standard_unit_cents) as max_per_unit
    FROM canonical_ingredients ci
    JOIN current_prices cp ON cp.canonical_ingredient_id = ci.ingredient_id
    WHERE cp.price_per_standard_unit_cents > 0 AND cp.price_per_standard_unit_cents < 100000
    GROUP BY ci.category
    HAVING COUNT(*) > 100
""").fetchall()

for r in cat_stats:
    patterns.append({
        'pattern_type': 'category_price_range',
        'ingredient_category': r['category'] or 'Unknown',
        'pattern_data': json.dumps({
            'ingredient_count': r['ingredients'],
            'price_points': r['price_points'],
            'avg_per_unit_cents': round(r['avg_per_unit']),
            'min_per_unit_cents': r['min_per_unit'],
            'max_per_unit_cents': r['max_per_unit'],
        }),
        'observations': r['price_points']
    })

print(f"   {len(patterns) - start} patterns")

# ============================================================
# 3. CATEGORY VOLATILITY
# ============================================================
print("3. Category volatility...")
start = len(patterns)

vol_stats = db.execute("""
    SELECT ci.category,
        COUNT(*) as changes,
        AVG(ABS(pc.change_pct)) as avg_change,
        SUM(CASE WHEN pc.change_pct > 0 THEN 1 ELSE 0 END) as increases,
        SUM(CASE WHEN pc.change_pct < 0 THEN 1 ELSE 0 END) as decreases,
        AVG(CASE WHEN pc.change_pct > 0 THEN pc.change_pct END) as avg_increase,
        AVG(CASE WHEN pc.change_pct < 0 THEN pc.change_pct END) as avg_decrease
    FROM price_changes pc
    JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
    GROUP BY ci.category
    HAVING COUNT(*) > 50
""").fetchall()

for r in vol_stats:
    patterns.append({
        'pattern_type': 'category_volatility',
        'ingredient_category': r['category'] or 'Unknown',
        'pattern_data': json.dumps({
            'total_changes': r['changes'],
            'avg_change_pct': round(r['avg_change'], 1),
            'increases': r['increases'],
            'decreases': r['decreases'],
            'avg_increase_pct': round(r['avg_increase'], 1) if r['avg_increase'] else None,
            'avg_decrease_pct': round(r['avg_decrease'], 1) if r['avg_decrease'] else None,
            'increase_ratio': round(r['increases'] / r['changes'], 3),
        }),
        'observations': r['changes']
    })

print(f"   {len(patterns) - start} patterns")

# ============================================================
# 4. STORE ANOMALY RATES
# ============================================================
print("4. Store anomaly rates...")
start = len(patterns)

anom_stats = db.execute("""
    SELECT pa.source_id,
        COUNT(*) as anomalies,
        SUM(CASE WHEN pa.anomaly_type = 'price_spike' THEN 1 ELSE 0 END) as spikes,
        SUM(CASE WHEN pa.anomaly_type = 'price_drop' THEN 1 ELSE 0 END) as drops,
        AVG(ABS(pa.change_pct)) as avg_severity
    FROM price_anomalies pa
    GROUP BY pa.source_id
    HAVING COUNT(*) > 20
    ORDER BY anomalies DESC
""").fetchall()

for r in anom_stats:
    patterns.append({
        'pattern_type': 'store_anomaly_rate',
        'ingredient_category': 'All',
        'pattern_data': json.dumps({
            'source': r['source_id'],
            'total_anomalies': r['anomalies'],
            'spikes': r['spikes'],
            'drops': r['drops'],
            'avg_severity_pct': round(r['avg_severity'], 1),
            'spike_ratio': round(r['spikes'] / r['anomalies'], 3),
        }),
        'observations': r['anomalies']
    })

print(f"   {len(patterns) - start} patterns")

# ============================================================
# 5. TOP VOLATILE INGREDIENTS
# ============================================================
print("5. Ingredient volatility (top 200)...")
start = len(patterns)

ing_vol = db.execute("""
    SELECT ci.name, ci.category, ci.ingredient_id,
        COUNT(*) as changes,
        AVG(ABS(pc.change_pct)) as avg_change,
        MIN(pc.new_price_cents) as min_price,
        MAX(pc.new_price_cents) as max_price
    FROM price_changes pc
    JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
    GROUP BY ci.ingredient_id
    HAVING COUNT(*) > 10
    ORDER BY COUNT(*) DESC
    LIMIT 200
""").fetchall()

for r in ing_vol:
    patterns.append({
        'pattern_type': 'ingredient_volatility',
        'ingredient_category': r['category'] or 'Unknown',
        'pattern_data': json.dumps({
            'ingredient': r['name'],
            'ingredient_id': r['ingredient_id'],
            'total_changes': r['changes'],
            'avg_change_pct': round(r['avg_change'], 1),
            'price_range_cents': [r['min_price'], r['max_price']],
        }),
        'observations': r['changes']
    })

print(f"   {len(patterns) - start} patterns")

# ============================================================
# 6. INSTACART MARKUP PATTERNS
# ============================================================
print("6. Instacart markup analysis...")
start = len(patterns)

ic_markup = db.execute("""
    SELECT
        ic.source_id as ic_source,
        COUNT(*) as comparisons,
        AVG(CAST(ic.price_per_standard_unit_cents AS REAL) / NULLIF(non_ic.avg_price, 0)) as markup_ratio
    FROM current_prices ic
    JOIN (
        SELECT canonical_ingredient_id, AVG(price_per_standard_unit_cents) as avg_price
        FROM current_prices
        WHERE source_id NOT LIKE 'ic-%' AND source_id NOT LIKE '%-instacart'
            AND price_per_standard_unit_cents > 0 AND price_per_standard_unit_cents < 50000
        GROUP BY canonical_ingredient_id
        HAVING COUNT(*) >= 2
    ) non_ic ON ic.canonical_ingredient_id = non_ic.canonical_ingredient_id
    WHERE (ic.source_id LIKE 'ic-%' OR ic.source_id LIKE '%-instacart')
        AND ic.price_per_standard_unit_cents > 0 AND ic.price_per_standard_unit_cents < 50000
    GROUP BY ic.source_id
    HAVING COUNT(*) > 100
""").fetchall()

for r in ic_markup:
    if r['markup_ratio']:
        patterns.append({
            'pattern_type': 'instacart_markup',
            'ingredient_category': 'All',
            'pattern_data': json.dumps({
                'source': r['ic_source'],
                'comparisons': r['comparisons'],
                'markup_ratio': round(r['markup_ratio'], 3),
                'markup_pct': round((r['markup_ratio'] - 1) * 100, 1),
            }),
            'observations': r['comparisons']
        })

print(f"   {len(patterns) - start} patterns")

# ============================================================
# 7. CHANGE MAGNITUDE DISTRIBUTION PER CATEGORY
# ============================================================
print("7. Change magnitude distributions...")
start = len(patterns)

mag_stats = db.execute("""
    SELECT ci.category,
        CASE
            WHEN ABS(pc.change_pct) < 10 THEN 'minor'
            WHEN ABS(pc.change_pct) < 25 THEN 'moderate'
            WHEN ABS(pc.change_pct) < 50 THEN 'significant'
            WHEN ABS(pc.change_pct) < 100 THEN 'major'
            ELSE 'extreme'
        END as magnitude,
        COUNT(*) as cnt
    FROM price_changes pc
    JOIN canonical_ingredients ci ON pc.canonical_ingredient_id = ci.ingredient_id
    GROUP BY ci.category, magnitude
    HAVING COUNT(*) > 10
""").fetchall()

cat_mag = {}
for r in mag_stats:
    cat = r['category'] or 'Unknown'
    if cat not in cat_mag:
        cat_mag[cat] = {}
    cat_mag[cat][r['magnitude']] = r['cnt']

for cat, mags in cat_mag.items():
    total = sum(mags.values())
    patterns.append({
        'pattern_type': 'change_magnitude_dist',
        'ingredient_category': cat,
        'pattern_data': json.dumps({
            'distribution': dict(sorted(mags.items())),
            'total_changes': total,
            'pct_extreme': round(mags.get('extreme', 0) / total * 100, 1),
        }),
        'observations': total
    })

print(f"   {len(patterns) - start} patterns")

# ============================================================
# INSERT ALL PATTERNS
# ============================================================
print(f"\n=== TOTAL: {len(patterns)} patterns ===")
print("Replacing old patterns...")

db.execute("DELETE FROM learned_patterns")
now = datetime.now().isoformat()

for p in patterns:
    db.execute("""
        INSERT INTO learned_patterns (pattern_type, ingredient_category, pattern_data, observations, last_updated)
        VALUES (?, ?, ?, ?, ?)
    """, (p['pattern_type'], p['ingredient_category'], p['pattern_data'], p['observations'], now))

db.commit()

final = db.execute("SELECT COUNT(*) as c FROM learned_patterns").fetchone()
print(f"Done. {final['c']} patterns in learned_patterns table.")

types = db.execute("SELECT pattern_type, COUNT(*) as c FROM learned_patterns GROUP BY pattern_type ORDER BY c DESC").fetchall()
print("\nBy type:")
for t in types:
    print(f"  {t['c']:>4}  {t['pattern_type']}")
