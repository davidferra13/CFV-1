# Spec: Geographic Pricing Proof Harness

> **Status:** built
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date                 | Agent/Session                       | Commit  |
| --------------------- | -------------------- | ----------------------------------- | ------- |
| Created               | 2026-04-30 12:25 EDT | Codex planner session               | pending |
| Status: ready         | 2026-04-30 12:25 EDT | Codex planner session               | pending |
| Claimed (in-progress) | 2026-04-30 12:38 EDT | Codex builder session               | pending |
| Spike completed       | 2026-04-30 12:43 EDT | Codex builder session               | pending |
| Pre-flight passed     | 2026-04-30 12:44 EDT | Codex builder session               | pending |
| Build completed       | 2026-04-30 13:05 EDT | Codex builder session               | pending |
| Type check passed     | 2026-04-30 13:08 EDT | Codex builder session               | pending |
| Build check passed    | Not run              | Requires explicit build approval    |         |
| Playwright verified   | Not run              | No server start or restart approved |         |
| Status: built         | 2026-04-30 13:08 EDT | Codex builder session               | pending |

---

## Developer Notes

### Raw Signal

The developer asked for a pricing reliability audit across every US state, Washington DC, Puerto Rico, Guam, American Samoa, Northern Mariana Islands, and US Virgin Islands. The audit conclusion was uncomfortable: ChefFlow has a large price corpus, but it cannot prove local observed menu-costing reliability nationwide. The developer then said: "tell me exactly what we need to do, because this is a massive, disgusting failure" and then asked: "tell me exactly what we need to do and build a spec."

### Developer Intent

- **Core goal:** Convert ChefFlow pricing from large undifferentiated corpus claims into geography-specific, ingredient-specific proof that a chef can safely cost a real menu.
- **Key constraints:** Do not hide missing local coverage behind national averages. Do not treat modeled fallback as observed truth. Do not present zero-dollar prices as valid. Do not call any geography quote-safe unless source quality, freshness, unit conversion, and fallback confidence justify it.
- **Motivation:** Nationwide release depends on pricing trust. ChefFlow's differentiator fails if a chef in any supported market cannot tell whether a menu cost is local observed, regional observed, national fallback, public baseline, modeled, or unresolved.
- **Success from the developer's perspective:** A builder can run one deterministic proof harness and see one explicit row per geography and basket ingredient, with quote safety, source class, failure reason, freshness, and unit confidence. The system blocks unsafe quote claims automatically.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                                                                                                                                                                                                       |
| Canonical owner                     | Existing pricing reliability and price intelligence spine: `lib/pricing/*`, `openclaw.price_intelligence_contract_v1`, and quote-safety gates                                                                                                                                                                                                                                                |
| Existing related routes             | `app/(admin)/admin/openclaw/health/page.tsx`, pricing readiness surfaces, quote surfaces                                                                                                                                                                                                                                                                                                     |
| Existing related modules/components | `lib/pricing/no-blank-price-contract.ts`, `lib/pricing/pricing-coverage-gate.ts`, `lib/pricing/pricing-enforcement-gate.ts`, `lib/pricing/resolve-price.ts`, `scripts/openclaw-pull/pull.mjs`, `scripts/sync-system-ingredient-prices.mjs`                                                                                                                                                   |
| Recent overlapping commits          | `6aceea329 chore(agent): route release readiness to pricing reliability feature/professional-pwa-install`; `01e4ae59a chore(agent): add pricing enforcement gate v1 feature/pricing-enforcement-gate-v1`; `d26142863 chore(agent): add pricing coverage gate v1 feature/pricing-coverage-gate-v1`; `5e58cfd65 chore(agent): add no blank pricing contract feature/no-blank-pricing-contract` |
| Dirty or claimed overlapping files  | `.claude/skills/pricing-reliability/SKILL.md` is dirty and must not be touched by this build                                                                                                                                                                                                                                                                                                 |
| Duplicate or orphan risk            | Medium. Older specs discuss nationwide pricing, total capture, and price intelligence. This spec does not create a second price engine. It attaches to the existing price contract and enforcement gates.                                                                                                                                                                                    |
| Why this is not a duplicate         | Existing specs and code define broad price capture or no-blank contracts. This spec adds the missing geography x basket proof artifact and quote-safety enforcement bridge.                                                                                                                                                                                                                  |
| What must not be rebuilt            | Do not replace `resolvePrice`, `resolvePricesBatch`, no-blank contracts, or price intelligence contract views. Extend them.                                                                                                                                                                                                                                                                  |

