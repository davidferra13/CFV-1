# Spec: OpenClaw Total Capture - The 2026 American Grocery Price Database

> **Status:** in-progress
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (infrastructure + pipeline + new data sources)

## Timeline

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-01 04:30 | Planner (Opus 4.6) |        |
| Status: ready         | 2026-04-01 04:30 | Planner (Opus 4.6) |        |
| Claimed (in-progress) | 2026-04-30 16:50 | Codex V1 Builder   |        |
| Phase 1 proof blocked | 2026-04-30 16:50 | Codex V1 Builder   |        |
| Phase 1 complete      |                  |                    |        |
| Phase 2 complete      |                  |                    |        |
| Phase 3 complete      |                  |                    |        |
| Phase 4 complete      |                  |                    |        |
| Status: verified      |                  |                    |        |

---

## Developer Notes

### Raw Signal

"We need every store. You keep saying the same random-ass stores. We need every grocery store."

"Scan one place and then go to the next. Scan one place and go to the next. You know? And then take all that information and be like, okay, we scanned all of America, and it's all right here. Now let's see what we don't have and cross-reference everything until we have a full grocery list for each state, item by item, A through Z."

"I can right now go to the Restaurant Depot store and go log into an account, and I could technically sit there and look at every single page of ingredients, even if there's like 5,000 pages. And we could set up a bot that does that to like every possible source ever across America."

"Companies are literally begging people to look at their pricing catalogs. We have easy wins, and then we have other wins."

"I'd rather just scan one place and then go to the next. Don't stop until you have every single thing ever. And then if there's not a thing that you have for a place, cross-reference everything."

"Instead of trying to figure out a data set that gets replenished, we need to just get every possible number ever, as accurately as we can."

"It's important to establish that there's going to be wholesale prices and then normal prices. And we don't want to get things screwed up. And we need to represent both separately."

"I know for a fact, 100%, that if I go to my local farm's website right now, I can see what they have in stock, and I can literally download their entire catalog for how much things cost."

"There's no way in hell there's a restaurant that doesn't have a space where they can look at what they wanna buy or see what's in stock. So we also need to scrape those databases also."

"If I gave OpenClaw authority to make its own accounts for things and to log into things and to email people on our behalf, is there anything we could do that would make our system better?"

"We should sit around for the next couple hours and we need to establish what that proof is that shows that it's working."

"Every single time I report back, you're like, yeah, it's working, but this is happening. Is that the job that Codex would play? Would OpenClaw just be a master at scraping stuff because it has a bot that has literally deciphered every single bug in route possible?"

"I don't wanna spend any money. And I'm not confident when it comes to spending money because we always run into flaws. My money's just going out the door."

"$3 a day would be fine if that really was happening, but I need to know if it's actually working."

### Developer Intent

- **Core goal:** Build the first-ever comprehensive American grocery price database. Every ingredient, every store, every region. Scan once, save forever, then cross-reference to fill gaps.

- **Key constraints:**
  - $0 spend until the current free system is proven to work reliably
  - Wholesale and retail prices MUST be stored and displayed separately (never mixed)
  - Don't re-scan the same store daily when you haven't scanned most stores at all. Breadth first, freshness second.
  - No premium AI swarm until the free system proves itself for 7+ consecutive days
  - Cost guardrails are non-negotiable: hard monthly cap on any paid API, no runaway billing

- **Motivation:** 10+ year private chef who has never once been able to look up what an ingredient costs in a specific location. No tool exists that does this. ChefTec (20 year industry standard) makes you type prices manually. Every existing system is either account-specific (Sysco), manual entry (ChefTec), or invoice-based (MarketMan). Nobody has built the universal lookup.

- **Success from the developer's perspective:** "I will finally, for the first time in my life as a chef, be able to price out any recipe I have." And eventually: a chef in any US city can look up any ingredient and see what it costs near them, with both wholesale and retail options.

