# Codex Build Spec: Scraper Error Logging & Hardening

> **Priority:** P1 - Invisible failures are worse than visible ones
> **Risk:** LOW - adding logging, not changing logic
> **Estimated scope:** ~40 lines changed across 2 files

## Context

Both nationwide scrapers silently swallow errors. When a store returns zero results or an HTTP call fails, there is no log output. This makes debugging impossible when the scrapers inevitably get blocked.

## Files to Modify

1. `.openclaw-build/services/scraper-walmart-nationwide.mjs`
2. `.openclaw-build/services/scraper-target-nationwide.mjs`

## Changes Required

### Change 1: Walmart - Add Error Logging

**Line 60** currently reads:

```javascript
} catch { return []; }
```

Change to:

```javascript
} catch (err) {
  console.error(`[Walmart] Failed to fetch "${term}" at store ${storeId}: ${err.message}`);
  return [];
}
```

### Change 2: Walmart - Add Store-Level Summary

After the inner loop that processes all search terms for a store (around line 140), add a summary log:

```javascript
console.log(
  `[Walmart] Store ${store.storeId} (${store.city}, ${store.state}): ${storeProducts} products found`
)
```

Where `storeProducts` is a counter incremented each time products are found for that store. Add `let storeProducts = 0;` before the search term loop for each store, and increment it by the number of products returned.

### Change 3: Target - Add Error Logging

**Line 44** currently reads:

```javascript
} catch { return null; }
```

Change to:

```javascript
} catch (err) {
  console.error(`[Target] Failed to fetch "${term}" at store ${storeId}: ${err.message}`);
  return null;
}
```

### Change 4: Target - Remove Fingerprint

**Line 36** has:

```javascript
visitor_id: 'openclaw'
```

Change to a generic value:

```javascript
visitor_id: crypto.randomUUID().replace(/-/g, '').slice(0, 16)
```

Add at the top of the file (after existing imports):

```javascript
import crypto from 'crypto'
```

### Change 5: Target - Add Store-Level Summary

Same pattern as Walmart. After processing all search terms for a store, log:

```javascript
console.log(
  `[Target] Store ${store.storeId} (${store.city}, ${store.state}): ${storeProducts} products found`
)
```

### Change 6: Both Files - Add Run Summary

At the end of `main()` in both files, add:

```javascript
console.log(`\n=== ${totalProducts} total products across ${stores.length} stores ===`)
console.log(
  `=== ${totalStoresWithData} stores returned data, ${stores.length - totalStoresWithData} returned nothing ===`
)
```

Track `totalProducts` and `totalStoresWithData` counters throughout the main loop.

## What NOT to Touch

- Do NOT change rate limiting delays
- Do NOT change the HTTP request logic or URLs
- Do NOT change the price parsing or DB write logic
- Do NOT change `pricePerStandardUnitCents` or `saleCents` (those are separate issues)
- Do NOT modify `nationwide-config.mjs`
- Do NOT modify `db.mjs`
- Do NOT modify any ChefFlow-side code

## Verification

Run each scraper with a single store to verify logging works:

```bash
# Test Walmart (modify temporarily to only process first store, or just run and watch output)
node .openclaw-build/services/scraper-walmart-nationwide.mjs 2>&1 | head -50
```

Expected: should see `[Walmart] Store XXXX (City, ST): N products found` lines instead of silence.

## Definition of Done

1. Both scrapers log errors when HTTP calls fail
2. Both scrapers log per-store product counts
3. Both scrapers log a final summary
4. Target no longer sends `visitor_id: 'openclaw'`
5. No changes to scraping logic, rate limits, or data handling
