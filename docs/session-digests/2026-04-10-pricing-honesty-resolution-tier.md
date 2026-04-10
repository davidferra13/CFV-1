# Session Digest: Pricing Honesty - Resolution Tier + Crash-Free Misspellings

**Date:** 2026-04-10
**Agent:** Builder (Claude Opus 4.6)
**Duration:** ~1 session
**Task:** Make the nationwide pricing engine honest. Stop silent locality hallucinations. Stop misspelling crashes. Surface real resolution tier in all pricing UI.
**Commit:** `33ec419f4`

## What Was Discussed

- Hard validation question: can ANY US food ingredient at any ZIP return a valid, location-aware price? Answer: NO, with 7 crashes and silent `zip_local` lies on multi-location queries.
- Strategy A in `lookupPrice` was reading `ingredient_price_history` with no tenant filter and no geographic filter, returning cross-tenant receipt data labeled `zip_local`. This is both a data leak and a Zero Hallucination violation.
- Olive oil in MA/CA/TX/AK/HI returned identical prices (1674c/unit) all labeled `zip_local`. The data was the same cross-tenant row used for every query.
- 7 of 30 edge-case queries crashed because `plainto_tsquery` throws on certain misspelled single tokens, and no error handling existed around the FTS call.
- `PriceBadge` was missing `market_aggregate` and `wholesale` in `sourceLabel`, silently rendering as empty string.

## What Changed

**`lib/pricing/resolve-price.ts`**

- Added `ResolutionTier` union type (10 values: `chef_receipt | wholesale | zip_local | regional | market_state | market_national | government | historical | category_baseline | none`).
- Added `resolutionTier: ResolutionTier` to `ResolvedPrice` interface.
- Added `tierForReceiptSource(source, storeName, preferredState)` helper.
- Populated `resolutionTier` at every `withDecay()` return site in both `resolvePrice` and `resolvePricesBatch`.
- `market_aggregate` tier distinguishes `market_state` vs `market_national` based on whether the store set covers the requested state.

**`lib/pricing/universal-price-lookup.ts`**

- Added `LookupResolutionTier` type and `resolution_tier` + `suggestion` fields to `PriceLookupResult`.
- Added `safely<T>(label, fn)` wrapper: every DB strategy is try/caught, failures degrade gracefully instead of crashing.
- Added `searchProductPricesTrigram` fallback using `pg_trgm` similarity > 0.35 for when FTS returns zero rows (handles misspellings).
- **Deleted Strategy A entirely**: the cross-tenant `ingredient_price_history` read with no geographic filter. Data leak closed.
- Added Strategy C2: no-ZIP national product search as the fallback when no ZIP is provided.
- Every return site now emits honest `resolution_tier` via `tierFromScope()`.

**`components/pricing/price-badge.tsx`**

- Imported `ResolutionTier`.
- Fixed `sourceLabel`: added missing `wholesale` and `market_aggregate` cases.
- Added `tierLabel`, `tierColor`, `tierTooltipText` functions.
- Both compact and full render paths now show the tier prominently with tooltip.

**`scripts/price-edge-stress.mjs`** (new)

- 30-query edge-case harness: common, rural, obscure, branded, vague, misspell, multi-location categories.
- Asserts `crashed === 0` and `invalidTier === 0` as hard exits.
- Reports tier distribution so scraping priority is data-driven, not guesswork.

## Decisions Made

- Resolution tier is the honest source-of-truth metadata for every price. The UI shows it; chefs can see at a glance whether they're looking at their own receipt data, local store data, or a national estimate.
- The tier distribution from real query runs is the data-acquisition queue for future scraping work. 26/30 queries returning `national_median` shows exactly how much store-level coverage is missing.
- No crowdsourced data strategy. OpenClaw builds the database; chefs don't contribute core pricing data.

## Unresolved

- The 2 `none` results (fiddleheads, sea urchin) have no USDA baseline and no product match even via trigram. Valid outcome; these are genuinely obscure. The `suggestion` field surfaces a near neighbor when one exists.
- `lib/hub/integration-actions.ts` has 2 pre-existing implicit-any tsc errors (unrelated, pre-date this session). Not a blocker for build.
- Store-level geographic coverage is sparse. Most queries fall through to `national_median`. Future scraping sessions should prioritize ZIP-level store data to push results toward `zip_local` and `regional`.

## Context for Next Agent

- Build is green. `33ec419f4` is on `origin/main`.
- The pricing types are stable. `PriceBadge`, `resolvePrice`, and `lookupPrice` all agree on `ResolutionTier` shape.
- The stress test at `scripts/price-edge-stress.mjs` is the regression harness for any future pricing changes. Run it before touching pricing files.
- The developer opened `docs/chef-navbar-full-report-google-doc.md` at session end. That may signal upcoming navbar work. Wait for explicit instruction before starting.
- The two pre-existing tsc errors in `lib/hub/integration-actions.ts` are the only non-green thing in the repo. They predate this session and are unrelated to pricing.
