# Price Intelligence V2 - Full Feature Set

## Overview

Seven features built on the OpenClaw price intelligence pipeline, transforming raw price data into actionable shopping intelligence for chefs.

## Features

### 1. Event-Driven Shopping Lists

Aggregates ingredients from upcoming events and runs them through the Pi optimizer.

- **Data chain:** events -> menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
- **Optimization:** Single-store best option + multi-store optimal with savings calculation
- **Store rankings:** Per-query store scorecard based on the chef's actual ingredients
- **Server action:** `getUpcomingEventShoppingPlan(daysAhead)` in `lib/openclaw/event-shopping-actions.ts`
- **UI:** `components/pricing/event-shopping-planner.tsx` on the costing page
- **Pi endpoint:** `POST /api/optimize/shopping-list` (existing) + `POST /api/stores/scorecard` (new)

### 2. Price Watch Lists

Per-ingredient target price alerts stored in PostgreSQL.

- **Table:** `price_watch_list` (chef_id scoped, unique per chef+ingredient name)
- **Migration:** `20260401000111_price_watch_list.sql`
- **CRUD actions:** `getPriceWatchList()`, `addPriceWatch()`, `removePriceWatch()`, `togglePriceWatch()`, `checkPriceWatchAlerts()`
- **Alert checking:** Queries Pi batch lookup, compares current best price against target
- **UI:** `components/pricing/price-watch-list.tsx` on the ingredients page
- **Server actions:** `lib/openclaw/price-watch-actions.ts`

### 3. Cost Impact on Recipes

Shows which ingredients changed price recently and by how much.

- **Pi endpoint:** `POST /api/prices/cost-impact` - accepts ingredient names + lookback days
- **Returns:** Direction (up/down), old/new cents, change percentage, affected store
- **Server action:** `getCostImpact(ingredientNames, days)` in `lib/openclaw/price-intelligence-actions.ts`
- **UI:** `components/pricing/cost-impact.tsx` on the costing page

### 4. Store Scorecards

Personalized store rankings based on the chef's specific ingredient list.

- **Pi endpoint:** `POST /api/stores/scorecard` - per-store avg price, coverage %, win count
- **Server action:** `getStoreScorecard(ingredientNames)` in `lib/openclaw/price-intelligence-actions.ts`
- **UI:** `components/pricing/store-scorecard.tsx` on the costing page

### 5. Historical Price Sparklines

Tiny SVG inline charts showing price trends over time.

- **Pi endpoint:** `GET /api/prices/history/:ingredientId` - accepts canonical ID or ingredient name (smart lookup)
- **Returns:** Daily price minimums for sparkline rendering, current best price
- **Server action:** `getPriceHistory(ingredientId, days)` in `lib/openclaw/price-intelligence-actions.ts`
- **UI:** `components/pricing/price-sparkline.tsx` (reusable, renders green when trending down, red when up)

### 6. Nightly Scrape Cron

Automated Windows Task Scheduler script for daily price data refresh.

- **Script:** `scripts/openclaw-nightly-scrape.ps1`
- **Schedule:** Runs deep scraper, checks Pi stats, cleans old logs
- **Setup:** Register via Windows Task Scheduler (manual one-time setup)

### 7. Wholesale Price Tier Handling

Already supported in the Pi database schema via `pricing_tier` column on `current_prices` and `price_changes`. The scraper, API, and optimizer all respect the tier field. Wholesale prices are stored alongside retail with proper attribution.

## Files Changed/Created

### New Files

| File                                                      | Purpose                                   |
| --------------------------------------------------------- | ----------------------------------------- |
| `lib/openclaw/event-shopping-actions.ts`                  | Event-driven shopping plan server actions |
| `lib/openclaw/price-watch-actions.ts`                     | Price watch CRUD server actions           |
| `components/pricing/event-shopping-planner.tsx`           | Event shopping planner UI                 |
| `components/pricing/store-scorecard.tsx`                  | Store scorecard UI                        |
| `components/pricing/cost-impact.tsx`                      | Cost impact UI                            |
| `components/pricing/price-sparkline.tsx`                  | SVG sparkline component                   |
| `components/pricing/price-watch-list.tsx`                 | Price watch list UI                       |
| `database/migrations/20260401000111_price_watch_list.sql` | Price watch list table                    |
| `scripts/openclaw-nightly-scrape.ps1`                     | Windows Task Scheduler script             |

### Modified Files

| File                                         | Change                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `lib/openclaw/price-intelligence-actions.ts` | Added StoreScorecard, CostImpact, PriceHistory types and actions          |
| `app/(chef)/culinary/costing/page.tsx`       | Added event shopping planner, cost impact, and store scorecard sections   |
| `app/(chef)/culinary/ingredients/page.tsx`   | Added PriceWatchList component                                            |
| `.openclaw-build/services/sync-api.mjs`      | Added scorecard, history, cost-impact endpoints; smart lookup for history |
| `.openclaw-build/lib/db.mjs`                 | Stock tracking (in_stock column, migration, upsert updates)               |

### Pi Endpoints (New)

| Endpoint                        | Method | Purpose                                    |
| ------------------------------- | ------ | ------------------------------------------ |
| `POST /api/stores/scorecard`    | POST   | Per-store rankings for ingredient set      |
| `GET /api/prices/history/:id`   | GET    | Price change history (supports name or ID) |
| `POST /api/prices/cost-impact`  | POST   | Recent price changes for ingredient set    |
| `GET /api/stock/summary`        | GET    | Overall availability stats                 |
| `GET /api/stock/ingredient/:id` | GET    | Per-store availability for one ingredient  |

## Non-Blocking

All Pi calls are wrapped in try/catch with graceful fallbacks. If the Pi is offline, components either don't render or show an empty state. No feature blocks on Pi availability.
