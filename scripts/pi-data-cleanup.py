#!/usr/bin/env python3
"""
Pi Data Cleanup Script
Fixes data quality issues in prices.db:
1. Fix standard_units for common chef ingredients
2. Delete non-food current_prices linked to _NON_FOOD ingredients
3. Report stats before/after

Run on Pi: python3 /home/davidferra/openclaw-prices/pi-data-cleanup.py
"""

import sqlite3
import sys
import time

DB_PATH = '/home/davidferra/openclaw-prices/data/prices.db'

# Correct standard units for common chef ingredients
# Format: (ingredient_id_pattern, correct_unit)
UNIT_FIXES = [
    # Weight-based (lb)
    ('butter', 'lb'),
    ('butter-unsalted', 'lb'),
    ('butter-salted', 'lb'),
    ('butter-european', 'lb'),
    ('cultured-butter', 'lb'),
    ('flour', 'lb'),
    ('sugar', 'lb'),
    ('rice', 'lb'),
    ('salt', 'lb'),
    ('chicken-breast', 'lb'),
    ('ground-beef', 'lb'),
    ('pork-chops', 'lb'),
    ('salmon', 'lb'),
    ('shrimp', 'lb'),
    ('bacon', 'lb'),
    ('sausage', 'lb'),
    ('steak', 'lb'),
    ('turkey', 'lb'),
    ('ham', 'lb'),
    ('lamb', 'lb'),
    ('cheese', 'lb'),
    ('mozzarella', 'lb'),
    ('parmesan', 'lb'),
    ('cheddar', 'lb'),
    ('pasta', 'lb'),
    ('chocolate', 'oz'),
    ('cocoa-powder', 'oz'),
    ('baking-powder', 'oz'),
    ('baking-soda', 'oz'),
    ('yeast', 'oz'),
    ('cornstarch', 'oz'),
    ('breadcrumbs', 'oz'),
    ('brown-sugar', 'lb'),
    ('powdered-sugar', 'lb'),

    # Volume-based (fl oz or cup)
    ('milk', 'gal'),
    ('cream', 'fl oz'),
    ('heavy-cream', 'fl oz'),
    ('sour-cream', 'oz'),
    ('yogurt', 'oz'),
    ('olive-oil', 'fl oz'),
    ('vegetable-oil', 'fl oz'),
    ('coconut-oil', 'fl oz'),
    ('vinegar', 'fl oz'),
    ('soy-sauce', 'fl oz'),
    ('vanilla-extract', 'fl oz'),
    ('honey', 'oz'),
    ('maple-syrup', 'fl oz'),

    # Count-based (ct/each)
    ('eggs', 'ct'),
    ('lemon', 'each'),
    ('lime', 'each'),
    ('onion', 'each'),
    ('garlic', 'each'),
    ('avocado', 'each'),
    ('banana', 'each'),
    ('apple', 'each'),
    ('orange', 'each'),
    ('tomato', 'each'),
    ('potato', 'each'),
    ('bell-pepper', 'each'),
    ('cucumber', 'each'),
    ('celery', 'each'),
    ('carrot', 'lb'),
    ('broccoli', 'each'),
    ('lettuce', 'each'),
    ('mushroom', 'oz'),
    ('corn', 'each'),
    ('squash-butternut', 'each'),

    # Spices (oz)
    ('cinnamon', 'oz'),
    ('paprika', 'oz'),
    ('cumin', 'oz'),
    ('oregano', 'oz'),
    ('basil', 'oz'),
    ('thyme', 'oz'),
    ('rosemary', 'oz'),
    ('black-pepper', 'oz'),
    ('red-pepper-flakes', 'oz'),
    ('garlic-powder', 'oz'),
    ('onion-powder', 'oz'),
    ('chili-powder', 'oz'),
    ('turmeric', 'oz'),
    ('nutmeg', 'oz'),
    ('cayenne', 'oz'),
]


