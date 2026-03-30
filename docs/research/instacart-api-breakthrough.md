# Research: Instacart API Reverse Engineering

> **Date:** 2026-03-30
> **Question:** How to get product data from Instacart without running their JavaScript client?
> **Status:** complete

## Summary

Instacart's product data is available via GET-based GraphQL persisted queries. The API requires (1) valid session cookies from a browser and (2) the SHA256 hash of the query, not the query string itself. This eliminates the need for Puppeteer on the Pi.

## Detailed Findings

### What Doesn't Work

1. **POST /graphql with ad-hoc query strings** - Returns `PersistedQueryNotSupported`. Instacart only accepts persisted queries.
2. **POST /graphql with operationName + variables only** - Returns `Blank Query`.
3. **POST /graphql with APQ hash format** - Returns `PersistedQueryNotSupported` (wrong format).
4. **REST APIs (/v3/_, /api/v3/_)** - All return 404.
5. **HTML scraping** - Instacart is 100% client-rendered. Zero product data in HTML.
6. **RSC (React Server Components) requests** - Returns page shell with no products.
7. **Puppeteer on Pi** - Chromium crashes on Instacart's heavy React pages (timeout, OOM).

### What Works: GET-based Persisted Queries

Instacart's JavaScript client makes **GET requests** (not POST) to `/graphql` with three URL parameters:

- `operationName`: e.g., `SearchResultsPlacements`
- `variables`: JSON-encoded query parameters
- `extensions`: Contains `persistedQuery.sha256Hash`

**Search hash:** `95c5336c23ebbb52b5d5c63c28b0bb8ef1ae5adc191c334883b357a94701ff59`
**Items hash:** `5116339819ff07f207fd38f949a8a7f58e52cc62223b535405b087e3076ebf2f`

### Session Requirements

1. **Cookies** - Must include `__Host-instacart_sid` (set by JavaScript, not HTTP headers)
2. **retailerInventorySessionToken** - Extracted from the store page HTML (URL-encoded in inline scripts)
3. **shopId** - Store identifier (e.g., `137503` for Market Basket)
4. **zoneId** - Delivery zone (e.g., `143`)
5. **postalCode** - Delivery ZIP code

### Session Capture Workflow

Since `__Host-instacart_sid` is only set by JavaScript, a browser is needed once to capture cookies:

1. Run `capture-instacart-v3.mjs` on PC (has working Chrome)
2. Saves `captured-session.json` with 30+ cookies
3. SCP to Pi: `scp captured-session.json pi:~/openclaw-prices/data/`
4. Pi uses cookies for all subsequent HTTP-only requests

Session cookies last several hours. The capture needs to run periodically (daily or when errors occur).

### Price Location

Product prices are in a nested structure:

- `item.price.viewSection.priceString` - Display price (e.g., "$5.99")
- `item.price.viewSection.priceValueString` - Numeric value (e.g., "5.99")
- `item.price.viewSection.itemCard.priceString` - Card display price
- `item.price.viewSection.itemDetails.pricePerUnitString` - Per-unit price (e.g., "$0.12/fl oz")

### Required Variables for SearchResultsPlacements

```json
{
  "filters": [],
  "query": "<search term>",
  "pageViewId": "<random UUID>",
  "retailerInventorySessionToken": "<from store page>",
  "searchSource": "search",
  "orderBy": "bestMatch",
  "contentManagementSearchParams": { "itemGridColumnCount": 6 },
  "shopId": "<store ID>",
  "postalCode": "<ZIP>",
  "zoneId": "<zone>",
  "first": 60
}
```

## Gaps and Unknowns

1. **Hash stability** - The persisted query hashes may change when Instacart deploys new code. Need monitoring.
2. **Department browsing** - No known hash for browsing by department/collection. Only search works currently.
3. **Pagination** - The `first` parameter caps at ~60. For 20K SKUs, need ~350+ search terms.
4. **Rate limiting** - Instacart returns 429 after sustained high-frequency requests. 3-4 second delays work.
5. **Session lifetime** - Not exactly known. Appears to last 6-12 hours.

## Recommendations

1. **Quick fix:** Build a cron job to re-capture sessions daily via PC Chrome
2. **Needs a spec:** Auto-detect when hashes change (check for `PersistedQueryNotSupported` errors and alert)
3. **Needs discussion:** Whether to expand search terms to 500+ for full 20K SKU coverage
