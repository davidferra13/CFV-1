#!/usr/bin/env python3
"""Patch scraper-instacart-bulk.mjs to capture product images and pass to upsertPrice."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/scraper-instacart-bulk.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

# 1. Add image extraction to extractProducts
# Find the products.push block and add imageUrl
old_push = "          size: obj.size || obj.unitSize || '',"
new_push = "          size: obj.size || obj.unitSize || '',\n          imageUrl: obj.imageUrl || obj.image || obj.thumbnailUrl || (obj.viewSection && obj.viewSection.itemImage && obj.viewSection.itemImage.url) || null,"

if old_push in content:
    content = content.replace(old_push, new_push, 1)
    print('1. Added imageUrl to extractProducts')
else:
    print('1. SKIP: Could not find products.push size line')

# 2. Add imageUrl to upsertPrice call
old_upsert = "    instacartMarkupPct: store.markupPct,\n    sourceUrl:"
new_upsert = "    instacartMarkupPct: store.markupPct,\n    sourceUrl:"

# More targeted: add imageUrl after sourceUrl line
old_source_line = "    sourceUrl: `${INSTACART_BASE}/store/${store.slug}`,"
if old_source_line in content:
    new_source_line = old_source_line + "\n    imageUrl: product.imageUrl || null,"
    content = content.replace(old_source_line, new_source_line, 1)
    print('2. Added imageUrl to upsertPrice call')
else:
    print('2. SKIP: Could not find sourceUrl line in upsertPrice')

with open(PATH_FILE, 'w') as f:
    f.write(content)

print('Done.')
