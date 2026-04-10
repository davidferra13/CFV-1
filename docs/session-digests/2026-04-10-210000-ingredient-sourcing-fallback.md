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

- "No substitutions found" state now appends `SourcingFallback` component.
- Shows "Buy the original" with live retailer results when no sub exists.

**Modified: `docs/CLAUDE-ARCHITECTURE.md`**

- Added rule `0d. Catalog Empty = Sourcing Fallback (PERMANENT)` with implementation pattern, surfaces implemented, surfaces pending, and reference code.

## Decisions Made

- DuckDuckGo HTML scraping over Brave Search API ($3/month) - free, zero setup, works.
- Location-aware queries: chef's home city/state appended to every search so results are regionally relevant.
- Pattern codified as a permanent architecture rule so all future surfaces get it automatically.
- `WebSourcingPanel` in `catalog-browser.tsx` is the reference implementation. Extract to `components/pricing/web-sourcing-panel.tsx` when a third surface needs it.

## Unresolved

- Grocery list sourcing fallback not yet built (next surface).
- Event costing ingredient matching dead-ends not yet wired.
- `WebSourcingPanel` is duplicated (catalog-browser + substitution-lookup). Extract to shared component when adding the third surface.
- Playwright UI verification blocked by pre-existing HSTS issue in dev server middleware (unrelated to this work).

## Context for Next Agent

- Build is green. Last push: `279a1499b` on `origin/main`.
- `lib/pricing/web-sourcing-actions.ts` is the single source of truth for web sourcing. Do not duplicate the DDG logic.
- Server-side verification confirmed: DDG returns live results for puntarelle (Instacart, Amazon Fresh) and ramp leaves (Instacart). Pattern is sound.
- Two pre-existing tsc errors in `lib/hub/integration-actions.ts` remain. Not related to this work.
- The next builder should extract `WebSourcingPanel` to a shared component before adding it to a third surface.