Continuity report: `system/agent-reports/context-continuity/20260430T162511Z-geographic-pricing-proof-harness-nationwide-state-territory-basket-quote-safety-.json`.

---

## Current State Summary

ChefFlow already has the right vocabulary but not the proof layer. `lib/pricing/no-blank-price-contract.ts:3-10` defines source classes and quote-safety states. `lib/pricing/no-blank-price-contract.ts:180-207` decides quote safety from source class, confidence, freshness, store proof, product proof, and data points. `lib/pricing/pricing-enforcement-gate.ts:145-155` blocks final quote presentation when the summary is planning-only.

The single-ingredient resolver has a market aggregate tier that reads `openclaw.system_ingredient_prices` and distinguishes `market_state` from `market_national` when the requested state is covered. Evidence: `lib/pricing/resolve-price.ts:495-543`. The batch resolver, used by menu costing, does not include that market aggregate query in its batch query list and only loads receipt rows, API quote rows, and selected OpenClaw history rows. Evidence: `lib/pricing/resolve-price.ts:637-701`.

The ingestion bridge still creates virtual stores for `current_prices` as `city = 'Regional'`, `state = 'MA'`, and `zip = '00000'`. Evidence: `scripts/openclaw-pull/pull.mjs:923-960`. That must not be treated as Massachusetts local proof.

The canonical price intelligence contract already exposes store state, store ZIP, product identity, canonical ingredient identity, observed timestamp, price type, observation method, and normalized price cents. Evidence: `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:73-121`. Its store frontier view already rolls observations up per store and exposes store state and ZIP. Evidence: `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:518-598`.

There is a migration that intended to add `store_state` to `ingredient_price_history`, rebuild `regional_price_averages`, and group by state. Evidence: `database/migrations/20260418000007_price_history_store_state.sql:1-41`. The live DB audit found that the expected live column was absent, so the builder must verify schema truth before assuming this migration applied.

Builder implementation note, 2026-04-30: The proof harness code, additive migration, admin summary, dry-run CLI, batch market aggregate fallback, and focused tests are built. Dry-run verification produced 896 rows, 56 geographies, and 16 basket items, with 80 territory rows blocked as not usable. Write-mode proof was not run because the additive migration has not been applied, and project rules prohibit applying migrations without explicit approval and a database backup.

---

## What This Does (Plain English)

This build creates a deterministic proof harness for ChefFlow pricing. For every required geography and every item in the standard two-course basket, ChefFlow records the best available price proof, classifies the source honestly, computes freshness and unit confidence, assigns quote safety, and names the exact blocker when the row is weak or unusable. Quote and menu costing surfaces then consume this proof instead of relying on raw product counts or national averages.

---

## Why It Matters

ChefFlow cannot release nationwide pricing until it can prove menu-cost reliability locally. Raw corpus size is not enough. A chef needs to know whether the number is fresh local buyable proof, regional evidence, national fallback, public baseline, modeled planning math, or unresolved.

---

## Required Geographies

The proof harness must include exactly these 56 geographies:

Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming, Washington DC, Puerto Rico, Guam, American Samoa, Northern Mariana Islands, and US Virgin Islands.

Use these codes:

`AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR GU AS MP VI`.

---

## Required Basket

The proof harness must include exactly these 16 ingredient keys:

`chicken_breast`, `salmon`, `rice`, `potatoes`, `butter`, `olive_oil`, `garlic`, `onion`, `lemon`, `parsley`, `heavy_cream`, `flour`, `eggs`, `seasonal_vegetable`, `chocolate`, `berries`.

Canonical preferred labels:

