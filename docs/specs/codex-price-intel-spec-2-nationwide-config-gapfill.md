# Codex Build Spec: Nationwide Config Gap Fill

> **Priority:** P0 - Missing states means missing coverage
> **Risk:** VERY LOW - data-only file, no logic changes
> **Estimated scope:** ~30 lines added to 1 file

## Context

`nationwide-config.mjs` at `.openclaw-build/services/nationwide-config.mjs` defines Walmart and Target store IDs for nationwide scraping. The Walmart list claims 50-state coverage but is missing 7 states. Target only covers 24 states.

## File to Modify

**ONLY** `.openclaw-build/services/nationwide-config.mjs`

## Changes Required

### Change 1: Add Missing Walmart Stores

The current `WALMART_STORES` array (lines 14-74) is missing these states. Add one store per missing state. Use real Walmart store IDs (look them up from the Walmart store finder at walmart.com/store/finder).

Missing states and suggested stores:

```javascript
// Add these to the WALMART_STORES array:
{ storeId: 2186, zip: '05401', city: 'Williston', state: 'VT' },
{ storeId: 2651, zip: '03103', city: 'Manchester', state: 'NH' },
{ storeId: 1959, zip: '04401', city: 'Bangor', state: 'ME' },
{ storeId: 3455, zip: '19720', city: 'New Castle', state: 'DE' },
{ storeId: 1827, zip: '21742', city: 'Hagerstown', state: 'MD' },
{ storeId: 4256, zip: '02886', city: 'Warwick', state: 'RI' },
{ storeId: 3752, zip: '25705', city: 'Huntington', state: 'WV' },
```

**IMPORTANT:** These store IDs are approximate. The scraper will still work even if a store ID is wrong (it just returns fewer results for that store). The zip code and state are what matter for geographic tagging of prices.

### Change 2: Fix the Module Export Comment

Line 9 says `getTargetStores, getWalmartStores, getZipsForState` are exported, but only `getStoresForScraper` exists. Update the comment to match reality:

```javascript
// Exports: WALMART_STORES, TARGET_STORES, CHEF_SEARCH_TERMS, getStoresForScraper
```

## What NOT to Touch

- Do NOT modify `TARGET_STORES` (24 stores is fine for now)
- Do NOT modify `CHEF_SEARCH_TERMS`
- Do NOT modify `getStoresForScraper()`
- Do NOT modify any other file

## Verification

After changes, run:

```bash
node -e "import('./. openclaw-build/services/nationwide-config.mjs').then(m => { console.log('Walmart stores:', m.WALMART_STORES.length); console.log('States:', [...new Set(m.WALMART_STORES.map(s => s.state))].sort().join(', ')); })"
```

Expected: 59 Walmart stores, all 50 states listed.

## Definition of Done

1. All 50 US states represented in `WALMART_STORES`
2. Export comment matches actual exports
3. File imports without errors
