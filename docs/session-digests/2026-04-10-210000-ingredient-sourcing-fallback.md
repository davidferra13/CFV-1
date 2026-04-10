# Session Digest: Ingredient Web Sourcing Fallback

**Date:** 2026-04-10 21:00 EST
**Agent type:** General (Sonnet 4.6)
**Duration:** ~1 session

## What Was Discussed

- Developer needed puntarelle for a dinner and could not find it in New England or in ChefFlow.
- Live research session: searched Portland ME, Maine, New England - nothing. Found it at Eataly Boston only after targeting the right retailer.
- Core insight: ChefFlow dead-ends silently when an ingredient is not in the catalog. This is a Zero Hallucination violation - the ingredient exists in the world, the app just doesn't know where.
- Decision: build a web sourcing fallback that fires automatically on any catalog empty state, using DuckDuckGo HTML scraping (free, no API key, location-aware).

## What Changed

**New file: `lib/pricing/web-sourcing-actions.ts`**

- Server action `searchIngredientOnline(query)` fetches DuckDuckGo HTML, parses `uddg`-encoded redirect URLs, filters to 10 trusted retailer domains.
- Location-aware: queries chef's `home_city` + `home_state` from `chef_preferences` and appends to search query.
- Results cached 1 hour per query. Auth-gated via `requireChef()`.
- Graceful: returns `{ source: 'error' }` on failure, caller shows static fallback.

**Modified: `app/(chef)/culinary/price-catalog/catalog-browser.tsx`**

- Empty state now renders `WebSourcingPanel` when search term has 2+ chars.
- `WebSourcingPanel`: fires `searchIngredientOnline` on mount, shows live retailer results with badges. Falls back to static deep-links (Eataly, Whole Foods, Instacart, Formaggio Kitchen, Amazon Fresh) if DDG returns nothing.

**Modified: `components/culinary/substitution-lookup.tsx`**

- "No substitutions found" state now renders `WebSourcingPanel` with label "Buy the original".

**New file: `components/pricing/web-sourcing-panel.tsx`**

- Shared component extracted so all surfaces use the same code.
- Props: `{ query: string; label?: string }`. Fires `searchIngredientOnline` on mount with cancellation. Shows live DDG results or static fallback grid.

**Modified: `components/culinary/ShoppingListGenerator.tsx`**

- Extracted `ShoppingListRow` component with per-row "Find it" toggle button.
- Appears when `supplier === 'Unassigned' && estimatedCostCents === 0 && toBuy > 0`.
- Clicking expands `<WebSourcingPanel query={item.ingredientName} label="Where to buy" />` inline below the row via `<tr colSpan={5}>`.

**Modified: `docs/CLAUDE-ARCHITECTURE.md`**

- Added rule `0d. Catalog Empty = Sourcing Fallback (PERMANENT)`.
- Surfaces list updated: shopping list now implemented. Event costing still pending.

## Decisions Made

- DuckDuckGo HTML scraping over Brave Search API ($3/month) - free, zero setup, works.
- Location-aware queries: chef's home city/state appended to every search so results are regionally relevant.
- Pattern codified as a permanent architecture rule so all future surfaces get it automatically.
- `WebSourcingPanel` extracted to `components/pricing/web-sourcing-panel.tsx` as the canonical shared component.

## Unresolved

- Event costing ingredient matching dead-ends not yet wired (only remaining 0d surface).
- Playwright UI verification blocked by pre-existing HSTS issue in dev server middleware (unrelated to this work).

## Context for Next Agent

- Build is green. All three rule-0d surfaces complete: catalog browser, substitution lookup, shopping list.
- `lib/pricing/web-sourcing-actions.ts` is the single source of truth for web sourcing. Do not duplicate DDG logic.
- `components/pricing/web-sourcing-panel.tsx` is the shared UI component. Import it, do not copy it.
- Server-side verified: DDG returns live results for puntarelle and ramp leaves. Pattern is sound.
- Two pre-existing tsc errors in `lib/hub/integration-actions.ts` remain. Not related to this work.
