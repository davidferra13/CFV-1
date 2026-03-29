#!/usr/bin/env python3
"""Patch db.mjs upsertPrice to accept and store locationId."""

PATH_FILE = '/home/davidferra/openclaw-prices/lib/db.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

changes = 0

# 1. Add locationId to function signature
old_sig = "  instacartMarkupPct, sourceUrl, saleDates, inStock, imageUrl"
new_sig = "  instacartMarkupPct, sourceUrl, saleDates, inStock, imageUrl, locationId"
if old_sig in content and 'locationId' not in content:
    content = content.replace(old_sig, new_sig, 1)
    changes += 1
    print('1. Added locationId to upsertPrice signature')
else:
    print('1. SKIP')

# 2. Add location_id to INSERT column list (after image_url)
old_insert_cols = "sale_start_date, sale_end_date, image_url,"
new_insert_cols = "sale_start_date, sale_end_date, image_url, location_id,"
if old_insert_cols in content:
    content = content.replace(old_insert_cols, new_insert_cols, 1)
    changes += 1
    print('2. Added location_id to INSERT columns')
else:
    print('2. SKIP')

# 3. Add one more ? to INSERT VALUES (count the ?s)
# Current: 22 question marks. Need 23.
old_values = "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
new_values = "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
if old_values in content:
    content = content.replace(old_values, new_values, 1)
    changes += 1
    print('3. Added ? for location_id in INSERT VALUES')
else:
    print('3. SKIP: Could not find VALUES with 22 placeholders')

# 4. Add locationId value to INSERT .run() args (after imageUrl || null)
old_insert_args = "saleDates?.start || null, saleDates?.end || null, imageUrl || null,"
new_insert_args = "saleDates?.start || null, saleDates?.end || null, imageUrl || null, locationId || null,"
if old_insert_args in content:
    content = content.replace(old_insert_args, new_insert_args, 1)
    changes += 1
    print('4. Added locationId to INSERT .run() args')
else:
    print('4. SKIP')

# 5. Add location_id to UPDATE SET clause (after image_url COALESCE)
old_update = "in_stock = ?, image_url = COALESCE(?, image_url),"
new_update = "in_stock = ?, image_url = COALESCE(?, image_url), location_id = COALESCE(?, location_id),"
if old_update in content:
    content = content.replace(old_update, new_update, 1)
    changes += 1
    print('5. Added location_id to UPDATE SET clause')
else:
    print('5. SKIP')

# 6. Add locationId to UPDATE .run() args (after imageUrl || null in the update section)
# The update args come after the INSERT section. Find the second occurrence.
# Pattern: imageUrl || null, followed by saleDates
old_update_args = "inStock !== undefined ? (inStock ? 1 : 0) : 1, imageUrl || null,"
new_update_args = "inStock !== undefined ? (inStock ? 1 : 0) : 1, imageUrl || null, locationId || null,"
if old_update_args in content:
    content = content.replace(old_update_args, new_update_args, 1)
    changes += 1
    print('6. Added locationId to UPDATE .run() args')
else:
    print('6. SKIP')

if changes > 0:
    with open(PATH_FILE, 'w') as f:
        f.write(content)
print(f'\n{changes} changes applied to db.mjs')
