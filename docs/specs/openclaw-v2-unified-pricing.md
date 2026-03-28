# Spec: OpenClaw V2 - Unified Price Intelligence

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Built by:** claude-code-2026-03-28

---

## What This Does (Plain English)

Transforms OpenClaw from a disconnected price scraper into ChefFlow's single source of truth for ingredient pricing. Every ingredient a chef sees will have a price (or an honest "no price available"), with clear attribution (where the price came from, how fresh it is, how confident we are). Three currently-disconnected pricing systems (OpenClaw scraping, API quotes, manual receipt logging) merge into one unified resolution chain. The Pi gets a backup strategy. The sync gets smart about units, tenants, and history.

---

## Why It Matters

At 8% coverage with no source attribution, no unit normalization, and no fallback chain, the current system is a liability. Chefs see incomplete or misleading prices. Three parallel pricing systems waste effort and confuse the codebase. This spec makes pricing actually useful: accurate, attributed, and complete enough to cost a real menu.

---

## Architecture Decisions (READ BEFORE BUILDING)

These decisions resolve ambiguities. Do not deviate.

### Decision 1: resolvePrice() reads LOCAL data only, never calls the Pi

`resolvePrice()` queries ChefFlow's PostgreSQL tables (`ingredient_price_history`, `ingredients`, `grocery_price_quotes`). It NEVER makes HTTP calls to the Pi. The nightly sync is the only process that talks to the Pi. This means resolution data can be up to 24h stale for OpenClaw tiers, but every `resolvePrice()` call is instant (<50ms, no network).

### Decision 2: The sync writes to ingredient_price_history, one row per tenant per ingredient per day

When the sync finds a price for "chicken breast" and 12 tenants have that ingredient, it writes 12 rows to `ingredient_price_history` (one per tenant). This is correct because:

- The table requires `tenant_id` (data isolation)
- Each tenant's price history and averages are computed independently
- The dedup key is: `(ingredient_id, tenant_id, source, purchase_date)` - enforced by a partial unique index on `openclaw_*` sources. Uses `ON CONFLICT DO UPDATE` for upsert semantics

### Decision 3: DB access pattern is Drizzle ORM (not compat shim)

All new code in `lib/openclaw/sync.ts` and `lib/pricing/resolve-price.ts` uses **Drizzle ORM** (`import { db } from '@/lib/db'` + schema imports). Do NOT use the compat shim (`createServerClient()`). The existing sync already uses Drizzle; keep it consistent.

### Decision 4: resolve-price.ts is NOT a 'use server' file

`lib/pricing/resolve-price.ts` is internal server logic, not a directly-callable server action. It gets called BY server actions and server components. No `'use server'` directive. Export regular async functions.

### Decision 5: OpenClaw government data is already NE-regional

The government scraper pulls BLS Northeast series. Do NOT apply `getNeMultiplier()` from `lib/grocery/regional-multipliers.ts` to OpenClaw government data. That multiplier is only for national API prices (Spoonacular, Kroger). Applying it to already-regional data would inflate prices 8-12%.

### Decision 6: OpenClaw history rows are EXCLUDED from average_price_cents

`average_price_cents` on the ingredients table represents the chef's actual purchase average (receipts only). OpenClaw rows in `ingredient_price_history` have sources starting with `openclaw_` and are excluded from the average computation. This prevents flyer sale prices from distorting the chef's real cost basis.

### Decision 8: Use granular source values, not LIKE on notes

OpenClaw tiers are stored as **distinct source values**, not as a single `'openclaw'` with the tier buried in `notes`. This enables clean indexed queries in the resolution chain instead of slow `LIKE '%flyer_scrape%'` scans.

| source value          | Meaning                                | Confidence |
| --------------------- | -------------------------------------- | ---------- |
| `openclaw_flyer`      | Flipp weekly circular price            | 0.70       |
| `openclaw_scrape`     | Direct store website (Puppeteer)       | 0.85       |
| `openclaw_instacart`  | Instacart price with markup adjustment | 0.60       |
| `openclaw_government` | BLS/USDA NE regional average           | 0.40       |
| `openclaw_receipt`    | Receipt scanned via Tesseract on Pi    | 0.95       |

The resolution chain queries `WHERE source = 'openclaw_flyer'` (exact match, indexable) instead of `WHERE source = 'openclaw' AND notes LIKE '%flyer_scrape%'` (slow, fragile).

The existing `PriceSource` type in `lib/inventory/price-history-actions.ts` is: `'manual' | 'po_receipt' | 'vendor_invoice' | 'grocery_entry' | 'import'`. These new `openclaw_*` values are written as raw strings to the TEXT column. If the builder touches that type file, add them. If not, leave it alone (TEXT column accepts any string).

### Decision 7: Backup goes to a non-servable path

Pi backups go to `data/openclaw-backups/` (NOT `storage/`). The `storage/` directory serves files via `/api/storage/` with signed URLs. Database files must not be web-accessible. `data/` is gitignored and not served.

---

## The Plan (6 Phases, Strict Order)

### Phase 1: Pi Backup + Infrastructure (Day 1)

**Problem:** If the Pi's SD card dies, all price data is gone forever. No backup exists.

**What to build on the Pi:**

| File                                     | Purpose                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `.openclaw-build/services/backup-db.mjs` | Nightly SQLite backup: copies `prices.db` to timestamped file, keeps last 7, SCPs latest to ChefFlow server |

**Cron addition:**

```
0 1 * * * node services/backup-db.mjs >> logs/backup.log 2>&1
```

**Backup target on ChefFlow server:**

```
data/openclaw-backups/prices-YYYYMMDD.db
```

**Keep last 7 days on Pi. Keep last 7 days on ChefFlow server. Oldest auto-deleted.** This is a ~5MB file. Storage cost is zero.

**Also in Phase 1: move sync-api to systemd.**

