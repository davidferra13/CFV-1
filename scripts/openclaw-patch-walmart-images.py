#!/usr/bin/env python3
"""Patch scraper-walmart.mjs to capture product images and pass to upsertPrice."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/scraper-walmart.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

# 1. Add imageUrl to products.push in Method 1 (__NEXT_DATA__)
old_push1 = "products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize });"
new_push1 = "const imgUrl = item?.imageInfo?.thumbnailUrl || item?.imageInfo?.url || null;\n        products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize, imageUrl: imgUrl });"

if old_push1 in content:
    content = content.replace(old_push1, new_push1, 1)
    print('1. Added imageUrl to Method 1 products.push')
else:
    print('1. SKIP: Could not find Method 1 products.push')

# 2. Add imageUrl to Method 2 (regex fallback) products.push
old_push2 = "products.push({ name, priceCents, priceUnit: 'each', pricePerStdUnit: priceCents, standardUnit: 'each', packageSize: null });"
new_push2 = "products.push({ name, priceCents, priceUnit: 'each', pricePerStdUnit: priceCents, standardUnit: 'each', packageSize: null, imageUrl: null });"

if old_push2 in content:
    content = content.replace(old_push2, new_push2, 1)
    print('2. Added imageUrl to Method 2 products.push')
else:
    print('2. SKIP: Could not find Method 2 products.push')

# 3. Add imageUrl to upsertPrice call
old_upsert = "    inStock: true,\n  });"
new_upsert = "    inStock: true,\n    imageUrl: product.imageUrl || null,\n  });"

if old_upsert in content:
    content = content.replace(old_upsert, new_upsert, 1)
    print('3. Added imageUrl to upsertPrice call')
else:
    print('3. SKIP: Could not find upsertPrice inStock line')

with open(PATH_FILE, 'w') as f:
    f.write(content)

print('Done.')
