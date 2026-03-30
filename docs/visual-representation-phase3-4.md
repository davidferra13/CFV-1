# Visual Representation - Phases 3B, 4A, 4C, 4D

**Date:** 2026-03-29
**Spec:** `docs/specs/visual-representation-strategy.md`

## What was built

### Phase 3B: Store Logo Map

- **`lib/constants/store-logos.ts`** - Static TypeScript map of ~39 store names to logo PNG paths in `public/images/stores/`. Includes national chains (Walmart, Kroger, Costco, etc.), New England regional (Stop & Shop, Market Basket, Hannaford), specialty/natural, restaurant supply, and online stores. Case-insensitive lookup via `getStoreLogo()`.
- **`components/pricing/price-attribution.tsx`** - Both compact and full modes now show a small store logo (14-16px) inline before the store name when a logo is available. Falls back to text-only when no logo matches.
- **`public/images/stores/`** - Directory created for PNG assets. The developer needs to populate with actual store logo PNGs (32x32 or 64x64, ~5KB each).
- **Action needed:** Drop store logo PNGs into `public/images/stores/` matching the filenames in the map (e.g., `walmart.png`, `stop-and-shop.png`).

### Phase 4A: Ingredient Detail Enhancement

- **`app/(chef)/inventory/ingredients/[id]/page.tsx`** - Added "Your Recipes Using This" section between the header and price chart. Queries `recipe_ingredients` joined with `recipes` to find all recipes containing the ingredient. Each recipe shows a thumbnail (from `photo_url`), name, and links to the recipe detail page.

### Phase 4C: Seasonal Palette Thumbnails

- **`app/(chef)/settings/repertoire/page.tsx`** - Server component now resolves ingredient names to their `image_url` and recipe IDs to their `photo_url` via batch queries. Passes `ingredientImageMap` and `recipeImageMap` to the client component.
- **`components/settings/seasonal-palette-list.tsx`** - Each season card now shows a row of up to 6 ingredient/recipe thumbnails (24x24) below the counts. Shows "+N" overflow indicator when more exist.

### Phase 4D: Partner Cover Images

- **`lib/entities/photo-actions.ts`** - Added `partner` entity config mapping to `referral_partners.cover_image_url`.
- **`components/entities/entity-photo-upload.tsx`** - Added `partner` to the entityType union.
- **`app/(chef)/partners/[id]/page.tsx`** - Compact cover image upload next to partner name in header.
- **`app/(chef)/partners/page.tsx`** - 40x40 cover image thumbnail (or initials fallback) on each partner card.

## Deferred phases

- **Phase 3D (Culinary Board)** - DEFERRED. `culinary_terms` table does not exist in production.
- **Phase 4B (Dashboard Photos)** - DEFERRED pending design review. Dashboard schedule widget is too compact.
