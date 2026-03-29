#!/usr/bin/env python3
"""
Phase 2: Add stock status + image capture to all scrapers.
Patches: Instacart (stock), Walmart (stock), Target (stock + image), Flipp (image).
"""

# =============================================================================
# INSTACART: Add stock status to extractProducts and processProduct
# =============================================================================
def patch_instacart():
    path = '/home/davidferra/openclaw-prices/services/scraper-instacart-bulk.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # 1. Add inStock to extractProducts walk
    old = "          imageUrl: obj.imageUrl || obj.image || obj.thumbnailUrl || (obj.viewSection && obj.viewSection.itemImage && obj.viewSection.itemImage.url) || null,"
    new = """          imageUrl: obj.imageUrl || obj.image || obj.thumbnailUrl || (obj.viewSection && obj.viewSection.itemImage && obj.viewSection.itemImage.url) || null,
          inStock: obj.available !== false && obj.in_stock !== false && obj.out_of_stock !== true,"""
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print('[instacart] 1. Added inStock to extractProducts')
    else:
        print('[instacart] 1. SKIP: Could not find imageUrl line in extractProducts')

    # 2. Add inStock to processProduct upsertPrice call
    old2 = "    imageUrl: product.imageUrl || null,"
    new2 = "    imageUrl: product.imageUrl || null,\n    inStock: product.inStock !== undefined ? product.inStock : true,"
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changes += 1
        print('[instacart] 2. Added inStock to upsertPrice call')
    else:
        print('[instacart] 2. SKIP: Could not find imageUrl in upsertPrice')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[instacart] {changes} changes applied')


# =============================================================================
# WALMART: Add stock status extraction
# =============================================================================
def patch_walmart():
    path = '/home/davidferra/openclaw-prices/services/scraper-walmart.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # 1. Add stock + image extraction to Method 1 products.push
    old = "const imgUrl = item?.imageInfo?.thumbnailUrl || item?.imageInfo?.url || null;\n        products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize, imageUrl: imgUrl });"
    new = """const imgUrl = item?.imageInfo?.thumbnailUrl || item?.imageInfo?.url || null;
        const stockStatus = item?.availabilityStatusV2 || item?.availabilityStatus || 'IN_STOCK';
        const isInStock = stockStatus !== 'OUT_OF_STOCK' && stockStatus !== 'NOT_AVAILABLE';
        products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize, imageUrl: imgUrl, inStock: isInStock });"""
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print('[walmart] 1. Added stock status to Method 1')
    else:
        print('[walmart] 1. SKIP: Could not find Method 1 products.push')

    # 2. Add inStock to Method 2 products.push (regex fallback, no stock data available)
    old2 = "products.push({ name, priceCents, priceUnit: 'each', pricePerStdUnit: priceCents, standardUnit: 'each', packageSize: null, imageUrl: null });"
    new2 = "products.push({ name, priceCents, priceUnit: 'each', pricePerStdUnit: priceCents, standardUnit: 'each', packageSize: null, imageUrl: null, inStock: true });"
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changes += 1
        print('[walmart] 2. Added inStock default to Method 2')
    else:
        print('[walmart] 2. SKIP: Could not find Method 2 products.push')

    # 3. Update upsertPrice call to use product.inStock
    old3 = "    inStock: true,\n    imageUrl: product.imageUrl || null,"
    new3 = "    inStock: product.inStock !== undefined ? product.inStock : true,\n    imageUrl: product.imageUrl || null,"
    if old3 in content:
        content = content.replace(old3, new3, 1)
        changes += 1
        print('[walmart] 3. Updated upsertPrice to use product.inStock')
    else:
        print('[walmart] 3. SKIP: Could not find upsertPrice inStock line')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[walmart] {changes} changes applied')


# =============================================================================
# TARGET: Add image + stock to extractProducts and upsertPrice
# =============================================================================
def patch_target():
    path = '/home/davidferra/openclaw-prices/services/scraper-target.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # 1. Add image + stock to products.push in extractProducts
    old = "      products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize });"
    new = """      // Extract image URL from enrichment data
      const imgUrl = item?.item?.enrichment?.images?.primary_image_url || null;
      // Extract availability
      const fulfillment = item?.item?.fulfillment || {};
      const isInStock = fulfillment.is_out_of_stock_in_all_store_locations !== true;

      products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize, imageUrl: imgUrl, inStock: isInStock });"""
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print('[target] 1. Added image + stock to extractProducts')
    else:
        print('[target] 1. SKIP: Could not find products.push in extractProducts')

    # 2. Update processProduct to destructure new fields
    old2 = "  const { name, priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize } = product;"
    new2 = "  const { name, priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize, imageUrl, inStock } = product;"
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changes += 1
        print('[target] 2. Updated processProduct destructuring')
    else:
        print('[target] 2. SKIP: Could not find destructuring in processProduct')

    # 3. Update upsertPrice to pass image and stock
    old3 = "    inStock: true,"
    new3 = "    inStock: inStock !== undefined ? inStock : true,\n    imageUrl: imageUrl || null,"
    if old3 in content:
        content = content.replace(old3, new3, 1)
        changes += 1
        print('[target] 3. Updated upsertPrice with image + stock')
    else:
        print('[target] 3. SKIP: Could not find inStock: true in upsertPrice')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[target] {changes} changes applied')