| Ingredient key       | Preferred canonical label                                   |
| -------------------- | ----------------------------------------------------------- |
| `chicken_breast`     | Chicken Breast (Boneless, Skinless)                         |
| `salmon`             | Salmon Fillet                                               |
| `rice`               | Long Grain White Rice                                       |
| `potatoes`           | Potatoes                                                    |
| `butter`             | Butter (Dairy)                                              |
| `olive_oil`          | Extra Virgin Olive Oil                                      |
| `garlic`             | Garlic                                                      |
| `onion`              | Onions                                                      |
| `lemon`              | lemons                                                      |
| `parsley`            | Parsley                                                     |
| `heavy_cream`        | Heavy Cream                                                 |
| `flour`              | Flour (Pantry)                                              |
| `eggs`               | Eggs                                                        |
| `seasonal_vegetable` | Asparagus for April proof runs, configurable by month later |
| `chocolate`          | Chocolate (Baking)                                          |
| `berries`            | Blueberries                                                 |

---

## Files to Create

| File                                                     | Purpose                                                                                                                                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/specs/geographic-pricing-proof-harness.md`         | This spec                                                                                                                                                                                                        |
| `lib/pricing/geography-basket.ts`                        | Canonical geography list, basket list, source classes, quote-safety thresholds, and helper constants                                                                                                             |
| `lib/pricing/geographic-proof-query.ts`                  | Read-only query layer over `openclaw.price_intelligence_contract_v1`, `openclaw.system_ingredient_prices`, USDA baselines, category baselines, and modeled fallbacks                                             |
| `lib/pricing/geographic-proof-classifier.ts`             | Pure classifier that turns candidate evidence into `local_observed`, `regional_observed`, `national_observed`, `chef_owned`, `USDA_or_public_baseline`, `category_baseline`, `modeled_fallback`, or `unresolved` |
| `lib/pricing/geographic-proof-actions.ts`                | Server action for admins to run or inspect proof status, gated with `requireAdmin()`                                                                                                                             |
| `scripts/audit-geographic-pricing-proof.mjs`             | CLI proof runner that writes one run and 896 result rows                                                                                                                                                         |
| `tests/unit/geographic-pricing-proof-classifier.test.ts` | Unit tests for source classification, freshness buckets, unit confidence, and quote safety                                                                                                                       |
| `tests/unit/geographic-pricing-proof-coverage.test.ts`   | Contract test that requires 56 geographies x 16 basket rows and forbids `safe_to_quote` without local observed proof                                                                                             |

---

## Files to Modify

| File                                                                | What to Change                                                                                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/[next_timestamp]_geographic_pricing_proof.sql` | Additive migration only. Builder must list existing migration files first, pick a strictly higher timestamp, show SQL to developer before writing.                                                |
| `lib/pricing/resolve-price.ts`                                      | Add batch market aggregate support and thread `state` through batch output so menu costing can see `market_state` versus `market_national`.                                                       |
| `lib/pricing/no-blank-price-contract.ts`                            | Add optional `geographyCode`, `unitConfidence`, `sourceClassEvidence`, and stronger missing-proof reasons. Do not loosen safety.                                                                  |
| `lib/pricing/pricing-coverage-gate.ts`                              | Prefer geographic proof rows when available. Existing ingredient-level pricing can remain as fallback for non-geographic surfaces.                                                                |
| `lib/pricing/pricing-enforcement-gate.ts`                           | Block final quote presentation when any basket or menu row is `planning_only`, `not_usable`, `modeled_fallback`, or `unresolved`.                                                                 |
| `lib/pricing/pricing-readiness-actions.ts`                          | Replace corpus-level nationwide readiness thresholds with geographic proof completion thresholds.                                                                                                 |
| `scripts/openclaw-pull/pull.mjs`                                    | Stop assigning regional `current_prices` virtual stores to `MA/00000` as if they were local. Preserve the data, but classify it as regional or national unless a true store ZIP/state is present. |
| `scripts/sync-system-ingredient-prices.mjs`                         | Ensure state arrays and newest timestamps are preserved and usable for basket proof. Do not treat state arrays as local store proof unless store-level rows exist.                                |
| `components/pricing/pricing-readiness-card.tsx`                     | Show proof-based readiness, not raw product-count readiness.                                                                                                                                      |
| `app/(admin)/admin/openclaw/health/page.tsx`                        | Add admin-only proof status summary or link to the generated report, if this page already owns operational health.                                                                                |

