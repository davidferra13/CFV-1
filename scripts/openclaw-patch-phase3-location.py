#!/usr/bin/env python3
"""
Phase 3 (partial): Add location_id to store-specific scrapers.
Walmart (#2153 Methuen) and Target (#1290 Methuen) already know their store.
Just need to tag prices with location_id.
"""

# =============================================================================
# WALMART: Add location_id
# =============================================================================
def patch_walmart():
    path = '/home/davidferra/openclaw-prices/services/scraper-walmart.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # Add LOCATION_ID constant near other constants
    old_const = "const SOURCE_ID = 'walmart-methuen-ma';"
    new_const = "const SOURCE_ID = 'walmart-methuen-ma';\nconst LOCATION_ID = 'walmart-methuen-2153';"
    if old_const in content and 'LOCATION_ID' not in content:
        content = content.replace(old_const, new_const, 1)
        changes += 1
        print('[walmart] 1. Added LOCATION_ID constant')
    else:
        print('[walmart] 1. SKIP: Already has LOCATION_ID or pattern not found')

    # Add locationId to upsertPrice call (after imageUrl line)
    old_upsert = "    imageUrl: product.imageUrl || null,\n  });"
    new_upsert = "    imageUrl: product.imageUrl || null,\n    locationId: LOCATION_ID,\n  });"
    if old_upsert in content and 'locationId' not in content:
        content = content.replace(old_upsert, new_upsert, 1)
        changes += 1
        print('[walmart] 2. Added locationId to upsertPrice')
    else:
        print('[walmart] 2. SKIP: Already has locationId or pattern not found')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[walmart] {changes} changes applied')


# =============================================================================
# TARGET: Add location_id
# =============================================================================
def patch_target():
    path = '/home/davidferra/openclaw-prices/services/scraper-target.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # Find TARGET_STORE_ID and add LOCATION_ID
    old_const = "const TARGET_STORE_ID = '1290';"
    if old_const in content and 'LOCATION_ID' not in content:
        new_const = old_const + "\nconst LOCATION_ID = 'target-methuen-1290';"
        content = content.replace(old_const, new_const, 1)
        changes += 1
        print('[target] 1. Added LOCATION_ID constant')
    elif 'TARGET_STORE_ID' in content and 'LOCATION_ID' not in content:
        # Try alternate pattern
        import re
        m = re.search(r"const TARGET_STORE_ID = ['\"](\d+)['\"];", content)
        if m:
            old = m.group(0)
            content = content.replace(old, old + f"\nconst LOCATION_ID = 'target-methuen-{m.group(1)}';", 1)
            changes += 1
            print('[target] 1. Added LOCATION_ID constant (alternate pattern)')
    else:
        print('[target] 1. SKIP')

    # Add locationId to upsertPrice (after imageUrl line)
    old_upsert = "    imageUrl: imageUrl || null,"
    new_upsert = "    imageUrl: imageUrl || null,\n    locationId: LOCATION_ID,"
    if old_upsert in content and 'locationId' not in content:
        content = content.replace(old_upsert, new_upsert, 1)
        changes += 1
        print('[target] 2. Added locationId to upsertPrice')
    else:
        print('[target] 2. SKIP')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[target] {changes} changes applied')


# =============================================================================
# STOP & SHOP: Add location_id per store config
# =============================================================================
def patch_stopsandshop():
    path = '/home/davidferra/openclaw-prices/services/scraper-stopsandshop.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # Add locationId to upsertPrice (after inStock line)
    old_upsert = "            inStock: product.inStock !== undefined ? product.inStock : true,"
    new_upsert = "            inStock: product.inStock !== undefined ? product.inStock : true,\n            locationId: store.locationId || store.sourceId,"
    if old_upsert in content and 'locationId' not in content:
        content = content.replace(old_upsert, new_upsert, 1)
        changes += 1
        print('[stopsandshop] 1. Added locationId to upsertPrice')
    else:
        print('[stopsandshop] 1. SKIP')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[stopsandshop] {changes} changes applied')


# =============================================================================
# INSTACART: Add location_id (uses geolocation, tag with zip-based ID)
# =============================================================================
def patch_instacart():
    path = '/home/davidferra/openclaw-prices/services/scraper-instacart-bulk.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # The Instacart scraper uses geolocation (Haverhill 42.7762, -71.0773)
    # Add a default location_id based on that
    old_upsert = "    inStock: product.inStock !== undefined ? product.inStock : true,"
    new_upsert = "    inStock: product.inStock !== undefined ? product.inStock : true,\n    locationId: store.sourceId + '-haverhill',"
    if old_upsert in content and 'locationId' not in content:
        content = content.replace(old_upsert, new_upsert, 1)
        changes += 1
        print('[instacart] 1. Added locationId to upsertPrice (haverhill default)')
    else:
        print('[instacart] 1. SKIP')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[instacart] {changes} changes applied')


# =============================================================================
# FLIPP: Add location_id
# =============================================================================
def patch_flipp():
    path = '/home/davidferra/openclaw-prices/services/scraper-flipp.mjs'
    with open(path, 'r') as f:
        content = f.read()

    changes = 0

    # Flipp uses postal code for location. Add locationId to upsertPrice
    old_upsert = "        imageUrl: item.imageUrl || null,"
    new_upsert = "        imageUrl: item.imageUrl || null,\n        locationId: item.sourceId + '-haverhill',"
    if old_upsert in content and 'locationId' not in content:
        content = content.replace(old_upsert, new_upsert, 1)
        changes += 1
        print('[flipp] 1. Added locationId to upsertPrice')
    else:
        print('[flipp] 1. SKIP')

    if changes > 0:
        with open(path, 'w') as f:
            f.write(content)
    print(f'[flipp] {changes} changes applied')


if __name__ == '__main__':
    print('=== Phase 3 (partial): Location IDs ===\n')
    patch_walmart()
    print()
    patch_target()
    print()
    patch_stopsandshop()
    print()
    patch_instacart()
    print()
    patch_flipp()
    print('\n=== Phase 3 Complete ===')
