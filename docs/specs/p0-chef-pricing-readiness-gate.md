# Spec: Chef Pricing Readiness Gate

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `openclaw-refresh-status-badge.md`, `openclaw-price-surfacing.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                | Agent/Session   | Commit |
| --------------------- | ------------------- | --------------- | ------ |
| Created               | 2026-04-01 15:42 ET | Planner (Codex) |        |
| Status: ready         | 2026-04-01 15:42 ET | Planner (Codex) |        |
| Claimed (in-progress) |                     |                 |        |
| Spike completed       |                     |                 |        |
| Pre-flight passed     |                     |                 |        |
| Build completed       |                     |                 |        |
| Type check passed     |                     |                 |        |
| Build check passed    |                     |                 |        |
| Playwright verified   |                     |                 |        |
| Status: verified      |                     |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

The developer wants one brutally honest answer. As a chef, they need to be able to price out any menu at that moment in time as accurately as possible. They want to know whether everything is actually going according to plan, whether the only reason they cannot fully rely on the product yet is that OpenClaw is still scraping, and whether the website is already usable now or still in a wait state. They also asked for the real projection, not fake certainty, and they are worried the literal final goal might never be met perfectly. The important signal under all of that is that the product itself still does not answer the difference between:

- "Can I use this for my own menu pricing today?"
- "Is the nationwide pricing foundation actually done?"

The developer does not want a dishonest yes. They want the product to tell the truth about current usefulness, remaining gaps, and what is still only projected.

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** Add one truthful readiness model that tells a chef whether current pricing is usable now for their own menu work and separately whether nationwide market coverage is finished.
- **Key constraints:** Never claim perfection. Never turn a projected milestone into a verified completion date. Never collapse chef-specific costing coverage and national data-lane coverage into one fake badge. Keep chef-facing copy neutral and outcome-focused.
- **Motivation:** The current pricing surfaces expose freshness fragments and raw counts, but they do not answer the developer's actual trust question.
- **Success from the developer's perspective:** A chef can open the pricing surfaces and immediately understand "ready now," "usable with caveats," or "not ready yet" for their own current data, while also seeing that nationwide coverage is still in progress until strict thresholds are truly met.

---

## What This Does (Plain English)

This adds a shared Pricing Readiness card to the chef-facing pricing routes. The card answers two separate questions with verified numbers: first, whether this chef can use current pricing for their own ingredients and recipes today; second, whether the broader market foundation is still regional or actually nationwide. It also replaces the current hardcoded New England ZIP lookup in Store Prices with a server-side ZIP resolver backed by existing database tables, and it removes copy that overstates completeness or certainty.

---

## Why It Matters

The repo's own validation says the national answer is "NO (today). YES (architecturally, when data scales)," while the live product still contains broad copy like "Every product, every store, every price" and a client ZIP search that explicitly tells users to "Try a New England zip code." `docs/pricing-validation-report-2026-03-31.md:4-12`, `app/(chef)/prices/page.tsx:62-66`, `app/(chef)/prices/prices-client.tsx:72-75`

Without a readiness gate, builders and users keep conflating three different things: page freshness, chef-specific costing coverage, and national capture completion. Those are not the same state.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                            | Purpose                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `components/pricing/pricing-readiness-card.tsx` | Shared chef-facing readiness surface that renders market status and optional chef status |
| `lib/pricing/pricing-readiness-actions.ts`      | Chef-safe server action that computes verified readiness facts from existing DB tables   |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                                    | What to Change                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/prices/page.tsx`                            | Load readiness data, replace the universal-coverage hero copy, and render the market-readiness card above the stat row                               |
| `app/(chef)/prices/prices-client.tsx`                   | Remove the hardcoded client ZIP map, use a server-side ZIP lookup action, and replace the "Try a New England zip code" / "being built" wording       |
| `lib/openclaw/store-catalog-actions.ts`                 | Add `getNearbyStoresByZip(zip, radiusMiles)` using `openclaw.stores` exact ZIPs first and `openclaw.zip_centroids` second                            |
| `app/(chef)/culinary/price-catalog/page.tsx`            | Load readiness data and render the market-readiness card above the existing engine row without changing the live catalog refresh badge               |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Replace stale "Data is collected daily" / generic service-update copy with explicit coverage-in-progress language                                    |
| `components/pricing/store-aisle-browser.tsx`            | Replace the store-aisle empty-state "Data is collected daily" copy so every catalog mode uses the same honest coverage language                      |
| `app/(chef)/culinary/costing/page.tsx`                  | Load readiness data, render the full readiness card above the summary stats, and stop implying that recipe count alone answers overall pricing trust |
| `components/pricing/event-shopping-planner.tsx`         | Replace `Pi online/offline` wording with neutral price-engine availability language on the costing page                                              |
| `components/pricing/shopping-optimizer.tsx`             | Replace `Is the Pi online?` wording with neutral price-engine availability language on the costing page                                              |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No new migration is required for this feature.
- This spec depends on existing schema already present in the repo: `openclaw.sync_runs`, `openclaw.stores`, `openclaw.store_products`, `openclaw.zip_centroids`, `ingredients`, and `recipe_cost_summary`. `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-46,85-141`, `database/migrations/20260401000146_zip_centroids_and_usda_baselines.sql:7-18`, `database/migrations/20260330000095_cascading_food_costs.sql:149-178`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:261-349`
- The ZIP-centroid table is an existing dependency for nationwide ZIP resolution. The new store lookup action must fail gracefully when a requested ZIP cannot be resolved. `database/migrations/20260401000146_zip_centroids_and_usda_baselines.sql:7-18`

---

## Data Model

Create one read-only server shape:

```ts
type PricingReadinessSummary = {
  checkedAt: string
  chef: null | {
    totalIngredients: number
    pricedIngredients: number
    freshIngredients: number
    ingredientCoveragePct: number | null
    totalRecipes: number
    pricedRecipes: number
    freshRecipes: number
    recipeCoveragePct: number | null
    status: 'unknown' | 'not_ready' | 'usable_with_caveats' | 'ready'
    label: string
    guidance: string
  }
  market: {
    lastHealthySyncAt: string | null
    greenDaysLast7: number
    stores: number
    statesCovered: number
    storeZipCount: number
    foodProducts: number
    priceRecords: number
    freshPricePct: number | null
    zipCentroidsLoaded: boolean
    status: 'unknown' | 'no_live_data' | 'regional_in_progress' | 'nationwide_ready'
    label: string
    guidance: string
  }
}
```

Rules:

### Chef readiness rules

- `pricedIngredients` = active chef ingredients where `cost_per_unit_cents` or `last_price_cents` is present.
- `freshIngredients` = active chef ingredients with `last_price_date >= CURRENT_DATE - 7`.
- `pricedRecipes` = rows in `recipe_cost_summary` for this chef where `total_ingredient_cost_cents` is not null and `ingredient_count > 0`.
- `freshRecipes` = rows in `recipe_cost_summary` for this chef where `last_price_updated_at >= CURRENT_DATE - 7`.
- `ready` = ingredient coverage >= 90% and, when the chef has recipes, recipe coverage >= 90%.
- `usable_with_caveats` = ingredient coverage >= 60% and, when the chef has recipes, recipe coverage >= 60%.
- `not_ready` = anything below those thresholds, or no chef pricing records yet.
- If the chef has zero recipes, the card must explicitly say recipe readiness is not established yet instead of pretending the ingredient percentage alone proves full menu readiness.

These thresholds intentionally align with the existing green/amber/red costing badge semantics rather than inventing a second coverage vocabulary. `components/pricing/costing-confidence-badge.tsx:16-35`

### Market readiness rules

- `greenDaysLast7` counts distinct calendar days in the last 7 days where at least one sync run finished and `errors = 0`.
- `lastHealthySyncAt` is the newest `finished_at` from a zero-error sync run.
- `statesCovered` = `COUNT(DISTINCT state)` across active `openclaw.stores`.
- `storeZipCount` = `COUNT(DISTINCT zip)` across active `openclaw.stores`.
- `foodProducts` = count of `openclaw.products WHERE is_food = true`.
- `priceRecords` = count of `openclaw.store_products`.
- `freshPricePct` = percent of `openclaw.store_products` with `last_seen_at > now() - interval '7 days'`.
- `zipCentroidsLoaded` = `COUNT(*) > 0` in `openclaw.zip_centroids`.
- `nationwide_ready` is intentionally strict. It is only true when all of these are true:
  - `greenDaysLast7 = 7`
  - `statesCovered = 50`
  - `storeZipCount >= 5000`
  - `foodProducts >= 600000`
  - `freshPricePct >= 50`
- Otherwise, if there is live store data, status stays `regional_in_progress`.
- If there are zero active stores or zero price records, status is `no_live_data`.

The nationwide thresholds come from the repo's own validation target and existing health-check expectations, not from new guesswork. `docs/pricing-validation-report-2026-03-31.md:17-25,133-151`, `scripts/openclaw-health-check.mjs:145-159`

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action                                   | Auth            | Input                                   | Output                                    | Side Effects              |
| ---------------------------------------- | --------------- | --------------------------------------- | ----------------------------------------- | ------------------------- | ---- |
| `getPricingReadinessSummary()`           | `requireChef()` | none                                    | `PricingReadinessSummary`                 | None                      |
| `getNearbyStoresByZip(zip, radiusMiles)` | `requireChef()` | `{ zip: string, radiusMiles?: number }` | `{ zip: string, resolvedFrom: 'store_zip' | 'zip_centroid', stores }` | None |

### `getPricingReadinessSummary()`

Implementation requirements:

1. Require chef auth once and reuse the chef tenant id for all chef-side queries.
2. Query chef ingredient readiness from `ingredients`.
3. Query chef recipe readiness from `recipe_cost_summary`.
4. Query market readiness from `openclaw.sync_runs`, `openclaw.stores`, `openclaw.store_products`, `openclaw.products`, and `openclaw.zip_centroids`.
5. Return exact counts and timestamps only. No guessed ETA, no inferred nationwide date, no fake zeros when a query fails.
6. If a subsection cannot be verified, mark that subsection `unknown` and supply guidance like `Readiness could not be verified right now.`

Critical rule: do not copy the current health-check script's nonexistent `status = 'failed'` assumption into app code. The real schema has `errors` and `error_details`, not a `status` column. `scripts/openclaw-health-check.mjs:104-139`, `database/migrations/20260401000119_openclaw_inventory_schema.sql:128-139`, `scripts/openclaw-pull/pull.mjs:693-703`

### `getNearbyStoresByZip(zip, radiusMiles)`

Implementation requirements:

1. Validate the ZIP as 5 numeric digits.
2. Try an exact ZIP resolution from active `openclaw.stores` first by averaging `lat/lng` for stores in that ZIP.
3. If no active store exists at that ZIP, fall back to `openclaw.zip_centroids`.
4. Reuse the existing geo-distance query path to fetch nearby stores once coordinates are resolved.
5. Return an explicit lookup error when the ZIP cannot be resolved. Do not mention New England.
6. Keep the radius default at 25 miles to preserve current UI expectations.

This builds on existing geo-search patterns already used by `getNearbyStores()` and `lookupPrice()`. `lib/openclaw/store-catalog-actions.ts:160-208`, `lib/pricing/universal-price-lookup.ts:109-181`

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

Create a shared server-rendered `<PricingReadinessCard />` with two variants:

- `market`
- `full`

#### `/prices`

- Place the `market` variant directly under the intro and above the existing stat cards.
- Replace the current hero copy with truthful scope language:
  - allowed: `Best available current store-price coverage`
  - allowed: `Nationwide coverage is still in progress`
  - forbidden: `Every product, every store, every price`
- Keep the existing stats row and `OpenClawRefreshStatus` card. The new readiness card complements freshness; it does not replace it. `app/(chef)/prices/page.tsx:51-136`, `components/pricing/openclaw-refresh-status.tsx:55-106`

#### `/culinary/price-catalog`

- Place the `market` variant above the current engine row.
- Keep the existing engine row and live-catalog refresh badge.
- The readiness card must say scope/trust; the refresh badge must keep saying freshness/source.
- Do not claim that product counts alone prove nationwide readiness. `app/(chef)/culinary/price-catalog/page.tsx:17-65`, `components/pricing/openclaw-refresh-status.tsx:109-156`

#### `/culinary/costing`

- Place the `full` variant under the page header and above the four summary stat cards.
- Keep the existing four summary cards, but rename the current `Costing coverage` card to `Recipe cost coverage` so it is clearly recipe-table coverage, not whole-system readiness. The new readiness card is the only page-level trust answer.
- The `full` variant shows two columns on desktop, stacked on mobile:
  - `Your Pricing Coverage`
  - `Market Foundation`
- `Your Pricing Coverage` must include:
  - status badge (`Ready now`, `Usable with caveats`, `Not ready`, `Unknown`)
  - priced ingredients / total ingredients
  - fresh ingredients / total ingredients
  - priced recipes / total recipes
  - fresh recipes / total recipes
  - one short guidance sentence
- `Market Foundation` must include:
  - status badge (`Regional today`, `No live market data yet`, `Nationwide ready`, `Unknown`)
  - last healthy sync
  - green days in last 7
  - states covered
  - store ZIPs covered
  - food products
  - fresh-price percentage
  - one short guidance sentence

### States

- **Loading:** No client-side spinner for the readiness card. The data is server-rendered with the page.
- **Empty:** If the chef has no ingredients or no recipes, show that explicitly inside the chef section. Do not fake 0% as if it were a broken system.
- **Error:** If readiness cannot be computed, show `Readiness unavailable` with muted styling and a short explanation. Never show fake zeros.
- **Populated:** Show exact counts, exact timestamps, and clear status labels. Relative-only time is not enough.

### Interactions

- The readiness card itself is read-only in v1.
- Existing interactions remain unchanged:
  - `Refresh All Prices` still lives in the costing header.
  - Store search still runs from the ZIP field, but it now calls `getNearbyStoresByZip()`.
- ZIP search interaction changes:
  - Submitting a valid ZIP triggers the new server-side ZIP lookup.
  - If the ZIP resolves but no stores are found in radius, show a normal empty result.
  - If the ZIP cannot be resolved, show a precise lookup error.

Copy rules for surfaces touched by this spec:

- Chef-facing surfaces must not mention `OpenClaw` or `Pi`.
- Chef-facing surfaces must not imply nationwide completion unless `market.status = nationwide_ready`.
- Chef-facing surfaces must not imply a verified exact completion date.
- If a later countdown feature adds a projected milestone, that date must stay explicitly labeled `projected`; it is not part of this readiness gate.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                                       | Correct Behavior                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `sync_runs` exists but recent runs have errors                 | Count only zero-error finished runs as green; show latest healthy sync separately                        |
| `sync_runs` query fails or table is unavailable                | Market section becomes `unknown`; page still renders                                                     |
| Chef has ingredients but zero recipes                          | Chef section says ingredient pricing exists but recipe readiness is not established yet                  |
| Chef has recipes but low coverage                              | Show `usable with caveats` or `not ready` with exact counts, not a happy green summary                   |
| Store ZIP has no active stores but exists in `zip_centroids`   | Resolve ZIP from centroid table and perform the same nearby-store search                                 |
| ZIP cannot be found in either active stores or `zip_centroids` | Show a lookup-specific error, not a New England-specific hint                                            |
| Product counts rise but states remain limited                  | Market status stays `regional_in_progress`; raw growth does not equal nationwide readiness               |
| Live catalog Pi is unreachable                                 | Existing refresh badge can show degraded live-catalog status; readiness card continues using local facts |
| Current data still only covers 3 states / 281 ZIPs             | The card must still say `Regional today` / `Nationwide in progress`; never upgrade the label early       |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Sign in with a chef account that has at least some ingredients and recipes.
2. Navigate to `/prices`.
3. Verify the readiness card appears above the stats row.
4. Verify the hero copy no longer claims universal coverage.
5. Search a ZIP outside New England that exists in `openclaw.zip_centroids`.
6. Verify the page no longer says `Try a New England zip code`.
7. Navigate to `/culinary/price-catalog`.
8. Verify the readiness card appears above the engine row and the page still shows the existing refresh-status card below it.
9. Trigger a store with no current catalog results in the browser and verify the empty copy says coverage is still in progress, not that the system is simply updating daily.
10. Navigate to `/culinary/costing`.
11. Verify the card shows both `Your Pricing Coverage` and `Market Foundation`.
12. Verify chef-side coverage counts match the actual ingredient and recipe totals for that tenant.
13. Verify the current live dataset still renders `Regional today` / `Nationwide in progress`, not `Nationwide ready`.
14. Temporarily force a readiness-query failure in local dev and verify the card shows `Readiness unavailable` instead of fake zeros.
15. Run Playwright or equivalent end-to-end verification for the three routes and capture screenshots of each final state.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Not finishing nationwide scraping or changing the OpenClaw capture roadmap itself
- Not fixing source-mapping gaps or the `captured-session.json` handoff failure in deploy logs
- Not changing the admin `/admin/price-catalog` tabs or internal Pi-facing operator workflows
- Not replacing the existing refresh-status component
- Not adding a projected completion date to chef-facing readiness cards
- Not rewriting row-level costing badges, price attribution bars, or the underlying price-resolution chain

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._

1. Treat this as a truth-and-readiness feature, not a scraping feature. The point is honest state, not more counters.
2. Reuse the existing refresh-status card. Freshness and readiness are different questions. `components/pricing/openclaw-refresh-status.tsx:1-12`
3. Do not call the Pi directly from the new readiness action. Use ChefFlow-owned local data only. The price-catalog page already mixes local and live sources; the readiness gate must stay on verified local facts. `lib/openclaw/catalog-actions.ts:4-9,309-444`, `lib/openclaw/refresh-status-actions.ts:31-71`
4. Do not mark a day green because a sync run exists. Use `finished_at` plus `errors = 0`.
5. Do not reintroduce client-side hardcoded ZIP maps. ZIP resolution belongs in the server action and must use the database-backed resolver.
6. Do not soften the nationwide-ready threshold just to make the current dataset look finished. The whole point of this feature is to stop fake certainty.
7. Keep chef-facing copy neutral. Existing internal admin text can keep OpenClaw naming because this spec does not touch admin surfaces.