```bash
ssh pi "sudo cp ~/openclaw-prices/systemd/openclaw-sync-api.service /etc/systemd/system/ && sudo systemctl enable --now openclaw-sync-api"
```

**Verification:**

1. SSH to Pi, run `node services/backup-db.mjs`
2. Verify backup file appears on Pi at `~/openclaw-prices/backups/`
3. Verify backup file arrives on ChefFlow server at `data/openclaw-backups/`
4. Verify sync-api survives: `ssh pi "sudo systemctl restart openclaw-sync-api && sleep 2 && curl -s http://localhost:8081/health"`

---

### Phase 2: Unit Normalization (Day 1-2)

**Problem:** 904 prices in "each", 108 in "lb", no standard. ChefFlow ingredients have their own `default_unit`. The sync ignores units, so prices are silently wrong.

**What to build on the Pi:**

| File                                         | Purpose                                                |
| -------------------------------------------- | ------------------------------------------------------ |
| `.openclaw-build/lib/unit-normalization.mjs` | Canonical unit rules per category + conversion factors |

**Unit standard per category:**

| Category                             | Standard Unit | Why                                   |
| ------------------------------------ | ------------- | ------------------------------------- |
| Beef, Pork, Lamb, Poultry (raw cuts) | lb            | Industry standard, how butchers price |
| Seafood (fillets, whole)             | lb            | Industry standard                     |
| Dairy (milk, cream)                  | gallon        | Standard retail                       |
| Dairy (butter)                       | lb            | 4 sticks = 1 lb                       |
| Dairy (cheese)                       | lb            | Deli standard                         |
| Dairy (eggs)                         | dozen         | Universal                             |
| Produce (by weight)                  | lb            | Tomatoes, potatoes, onions            |
| Produce (by unit)                    | each          | Avocado, artichoke, head of lettuce   |
| Herbs (fresh)                        | bunch         | How they're sold                      |
| Spices (dry)                         | oz            | Standard jar size                     |
| Pantry (oils, vinegar)               | fl oz         | Allows comparison across bottle sizes |
| Pantry (flour, sugar, rice)          | lb            | Bulk comparison                       |
| Grains/Pasta                         | lb            | Box comparison                        |
| Canned goods                         | oz            | Can comparison                        |

**Conversion table (embedded in the module):**

```javascript
const CONVERSIONS = {
  // Weight
  oz_to_lb: 1 / 16,
  lb_to_oz: 16,
  g_to_lb: 1 / 453.592,
  kg_to_lb: 2.20462,
  // Volume
  fl_oz_to_gallon: 1 / 128,
  cup_to_gallon: 1 / 16,
  pint_to_gallon: 1 / 8,
  quart_to_gallon: 1 / 4,
  liter_to_gallon: 0.264172,
  ml_to_fl_oz: 1 / 29.5735,
  // Count
  half_dozen_to_dozen: 0.5,
  each_to_dozen: 1 / 12,
}
```

**What the normalizer does:**

1. Takes raw price (cents, unit, quantity, package_size) from a scraper
2. Determines the ingredient's canonical category from `canonical_ingredients.category`
3. Applies the standard unit for that category
4. Converts the price to per-standard-unit cents using integer math (round at the end, never mid-conversion)
5. Returns `{ normalized_cents, normalized_unit, original_cents, original_unit, conversion_note }`
6. If conversion is impossible (unknown unit, missing data), returns original price with `conversion_note: 'no_conversion_available'`

**Database change on Pi:** Add columns to `current_prices`:

```sql
ALTER TABLE current_prices ADD COLUMN normalized_price_cents INTEGER;
ALTER TABLE current_prices ADD COLUMN normalized_unit TEXT;
```

**Backfill:** Run once after deployment. Re-normalize all existing prices.

**Also modify these files to pass raw package data through normalization:**

| File                                         | What to Change                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.openclaw-build/lib/normalize-rules.mjs`    | Add `extractPackageSize(rawName)` function that pulls size/quantity from product names (e.g., "12oz bag" -> { quantity: 12, unit: 'oz' }) |
| `.openclaw-build/services/scraper-flipp.mjs` | After normalization, call `normalize()` on the price before `upsertPrice()`                                                               |

**IMPORTANT: Deploy Phase 2 to Pi (SCP + restart sync-api) BEFORE starting Phase 3.** Phase 3's enriched endpoint reads `normalized_price_cents`. If Phase 2 isn't deployed first, the endpoint returns nulls.

**Verification:**

1. SSH to Pi, run normalization backfill script
2. Query: `SELECT COUNT(*) FROM current_prices WHERE normalized_price_cents IS NOT NULL` - should be >90% of total
3. Spot-check: `SELECT * FROM current_prices WHERE canonical_ingredient_id = 'chicken-breast-boneless-skinless'` - unit should be "lb"
4. Spot-check: `SELECT * FROM current_prices WHERE canonical_ingredient_id = 'eggs-large'` - unit should be "dozen"

---

### Phase 3: Fix the Sync (Day 2-3)

**Problem:** The sync writes only `last_price_cents` and `last_price_date`. No store, no confidence, no history, no unit. It also loads all tenants and deduplicates wrong.

**PREREQUISITE:** Phase 2 must be deployed to the Pi before this phase runs. The enriched endpoint depends on `normalized_price_cents` being populated.

**Step 3a: Apply the migration**

**File to create:**

| File                                                                 | Purpose                          |
| -------------------------------------------------------------------- | -------------------------------- |
| `database/migrations/20260401000109_ingredient_price_enrichment.sql` | New columns on ingredients table |

```sql
-- 20260401000109_ingredient_price_enrichment.sql
-- Adds source tracking and trend data to ingredients table
-- for the unified price resolution system.

-- Source tracking: where did the current price come from?
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_source TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_store TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_confidence NUMERIC(3,2);