---

## Database Changes

All changes are additive. No destructive operations. Do not run `drizzle-kit push`.

### New Tables

```sql
CREATE TABLE IF NOT EXISTS openclaw.geographic_pricing_proof_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  requested_by TEXT,
  total_geographies INTEGER NOT NULL DEFAULT 56,
  total_basket_items INTEGER NOT NULL DEFAULT 16,
  expected_result_rows INTEGER NOT NULL DEFAULT 896,
  actual_result_rows INTEGER NOT NULL DEFAULT 0,
  safe_to_quote_count INTEGER NOT NULL DEFAULT 0,
  verify_first_count INTEGER NOT NULL DEFAULT 0,
  planning_only_count INTEGER NOT NULL DEFAULT 0,
  not_usable_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.geographic_pricing_basket_items (
  ingredient_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  preferred_system_ingredient_id UUID REFERENCES system_ingredients(id),
  category TEXT NOT NULL,
  target_unit TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  seasonal_month INTEGER,
  aliases TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openclaw.geographic_pricing_proof_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES openclaw.geographic_pricing_proof_runs(id),
  geography_code TEXT NOT NULL,
  geography_name TEXT NOT NULL,
  ingredient_key TEXT NOT NULL REFERENCES openclaw.geographic_pricing_basket_items(ingredient_key),
  system_ingredient_id UUID REFERENCES system_ingredients(id),
  canonical_ingredient_id TEXT,
  source_class TEXT NOT NULL
    CHECK (source_class IN (
      'local_observed',
      'regional_observed',
      'national_observed',
      'chef_owned',
      'USDA_or_public_baseline',
      'category_baseline',
      'modeled_fallback',
      'unresolved'
    )),
  quote_safety TEXT NOT NULL
    CHECK (quote_safety IN ('safe_to_quote', 'verify_first', 'planning_only', 'not_usable')),
  failure_reason TEXT,
  price_cents INTEGER,
  normalized_price_cents INTEGER,
  normalized_unit TEXT,
  low_cents INTEGER,
  high_cents INTEGER,
  store_id UUID,
  store_name TEXT,
  store_city TEXT,
  store_state TEXT,
  store_zip TEXT,
  product_id UUID,
  product_name TEXT,
  product_brand TEXT,
  product_size TEXT,
  source_name TEXT,
  source_type TEXT,
  observed_at TIMESTAMPTZ,
  freshness_days INTEGER,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  match_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  unit_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  data_points INTEGER NOT NULL DEFAULT 0,
  missing_proof TEXT[] NOT NULL DEFAULT '{}'::text[],
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, geography_code, ingredient_key)
);

CREATE INDEX IF NOT EXISTS idx_gpp_results_geo
  ON openclaw.geographic_pricing_proof_results(run_id, geography_code);

CREATE INDEX IF NOT EXISTS idx_gpp_results_safety
  ON openclaw.geographic_pricing_proof_results(run_id, quote_safety);

CREATE INDEX IF NOT EXISTS idx_gpp_results_source_class
  ON openclaw.geographic_pricing_proof_results(run_id, source_class);
```

### New Columns on Existing Tables

These columns are needed only if live schema verification confirms they are missing. The builder must check `information_schema.columns` first.

```sql
ALTER TABLE ingredient_price_history
  ADD COLUMN IF NOT EXISTS store_state TEXT,
  ADD COLUMN IF NOT EXISTS store_zip TEXT,
  ADD COLUMN IF NOT EXISTS openclaw_store_id UUID REFERENCES openclaw.stores(id),
  ADD COLUMN IF NOT EXISTS source_class TEXT,
  ADD COLUMN IF NOT EXISTS normalized_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS normalized_unit TEXT;

CREATE INDEX IF NOT EXISTS idx_iph_geographic_lookup
  ON ingredient_price_history (store_state, ingredient_id, purchase_date DESC)
  WHERE store_state IS NOT NULL
    AND price_per_unit_cents IS NOT NULL
    AND price_per_unit_cents > 0;

ALTER TABLE openclaw.stores
  ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geography_scope TEXT NOT NULL DEFAULT 'local'
    CHECK (geography_scope IN ('local', 'regional', 'national', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_openclaw_stores_scope_state
  ON openclaw.stores (geography_scope, state);
```

