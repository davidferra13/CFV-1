# Culinary Operations

**What:** Recipes, menus, ingredients, costing, prep. The chef's craft, digitized.

**Routes:** `/menus`, `/recipes`, `/ingredients`, `/components`, `/costing`, `/prep`, `/vendors`, `/inventory`, `/culinary-board`, `/culinary/dictionary`, `/radar`, `/seasonal-palettes`
**Key files:** `app/(chef)/recipes/`, `app/(chef)/menus/`, `lib/pricing/resolve-price.ts`
**Status:** DONE

## What's Here

- Menus: library, detail view, drag-drop dish editor, event usage history, pricing, public Sample Menus toggle with first-dish photo card cue
- Menu intelligence sidebar: legacy taste-summary shape preserved for the existing UI, but client taste and dietary conflict sections now read CP-Engine profile vectors when available, including hard veto, severe dislike, and ambiguity overlap detection; absent cleanly when `client_profile_*` tables are missing
- Recipes: full detail with ingredients, yield, nutrition (AI), technique tags, photos, cost breakdown, scaled ingredient lists. Manual entry only (AI never generates recipes)
- Ingredients: master list, cost history, sustainability, allergen classification (FDA Big 9)
- Culinary Dictionary: canonical culinary terms, ingredient aliases, safety flags, public-safe definitions, and chef review queue
- Culinary Radar: source-backed recalls, outbreaks, farmers market and local sourcing signals, opportunities, sustainability, craft, and business signals matched to the chef's data. The cron runner ingests approved FDA, FSIS, CDC, USDA Farmers Market Directory, WCK, Worldchefs, and IFT signals, records source health, creates chef-scoped matches, feeds Dashboard, Morning Briefing, Daily Ops urgent alerts, and Remy read-only commands, and supports read, dismiss, category preference, usefulness feedback, source trust, task creation, local lead saving, and market calendar note state.
- Price Catalog: 15K+ items from OpenClaw, 10-tier price resolution chain
- Components: pre-prep elements with quantities and cost
- Costing: per-event menu cost breakdown, per-guest, historical trending
- Prep: timeline manager with active timers, countdowns, station assignments, alerts
- Vendors: supplier list, contact, pricing, order history
- Inventory: on-hand stock, reorder alerts, movement log
- Culinary Board: kanban (brainstorm > design > test > approved)
- Seasonal Palettes: seasonal ingredient/dish curation

## Recipe Scaling Engine (2026-04-18)

Central deterministic engine replacing 5 duplicated linear formulas. Handles:

- Service style multipliers (buffet +25%, cocktail -25%, etc.)
- Category-aware scaling (spices sublinear, oils by-pan, fixed items stay constant)
- Waste buffer (3-15% by service style)
- Pack rounding (whole units for count items, 0.25 for weight, 0.5 for volume)
- Yield inference (estimates serving count from protein weight when yield_quantity is NULL)
- Purchase feedback (suggests recipe qty adjustments when chef consistently over-buys)

Key files: `lib/scaling/recipe-scaling-engine.ts`, `lib/scaling/yield-inference.ts`, `lib/scaling/purchase-feedback.ts`

## Open Items

- UI for purchase feedback suggestions on recipe detail page
- UI for price flag review (accept/reject flagged prices)
