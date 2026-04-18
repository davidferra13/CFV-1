# OpenClaw Intelligence Layer for ChefFlow

> **Status:** SPEC (not built)
> **Priority:** P1
> **Scope:** All users benefit. No admin-only features unless noted.
> **Depends on:** Gemma 4 E2B on Pi (deployed 2026-04-18), existing sync infrastructure

---

## Problem Statement

OpenClaw collects 245K prices across 69K ingredients from 53 stores. ChefFlow currently queries about 128 of those ingredients. That is 0.18% utilization of a database that runs 107 cron jobs 24/7 on dedicated hardware.

The data exists. The infrastructure works. ChefFlow barely taps it.

This spec turns OpenClaw from "background data engine the developer monitors" into "invisible intelligence layer every chef benefits from automatically."

---

## Architecture: What Exists Today

```
Pi (OpenClaw)                              ChefFlow
---------------------------------------------
prices.db (245K prices, 69K ingredients)
  |
  |-- sync-api :8081
  |     POST /api/prices/enriched    <---  lib/openclaw/sync.ts (demand-driven)
  |     GET  /api/stats              <---  lib/openclaw/sync.ts
  |     GET  /api/prices             <---  lib/openclaw/sync.ts
  |     GET  /api/sources            <---  lib/openclaw/sync.ts
  |     GET  /api/changes            <---  lib/openclaw/sync.ts
  |     POST /api/catalog/suggest    <---  lib/openclaw/sync.ts (unmatched names)
  |     GET  /api/sale-calendar      <---  lib/openclaw/sale-calendar-actions.ts
  |     POST /api/optimize           <---  lib/openclaw/event-shopping-actions.ts
  |     GET  /api/price-drops        <---  lib/openclaw/price-intelligence-actions.ts
  |     GET  /api/store-scorecard    <---  lib/openclaw/price-intelligence-actions.ts
  |     GET  /api/price-history      <---  lib/openclaw/price-intelligence-actions.ts
  |     GET  /api/cost-impact        <---  lib/openclaw/price-intelligence-actions.ts
  |
  |-- webhook (Pi -> ChefFlow)
  |     price_anomaly               --->  SSE broadcast to admin
  |     sync_complete               --->  SSE broadcast
  |     sync_ready                  --->  SSE broadcast
  |     docket_complete             --->  SSE broadcast
  |
  |-- Gemma 4 E2B (ollama :11434, localhost-only)
  |     docket processor (Groq primary, Gemma fallback)
  |     archive digester (text + vision)
  |
  |-- receipt-processor
  |-- archive-digester :8086
  |-- dashboard :8090

ChefFlow consumers: 14 files in lib/openclaw/, 2 in lib/ingredients/, 4 in app/api/
```

### Key limitation: Demand-driven sync

ChefFlow sends ingredient names it already knows about to Pi. Pi matches and returns prices. Only ingredients chefs have manually entered get prices. The system waits for the chef to act first.

---

## Tier 1: Unlock Existing Data (No New Pi Code)

These items use data OpenClaw already collects. Only ChefFlow changes needed.

### 1.1 Auto-Enrich Ingredients on Entry

**What:** When a chef adds an ingredient to any recipe, immediately query Pi for price data. No manual sync required.

**Where it fires:**

- `lib/recipes/actions.ts` - when recipe_ingredients are inserted
- `lib/ai/import-actions.ts` - when brain dump creates ingredients
- `lib/recipes/csv-import-actions.ts` - when CSV import creates ingredients
- `lib/recipes/photo-import-actions.ts` - when photo import creates ingredients

**Implementation:**

```
chef adds ingredient "San Marzano tomatoes"
  -> after-insert hook
  -> POST to Pi /api/prices/enriched with [{ name: "San Marzano tomatoes" }]
  -> write price to ingredient_price_history
  -> update ingredient.current_price_cents, ingredient.price_source
```

**Non-blocking:** Price enrichment is a side effect. If Pi is down, ingredient still saves. Price appears later on next sync.

**Files to change:**

- `lib/recipes/actions.ts` - add enrichment call after ingredient insert
- `lib/openclaw/sync.ts` - extract single-ingredient enrichment function from bulk sync
- New: `lib/openclaw/auto-enrich.ts` - lightweight single-ingredient enrichment

**Benefit:** Every chef gets pricing the moment they enter an ingredient. Zero friction. Currently they see $0.00 until manual sync runs.

---

### 1.2 "What's Cheap This Week" Digest

**What:** Surface Pi's sale calendar and price drops into a chef-visible weekly digest on the dashboard.

**Data source:** Pi already has:

- `/api/sale-calendar` - current sale items by store
- `/api/price-drops` - ingredients that dropped in price recently

**Where it surfaces:**

- Dashboard widget (passive, always visible)
- Optional: weekly email digest (same data, formatted for email)

**Implementation:**

- New component: `components/dashboard/price-intel-widget.tsx`
- Server action: `lib/openclaw/weekly-digest-actions.ts`
- Filter by chef's preferred stores (`lib/grocery/store-shopping-actions.ts` already tracks these)
- Filter by chef's ingredient universe (ingredients they actually use in recipes)
- Cache 1 hour via `unstable_cache` with tag `price-intel-digest`

**What chef sees:**

```
This Week's Deals (3 of your ingredients on sale)
  Butter (Market Basket) - $3.99/lb (was $5.49, -27%)
  Heavy Cream (Stop & Shop) - $4.29/qt (was $5.99, -28%)
  Olive Oil (Costco) - $12.99/L (was $16.49, -21%)
```

**Benefit:** Every chef saves money. No effort required. Passive intelligence.

---

### 1.3 Shopping List Cost Estimation from Pi

**What:** When generating shopping lists from events, populate `estimatedCostCents` from Pi price data instead of ingredient.current_price_cents (which is often $0.00).

**Current state:** `lib/culinary/shopping-list-actions.ts` already has `estimatedCostCents` in the type. Check if it pulls from Pi or from local ingredient data.

**Implementation:**