### Seed Data

```sql
INSERT INTO openclaw.geographic_pricing_basket_items
  (ingredient_key, display_name, category, target_unit, seasonal_month, aliases)
VALUES
  ('chicken_breast', 'Chicken Breast (Boneless, Skinless)', 'protein', 'lb', NULL, ARRAY['chicken breast', 'boneless skinless chicken breast']),
  ('salmon', 'Salmon Fillet', 'protein', 'lb', NULL, ARRAY['salmon', 'salmon fillet']),
  ('rice', 'Long Grain White Rice', 'pantry', 'lb', NULL, ARRAY['rice', 'white rice', 'long grain rice']),
  ('potatoes', 'Potatoes', 'produce', 'lb', NULL, ARRAY['potatoes', 'potato']),
  ('butter', 'Butter (Dairy)', 'dairy', 'lb', NULL, ARRAY['butter', 'unsalted butter', 'salted butter']),
  ('olive_oil', 'Extra Virgin Olive Oil', 'oil', 'fl oz', NULL, ARRAY['olive oil', 'extra virgin olive oil']),
  ('garlic', 'Garlic', 'produce', 'lb', NULL, ARRAY['garlic', 'fresh garlic']),
  ('onion', 'Onions', 'produce', 'lb', NULL, ARRAY['onion', 'onions']),
  ('lemon', 'lemons', 'produce', 'lb', NULL, ARRAY['lemon', 'lemons']),
  ('parsley', 'Parsley', 'produce', 'lb', NULL, ARRAY['parsley', 'fresh parsley']),
  ('heavy_cream', 'Heavy Cream', 'dairy', 'fl oz', NULL, ARRAY['heavy cream', 'whipping cream']),
  ('flour', 'Flour (Pantry)', 'pantry', 'lb', NULL, ARRAY['flour', 'all purpose flour']),
  ('eggs', 'Eggs', 'dairy', 'each', NULL, ARRAY['eggs', 'large eggs']),
  ('seasonal_vegetable', 'Asparagus', 'produce', 'lb', 4, ARRAY['asparagus', 'seasonal vegetable']),
  ('chocolate', 'Chocolate (Baking)', 'baking', 'lb', NULL, ARRAY['chocolate', 'baking chocolate']),
  ('berries', 'Blueberries', 'produce', 'lb', NULL, ARRAY['berries', 'blueberries'])
ON CONFLICT (ingredient_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  target_unit = EXCLUDED.target_unit,
  seasonal_month = EXCLUDED.seasonal_month,
  aliases = EXCLUDED.aliases,
  updated_at = now();
```

### Migration Notes

- Before writing the migration file, list `database/migrations/*.sql` and choose a timestamp strictly higher than the highest existing migration.
- Show the developer the full SQL before writing the migration file.
- Do not create destructive SQL.
- Do not run `drizzle-kit push`.
- After migration application by the developer, regenerate database types through the normal project workflow. Never edit `types/database.ts` manually.

---

## Data Model

`openclaw.geographic_pricing_proof_runs` records one audit execution.

`openclaw.geographic_pricing_basket_items` records the fixed 16-item basket and target culinary units.

`openclaw.geographic_pricing_proof_results` records one result per geography and ingredient key. A complete run has exactly 896 rows.

Source class rules:

| Source class              | Meaning                                                                                           | Quote use                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `local_observed`          | Store-level observed price with matching `store_state` or `store_zip` for the requested geography | Can be `safe_to_quote` only if fresh and unit-safe          |
| `regional_observed`       | Observed price from a nearby or multi-state market, not same geography                            | `verify_first` or `planning_only`                           |
| `national_observed`       | Observed national market aggregate, no local store proof                                          | `verify_first` only when strong, otherwise `planning_only`  |
| `chef_owned`              | Chef receipt, vendor invoice, or manually logged purchase                                         | Can be quote-safe for that chef, not for national readiness |
| `USDA_or_public_baseline` | Public baseline such as USDA or BLS                                                               | `planning_only` unless explicitly verified                  |
| `category_baseline`       | Category median or category estimate                                                              | `planning_only`                                             |
| `modeled_fallback`        | Synthetic or inferred model output                                                                | `planning_only` only                                        |
| `unresolved`              | No usable price                                                                                   | `not_usable`                                                |

