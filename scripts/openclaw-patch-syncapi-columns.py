#!/usr/bin/env python3
"""Patch sync-api.mjs to include image_url, off_image_url, off_barcode, off_nutrition_json, location_id in API responses."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/sync-api.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

changes = 0

# 1. Add OFF columns + best image to the main ingredients listing query
old_select = """        SELECT ci.ingredient_id, ci.name, ci.category, ci.standard_unit, ci.created_at,
               MIN(cp.price_cents) as best_price_cents,"""
new_select = """        SELECT ci.ingredient_id, ci.name, ci.category, ci.standard_unit, ci.created_at,
               ci.off_image_url, ci.off_barcode, ci.off_nutrition_json,
               MIN(cp.price_cents) as best_price_cents,
               (SELECT cp3.image_url FROM current_prices cp3
                WHERE cp3.canonical_ingredient_id = ci.ingredient_id AND cp3.image_url IS NOT NULL
                ORDER BY cp3.last_confirmed_at DESC LIMIT 1) as best_image_url,"""

if old_select in content:
    content = content.replace(old_select, new_select, 1)
    changes += 1
    print('1. Added OFF columns + best_image_url to ingredients query')
else:
    print('1. SKIP: Could not find ingredients SELECT')

# 2. Add new fields to response mapping
old_mapping = """          has_source_url: !!(r.has_source_url),
        })),"""
new_mapping = """          has_source_url: !!(r.has_source_url),
          image_url: r.best_image_url || (r.off_image_url && r.off_image_url !== 'none' ? r.off_image_url : null),
          off_image_url: r.off_image_url && r.off_image_url !== 'none' ? r.off_image_url : null,
          off_barcode: r.off_barcode || null,
          off_nutrition_json: r.off_nutrition_json || null,
        })),"""

if old_mapping in content:
    content = content.replace(old_mapping, new_mapping, 1)
    changes += 1
    print('2. Added image + OFF fields to response mapping')
else:
    print('2. SKIP: Could not find response mapping')

# 3. Add image_url and location_id to detail endpoint query
# The detail endpoint at /api/ingredients/detail/ returns per-store prices
old_detail = "        SELECT cp.*, sr.name as source_name, sr.city, sr.state, sr.website as store_website"
new_detail = "        SELECT cp.*, cp.image_url as price_image_url, cp.location_id, sr.name as source_name, sr.city, sr.state, sr.website as store_website"

if old_detail in content:
    content = content.replace(old_detail, new_detail, 1)
    changes += 1
    print('3. Added image_url + location_id to detail query')
else:
    print('3. SKIP: Could not find detail SELECT')

# 4. Add image_url to per-store price response in detail endpoint
old_price_map = "          inStock: p.in_stock === 1,"
# Find the one in the detail endpoint section (should be around line 800)
# There may be multiple occurrences, we want the one near "store_website"
idx = content.find("store_website")
if idx > 0:
    detail_section = content[idx:idx+2000]
    if "inStock: p.in_stock === 1," in detail_section:
        old_in_detail = "          inStock: p.in_stock === 1,"
        new_in_detail = "          inStock: p.in_stock === 1,\n          imageUrl: p.price_image_url || p.image_url || null,\n          locationId: p.location_id || null,"
        # Replace only in the detail section area
        pre = content[:idx]
        post = content[idx:]
        post = post.replace(old_in_detail, new_in_detail, 1)
        content = pre + post
        changes += 1
        print('4. Added imageUrl + locationId to detail price response')
    else:
        print('4. SKIP: Could not find inStock in detail section')
else:
    print('4. SKIP: Could not find store_website reference')

if changes > 0:
    with open(PATH_FILE, 'w') as f:
        f.write(content)

print(f'\n{changes} changes applied to sync-api.mjs')
