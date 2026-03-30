# Menu Costing: Complete Strategy and System Assessment

> **Date:** 2026-03-30
> **Context:** Developer has 10+ years across every chef environment (Michelin-star, food pantries, celebrity mansions, startups, restaurants, private chef). The Indian dinner inquiry was one example; this system must work for every cuisine and setting.

---

## The Problem (In the Developer's Words)

Every chef, everywhere, faces the same problem: costing a menu is hours of manual spreadsheet comparison across vendor sheets, and the numbers are always incomplete or stale. There are days where chefs can't cook because they're stuck in an office costing menus and placing orders. No system has ever solved this automatically and accurately.

The goal: any menu that comes in gets perfectly and automatically costed out the second it's submitted. If the system doesn't know something, it says so honestly. Never guess. Never show a blank where an average would work.

---

## What We Have (Infrastructure Assessment)

### The Pi (OpenClaw)

- Raspberry Pi running 24/7 with free model swarm
- 43,391 real store prices (Market Basket, Hannaford so far)
- Bridge script converting catalog products to normalized prices (71% canonical match rate)
- Smart-lookup with 300+ manual aliases and fuzzy matching
- Nightly sync to ChefFlow via enriched API
- 6 more stores queued (Aldi, Stop & Shop, Shaws, Costco, BJ's, Whole Foods)
- Sub-department discovery research complete (can break 1,000-item department caps)

### ChefFlow (The App)

- 8-tier (soon 10-tier) price resolution chain with confidence scoring
- TypeScript unit conversion engine with 87 ingredient densities (WIRED into cost pipeline)
- 563 system ingredients seeded with density, yield, and allergen data
- Recipe cost computation that cascades through sub-recipes
- Menu hierarchy: menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
- SQL views: recipe_cost_summary, menu_cost_summary (auto-aggregate costs up the chain)
- Honest flagging when prices are missing (never shows $0 as real)

### What's Built vs What's Spec'd

| Layer                                   | Status                                                        |
| --------------------------------------- | ------------------------------------------------------------- |
| Pi catalog scraping                     | Running (Market Basket, Hannaford live; 6 stores queued)      |
| Bridge (catalog -> prices)              | Built and deployed                                            |
| Smart-lookup aliases                    | Built (300+ aliases, expanded for Indian cuisine)             |
| Nightly Pi -> ChefFlow sync             | Built and running                                             |
| 8-tier price resolution                 | Built and verified                                            |
| Unit conversion engine                  | Built (87 densities, wired into cost pipeline)                |
| Auto-costing engine                     | Built and verified (spec complete)                            |
| Recipe cost views (SQL)                 | Built (recipe_cost_summary, menu_cost_summary)                |
| Cross-store averaging                   | **Spec written, not built** (universal-price-intelligence.md) |
| Category baseline fallback              | **Spec written, not built**                                   |
| Count-to-weight equivalents             | **Spec written, not built**                                   |
| Name normalization for sync             | **Spec written, not built**                                   |
| Expanded USDA baseline (500+ items)     | **Spec written, not built**                                   |
| Menu Cost Estimator UI                  | **Spec written, not built** (menu-cost-estimator.md)          |
| Baseline price seeder (specialty items) | **File created, not deployed** (SSH auth issue)               |

---

## The 6 Gaps (Honest Assessment)

### Gap 1: Unit Conversion in SQL Fallback (CORRECTED: Less Severe Than Initially Reported)

The TypeScript pipeline DOES handle unit conversion. It writes converted costs to `recipe_ingredients.computed_cost_cents` and `recipes.total_cost_cents`. The SQL function `compute_recipe_cost_cents()` is a read-only fallback for the views and doesn't convert units, but the primary cost path works correctly.

**Remaining risk:** If the TS pipeline hasn't run for a recipe (new recipe, never refreshed), the SQL view shows unconverted costs. This is a cold-start issue, not a systemic one.

**Fix:** Already handled by the auto-costing engine spec (verified). Price refresh runs on sync and on recipe save.

### Gap 2: Government Safety Net Is Thin (~95 Items)

USDA tier covers chicken, beef, eggs, butter, garlic, onion, tomato, and about 90 other basics. Everything else falls through.

**Fix:** Universal Price Intelligence spec expands to 500+ items.

### Gap 3: No Cross-Store Averaging (THE BIG ONE)

If an ingredient isn't at one store but is at 5 others, the system currently picks the single most recent price from any store. It doesn't average. The developer's insight: "If 10 grocery stores are in one town and one doesn't have an apple, average the apple price from the other 9 and use that as universal truth."

**Fix:** Universal Price Intelligence spec adds a REGIONAL_AVERAGE tier (materialized view averaging across all stores with at least 2 data points). This is the most impactful single change.

### Gap 4: Pi Sync Name Matching (Exact Only)

ChefFlow sends "sweet corn kernels frozen" to Pi. Pi's smart-lookup has fuzzy matching, but ChefFlow doesn't normalize names before sending. Creative ingredient names fail.

**Fix:** Universal Price Intelligence spec adds name normalization (strip "fresh", "organic", parentheticals, reorder words).

### Gap 5: Count-to-Weight Equivalents Missing

"1 bunch cilantro" at $2.99/bunch works. "1 bunch cilantro" at $0.25/oz fails (can't convert bunch to oz). The conversion engine knows count types but has no weight equivalents.

**Fix:** Universal Price Intelligence spec adds count_weight_grams to system_ingredients for common count units (bunch, head, can, clove, sprig, stick, each).

### Gap 6: Scaling Edge Cases (Minor)

Recipes without yield_quantity default to guest count (scale=1.0). This works for "serves N" recipes but not for "makes 1 batch of sauce." Family-style vs plated scaling isn't prompted.

**Fix:** Menu Cost Estimator spec surfaces yield as a visible field during recipe linking. Minor UX improvement, not structural.

---

## Build Order (Specs for Builder Agents)

### Phase 1: Universal Price Intelligence (SPEC READY)

**File:** `docs/specs/universal-price-intelligence.md`

This is the foundation. Without cross-store averaging and category baselines, the Menu Cost Estimator would show too many blanks. Build this first.

Deliverables:

- Cross-store average materialized view (regional_price_averages)
- Category baseline materialized view (category_price_baselines)
- Two new tiers in the resolution chain (REGIONAL_AVERAGE at 0.5 confidence, CATEGORY_BASELINE at 0.2)
- Count-to-weight equivalents seeded in system_ingredients
- Name normalization function for sync
- Expanded USDA baseline (95 -> 500+ items)

### Phase 2: Menu Cost Estimator (SPEC READY)

**File:** `docs/specs/menu-cost-estimator.md`

With the price intelligence foundation solid, this UI layer makes it usable. Chef pastes dish names, sees instant cost estimates with gap detection.

Deliverables:

- Standalone estimator page (/menus/estimate)
- Fuzzy dish-to-recipe matching (pg_trgm + token overlap)
- "Recipe needed" flags with one-click recipe creation
- Per-guest scaling from recipe yield
- Completeness dashboard (X/Y dishes costed, running total, food cost %)
- Menu editor sidebar integration

### Phase 3: Continued Pi Operations (ONGOING)

Not a spec, operational work:

- Deploy baseline price seeder to Pi (19 specialty items)
- Finish Market Basket catalog (currently at dept 12/22)
- Start Aldi, Stop & Shop, Shaws, Costco, BJ's, Whole Foods catalogs
- Integrate sub-department discovery (research done, breaks 1,000-item caps)
- Bridge runs after each walker, sync runs nightly

---

## Responding to Every Concern

### "Can I price out any menu, no matter what?"

**After Phase 1:** Yes, with honest confidence labels. Every ingredient gets a price through one of 10 tiers. The worst case is a category-level estimate (0.2 confidence, clearly labeled). The best case is a receipt you logged yourself (1.0 confidence). Most common ingredients will resolve at tier 3-5 (real store prices, 0.6-0.85 confidence) or tier 6 (cross-store average, 0.5 confidence).

### "Even if we don't have that exact item from that store?"

**After Phase 1:** Yes. The new REGIONAL_AVERAGE tier aggregates prices from ALL stores that carry the item. If Market Basket doesn't have saffron but Whole Foods, Hannaford, and Aldi do, you get the average of those three. If zero stores have it but it's a spice, you get the spice category median. You always get a number.

### "Will the system fail when breaking down menus into recipes?"

**Current state:** The menu hierarchy (menus -> dishes -> components -> recipes -> ingredients) is structurally sound. Sub-recipes work with circular reference protection. The auto-costing engine is verified. Unit conversion is wired in.

**Remaining limitation:** Recipes are manually created. If a chef pastes "Malai Kofta" and there's no recipe in their book, the system flags it as "Recipe needed." It will never generate a recipe (that's the chef's creative work). But the moment the chef creates the recipe with ingredients, costs auto-fill from the price database.

### "Is the structure perfect?"

**Honest answer:** The data model is solid. Menu -> dishes -> components -> recipes -> ingredients is the right hierarchy. The component layer (allowing one dish to have multiple recipe components) is architecturally correct for how chefs actually build dishes.

**What's not perfect:**

- Free-text units (recipe_ingredients.unit) allow typos. Mitigation: conversion engine normalizes common variations.
- Yield is optional. Mitigation: defaults to guest count, works for most cases.
- No forced recipe-to-dish linking. Mitigation: Menu Cost Estimator flags gaps clearly.

### "Is there anything else we can do?"

**Yes, but later (not in this build):**

1. **Vendor sheet import:** Parse restaurant vendor PDFs/CSVs to auto-populate prices (Tier 1 quality)
2. **Ordering recommendations:** "You're low on X, best price is $Y at Store Z"
3. **Price alerts:** "Salmon went up 15% this week at Hannaford"
4. **Cross-region expansion:** Same system for other states/regions
5. **Recipe suggestion from ingredients:** "You have these ingredients, here's what you can make" (requires chef opt-in, doesn't generate recipes)
6. **Bulk upload from past menus:** Import historical menus to build dish index faster

None of these block the core system. The core (price every ingredient, cost every menu, flag every gap) is fully spec'd and ready to build.

---

## Is It Going to Work?

Yes. Here's why:

1. **The hardest part is done.** Getting 43,000+ real store prices on the Pi, building the bridge, building the sync, building the 8-tier resolution chain, wiring unit conversion into the cost pipeline. That's months of infrastructure that's already running.

2. **The two specs fill the real gaps.** Cross-store averaging (the developer's key insight) and the Menu Cost Estimator UI are the missing pieces between "we have data" and "chefs can use it."

3. **The Pi runs 24/7 for free.** Catalog grows nightly. Every new store added multiplies the cross-store averaging quality. The system gets more accurate over time without additional cost.

4. **Honest labeling prevents false confidence.** Every price has a confidence score and source label. A chef seeing "Regional Average (3 stores), 50% confidence" knows it's an estimate. A chef seeing "Market Basket, 85% confidence" knows it's real. No lies, no blanks.

5. **The foundation scales to every cuisine.** Indian, French, Italian, Mexican, Japanese, Southern, food truck, restaurant, catering, food pantry. The system doesn't care about cuisine. It prices ingredients. If the ingredient exists in the database (and after Phase 1, every ingredient resolves to something), it gets costed. Period.

The developer built this because no one else has. Not Meez, not ChefTec, not Galley, not MarginEdge. They all require manual price entry. ChefFlow will be the first system where a chef can paste a menu and see real costs in seconds. That's the promise, and the infrastructure to deliver it exists right now.

---

## File Index

| Document                                        | Purpose                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `docs/specs/universal-price-intelligence.md`    | Spec for builder: cross-store averaging, category baselines, count equivalents, name normalization, USDA expansion |
| `docs/specs/menu-cost-estimator.md`             | Spec for builder: paste dish names, see instant costs with gap detection                                           |
| `docs/specs/auto-costing-engine.md`             | Already built and verified: unit conversion wiring, cascade chain, system ingredients                              |
| `docs/indian-dinner-costing-session.md`         | Session log: what was done for the Indian dinner inquiry example                                                   |
| `docs/research/instacart-subcategory-slugs.md`  | Research: how to break 1,000-item department cap for more catalog data                                             |
| `.openclaw-deploy/seed-baseline-prices.cjs`     | Ready to deploy: seeds 19 specialty baseline prices on Pi                                                          |
| `.openclaw-deploy/bridge-catalog-to-prices.mjs` | Deployed: bridges catalog data to legacy price format with smart matching                                          |