Quote safety rules:

| Quote safety    | Required proof                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `safe_to_quote` | `local_observed` or `chef_owned`, price > 0, observed <= 7 days, exact or confirmed ingredient match, normalized unit present, unit confidence >= 0.80, confidence >= 0.75, store proof present |
| `verify_first`  | Observed evidence exists but freshness, locality, matching, or unit conversion is not strong enough for final quote                                                                             |
| `planning_only` | National, public baseline, category baseline, modeled fallback, stale local evidence, or weak unit proof                                                                                        |
| `not_usable`    | Unresolved ingredient, no positive price, no baseline, or unsupported geography                                                                                                                 |

---

## Server Actions

| Action                                   | Auth             | Input                                                 | Output                                                 | Side Effects                                                |
| ---------------------------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| `getGeographicPricingProofLatest()`      | `requireAdmin()` | none                                                  | latest run summary plus rows grouped by geography      | none                                                        |
| `runGeographicPricingProofAction()`      | `requireAdmin()` | `{ dryRun?: boolean }`                                | `{ success: boolean, runId?: string, error?: string }` | inserts run and result rows, revalidates admin price health |
| `getGeographicQuoteSafetyForMenu(input)` | `requireChef()`  | `{ geographyCode: string, ingredientKeys: string[] }` | per-ingredient proof rows and summary safety           | none                                                        |

Rules:

- `runGeographicPricingProofAction()` must be admin-only. Prospecting and operational pipeline features must not appear for non-admins.
- Chef-facing quote lookups must scope chef-owned prices by tenant. Global OpenClaw proof rows are system data and can be read, but chef-owned receipt evidence cannot cross tenants.
- Mutations return `{ success, error? }` or records. Never `Promise<void>`.
- Failures must return an error state, not fake zeros.

---

## Proof Resolution Algorithm

For each geography and basket item, run candidates in this order:

1. **Chef-owned**, only when a tenant-specific menu proof request is being run. Use receipt/vendor/manual rows scoped to tenant.
2. **Fresh local observed**, from `openclaw.price_intelligence_contract_v1` where `fact_kind = 'observation'`, `entity_store_state = geography_code`, `entity_store_zip != '00000'`, `entity_store_city != 'Regional'`, price > 0, observed <= 7 days, and ingredient match is exact or confirmed.
3. **Recent local observed**, same as above but observed <= 30 days.
4. **Regional observed**, store state in the same region or system market aggregate whose `states` includes geography code, observed <= 30 days.
5. **National observed**, system market aggregate or observed rows across other states, never local.
6. **USDA or public baseline**, only when it maps to the ingredient and unit.
7. **Category baseline**, only when ingredient-specific public baseline is absent.
8. **Modeled fallback**, only with explicit modeled label.
9. **Unresolved**, when no positive price and no honest baseline exist.

Do not use `city = 'Regional'`, `state = 'MA'`, `zip = '00000'` rows as local Massachusetts proof. Evidence for this current ingestion behavior is `scripts/openclaw-pull/pull.mjs:953-960`.

---

## UI / Component Spec

### Page Layout

Do not create a new public page. Attach admin visibility to the existing OpenClaw health or pricing readiness owner.

Admin summary:

- Latest proof run status.
- Completed rows out of 896.
- Count by quote safety.
- Count by source class.
- Geography table with one row per state or territory.
- Drill-down row list for the 16 basket ingredients.

Chef-facing quote/menu surfaces:

- Show `safe_to_quote`, `verify_first`, or `planning_only` from the proof contract.
- If proof is `planning_only` or `not_usable`, show the missing proof reason.
- Do not show national or modeled prices as local.

### States

- **Loading:** skeleton or neutral loading text.
- **Empty:** "No geographic pricing proof run exists yet." No zero-dollar totals.
- **Error:** "Pricing proof could not be loaded." Include retry where appropriate.
- **Populated:** table and summary from latest successful or partial proof run.

