#!/usr/bin/env python3
"""Patch scraper-stopsandshop.mjs to pass imageUrl to upsertPrice."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/scraper-stopsandshop.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

# Add imageUrl to upsertPrice call (after sourceUrl line)
old_line = "            sourceUrl: store.baseUrl,"
new_line = "            sourceUrl: store.baseUrl,\n            imageUrl: product.imageUrl || null,"

if old_line in content:
    content = content.replace(old_line, new_line, 1)
    print('1. Added imageUrl to upsertPrice call')
else:
    print('1. SKIP: Could not find sourceUrl line in upsertPrice')

# Check if scrapeCategory already extracts images from the page
# If not, we need to add it to the product extraction
if 'imageUrl' not in content.split('upsertPrice')[0]:
    # Find where products are pushed in scrapeCategory
    old_product_push = "products.push({ name: productName, priceText, size });"
    new_product_push = "const imgEl = await el.$('img');\n          const imgSrc = imgEl ? await imgEl.evaluate(i => i.src) : null;\n          products.push({ name: productName, priceText, size, imageUrl: imgSrc });"

    if old_product_push in content:
        content = content.replace(old_product_push, new_product_push, 1)
        print('2. Added image extraction to scrapeCategory')
    else:
        print('2. SKIP: Could not find products.push pattern (may differ)')

with open(PATH_FILE, 'w') as f:
    f.write(content)

print('Done.')
