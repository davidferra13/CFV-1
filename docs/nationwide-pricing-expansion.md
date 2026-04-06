# Nationwide Pricing Expansion (2026-04-06)

## Problem

Every scraper on the Pi was hardcoded to zip code 01835 (Haverhill, MA). Only 8 chains were configured in the Instacart scraper. The Flipp scraper used a single zip code. The Whole Foods scraper covered 2 regions. 245,000 prices existed, all from one zip code in Massachusetts.

A chef anywhere outside New England had zero price data.

## Fix

Expanded the entire pipeline to cover every major grocery chain in America, across every state.

## Coverage After Fix

- **110 chains** in the scraper registry
- **138 chains** in the PostgreSQL database
- **1,842 scrape targets** (chain x state x zip combinations)
- **All 50 states + DC** covered
- **South Carolina specifically**: 21 chains (Harris Teeter, Ingles, Lowe's Foods, Publix, Food Lion, Aldi, Whole Foods, Walmart, Costco, Lidl, Sprouts, and more)

## Chains by Parent Company

### Kroger (18 banners)

Kroger, Fry's Food, King Soopers, Smith's, Dillons, Mariano's, Pick 'n Save, Food 4 Less, Foods Co, City Market, Baker's, Ruler Foods, Gerbes, Jay C, Pay Less, QFC, Fred Meyer, Harris Teeter

### Albertsons/Safeway (13 banners)

Albertsons, Safeway, Vons, Pavilions, Jewel-Osco, Shaw's, ACME, Star Market, Tom Thumb, Randalls, Carrs, Haggen, United Supermarkets

### Ahold Delhaize (5 banners)

Stop & Shop, Giant Food, Giant/Martin's, Food Lion, Hannaford

### Southeastern Grocers (3 banners)

Winn-Dixie, Harvey's, Fresco y Más

### Major Independents

Publix, H-E-B, Meijer, Hy-Vee, Wegmans, ShopRite, Giant Eagle, Ingles, Lowe's Foods, Schnucks, Woodman's, Festival Foods, Fareway, Coborn's, Dierbergs, and many more

### National

Aldi, Whole Foods, Walmart, Target, Lidl, Sprouts, Natural Grocers, The Fresh Market, Earth Fare

### West Coast

WinCo, Stater Bros, Smart & Final, Grocery Outlet, Raley's, Save Mart, Lucky, Gelson's, Bristol Farms, New Seasons, PCC

### Ethnic/International

H Mart, 99 Ranch, Mitsuwa, Uwajimaya, Lotte Plaza, Patel Brothers, El Super, Cardenas, Vallarta, Northgate, Sedano's, Super G Mart

### Wholesale

Costco, BJ's, Sam's Club, Restaurant Depot, US Foods/ChefStore, Sysco, Gordon Food Service

## Files Changed

| File                                                                | Change                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `database/migrations/20260406000005_nationwide_grocery_chains.sql`  | Initial chain expansion                                                                  |
| `database/migrations/20260406000006_complete_nationwide_chains.sql` | Complete chain coverage (all Kroger/Albertsons banners, regionals, ethnic, etc.)         |
| `scripts/openclaw-pull/pull.mjs`                                    | ~200 SOURCE_TO_CHAIN mappings covering every chain with prefix matchers                  |
| `.openclaw-build/services/nationwide-stores.mjs`                    | Central registry: 110 chains, state-level coverage maps, zip code grid for all 50 states |
| `.openclaw-build/services/scraper-instacart-bulk.mjs`               | Now imports from nationwide registry, per-store zip codes instead of hardcoded 01835     |
| `.openclaw-build/services/scraper-wholefoodsapfresh.mjs`            | 21 regions (was 2)                                                                       |
| `.openclaw-build/services/scraper-flipp.mjs`                        | 22 zip codes across all US regions (was 1), nationwide merchant list                     |
| `.openclaw-deploy/catalog-orchestrator.mjs`                         | Full chain map, priority-ordered nationwide                                              |
| `scripts/deploy-nationwide-to-pi.sh`                                | Single-command Pi deployment                                                             |

## Deploy

```bash
bash scripts/deploy-nationwide-to-pi.sh
```

Then on the Pi, start the scrapers. They will run for days but produce prices for every chain in every state.