### Interactions

- Admin can run the proof harness manually.
- The run button must disable while running.
- If the run fails, show the error and keep the previous run visible.
- No optimistic success. Insert the run only after the script reports rows.

---

## Edge Cases and Error Handling

| Scenario                                               | Correct Behavior                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Geography has stores but no observed prices            | Result rows are `planning_only` or `not_usable` with `failure_reason = 'stores exist, no observed prices'` |
| Territory has no stores                                | Result rows are `not_usable` with `failure_reason = 'no local stores, no territory baseline'`              |
| Product price is zero or null                          | Reject candidate, never use as valid proof                                                                 |
| Product has no parsed package size                     | Lower unit confidence; cannot be `safe_to_quote`                                                           |
| Candidate comes from `MA/00000` regional virtual store | Classify as `national_observed` or `regional_observed`, never `local_observed`                             |
| Local price older than 7 days                          | Cannot be `safe_to_quote`                                                                                  |
| Local price older than 30 days                         | `planning_only` unless chef-owned evidence overrides for that chef                                         |
| Modeled fallback exists                                | `planning_only` only                                                                                       |
| Ingredient is unresolved                               | `not_usable`                                                                                               |
| Proof query times out                                  | Mark run partial or failed; do not overwrite previous successful run                                       |
| Existing dirty work blocks validation                  | Report exact blocker, do not edit unrelated files                                                          |

---

## Verification Steps

1. Confirm branch is not `main`.
2. List `database/migrations/*.sql` and pick a strictly higher timestamp before creating migration.
3. Show the developer full SQL before writing the migration.
4. Apply migration only after developer approval.
5. Run `node scripts/audit-geographic-pricing-proof.mjs --dry-run`.
6. Verify dry run returns 56 geographies, 16 basket items, and 896 candidate result rows.
7. Run `node scripts/audit-geographic-pricing-proof.mjs --write`.
8. Verify latest run has `actual_result_rows = 896`.
9. Verify no `safe_to_quote` row exists unless all of these are true: `source_class IN ('local_observed','chef_owned')`, `freshness_days <= 7`, `normalized_price_cents > 0`, `unit_confidence >= 0.80`, `store_id IS NOT NULL`.
10. Verify territories are `not_usable` until real territory store or baseline evidence exists.
11. Run unit tests:
    - `node --test --import tsx tests/unit/geographic-pricing-proof-classifier.test.ts`
    - `node --test --import tsx tests/unit/geographic-pricing-proof-coverage.test.ts`
12. Run typecheck if code files changed:
    - `npm run typecheck`
13. Do not run `next build` unless the developer explicitly approves.

---

## Acceptance Criteria

This build is complete only when:

- There is exactly one latest proof result per geography and basket ingredient.
- A complete run produces exactly 896 result rows.
- Every row has a non-empty `source_class`, `quote_safety`, and either usable price proof or a clear `failure_reason`.
- No row with `modeled_fallback`, `category_baseline`, `USDA_or_public_baseline`, `national_observed`, `regional_observed`, or `unresolved` can be `safe_to_quote`.
- No row with `price_cents <= 0` or `normalized_price_cents <= 0` can be quote-safe.
- Geography proof does not count `MA/00000` regional virtual rows as local Massachusetts proof.
- `resolvePricesBatch()` can return state-aware market aggregate fallback with the same honesty as `resolvePrice()`.
- Pricing readiness no longer reports nationwide-ready from product counts, ZIP counts, or raw state counts alone.
- The admin health surface can show which geographies are blocked and why.

---

## Out of Scope

- Do not build a broad nationwide scraper expansion in this spec.
- Do not build territory acquisition itself. This spec exposes territory gaps and creates the harness to verify future acquisition.
- Do not change public marketing copy.
- Do not rename OpenClaw internal paths or schema names.
- Do not edit `types/database.ts`.
- Do not run destructive database operations.
- Do not run `drizzle-kit push`.
- Do not deploy.
- Do not start, kill, or restart servers.

---

## Notes for Builder Agent

### Exact Implementation Order

