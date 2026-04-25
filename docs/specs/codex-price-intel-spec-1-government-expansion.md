# Codex Build Spec: Government Data Source Expansion

> **Priority:** P0 - This is free data that covers all 50 states immediately
> **Risk:** LOW - purely additive, no existing code modified
> **Estimated scope:** ~100 lines changed across 1 file

## Context

`scraper-government.mjs` at `.openclaw-build/services/scraper-government.mjs` currently only scrapes BLS Northeast (APU02) price data. It also fetches FRED CPI data but throws it away (never writes to DB). This spec expands it to cover all 4 BLS regions + national, persists FRED data, and adds 5 missing BLS series.

## File to Modify

**ONLY** `.openclaw-build/services/scraper-government.mjs` (586 lines)

## Changes Required

### Change 1: Add BLS Regional Series (HIGHEST VALUE)

The current `BLS_SERIES` array (lines 36-79) contains 43 series all with prefix `APU02` (Northeast). For each series, create 4 additional entries with these prefixes:

| Prefix  | Region                     | Source ID to use   |
| ------- | -------------------------- | ------------------ |
| `APU00` | National (US city average) | `gov-bls-national` |
| `APU01` | Midwest                    | `gov-bls-midwest`  |
| `APU03` | South                      | `gov-bls-south`    |
| `APU04` | West                       | `gov-bls-west`     |

**How to implement:**

Replace the hardcoded `BLS_SERIES` array with a builder pattern:

```javascript
const BLS_REGIONS = [
  { prefix: 'APU00', sourceId: 'gov-bls-national', region: 'National' },
  { prefix: 'APU01', sourceId: 'gov-bls-midwest', region: 'Midwest' },
  { prefix: 'APU02', sourceId: 'gov-bls-northeast', region: 'Northeast' },
  { prefix: 'APU03', sourceId: 'gov-bls-south', region: 'South' },
  { prefix: 'APU04', sourceId: 'gov-bls-west', region: 'West' },
]

// Base series suffixes (strip the APU02 prefix from current entries)
const BLS_BASE_SERIES = [
  {
    suffix: '00703111',
    name: 'Flour, white, all purpose, per lb',
    unit: 'lb',
    ingredientId: 'flour-all-purpose',
  },
  {
    suffix: '00703112',
    name: 'Rice, white, long grain, uncooked, per lb',
    unit: 'lb',
    ingredientId: 'rice-white',
  },
  // ... (extract all 43 from current array, keeping name/unit/ingredientId)
]

// Generate the full series list
const BLS_SERIES = BLS_REGIONS.flatMap((region) =>
  BLS_BASE_SERIES.map((base) => ({
    seriesId: `${region.prefix}${base.suffix}`,
    name: `${base.name} (${region.region})`,
    unit: base.unit,
    ingredientId: base.ingredientId,
    sourceId: region.sourceId,
  }))
)
```

This turns 43 series into 215 series (43 x 5 regions).

**IMPORTANT:** The `BLS_SOURCE_ID` constant on line 30 is currently used as the sourceId for all entries. After this change, each entry has its own `sourceId` field. Update `storeBLSResults()` to use `item.sourceId` instead of the constant.

### Change 2: Add 5 Missing BLS Series

Add these to `BLS_BASE_SERIES` (they exist in the test script at `.openclaw-build/scripts/test-bls.mjs` but not in production):

```javascript
{ suffix: '00720111', name: 'Cookies, chocolate chip, per lb', unit: 'lb', ingredientId: 'cookies-chocolate-chip' },
{ suffix: '00720311', name: 'Crackers, saltine, per lb', unit: 'lb', ingredientId: 'crackers-saltine' },
{ suffix: '00720411', name: 'Potato chips, per 16 oz', unit: 'lb', ingredientId: 'potato-chips' },
{ suffix: '0FJ1101', name: 'Orange juice, frozen concentrate, 12 oz can', unit: 'can', ingredientId: 'orange-juice-concentrate' },
{ suffix: '0FN1101', name: 'Cola, per 2 liters', unit: '2l', ingredientId: 'cola' },
```

### Change 3: Persist FRED Data

Currently `fetchFRED()` returns results but `main()` on line 550 only logs the count.

Add a `storeFREDResults()` function that calls `upsertPrice()` for each FRED result that has an `ingredientId`. Skip CPI index-only entries (those without ingredientId).

```javascript
async function storeFREDResults(db, results) {
  let stored = 0
  for (const result of results) {
    if (!result.ingredientId) continue // skip CPI indexes
    await upsertPrice(db, {
      sourceId: FRED_SOURCE_ID,
      canonicalIngredientId: result.ingredientId,
      variantId: null,
      rawProductName: result.name,
      priceCents: result.priceCents,
      priceUnit: result.unit || 'each',
      pricePerStandardUnitCents: result.priceCents,
      standardUnit: result.unit || 'each',
      packageSize: null,
      priceType: 'regular',
      pricingTier: 'retail',
      confidence: 'government_baseline',
      instacartMarkupPct: null,
      sourceUrl: `https://fred.stlouisfed.org/series/${result.seriesId}`,
      saleDates: null,
    })
    stored++
  }
  return stored
}
```

Call it in `main()` after line 550:

```javascript
const fredStored = await storeFREDResults(db, fredResults)
console.log(`Stored ${fredStored} FRED price records`)
```

### Change 4: Register New Sources

In the `ensureSources()` function, add entries for the new regional source IDs:

```javascript
{ source_id: 'gov-bls-national', name: 'BLS Average Prices (National)', pricing_tier: 'retail', status: 'active' },
{ source_id: 'gov-bls-midwest', name: 'BLS Average Prices (Midwest)', pricing_tier: 'retail', status: 'active' },
{ source_id: 'gov-bls-south', name: 'BLS Average Prices (South)', pricing_tier: 'retail', status: 'active' },
{ source_id: 'gov-bls-west', name: 'BLS Average Prices (West)', pricing_tier: 'retail', status: 'active' },
```

### Change 5: Respect BLS Rate Limits

With 215 series instead of 43, the BLS API calls increase 5x. BLS v2 API allows 500 requests/day with a key, 25/day without. The current batch size is 25 series per request (line 93).

215 series / 25 per batch = 9 API calls. Well within limits. But increase the inter-batch delay from 2000ms to 3000ms to be safe:

```javascript
// line 155: change 2000 to 3000
await new Promise((r) => setTimeout(r, 3000))
```

## What NOT to Touch

- Do NOT modify `fetchBLS()` logic beyond what's described above
- Do NOT modify `ensureCanonicalIngredients()` (lines 303-519)
- Do NOT modify `initSchema()` or `migrateSchema()` in db.mjs
- Do NOT modify any other scraper file
- Do NOT modify any ChefFlow-side code

## Verification

After changes, run:

```bash
node .openclaw-build/services/scraper-government.mjs
```

Expected output should show:

- "Fetching BLS data..." with ~215 series across 5 regions
- "Stored X BLS price records" (should be ~200+)
- "Stored X FRED price records" (should be 1, the chicken entry)
- No errors

## Definition of Done

1. BLS data collected for all 5 regions (national + 4 geographic)
2. FRED price data (chicken whole) persisted to database
3. 5 additional BLS series added
4. All new sources registered in source registry
5. Script runs without errors
