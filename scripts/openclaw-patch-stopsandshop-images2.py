#!/usr/bin/env python3
"""Patch scraper-stopsandshop.mjs to extract product images from page."""

PATH_FILE = '/home/davidferra/openclaw-prices/services/scraper-stopsandshop.mjs'

with open(PATH_FILE, 'r') as f:
    content = f.read()

# Add image extraction right before items.push
old_push = "        items.push({ name, priceText, size, unitPrice });"
new_push = """        const imgEl = card.querySelector('img[src*=\"product\"], img[src*=\"image\"], img[data-testid], img');
        const imageUrl = imgEl?.src || null;

        items.push({ name, priceText, size, unitPrice, imageUrl });"""

if old_push in content:
    content = content.replace(old_push, new_push, 1)
    print('Added image extraction to scrapeCategory')
else:
    print('SKIP: Could not find items.push line')

with open(PATH_FILE, 'w') as f:
    f.write(content)

print('Done.')