1. Verify live schema columns for `ingredient_price_history`, `openclaw.stores`, `openclaw.store_products`, `openclaw.system_ingredient_prices`, and `openclaw.price_intelligence_contract_v1`.
2. Draft additive migration SQL and show it to the developer.
3. After approval, add migration.
4. Add pure constants in `lib/pricing/geography-basket.ts`.
5. Add pure classifier and tests before wiring DB reads.
6. Add read-only proof query layer.
7. Add CLI proof runner with `--dry-run` and `--write`.
8. Patch `resolvePricesBatch()` to include market aggregate and state-aware source tier.
9. Patch readiness and enforcement gates to consume proof rows.
10. Add admin visibility to the existing health or readiness surface.
11. Run targeted unit tests and typecheck.
12. Commit and push only owned files.

### Failure Analysis Built Into Result Rows

Use these exact `failure_reason` values where applicable:

- `no local stores`
- `stale prices`
- `missing ZIP/store coverage`
- `weak ingredient matching`
- `no unit conversion`
- `no fallback baseline`
- `modeled-only pricing`
- `unresolved ingredient`
- `sync failure`
- `data exists but does not reach menu costing`
- `stores exist, no observed prices`
- `no territory baseline`
- `regional virtual store only`

### Planner Validation

1. **What exists today that this touches?** Existing no-blank source and safety types exist in `lib/pricing/no-blank-price-contract.ts:3-10`; safety logic exists in `lib/pricing/no-blank-price-contract.ts:180-207`; enforcement blocks planning-only final quote proof in `lib/pricing/pricing-enforcement-gate.ts:145-155`; single price resolution has market aggregate in `lib/pricing/resolve-price.ts:495-543`; batch resolution omits it from the loaded OpenClaw row query in `lib/pricing/resolve-price.ts:637-701`; price intelligence contract exposes store state and normalized price in `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:73-121`.
2. **What exactly changes?** Add proof tables, constants, classifier, query layer, CLI runner, tests, and small gate integrations. Patch ingestion classification so virtual regional rows are not local proof.
3. **Assumptions.** Verified: existing contract and resolver files support the needed vocabulary. Unverified until builder checks live DB: whether `store_state` exists in the applied schema, because the intended migration exists in `database/migrations/20260418000007_price_history_store_state.sql:1-41` but the audit found it absent in live DB.
4. **Most likely break points.** Large DB queries can time out; source and store geography are dirty; unit normalization coverage is weak.
5. **Underspecified items.** Territory acquisition is intentionally not specified beyond proof classification. Seasonal vegetable is fixed to asparagus for first build.
6. **Dependencies.** Additive migration approval, existing OpenClaw schema, existing pricing gates.
7. **Potential conflicts.** `pricing-readiness-actions` currently uses broad market readiness thresholds. Evidence: `lib/pricing/pricing-readiness-actions.ts:137-147`. That must be superseded by proof completion.
8. **Duplicate risk.** Older nationwide and total-capture specs exist, but this spec attaches to the current no-blank and price intelligence contract spine.
9. **End-to-end flow.** Admin runs proof action or CLI, query layer gathers candidates, classifier writes proof result rows, readiness gate reads latest proof, quote/menu surfaces use proof safety labels.
10. **Correct implementation order.** Migration and constants first, classifier tests second, query runner third, UI and quote gate integration last.
11. **Success criteria.** 896 rows, no unsafe safe-to-quote, explicit failure reasons, state and territory table available.
12. **Non-negotiable constraints.** Admin-only proof run, tenant scoping for chef-owned data, no destructive DB operations, no zero-dollar valid prices, no modeled observed truth.
13. **What should not be touched.** Public marketing, `types/database.ts`, deployment scripts, running servers, unrelated dirty files, other agents' skill edits.
14. **Simplest complete version.** Yes. It proves the 16-item basket before expanding the entire catalog.
15. **What would still be wrong after exact implementation?** The harness will expose failures but will not fill every geography. A separate acquisition build must target failed geographies and territories.

### Final Check

This spec is production-ready as a builder handoff for the proof harness. The only uncertainty is live DB schema drift around `ingredient_price_history.store_state`; the first builder step explicitly resolves that before writing migration SQL.