- In `generateShoppingList()`, after computing `toBuy` quantities, batch-query Pi for current prices
- Use cheapest-available price per ingredient (or chef's preferred store price)
- Fall back to `ingredient.current_price_cents` if Pi returns nothing
- Add `priceSource: 'pi' | 'local' | 'none'` to each item so UI can indicate confidence

**Files to change:**

- `lib/culinary/shopping-list-actions.ts` - add Pi price lookup step
- Reuse `fetchPi()` pattern from `lib/openclaw/store-preference-actions.ts`

**Benefit:** Every chef knows approximate spend before buying. Food cost % becomes predictive, not just retrospective.

---

### 1.4 Store Recommendation Engine

**What:** Pi has prices across 53 stores. Surface "cheapest store for this shopping list" wherever shopping lists appear.

**Current state:** `lib/openclaw/event-shopping-actions.ts` already has `singleStoreBest` and `multiStoreOptimal` fields in `EventShoppingPlan.optimization`. This is partially built.

**Gap:** This only fires for event-driven shopping (upcoming events). It should also work for:

- Ad-hoc shopping lists
- Meal prep program shopping
- Manual "I need to buy X, Y, Z" scenarios

**Implementation:**

- Extract optimization logic from `event-shopping-actions.ts` into shared `lib/openclaw/store-optimizer.ts`
- Call it from any shopping list surface
- UI component: `components/shopping/store-recommendation.tsx` (reusable)

**What chef sees:**

```
Best single store: Market Basket ($87.42 for 12/15 items)
Multi-store optimal: Market Basket + Costco ($72.18, saves $15.24)
  Market Basket: butter, cream, eggs, herbs (8 items, $42.10)
  Costco: olive oil, flour, sugar, vanilla (4 items, $30.08)
```

**Benefit:** Every chef picks the right store. Especially valuable for multi-stop shopping.

---

### 1.5 Seasonal Price Patterns

**What:** Pi has historical price data. Surface "this ingredient is cheaper in August" on recipe and menu screens.

**Data source:** New Pi endpoint needed: `GET /api/price-patterns/:canonical_id` returning monthly average prices over available history.

**Pi-side work (minimal):**

```sql
SELECT strftime('%m', confirmed_at) as month,
       AVG(price_cents) as avg_cents,
       MIN(price_cents) as min_cents,
       COUNT(*) as sample_count
FROM prices
WHERE canonical_ingredient_id = ?
GROUP BY month
ORDER BY month
```

**ChefFlow-side:**

- Server action: `lib/openclaw/seasonal-patterns-actions.ts`
- UI: subtle inline hint on recipe ingredient rows and menu planning screens
- Cache aggressively (patterns don't change fast)

**What chef sees:**

```
Lobster: Currently $18.99/lb. Historically cheapest in Jan ($14.20/lb avg).
```

**Benefit:** Every chef plans menus with cost awareness. Data-driven menu design.

---

## Tier 2: Gemma 4 Does New Work on Pi

Now that Gemma 4 E2B runs on Pi (6.2 tok/s, localhost-only), the AI can process and enrich data before it reaches ChefFlow.

### 2.1 Natural Language Ingredient Matching

**What:** Gemma 4 resolves chef ingredient names ("San Marzano tomatoes, preferably DOP") to canonical products in Pi's database.

**Problem today:** Cross-match uses string similarity. "Heavy cream" matches "Heavy Cream 36% Fat 1qt" but "double cream" doesn't. "EVOO" doesn't match "Extra Virgin Olive Oil". Only 128/69K match.

**Pi-side work:**

- New endpoint: `POST /api/match/ai` accepting `{ names: string[] }`
- For each name, Gemma 4 generates search terms and synonyms
- Search Pi's canonical ingredients with expanded terms
- Return top-3 matches with confidence scores

**Prompt pattern:**

```
Given the chef's ingredient name "${name}", generate:
1. The canonical grocery name
2. Common synonyms
3. Brand-agnostic search terms
Return JSON: { canonical: string, synonyms: string[], searchTerms: string[] }
```

**ChefFlow-side:**

- Call `/api/match/ai` as fallback when `/api/prices/enriched` returns no match
- Present matches for chef approval (per `feedback_ingredient_chef_approval.md`: every match requires explicit chef approval)

**Benefit:** Better price accuracy. Fewer "no match" dead ends. Every chef's ingredients find their prices.

---

### 2.2 Price Anomaly Explanations

**What:** Instead of raw "price changed 40%", Gemma 4 generates human-readable explanations.

**Current state:** Pi detects anomalies (15,540 unacknowledged). ChefFlow receives them via webhook (`price_anomaly` type). But they're just numbers.

**Pi-side work:**

- After anomaly detection, pass anomaly context to Gemma 4
- Gemma 4 generates 1-sentence explanation considering: ingredient category, magnitude, direction, time of year, whether other stores show same pattern

**Prompt pattern:**

```
Price anomaly: ${ingredient} at ${store} changed from $${old} to $${new} (${pct}%).
Category: ${category}. Date: ${date}. Other stores show: ${otherStoreData}.
Explain in one sentence why this might have happened and whether the chef should act.
```

**ChefFlow-side:**

- `app/api/openclaw/webhook/route.ts` already receives anomalies
- Add `explanation` field to the broadcast payload
- Surface in dashboard notifications

**Benefit:** Every chef understands why costs changed. Actionable, not just informational.

---

### 2.3 Substitution Intelligence

**What:** Gemma 4 identifies cheaper substitutes from Pi's actual price data.

**Current state:** `lib/ingredients/substitution-actions.ts` and `lib/shopping/substitutions.ts` exist but use static mappings or AI without price context.

**Pi-side work:**

- New endpoint: `POST /api/substitutes` accepting `{ ingredient: string, max_results: 5 }`
- Gemma 4 generates culinary substitutes for the ingredient
- Pi cross-references each substitute against its price database
- Returns substitutes with actual current prices and savings

**What chef sees:**

```
Saffron ($12.99/g) - Consider:
  Turmeric + paprika ($0.89/oz, -93%) - color substitute, different flavor
  Safflower ($3.49/g, -73%) - similar color, mild flavor
```

**Constraint:** AI suggests substitutes but NEVER changes recipes. Chef decides. Per AI policy: recipes are the chef's creative work.

**Benefit:** Every chef gets cost-saving suggestions grounded in real local prices, not generic AI guesses.

---

### 2.4 Receipt Understanding

**What:** Gemma 4 reads receipt photos more accurately than the current Tesseract + regex pipeline.

**Current state:**

- `lib/ingredients/receipt-scan-actions.ts` handles receipt scanning
- Pi has `receipt-processor.mjs` (running, PID 815)
- Archive digester has 3-tier OCR: Tesseract -> Gemma 4 vision -> skip

**Enhancement:**

- Route receipt images to Pi's Gemma 4 (multimodal, supports images)
- Gemma 4 extracts: store name, date, line items (name, qty, price, unit)
- Returns structured JSON that `receipt-scan-actions.ts` can ingest
- Keep Tesseract as fast first pass; Gemma 4 for items Tesseract couldn't parse

**Pi-side work:**

- New endpoint: `POST /api/receipt/parse` accepting multipart image
- Gemma 4 vision prompt: "Extract all line items from this receipt as JSON"
- Merge with Tesseract results (Tesseract handles printed text well; Gemma 4 handles handwritten, damaged, or unusual formats)

**Benefit:** Every chef can scan receipts and get real cost tracking with higher accuracy.

---

### 2.5 Vendor Price List Parsing

**What:** Gemma 4 extracts structured data from wholesale PDF price lists (Sysco, US Foods, Restaurant Depot, local distributors).

**Current state:**

- `lib/openclaw/vendor-import-actions.ts` exists (14 lines of imports visible)
- Pi email agent harvests wholesale prices from 5 NE distributors
- PDF parsing is the hard part; most vendor lists are semi-structured PDFs

**Pi-side work:**

- New endpoint: `POST /api/vendor/parse-pdf` accepting PDF file
- Gemma 4 extracts: product name, pack size, unit price, case price, category
- Returns structured JSON array
- Pi stores in prices.db under the vendor's source entry

**ChefFlow-side:**

- Upload UI in price catalog or settings
- Chef uploads vendor PDF, Pi processes, prices appear in their catalog

**Benefit:** Every chef who buys wholesale gets their prices tracked automatically. Currently a manual data entry nightmare.

---

## Tier 3: Structural Improvements

### 3.1 Push Model (Real-Time Price Alerts)

**What:** Pi proactively pushes relevant price changes to ChefFlow instead of waiting for sync cron.

**Current state:** Webhook infrastructure exists (`app/api/openclaw/webhook/route.ts`). Handles `price_anomaly`, `sync_complete`, `sync_ready`, `docket_complete`. But only broadcasts to admin via SSE.

**Enhancement:**

- New webhook type: `price_alert` - targeted to specific chefs based on their ingredient registry
- Pi sends: `{ type: "price_alert", chef_ids: [...], data: { ingredient, old_price, new_price, store } }`
- ChefFlow routes alert to the specific chef's notification feed
- Chef sees: "Butter dropped 15% at Market Basket" in their notification tray

**Requires:** Per-chef ingredient registry (3.2) so Pi knows which chefs care about which ingredients.

**Benefit:** Real-time price intelligence. Chef sees a price drop alert the moment it's detected.

---

### 3.2 Per-Chef Ingredient Registry

**What:** ChefFlow tells Pi "these are ALL ingredients chef X uses across all recipes" so Pi can pre-cache prices and send targeted alerts.

**Current state:** Sync is demand-driven. ChefFlow sends ~128 ingredients at sync time. Pi has 69K available.

**Implementation:**

**ChefFlow-side:**

- New scheduled job: nightly, compute each chef's full ingredient universe
  - Query: all distinct ingredient names across all recipes, menus, shopping lists for each tenant
- POST to Pi: `POST /api/registry/update` with `{ chef_id, ingredients: [{ name, category }] }`

**Pi-side:**

- New table: `chef_ingredient_registry` (chef_id, ingredient_name, canonical_id, last_synced)
- Cross-match engine runs against registry entries (not just ChefFlow's 128)
- Price alerts (3.1) filter by registry: only alert chefs who use the ingredient

**Scale:** Average chef uses 200-500 unique ingredients. 100 chefs = 50K registry entries. Trivial for SQLite.

**Benefit:** Goes from 128 matched ingredients to thousands. Multiplies the value of everything Pi already collects.

---

### 3.3 Geographic Expansion via Chef Location

**What:** Use chef's `home_city` + `home_state` to prioritize which stores Pi scrapes for them.

**Current state:**

- Chefs have `home_city` and `home_state` in the database (confirmed: `lib/db/schema/schema.ts`, used in 15 files)
- Pi scrapes 53 stores, concentrated in NE Massachusetts
- Geographic expansion beyond NE is blocked by Instacart GeoIP (needs residential proxy)

**Implementation:**

- Include chef location in ingredient registry sync (3.2)
- Pi groups chefs by region
- Pi prioritizes scraping stores available in regions where active chefs are
- Long term: as chef base grows, Pi expands scraping to cover their regions

**Constraint:** No residential proxy cost yet. Start with regions covered by existing scraping. Expand as justified by chef count per region.

**Benefit:** Every chef gets prices relevant to THEIR area, not just NE Massachusetts.

---

### 3.4 Unified Pi Health in Admin Dashboard

**What:** Surface Pi status in ChefFlow admin dashboard. One glance to see if the data engine is healthy.

**Current state:**

- Pi dashboard at :8090 (separate app, developer-only)
- OpenClaw Operator at localhost:4000 (separate app, developer-only)
- ChefFlow admin has no Pi visibility

**Implementation:**

- New admin page: `/admin/openclaw`
- Server action: `lib/openclaw/health-actions.ts`
- Queries Pi for: disk usage, WAL size, Ollama status, scraper freshness, last sync time, error count
- Pi endpoint needed: `GET /api/health` returning structured health data

**What admin sees:**

```
OpenClaw Status: HEALTHY
  Disk: 45GB/117GB (39%)
  WAL: 104MB (checkpoint at 3:00 AM)
  Ollama: gemma4:e2b-it-q4_K_M (idle, 6.2 tok/s)
  Last scrape: 22 min ago (Instacart Market Basket)
  Prices: 245K across 53 stores
  Sync: 128 ingredients matched, last sync 4h ago
  Anomalies: 47 unacknowledged
```

**Benefit:** Developer sees everything in one place. Prevents silent failures like the 46GB WAL.

---

## Schema Changes

### New table: `ingredient_price_alerts` (ChefFlow)

```sql
CREATE TABLE ingredient_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id),
  ingredient_id uuid REFERENCES ingredients(id),
  ingredient_name text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('price_drop', 'price_spike', 'back_in_stock', 'sale')),
  old_price_cents integer,
  new_price_cents integer,
  change_pct numeric(5,2),
  store text,
  explanation text, -- Gemma 4 generated
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ipa_tenant_created ON ingredient_price_alerts(tenant_id, created_at DESC);
```

### New table on Pi: `chef_ingredient_registry`

```sql
CREATE TABLE chef_ingredient_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_id TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  canonical_ingredient_id TEXT,
  category TEXT,
  region TEXT, -- chef's home_state
  last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(chef_id, ingredient_name)
);
CREATE INDEX idx_cir_canonical ON chef_ingredient_registry(canonical_ingredient_id);
CREATE INDEX idx_cir_region ON chef_ingredient_registry(region);
```

### Existing migration (already created): `local_ai_preferences`

```sql
ALTER TABLE ai_preferences
  ADD COLUMN local_ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN local_ai_url text NOT NULL DEFAULT 'http://localhost:11434',
  ADD COLUMN local_ai_model text NOT NULL DEFAULT 'gemma4',
  ADD COLUMN local_ai_verified_at timestamptz;
```

This is separate from OpenClaw. This allows chefs to run their own Ollama for Remy chat. Documented but not part of this spec's scope.

---

## Execution Order

**Phase 1 (highest leverage, least effort):**

1. Auto-enrich ingredients on entry (1.1)
2. Per-chef ingredient registry (3.2)
3. Shopping list cost estimation from Pi (1.3)

**Phase 2 (dashboard intelligence):** 4. "What's cheap this week" digest (1.2) 5. Store recommendation engine (1.4) 6. Push model for price alerts (3.1)

**Phase 3 (AI enrichment):** 7. NL ingredient matching via Gemma 4 (2.1) 8. Price anomaly explanations (2.2) 9. Substitution intelligence (2.3)

**Phase 4 (operational):** 10. Seasonal price patterns (1.5) 11. Receipt understanding (2.4) 12. Vendor price list parsing (2.5) 13. Geographic expansion (3.3) 14. Unified Pi health dashboard (3.4)

---

## Question Set: 40-Question Stress Test

### Data Integrity (DI)

| #    | Question                                                                                | Expected Answer                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DI-1 | When auto-enrich fires on ingredient insert, what happens if Pi is down?                | Ingredient saves normally. Price stays at $0. Non-blocking side effect. Next sync catches it.                                                                             |
| DI-2 | If two chefs add the same ingredient simultaneously, does auto-enrich fire twice?       | Yes, but Pi returns same data. Dedup via `idx_iph_openclaw_dedup` partial unique index prevents duplicate price history rows.                                             |
| DI-3 | When the per-chef registry syncs, what happens to ingredients the chef deleted?         | Nightly job recomputes full universe. Deleted ingredients drop out. Pi registry entry remains but becomes inert (no chef references it).                                  |
| DI-4 | If Pi's cross-match links "Heavy Cream" to the wrong product, how does the chef fix it? | Chef approval required per `feedback_ingredient_chef_approval.md`. Chef can reject match in price catalog UI. Rejected match feeds back to Pi via `/api/catalog/suggest`. |
| DI-5 | What happens when Pi returns a price of $0.00 or negative?                              | `lib/openclaw/price-validator.ts` exists. `validatePrice()` rejects prices outside sane bounds. Item gets quarantined, not written.                                       |
| DI-6 | If the WAL checkpoint cron fails, how long until disk fills?                            | ~17 days at current write rate (~4GB/day WAL growth). Snapshot cleanup cron buys extra time. WAL size should be monitored in admin health dashboard (3.4).                |
| DI-7 | Can price history rows be deleted?                                                      | No. `ingredient_price_history` is append-only. Per financial data policy: immutable ledger pattern.                                                                       |
| DI-8 | What happens if two Pi endpoints return conflicting prices for the same ingredient?     | Sync writes the most recently confirmed price. `last_confirmed_at` timestamp wins. No merge logic needed; latest is truth.                                                |

### User Experience (UX)

| #    | Question                                                                              | Expected Answer                                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-1 | Does the chef need to do anything to get price data?                                  | No. Auto-enrich (1.1) fires on ingredient entry. Registry sync (3.2) runs nightly. Completely invisible.                                                                                                       |
| UX-2 | What does a new chef with zero recipes see in the price intel widget?                 | Empty state: "Add recipes to see price intelligence for your ingredients." No fake data, no $0.00 rows.                                                                                                        |
| UX-3 | If Pi is offline for a week, what degrades?                                           | Prices go stale (shown with staleness indicator). Shopping list estimates use last-known prices. Sale calendar shows empty state. Dashboard widget shows "Price data temporarily unavailable." Nothing breaks. |
| UX-4 | Can a chef opt out of price intelligence?                                             | Not needed. Price data is passive enrichment. No alerts by default (3.1 alerts are opt-in). No UI clutter if no data available.                                                                                |
| UX-5 | How does the store recommendation handle a chef who shops at stores Pi doesn't track? | Shows available stores only. If none of the chef's preferred stores are tracked, shows "No price data for your preferred stores. Try adding [tracked stores] to your store preferences."                       |
| UX-6 | What happens when Gemma 4 generates a bad substitution suggestion?                    | Suggestions are clearly labeled as AI-generated. Chef must explicitly choose to use a substitute. No auto-application.                                                                                         |
| UX-7 | Does the weekly deals digest spam chefs who don't care?                               | Dashboard widget is passive (always there if data exists). Email digest is opt-in only (not in V1 scope).                                                                                                      |
| UX-8 | When a chef uploads a vendor PDF, how long until prices appear?                       | Pi processes asynchronously. Webhook pushes `sync_complete` when done. UI shows "Processing..." with SSE updates. Target: <2 min for a 10-page PDF.                                                            |

### Performance (P)

| #   | Question                                                                                   | Expected Answer                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-1 | Auto-enrich adds a Pi HTTP call on every ingredient insert. Does this slow recipe editing? | No. Non-blocking (fire-and-forget). Uses `try/catch` with no await in the critical path. Price appears after a brief delay.                                                                                                                 |
| P-2 | Nightly registry sync for 100 chefs x 300 ingredients = 30K items. Can Pi handle this?     | Yes. Single POST with batch payload. Pi INSERT OR REPLACE into SQLite. <5 seconds.                                                                                                                                                          |
| P-3 | Gemma 4 at 6.2 tok/s: how long for NL ingredient matching on 50 ingredients?               | ~50 x 15s (prompt + response) = ~12.5 min if sequential. Batch with async parallelism (3 concurrent): ~4 min. Acceptable for background enrichment, not real-time.                                                                          |
| P-4 | What if 10 chefs upload vendor PDFs simultaneously?                                        | Queue on Pi. Process sequentially. Gemma 4 handles one PDF at a time. Others wait. Webhook notifies each chef on completion.                                                                                                                |
| P-5 | Shopping list cost lookup for 50 ingredients: how fast?                                    | Single batch POST to Pi. Pi does 50 SQLite lookups. Response in <1 second. No per-ingredient HTTP calls.                                                                                                                                    |
| P-6 | Can Pi's 8GB RAM handle Gemma 4 + sync-api + receipt-processor + active scrapers?          | Tight. Gemma 4 uses ~7GB (mmap'd). sync-api ~300MB. Scrapers ~200MB total. Works because mmap'd model pages are reclaimable. Under heavy load, model pages get evicted and re-faulted (slow but not crash). Monitor via admin health (3.4). |
| P-7 | Dashboard widget polls Pi on every page load?                                              | No. Cache via `unstable_cache` with 1-hour TTL and `price-intel-digest` tag. Bust on sync_complete webhook.                                                                                                                                 |
| P-8 | What if Pi's network is slow? All Pi calls have timeouts?                                  | Yes. Every `fetchPi()` wrapper uses 5-second AbortController timeout. `sync.ts` uses 30-second timeout for bulk operations. Timeout = graceful empty state, never hanging UI.                                                               |

### Security (S)

| #   | Question                                                                        | Expected Answer                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1 | Can a chef access another chef's price alerts?                                  | No. All queries scoped by `tenant_id` from session. Standard pattern.                                                                                                       |
| S-2 | Can the per-chef ingredient registry leak chef ingredient lists to other chefs? | No. Pi stores `chef_id` per entry. ChefFlow never exposes cross-chef data. Pi has no UI.                                                                                    |
| S-3 | Is the Pi webhook authenticated?                                                | Yes. `OPENCLAW_WEBHOOK_SECRET` bearer token. Fail-closed: no secret = 503.                                                                                                  |
| S-4 | Can a malicious ingredient name inject into Pi's Gemma 4 prompt?                | Low risk. Gemma 4 runs localhost-only. Input is sanitized ingredient names. Prompt injection produces bad match results (caught by chef approval gate), not code execution. |
| S-5 | Is Ollama on Pi accessible from the network?                                    | No. Bound to 127.0.0.1:11434 only (fixed 2026-04-18).                                                                                                                       |
| S-6 | Do vendor PDFs get stored on Pi permanently?                                    | No. Process in /tmp, extract data, delete file. Only structured price data persists.                                                                                        |
| S-7 | Can the registry sync endpoint be called by unauthorized clients?               | Pi sync-api currently has no auth (internal network only). For registry endpoint: add shared secret (same pattern as webhook).                                              |
| S-8 | Does price data contain PII?                                                    | No. Prices, store names, and ingredient names are public data. No client/chef PII flows through the price pipeline.                                                         |

### Cohesion (CO)

| #    | Question                                                                         | Expected Answer                                                                                                                                                                                                             |
| ---- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CO-1 | Does auto-enrich (1.1) bust the right caches?                                    | Must bust: `price-intel-digest`, `revalidatePath('/culinary/price-catalog')`, `revalidateTag('ingredient-prices')`. Same cache busting as `sync.ts`.                                                                        |
| CO-2 | Does the shopping list (1.3) use the same price resolution as the price catalog? | Both should resolve via Pi. Currently shopping list may use `ingredient.current_price_cents` (local DB). Must align to use `fetchPi()` with local fallback.                                                                 |
| CO-3 | Does the store recommendation (1.4) respect the chef's preferred stores?         | Yes. `getPreferredStores()` from `lib/grocery/store-shopping-actions.ts` already exists. Optimizer filters by preferred stores first, then shows all stores as secondary.                                                   |
| CO-4 | Do price alerts (3.1) connect to the notification system?                        | Must integrate with existing notification infrastructure. Check if ChefFlow has a notification tray/feed. If not, alerts surface as dashboard toasts via SSE broadcast (existing pattern).                                  |
| CO-5 | Does the ingredient registry (3.2) include sub-recipe ingredients?               | Yes. The nightly job must traverse `recipe_sub_recipes` recursively (same pattern as `getRecipeMultipliersForEvents()` in `shopping-list-actions.ts:120-143`).                                                              |
| CO-6 | Does vendor PDF parsing (2.5) connect to the existing vendor/supplier system?    | Yes. `lib/openclaw/vendor-import-actions.ts` already exists. Parsed prices should link to the chef's vendor entries in the supplier system.                                                                                 |
| CO-7 | Does Remy know about price intelligence?                                         | Remy already has `recipe.search` tool and ingredient context. Add price context: "Butter is currently $5.49/lb at Market Basket, down 12% this week." Remy can surface this in conversation without generating recipes.     |
| CO-8 | Does the event financial summary incorporate Pi prices?                          | `event_financial_summary` view computes from ledger entries. Estimated costs (pre-event) should use Pi prices. Actual costs (post-event) come from receipts/manual entry. Two separate paths, both benefiting from Pi data. |

---

## What This Does NOT Include

- No changes to Remy's core behavior (Remy doesn't generate recipes, doesn't change)
- No crowdsourced data (chefs don't contribute to OpenClaw's database)
- No new paid features (all price intelligence is free tier)
- No cloud dependencies (Pi is self-hosted, Gemma 4 is local)
- No breaking changes to existing sync (everything is additive)

---

## Success Metrics

| Metric                              | Current                   | Target                                  |
| ----------------------------------- | ------------------------- | --------------------------------------- |
| Ingredients with price data         | ~128                      | 80% of all ingredients across all chefs |
| Time from ingredient entry to price | Manual sync (hours/days)  | <30 seconds (auto-enrich)               |
| Chef awareness of price changes     | Zero (admin-only webhook) | Every chef sees relevant changes        |
| Shopping list cost accuracy         | $0.00 (no data)           | Within 15% of actual receipt total      |
| Pi data utilization                 | 0.18% (128/69K)           | >5% via registry, >20% with NL matching |

---

## Audit: Pre-Requisite Fixes (Completed 2026-04-18)

Thread audit identified 7 critical bugs blocking spec execution. All fixed and type-checked.

| #   | Fix                                 | File                                    | What Changed                                                                                                                                                                                               |
| --- | ----------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QW1 | `createIngredient()` enrichment gap | `lib/recipes/actions.ts`                | Added `autoMatchToSystemIngredient()` + `ensureIngredientHasPrice()` to standalone create. Also added re-enrichment on ingredient rename in `updateIngredient()`.                                          |
| QW2 | Wholesale NULL tenant_id            | `lib/pricing/resolve-price.ts`          | Wholesale prices inserted with `tenant_id = NULL` by `wholesale-handler.ts`. Resolution queries now include `OR (tenant_id IS NULL AND source = 'openclaw_wholesale')`. Both single and batch paths fixed. |
| QW3 | Sale calendar no caching            | `lib/openclaw/sale-calendar-actions.ts` | Wrapped `getCurrentSales()` in `unstable_cache` with 1-hour TTL and `sale-calendar` tag. Import already existed.                                                                                           |
| QW4 | Price-watch alert spam              | `lib/openclaw/price-watch-actions.ts`   | `checkPriceWatchAlerts()` now updates `last_alerted_at` on triggered watches after returning alerts.                                                                                                       |
| QW5 | `polishUnits` corruption            | `lib/openclaw/polish-job.ts`            | Changed `SET price_per_unit_cents = price_cents` to `ROUND(price_cents / quantity)` when quantity > 0. Prevents inflated per-unit prices on multi-quantity rows.                                           |
| QW6 | Cart refresh O(n) Pi calls          | `lib/openclaw/cart-actions.ts`          | Replaced serial per-item `GET /api/ingredients/detail/:id` with single `POST /api/lookup/batch`. O(n) -> O(1) network calls.                                                                               |
| QW7 | Seasonal analyzer join bug          | `lib/openclaw/seasonal-analyzer.ts`     | Join was `ingredient_price_history.ingredient_id = system_ingredients.id` (wrong ID space). Fixed to bridge through `ingredient_aliases` with confirmed_at filter.                                         |

### Remaining Structural Issues (Not Yet Fixed)

| #   | Issue                                                        | Impact                                   | Effort       |
| --- | ------------------------------------------------------------ | ---------------------------------------- | ------------ |
| SI1 | Two DB clients (Supabase vs Drizzle) in OpenClaw files       | Inconsistent error handling              | Medium       |
| SI2 | `package-optimizer.ts` non-atomic reset                      | Brief window with no best-value products | Small        |
| SI3 | `nutrition-enricher.ts` no tenant scoping                    | Cross-tenant data contamination risk     | Small        |
| SI4 | Pi response shape mismatch for `/api/optimize/shopping-list` | One of two consumers has wrong mapping   | Verify first |
| SI5 | `price-watch-actions.ts` uses `entityId` vs `tenantId`       | Wrong scoping if IDs diverge             | Verify first |

### Extended Question Set (13 additional questions from audit)

See thread audit output for DI-9 through DI-13, UX-9 through UX-11, P-9 through P-10, S-9 through S-10, CO-9 through CO-11. Total: 53 questions covering all failure points.

---

## Deep Cohesion Audit (Pass 2, 2026-04-18)

Full cross-boundary scan of every system that touches pricing data. Every rock turned.

### Domain 1: Remy <-> Price Intelligence

**Current state:** Remy has zero direct access to Pi price data. No Remy tool queries Pi. No price context is injected into Remy's prompt.

**What Remy CAN do today:**

- `recipe.search` tool: search chef's recipe book (read-only)
- `analytics.recipe_cost` task: return recipe cost from `recipe_cost_summary` view
- Instant answers for food cost %, Q-factor, prime cost, cost-plus, margins (static knowledge)
- Revenue/margin analysis from `event_financial_summary` view data

**What Remy CANNOT do (but should):**

- "Is butter cheaper this week?" - No sale calendar access
- "What's the cheapest store for my shopping list?" - No store optimization access
- "How much will this menu cost?" - Only from `recipe_cost_summary`, not live Pi prices
- "Any price drops I should know about?" - No price alert access

**Cohesion gap:** Remy talks about food cost percentage and margins but has no ingredient-level price awareness. If a chef asks "why did my food cost go up?", Remy can say "your food cost is 38%" but cannot say "butter went from $3.99 to $5.49 at Market Basket last week."

**Fix (spec item to add):** Inject price context into Remy's system prompt via `route-prompt-utils.ts`. When building chef context, include:

- Top 5 price changes this week (from `ingredient_price_history`)
- Active sale items for chef's preferred stores (from `getCurrentSales()`)
- Any triggered price watch alerts

No new tool needed. Just context injection. Remy can then naturally reference prices in conversation.

---

### Domain 2: Event Lifecycle <-> Price Data

**Current state:**

- `event_financial_summary` view computes from ledger entries (actual costs from receipts/manual entry)
- `compute_projected_food_cost_cents` DB function projects food cost from recipe book
- `estimateMenuCost()` in `lib/menus/estimate-actions.ts` uses `recipe_cost_summary` view
- Shopping list `estimatedCostCents` uses `ingredients.last_price_cents`
- Event page shows `food_cost_percentage` from ledger (actual, post-event)

**Flow verified:**

```
Recipe ingredients -> recipe_cost_summary view (uses computed_cost_cents per ingredient)
  -> menu cost estimate -> event projected food cost
  -> quote includes estimated food cost
  -> post-event: receipts/ledger -> actual food cost -> event_financial_summary
```

**Cohesion status:** CONNECTED but with one gap:

**Gap:** Pre-event estimated food cost uses recipe `computed_cost_cents` which depends on `ensureIngredientHasPrice()`. If ingredients were created via import paths (brain dump, photo, CSV) before the QW1/QW8 fixes, they have no prices, and the estimate is $0 for those items. The fix in this session (auto-enrich on all import paths) closes this gap going forward. Existing unpriced ingredients from old imports remain at $0 until next sync.

---

### Domain 3: Dashboard / Notifications / Email <-> Price Data

**Current state:**

- `OpenClawLiveAlerts` component: renders on dashboard for ALL users (not admin-gated despite comment saying "admin-only"). Listens on `openclaw:alerts` SSE channel. Shows toast for `price_anomaly`, `growth_regression`, `sync_stale`.
- `alerts-cards.tsx`: dashboard widget showing price intelligence summary (drops, spikes, freshness %). Links to `/culinary/costing`. Uses `getPriceIntelligenceSummary()` from Pi.
- `smart-suggestions.tsx`: shows ingredient pricing gaps ("X of Y ingredients priced"), links to `/culinary/price-catalog`.

**What works for ALL users:**

- Price intelligence summary widget on dashboard (drops, spikes, freshness)
- Smart suggestions showing ingredient pricing coverage gaps
- OpenClaw live alerts (toasts for anomalies) - currently fires for all users

**What's admin-only:**

- Nothing is actually admin-gated. `OpenClawLiveAlerts` has `isAdmin` check but renders for all.

**Cohesion status:** GOOD. Dashboard surfaces price data to all users. No email templates reference ingredient costs (email is for client communication, not price intel).

**One finding:** `OpenClawLiveAlertsSection` at `dashboard/page.tsx:303-306` checks `isAdmin` but renders `<OpenClawLiveAlerts />` regardless (the check result isn't used as a gate). This means ALL users get price anomaly toasts. Per spec: "All users benefit" - this is actually correct behavior, but the code comment is misleading.

---

### Domain 4: Completion Contract / Billing / Imports <-> Price Data

**Current state:**

- Feature classification (`lib/billing/feature-classification.ts`):
  - `price-view-basic` (free): view estimated pricing and location-aware averages
  - `price-intel-advanced` (paid): historical trends, supplier breakdowns, regional comparisons
  - `price-sync-live` (paid): real-time price updates from OpenClaw
  - `ingredient-normalization` (paid): automatic ingredient matching
  - `ingredient-bulk-resolve` (paid): bulk ingredient list resolution
  - `price-export` (paid): export pricing data to CSV
  - `menu-costing-live` (paid): real-time cost recalculation
  - `costing-component-breakdown` (paid): dish/course/component level costs

- Meal prep programs: **ZERO connection to pricing**. `app/(chef)/meal-prep/` has no price or cost references. Meal prep is a separate world with no cost estimation.

- Import paths: **ALL NOW FIXED** (brain dump, photo, CSV all call `autoEnrichNewIngredient()`)

- Calendar feeds: no cost data in iCal exports

- Cannabis module: no pricing connection (separate domain)

- Client portal: no ingredient cost data visible to clients (correct per privacy)

- Partner reports: use `event_financial_summary` which includes food cost % (from ledger, not Pi)

**Cohesion gap: Meal prep programs** are completely disconnected from pricing. A chef doing weekly meal prep for 10 clients has no cost estimation, no shopping list costing, no Pi integration. This is a missing link.

---

### Domain 5: Recipe/Menu/Ingredient UI <-> Price Display

**Current state:**

- Recipe detail page (`recipe-detail-client.tsx`): full pricing display with cost status dots (green/amber/red), cost per portion, "Verified/Partial/Approximate" badge, `CostingWarningList` for missing/stale prices. Uses `last_price_cents`, `last_price_source`, `price_trend_direction`, `last_price_confidence`.

- Ingredient Library page (`ingredients-client.tsx`): shows ONLY `average_price_cents` (manual entry). Does NOT show `last_price_cents`, `last_price_source`, `price_trend_direction`, `price_trend_pct`, `price_volatility_score`, or any OpenClaw attribution. **Major gap.**

- Price catalog (`app/(chef)/culinary/price-catalog/`): full catalog browser with Pi data. Working.

- Menu detail page: shows `estimated_food_cost_cents` from `compute_projected_food_cost_cents`. Surfaces cost per course.

- Shopping list: shows `estimatedCostCents` per item but no source attribution or confidence indicator.

**Gap: Ingredient Library is a pricing dead end.** Enrichment columns exist on the DB table (migration `20260401000109`) but the UI only shows `average_price_cents`. A chef looking at their ingredient library sees manual prices, not the auto-resolved Pi prices. The data is there, just not surfaced.

---

### Consolidated Cross-Boundary Question Set (20 new questions)

#### Remy <-> Pricing (RP)

| #    | Question                                                                     | Testable Answer                                                                                                     |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| RP-1 | Can Remy answer "is butter on sale?"                                         | No. Remy has no sale calendar access. Must be added as context injection.                                           |
| RP-2 | Can Remy answer "what's my most expensive ingredient?"                       | Partially. Via `analytics.recipe_cost` task, Remy sees recipe-level costs but not per-ingredient breakdown from Pi. |
| RP-3 | If a chef asks Remy "why did my food cost go up?", what data does Remy have? | Only YTD expense breakdown and event-level margins. No ingredient-level price change data.                          |

#### Event Lifecycle <-> Pricing (EL)

| #    | Question                                                                                                   | Testable Answer                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EL-1 | Does the quote's estimated food cost use Pi prices or manual prices?                                       | Uses `recipe_cost_summary` view which uses `computed_cost_cents` from `ensureIngredientHasPrice()`. Pi prices flow through if the ingredient was enriched. |
| EL-2 | After an event completes, does actual vs estimated food cost comparison exist?                             | Yes. `event_financial_summary` has both `projected_food_cost_cents` (estimated) and `food_cost_percentage` (actual from ledger).                           |
| EL-3 | Do events with menus built from imported recipes (brain dump/photo/CSV) have accurate food cost estimates? | Now yes (after QW8 fix). Before: $0 for unpriced imported ingredients.                                                                                     |

#### Dashboard Surface (DS)

| #    | Question                                                | Testable Answer                                                                                                                                                   |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DS-1 | Does the `OpenClawLiveAlerts` component gate on admin?  | No. Code checks `isAdmin` but renders regardless. All users get price anomaly toasts.                                                                             |
| DS-2 | What happens when Pi is offline and dashboard loads?    | `getPriceIntelligenceSummary()` returns empty data. Widget shows nothing (graceful empty state). No error toast.                                                  |
| DS-3 | Is the price intelligence widget personalized per chef? | Partially. `getPriceIntelligenceSummary()` calls Pi with empty items array (line 408 of `price-intelligence-actions.ts`). Returns global data, not chef-specific. |

#### Billing / Classification (BC)

| #    | Question                                                                        | Testable Answer                                                                                                       |
| ---- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| BC-1 | Is basic price viewing actually gated behind any paywall?                       | No. `price-view-basic` is classified as free tier. Working correctly.                                                 |
| BC-2 | Are paid pricing features (`price-intel-advanced`, `price-sync-live`) enforced? | Check if `requirePro('price-intel-advanced')` exists on any page. If not, paid features are accessible to free users. |
| BC-3 | Do meal prep programs have cost estimation?                                     | No. Zero pricing integration. Complete dead zone.                                                                     |

#### Ingredient UI Surface (IU)

| #    | Question                                                 | Testable Answer                                                                                                 |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| IU-1 | Does the Ingredient Library page show Pi-sourced prices? | No. Only shows `average_price_cents` (manual). `last_price_cents` exists on the row but is not rendered.        |
| IU-2 | Does the shopping list show price confidence or source?  | No. Shows `estimatedCostCents` as a number. No indicator of whether it came from Pi, receipt, or USDA estimate. |
| IU-3 | Can a chef see which ingredients have no price data?     | Yes, on recipe detail page (red dots). Not on ingredient library page (shows blank, not "no data").             |

#### Import Path Integrity (IP)

| #    | Question                                                      | Testable Answer                                                                                                                    |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| IP-1 | Does brain dump import trigger auto-match + price enrichment? | Yes (after QW8 fix). Calls `autoEnrichNewIngredient()`.                                                                            |
| IP-2 | Does photo import trigger auto-match + price enrichment?      | Yes (after QW8 fix). Calls `autoEnrichNewIngredient()`.                                                                            |
| IP-3 | Does CSV import trigger auto-match + price enrichment?        | Yes (after QW8 fix). Calls `autoEnrichNewIngredient()`.                                                                            |
| IP-4 | Do old imported ingredients (pre-fix) remain unpriced?        | Yes. Only new ingredients get auto-enrichment. Existing unpriced ones need either manual match via Health Banner or next sync run. |

---

### New Improvement Items (from Pass 2)

| #     | Item                                                                                                  | Tier   | Benefit                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| NEW-1 | Inject price context into Remy's system prompt (top changes, sales, alerts)                           | Tier 1 | Remy becomes price-aware for all users. Zero new tools needed.                                                |
| NEW-2 | Surface enrichment columns on Ingredient Library page (`last_price_cents`, source, trend, confidence) | Tier 1 | Chefs see real prices on their ingredient list, not just manual entries.                                      |
| NEW-3 | Add price source attribution to shopping list items                                                   | Tier 1 | Chefs know whether cost estimate is reliable.                                                                 |
| NEW-4 | Meal prep program cost estimation from Pi                                                             | Tier 2 | Meal prep chefs get food cost projection. Currently zero.                                                     |
| NEW-5 | Personalize `getPriceIntelligenceSummary()` with chef's ingredient list                               | Tier 1 | Dashboard widget shows chef-relevant price changes, not global data.                                          |
| NEW-6 | Backfill unpriced ingredients from pre-fix imports                                                    | Tier 1 | One-time migration/script to run `autoEnrichNewIngredient()` on all ingredients with NULL `last_price_cents`. |

### Fixes Applied in Pass 2 (2026-04-18)

| #    | Fix                                                     | Files                                            |
| ---- | ------------------------------------------------------- | ------------------------------------------------ |
| QW8  | Brain dump import now calls `autoEnrichNewIngredient()` | `lib/ai/import-actions.ts`                       |
| QW9  | Photo import now calls `autoEnrichNewIngredient()`      | `lib/recipes/photo-import-actions.ts`            |
| QW10 | CSV import now calls `autoEnrichNewIngredient()`        | `lib/recipes/csv-import-actions.ts`              |
| NEW  | Created shared `lib/openclaw/auto-enrich.ts`            | Single source of truth for ingredient enrichment |

Total fixes this session: **10** (QW1-QW7 from pass 1, QW8-QW10 from pass 2).
Total spec items: **20** (14 original + 6 new from pass 2).
Total stress-test questions: **73** (40 original + 13 pass 1 + 20 pass 2).