- **Strategy (developer's words, paraphrased):** Scan everything once. Save it. Move on. Don't loop. After you've scanned all of America, cross-reference to fill gaps. This is "the 2026 grocery pricing database." Freshness comes later, after coverage is complete.

---

## What This Does (Plain English)

Transform OpenClaw from a system that re-scrapes the same 3 chains daily into a machine that systematically captures every grocery price source in America, one source at a time, until the database is complete. Wholesale and retail prices are stored separately. After full coverage, cross-reference to fill gaps for every ZIP code. Then (and only then) build a freshness/replenishment layer.

---

## Why It Matters

No universal grocery price database exists. Every chef in America either manually enters prices, guesses from memory, or uses a single distributor's portal. This will be the first system that aggregates retail, wholesale, government, and farm-direct pricing across all regions into one searchable database.

---

## Architecture: Scan-and-Move (NOT Re-Scan)

### Current Architecture (Wrong for This Goal)

The Pi currently runs 48 cron jobs daily that re-scrape the SAME chains every day:

- Market Basket: scraped 2x/week (already has 38,954 prices)
- Hannaford: scraped 2x/week (already has 26,235 prices)
- Same 20 chains, same 3 states, on repeat forever

This produces diminishing returns. Market Basket's prices don't change significantly day-to-day. Re-scanning it while Publix (1,400 stores, 0 data) sits untouched is the wrong priority.

### New Architecture: Breadth-First Capture

```
PHASE 1: Fix what's broken (free, this week)
    └── Get 5 empty chains producing data
    └── Prove system runs 7 days straight without issues

PHASE 2: Scan every Instacart chain (free, weeks 2-4)
    └── Add 13+ missing chains to Pi crontab
    └── Scan each chain ONCE, mark complete, move to next
    └── Don't re-scan until all chains are captured

PHASE 3: Capture free structured sources (free/$5, weeks 3-6)
    └── USDA FoodData Central API (380K products, free registration)
    └── Kroger API (2,800 stores / 35 states, free registration)
    └── WebstaurantStore (400K+ products, public prices)
    └── FoodServiceDirect (wholesale, public prices)
    └── USDA Market News (commodity prices, free API)

PHASE 4: Account-based sources + outreach (weeks 5-8)
    └── Restaurant Depot (developer has account)
    └── OpenClaw email outreach to distributors
    └── Local farm catalogs
    └── Specialty/ethnic grocery catalogs

PHASE 5: Cross-reference and gap-fill (weeks 8-12)
    └── For every ZIP: what ingredients have no local data?
    └── Use national data + regional multipliers to fill gaps
    └── Produce per-state A-Z ingredient price lists
    └── Identify remaining gaps, target specifically
```

### Scan-and-Move Protocol

For each data source:

1. **SCAN** - Capture the full catalog/price list (every page, every product)
2. **SAVE** - Store with source, timestamp, location, wholesale/retail flag
3. **VERIFY** - Count products captured vs expected. Log coverage %.
4. **MARK COMPLETE** - Record in a sources manifest: source name, scan date, product count, status
5. **MOVE ON** - Next source. Don't re-scan until ALL sources are captured.

Only after all sources are captured once: build a freshness schedule based on which sources are most volatile (produce prices change weekly; canned goods change quarterly).

---

## Price Type Separation (CRITICAL)

Wholesale and retail prices MUST be stored and displayed separately. Never averaged together. Never mixed.

### Database Schema

The `openclaw.store_products` table needs a `price_type` column:

```sql
ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'retail'
  CHECK (price_type IN ('retail', 'wholesale', 'commodity', 'farm_direct'));
```

The `openclaw.stores` table needs a `store_type` column:

```sql
ALTER TABLE openclaw.stores
  ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'retail'
  CHECK (store_type IN ('retail', 'wholesale', 'club', 'online', 'farm', 'distributor'));
```

### Price Type Rules

| Source                                            | price_type  | store_type                           |
| ------------------------------------------------- | ----------- | ------------------------------------ |
| Instacart chains (Market Basket, Hannaford, etc.) | retail      | retail                               |
| Costco, BJ's, Sam's Club                          | retail      | club                                 |
| Restaurant Depot, Jetro                           | wholesale   | wholesale                            |
| Sysco, US Foods, GFS                              | wholesale   | distributor                          |
| WebstaurantStore, FoodServiceDirect               | wholesale   | online                               |
| USDA baselines                                    | commodity   | (n/a - goes to usda_price_baselines) |
| Local farms                                       | farm_direct | farm                                 |
| Kroger API                                        | retail      | retail                               |

### UI Display

When a chef looks up "chicken breast":

```
RETAIL (what you'd pay at a grocery store)
  Market Basket (Haverhill, MA):  $4.99/lb  (scanned Mar 30)
  Hannaford (E. Hampstead, NH):   $5.49/lb  (scanned Mar 30)
  Kroger (Columbus, OH):          $4.79/lb  (scanned Apr 2)

WHOLESALE (restaurant/bulk pricing)
  Restaurant Depot:               $2.89/lb  (scanned Apr 5)
  Sysco:                          $3.12/lb  (scanned Apr 3)
  WebstaurantStore:               $3.45/lb  (scanned Apr 1)

USDA BASELINE (government average)
  Northeast region:               $3.62/lb  (2025 survey)
  National average:               $3.35/lb  (2025 survey)
```

---

## Data Sources Manifest

### Tier 1: Already Working (validate + don't re-scan)

| Source                     | Type   | Status  | Products | Action                                    |
| -------------------------- | ------ | ------- | -------- | ----------------------------------------- |
| Market Basket (Instacart)  | retail | Working | 38,954   | DONE. Stop re-scanning.                   |
| Hannaford (Instacart)      | retail | Working | 26,235   | DONE. Stop re-scanning.                   |
| Aldi (Instacart)           | retail | Working | 2,612    | DONE. Stop re-scanning.                   |
| Stop & Shop (Instacart)    | retail | Working | 328      | Low count - re-scan once more, then done. |
| BJ's Wholesale (Instacart) | retail | Working | 152      | Low count - re-scan once more, then done. |

### Tier 2: Broken (fix this week, $0)

| Source                    | Type   | Status                | Expected | Action                               |
| ------------------------- | ------ | --------------------- | -------- | ------------------------------------ |
| Walmart (API scraper)     | retail | 97 stores, 0 products | 50K+     | SSH into Pi, check logs, fix scraper |
| Whole Foods (API scraper) | retail | 37 stores, 0 products | 20K+     | SSH into Pi, check logs, fix scraper |
| Shaw's (Instacart)        | retail | 34 stores, 0 products | 15K+     | Check walker config, storeSlug       |
| Target (API + Instacart)  | retail | 56 stores, 0 products | 30K+     | Check both scrapers                  |
| Trader Joe's              | retail | 24 stores, 0 products | 4K+      | No scraper exists. Write one.        |

### Tier 3: Add to Instacart Crontab (free, 2 weeks)

| Source                | Region                                   | Est. Products | Priority                       |
| --------------------- | ---------------------------------------- | ------------- | ------------------------------ |
| Publix                | Southeast (FL, GA, AL, TN, SC, NC, VA)   | 30K+          | HIGH - covers entire Southeast |
| Safeway/Albertsons    | West + nationwide                        | 25K+          | HIGH - covers West             |
| H-E-B                 | Texas                                    | 20K+          | HIGH - covers Texas            |
| Meijer                | Midwest (MI, OH, IN, IL, WI, KY)         | 20K+          | HIGH - covers Midwest          |
| Food Lion             | Southeast + Mid-Atlantic                 | 15K+          | MEDIUM                         |
| ShopRite              | Northeast (NJ, NY, CT, PA, MD, DE)       | 15K+          | MEDIUM - fills NE gaps         |
| Giant Eagle           | PA, OH, WV, MD                           | 12K+          | MEDIUM                         |
| Hy-Vee                | Midwest (IA, KS, MN, MO, NE, SD, WI, IL) | 12K+          | MEDIUM                         |
| Sprouts               | Nationwide                               | 10K+          | MEDIUM                         |
| Giant Food / Martin's | Mid-Atlantic                             | 10K+          | MEDIUM                         |
| Jewel-Osco            | Midwest (IL, IN, IA)                     | 10K+          | MEDIUM                         |
| WinCo                 | West (ID, NV, OR, WA, CA, UT, AZ, TX)    | 8K+           | LOW                            |
| Piggly Wiggly         | Southeast + Midwest                      | 8K+           | LOW                            |

**GeoIP constraint:** Instacart binds sessions to the Pi's physical region (Haverhill, MA). Non-NE chains require a residential proxy ($15-25/mo) or captured session files. Multi-zip sessions for NYC/Chicago/LA are partially working (`.openclaw-deploy/data/sessions/`).

### Tier 4: Free Structured APIs (register + capture, $0-5)

| Source                | Type                | Est. Products               | How                               |
| --------------------- | ------------------- | --------------------------- | --------------------------------- |
| USDA FoodData Central | catalog (no prices) | 380,000+                    | Free API key registration         |
| Kroger API            | retail              | 200K+ across 2,800 stores   | Free dev account (fix cert issue) |
| USDA Market News      | commodity           | 500+ daily commodity prices | Free API                          |
| Open Food Facts       | catalog (no prices) | 2M+ global products         | Already in crontab (Sunday)       |

### Tier 5: Public Wholesale Websites (scrapeable, $0)

| Source                   | Type           | Est. Products | How                              |
| ------------------------ | -------------- | ------------- | -------------------------------- |
| WebstaurantStore.com     | wholesale      | 400,000+      | Public prices, standard scraping |
| FoodServiceDirect.com    | wholesale      | 50,000+       | Public prices, standard scraping |
| Costco Business (online) | wholesale/club | 5,000+        | Partial public pricing           |

### Tier 6: Account-Based Sources (developer provides credentials)

| Source                    | Type      | Est. Products | How                                                  |
| ------------------------- | --------- | ------------- | ---------------------------------------------------- |
| Restaurant Depot          | wholesale | 10,000+       | Developer has account. Bot logs in, scrapes catalog. |
| Sysco                     | wholesale | 50,000+       | Need account. Email outreach.                        |
| US Foods                  | wholesale | 40,000+       | Need account. Email outreach.                        |
| GFS (Gordon Food Service) | wholesale | 30,000+       | Need account. Email outreach.                        |

### Tier 7: Local/Specialty Sources (manual discovery + scraping)

| Source                  | Type        | Notes                                                        |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| Local farm websites     | farm_direct | Developer's local farms in MA/NH. Seasonal catalogs.         |
| Ethnic grocery catalogs | retail      | H Mart (Korean), 99 Ranch (Chinese), Patel Brothers (Indian) |
| Specialty stores        | retail      | Eataly (Italian), Trader Joe's, Sprouts                      |

---

## OpenClaw Email Outreach System

### Email Identity

Create `data@cheflowhq.com` as OpenClaw's outreach email. Professional, branded, legitimate.

### Outreach Targets

| Target                       | Email Purpose                         | Expected Outcome                       |
| ---------------------------- | ------------------------------------- | -------------------------------------- |
| Kroger Developer Support     | Fix cert endpoint (500 error)         | Working API key for 2,800 stores       |
| USDA FoodData Central        | Register for API key                  | Access to 380K+ product catalog        |
| Sysco regional rep           | Request digital price list            | Weekly wholesale price sheet (CSV/PDF) |
| US Foods regional rep        | Request digital price list            | Weekly wholesale price sheet           |
| Instacart Partnerships       | Request API access for recipe costing | Structured API vs scraping             |
| Local farms (Haverhill area) | Request seasonal price list           | Farm-direct pricing                    |

### Email Templates (Codex drafts, developer approves before sending)

All outreach emails must:

- Come from data@cheflowhq.com
- Identify ChefFlow as a software platform for professional chefs
- State the specific ask (API key, price list, partnership)
- Be short (under 150 words)
- Be approved by the developer before sending (OpenClaw does NOT send autonomously)

---

## Phase 1: Prove the Current System Works ($0, This Week)

### Success Criteria

Before any expansion, the current system must demonstrate:

1. **All 5 broken chains produce data** - Walmart, Whole Foods, Shaw's, Target, Trader Joe's all have >0 products in ChefFlow DB
2. **Sync runs 7 consecutive days without failure** - `openclaw.sync_runs` shows 7 daily entries with 0 fatal errors
3. **Product count grows each day** - not static, not shrinking
4. **Proof audit passes** - run `node scripts/proof-audit.mjs` and 54/54 ingredients have prices

### How to Verify

Create `scripts/openclaw-health-check.mjs`:

- Query `openclaw.sync_runs` for last 7 days
- Count products per chain (flag any with 0)
- Check price freshness (% within 7 days)
- Output: GREEN (all passing) or RED (what's failing)

Run this daily. If 7 consecutive GREEN, Phase 1 is complete.

---

## Phase 2: Breadth-First Instacart Expansion ($0-25/mo)

### Crontab Changes

Replace the current "re-scan same chains daily" schedule with a "scan-and-move" queue:

```
# OLD: re-scan Market Basket every Monday
30 7 * * 1 cd $OPENCLAW_DIR && bash run-full-catalog.sh market-basket

# NEW: Market Basket is DONE. Monday AM slot now scans Publix
30 7 * * 1 cd $OPENCLAW_DIR && bash run-full-catalog.sh publix
```

### Scan Queue

The Pi maintains a file `scan-queue.json`:

```json
{
  "completed": [
    { "chain": "market-basket", "products": 38954, "scanned": "2026-03-30" },
    { "chain": "hannaford", "products": 26235, "scanned": "2026-03-30" }
  ],
  "queue": [
    { "chain": "publix", "priority": "high", "region": "southeast" },
    { "chain": "safeway", "priority": "high", "region": "west" },
    { "chain": "heb", "priority": "high", "region": "south" }
  ],
  "failed": []
}
```

After each scan completes, the orchestrator:

1. Moves the chain from `queue` to `completed` with product count
2. Updates the crontab to point the next slot at the next chain in queue
3. Logs the completion

### GeoIP Strategy

- **NE chains** (ShopRite, Giant Eagle, etc.): Scan directly from Pi IP
- **Non-NE chains** (Publix, H-E-B, Safeway, etc.): Requires residential proxy ($15-25/mo from SmartProxy) OR captured session files per region
- Decision point: if proxy is too expensive, use captured session files (already working for NYC/Chicago/LA per `.openclaw-deploy/data/sessions/`)

---

## Phase 3: Free Structured APIs ($0-5)

### USDA FoodData Central Integration

1. Register at https://fdc.nal.usda.gov/api-key-signup.html
2. New Pi script: `services/scraper-usda-fdc.mjs`
3. Paginate through all branded food products (380K+)
4. Store in new table: `openclaw.usda_fdc_products` (fdcId, description, brandOwner, brandName, gtinUpc, ingredients, servingSize, servingSizeUnit, householdServingText)
5. Cross-reference with existing `openclaw.products` via UPC matching

### Kroger API Fix

1. Register new developer account at https://developer.kroger.com
2. Get fresh OAuth2 credentials
3. Fix `services/scraper-kroger.mjs` on Pi
4. Enable the disabled crontab line
5. Query products endpoint for each Kroger banner store

---

## Phase 4: Wholesale + Account-Based Sources

### WebstaurantStore Scraper

New Pi script: `services/scraper-webstaurantstore.mjs`

- Crawl all categories (public website, no login needed)
- Extract: product name, price, unit size, category
- Store with `price_type = 'wholesale'`, `store_type = 'online'`
- Expected: 400K+ products

### Restaurant Depot Bot

New Pi script: `services/scraper-restaurantdepot.mjs`

- Developer provides login credentials (stored in Pi's `.env`)
- Bot logs in, navigates every category page
- Extracts: product name, price, unit, pack size
- Store with `price_type = 'wholesale'`, `store_type = 'wholesale'`
- Expected: 10K+ products

### Email Outreach (Sysco, US Foods, GFS)

Handled via `data@cheflowhq.com`. Developer approves each email. Responses (price sheets, CSV files) are ingested via a new parser script.

---

## Phase 5: Cross-Reference and Gap-Fill

After all sources are captured once:

1. **Per-state ingredient audit:**

   ```sql
   -- For each state: which of the 76 USDA baseline items
   -- have NO local store data?
   SELECT zc.state, upb.item_name,
     COUNT(sp.id) as local_prices
   FROM openclaw.zip_centroids zc
   CROSS JOIN openclaw.usda_price_baselines upb
   LEFT JOIN openclaw.stores s ON s.state = zc.state
   LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
     AND ... (FTS match on product name)
   GROUP BY zc.state, upb.item_name
   HAVING COUNT(sp.id) = 0
   ```

2. **Fill gaps with national averages + regional multipliers** (already built in `universal-price-lookup.ts`)

3. **Produce per-state A-Z price lists** as materialized views or exported CSVs

4. **Identify structural gaps** (ingredients with no data anywhere) and target them specifically

---

## Hybrid Swarm Integration (AFTER Phase 1 Proves Stability)

### When to Add Codex

Only after Phase 1 success criteria are met (7 consecutive green days). Not before.

### Architecture

```
Pi (24/7, free):
  Ollama handles: HTML parsing, product extraction, text normalization
  Cron handles: scheduling, log rotation, watchdog

Health Check (daily, free):
  Bash script at 04:00: counts products per chain, checks logs
  IF broken → calls Codex API (one request, $0.50-$3)
  IF fine → logs "all clear", $0

Codex (on-demand only):
  Diagnoses scraper failures
  Writes code patches
  ONE attempt per problem (no retry loops)
  Monthly hard cap: $30 on OpenAI dashboard
```

### Cost Model

| Scenario                  | Daily Cost                         |
| ------------------------- | ---------------------------------- |
| Everything working        | $0                                 |
| 1 chain broken            | $0.50-$3.00                        |
| 3 things broken (unusual) | $1.50-$9.00                        |
| Monthly cap hit           | $0 (Codex stops, Ollama continues) |

**Typical month estimate:** $10-30. Worst case (hard cap): $30.

---

## Database Changes

### New Columns

```sql
-- Price type separation
ALTER TABLE openclaw.store_products
  ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'retail'
  CHECK (price_type IN ('retail', 'wholesale', 'commodity', 'farm_direct'));

-- Store type classification
ALTER TABLE openclaw.stores
  ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'retail'
  CHECK (store_type IN ('retail', 'wholesale', 'club', 'online', 'farm', 'distributor'));
```

### New Tables

```sql
-- Sources manifest: tracks what's been scanned and what hasn't
CREATE TABLE IF NOT EXISTS openclaw.source_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('instacart', 'api', 'website', 'account', 'government', 'farm')),
  price_type TEXT NOT NULL DEFAULT 'retail' CHECK (price_type IN ('retail', 'wholesale', 'commodity', 'farm_direct')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scanning', 'complete', 'failed', 'skipped')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  region TEXT,
  est_products INT,
  actual_products INT,
  scanned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USDA FoodData Central product catalog
CREATE TABLE IF NOT EXISTS openclaw.usda_fdc_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fdc_id INT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  brand_owner TEXT,
  brand_name TEXT,
  gtin_upc TEXT,
  ingredients_text TEXT,
  serving_size NUMERIC,
  serving_size_unit TEXT,
  household_serving_text TEXT,
  food_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usda_fdc_upc ON openclaw.usda_fdc_products(gtin_upc) WHERE gtin_upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usda_fdc_fts ON openclaw.usda_fdc_products USING GIN(to_tsvector('english', description));
```

### Migration Notes

- Check existing migrations: `glob database/migrations/*.sql` before creating
- Timestamp must be strictly higher than highest existing (currently 20260401000146)
- All changes are additive (ADD COLUMN, CREATE TABLE). No drops.

---

## Files to Create

| File                                                                    | Purpose                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `scripts/openclaw-health-check.mjs`                                     | Daily health check: products per chain, sync status, freshness |
| `database/migrations/20260401000147_price_type_and_source_manifest.sql` | Schema changes for price type separation + source manifest     |
| `.openclaw-deploy/scan-queue.json`                                      | Scan queue manifest (what's done, what's next)                 |

## Files to Modify

| File                                                    | What to Change                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `scripts/openclaw-pull/pull.mjs`                        | Respect `price_type` and `store_type` columns during upsert              |
| `lib/pricing/universal-price-lookup.ts`                 | Return `price_type` in results; separate wholesale/retail in UI response |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Add wholesale/retail toggle or section separation                        |
| `.openclaw-deploy/crontab-v7.txt`                       | Evolve to scan-and-move schedule after Phase 1                           |

---

## Verification Steps

### Phase 1 Verification

1. SSH into Pi, check logs for 5 broken chains
2. Fix each broken scraper
3. Run `node scripts/openclaw-pull/sync-all.mjs` after fixes
4. Run `node scripts/proof-audit.mjs` - all chains show >0 products
5. Run `node scripts/openclaw-health-check.mjs` daily for 7 days
6. 7 consecutive GREEN = Phase 1 complete

### Phase 2 Verification

1. `source_manifest` shows each new chain scanned with product counts
2. Total product count in `openclaw.products` exceeds 200K
3. Geographic coverage includes stores in 10+ states

### Phase 3 Verification

1. Kroger API returns products (test with 3 stores in different states)
2. USDA FDC products table has 300K+ entries
3. UPC cross-reference links FDC products to existing catalog

### Phase 4 Verification

1. WebstaurantStore products loaded with `price_type = 'wholesale'`
2. Restaurant Depot products loaded with `price_type = 'wholesale'`
3. Price catalog UI shows wholesale/retail separation

### Phase 5 Verification

1. Per-state ingredient coverage report generated
2. All 50 states have price data for 50+ of 76 USDA baseline items
3. Gap list identifies remaining holes with specific sources to target

---

## Out of Scope

- Real-time price monitoring (freshness layer comes AFTER full coverage)
- Price prediction or forecasting
- Automatic price alerts
- Multi-tenant wholesale account management
- Autonomous email sending (developer approves every outreach email)
- Recipe costing UI (separate spec, depends on this data being complete)

---

## Notes for Builder Agent

**CRITICAL: Only claim Phase 1 initially.** Phases 2-5 are a roadmap, not a single build ticket. Each phase has its own success criteria and must be verified before the next phase begins. Do NOT start Phase 2 until Phase 1 shows 7 consecutive green days.

1. **Phase 1 is SSH work on the Pi.** The builder needs Pi access (10.0.0.177, see memory/reference_raspberry_pi.md). Check `logs/scraper-walmart.log`, `logs/scraper-target.log`, `logs/instacart-walker.log` for error details.

2. **The scan-and-move architecture is a crontab change, not a code change.** Don't over-engineer this. A JSON manifest file + manual crontab updates per phase is fine. No need for a queue management system.

3. **Price type separation is the only schema change that's urgent.** The rest (source_manifest, usda_fdc_products) can wait until their respective phases.

4. **The developer does NOT want to spend money until Phase 1 succeeds.** Do not purchase proxies, API keys, or Codex credits during Phase 1. Phase 1 is purely about fixing what's broken with what we have.

5. **Re-scanning completed chains is waste.** If a chain already has 20K+ products from a recent scan, do NOT re-scan it. Move its crontab slot to an unscanned chain.

6. **Existing infrastructure references:**
   - Pull pipeline: `scripts/openclaw-pull/pull.mjs` (line 67: main function)
   - Sync orchestrator: `scripts/openclaw-pull/sync-all.mjs` (line 96: main function)
   - Pi config: `scripts/openclaw-pull/config.mjs` (line 6: Pi host/port)
   - Crontab: `.openclaw-deploy/crontab-v7.txt` (all 87 lines)
   - Price engine: `lib/pricing/universal-price-lookup.ts` (full file)
   - Non-food filter: `scripts/openclaw-pull/pull.mjs` (lines 36-65)
   - Multi-zip sessions: `.openclaw-deploy/run-multizip-catalog.sh`
   - Chain patches: `.openclaw-deploy/patch-add-chains.mjs`

7. **What existing tools do restaurants use (for context, not for scraping):**
   - Sysco/US Foods ordering portals (account-based wholesale)
   - Restaurant Depot (walk-in wholesale, developer has account)
   - ChefTec/CostGuard (manual price entry recipe costing - 20 year industry standard)
   - MarketMan/BlueCart/Plate IQ (invoice-based inventory tracking)
   - WebstaurantStore (public wholesale prices - scrapeable)
   - FoodServiceDirect (public wholesale prices - scrapeable)
