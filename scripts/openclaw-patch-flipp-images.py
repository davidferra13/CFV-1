#!/usr/bin/env python3
"""Patch scraper-flipp.mjs to capture flyer item images and pass to upsertPrice."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/scraper-flipp.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

changes = 0

# 1. Add imageUrl to item extraction from Flipp API
old_push = """        allItems.push({
          name: item.name,
          priceCents: Math.round(item.current_price * 100),
          description: item.description || '',
          priceType: item.valid_from ? 'sale' : 'regular',
          validFrom: item.valid_from || null,
          validTo: item.valid_to || null,
          confidence: 'flyer_scrape',
          merchantId: item.merchant_id,
          sourceId: store.sourceId,
          store: store,
        });"""
new_push = """        allItems.push({
          name: item.name,
          priceCents: Math.round(item.current_price * 100),
          description: item.description || '',
          priceType: item.valid_from ? 'sale' : 'regular',
          validFrom: item.valid_from || null,
          validTo: item.valid_to || null,
          confidence: 'flyer_scrape',
          merchantId: item.merchant_id,
          sourceId: store.sourceId,
          store: store,
          imageUrl: item.cutout_image_url || item.image_url || item.large_image_url || null,
        });"""

if old_push in content:
    content = content.replace(old_push, new_push, 1)
    changes += 1
    print('1. Added imageUrl to Flipp item extraction')
else:
    print('1. SKIP: Could not find allItems.push')

# 2. Add imageUrl to upsertPrice call
old_upsert = "        sourceUrl: `https://flipp.com/search?q=${encodeURIComponent(item.name)}&merchant_id=${item.merchantId}`,"
new_upsert = """        sourceUrl: `https://flipp.com/search?q=${encodeURIComponent(item.name)}&merchant_id=${item.merchantId}`,
        imageUrl: item.imageUrl || null,"""

if old_upsert in content:
    content = content.replace(old_upsert, new_upsert, 1)
    changes += 1
    print('2. Added imageUrl to upsertPrice call')
else:
    print('2. SKIP: Could not find sourceUrl in upsertPrice')

if changes > 0:
    with open(PATH_FILE, 'w') as f:
        f.write(content)
print(f'{changes} changes applied')
