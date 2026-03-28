# OpenClaw Price Surfacing - Build Report

**Date:** 2026-03-28
**Spec:** `docs/specs/openclaw-price-surfacing.md`
**Builder:** Claude Code

## What Was Built

### Phase 0: Foundation

- **Migration `20260401000110`**: Drops and recreates `idx_iph_openclaw_dedup` with `store_name` included, preventing multi-store syncs from silently overwriting each other.
- **Sync expansion** (`lib/openclaw/sync.ts`): V2 sync now writes ALL store prices from `result.all_prices` to `ingredient_price_history` (one row per store per ingredient per day). The `ingredients` table row still stores only the best price. ON CONFLICT clause updated to include `store_name`.
- **Schema update** (`lib/db/schema/schema.ts`): Added 5 enrichment columns to the `ingredients` table definition: `lastPriceSource`, `lastPriceStore`, `lastPriceConfidence`, `priceTrendDirection`, `priceTrendPct`.
- **tsconfig.json**: Excluded `lib/db/migrations` from TypeScript compilation (drizzle-kit introspect output has syntax issues unrelated to the app).

### Phase 1: Enriched Data in UI

- **`PriceAttribution` component** (`components/pricing/price-attribution.tsx`): New shared component showing price + store name + confidence dot + trend arrow + freshness indicator. Handles null/legacy data gracefully.
- **Recipe detail** (`app/(chef)/recipes/[id]/recipe-detail-client.tsx`): Added store attribution text ("at Stop & Shop") next to each ingredient's cost when enrichment data is present.
- **Ingredient library** (`app/(chef)/culinary/ingredients/page.tsx`): Replaced bare "Avg Price" column with `PriceAttribution` component showing store, confidence, and trend data.
- **Costing page** (`app/(chef)/culinary/costing/page.tsx`): Added "Freshness" column showing how recently prices were updated per recipe (color-coded: green for recent, amber for stale).
- **Query updates** (`lib/recipes/actions.ts`): Added 5 enrichment columns to `getRecipeById()` ingredient join SELECT. Added `last_price_updated_at` to `RecipeListItem` type and `getRecipes()` cost data fetch.

### Phase 2: OpenClaw-First Grocery Quote

- **`getLocalPriceComparison()`** (`lib/grocery/pricing-actions.ts`): New server action that queries `ingredient_price_history` for recent OpenClaw data (last 30 days), grouped by store, sorted cheapest first.
- **`runGroceryPriceQuote()` rewrite**: Now checks local OpenClaw data first. External APIs (Spoonacular, Kroger, MealMe) only called for ingredients without OpenClaw coverage. Logs when API fallback is used.
- **Panel UI update** (`components/events/grocery-quote-panel.tsx`): Updated description text, loading message, and source legend to reflect OpenClaw-first approach.

### Phase 3: Admin Catalog

- **Catalog server actions** (`lib/openclaw/catalog-actions.ts`): `searchCatalog()`, `getCatalogStats()`, `getCatalogItemPrices()` - all admin-only, calling the Pi directly for the full 9,000+ ingredient catalog.
- **Catalog tab component** (`app/(admin)/admin/price-catalog/catalog-tab.tsx`): Full browsing UI with stats bar, category chips, debounced search, priced-only toggle, paginated results table, expandable row details showing all store prices.
- **Price catalog integration**: Added 6th "Catalog" tab to `price-catalog-client.tsx`.
- **Nav config**: Added "Price Catalog" to admin nav with `adminOnly: true` and `Store` icon.

## Pre-Existing Issues Noted

- **Costing page error**: "Objects are not valid as a React child (found: object with keys {get_unread_notification_count})" - this is a bug in `NotificationsUnreadBadge` that crashes the layout. Present in both BEFORE and AFTER screenshots. Unrelated to this spec.
- **TypeScript errors**: Several pre-existing errors in `lib/compliance/insurance-actions.ts`, `lib/social/chef-social-actions.ts`, `lib/db/schema/schema.ts` (missing `users` reference), and `lib/db/schema/relations.ts`. None introduced by this build.

## Files Changed

| File                                                         | Change                                              |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `database/migrations/20260401000110_iph_dedup_add_store.sql` | New migration                                       |
| `lib/openclaw/sync.ts`                                       | Multi-store sync expansion                          |
| `lib/db/schema/schema.ts`                                    | 5 enrichment columns added                          |
| `components/pricing/price-attribution.tsx`                   | New component                                       |
| `lib/recipes/actions.ts`                                     | Enrichment columns in queries + RecipeListItem type |
| `app/(chef)/culinary/costing/page.tsx`                       | Freshness column                                    |
| `app/(chef)/culinary/ingredients/page.tsx`                   | PriceAttribution integration                        |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`           | Store attribution                                   |
| `lib/grocery/pricing-actions.ts`                             | OpenClaw-first + getLocalPriceComparison            |
| `components/events/grocery-quote-panel.tsx`                  | Updated copy for OpenClaw-first                     |
| `lib/openclaw/catalog-actions.ts`                            | New catalog server actions                          |
| `app/(admin)/admin/price-catalog/catalog-tab.tsx`            | New catalog tab                                     |
| `app/(admin)/admin/price-catalog/price-catalog-client.tsx`   | Added catalog tab                                   |
| `components/navigation/nav-config.tsx`                       | Price Catalog nav entry                             |
| `components/onboarding/recipe-entry-form.tsx`                | RecipeListItem type fix                             |
| `tsconfig.json`                                              | Excluded drizzle migrations dir                     |
| `docs/specs/openclaw-price-surfacing.md`                     | Status updated to built                             |