def run_cleanup(dry_run=True):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    print(f"{'DRY RUN' if dry_run else 'LIVE RUN'} - Pi Data Cleanup")
    print(f"DB: {DB_PATH}")
    print("=" * 60)

    # --- STEP 1: Fix standard_units ---
    print("\n--- STEP 1: Fix standard_units ---")
    unit_fixes_applied = 0
    for ingredient_id, correct_unit in UNIT_FIXES:
        row = conn.execute(
            'SELECT ingredient_id, name, standard_unit FROM canonical_ingredients '
            'WHERE ingredient_id = ?', (ingredient_id,)
        ).fetchone()

        if row and row['standard_unit'] != correct_unit:
            print(f"  FIX: {row['name']} ({row['ingredient_id']}): "
                  f"'{row['standard_unit']}' -> '{correct_unit}'")
            if not dry_run:
                conn.execute(
                    'UPDATE canonical_ingredients SET standard_unit = ? '
                    'WHERE ingredient_id = ?',
                    (correct_unit, ingredient_id)
                )
            unit_fixes_applied += 1
        elif row:
            pass  # Already correct
        # else: ingredient not found, skip silently

    print(f"  Total unit fixes: {unit_fixes_applied}")

    # --- STEP 2: Delete non-food prices ---
    print("\n--- STEP 2: Delete non-food current_prices ---")
    non_food_count = conn.execute(
        'SELECT COUNT(*) FROM current_prices cp '
        'JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id '
        'WHERE ci.category = ?', ('_NON_FOOD',)
    ).fetchone()[0]

    is_food_zero = conn.execute(
        'SELECT COUNT(*) FROM current_prices cp '
        'JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id '
        'WHERE ci.is_food = 0', ()
    ).fetchone()[0]

    print(f"  Non-food prices (_NON_FOOD category): {non_food_count:,}")
    print(f"  Non-food prices (is_food=0): {is_food_zero:,}")

    if not dry_run:
        # Enable maintenance override (30 min window)
        conn.execute(
            "INSERT INTO _maintenance_override (allow_delete, reason, expires_at) "
            "VALUES (1, 'pi-data-cleanup: purge non-food prices', "
            "datetime('now', '+30 minutes'))"
        )
        # Delete prices linked to _NON_FOOD canonical ingredients
        conn.execute(
            'DELETE FROM current_prices WHERE canonical_ingredient_id IN '
            '(SELECT ingredient_id FROM canonical_ingredients WHERE category = ?)',
            ('_NON_FOOD',)
        )
        # Delete prices linked to is_food=0
        conn.execute(
            'DELETE FROM current_prices WHERE canonical_ingredient_id IN '
            '(SELECT ingredient_id FROM canonical_ingredients WHERE is_food = 0)',
            ()
        )
        # Clear maintenance override
        conn.execute('DELETE FROM _maintenance_override')
        print(f"  DELETED non-food prices")

    # --- STEP 3: Summary ---
    print("\n--- SUMMARY ---")
    total_before = conn.execute('SELECT COUNT(*) FROM current_prices').fetchone()[0]
    food_count = conn.execute(
        'SELECT COUNT(*) FROM current_prices cp '
        'JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.ingredient_id '
        'WHERE (ci.is_food = 1 OR ci.is_food IS NULL) AND ci.category != ?',
        ('_NON_FOOD',)
    ).fetchone()[0]
    print(f"  Total prices: {total_before:,}")
    print(f"  Food prices: {food_count:,}")
    print(f"  Non-food: {total_before - food_count:,} ({round((total_before - food_count) / total_before * 100, 1)}%)")

    if not dry_run:
        conn.commit()
        print("\n  Changes committed.")
        # VACUUM to reclaim space
        print("  Running VACUUM (may take a minute)...")
        conn.execute('VACUUM')
        print("  VACUUM complete.")
    else:
        print("\n  No changes made (dry run). Run with --live to apply.")

    conn.close()


if __name__ == '__main__':
    dry_run = '--live' not in sys.argv
    run_cleanup(dry_run=dry_run)
