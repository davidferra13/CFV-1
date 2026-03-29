#!/usr/bin/env python3
"""Patch OpenClaw db.mjs to add image_url, location_id, and enrichment columns."""

DB_PATH = '/home/davidferra/openclaw-prices/lib/db.mjs'

with open(DB_PATH, 'r') as f:
    content = f.read()

# 1. Add image_url + location_id + enrichment columns in migrateSchema
migration_code = """
  // Add image_url column for product images
  const imgCol = db.prepare("PRAGMA table_info(current_prices)").all();
  if (!imgCol.find(c => c.name === 'image_url')) {
    db.exec("ALTER TABLE current_prices ADD COLUMN image_url TEXT DEFAULT NULL");
  }

  // Add location_id column for store-level granularity
  const locCol = db.prepare("PRAGMA table_info(current_prices)").all();
  if (!locCol.find(c => c.name === 'location_id')) {
    db.exec("ALTER TABLE current_prices ADD COLUMN location_id TEXT DEFAULT NULL");
  }

  // Add enrichment columns to canonical_ingredients
  const ciCols = db.prepare("PRAGMA table_info(canonical_ingredients)").all();
  if (!ciCols.find(c => c.name === 'off_image_url')) {
    db.exec("ALTER TABLE canonical_ingredients ADD COLUMN off_image_url TEXT DEFAULT NULL");
    db.exec("ALTER TABLE canonical_ingredients ADD COLUMN off_barcode TEXT DEFAULT NULL");
    db.exec("ALTER TABLE canonical_ingredients ADD COLUMN off_nutrition_json TEXT DEFAULT NULL");
  }"""

# Insert right before the closing brace of migrateSchema
old_end = '    db.exec("CREATE INDEX idx_cp_ingredient_stock ON current_prices(canonical_ingredient_id, in_stock)");\n  }\n}'
new_end = '    db.exec("CREATE INDEX idx_cp_ingredient_stock ON current_prices(canonical_ingredient_id, in_stock)");\n  }\n' + migration_code + '\n}'
content = content.replace(old_end, new_end)

# 2. Add imageUrl to upsertPrice signature
content = content.replace(
    'instacartMarkupPct, sourceUrl, saleDates, inStock\n})',
    'instacartMarkupPct, sourceUrl, saleDates, inStock, imageUrl\n})'
)

# 3. Add image_url to INSERT column list and VALUES placeholders
content = content.replace(
    'sale_start_date, sale_end_date,\n        last_confirmed_at, last_changed_at, created_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    'sale_start_date, sale_end_date, image_url,\n        last_confirmed_at, last_changed_at, created_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
)

# 4. Add imageUrl to INSERT .run() arguments (first occurrence only)
old_insert_args = "saleDates?.start || null, saleDates?.end || null,\n      now, now, now\n    );\n\n    // Log the change"
new_insert_args = "saleDates?.start || null, saleDates?.end || null, imageUrl || null,\n      now, now, now\n    );\n\n    // Log the change"
content = content.replace(old_insert_args, new_insert_args, 1)

# 5. Add image_url to UPDATE SET clause
content = content.replace(
    'in_stock = ?,\n        sale_start_date = ?, sale_end_date = ?,\n        last_confirmed_at = ?, last_changed_at = ?',
    'in_stock = ?, image_url = COALESCE(?, image_url),\n        sale_start_date = ?, sale_end_date = ?,\n        last_confirmed_at = ?, last_changed_at = ?'
)

# 6. Add imageUrl to UPDATE .run() arguments
content = content.replace(
    'inStock !== undefined ? (inStock ? 1 : 0) : 1,\n      saleDates?.start || null, saleDates?.end || null,\n      now, now, id',
    'inStock !== undefined ? (inStock ? 1 : 0) : 1, imageUrl || null,\n      saleDates?.start || null, saleDates?.end || null,\n      now, now, id'
)

with open(DB_PATH, 'w') as f:
    f.write(content)

print('db.mjs patched successfully:')
print('  - Added image_url column migration')
print('  - Added location_id column migration')
print('  - Added OFF enrichment columns migration')
print('  - Updated upsertPrice() to accept and store imageUrl')
