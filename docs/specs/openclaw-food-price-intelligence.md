# OpenClaw Food Price Intelligence System

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none (builds on existing OpenClaw infrastructure + ChefFlow costing engine)
> **Estimated complexity:** large (new Pi services + ChefFlow integration + data pipeline)
> **Created:** 2026-03-28
> **Built by:** not started

---

## What This Does

Transforms OpenClaw from a business lead crawler into a comprehensive food price intelligence system for New England. OpenClaw runs on a Raspberry Pi 24/7, scraping grocery stores, wholesale distributors, government databases, weekly flyers, and supplier catalogs to build and maintain a living food price database. This database powers ChefFlow's costing engine with real, current, source-attributed prices so that chefs can cost menus accurately without manually entering and updating ingredient prices. The raw database is an admin-only tool; regular chef users see accurate prices surface automatically in the recipe and menu costing workflow.

## Why It Matters

Every existing food costing tool (Meez, ChefTec, Galley, MarginEdge) requires chefs to manually enter and maintain ingredient prices. Nobody does this consistently, so food cost calculations are always stale or empty. ChefFlow will be the first platform where prices are already there, always current, sourced from real data, and the chef just confirms or adjusts. This is the competitive moat: a costing engine backed by a living price database that no human has to maintain.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Source Registry](#2-source-registry)
3. [Data Sources](#3-data-sources)
4. [Three-Phase Lifecycle](#4-three-phase-lifecycle)
5. [Data Pipeline](#5-data-pipeline)
6. [Canonical Ingredient System](#6-canonical-ingredient-system)
7. [Email System](#7-email-system)
8. [Receipt Processing](#8-receipt-processing)
9. [Pi-to-ChefFlow Sync](#9-pi-to-chefflow-sync)
10. [ChefFlow Integration](#10-chefflow-integration)
11. [Admin Catalog (Admin-Only)](#11-admin-catalog-admin-only)
12. [Failure Resilience](#12-failure-resilience)
13. [Monitoring and Alerts](#13-monitoring-and-alerts)
14. [Security and Legal](#14-security-and-legal)
15. [Implementation Phases](#15-implementation-phases)
16. [Prerequisites](#16-prerequisites)
17. [Files to Create](#17-files-to-create)
18. [Files to Modify](#18-files-to-modify)
19. [Database Changes](#19-database-changes)
20. [Edge Cases and Error Handling](#20-edge-cases-and-error-handling)
21. [Verification Steps](#21-verification-steps)
22. [Out of Scope](#22-out-of-scope)
23. [Notes for Builder Agent](#23-notes-for-builder-agent)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    RASPBERRY PI                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Discovery    │  │   Scrapers   │  │   Receipt    │  │
│  │  Service      │  │  (per-source)│  │   Processor  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         ▼                 ▼                  ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Normalization Engine                 │   │
│  │   (rule-based matching + qwen3:8b fallback)      │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Price Database (SQLite)              │   │
│  │  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │   │
│  │  │  Current     │  │  Change  │  │  Source     │  │   │
│  │  │  Snapshot    │  │  Log     │  │  Registry   │  │   │
│  │  └─────────────┘  └──────────┘  └────────────┘  │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
│  ┌──────────────┐  ┌────┴─────┐  ┌──────────────────┐  │
│  │  Email       │  │ Sync API │  │  Admin Dashboard  │  │
│  │  Service     │  │ (HTTP)   │  │  (Web UI)         │  │
│  └──────────────┘  └────┬─────┘  └──────────────────┘  │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │ (nightly pull via cron)
┌─────────────────────────┼───────────────────────────────┐
│                    DEVELOPER PC                          │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Local SQLite Copy                      │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────┼───────────────────────────┐   │
│  │              ChefFlow Application                 │   │
│  │                      ▼                            │   │
│  │  ┌──────────────────────────────────────────┐     │   │
│  │  │  Price Sync Service                      │     │   │
│  │  │  (reads SQLite, updates ingredients DB)  │     │   │
│  │  └──────────────────┬───────────────────────┘     │   │
│  │                     ▼                             │   │
│  │  ┌─────────────┐  ┌──────────┐  ┌────────────┐   │   │
│  │  │  Recipe      │  │  Menu    │  │  Price     │   │   │
│  │  │  Costing     │  │  Costing │  │  Alerts    │   │   │
│  │  └─────────────┘  └──────────┘  └────────────┘   │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Key Principles

- **Pi collects, PC consumes.** OpenClaw never writes directly to ChefFlow's PostgreSQL database. It maintains its own SQLite database. A sync process bridges them.
- **Admin sees the sausage factory, users see the sausage.** The raw price database with sources, confidence scores, and scraping metadata is admin-only. Chef users see clean prices in the costing workflow.
- **Formula over AI.** Rule-based matching handles 70%+ of ingredient normalization. The local model is the fallback, not the primary path.
- **Failure is contained.** Each scraper is independent. A failure in one source never affects another. Failed scrapes never corrupt existing data.
- **No cloud AI, no paid APIs for core function.** Government APIs are free. Store scraping is free. Receipt OCR uses Tesseract (free, local). The local model runs on the Pi. The only optional paid service is a separate email domain (~$10/year).

---

## 2. Source Registry

The Source Registry is the master list of every place that sells food in New England. Each entry represents one **source** (a store, farm, distributor, market, or supplier).

### Source Schema

```json
{
  "source_id": "uuid",
  "name": "Market Basket",
  "type": "retail_chain | independent_grocery | wholesale_distributor | farm | fish_market | butcher | specialty_supplier | farmers_market",
  "chain_id": "market-basket | null",
  "address": "2 Water St",
  "city": "Haverhill",
  "state": "MA",
  "zip": "01830",
  "lat": 42.7762,
  "lon": -71.0773,
  "website": "https://www.shopmarketbasket.com",
  "phone": "978-521-1773",
  "scrape_method": "instacart | direct_website | weekly_flyer | email_catalog | government_api | none",
  "scrape_url": "https://www.instacart.com/store/market-basket/storefront",
  "has_online_pricing": true,
  "pricing_tier": "retail | wholesale | farm_direct",
  "loyalty_card_available": true,
  "scrape_loyalty_price": true,
  "status": "active | inactive | closed | blocked | undiscovered",
  "discovery_source": "google_maps | yelp | usda_directory | state_ag_directory | manual | osm",
  "last_scraped_at": "2026-03-28T03:15:00Z",
  "last_discovery_check_at": "2026-03-15T00:00:00Z",
  "scrape_interval_days": 4,
  "scrape_failures_consecutive": 0,
  "email_contact": "null | supplier@example.com",
  "email_permission_tier": "blocked | draft_queue | auto_send",
  "notes": "Primary store for developer. Instacart markup ~15-20%.",
  "instacart_markup_pct": 17,
  "created_at": "2026-03-28T00:00:00Z",
  "updated_at": "2026-03-28T03:15:00Z"
}
```

### Source Types and Scraping Methods

| Type                             | Examples                                      | Primary Scrape Method      | Fallback         |
| -------------------------------- | --------------------------------------------- | -------------------------- | ---------------- |
| Retail chain (online catalog)    | Hannaford, Stop & Shop, Shaw's, Price Chopper | Direct website (Puppeteer) | None needed      |
| Retail chain (no online catalog) | Market Basket, Trader Joe's                   | Instacart storefront       | Weekly flyer     |
| Wholesale distributor            | Sysco, US Foods                               | Account login catalog      | Email price list |
| Cash & carry wholesale           | Restaurant Depot                              | Account login catalog      | Manual entry     |
| Warehouse club                   | BJ's, Costco                                  | Instacart                  | None             |
| Farm (online store)              | Farms with Shopify/Square                     | Direct website             | Email price list |
| Farm (no online presence)        | Most small farms                              | Email outreach             | Manual entry     |
| Fish market                      | Portland Fish Exchange, local markets         | Email outreach / website   | Manual entry     |
| Butcher                          | Local butchers                                | Email outreach / website   | Manual entry     |
| Specialty supplier               | Local distributors, importers                 | Email price list           | Manual entry     |
| Government data                  | BLS, USDA AMS, FRED                           | API (JSON)                 | Direct download  |

### Chain vs Location

For retail chains, prices are regional, not per-store. One Hannaford scrape covers all Hannaford locations in a region. The registry stores individual store locations (for the user to select "my Hannaford") but the scraper runs once per chain per region, not once per store.

---

## 3. Data Sources

### Tier 1: Government (Ground Truth, Bulletproof)

These are the foundation. They never break, never block you, never change format without notice, and provide the baseline that everything else is measured against.

| Source                      | API                        | Key Required | Data                                                                              | Update Frequency | Coverage                    |
| --------------------------- | -------------------------- | ------------ | --------------------------------------------------------------------------------- | ---------------- | --------------------------- |
| BLS Average Price Data      | `api.bls.gov/publicAPI/v2` | Yes (free)   | ~70 food items, actual retail prices, Northeast region, back to 1980              | Monthly          | National + Northeast region |
| FRED (St. Louis Fed)        | `api.stlouisfed.org/fred`  | Yes (free)   | 13,108 food-related economic series, CPI, inflation tracking                      | Varies by series | National + regional         |
| USDA ERS Food Price Outlook | `api.data.gov` (USDA ERS)  | Yes (free)   | Food price forecasts, food dollar data, agricultural economics                    | Monthly          | National                    |
| USDA AMS Market News        | Direct download (CSV/XML)  | No           | Daily/weekly wholesale terminal market prices (Boston) for produce, meat, seafood | Daily-weekly     | Boston terminal market      |

**What this gives us:** The national and regional baseline. "The average price of a gallon of whole milk in the Northeast is $4.29." This is the BLS ground truth. When we can't get a local store price, we fall back to this. It's also the inflation and trend tracking layer: "milk is up 3.2% year-over-year in the Northeast."

### Tier 2: Retail Chain Direct Scraping

| Store                     | URL                                      | Method                  | Notes                                                    |
| ------------------------- | ---------------------------------------- | ----------------------- | -------------------------------------------------------- |
| Hannaford                 | hannaford.com                            | Puppeteer (JS rendered) | Full catalog with prices. Set store to nearest location. |
| Stop & Shop               | stopandshop.com                          | Puppeteer (JS rendered) | Full catalog. Set zip code for local pricing.            |
| Shaw's                    | shaws.com                                | Puppeteer (JS rendered) | Full catalog. Albertsons-owned, similar structure.       |
| Price Chopper / Market 32 | pricechopper.com                         | Puppeteer (JS rendered) | Full catalog. Northeast regional chain.                  |
| Whole Foods               | amazon.com/alm/storefront (Amazon Fresh) | Puppeteer               | Prices via Amazon Fresh. Requires location setting.      |

**Scraping protocol per store:**

1. Launch headless Chromium (one instance at a time on Pi)
2. Set location/zip to target region
3. Navigate category by category (produce, meat, dairy, etc.)
4. Extract: product name, price, unit, size/weight, sale indicator, loyalty price if different
5. Rate limit: minimum 3 seconds between page requests
6. Rotate user-agent string per session
7. If 403/429 received: stop immediately, mark source as blocked, alert on dashboard
8. Store raw scrape data temporarily; normalize in separate step

### Tier 3: Instacart Layer (Stores Without Direct Online Pricing)

| Store          | Instacart Storefront                   | Markup Estimate | Notes                                                                 |
| -------------- | -------------------------------------- | --------------- | --------------------------------------------------------------------- |
| Market Basket  | instacart.com/store/market-basket      | ~15-20%         | Developer's primary store. Cross-reference with flyer for sale items. |
| Trader Joe's   | instacart.com/store/trader-joes        | ~15-20%         | No direct online pricing.                                             |
| Aldi           | instacart.com/store/aldi               | ~15-20%         | Limited catalog.                                                      |
| BJ's Wholesale | instacart.com/store/bjs-wholesale-club | ~10-15%         | Club pricing. Requires membership context.                            |
| Costco         | instacart.com/store/costco             | ~10-15%         | Club pricing. Bulk sizes.                                             |

**Instacart scraping protocol:**

- Scrape storefront pages (publicly accessible, no login required)
- Extract: product name, displayed price, unit size
- Apply configurable markup discount factor per store (stored in source registry)
- Tag all Instacart-sourced prices with `source: "instacart"` and `confidence: "medium"`
- Slower scrape cadence (every 4-5 days) to reduce detection risk
- If Instacart blocks: degrade gracefully, mark source as temporarily unavailable

**Instacart fragility note:** Instacart actively fights scraping. Their HTML structure changes frequently. This layer WILL break periodically. The spec must treat it as best-effort, not reliable. When it's down, the system falls back to weekly flyer data + government baselines for affected stores.

### Tier 4: Weekly Flyer Scraping

| Source                  | URL                                 | Publish Day | Notes                                                       |
| ----------------------- | ----------------------------------- | ----------- | ----------------------------------------------------------- |
| Market Basket           | shopmarketbasket.com/weekly-flyer   | Wednesday   | Sale items only. Exact prices.                              |
| Hannaford               | hannaford.com (weekly ad section)   | Sunday      | Sale items.                                                 |
| Stop & Shop             | stopandshop.com (weekly circular)   | Friday      | Sale items.                                                 |
| Shaw's                  | shaws.com (weekly ad)               | Wednesday   | Sale items.                                                 |
| Aldi                    | aldi.us (weekly finds)              | Wednesday   | Sale items.                                                 |
| Third-party aggregators | ladysavings.com, hotcouponworld.com | Varies      | Parsed flyer data, may be easier to scrape than store sites |

**Flyer scrape protocol:**

- Run every Wednesday (primary publish day for most chains)
- Extract: product name, sale price, regular price (if shown), valid dates
- Tag all flyer prices with `price_type: "sale"` and include `sale_start_date` / `sale_end_date`
- After sale period expires, price record automatically marked as expired
- Historical flyer data is kept for seasonal sale pattern analysis

### Tier 5: Wholesale / Distributor Catalogs

| Source                 | Access Method                      | Account Required            | Notes                                                      |
| ---------------------- | ---------------------------------- | --------------------------- | ---------------------------------------------------------- |
| Sysco                  | sysco.com (online ordering portal) | Yes (free business account) | Full catalog with case/unit pricing. Developer to sign up. |
| US Foods               | usfoods.com (online ordering)      | Yes (free business account) | Full catalog. Developer to sign up.                        |
| Restaurant Depot       | usrestaurantdepot.com              | Yes (membership required)   | Cash & carry pricing. If developer has membership.         |
| Performance Food Group | pfgc.com                           | Yes                         | Regional distributor.                                      |

**Wholesale scraping protocol:**

- Login with developer's credentials (stored in Pi's `.env`, never in code)
- Scrape catalog pages behind auth
- Extract: product name, case size, case price, unit price, price per lb/oz
- Normalize to per-unit pricing (see Unit Normalization section)
- Tag with `pricing_tier: "wholesale"` - NEVER mixed with retail averages
- Scrape every 5-7 days (wholesale prices change less frequently)
- If account gets flagged: stop immediately, do not retry, alert developer

### Tier 6: Farm and Specialty Sources

**Automated (farms with online stores):**

- Farms using Shopify, Square Online, or Harvie platform
- Discovered during Phase A (discovery), added to registry
- Scraped like any other website (Puppeteer or HTTP depending on rendering)
- Tagged with `pricing_tier: "farm_direct"` and `seasonal: true/false`

**Semi-automated (email catalog sources):**

- Farms, fish markets, butchers, local distributors that send PDF price lists
- Acquired through email outreach (see Email System section)
- PDFs processed automatically when received
- Tagged with `source: "email_catalog"` and supplier attribution

**Manual (no digital presence):**

- Sources flagged as `scrape_method: "none"` in registry
- Developer enters prices manually when they shop there
- Or enters via receipt OCR after a purchase
- These are tracked but not auto-updated

### Tier 7: Seasonal Availability Data

Not a pricing source, but a parallel data stream:

| Source                            | Data                                                   | Method                   |
| --------------------------------- | ------------------------------------------------------ | ------------------------ |
| MA Dept of Agricultural Resources | What's in season in MA, farm directory                 | Website scrape           |
| USDA Seasonal Produce Guide       | National seasonal availability                         | API / download           |
| UMass Extension                   | New England growing seasons                            | Website scrape           |
| Historical scrape data            | After 6+ months, OpenClaw's own data shows seasonality | Computed from change log |

This data answers: "Can I get fresh local strawberries in March?" (No.) "When are they cheapest?" (Late June.) "What's available from local farms right now?" (Check the calendar.)

---

## 4. Three-Phase Lifecycle

### Phase A: Discovery (runs once, ~1-2 weeks)

**Goal:** Build the complete Source Registry for New England (CT, MA, ME, NH, RI, VT).

**Discovery sources:**

1. Google Maps API (or Google Places) - search for grocery stores, farms, fish markets, butchers, food distributors by region
2. Yelp API (or scrape) - business listings with category filtering
3. OpenStreetMap (existing OpenClaw crawler capability) - food-related amenities and shops
4. USDA National Farmers Market Directory - every registered farmers market
5. State agricultural directories (each New England state publishes one)
6. Local Harvest (localharvest.org) - farm and CSA directory
7. Chamber of commerce directories per city

**Discovery process per region:**

1. Query each discovery source for food-related businesses in the region
2. Deduplicate (same business appearing on Google Maps and Yelp = one registry entry)
3. Classify by type (retail chain, farm, etc.)
4. Check for online pricing (does their website have product prices?)
5. Determine scraping method
6. Add to Source Registry with status `active`

**Discovery completion criteria:** When all 6 New England states have been fully scanned across all discovery sources and the registry stabilizes (no new sources found in 3 consecutive scans of a region).

**Expected registry size:** 2,000-5,000 sources across 6 states (most will be `scrape_method: "none"` - they exist in the directory but don't have scrapable pricing).

### Phase B: Price Collection (runs continuously, forever)

**Goal:** Maintain current prices for every scrapable source in the registry.

**Schedule:**

| Day       | Sources                                                    | Work                                                                   |
| --------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| Monday    | Retail chains batch 1 (Hannaford, Stop & Shop)             | Full catalog scrape via Puppeteer                                      |
| Tuesday   | Retail chains batch 2 (Shaw's, Price Chopper, Whole Foods) | Full catalog scrape via Puppeteer                                      |
| Wednesday | All weekly flyers                                          | Flyer scrape (lightweight, static HTML)                                |
| Thursday  | Instacart stores (Market Basket, Trader Joe's, Aldi)       | Storefront scrape                                                      |
| Friday    | Instacart stores (BJ's, Costco) + email catalog processing | Storefront scrape + PDF parsing                                        |
| Saturday  | Government APIs (BLS, USDA AMS, FRED) + wholesale catalogs | API calls + auth-based catalog scrape                                  |
| Sunday    | Aggregation run                                            | Compute averages, trends, seasonal patterns, confidence scores, alerts |

**Estimated daily Pi workload:** 4-6 hours active (scraping + normalization + processing), remaining time idle or background tasks (trend computation, data aging).

**Adaptive scheduling:** If a source's prices haven't changed in 3 consecutive scrapes, extend its interval (e.g., 4 days -> 7 days). If prices start changing again, tighten the interval back. This optimizes Pi resources for volatile sources.

### Phase C: Registry Maintenance (runs every 2-4 weeks)

**Goal:** Keep the Source Registry current. Detect new stores, closed stores, and sources that gained/lost online pricing.

**Process:**

1. Re-query discovery sources for each region (lighter than initial discovery - looking for deltas)
2. Compare against existing registry
3. New sources: add with status `active`, determine scrape method
4. Missing sources (business closed): mark as `closed`, stop scraping
5. Sources that gained online pricing: update scrape method, begin price collection
6. Alert on dashboard: "3 new sources found, 1 source closed this cycle"

**Runtime:** 1-2 hours every 2 weeks. Lightweight compared to initial discovery.

---

## 5. Data Pipeline

### Two-Store Architecture

The Pi maintains two primary data stores in SQLite:

**Store 1: Current Snapshot (`current_prices.db`)**

Always contains exactly one record per product per source: the latest known price.

```sql
CREATE TABLE current_prices (
  id TEXT PRIMARY KEY,  -- hash of (source_id, canonical_ingredient_id, variant_id)
  source_id TEXT NOT NULL,
  canonical_ingredient_id TEXT NOT NULL,
  variant_id TEXT,  -- nullable, for specific variants
  raw_product_name TEXT NOT NULL,  -- original name from source
  price_cents INTEGER NOT NULL,
  price_unit TEXT NOT NULL,  -- 'lb', 'oz', 'each', 'dozen', 'gallon', etc.
  price_per_standard_unit_cents INTEGER,  -- normalized to standard unit for comparison
  standard_unit TEXT,  -- the standard unit for this ingredient category
  package_size TEXT,  -- '1 lb', '3 lb family pack', '40 lb case', etc.
  price_type TEXT NOT NULL DEFAULT 'regular',  -- 'regular', 'sale', 'loyalty', 'wholesale'
  sale_start_date TEXT,  -- for sale prices
  sale_end_date TEXT,  -- for sale prices
  pricing_tier TEXT NOT NULL,  -- 'retail', 'wholesale', 'farm_direct'
  confidence TEXT NOT NULL,  -- 'exact_receipt', 'direct_scrape', 'instacart_adjusted', 'government_baseline'
  instacart_markup_applied_pct REAL,  -- if source is Instacart, what adjustment was applied
  source_url TEXT,  -- where this price was found
  last_confirmed_at TEXT NOT NULL,  -- last time this price was verified still current
  last_changed_at TEXT NOT NULL,  -- last time the price actually changed
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES source_registry(source_id)
);

-- Indexes for common queries
CREATE INDEX idx_cp_ingredient ON current_prices(canonical_ingredient_id);
CREATE INDEX idx_cp_source ON current_prices(source_id);
CREATE INDEX idx_cp_tier ON current_prices(pricing_tier);
CREATE INDEX idx_cp_zip ON current_prices(source_id);  -- join to source for zip
```

**Behavior on scrape:**

- If product exists and price is THE SAME: update `last_confirmed_at` only. No new record. No change log entry.
- If product exists and price CHANGED: update `price_cents`, `last_changed_at`, `last_confirmed_at`. Write a change log entry.
- If product is NEW (never seen at this source): insert new record. Write a change log entry.

This means the snapshot table size is fixed once all products are discovered. It only grows when genuinely new products appear.

**Store 2: Change Log (`price_changes.db`)**

Append-only log of every price change. Only records when a price actually changes, not when it's confirmed unchanged.

```sql
CREATE TABLE price_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  canonical_ingredient_id TEXT NOT NULL,
  variant_id TEXT,
  old_price_cents INTEGER,  -- null for first observation
  new_price_cents INTEGER NOT NULL,
  price_unit TEXT NOT NULL,
  price_type TEXT NOT NULL,
  pricing_tier TEXT NOT NULL,
  change_pct REAL,  -- percentage change from old to new
  observed_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES source_registry(source_id)
);

CREATE INDEX idx_pc_ingredient_date ON price_changes(canonical_ingredient_id, observed_at);
CREATE INDEX idx_pc_source_date ON price_changes(source_id, observed_at);
```

### Data Aging Strategy

Raw change log records age into summaries over time. A weekly cron job runs the aging process.

| Data Age    | Granularity                           | What's Stored                        |
| ----------- | ------------------------------------- | ------------------------------------ |
| 0-90 days   | Every individual change               | Full `price_changes` records         |
| 3-12 months | Weekly summary per product per source | avg, min, max, change count per week |
| 1-3 years   | Monthly summary                       | avg, min, max per month              |
| 3+ years    | Quarterly summary                     | avg, min, max per quarter            |

```sql
CREATE TABLE price_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  canonical_ingredient_id TEXT NOT NULL,
  period_type TEXT NOT NULL,  -- 'weekly', 'monthly', 'quarterly'
  period_start TEXT NOT NULL,  -- ISO date
  period_end TEXT NOT NULL,
  avg_price_cents INTEGER NOT NULL,
  min_price_cents INTEGER NOT NULL,
  max_price_cents INTEGER NOT NULL,
  change_count INTEGER NOT NULL,  -- how many times price changed in this period
  pricing_tier TEXT NOT NULL
);
```

After aging runs, the raw `price_changes` records older than the threshold are deleted. Summaries remain forever. Storage growth: ~150MB/year after aging. The Pi never runs out of space.

### Deduplication Logic

A scrape that returns the exact same price as the current snapshot generates ZERO new data. It only touches `last_confirmed_at`. This means:

- 15,000 products scraped, 14,500 unchanged = 500 new change log entries, not 15,000
- The system is naturally self-deduplicating
- Over time, stable-priced products generate almost no data

---

## 6. Canonical Ingredient System

### The Problem

Every source names things differently:

- Receipt: `BNLS CHKN BRST 2.47LB`
- Instacart: `Boneless Skinless Chicken Breast`
- Hannaford: `Fresh Boneless Skinless Chicken Breast, Value Pack`
- USDA: `Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw`
- Sysco: `CHICKEN BREAST BNLS/SKNLS 4OZ IQF 40# CASE`

All of these need to map to one canonical ingredient for price comparison to work.

### Two-Level Canonical Structure

```json
{
  "ingredient_id": "chicken-breast",
  "name": "Chicken Breast",
  "category": "poultry",
  "standard_unit": "lb",
  "variants": [
    {
      "variant_id": "chicken-breast-bnls-sknls-conventional",
      "name": "Boneless Skinless Chicken Breast (Conventional)",
      "is_default": true
    },
    {
      "variant_id": "chicken-breast-bnls-sknls-organic",
      "name": "Boneless Skinless Chicken Breast (Organic)",
      "is_default": false
    },
    {
      "variant_id": "chicken-breast-bone-in-skin-on",
      "name": "Bone-In Skin-On Chicken Breast",
      "is_default": false
    }
  ]
}
```

When a chef searches "chicken breast" in the costing engine, they get the default variant price. They can drill down to specific variants if needed.

### Standard Units Per Category

| Category                       | Standard Unit | Notes                              |
| ------------------------------ | ------------- | ---------------------------------- |
| Proteins (meat, poultry, fish) | lb            | Convert from oz, kg, per-piece     |
| Produce (by weight)            | lb            | Convert from oz, kg                |
| Produce (by count)             | each          | Avocados, lemons, heads of lettuce |
| Dairy (liquid)                 | gallon        | Convert from quart, half-gallon    |
| Dairy (solid)                  | lb            | Cheese, butter                     |
| Eggs                           | dozen         | Convert from half-dozen, 18-count  |
| Dry goods / grains             | lb            | Convert from oz, kg                |
| Oils / vinegars                | fl oz         | Convert from liter, gallon         |
| Spices                         | oz            | Small quantities                   |
| Herbs (fresh)                  | bunch or oz   | Varies by herb                     |

Every scraped price gets normalized to the standard unit for its category. This enables cross-source comparison: "chicken breast is $3.49/lb at Market Basket vs $3.99/lb at Hannaford" regardless of how each store lists the package.

### Normalization Pipeline

```
Raw product name from scrape
        │
        ▼
┌─────────────────────────┐
│  1. Food item filter     │  Is this a food ingredient? (skip cleaning supplies, pet food, etc.)
│     Rule-based keywords  │  Output: yes/no
└────────────┬────────────┘
             │ (food items only)
             ▼
┌─────────────────────────┐
│  2. Rule-based matching  │  Abbreviation lookup, keyword patterns, exact matches
│     ~70% hit rate        │  "BNLS CHKN BRST" -> chicken-breast-bnls-sknls-conventional
└────────────┬────────────┘
             │ (unmatched items)
             ▼
┌─────────────────────────┐
│  3. Model fallback       │  qwen3:8b classifies: "Given this product name, which
│     ~25% of remaining    │  canonical ingredient is it? Reply with the ingredient_id."
│     60-sec timeout       │
└────────────┬────────────┘
             │ (still unmatched or low confidence)
             ▼
┌─────────────────────────┐
│  4. Manual review queue  │  Added to admin dashboard for human review
│     ~5% of total         │  Developer approves mapping in <10 seconds per item
└─────────────────────────┘
```

**Learning loop:** Every manual correction and every model-confirmed mapping gets added to the rule-based lookup table. Over time, the rule-based layer handles 90%+ and the model is barely needed.

### Seed List Bootstrap

The canonical ingredient list is seeded from:

1. Standard culinary reference (USDA food composition database has ~8,000 food items, we filter to ~500 commonly used cooking ingredients)
2. Developer's receipt processing (most-purchased items become high-priority canonical entries)
3. BLS average price items (~70 items, already canonical)

The seed list is NOT pulled from ChefFlow's existing recipe data (that data is test/demo, not production).

The seed list is a JSON file on the Pi that grows over time as new ingredients are discovered and normalized. Starting size: ~500 entries. Expected size after 6 months: ~1,500-2,000 entries.

### Unit Conversion Rules

```json
{
  "weight": {
    "lb_to_oz": 16,
    "kg_to_lb": 2.20462,
    "g_to_oz": 0.03527
  },
  "volume": {
    "gallon_to_quart": 4,
    "quart_to_pint": 2,
    "pint_to_cup": 2,
    "cup_to_fl_oz": 8,
    "liter_to_fl_oz": 33.814
  },
  "package_to_unit": {
    "dozen": 12,
    "half_dozen": 6,
    "case_40lb": 40,
    "case_10lb": 10
  }
}
```

Every scraped price is converted to the standard unit for its category. The conversion is deterministic (no AI). If a conversion is ambiguous (e.g., "1 bunch of cilantro" - how many oz is a bunch?), the price is stored with the original unit and flagged for manual mapping.

---

## 7. Email System

### Separate Domain (MANDATORY)

OpenClaw's email operates on a domain completely separate from cheflowhq.com. This firewalls email reputation. If OpenClaw's emails get marked as spam, ChefFlow's client-facing emails are unaffected.

Suggested domain: `chefdata.net` or similar. Cost: ~$10/year for domain registration.

Email address: `hello@chefdata.net` (or similar professional, non-automated-sounding address).

### Three-Tier Permission System

| Tier            | Behavior                                                             | Developer Involvement                                  |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| **auto_send**   | OpenClaw sends pre-approved template to approved sources on schedule | None (pre-approved)                                    |
| **draft_queue** | OpenClaw drafts email, holds in queue for review                     | Developer approves/rejects on dashboard (~10 sec each) |
| **blocked**     | OpenClaw never emails this source                                    | None                                                   |

**Default for new sources:** `draft_queue`. Developer promotes to `auto_send` after first successful exchange. Major retail chains are always `blocked` (never email Hannaford corporate asking for prices).

### Email Templates (Pre-Written, Not AI-Generated)

**Template 1: Local supplier outreach**

```
Subject: Local sourcing inquiry - private chef in [city]

Hi [name],

I'm a private chef based in the [area] area. I'm looking for local suppliers
for [product_category] and came across [business_name].

Do you have a current price list or product catalog you could share? I'm
particularly interested in [specific_products_if_known].

Thanks,
David Ferrara
ChefFlow
[phone_if_desired]
```

**Template 2: Follow-up (14 days after no response)**

```
Subject: Re: Local sourcing inquiry - private chef in [city]

Hi [name],

Just following up on my earlier note. If you have a current price list or
catalog, I'd love to take a look. No worries if not.

Thanks,
David
```

**Template 3: Thank you / price list received**

```
Subject: Re: [original_subject]

Got it, thank you! This is really helpful. I'll be in touch if I'd like
to place an order.

Best,
David
```

The model's ONLY job: fill in the bracketed variables based on the source registry entry. The prose is human-written and fixed.

### Rate Limits

- Maximum 5 outbound emails per day
- Maximum 1 follow-up per source (if no response after 14 days, one follow-up; if still no response, move to "no_response" status, stop)
- Never send more than 1 email to the same source per week
- Never mass-email. Each email is individually addressed.

### Incoming Email Processing

This is the higher-value pipeline. When a supplier responds with a PDF price list:

1. Email arrives at OpenClaw's inbox
2. Service detects new email with attachment
3. PDF text extracted (pdftotext, no OCR needed for digital PDFs)
4. Product names and prices parsed
5. Normalized to canonical ingredients
6. Added to price database with `source: "email_catalog"`, attributed to the supplier
7. If supplier sends regular weekly updates, they're processed automatically each time

**Incoming email volume:** unlimited processing. No rate limit on reading.

---

## 8. Receipt Processing

### Upload Mechanism

A simple web page hosted by the Pi on the local network (e.g., `http://192.168.1.x:8080/upload`).

Features:

- Camera capture button (for phone: take photo directly)
- File upload (for batch processing: select multiple receipt photos)
- Basic status display: "Processing 3 receipts... 1 done, 2 queued"

No login required (local network only, not exposed to internet).

### Processing Pipeline

```
Receipt photo uploaded
        │
        ▼
┌─────────────────────────┐
│  1. Tesseract OCR        │  Extract raw text from image
│     (local, free)        │  Handle thermal paper artifacts, fading
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  2. Store detection      │  Identify which store from receipt header
│     Rule-based           │  "MARKET BASKET #47" -> source: market-basket-haverhill
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  3. Line item extraction │  Parse each line: product name, quantity, price
│     Rule + model         │  Handle varied receipt formats
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  4. Normalization        │  Map receipt product names to canonical ingredients
│     Same pipeline as     │  "BNLS CHKN BRST 2.47LB @3.49" -> chicken-breast, $3.49/lb
│     scraper output       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  5. Database update      │  Write to current snapshot + change log
│     confidence: exact    │  These are EXACT prices (highest confidence)
└─────────────────────────┘
```

**Receipt-sourced prices have the highest confidence level** (`exact_receipt`) because they are the actual price paid at the actual store on the actual date.

### Historical Receipt Batch Processing

The developer has years of old receipts. These are processed as a one-time batch:

1. Photograph receipts (developer does this manually, batch upload via web page)
2. OpenClaw processes the queue: OCR, extract, normalize
3. Each receipt is dated from the receipt itself (not upload date)
4. Old prices go into the change log with their real dates, building price history
5. Expected processing time: ~2-3 minutes per receipt on Pi hardware
6. 100 receipts = ~4-5 hours of processing

**Thermal paper warning:** Receipts older than 18 months may be partially or fully faded. Check a sample before batch processing. Faded receipts produce OCR errors and should be skipped.

---

## 9. Pi-to-ChefFlow Sync

### Sync Mechanism

A cron job on the developer's PC pulls the current snapshot from the Pi on a schedule.

```bash
# PC crontab (runs nightly at 2 AM)
0 2 * * * rsync -az pi@192.168.1.x:/data/openclaw/current_prices.db /path/to/chefflow/data/openclaw/current_prices.db
```

Alternative if rsync isn't available on Windows: a Node.js script that fetches the SQLite file via HTTP from the Pi's sync API endpoint.

**Pi serves a simple HTTP endpoint:**

```
GET http://pi-ip:8081/api/sync/current-prices
  -> Returns current_prices.db file

GET http://pi-ip:8081/api/sync/metadata
  -> Returns: { last_updated, record_count, sources_active, sources_stale }
```

**What syncs:**

- `current_prices.db` - the latest price for every product at every source (~150MB)
- `source_registry.db` - the list of all sources with metadata

**What does NOT sync to ChefFlow:**

- Change log (historical data stays on Pi for admin dashboard/trends)
- Price summaries (stays on Pi)
- Raw scrape data (temporary, deleted after processing)
- Receipt images (stay on Pi)

### Sync Frequency

Nightly is sufficient. Prices don't change more than weekly. A daily sync means ChefFlow's data is at most ~24 hours behind the Pi, which is negligible.

If the PC is off, the sync runs next time it's on. No data loss. The Pi doesn't care whether the PC pulled or not; it just serves the data.

### Backup Strategy

| What                   | Where                        | Frequency                   | Why                        |
| ---------------------- | ---------------------------- | --------------------------- | -------------------------- |
| Current snapshot       | PC (via nightly sync)        | Daily                       | ChefFlow always has latest |
| Change log + summaries | PC (via weekly rsync)        | Weekly                      | Historical data protected  |
| Source registry        | PC (via nightly sync)        | Daily                       | Registry backed up         |
| Full Pi data directory | External USB or Google Drive | Weekly (compressed archive) | Disaster recovery          |

If the Pi's SD card dies: restore from PC backup, lose at most 1 week of change log data, lose zero current prices.

---

## 10. ChefFlow Integration

### Existing Infrastructure (Already Built)

ChefFlow already has the receiving end for price data:

**Database tables:**

- `ingredients` table has: `cost_per_unit_cents`, `last_price_cents`, `last_price_date`, `average_price_cents`, `price_unit`, `default_yield_pct`
- `ingredient_price_history` table: per-chef price observations with store_name, source, vendor_id
- `vendor_preferred_ingredients` table: multi-vendor pricing per ingredient
- `grocery_price_entries` table: simplified price tracking

**Server actions (already exist):**

- `logIngredientPrice()` - record a price observation
- `getIngredientPriceHistory()` - fetch price history
- `getIngredientAveragePrice()` - compute average with confidence levels
- `getIngredientPriceAlerts()` - items 30%+ above average
- `getStoreComparison()` - average price per store

**Costing engine (already functional):**

- `compute_recipe_cost_cents(recipe_id)` - uses `last_price_cents` from ingredients
- `compute_menu_cost_cents(menu_id)` - sums recipe costs
- `compute_projected_food_cost_cents(event_id)` - menu cost for an event
- Views: `recipe_cost_summary`, `menu_cost_summary`
- Cascade: ingredient price update -> recipe cost recompute -> menu cost update -> UI refresh

### New: Price Sync Service

A new service in ChefFlow that reads the local SQLite copy and updates the `ingredients` table.

**Process (runs after nightly sync, or on-demand):**

1. Read `current_prices.db` from local copy
2. For each ingredient in ChefFlow's `ingredients` table:
   a. Find matching canonical ingredient in OpenClaw data
   b. Get price from chef's preferred sources (or regional average as fallback)
   c. Update `ingredients.last_price_cents` and `ingredients.last_price_date`
   d. Update `ingredients.average_price_cents` with cross-source average
3. Trigger `recomputeRecipeCosts()` for any recipes whose ingredient prices changed
4. Costs cascade automatically through existing views

**Chef preference integration:**
During setup (or in settings), the chef selects:

- Their zip code
- Their primary stores (checkboxes from source registry)
- Their pricing tier preference (retail / wholesale / both)

The sync service uses these preferences to select which source's price to write to `ingredients.last_price_cents`. Priority: receipt price > chef's preferred store > regional average for their tier.

### What Users See (Not Admin)

In the recipe costing UI, a chef sees:

```
Boneless Skinless Chicken Breast
  $3.49/lb  (Market prices, updated today)
  [Change] [View sources]
```

Clicking "View sources" shows available prices from their selected stores. Clicking "Change" lets them override with a manual price.

They do NOT see: scraping metadata, confidence scores, Instacart markup adjustments, BLS series IDs, or any of the infrastructure. It just works.

### Price Alerts in ChefFlow

When the sync service detects significant price changes:

- Price increase > 20% for an ingredient used in an upcoming event -> warning on event page
- Ingredient cheaper at an alternate store by > 15% -> suggestion in costing UI
- Ingredient price stale (> 30 days old) -> "prices may be outdated" indicator

These surface in the chef dashboard and event detail pages. They're computed during sync, not by OpenClaw.

---

## 11. Admin Catalog (Admin-Only)

The raw price database is accessible only to admin users. This is the "sausage factory" view.

### Admin Price Catalog Page

A new page in ChefFlow's admin section: `/admin/price-catalog`

**Features:**

- Search by ingredient name across all sources
- Filter by: state, city, source, pricing tier, confidence level, date range
- Sort by: price (low-high), source, date updated
- View price history chart per ingredient (line chart over time, per source)
- View all sources for a specific ingredient side-by-side
- Export to CSV/JSON (for sharing with chef friends)
- View source registry: all sources, their status, last scrape date, health

**This page is gated behind `isAdmin()`.** Regular chef users never see it.

### Why Admin-Only

The raw catalog exposes:

- Which stores are being scraped (could make some people uncomfortable)
- Instacart markup adjustments (reveals the method)
- Confidence scores and data sources (reveals the infrastructure)
- Wholesale distributor pricing (may be account-specific and shouldn't be shared broadly)

Regular users benefit from the data through the costing engine. They don't need to see how it's made. The admin uses the catalog for verification, debugging, and manual overrides.

---

## 12. Failure Resilience

### Service Architecture

Each function runs as an independent systemd service on the Pi:

| Service                       | What it does                                               | Restart policy                              |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `openclaw-discovery`          | Phase A/C: find and maintain source registry               | Manual start (not always-on)                |
| `openclaw-scraper-retail`     | Scrape retail chain websites                               | Auto-restart on failure, max 3 retries/hour |
| `openclaw-scraper-instacart`  | Scrape Instacart storefronts                               | Auto-restart, max 3 retries/hour            |
| `openclaw-scraper-flyer`      | Scrape weekly flyers                                       | Auto-restart, max 3 retries/hour            |
| `openclaw-scraper-wholesale`  | Scrape wholesale distributor catalogs                      | Auto-restart, max 3 retries/hour            |
| `openclaw-scraper-government` | Pull government API data                                   | Auto-restart, max 3 retries/hour            |
| `openclaw-normalizer`         | Run normalization pipeline on raw scrape data              | Auto-restart                                |
| `openclaw-receipt`            | Process uploaded receipt photos                            | Auto-restart                                |
| `openclaw-email`              | Monitor inbox, process incoming PDFs, send queued outbound | Auto-restart                                |
| `openclaw-aggregator`         | Compute summaries, trends, age old data                    | Cron (Sunday)                               |
| `openclaw-sync-api`           | Serve HTTP API for PC sync + admin dashboard               | Always-on, auto-restart                     |
| `openclaw-watchdog`           | Monitor all other services, alert on failures              | Always-on                                   |

### Failure Handling Per Service

| Failure Type                   | Detection                         | Response                                                | Alert                                                           |
| ------------------------------ | --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Scraper returns 0 results      | Post-scrape validation            | Discard run, keep existing data, retry next cycle       | Dashboard: "Hannaford scrape returned 0 results"                |
| Scraper gets 403/429 blocked   | HTTP status code                  | Stop scraping that source, mark as `blocked`            | Dashboard: "Hannaford blocked OpenClaw. Pausing."               |
| Scraper crashes (OOM, timeout) | systemd detects exit              | Auto-restart, increment failure counter                 | Dashboard after 3 failures: "Retail scraper failing repeatedly" |
| Model hangs on normalization   | 60-second timeout per item        | Skip item, add to manual review queue                   | None (silent, handled)                                          |
| Pi loses network               | All HTTP requests fail            | All scrapers pause, log error, wait for reconnection    | Dashboard: "Network down since [time]"                          |
| Pi loses power                 | Unclean shutdown                  | SQLite handles it (WAL mode). Services restart on boot. | Dashboard: "Pi rebooted at [time], resuming"                    |
| SD card corruption             | SQLite integrity check on startup | If corrupt: alert developer, restore from PC backup     | CRITICAL alert                                                  |
| Email service can't connect    | IMAP/SMTP failure                 | Retry every 15 minutes, pause after 3 failures          | Dashboard: "Email service down"                                 |

### The 3-Strike Rule (Matches CLAUDE.md)

If any scraper fails 3 consecutive times for the same source:

1. Stop scraping that source
2. Mark it as `needs_attention` in the registry
3. Alert on dashboard with error details
4. Do NOT keep retrying. Wait for developer or builder agent to investigate.

### Data Integrity Guarantees

- **Scrapes are atomic.** A scrape either fully succeeds and updates the database, or fully fails and changes nothing. No partial writes.
- **Current snapshot is never corrupted by a failed scrape.** The scraper writes to a temp table first, then swaps atomically on success.
- **SQLite WAL mode** for crash safety. If the Pi loses power mid-write, the database recovers cleanly.
- **Idempotent operations.** Running the same scrape twice produces the same result. No duplicate records.

---

## 13. Monitoring and Alerts

### Pi Dashboard

A web page served by the Pi on the local network (e.g., `http://192.168.1.x:8080/dashboard`).

**Dashboard sections:**

1. **System Health**
   - Pi uptime, CPU usage, memory usage, disk usage
   - Each service: running/stopped/failing, last activity timestamp

2. **Scraping Status**
   - Per-source: last scraped, products found, prices changed, next scheduled
   - Sources needing attention (blocked, failing, stale)
   - Overall: total sources active, total products tracked, total price changes today

3. **Normalization Queue**
   - Items awaiting manual review (count + list)
   - Recent auto-normalizations (for spot-checking)

4. **Email Status**
   - Outbound queue: drafts awaiting approval
   - Recent sent: last 10 emails with status (delivered, opened, replied)
   - Incoming: recent price list PDFs processed

5. **Price Intelligence**
   - Biggest price changes this week (anomaly detection)
   - Stale data alerts (sources not updated in > 7 days)
   - Coverage stats: % of canonical ingredients with at least one price source

6. **Data Health**
   - Database sizes (current snapshot, change log, summaries)
   - Last aging run date and records compressed
   - Last PC sync: when, success/failure
   - Backup status: last backup date, size

### Alert Levels

| Level        | Examples                                                                                 | Notification Method            |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------ |
| **Info**     | "3 new sources discovered", "Weekly flyers processed"                                    | Dashboard only                 |
| **Warning**  | "Hannaford scraper returned 0 results", "Email service down"                             | Dashboard + highlighted        |
| **Critical** | "3 scrapers failing repeatedly", "SD card >90% full", "No successful scrape in 48 hours" | Dashboard + email to developer |

Critical alerts send an email from OpenClaw's email address to the developer's personal email. This is the one case where OpenClaw emails the developer directly.

### Stale Data Policy

A price is considered stale if it hasn't been confirmed within:

- Retail chain: 7 days
- Instacart: 10 days
- Wholesale: 14 days
- Farm: 30 days (seasonal, less frequent updates)
- Government: 45 days (monthly/quarterly publications)

Stale prices are not removed from the current snapshot. They remain with a `stale: true` flag. The ChefFlow sync service marks them accordingly so the costing engine can show "price may be outdated."

---

## 14. Security and Legal

### Legal Status of Data Sources

| Source Type                       | Legal Basis                                                     | Risk Level                                        |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| Government APIs (BLS, USDA, FRED) | Public data, explicitly free to use                             | Zero                                              |
| Store websites (public pages)     | hiQ v. LinkedIn (2022): publicly accessible data can be scraped | Low                                               |
| Instacart (public storefront)     | TOS prohibits scraping. Data is public. Legal gray area.        | Medium (IP block risk, not lawsuit risk)          |
| Wholesale catalogs (behind login) | Authorized access via developer's account                       | Low (as long as TOS for the account is respected) |
| Email price lists                 | Voluntarily shared by supplier                                  | Zero                                              |
| Receipts                          | Developer's own purchase records                                | Zero                                              |

### Credentials Security

- All API keys stored in Pi's `.env` file, never in code
- Wholesale account credentials (Sysco, US Foods, Restaurant Depot) in `.env`
- Email account credentials in `.env`
- `.env` is not committed to any repository
- Pi's SSH access is key-based, no password auth

### Data Privacy

- Price data is not PII. No customer data is collected or stored.
- The Source Registry contains business addresses and phone numbers, all publicly available information.
- No individual customer purchase data from any store is collected. Only product prices.
- Receipt data is the developer's own purchase history.

### Anti-Detection Best Practices

- Minimum 3-5 seconds between requests to any single domain
- Rotate user-agent strings (pool of 10+ common browser user-agents)
- Respect `robots.txt` where present (except for price pages if they're publicly accessible in a browser)
- One Puppeteer instance at a time (Pi resource limitation is actually an advantage here)
- No concurrent requests to the same domain
- Daily request cap per domain (configurable, default 500/day)
- If blocked: stop immediately, wait 24+ hours, do not attempt to circumvent

---

## 15. Implementation Phases

### Phase 0: Proof of Concept (1-2 days of build time)

**Goal:** Prove the concept works with real data.

**Build:**

- BLS API integration (register key, fetch ~70 food items for Northeast)
- One store scraper (Hannaford - easiest, full online catalog)
- Basic SQLite database (current snapshot only, no change log yet)
- Basic normalization (rule-based only, no model)
- Simple JSON API on Pi for data access

**Success criteria:** 50+ common ingredients have real, current prices from 2 sources (BLS + Hannaford). Prices are accurate when spot-checked against the actual store website.

**What this proves:** The scraping works, the normalization works, the data is real. Green light to continue.

### Phase 1: Retail Foundation (1-2 weeks)

**Build:**

- Remaining retail chain scrapers (Stop & Shop, Shaw's, Price Chopper, Whole Foods)
- Instacart scraper (Market Basket, Trader Joe's, Aldi)
- Weekly flyer scraper (all chains)
- FRED and USDA API integrations
- Change log database
- Full normalization pipeline (rules + model)
- Scraping schedule (cron-based)
- Basic Pi dashboard (health + scraping status)
- Pi sync API endpoint

**Success criteria:** 500+ ingredients have prices from 5+ retail sources across New England. Dashboard shows all scrapers running on schedule. Sync API serves data reliably.

### Phase 2: Receipt Processing + Personal Data (1 week)

**Build:**

- Tesseract OCR installation and testing on Pi
- Receipt upload web page
- Receipt processing pipeline (OCR -> extract -> normalize -> store)
- Historical receipt batch processing capability
- Receipt-sourced prices override lower-confidence prices in snapshot

**Success criteria:** Developer uploads 10 Market Basket receipts. Prices are correctly extracted and mapped to canonical ingredients. These prices appear as highest-confidence entries in the database.

### Phase 3: ChefFlow Integration (1 week)

**Build:**

- Nightly sync cron on PC
- Price sync service in ChefFlow (reads SQLite, updates ingredients table)
- Chef store preference settings (zip code, preferred stores, pricing tier)
- Costing engine uses OpenClaw prices as defaults
- Price staleness indicators in costing UI
- Price alert display on dashboard and event pages

**Success criteria:** Developer opens a recipe in ChefFlow, ingredient prices are pre-filled from OpenClaw data. Changing an ingredient recalculates cost automatically. Prices show source attribution ("Market Basket, updated today").

### Phase 4: Wholesale + Distributors (1 week)

**Build:**

- Sysco catalog scraper (requires developer account signup first)
- US Foods catalog scraper (requires developer account signup first)
- Restaurant Depot scraper (if developer has membership)
- Wholesale pricing tier kept separate from retail
- Admin catalog page in ChefFlow (`/admin/price-catalog`)

**Success criteria:** Wholesale prices available for 200+ common ingredients. Admin catalog shows side-by-side retail vs wholesale comparison.

### Phase 5: Email System (1 week)

**Build:**

- Separate email domain registration
- Email sending service (template-based, rate-limited)
- Draft queue on Pi dashboard
- Incoming email monitoring (IMAP)
- PDF price list parsing pipeline
- Supplier response tracking

**Success criteria:** 5 outbound emails sent to local suppliers. At least 1 response received and PDF price list automatically processed into database.

### Phase 6: Discovery + Farms + Seasonal (1-2 weeks)

**Build:**

- Source discovery service (Google Maps, Yelp, USDA directory, state ag directories)
- Full New England source registry
- Farm/specialty source scrapers (for those with online stores)
- Seasonal availability calendar
- Registry maintenance service (periodic re-scan)

**Success criteria:** Source registry contains 1,000+ entries across 6 states. Seasonal calendar shows current availability for New England produce.

### Phase 7: Intelligence Layer (1 week)

**Build:**

- Data aging pipeline (compress old change log to summaries)
- Trend computation (price velocity, seasonal curves, store-to-store correlation)
- Adaptive scraping schedule (extend intervals for stable sources)
- Price anomaly detection (flag unusual spikes/drops)
- Export capability (CSV/JSON snapshot for sharing)
- Confidence scoring on all prices

**Success criteria:** After 30+ days of data, trend charts show meaningful patterns. Adaptive scheduling has reduced scrape volume by 20%+ without missing changes. Anomaly detector correctly flags test injections.

---

## 16. Prerequisites

**Before any build work begins:**

| #   | Prerequisite                                                                     | Who                 | Time      | Blocking Phase |
| --- | -------------------------------------------------------------------------------- | ------------------- | --------- | -------------- |
| 1   | Register BLS API key (free)                                                      | Developer           | 5 min     | Phase 0        |
| 2   | Register FRED API key (free)                                                     | Developer           | 5 min     | Phase 0        |
| 3   | Register USDA ERS API key via api.data.gov (free)                                | Developer           | 5 min     | Phase 0        |
| 4   | Verify Pi hardware: OS version, Node.js version, available storage, network type | Builder agent       | 15 min    | Phase 0        |
| 5   | Install Tesseract OCR on Pi (`apt-get install tesseract-ocr`)                    | Builder agent       | 10 min    | Phase 2        |
| 6   | Install Chromium + Puppeteer on Pi, verify it runs stable                        | Builder agent       | 30 min    | Phase 1        |
| 7   | Establish Pi-to-PC network access (can PC reach Pi via SSH/HTTP?)                | Developer + builder | 15 min    | Phase 3        |
| 8   | Sign up for Sysco online ordering account (free, business)                       | Developer           | 15 min    | Phase 4        |
| 9   | Sign up for US Foods online account (free, business)                             | Developer           | 15 min    | Phase 4        |
| 10  | Register separate email domain for OpenClaw                                      | Developer           | 15 min    | Phase 5        |
| 11  | Set up email account on that domain                                              | Developer           | 15 min    | Phase 5        |
| 12  | Verify/fix ChefFlow costing engine is working end-to-end                         | Builder agent       | 1-2 hours | Phase 3        |

---

## 17. Files to Create

### On the Raspberry Pi (`/home/pi/openclaw/` or equivalent)

| File                              | Purpose                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `services/discovery.mjs`          | Source discovery service (Phase A/C lifecycle)                                 |
| `services/scraper-retail.mjs`     | Retail chain website scraper                                                   |
| `services/scraper-instacart.mjs`  | Instacart storefront scraper                                                   |
| `services/scraper-flyer.mjs`      | Weekly flyer scraper                                                           |
| `services/scraper-wholesale.mjs`  | Wholesale distributor catalog scraper                                          |
| `services/scraper-government.mjs` | Government API data puller (BLS, USDA, FRED)                                   |
| `services/normalizer.mjs`         | Normalization pipeline (rules + model fallback)                                |
| `services/receipt-processor.mjs`  | Receipt OCR and extraction                                                     |
| `services/email-service.mjs`      | Outbound email sending + incoming PDF processing                               |
| `services/aggregator.mjs`         | Trend computation, data aging, summary generation                              |
| `services/sync-api.mjs`           | HTTP API for PC sync + admin dashboard serving                                 |
| `services/watchdog.mjs`           | Service health monitor and alerting                                            |
| `lib/db.mjs`                      | SQLite database wrapper (current_prices, change_log, source_registry)          |
| `lib/normalize-rules.mjs`         | Rule-based ingredient name matching                                            |
| `lib/normalize-model.mjs`         | Model-based normalization fallback (qwen3:8b)                                  |
| `lib/unit-conversion.mjs`         | Unit conversion engine                                                         |
| `lib/scrape-utils.mjs`            | Shared scraping utilities (rate limiting, user-agent rotation, error handling) |
| `lib/pdf-parser.mjs`              | PDF text extraction and price parsing                                          |
| `data/canonical-ingredients.json` | Canonical ingredient seed list                                                 |
| `data/normalization-rules.json`   | Accumulated rule-based mappings                                                |
| `data/email-templates/`           | Pre-written email templates                                                    |
| `config/sources.json`             | Per-source scraping configuration                                              |
| `config/schedule.json`            | Scraping schedule definition                                                   |
| `config/.env`                     | API keys, credentials, email config                                            |
| `dashboard/index.html`            | Admin dashboard web UI                                                         |
| `dashboard/upload.html`           | Receipt upload page                                                            |
| `systemd/openclaw-*.service`      | systemd service files for each service                                         |
| `setup.sh`                        | One-command Pi setup script                                                    |

### In ChefFlow (`c:\Users\david\Documents\CFv1\`)

| File                                                       | Purpose                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `lib/openclaw/sync.ts`                                     | Price sync service (reads SQLite, updates ingredients)         |
| `lib/openclaw/price-resolver.ts`                           | Resolve best price for an ingredient based on chef preferences |
| `app/(admin)/admin/price-catalog/page.tsx`                 | Admin price catalog page                                       |
| `app/(admin)/admin/price-catalog/price-catalog-client.tsx` | Client component for catalog UI                                |
| `components/pricing/price-source-badge.tsx`                | Badge showing price source/confidence                          |
| `components/pricing/price-staleness-indicator.tsx`         | Indicator for stale prices                                     |

---

## 18. Files to Modify

### In ChefFlow

| File                                             | What to Change                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `lib/recipes/actions.ts`                         | `computeRecipeIngredientCost()`: fall back to OpenClaw price when manual price is absent |
| `lib/ingredients/pricing.ts`                     | Add `getOpenClawPrice()` function that reads from synced SQLite                          |
| `app/(chef)/culinary/costing/page.tsx`           | Show price source attribution, staleness indicator                                       |
| `app/(chef)/culinary/costing/recipe/page.tsx`    | Show per-ingredient price source                                                         |
| `app/(chef)/settings/page.tsx` (or new sub-page) | Add store preference settings (zip, preferred stores, pricing tier)                      |
| `components/navigation/nav-config.tsx`           | Add admin price catalog to admin nav                                                     |
| `docs/app-complete-audit.md`                     | Add price catalog admin page entry                                                       |

---

## 19. Database Changes

### On the Pi (SQLite - new databases)

Three SQLite databases as described in the Data Pipeline section:

- `source_registry.db` - Source Registry table
- `current_prices.db` - Current Snapshot table + indexes
- `price_changes.db` - Change Log table + Price Summaries table + indexes

Schema definitions are in Section 5 (Data Pipeline) and Section 2 (Source Registry).

### In ChefFlow (PostgreSQL - modifications only)

**No new tables needed.** The existing `ingredients`, `ingredient_price_history`, and `vendor_preferred_ingredients` tables already have the right structure.

**Possible new columns on `ingredients` (additive only):**

```sql
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS openclaw_source TEXT;
  -- which OpenClaw source provided the current price
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS openclaw_confidence TEXT;
  -- confidence level of the OpenClaw price
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS openclaw_last_sync_at TIMESTAMPTZ;
  -- when OpenClaw last updated this ingredient's price
```

**New table for chef store preferences:**

```sql
CREATE TABLE IF NOT EXISTS chef_store_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  source_id TEXT NOT NULL,  -- matches OpenClaw source registry ID
  source_name TEXT NOT NULL,  -- human-readable store name
  is_primary BOOLEAN DEFAULT FALSE,
  pricing_tier TEXT NOT NULL DEFAULT 'retail',  -- 'retail', 'wholesale', 'farm_direct'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration safety:** All changes are additive (new columns, new table). No drops, no modifications to existing columns. Standard migration rules per CLAUDE.md.

---

## 20. Edge Cases and Error Handling

| Scenario                                                       | Correct Behavior                                                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store website completely redesigned                            | Scraper returns 0 results. Existing data preserved. Source marked `needs_attention`. Alert on dashboard.                                                    |
| Instacart blocks Pi's IP                                       | Instacart scraper stops. Other scrapers unaffected. System falls back to flyer + government data for affected stores.                                       |
| Receipt is completely unreadable (faded)                       | Tesseract returns low-confidence output. Receipt flagged as `failed_ocr`. Not added to database. Developer sees count of failed receipts on dashboard.      |
| New ingredient not in canonical list                           | Goes through normalization pipeline. If no match, added to manual review queue. Not silently dropped.                                                       |
| Model normalizes wrong (maps salmon to tuna)                   | Bad mapping is in database until caught. Admin review queue surfaces low-confidence mappings. Developer corrects, correction prevents recurrence.           |
| Price seems impossibly wrong ($99.99/lb chicken)               | Anomaly detection flags prices that deviate >200% from the ingredient's historical average. Flagged, not auto-rejected (could be a real specialty product). |
| Ingredient available at one store but not another              | Normal. Current snapshot shows `null` for that source. Costing engine uses next-best source.                                                                |
| Seasonal item not available at any source                      | Current snapshot has no entry. Costing engine shows "no price available, enter manually" or "not in season" with last known price and date.                 |
| Multiple package sizes at same store                           | Store the per-unit (per-lb) price for the best value package. Note package sizes in metadata.                                                               |
| Store has loyalty price and non-loyalty price                  | Scrape loyalty price (most chefs have free loyalty cards). Tag as `price_type: "loyalty"`.                                                                  |
| Pi runs out of disk space                                      | Watchdog alerts at 80% capacity. Aging pipeline runs immediately to compress old data. If still >90%, critical alert.                                       |
| Developer's wholesale account gets flagged                     | Stop scraping immediately. Alert developer. Do not attempt to circumvent. Source moves to `blocked`.                                                        |
| Two sources report wildly different prices for same item       | Both stored independently. The costing engine uses the chef's preferred source. The admin catalog shows the discrepancy.                                    |
| ChefFlow's ingredients table has an ingredient not in OpenClaw | Price sync skips it. That ingredient stays at its manually-entered price. No error.                                                                         |
| OpenClaw has an ingredient not in ChefFlow's table             | Price is available but not consumed until the chef adds that ingredient to a recipe. No proactive insertion.                                                |

---

## 21. Verification Steps

### Phase 0 Verification

- [ ] BLS API returns ~70 food items with prices for Northeast region
- [ ] Hannaford scraper returns 100+ products with prices for a test category (e.g., "poultry")
- [ ] Prices match what's shown on the actual Hannaford website (manual spot check of 10 items)
- [ ] SQLite database created and queryable
- [ ] `GET /api/sync/current-prices` returns the database file

### Phase 1 Verification

- [ ] All 5 retail chain scrapers running on schedule
- [ ] Instacart scraper returns Market Basket products with prices
- [ ] Weekly flyer scraper captures current Market Basket sale items
- [ ] Government APIs returning data and stored in database
- [ ] Normalization pipeline maps >90% of items to canonical ingredients
- [ ] Dashboard shows all scrapers healthy
- [ ] 500+ unique ingredients have at least one price source

### Phase 2 Verification

- [ ] Tesseract installed and produces text from a sample receipt photo
- [ ] Receipt upload page works from developer's phone on local network
- [ ] 5 test receipts processed: store detected, items extracted, prices normalized
- [ ] Receipt prices appear in database with `confidence: "exact_receipt"`
- [ ] Receipt prices override lower-confidence prices for same ingredient/source

### Phase 3 Verification

- [ ] Nightly sync cron successfully copies SQLite to PC
- [ ] ChefFlow price sync service updates `ingredients.last_price_cents`
- [ ] Opening a recipe in ChefFlow shows OpenClaw-sourced prices
- [ ] Changing an ingredient triggers cost recomputation
- [ ] Price staleness indicator shows for prices older than threshold
- [ ] Chef store preferences saved and respected by price resolver

### Phase 4 Verification

- [ ] Wholesale scraper returns Sysco/US Foods catalog items
- [ ] Wholesale prices stored with `pricing_tier: "wholesale"` (never mixed with retail)
- [ ] Admin price catalog page renders in ChefFlow
- [ ] Admin can search, filter, sort across all sources
- [ ] Admin can see retail vs wholesale side-by-side

### Phase 5 Verification

- [ ] OpenClaw email sends outbound from separate domain
- [ ] Draft queue works (developer can approve/reject)
- [ ] Incoming PDF price list is detected, parsed, and prices added to database
- [ ] Rate limits enforced (max 5 outbound/day)

### Phase 6 Verification

- [ ] Source registry has 500+ entries across New England
- [ ] Seasonal calendar shows current month's availability
- [ ] Registry maintenance detects a new test source when added to Google Maps

### Phase 7 Verification

- [ ] Data aging compresses records older than 90 days into weekly summaries
- [ ] Trend computation produces seasonal curves after 30+ days of data
- [ ] Adaptive scheduling extends interval for a source with stable prices
- [ ] Anomaly detection flags a manually injected extreme price
- [ ] Export produces valid CSV with all current prices

---

## 22. Out of Scope

These are explicitly NOT part of this spec. They build on the database this spec creates but are separate features:

- **Virtual catalog / e-commerce browsing experience** - a future ChefFlow feature where chefs "browse" stores virtually. Requires this database as foundation.
- **Vendor comparison tool** - a future feature for comparing supplier pricing. Requires this database.
- **Client-facing pricing** - clients never see ingredient-level costs. That's a business decision, not a database feature.
- **Automated purchasing / ordering** - OpenClaw tracks prices, it does not place orders.
- **National expansion** - this spec covers New England only. National scaling is a separate spec when ready.
- **Equipment pricing** - the developer mentioned this but explicitly deferred it. Food ingredients only.
- **E-Phone Book / public directory** - separate product vision, separate spec.
- **Operator recruitment outreach** - separate from price intelligence, separate spec.
- **Recipe generation or suggestion** - violates ChefFlow's core rule: AI never generates recipes.
- **Menu recommendations based on price** - seasonal availability suggestions are in scope; "you should cook X" is not.

---

## 23. Notes for Builder Agent

### Existing Code to Build On

- **OpenClaw repo:** `/c/Users/david/Documents/OpenClaw/` - has archived crawler code, daemon architecture, systemd setup scripts, Pi service patterns. The `_archive_crawler-era/` directory has proven patterns for scraping, enrichment, and database sync. Reuse the architecture, replace the crawling targets.

- **Existing sync mechanism:** OpenClaw already syncs to ChefFlow's PostgreSQL using `DATABASE_SERVICE_ROLE_KEY`. The new sync is simpler (SQLite file transfer) but the auth pattern is proven.

- **ChefFlow costing engine:** Already functional at `lib/recipes/actions.ts` (lines 1800-1967). The cascade works: update `ingredients.last_price_cents` -> call `recomputeRecipeCosts()` -> views update -> UI refreshes. Don't rebuild this. Just feed it data.

- **Existing pricing functions:** `lib/ingredients/pricing.ts` already has `logIngredientPrice()`, `getIngredientPriceHistory()`, `getIngredientAveragePrice()`, `getStoreComparison()`. Extend these, don't replace them.

### Critical Gotchas

1. **Puppeteer on Pi is memory-heavy.** Only run ONE Chromium instance at a time. Kill the process after each scrape job completes. Do not leave headless browsers open.

2. **SQLite WAL mode is mandatory.** Enable it on database creation. This prevents corruption on unclean shutdown.

3. **Never mix retail and wholesale averages.** The pricing tiers are fundamentally different markets. A blended average is meaningless and misleading.

4. **Instacart WILL break.** Design the system to degrade gracefully without it. Instacart is a nice-to-have layer, not a dependency.

5. **The canonical ingredient list is the foundation.** If normalization is wrong, everything downstream is wrong. Invest in the rule-based layer. The model is the fallback, not the primary path.

6. **Don't scrape faster than necessary.** Aggressive scraping gets you blocked. Prices change weekly, not hourly. A 3-5 day cycle is optimal.

7. **The developer's existing website data is test/demo only.** Do not use it to seed the canonical ingredient list. Use USDA food composition data, BLS item list, and receipt processing instead.

8. **The admin catalog page must be gated behind `isAdmin()`.** Regular chef users must never see the raw price database, scraping infrastructure, or source attribution details.

9. **Email domain must be separate from cheflowhq.com.** This is non-negotiable. Email reputation cross-contamination would damage ChefFlow's client-facing communications.

10. **OpenClaw must never get stuck.** Every long-running operation needs a timeout. Every service auto-restarts on crash. The watchdog monitors everything. If something fails 3 times, it stops and alerts instead of looping. Getting stuck = getting immediately flagged to the developer.

11. **All monetary amounts in cents.** Consistent with ChefFlow's existing convention. $3.49 = 349 cents. No floating point money.

12. **This spec is Phase 0-7 of a single system.** Build sequentially. Do not start Phase 3 until Phase 1 is verified. Each phase's success criteria must pass before proceeding.

---

_This spec was developed through extensive conversation between the developer and the planning agent on 2026-03-28. It incorporates the developer's 10+ years of private chef experience, knowledge of New England food sourcing, and specific requirements for accuracy, privacy, and cost efficiency._