# =============================================================================
# STOP & SHOP: Add stock status to Puppeteer extraction
# =============================================================================
def patch_stopsandshop():
    path = '/home/davidferra/openclaw-prices/services/scraper-stopsandshop.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # 1. Add stock detection to product extraction (inside page.evaluate)
    old = "        const imgEl = card.querySelector('img[src*=\"product\"], img[src*=\"image\"], img[data-testid], img');\n        const imageUrl = imgEl?.src || null;\n\n        items.push({ name, priceText, size, unitPrice, imageUrl });"
    new = """        const imgEl = card.querySelector('img[src*="product"], img[src*="image"], img[data-testid], img');
        const imageUrl = imgEl?.src || null;

        // Check for out-of-stock indicators
        const cardText = card.textContent || '';
        const isOutOfStock = cardText.includes('Out of Stock') || cardText.includes('Unavailable') || cardText.includes('out of stock');
        const hasDisabledCart = card.querySelector('button[disabled], [class*="disabled"]') !== null;
        const inStock = !isOutOfStock && !hasDisabledCart;

        items.push({ name, priceText, size, unitPrice, imageUrl, inStock });"""
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print('[stopsandshop] 1. Added stock detection to page.evaluate')
    else:
        print('[stopsandshop] 1. SKIP: Could not find product extraction block')

    # 2. Add inStock to upsertPrice call
    old2 = "            imageUrl: product.imageUrl || null,"
    new2 = "            imageUrl: product.imageUrl || null,\n            inStock: product.inStock !== undefined ? product.inStock : true,"
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changes += 1
        print('[stopsandshop] 2. Added inStock to upsertPrice')
    else:
        print('[stopsandshop] 2. SKIP: Could not find imageUrl in upsertPrice')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[stopsandshop] {changes} changes applied')


# =============================================================================
# WATCHDOG: Add staleness rule
# =============================================================================
def patch_watchdog():
    path = '/home/davidferra/openclaw-prices/services/watchdog.mjs'
    with open(path, 'r') as f:
        content = f.read()

    # Add staleness rule before the main closing
    staleness_code = """
  // Staleness rule: mark items out of stock if not confirmed in 7 days
  // Government/wholesale sources exempt (they report monthly/quarterly)
  const staleCount = db.prepare(`
    UPDATE current_prices
    SET in_stock = 0
    WHERE in_stock = 1
      AND last_confirmed_at < datetime('now', '-7 days')
      AND source_id NOT IN (
        SELECT source_id FROM source_registry
        WHERE type IN ('government', 'wholesale', 'index')
      )
  `).run();
  if (staleCount.changes > 0) {
    console.log('[watchdog] Marked ' + staleCount.changes + ' stale items as out of stock (not confirmed in 7+ days)');
  }
"""

    # Find a good insertion point - right before the last closing of main or the export
    if 'Staleness rule' in content:
        print('[watchdog] SKIP: Staleness rule already exists')
        return

    # Insert before the final console.log or process summary in main()
    # Look for the watchdog summary/closing pattern
    insert_marker = "console.log('[watchdog] Complete');"
    if insert_marker not in content:
        insert_marker = "console.log('[watchdog] Done');"
    if insert_marker not in content:
        # Try to find any closing pattern in main
        insert_marker = "console.log(`[watchdog]"

    if insert_marker in content:
        idx = content.find(insert_marker)
        content = content[:idx] + staleness_code + '\n  ' + content[idx:]
        with open(path, 'w') as f:
            f.write(content)
        print('[watchdog] Added staleness rule (7-day out-of-stock)')
    else:
        print('[watchdog] SKIP: Could not find insertion point. Manual edit needed.')


if __name__ == '__main__':
    print('=== Phase 2: Stock Status + Image Capture ===\n')
    patch_instacart()
    print()
    patch_walmart()
    print()
    patch_target()
    print()
    patch_stopsandshop()
    print()
    patch_watchdog()
    print('\n=== Phase 2 Complete ===')
