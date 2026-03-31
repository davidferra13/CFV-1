# Food Catalog Pipeline Update (2026-03-30)

## What Changed

The OpenClaw price intelligence pipeline was overhauled. The Food Catalog page at `/culinary/price-catalog` now reflects the full scope of the data collection system.

### Pipeline Fixes (Pi-side)

1. **Instacart chains expanded from 2 working to 11**: Fixed broken store slugs (`stop-and-shop` to `stop-shop`, `bjs-wholesale-club` to `bjs`). Added 3 new chains (Wegmans, Price Chopper, Big Y).
2. **Kroger API scraper built**: National coverage via OAuth2 API. 17 target zip codes across 14 states (OH, IN, MI, GA, TN, TX, VA, CO, OR, WA, AZ, NV, DC, NC, SC). Currently on certification endpoint (no prices); production access pending.
3. **Catalog cleaned**: 53 messy categories normalized to 12 clean ones. 4,800+ non-food items removed (cleaning supplies, pet food, medicine, etc.). 9,246 items reclassified from "Other" into proper food categories. Duplicates merged.
4. **Cron schedule optimized**: 14 Instacart walker slots (7 AM + noon), Kroger daily at 8 AM, 2 cross-match rounds, aggregator, government data weekly.

### ChefFlow-side Changes

1. **page.tsx**: Updated subtitle from "15,000+ ingredients across 39 local stores" to "43,000+ ingredients across local and national stores"
2. **catalog-actions.ts**: Updated comment from "9,000+" to "43,000+"
3. **app-complete-audit.md**: Updated section 6.3b with full source list (11 Instacart chains, Kroger national, direct API scrapers, Flipp, BLS government), and the 12 category taxonomy

### Data Sources (current)

| Source                   | Method            | Scope              | Status                                         |
| ------------------------ | ----------------- | ------------------ | ---------------------------------------------- |
| Instacart (11 chains)    | Department walker | New England        | Active, rotating 2/day                         |
| Kroger API               | OAuth2 REST       | 14 states national | Cert env (no prices until production approved) |
| Whole Foods/Amazon Fresh | Direct scraper    | Local              | Active                                         |
| Target                   | Direct scraper    | Local              | Active                                         |
| Walmart                  | Direct scraper    | Local              | Active                                         |
| Stop & Shop              | Direct scraper    | Local              | Active (Tue/Thu/Sat)                           |
| Flipp                    | Circular ads      | Local              | Active daily                                   |
| BLS Government           | CPI data          | National           | Active weekly                                  |

### Pending

- Kroger Production API access (user must apply at developer.kroger.com) - this is the single remaining blocker for real national price data
- Once approved: change `api-ce.kroger.com` to `api.kroger.com` in Pi scraper