-- Trend data: is the price going up or down?
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend_direction TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend_pct NUMERIC(5,2);

-- Index for price freshness queries
CREATE INDEX IF NOT EXISTS idx_ingredients_price_date
  ON ingredients(last_price_date)
  WHERE last_price_date IS NOT NULL;

-- Backfill: mark existing prices as legacy (no source attribution)
-- This lets the UI distinguish "we know where this price came from" vs "legacy import"
UPDATE ingredients
  SET last_price_source = 'openclaw_legacy'
  WHERE last_price_cents IS NOT NULL
    AND last_price_source IS NULL;
```

**Migration notes:**

- Builder MUST run `glob database/migrations/*.sql` first to verify `20260401000108` is the highest
- All columns nullable, purely additive
- Backfill UPDATE only touches rows where `last_price_cents` already exists
- Do NOT run `drizzle-kit push` without developer approval

**Step 3b: Build the enriched endpoint on Pi**

**Files to modify:**

| File                                    | What to Change                                                 |
| --------------------------------------- | -------------------------------------------------------------- |
| `.openclaw-build/services/sync-api.mjs` | Add `POST /api/prices/enriched` endpoint                       |
| `.openclaw-build/lib/smart-lookup.mjs`  | Add `smartLookupEnriched(db, query)` that returns full context |

**Enriched endpoint contract (exact JSON shapes):**

Request:

```json
POST /api/prices/enriched
Content-Type: application/json

{
  "items": ["chicken breast", "salmon", "butter", "za'atar"]
}
```

Response:

```json
{
  "results": {
    "chicken breast": {
      "canonical_id": "chicken-breast-boneless-skinless",
      "name": "Chicken Breast Boneless Skinless",
      "category": "poultry",
      "best_price": {
        "cents": 899,
        "normalized_cents": 899,
        "normalized_unit": "lb",
        "original_unit": "lb",
        "store": "Shaw's",
        "tier": "flyer_scrape",
        "confirmed_at": "2026-03-27T03:00:00Z"
      },
      "all_prices": [
        {
          "cents": 899,
          "normalized_cents": 899,
          "normalized_unit": "lb",
          "store": "Shaw's",
          "tier": "flyer_scrape",
          "confirmed_at": "2026-03-27T03:00:00Z"
        },
        {
          "cents": 999,
          "normalized_cents": 999,
          "normalized_unit": "lb",
          "store": "Stop & Shop",
          "tier": "flyer_scrape",
          "confirmed_at": "2026-03-27T03:00:00Z"
        }
      ],
      "trend": {
        "direction": "down",
        "change_7d_pct": -5.2,
        "change_30d_pct": -2.1
      },
      "price_count": 2
    },
    "za'atar": null
  },
  "lookup_ms": 45,
  "timestamp": "2026-03-28T23:00:00Z"
}
```

Rules:

- Items with no match return `null` (not an error)
- `best_price` uses `normalized_cents` (from Phase 2). If normalization wasn't possible, falls back to raw `cents`
- `all_prices` includes ALL stores, sorted by `normalized_cents` ascending
- `trend` comes from `price_trends` table (populated by aggregator.mjs). Null if no trend data.
- `tier` is one of: `government_baseline`, `flyer_scrape`, `instacart_adjusted`, `direct_scrape`, `exact_receipt`

**Step 3c: Rewrite the sync**

**File to modify:**

| File                   | What to Change                   |
| ---------------------- | -------------------------------- |
| `lib/openclaw/sync.ts` | Complete rewrite of `syncCore()` |

**New sync strategy (pseudocode):**

```typescript
async function syncCore(tier: string, dryRun: boolean): Promise<SyncResult> {
  // 1. Load ALL ingredients with their tenant_id (we need per-tenant writes)
  const allIngredients = await db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      tenantId: ingredients.tenantId,
      lastPriceCents: ingredients.lastPriceCents,
      priceUnit: ingredients.priceUnit,
    })
    .from(ingredients)

  // 2. Deduplicate names for the Pi lookup (one lookup per unique name)
  const uniqueNames = [
    ...new Set(allIngredients.filter((i) => i.name?.trim()).map((i) => i.name!.trim())),
  ]

  // 3. Send unique names to Pi's enriched endpoint (batches of 200)
  const enrichedResults: Record<string, EnrichedResult | null> = {}
  for (let i = 0; i < uniqueNames.length; i += 200) {
    const batch = uniqueNames.slice(i, i + 200)
    const response = await fetchEnriched(batch) // POST /api/prices/enriched
    Object.assign(enrichedResults, response.results)
  }

  // 4. Build name -> [ingredients] map (one name maps to MANY tenant-specific rows)
  const byName = new Map<string, typeof allIngredients>()
  for (const ing of allIngredients) {
    if (!ing.name?.trim()) continue
    const key = ing.name.trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(ing)
  }

  // 5. For each enriched result, update ALL tenant-specific ingredients
  const today = new Date().toISOString().split('T')[0]
  let matched = 0,
    updated = 0,
    skipped = 0,
    notFound = 0

  for (const [name, result] of Object.entries(enrichedResults)) {
    const tenantIngredients = byName.get(name)
    if (!tenantIngredients) continue

    if (!result || !result.best_price) {
      notFound += tenantIngredients.length
      continue
    }

    matched += tenantIngredients.length
    const price = result.best_price

    // Skip wholesale bulk prices
    if (price.original_unit === 'each' && price.cents > 5000) {
      skipped += tenantIngredients.length
      continue
    }

    for (const ing of tenantIngredients) {
      // Dedup: skip if already synced today with same price
      if (ing.lastPriceCents === price.normalized_cents) {
        skipped++
        continue
      }

      if (!dryRun) {
        // 5a. Upsert to ingredient_price_history
        //     Granular source: 'openclaw_flyer', 'openclaw_scrape', etc. (see Decision 8)
        //     Dedup via partial unique index idx_iph_openclaw_dedup
        const granularSource = tierToSource(price.tier)

        await db.execute(sql`
          INSERT INTO ingredient_price_history
            (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
             quantity, unit, purchase_date, store_name, source, notes)
          VALUES (
            gen_random_uuid(), ${ing.id}, ${ing.tenantId},
            ${price.normalized_cents}, ${price.normalized_cents},
            1, ${price.normalized_unit}, ${today},
            ${price.store}, ${granularSource},
            ${`Synced from OpenClaw - ${price.store}`}
          )
          ON CONFLICT (ingredient_id, tenant_id, source, purchase_date)
            WHERE source LIKE 'openclaw_%'
          DO UPDATE SET
            price_cents = EXCLUDED.price_cents,
            price_per_unit_cents = EXCLUDED.price_per_unit_cents,
            unit = EXCLUDED.unit,
            store_name = EXCLUDED.store_name,
            notes = EXCLUDED.notes
        `)

        // 5b. Update the ingredient row
        await db
          .update(ingredients)
          .set({
            lastPriceCents: price.normalized_cents,
            lastPriceDate: today,
            priceUnit: price.normalized_unit,
            lastPriceSource: price.tier,
            lastPriceStore: price.store,
            lastPriceConfidence: tierToConfidence(price.tier),
            priceTrendDirection: result.trend?.direction ?? null,
            priceTrendPct: result.trend?.change_7d_pct ?? null,
          })
          .where(eq(ingredients.id, ing.id))

        updated++
      }
    }
  }

  // 6. Bulk cache invalidation (once, not per ingredient)
  if (updated > 0 && !dryRun) {
    revalidatePath('/recipes')
    revalidatePath('/events')
    revalidatePath('/ingredients')
    revalidateTag('recipe-costs')
    revalidateTag('ingredient-prices')
  }

  return { success: true, matched, updated, skipped, notFound }
}

// Map OpenClaw tier -> granular source value for ingredient_price_history
function tierToSource(tier: string): string {
  switch (tier) {
    case 'flyer_scrape':
      return 'openclaw_flyer'
    case 'direct_scrape':
      return 'openclaw_scrape'
    case 'instacart_adjusted':
      return 'openclaw_instacart'
    case 'government_baseline':
      return 'openclaw_government'
    case 'exact_receipt':
      return 'openclaw_receipt'
    default:
      return 'openclaw_flyer' // safe fallback
  }
}

// Map OpenClaw tier -> confidence score (0.0 - 1.0)
function tierToConfidence(tier: string): number {
  switch (tier) {
    case 'exact_receipt':
      return 0.95
    case 'direct_scrape':
      return 0.85
    case 'flyer_scrape':
      return 0.7
    case 'instacart_adjusted':
      return 0.6
    case 'government_baseline':
      return 0.4
    default:
      return 0.5
  }
}
```

**CRITICAL: Do NOT recompute `average_price_cents` from OpenClaw history rows.** That field reflects the chef's actual purchase average. OpenClaw rows have `source = 'openclaw'` and are excluded. The existing `updateIngredientPriceFields()` in `lib/ingredients/pricing.ts` already handles this (it's only called from `logIngredientPrice()` which is manual receipt logging).

**Dedup strategy for re-sync:** The partial unique index `idx_iph_openclaw_dedup` on `(ingredient_id, tenant_id, source, purchase_date) WHERE source LIKE 'openclaw_%'` enforces uniqueness at the database level. The upsert query uses `ON CONFLICT ... DO UPDATE` to atomically handle both cases:

- Row doesn't exist: INSERT (new price for today)
- Row exists with same key: UPDATE price_cents, store_name, unit (price changed or same store different price)

No check-then-insert race condition. No duplicates. Works correctly under concurrent syncs.

**Verification:**

1. Apply migration: `drizzle-kit push` (with developer approval)
2. Run `npx tsc --noEmit --skipLibCheck` - must pass with new columns
3. Trigger manual sync from admin price catalog with `dryRun: true`
4. Verify dry-run output shows correct matched/notFound counts
5. Run real sync, then query: `SELECT source, COUNT(*) FROM ingredient_price_history GROUP BY source` - verify 'openclaw' rows exist
6. Verify `ingredients.last_price_source` is populated for updated rows
7. Run sync again immediately - verify `updated` count is 0 (dedup working)

---

### Phase 3.5: Catalog Feedback Loop (Day 3)

**Problem:** The spec only prices ingredients already in OpenClaw's canonical catalog (9,270 items). But chefs use specialty ingredients that don't exist in USDA or Flipp: nduja, za'atar, tajin, demi-glace, verjus, sumac, gochujang, miso paste varieties, etc. When the sync finds ChefFlow ingredients with zero OpenClaw match (`notFound` items), that data is currently discarded. There's no mechanism to grow the catalog based on what chefs actually use.

**Solution:** After the sync completes, POST the `notFound` ingredient names back to the Pi. The Pi adds them to `canonical_ingredients` as unpriced entries. Then:

- Instacart bulk scraper will search for them on its next run (it searches all unpriced items)
- Flipp scraper may eventually find matches via keyword overlap
- Cloud normalization (Phase 5) can map them if they appear under different names

**Changes to the sync (add to end of `syncCore()`):**

```typescript
// 6. Feed unmatched names back to Pi for catalog growth
if (notFoundNames.length > 0 && !dryRun) {
  try {
    await fetch(`${OPENCLAW_API}/api/catalog/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: notFoundNames.slice(0, 500) }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // Non-blocking. If Pi is down, we just skip catalog suggestions.
  }
}
```

**New Pi endpoint: `POST /api/catalog/suggest`**

| File                                    | What to Change                           |
| --------------------------------------- | ---------------------------------------- |
| `.openclaw-build/services/sync-api.mjs` | Add `POST /api/catalog/suggest` endpoint |

Request:

```json
{ "items": ["nduja", "za'atar", "demi-glace", "verjus"] }
```

Behavior:

1. For each item, slugify the name (e.g., "demi-glace" -> "demi-glace")
2. Check if slug already exists in `canonical_ingredients`
3. If not, insert with `category = 'uncategorized'`, no price
4. Return `{ added: 3, skipped: 1, total_catalog: 9273 }`

**Why this matters for completeness:** Over time, the catalog grows to include everything chefs actually cook with, not just USDA reference foods. The Instacart bulk scraper then picks up pricing for these new entries automatically. This is the feedback loop that makes the catalog self-improving.

**Verification:**

1. Run sync with some ingredients that don't exist in OpenClaw (e.g., a chef adds "nduja" to a recipe)
2. Check Pi: `ssh pi "sqlite3 data/prices.db \"SELECT * FROM canonical_ingredients WHERE name LIKE '%nduja%'\""` - should exist
3. After next Instacart bulk run, check if nduja has a price

---

### Phase 4: Unified Price Resolution Chain (Day 3-4)

**Problem:** Three pricing systems exist independently. OpenClaw scraping, API quotes (Spoonacular/Kroger/MealMe), and manual receipt logging never consult each other.

**File to create:**

| File                           | Purpose                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `lib/pricing/resolve-price.ts` | Single function that resolves the best price for any ingredient |

**This file has NO `'use server'` directive.** It's internal logic called by server actions and server components.

**Resolution chain (ordered by trust). ALL queries hit ChefFlow PostgreSQL, NEVER the Pi:**

```
1. RECEIPT     - Chef's own purchase, highest trust, confidence 1.0
   WHERE source IN ('manual', 'grocery_entry', 'po_receipt', 'vendor_invoice')
     AND tenant_id = $tenantId AND ingredient_id = $ingredientId
     AND purchase_date > NOW() - INTERVAL '90 days'
   ORDER BY purchase_date DESC LIMIT 1

2. DIRECT SCRAPE - Real store website price, confidence 0.85
   WHERE source = 'openclaw_scrape'
     AND tenant_id = $tenantId AND ingredient_id = $ingredientId
     AND purchase_date > NOW() - INTERVAL '14 days'
   ORDER BY purchase_date DESC LIMIT 1

3. FLYER       - Weekly circular (14 day window for biweekly flyers), confidence 0.70
   WHERE source = 'openclaw_flyer'
     AND tenant_id = $tenantId AND ingredient_id = $ingredientId
     AND purchase_date > NOW() - INTERVAL '14 days'
   ORDER BY purchase_date DESC LIMIT 1

4. INSTACART   - Markup-adjusted proxy, confidence 0.60
   WHERE source = 'openclaw_instacart'
     AND tenant_id = $tenantId AND ingredient_id = $ingredientId
     AND purchase_date > NOW() - INTERVAL '30 days'
   ORDER BY purchase_date DESC LIMIT 1

5. GOVERNMENT  - BLS/USDA NE regional averages, confidence 0.40
   WHERE source = 'openclaw_government'
     AND tenant_id = $tenantId AND ingredient_id = $ingredientId
   (no age limit - government data is baseline, always valid)
   ORDER BY purchase_date DESC LIMIT 1
   NOTE: Do NOT apply regional multiplier. Already NE-regional.

6. HISTORICAL  - Chef's own average from past purchases, confidence 0.30
   WHERE source IN ('manual', 'grocery_entry', 'po_receipt', 'vendor_invoice')
     AND tenant_id = $tenantId AND ingredient_id = $ingredientId
   (any age - better than nothing)
   COMPUTE: AVG(price_per_unit_cents)

7. NONE - Return: { cents: null, source: 'none', confidence: 0,
             reason: 'No price data. Log a receipt to set the price.' }
```

**Why exact source match matters:** Every query above uses `source = 'openclaw_flyer'` (exact string match, uses `idx_iph_source_lookup` index). The old approach of `source = 'openclaw' AND notes LIKE '%flyer%'` required a sequential scan of every OpenClaw row. With granular sources, the batch resolver can do one query:

```sql
SELECT * FROM ingredient_price_history
WHERE ingredient_id = ANY($1)
  AND tenant_id = $2
  AND source IN ('openclaw_flyer','openclaw_scrape','openclaw_instacart','openclaw_government')
ORDER BY ingredient_id, source, purchase_date DESC
```

Then resolve tier priority in memory. Two queries total (one for OpenClaw, one for receipts) for any number of ingredients.

**NOT in the resolution chain (intentionally excluded):**

- API quotes (Spoonacular/Kroger/MealMe) are NOT queried in real-time by `resolvePrice()`. They're too slow (500ms+ per API call) and rate-limited. They remain available for event-level batch quotes via `runGroceryPriceQuote()` in `pricing-actions.ts`, which is a separate use case (quoting a full event grocery list). The resolution chain only uses data already in the local database.

**Function signature:**

```typescript
// lib/pricing/resolve-price.ts
// Internal module - no 'use server' directive

import { db } from '@/lib/db'
import { ingredientPriceHistory, ingredients } from '@/lib/db/schema/schema'
import { eq, and, gt, desc, sql, inArray } from 'drizzle-orm'

export type PriceSource =
  | 'receipt'
  | 'direct_scrape'
  | 'flyer'
  | 'instacart'
  | 'government'
  | 'historical'
  | 'none'

export type PriceFreshness = 'current' | 'recent' | 'stale' | 'none'

export interface ResolvedPrice {
  cents: number | null
  unit: string
  source: PriceSource
  sourceTier: string | null // raw tier from OpenClaw (e.g., 'flyer_scrape')
  store: string | null
  confidence: number // 0.0 - 1.0
  freshness: PriceFreshness
  confirmedAt: string | null // ISO date string
  reason: string | null // only set when cents is null
}

export async function resolvePrice(
  ingredientId: string,
  tenantId: string,
  options?: { preferredStore?: string }
): Promise<ResolvedPrice>

// Batch version for menu/recipe costing (avoids N+1 queries)
export async function resolvePricesBatch(
  ingredientIds: string[],
  tenantId: string
): Promise<Map<string, ResolvedPrice>>
```

**Freshness rules:**

- `current`: confirmed within 3 days
- `recent`: confirmed within 14 days
- `stale`: confirmed within 90 days
- `none`: no data or older than 90 days

**Caching strategy:** `resolvePrice()` has NO built-in cache. Callers that need caching (e.g., recipe cost page) should use `unstable_cache` with tag `ingredient-prices` (busted by the nightly sync via `revalidateTag('ingredient-prices')`).

**Performance:** The batch version (`resolvePricesBatch`) does 2 queries total:

1. One query to get all OpenClaw history rows for the given ingredients
2. One query to get all receipt history rows for the given ingredients
   Then resolves in memory. This handles a 30-ingredient recipe in <100ms.

**Files to modify:**

| File                                          | What to Change                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `components/culinary/menu-cost-sidebar.tsx`   | Pass `ResolvedPrice` data to display. Show price source badge + confidence dot. See UI Changes section. |
| `components/culinary/price-alerts-widget.tsx` | Use `resolvePricesBatch()` instead of raw `last_price_cents`. Show freshness.                           |
| `components/culinary/true-cost-breakdown.tsx` | Per-ingredient source attribution row                                                                   |
| `docs/app-complete-audit.md`                  | Update price display sections for all modified components                                               |

**NOT modified (intentionally):**

- `lib/ingredients/pricing.ts` - Nobody imports from this file. Leave it alone.
- `lib/grocery/pricing-actions.ts` - Remains the event-level batch quote system. Not touched.

**Verification:**

1. Write a test script that calls `resolvePrice()` for:
   - An ingredient with manual receipt history -> should return source='receipt'
   - An ingredient with only OpenClaw flyer data -> should return source='flyer'
   - An ingredient with only government data -> should return source='government', confidence ~0.4
   - An ingredient with zero data -> should return cents=null, reason string present
2. Write a test script that calls `resolvePricesBatch()` with 30 ingredient IDs and verify <100ms
3. Sign in with agent account, navigate to a recipe with ingredients, verify prices show source attribution

---

### Phase 5: Cloud Normalization for the Long Tail (Day 4-5)

**BLOCKED: Requires developer policy approval before building. Do NOT start this phase without explicit "yes" from developer.**

**Problem:** 30% of scraped items fail rule-based normalization. The Pi's local model (qwen3:8b) is slow and mediocre at it. Flipp product names are public retail data, not client PII.

**Policy decision required:** Flipp product names like "Springvale 100% Grass Fed Ribeye Steak" are public retail data. They contain zero client information. Using a cloud model (Claude Haiku) for normalization does not violate the private-data-stays-local rule. But the developer must explicitly approve this.

**If approved, build:**

| File                                      | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `.openclaw-build/lib/normalize-cloud.mjs` | Batch normalization via Claude Haiku API |

**Implementation notes for Pi environment:**

- The Pi runs plain Node.js (.mjs files), NOT Next.js
- Use `@anthropic-ai/sdk` npm package (install on Pi: `npm install @anthropic-ai/sdk`)
- Or use raw `fetch` to `https://api.anthropic.com/v1/messages` with `x-api-key` header
- Do NOT try to use ChefFlow's AI dispatch layer (`lib/ai/dispatch/`) - it's a Next.js module

**How it works:**

1. After rule-based normalization runs, collect all unmatched items
2. Check `normalization_map` table - if the raw name already has a cached mapping, use it
3. Batch remaining items (up to 50 per call) into a single Haiku request
4. Prompt structure:

   ```
   Map each product name to the most appropriate canonical ingredient ID from the list below.
   Return JSON: { "mappings": [ { "raw": "original name", "id": "canonical-id", "confidence": 0.9 } ] }
   If no good match exists, return "id": null for that item.

   Canonical IDs (subset relevant to these items):
   [filtered list of ~200 IDs from the same categories as the input items]

   Product names to map:
   1. "Springvale 100% Grass Fed Ribeye Steak"
   2. "Organic Valley Half & Half Ultra Pasteurized"
   ...
   ```

5. Cache ALL results (including nulls) in `normalization_map` table with `method = 'cloud_model'`
6. Cost: ~$0.001 per batch of 50 items. At 300 items/day = $0.006/day = $0.18/month

**Fallback order:** Rule-based (free, instant) -> Cached mapping (free, instant) -> Cloud model (cheap, accurate) -> Local model (free, slow) -> Auto-slug (guaranteed, needs cross-matcher)

**Environment variable on Pi (add to `~/openclaw-prices/config/.env`):**

```
ANTHROPIC_API_KEY=sk-ant-...   # Only for product name normalization
```

**Verification:**

1. Run Flipp scraper on Pi
2. Check logs for cloud normalization calls: `grep 'cloud_model' logs/scraper-flipp.log`
3. Query: `SELECT COUNT(*) FROM normalization_map WHERE method = 'cloud_model'`
4. Run scraper again - verify no duplicate API calls (cache hit)
5. Spot-check 10 cloud-mapped items for accuracy

---

### Phase 6: Coverage Acceleration (Day 5-6)

**Problem:** 8% coverage grows slowly because only Flipp is actively scraping. Five Puppeteer scrapers are built but not scheduled.

**Tasks (Pi operations, not code changes):**

1. **Verify Chromium on Pi:**

   ```bash
   ssh pi "which chromium-browser || which chromium || apt list --installed 2>/dev/null | grep chromium"
   ```

   If missing: `ssh pi "sudo apt install -y chromium-browser"`

2. **Schedule Puppeteer scrapers (staggered to avoid memory pressure):**

   ```
   0 5 * * *    node services/scraper-instacart-bulk.mjs >> logs/scraper-instacart.log 2>&1
   0 6 * * 2,5  node services/scraper-hannaford.mjs >> logs/scraper-hannaford.log 2>&1
   0 7 * * 3,6  node services/scraper-stopsandshop.mjs >> logs/scraper-stopsandshop.log 2>&1
   ```

3. **Memory guard:** Pi has limited RAM. Only one Puppeteer scraper at a time. Add to watchdog.mjs: if any scraper process has been running > 30 minutes, kill it and log a warning.

4. **Coverage target:** With Flipp (daily) + Instacart bulk (daily) + Hannaford (2x/week) + Stop & Shop (2x/week), projected coverage in 30 days: 25-35%.

**Verification:**

1. Check Pi cron: `ssh pi "crontab -l"`
2. Wait for first scheduled run, check logs: `ssh pi "tail -20 logs/scraper-instacart.log"`
3. Run `ssh pi "node scripts/check-stats.mjs"` after 48 hours - verify price count increasing
4. Verify watchdog kills hung scrapers: check `logs/watchdog.log` for kill events

---

## Database Changes

### ChefFlow PostgreSQL Migration

```sql
-- 20260401000109_ingredient_price_enrichment.sql
-- Adds source tracking and trend data to ingredients table
-- for the unified price resolution system.

-- Source tracking: where did the current price come from?
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_source TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_store TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_price_confidence NUMERIC(3,2);

-- Trend data: is the price going up or down?
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend_direction TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend_pct NUMERIC(5,2);

-- Index for price freshness queries
CREATE INDEX IF NOT EXISTS idx_ingredients_price_date
  ON ingredients(last_price_date)
  WHERE last_price_date IS NOT NULL;

-- Index for resolution chain queries (exact source match, indexed)
CREATE INDEX IF NOT EXISTS idx_iph_source_lookup
  ON ingredient_price_history(ingredient_id, tenant_id, source, purchase_date DESC)
  WHERE source IS NOT NULL;

-- Unique constraint for OpenClaw sync dedup (prevents duplicate rows on concurrent syncs)
-- Uses ON CONFLICT DO UPDATE in the sync upsert query
CREATE UNIQUE INDEX IF NOT EXISTS idx_iph_openclaw_dedup
  ON ingredient_price_history(ingredient_id, tenant_id, source, purchase_date)
  WHERE source LIKE 'openclaw_%';

-- Backfill: mark existing prices as legacy (no source attribution)
UPDATE ingredients
  SET last_price_source = 'openclaw_legacy'
  WHERE last_price_cents IS NOT NULL
    AND last_price_source IS NULL;
```

### Pi SQLite Changes

```sql
-- Run directly on Pi's prices.db (via sqlite3 CLI or in a migration script)
ALTER TABLE current_prices ADD COLUMN normalized_price_cents INTEGER;
ALTER TABLE current_prices ADD COLUMN normalized_unit TEXT;
```

---

## Files to Create

| File                                                                 | Purpose                                                        | Phase |
| -------------------------------------------------------------------- | -------------------------------------------------------------- | ----- |
| `.openclaw-build/services/backup-db.mjs`                             | Nightly Pi database backup to local + SCP to ChefFlow          | 1     |
| `.openclaw-build/lib/unit-normalization.mjs`                         | Category-aware unit standardization + conversion math          | 2     |
| `database/migrations/20260401000109_ingredient_price_enrichment.sql` | New columns + indexes + unique constraint for dedup            | 3     |
| `lib/pricing/resolve-price.ts`                                       | Unified price resolution chain (NO `'use server'`)             | 4     |
| `components/pricing/price-badge.tsx`                                 | Shared price display component (source, freshness, confidence) | 4     |
| `.openclaw-build/lib/normalize-cloud.mjs`                            | Cloud model normalization (Phase 5, BLOCKED on approval)       | 5     |

---

## Files to Modify

| File                                          | What to Change                                                          | Phase  |
| --------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| `.openclaw-build/lib/normalize-rules.mjs`     | Add `extractPackageSize()` for unit extraction from product names       | 2      |
| `.openclaw-build/services/scraper-flipp.mjs`  | Pass raw quantity/size through unit normalizer before upsert            | 2      |
| `.openclaw-build/services/sync-api.mjs`       | Add `POST /api/prices/enriched` + `POST /api/catalog/suggest` endpoints | 3, 3.5 |
| `.openclaw-build/lib/smart-lookup.mjs`        | Add `smartLookupEnriched()` returning all prices + trend + confidence   | 3      |
| `lib/openclaw/sync.ts`                        | Complete rewrite of `syncCore()` per pseudocode above                   | 3      |
| `components/culinary/menu-cost-sidebar.tsx`   | Show price source badge + confidence dot                                | 4      |
| `components/culinary/price-alerts-widget.tsx` | Use resolved prices, show freshness indicator                           | 4      |
| `components/culinary/true-cost-breakdown.tsx` | Per-ingredient source attribution                                       | 4      |
| `docs/app-complete-audit.md`                  | Update price display sections for modified components                   | 4      |

---

## UI Changes

### Price Display (everywhere prices appear)

**Current:** `$8.99`

**After:**

```
$8.99/lb  ·  Shaw's  ·  2d ago  ●●●○
```

Components:

- **Price + unit:** Always show the unit. "$8.99" alone is meaningless.
- **Store name:** Where this price was observed. "Shaw's", "Your receipt", "USDA avg"
- **Freshness:** Relative date. Color: green (current, <3d), default (recent, <14d), amber (stale, <90d), red (very stale, >90d)
- **Confidence dots:** 4 dots filled based on source:
  - Receipt = 4/4 (●●●●)
  - Direct scrape = 3/4 (●●●○)
  - Flyer = 3/4 (●●●○)
  - Instacart adjusted = 2/4 (●●○○)
  - Government avg = 2/4 (●●○○)
  - Historical avg = 1/4 (●○○○)

**Implementation:** Create a shared component `components/pricing/price-badge.tsx` that accepts a `ResolvedPrice` and renders the badge. Use this in all three modified components.

### No-Price State

**Current:** Empty or $0.00 (violates Zero Hallucination rule)

**After:**

```
No price data  ·  Log a receipt to set price
```

Never show $0.00. Never show blank where a price should be. Use `text-muted-foreground` for the "no data" state.

### Legacy Price State

For ingredients that have `last_price_source = 'openclaw_legacy'` (from before this spec):

```
$8.99  ·  (source unknown)
```

No confidence dots. No freshness. Just an honest "we have a number but don't know where it came from."

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pi unreachable during nightly sync                         | `syncCore()` returns `{ success: false, error: 'Pi unreachable' }`. No ingredients updated. Existing prices remain. Next sync will catch up.                      |
| Ingredient has receipt price AND scrape price              | `resolvePrice()` returns receipt (higher trust). UI shows receipt price. Scrape price available via `resolvePricesBatch` if UI wants to show "market comparison." |
| Unit mismatch between OpenClaw and ChefFlow                | Sync writes normalized unit from OpenClaw. ChefFlow's `price_unit` column gets overwritten with the normalized unit.                                              |
| Flyer price older than 14 days                             | `resolvePrice()` skips it (stale for flyer tier). Falls through to next tier. The nightly sync still keeps the row in history for trend analysis.                 |
| Same ingredient, different stores, wildly different prices | Sync writes the BEST price (lowest normalized_cents). `all_prices` in the enriched response has all stores for admin visibility.                                  |
| Cloud normalization API fails                              | Fall back to local model, then auto-slug. Log error. Never block scraping. Never crash.                                                                           |
| Bulk/wholesale price mixed with retail                     | Sync filters: skip if `original_unit === 'each' && cents > 5000`. This catches case pricing.                                                                      |
| Sync runs but Pi has no new data                           | `updated` count is 0, `skipped` count matches previous sync. No harm done.                                                                                        |
| Two syncs run concurrently                                 | The dedup check (`SELECT 1 ... WHERE purchase_date = today AND source = 'openclaw'`) prevents double-writes. Second sync sees existing rows and skips.            |
| Migration applied but Pi not updated yet                   | Enriched endpoint doesn't exist yet. Sync falls back to old behavior (the fetch to `/api/prices/enriched` returns 404, sync logs warning and exits gracefully).   |

---

## Out of Scope

- **Location-aware pricing** (different prices for Boston vs Springfield chefs) - separate spec
- **Seasonal price models** (predicting future prices) - separate spec
- **Vendor/supplier integration** (Restaurant Depot login, Sysco catalogs) - separate spec
- **Price alerts/notifications** (push alerts when prices spike) - existing feature, just needs better data from this spec
- **Recipe auto-costing recalculation** - already works via cache invalidation, just needs better input prices
- **USDA nutritional data integration** - not pricing, separate concern
- **E-Phone Book / business directory** - completely separate system
- **Modifying `lib/grocery/pricing-actions.ts` internals** - event-level batch quotes remain as-is
- **Real-time API quote resolution** (Spoonacular/Kroger/MealMe per ingredient) - too slow, too expensive, stays batch-only

---

## Notes for Builder Agent

### Mandatory Pre-Read

- `CLAUDE.md` - all rules, especially migration safety, server action quality, zero hallucination
- `lib/openclaw/sync.ts` - current sync implementation you're rewriting
- `.openclaw-build/services/sync-api.mjs` - current Pi API you're extending
- `.openclaw-build/lib/smart-lookup.mjs` - current lookup you're enhancing

### Phase Dependencies (STRICT)

```
Phase 1 (Pi backup)          -> can start immediately
Phase 2 (unit normalization) -> can start immediately (parallel with Phase 1)
Phase 2 MUST be deployed to Pi (SCP + restart sync-api) BEFORE Phase 3 starts
Phase 3 (fix sync)           -> requires Phase 2 on Pi + migration applied
Phase 3.5 (catalog feedback) -> requires Phase 3 (uses notFound data from sync)
Phase 4 (resolve-price)      -> requires Phase 3 (needs enriched history data in PostgreSQL)
Phase 5 (cloud normalize)    -> BLOCKED on developer approval. Independent of Phase 4.
Phase 6 (coverage)           -> independent, can run any time after Phase 2
```

### Gotchas

- **Build phases 1 & 2 can run in parallel.** But Phase 2 MUST be SCP'd to Pi before Phase 3.
- **Never run Puppeteer scrapers in parallel on the Pi.** 1GB RAM limit. One at a time.
- **The `ingredient_price_history` table already has `source`, `store_name`, `vendor_id`, `notes` columns.** Use them. Don't create new tables.
- **The `PriceSource` type in `lib/inventory/price-history-actions.ts` includes `'import'` but NOT `'openclaw'`.** The sync writes `source = 'openclaw'` as a raw string (the column is TEXT, not an enum). Update the TypeScript type if you touch that file.
- **All prices in cents.** Integer arithmetic only. Never floating point for money.
- **Test the sync with `dryRun: true` first** before writing to production ingredients.
- **`lib/pricing/` already exists** with 10 files. Don't create the directory; just add `resolve-price.ts`.
- **Nobody imports from `lib/ingredients/pricing.ts`.** The actual consumers use `lib/inventory/price-history-actions.ts`. Don't modify `pricing.ts` unless you need to.
- **The `data/` directory at repo root is gitignored.** Create `data/openclaw-backups/` for Pi backups.
- **After modifying UI components, update `docs/app-complete-audit.md`** per CLAUDE.md rules.
