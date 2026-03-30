# Spec: Visual Representation Strategy (Images Across ChefFlow)

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** showcase-image-upload.md (verified), portfolio-upload-fix.md (verified)
> **Estimated complexity:** large (30+ files across 4 phases)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)
> **Deferred:** Phase 3D (culinary_terms table missing), Phase 4B (dashboard too compact)

---

## What This Does (Plain English)

ChefFlow gets a comprehensive visual upgrade across every major surface. Anywhere the app displays a thing that has a real-world visual identity (an ingredient, a vendor, a client, a restaurant, a piece of equipment), the UI shows a real image, a sourced logo, or a meaningful visual fallback instead of plain text. This is not decoration; it's how chefs think. A chef staring at a list of ingredients sees dishes. Giving them actual photos of those ingredients, clickable for detail and inspiration, transforms a data table into a creative workspace.

The strategy has four phases: wire up what already exists, add new upload surfaces, source images from external systems via OpenClaw, and polish dashboard/detail views with contextual visuals.

Additionally, the "Price Catalog" is renamed to "Food Catalog" across all UI surfaces and nav labels. It's not just prices; it's a browsable food reference.

---

## Why It Matters

ChefFlow has 200K+ directory listings with no photos, 15K+ catalog items where images exist but aren't bridged to the chef's ingredient library, recipe pages where dish photos are supported but rarely present, and dozens of surfaces where text-only lists make the app feel like a spreadsheet. Visual recognition is faster than reading. A chef scanning a client list, a vendor directory, or a shopping list benefits from even small thumbnails. The food directory without photos is a phone book. With photos, it's a discovery tool.

The ingredient photo concept goes deeper: chefs think visually. The developer describes scrolling Instagram hashtags for ingredient inspiration. Making ingredients clickable visual objects (photo, season, pairings) turns the ingredient library from a price tracker into a creative springboard.

---

## Phase Overview

| Phase | Name                 | Scope                                     | What It Covers                                                                                                    |
| ----- | -------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **1** | Quick Wins           | Wire existing data                        | Expense receipt thumbnails, event card photos, menu card dish photos, bridge catalog images to ingredient library |
| **2** | New Upload Surfaces  | Add image upload to entities that lack it | Client avatars, staff photos, vendor logos, equipment photos, ingredient photos                                   |
| **3** | External Sourcing    | OpenClaw cartridge + API integrations     | Directory listing images, ingredient product photos, store logos, culinary board technique photos                 |
| **4** | Polish & Inspiration | Contextual visuals + ingredient discovery | Dashboard widget photos, seasonal palette visuals, ingredient detail/inspiration view, partner cover images       |

---

## Phase 1: Quick Wins (Wire Existing Data)

### 1A. Bridge Catalog Images to Chef's Ingredient Library

**Problem:** The OpenClaw price catalog (`CatalogItemV2`) already has `imageUrl` for 15K+ items. The chef's ingredient library (`ingredients` table) has no image column. When a chef adds "zucchini" to their recipe, they see plain text, even though the catalog has a photo of zucchini.

**Solution:**

1. Add `image_url TEXT` column to `ingredients` table (migration, additive)
2. When displaying an ingredient anywhere in the app, resolve the image:
   - First: check `ingredients.image_url` (chef-uploaded or manually set)
   - Second: fuzzy-match against OpenClaw catalog items by name and pull `imageUrl`
   - Third: fall back to `ImageWithFallback` category icon (already exists)
3. Create a server action `resolveIngredientImage(ingredientId)` that does the catalog lookup and caches the result in `ingredients.image_url` so subsequent renders are instant
4. Add a batch action `enrichIngredientImages()` that runs the lookup for all unimaged ingredients at once (admin button on ingredients page)

**Database Change:**

```sql
ALTER TABLE ingredients ADD COLUMN image_url TEXT;
```

**Files to modify:**
| File | Change |
|------|--------|
| `app/(chef)/culinary/ingredients/page.tsx` | Add small thumbnail (32x32) in ingredient table rows, "Enrich Images" admin button |
| `app/(chef)/recipes/ingredients/ingredients-client.tsx` | Add thumbnail column to table |
| `components/pricing/image-with-fallback.tsx` | Reuse as-is (already handles null src gracefully) |
| `lib/culinary/ingredient-actions.ts` (or similar) | Add `resolveIngredientImage()` and `enrichIngredientImages()` server actions |

**Where ingredient images appear after this change (non-invasive placement):**

| Surface                                                | Image Size        | Behavior                                            |
| ------------------------------------------------------ | ----------------- | --------------------------------------------------- |
| Ingredients table (`/culinary/ingredients`)            | 32x32 thumbnail   | Inline in name column, before text                  |
| Recipe ingredient list (recipe detail)                 | 24x24 thumbnail   | Small icon next to ingredient name, click to expand |
| Menu shopping list                                     | 28x28 thumbnail   | Inline in list rows                                 |
| Menu breakdown tree                                    | None (too dense)  | Skip; tree structure is already visually complex    |
| Grocery quote comparison                               | 32x32 thumbnail   | In the ingredient name column                       |
| Consolidated shopping list                             | 28x28 thumbnail   | Inline in list rows                                 |
| Ingredient detail page (`/inventory/ingredients/[id]`) | 200x200 hero      | Large image at top of detail view                   |
| Travel ingredients panel                               | None (compact)    | Skip; status badges take priority                   |
| Unused ingredients log                                 | None (form-heavy) | Skip; it's a data entry form                        |

**Rule: If the surface is dense, compact, or form-heavy, skip the image. If it's a browsable list or a detail view, add the image.**

### 1B. Expense Receipt Thumbnails

**Problem:** Expense receipts can be uploaded via the receipt capture flow, but the expense list (`/expenses`) shows no thumbnails. The image exists in storage.

**Solution:** On expense cards/rows, show a small receipt thumbnail (40x40, rounded) when a receipt photo exists. Click to expand.

**Files to modify:**
| File | Change |
|------|--------|
| `app/(chef)/expenses/page.tsx` (or expense list component) | Add optional thumbnail column |
| Expense row/card component | Render receipt thumbnail if `receipt_photo_url` exists. MUST use `getReceiptUrl()` from `lib/expenses/receipt-upload.ts` for signed URL (private bucket). |

### 1C. Event Card Photos

**Problem:** The events list (`/events`) is a text-only table. Completed events may have gallery photos. Events with menus have dish photos. None are shown.

**Solution:** Add a small thumbnail (48x48, rounded) to event list rows:

- Completed events: first photo from `event_photos` gallery
- Events with menu: first dish photo from the menu's dishes
- No photo available: colored dot with event status (existing behavior, no change)

**Files to modify:**

| File                                                               | Change                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/events/page.tsx` (EventsList component, lines 105-192) | Add thumbnail column to table                                                                                                                                                                                       |
| `lib/events/actions.ts` (`getEvents()`)                            | Add LEFT JOIN to `event_photos` (first by `display_order`) or subquery for first dish photo via events -> menus -> dishes. Current query is `select('*, client:clients(id, full_name, email)')` with NO photo join. |

**Query guidance:** Event photos are in `event_photos` table (private bucket, requires signed URLs via storage). Dish photos are in `dishes.photo_url` (public bucket, direct URL). Priority: event gallery photo first, dish photo fallback.

### 1D. Menu Card Dish Photos

**Problem:** Menu cards on `/menus` don't show food visuals. Each menu has courses with dishes that may have `photo_url`.

**Solution:** Menu cards show the first available dish photo as a small hero banner (16:9, 200px wide) at the top of the card. If no dish has a photo, show the existing card design (no change).

**Files to modify:**

| File                                                                            | Change                                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/menus/menus-client-wrapper.tsx` (MenuCard component, lines 114-200) | Add dish photo hero to card. NOTE: NOT `/culinary/menus/` which is a redirect.                                        |
| `lib/menus/actions.ts` (`getMenus()`, lines 333-362)                            | Add subquery for first dish with non-null `photo_url` per menu. Current query selects menu fields only, NO dish join. |

### 1E. Rename "Price Catalog" to "Food Catalog"

**Problem:** The page is called "Price Catalog" but it's a full food reference with images, nutrition data, store availability, and more. "Price Catalog" undersells it.

**Solution:** Rename in all UI-facing text:

- Nav label: "Price Catalog" -> "Food Catalog"
- Page title/heading
- Any breadcrumbs or references in other pages
- Keep the route as `/culinary/price-catalog` (don't break URLs)
- Keep file names as-is (internal, not user-facing)

**Files to modify:**
| File | Change |
|------|--------|
| `components/navigation/nav-config.tsx` | Change label text |
| `app/(chef)/culinary/price-catalog/page.tsx` | Change page title |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Change any heading text |
| Any breadcrumb or cross-reference in other pages | Update text references |

---

## Phase 2: New Upload Surfaces

### 2A. Client Avatars

**Problem:** Client list and client detail are text-only. No visual identity for clients.

**Solution:**

1. Add `avatar_url TEXT` column to `clients` table (migration)
2. Client portal: clients can upload their own photo
3. Chef side: chef can upload a photo for a client (from the client detail page)
4. Client list: show 32x32 circular avatar (or initials fallback, matching the existing `Avatar` component pattern)
5. Client detail header: show 64x64 avatar

**Database Change:**

```sql
ALTER TABLE clients ADD COLUMN avatar_url TEXT;
```

**Files to modify:**
| File | Change |
|------|--------|
| Client list page/component | Add avatar column |
| Client detail page | Add avatar display + upload in header |
| Client portal pages | Add avatar upload option |
| `components/ui/avatar.tsx` | Reuse existing component (already handles fallback) |

### 2B. Staff Member Photos

**Problem:** Staff list is text-only. When building an event team, faces help.

**Solution:**

1. Add `photo_url TEXT` column to `staff_members` table (migration)
2. Staff detail: upload photo
3. Staff list: show 32x32 circular avatar
4. Event staff panel: show avatars next to staff names

**Database Change:**

```sql
ALTER TABLE staff_members ADD COLUMN photo_url TEXT;
```

### 2C. Vendor Logos

**Problem:** Vendor directory is text-only. Vendor logos are publicly available and instantly recognizable.

**Solution:**

1. Add `logo_url TEXT` column to `vendors` table (if not exists, or use existing table structure)
2. Vendor list: show 32x32 logo (or initials fallback)
3. Vendor detail: show larger logo
4. Anywhere a vendor name appears with attribution (price catalog store names, ingredient vendor notes): show tiny logo (16x16) inline

**Database Change:**

```sql
ALTER TABLE vendors ADD COLUMN logo_url TEXT;
```

### 2D. Equipment Photos

**Problem:** Equipment inventory is text-only. Photos help staff identify specific items.

**Solution:**

1. Add `photo_url TEXT` column to `equipment_items` table (migration `20260401000122`)
2. Equipment list: show 48x48 thumbnail
3. Equipment detail: show larger photo
4. Upload via equipment edit form

**NOTE:** The original migration (000121) targeted `equipment_inventory` which does not exist. The correct table is `equipment_items` (`types/database.ts:15668`). A fix migration (000122) has been applied.

**Database Change:**

```sql
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### 2E. Chef-Uploaded Ingredient Photos

**Problem:** The catalog bridge (Phase 1A) covers most ingredients, but chefs may want to upload their own photos (e.g., a specific farm's heirloom tomatoes look different from generic ones).

**Solution:**

1. The `image_url` column added in Phase 1A supports manual uploads
2. Add an upload button to the ingredient detail page (`/inventory/ingredients/[id]`)
3. Chef-uploaded photos take priority over catalog-sourced images
4. Use the existing `DishPhotoUpload` component pattern (compact mode, 64x64)

---

## Phase 3: External Sourcing (OpenClaw Cartridge + APIs)

### 3A. Food Directory Images (OpenClaw Cartridge) - THE BIG ONE

**Problem:** 200K+ directory listings with almost zero photos. OSM doesn't include images. This is the biggest visual gap in the entire app.

**Solution:** Create a dedicated OpenClaw cartridge for directory image sourcing.

**Cartridge scope:**

- Source: Google Places Photos API, Yelp API, business websites (meta og:image), Facebook pages
- Target: `directory_listings.photo_urls` array (column already exists)
- Process: For each listing with empty `photo_urls`, query by business name + city + state, pull up to 3 images, store URLs
- Priority: Start with listings that have been viewed (analytics), then by state population density
- Rate limiting: Respect API quotas, process in batches overnight via Pi cron
- Storage: Store images locally (download and serve from ChefFlow storage) to avoid hotlinking and broken external URLs
- Fallback: If no photo found, try to grab the business's logo/favicon from their website

**This is an OpenClaw job, not a ChefFlow build.** The ChefFlow side is already wired (listing cards display `photo_urls[0]` when available). The cartridge just needs to populate the data.

**OpenClaw cartridge spec (separate document):**
| Field | Value |
|-------|-------|
| Cartridge name | `directory-images` |
| Input | `directory_listings` rows where `photo_urls IS NULL OR photo_urls = '{}'` |
| Output | Updated `photo_urls` array per listing |
| APIs | Google Places Photos, Yelp Business Photos, og:image scraping |
| Schedule | Nightly batch on Pi, 1000 listings per run |
| Priority queue | Listings with page views first, then by state |

### 3B. Store Logos for Food Catalog

**Problem:** The food catalog shows store names as text. Seeing the Kroger logo, the Whole Foods logo, etc. makes scanning faster.

**Solution:**

1. Create a `store_logos` lookup table or static map (there are only ~39 stores in the catalog)
2. Map store names to logo URLs (publicly available brand assets)
3. Show 16x16 logo inline next to store names in the food catalog, price attribution, and store scorecard
4. This is a static/manual mapping, not a scraping job. 39 stores = 39 logos, done once.

**Implementation:** A static TypeScript map is simpler than a DB table for 39 entries:

```ts
const STORE_LOGOS: Record<string, string> = {
  Kroger: '/images/stores/kroger.png',
  'Whole Foods': '/images/stores/whole-foods.png',
  // ... 37 more
}
```

Store logo image files go in `public/images/stores/` (small PNGs, ~5KB each).

### 3C. Ingredient Product Photos via OpenClaw

**Problem:** The catalog has `imageUrl` for many items, but coverage isn't 100%. Some items have no image.

**Solution:** Add image sourcing to OpenClaw's existing price scraping pipeline:

- When scraping a product from a store website, also grab the product image URL
- Store in the catalog item's `imageUrl` field
- This incrementally improves coverage over time as prices are refreshed

**This extends the existing OpenClaw price scraping cartridge, not a new cartridge.**

### ~~3D. Culinary Board Technique Photos~~ (DEFERRED)

**BLOCKED:** The `culinary_terms` table does not exist in production. The culinary board page (`/culinary-board`) is experimental and only exists in agent worktrees, not in the deployed app. This phase cannot be built until the culinary board ships as a production feature. Revisit when that happens.

---

## Phase 4: Polish & Inspiration

### 4A. Ingredient Detail & Inspiration View

**This is the bigger vision the developer described.** When a chef clicks on an ingredient (e.g., zucchini), they don't just see a price and a unit. They see:

1. **Hero photo** of the ingredient (from catalog bridge or chef upload)
2. **Seasonal info** (which months it's in season, peak season highlighted)
3. **Your recipes using this ingredient** (linked from recipe_ingredients)
4. **Price trend** (existing chart, already built)
5. **Vendor availability** (existing panel, already built)
6. **Allergen/dietary flags** (existing data)
7. **Pairings or related ingredients** (future: could be AI-suggested, but even a static "commonly paired with" list based on co-occurrence in the chef's own recipes would be valuable)

**This transforms the ingredient detail page from a price tracker into a creative reference card.** The photo is the anchor. Everything else orbits around it.

**Route:** `/inventory/ingredients/[id]` (existing page, enhanced)

**Files to modify:**
| File | Change |
|------|--------|
| `app/(chef)/inventory/ingredients/[id]/page.tsx` | Add hero image, seasonal badge, recipe usage list, richer layout |
| Ingredient server actions | Add query for recipes using this ingredient |

**What this is NOT:**

- Not an Instagram feed
- Not AI-generated content
- Not a recipe suggestion engine
- It's a reference card. Photo, facts, your own usage history. Simple. Useful.

### 4B. Dashboard Widget Photos (DEFERRED - needs design review)

**Problem:** "Today's Schedule" and "Week Strip" widgets are pure text/color. A small dish photo from the event's menu adds visual context.

**CONCERN:** The schedule widget (`dashboard/_sections/schedule-cards.tsx:44-160`) is already compact: time, occasion, client, guests, weather. Adding images may violate the non-invasive rule. The widget shows 1-3 events and is information-dense.

**Solution (if approved after design review):**

- Today's Schedule widget: show a 48x48 dish photo from the event's menu (first dish with a photo)
- Week Strip: show a tiny 24x24 thumbnail on event day cells (if available)
- If no photo exists, no change (don't add a placeholder here; the widget is already dense)

### 4C. Seasonal Palette Visuals

**Problem:** Seasonal palettes (`/settings/repertoire`) list ingredients and dishes by season as text. Photos of in-season ingredients would make the palette feel alive.

**Solution:**

- When listing ingredients in a seasonal palette, show the ingredient's image (from Phase 1A bridge) as a small thumbnail
- When listing proven wins (recipes), show the recipe's dish photo
- These images already exist after Phase 1A and 2E; this phase just wires them to the palette display

### 4D. Partner Cover Images

**Problem:** `referral_partners.cover_image_url` column exists but most partners probably have no image uploaded.

**Solution:**

- Partner list: show 48x48 cover image or logo (or initials fallback)
- Partner detail: show larger cover image
- Add upload UI to partner edit form (similar to vendor logo upload)
- For venue partners: encourage photo upload of the venue (this is marketing material the chef wants anyway)

---

## Database Changes (All Phases Combined)

### Migration (Single File)

```sql
-- Phase 1A: Ingredient images
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Phase 2A: Client avatars
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Phase 2B: Staff photos
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Phase 2C: Vendor logos
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Phase 2D: Equipment photos (CORRECTED: was equipment_inventory, which doesn't exist)
-- See migration 20260401000122_equipment_items_photo_url.sql
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Phase 3D: DEFERRED (culinary_terms table does not exist yet)
```

### Migration Notes

- All columns are nullable TEXT (URLs), no constraints
- All additive, no data loss risk
- Migration filename must be checked against existing files in `database/migrations/` (timestamp collision rule)
- The `directory_listings.photo_urls` and `referral_partners.cover_image_url` columns already exist; no migration needed for those
- **Migration 000121** targeted `equipment_inventory` (doesn't exist, wrapped in IF EXISTS so no harm). **Migration 000122** fixes this by targeting `equipment_items` (the real table). Both have been applied.

---

## Server Actions (New)

| Action                                          | Auth            | Phase | Purpose                                                    |
| ----------------------------------------------- | --------------- | ----- | ---------------------------------------------------------- |
| `resolveIngredientImage(ingredientId)`          | `requireChef()` | 1A    | Lookup catalog match, cache image URL to ingredients table |
| `enrichIngredientImages()`                      | `requireChef()` | 1A    | Batch resolve images for all unimaged ingredients          |
| `uploadClientAvatar(clientId, formData)`        | `requireChef()` | 2A    | Upload client photo, store in `client-avatars` bucket      |
| `removeClientAvatar(clientId)`                  | `requireChef()` | 2A    | Remove client avatar                                       |
| `uploadStaffPhoto(staffId, formData)`           | `requireChef()` | 2B    | Upload staff photo                                         |
| `uploadVendorLogo(vendorId, formData)`          | `requireChef()` | 2C    | Upload vendor logo                                         |
| `uploadEquipmentPhoto(equipmentId, formData)`   | `requireChef()` | 2D    | Upload equipment photo                                     |
| `uploadIngredientPhoto(ingredientId, formData)` | `requireChef()` | 2E    | Manual ingredient photo upload (overrides catalog)         |

All upload actions follow the same pattern as `uploadChefLogo()` in `lib/chef/profile-actions.ts`:

- Validate MIME type and size
- Strip EXIF via sharp
- Convert HEIC to JPEG
- Store to appropriate bucket
- Update DB column
- Clean up previous file
- Revalidate affected paths

---

## UI / Component Spec

### Shared Pattern: Inline Thumbnail

For table rows and list items, use a consistent pattern:

```tsx
// 32x32 thumbnail with rounded corners, before the text
<div className="flex items-center gap-2">
  <ImageWithFallback
    src={item.imageUrl}
    alt={item.name}
    category={item.category}
    className="h-8 w-8 rounded object-cover"
  />
  <span>{item.name}</span>
</div>
```

The existing `ImageWithFallback` component already handles:

- Actual image display when `src` is available
- Category-specific SVG icon fallback when no image
- Graceful error handling on load failure

### States

- **Loading:** Skeleton pulse rectangle matching thumbnail dimensions
- **No image, known category:** Category SVG icon (existing behavior in `ImageWithFallback`)
- **No image, unknown category:** Generic food icon or initials circle
- **Image available:** Actual photo with `object-cover` crop
- **Image load error:** Fall back to category icon (existing behavior)

### Non-Invasive Rule

Images are added to surfaces where they aid scanning and recognition. They are NOT added to:

- Dense tree structures (menu breakdown)
- Form inputs (editing mode)
- Compact mobile-only panels (travel ingredients)
- Financial tables (ledger, payments, invoices)
- Settings pages
- Notification/queue items

If a surface has fewer than 4 items per screen, thumbnails aren't needed. If a surface has 10+ items per screen, thumbnails help scanning.

---

## Edge Cases and Error Handling

| Scenario                                              | Correct Behavior                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Catalog image URL is broken/404                       | `ImageWithFallback` shows category icon. No error toast.                                 |
| Chef uploads ingredient photo, catalog also has one   | Chef upload wins (stored in `ingredients.image_url`, takes priority over catalog lookup) |
| Ingredient name doesn't match any catalog item        | No image resolved; show category icon fallback                                           |
| Batch enrichment finds matches for 80/200 ingredients | Show success: "80 images found, 120 ingredients had no match." No error for unmatched.   |
| Store logo missing from static map                    | Show store name as text (no broken image). Add to map later.                             |
| Directory listing has broken external photo URL       | Show letterform fallback (existing behavior). OpenClaw should download and self-host.    |
| Client hasn't uploaded avatar                         | Show initials circle (existing Avatar component behavior)                                |
| Equipment photo is portrait orientation               | `object-cover` crops to square thumbnail. Acceptable.                                    |

---

## Verification Steps

### Phase 1 Verification

1. Navigate to `/culinary/ingredients`. Verify thumbnails appear for ingredients that have catalog matches.
2. Navigate to a recipe detail page. Verify small ingredient thumbnails appear in the ingredients list.
3. Navigate to `/expenses`. Verify receipt thumbnails appear on expenses that have receipts.
4. Navigate to `/events`. Verify event cards show a photo thumbnail where gallery/dish photos exist.
5. Navigate to `/menus`. Verify menu cards show a dish photo hero where available.
6. Navigate to `/culinary/price-catalog`. Verify the page title says "Food Catalog" not "Price Catalog".
7. Check nav sidebar. Verify the label says "Food Catalog".

### Phase 2 Verification

8. Navigate to `/clients`. Verify avatar column appears (initials for clients without photos).
9. Upload a client avatar from client detail. Verify it appears in the list.
10. Navigate to `/staff`. Verify photo column appears.
11. Navigate to vendors page. Verify logo column appears.
12. Navigate to equipment page. Verify photo column appears.
13. Upload an ingredient photo manually. Verify it overrides the catalog-sourced image.

### Phase 3 Verification

14. After OpenClaw directory-images cartridge runs, verify listing cards show actual business photos.
15. Verify store logos appear inline next to store names in food catalog.
16. Verify culinary board terms show technique photos where available.

### Phase 4 Verification

17. Navigate to `/inventory/ingredients/[id]`. Verify enhanced detail view with hero photo, seasonal info, recipe usage.
18. Check dashboard Today's Schedule widget. Verify dish photo appears for events with menus.
19. Check seasonal palette pages. Verify ingredient and recipe thumbnails appear.
20. Check partner pages. Verify cover image display and upload works.

---

## Out of Scope

- **AI-generated images** (no DALL-E, no Midjourney, no AI food photography)
- **Image cropping/editing UI** (object-cover handles the crop; a cropper tool is a separate feature)
- **Social media integration** (Instagram hashtag browsing is a separate feature concept, not part of this spec)
- **Video content** (photos only)
- **Compression/optimization pipeline changes** (Cloudinary handles optimization when configured; no new pipeline)
- **Recipe suggestion engine** (the ingredient detail view shows YOUR recipes, not AI suggestions)
- **Changing the price catalog URL** (route stays `/culinary/price-catalog`, only the display label changes)
- **Chef profile image compression fix** (handled by showcase-image-upload.md spec)

---

## Implementation Order

1. **Migration first** (single migration adding all new columns)
2. **Phase 1A** (ingredient image bridge) - highest immediate impact
3. **Phase 1E** (rename to Food Catalog) - trivial, do alongside 1A
4. **Phase 1B-1D** (receipt thumbnails, event photos, menu photos) - quick wiring
5. **Phase 2A-2E** (upload surfaces) - each is independent, can be built in any order
6. **Phase 3B** (store logos) - static map, quick win
7. **Phase 3A** (directory images cartridge) - OpenClaw job, longest timeline
8. **Phase 3C-3D** (catalog image enrichment, culinary board) - incremental
9. **Phase 4A** (ingredient detail/inspiration view) - the capstone feature
10. **Phase 4B-4D** (dashboard photos, palettes, partners) - polish

---

## Notes for Builder Agent

1. **`ImageWithFallback` is your best friend.** It already exists at `components/pricing/image-with-fallback.tsx` and handles all the fallback logic. Reuse it everywhere. Do not create a new image component.

2. **The catalog bridge (1A) is the linchpin.** Most ingredient images will come from matching against the OpenClaw catalog by name. Use `pg_trgm` similarity matching (already set up for ingredient matching in the costing system) to find the best catalog match for each ingredient.

3. **Upload actions follow the `uploadChefLogo()` pattern** in `lib/chef/profile-actions.ts`. Copy it. Same structure: validate, sharp, store, update DB, cleanup previous, revalidate.

4. **Store logos are a static map, not a database.** 39 stores. Download each logo once, put in `public/images/stores/`, create a TypeScript map. Done. Don't over-engineer this.

5. **The "Food Catalog" rename is UI text only.** Don't rename files, routes, or function names. Just change what the user sees: nav labels, page titles, breadcrumbs.

6. **Phase 4A (ingredient inspiration view) should feel like a reference card, not a social feed.** Photo at top. Facts below. Your recipes using it. Price history. Clean, simple, useful. No AI generation, no external recipe suggestions.

7. **Non-invasive rule is critical.** When in doubt, don't add the image. A clean text list is better than a cluttered one with tiny unrecognizable thumbnails. The rule: if the image helps the user scan and identify items faster, add it. If it's just filler, skip it.

8. **All image columns are nullable.** The app must work perfectly with zero images uploaded. Images are an enhancement, never a requirement. Every surface must have a graceful no-image state.

9. **EXIF stripping is mandatory on all uploads.** Chefs photograph at clients' homes. GPS data in EXIF is a privacy risk. Every upload action uses `sharp(buffer).rotate().toBuffer()` to strip metadata.

10. **The OpenClaw directory-images cartridge (3A) is a separate spec.** This spec defines what ChefFlow needs (the `photo_urls` array populated). The cartridge spec defines how OpenClaw sources and delivers those images. Write the cartridge spec separately.

---

## Spec Validation (Planner Gate - All 14 Questions)

Completed 2026-03-29. Every answer cites file paths and line numbers from `Read` tool output.

---

### 1. What exists today that this touches?

**Ingredient system:**

| File                                                    | What exists                                                                            | Lines    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| `lib/recipes/actions.ts`                                | `getIngredients()` uses `select('*')`, auto-includes new columns                       | 903-942  |
| `app/(chef)/inventory/ingredients/[id]/page.tsx`        | Detail page queries explicit columns: `'id, name, category, unit, last_price_cents'`   | 33-36    |
| `app/(chef)/culinary/ingredients/page.tsx`              | List page, now has 32x32 thumbnails (Phase 1A built)                                   | modified |
| `app/(chef)/recipes/ingredients/ingredients-client.tsx` | Ingredient type has `[key: string]: unknown` spread                                    | 1-50     |
| `components/pricing/image-with-fallback.tsx`            | Client component, category SVG fallbacks, used in ProductCard                          | 1-80     |
| `lib/ingredients/image-actions.ts`                      | `resolveIngredientImage()`, `enrichIngredientImages()`, `lookupCatalogImage()` (built) | 1-186    |
| `components/culinary/enrich-images-button.tsx`          | "Find Images" button (built)                                                           | 1-44     |
| `components/inventory/price-history-chart.tsx`          | Recharts LineChart on ingredient detail, monthly averages                              | 1-80     |

**Expense system:**

| File                                | What exists                                                                                       | Lines       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| `app/(chef)/expenses/page.tsx`      | List page with table: Date, Event, Description, Category, Amount, Type, Actions. NO thumbnails    | 215-279     |
| `app/(chef)/expenses/[id]/page.tsx` | Detail page with "Receipt Dual View" showing original photo + parsed details                      | 137-172     |
| `lib/expenses/receipt-upload.ts`    | `uploadReceipt()` stores to `receipts` bucket, updates `receipt_photo_url` and `receipt_uploaded` | 23-74       |
| `types/database.ts`                 | Column is `receipt_photo_url` (not `receipt_url`), plus `receipt_uploaded` boolean                | 20812-20813 |

**Events system:**

| File                                                         | What exists                                                                       | Lines   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------- | ----- |
| `app/(chef)/events/page.tsx`                                 | List with table: Occasion, Date, Client, Status, Quoted Price, Actions. NO images | 149-186 |
| `database/migrations/20260228000004_event_photo_gallery.sql` | `event_photos` table with `storage_path`, `photo_type`, `thumbnail_path`          | 23-61   |
| `components/events/event-photo-gallery.tsx`                  | Full CRUD gallery with drag-to-reorder, signed URLs                               | 1-150+  |
| `database/migrations/20260305000009_dish_photos.sql`         | Added `photo_url` to dishes table                                                 | 23-24   |
| `types/database.ts`                                          | `dishes.photo_url: string                                                         | null`   | 14811 |
| `lib/events/actions.ts`                                      | `getEvents()` uses `select('*, client:clients(id, full_name, email)')`            | ~700+   |

**Menu system:**

| File                                        | What exists                                                                                       | Lines   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| `app/(chef)/culinary/menus/page.tsx`        | REDIRECT to `/menus` (not the real page)                                                          | 1-7     |
| `app/(chef)/menus/page.tsx`                 | Real menu list page, calls `getMenus()`                                                           | 15-73   |
| `app/(chef)/menus/menus-client-wrapper.tsx` | `MenuCard` component: name, date, status badges, description, guest count, food cost %. NO images | 114-200 |
| `lib/menus/actions.ts`                      | `getMenus()` selects menu fields only, does NOT include dishes                                    | 333-362 |

**Entity pages (Phase 2 targets):**

| File                                      | What exists                                                                  | Lines   |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| `app/(chef)/clients/clients-table.tsx`    | Table: Name, Email, Phone, Events, Spent, Created, Actions. NO avatars       | 101-134 |
| `app/(chef)/staff/page.tsx`               | Table: Name, Role, Status, Rate, Phone, Email, Notes. NO photos              | 72-111  |
| `app/(chef)/vendors/page.tsx`             | Table: Name, Status, Contact, Phone, Email, Terms, Delivery Days. NO logos   | 97-138  |
| `components/ui/avatar.tsx`                | `<Avatar>`, `<AvatarImage>`, `<AvatarFallback>` with Cloudinary optimization | 1-69    |
| `components/dishes/dish-photo-upload.tsx` | Upload component with compact/full modes, handles HEIC, EXIF strip           | 1-275   |

**OpenClaw infrastructure:**

| File                                                 | What exists                                                                        | Lines  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| `lib/openclaw/sync-receiver.ts`                      | Two cartridges registered: `price-intel` (8081), `lead-engine` (8083)              | 26-59  |
| `lib/openclaw/cartridge-registry.ts`                 | `CartridgeDefinition` interface, `CartridgeSyncResult` type, `registerCartridge()` | 10-47  |
| `lib/openclaw/lead-engine-handler.ts`                | Handler pattern: fetch from Pi, upsert to DB, revalidate tags, mark synced         | 59-196 |
| `types/database.ts`                                  | `directory_listings.photo_urls: string[]`                                          | 14219  |
| `app/(public)/discover/_components/listing-card.tsx` | Already displays `photo_urls[0]` with fallback                                     | 32, 44 |
| `app/api/storage/public/[...path]/route.ts`          | Public file serving, no auth, 24h cache                                            | 6-40   |

**Storage system:**

| File                          | What exists                                                                              | Lines   |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| `lib/storage/index.ts`        | `createBucket()` creates dirs on demand, ~14 buckets in use across codebase              | 152-170 |
| `lib/chef/profile-actions.ts` | `uploadChefLogo()`: validate MIME + size, store, update DB, cleanup previous, revalidate | 196-269 |

**Other surfaces:**

| File                                                | What exists                                                                               | Lines  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | ----- |
| `types/database.ts`                                 | `referral_partners.cover_image_url: string                                                | null`  | 37198 |
| `app/(chef)/dashboard/_sections/schedule-cards.tsx` | Today's Schedule widget: time, occasion, client, guests, weather. NO images, tight layout | 44-160 |
| `app/(chef)/settings/repertoire/page.tsx`           | Seasonal Palettes page, calls `getSeasonalPalettes()`                                     | 1-32   |

**Tables that do NOT exist:**

| Spec references       | Reality                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `equipment_inventory` | Does not exist. Equipment uses `equipment_items` table (types/database.ts line 15668) |
| `culinary_terms`      | Does not exist. Culinary board is experimental, only in agent worktrees               |

---

### 2. What exactly changes?

**Already done (Phase 1A + 1E):**

- Migration applied: `image_url` on ingredients, `avatar_url` on clients, `photo_url` on staff_members, `logo_url` on vendors, `photo_url` on equipment_inventory (wrapped in IF EXISTS)
- `lib/ingredients/image-actions.ts` created (catalog bridge + batch enrich)
- `components/culinary/enrich-images-button.tsx` created
- Ingredient list thumbnails wired
- "Food Catalog" rename in nav + page title

**Phase 1B (expense thumbnails):** Add 40x40 thumbnail column to `app/(chef)/expenses/page.tsx` table using `receipt_photo_url`. Link to detail view on click.

**Phase 1C (event photos):** Modify `app/(chef)/events/page.tsx` to show 48x48 thumbnail. Query needs to join `event_photos` (first by `display_order`) or fall back to first dish photo via events -> menus -> dishes chain.

**Phase 1D (menu dish photos):** Modify `app/(chef)/menus/menus-client-wrapper.tsx` MenuCard to show first dish photo as hero. Requires `getMenus()` in `lib/menus/actions.ts` to also fetch first dish photo per menu.

**Phase 2 (5 upload surfaces):** New server actions for client avatar, staff photo, vendor logo, equipment photo, ingredient photo uploads. Each follows `uploadChefLogo()` pattern. New storage buckets created on demand.

**Phase 3A (directory images):** Separate spec (`openclaw-directory-images-cartridge.md`). ChefFlow side: new handler + cartridge registration + admin queue endpoint.

**Phase 3B (store logos):** Static TypeScript map + ~39 PNG files in `public/images/stores/`.

**Phase 3C (catalog enrichment):** Extends OpenClaw price scraping, no ChefFlow changes.

**Phase 3D (culinary board photos):** BLOCKED. `culinary_terms` table does not exist. Culinary board is not in production.

**Phase 4A (ingredient reference card):** Enhance `app/(chef)/inventory/ingredients/[id]/page.tsx` with hero image, seasonal info, recipe usage list. Must add `image_url` to explicit column select.

**Phase 4B (dashboard photos):** Add 48x48 dish photo to `schedule-cards.tsx`. Requires `getTodaysScheduleEnriched()` to include menu dish photo.

**Phase 4C (seasonal palettes):** Wire ingredient thumbnails into palette component.

**Phase 4D (partner covers):** Upload UI on partner edit form. Display on partner list/detail. `cover_image_url` column already exists.

---

### 3. What assumptions am I making?

| #   | Assumption                                 | Status           | Evidence                                                                                                         |
| --- | ------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | `getIngredients()` uses `select('*')`      | VERIFIED         | `lib/recipes/actions.ts:909`                                                                                     |
| 2   | Ingredient detail uses `select('*')`       | **WRONG**        | `app/(chef)/inventory/ingredients/[id]/page.tsx:33` uses explicit `'id, name, category, unit, last_price_cents'` |
| 3   | Expense column is `receipt_url`            | **WRONG**        | Column is `receipt_photo_url` per `types/database.ts:20812`                                                      |
| 4   | Menu list is at `/culinary/menus`          | **WRONG**        | That's a redirect (`app/(chef)/culinary/menus/page.tsx:5-6`). Real page: `app/(chef)/menus/page.tsx`             |
| 5   | `equipment_inventory` table exists         | **WRONG**        | Table is `equipment_items` (`types/database.ts:15668`). Migration wrapped in IF EXISTS so no harm done           |
| 6   | `culinary_terms` table exists              | **WRONG**        | Does not exist. Culinary board is experimental, not production                                                   |
| 7   | `directory_listings.photo_urls` exists     | VERIFIED         | `types/database.ts:14219`                                                                                        |
| 8   | Listing cards display `photo_urls[0]`      | VERIFIED         | `app/(public)/discover/_components/listing-card.tsx:32,44`                                                       |
| 9   | `referral_partners.cover_image_url` exists | VERIFIED         | `types/database.ts:37198`                                                                                        |
| 10  | `dishes.photo_url` exists                  | VERIFIED         | `types/database.ts:14811`                                                                                        |
| 11  | `event_photos` gallery exists              | VERIFIED         | `database/migrations/20260228000004_event_photo_gallery.sql:23-61`                                               |
| 12  | Avatar component handles image URLs        | VERIFIED         | `components/ui/avatar.tsx:18-53` with Cloudinary optimization                                                    |
| 13  | DishPhotoUpload has compact mode           | VERIFIED         | `components/dishes/dish-photo-upload.tsx:50-58`                                                                  |
| 14  | `uploadChefLogo()` pattern is reusable     | VERIFIED         | `lib/chef/profile-actions.ts:196-269`                                                                            |
| 15  | Storage buckets are created on demand      | VERIFIED         | `lib/storage/index.ts:152-159`                                                                                   |
| 16  | `getMenus()` includes dish data            | **WRONG**        | `lib/menus/actions.ts:333-362` selects menu fields only, no dish join                                            |
| 17  | `getEvents()` includes photo data          | **WRONG**        | `lib/events/actions.ts` selects `*, client:clients(...)` only, no photo join                                     |
| 18  | Dashboard widget has space for images      | **QUESTIONABLE** | `schedule-cards.tsx:44-160` is compact text. Adding images may clutter it                                        |

---

### 4. Where will this most likely break?

**Break point 1: Ingredient detail page won't show images.**
`app/(chef)/inventory/ingredients/[id]/page.tsx:33` queries `'id, name, category, unit, last_price_cents'`. A builder who reads the spec but not this file will assume `select('*')` and skip it. The image column will be undefined even though it exists in the DB.

**Break point 2: TypeScript type errors everywhere.**
`types/database.ts` hasn't been regenerated after migration. Every reference to `ingredient.image_url`, `client.avatar_url`, `staff.photo_url`, `vendor.logo_url` will fail type checking. Builder must regenerate types first.

**Break point 3: Event card photos require a multi-table join.**
Getting a photo for an event row requires: events -> event_photos (by display_order), OR events -> menus -> dishes (by first dish with photo_url). Neither join exists in `getEvents()` today. This is a non-trivial query change, not a simple "add a column to the select."

**Break point 4: Menu card photos require a query change.**
`getMenus()` (`lib/menus/actions.ts:333-362`) does not fetch dishes. To show a dish photo hero on menu cards, the builder must add a subquery or separate fetch for the first dish photo per menu. This is a data-fetching change, not just a UI change.

**Break point 5: Phase 3D (culinary board technique photos) is unbuildable.**
The `culinary_terms` table does not exist. The culinary board page is experimental (only in agent worktrees). A builder following the spec linearly will hit a wall here.

---

### 5. What is underspecified?

1. **Event card photo source priority.** The spec says "completed events: first gallery photo; events with menu: first dish photo." But what is the SQL? Is it a LEFT JOIN to `event_photos` with `ORDER BY display_order LIMIT 1`? Or a subquery? The query pattern is not specified.

2. **Upload component reuse vs creation.** Phase 2 adds 5 upload surfaces. Should the builder create one shared `<EntityImageUpload>` component, or copy `DishPhotoUpload`'s pattern 5 times? The spec says "use the DishPhotoUpload pattern" but doesn't say whether to create a generic wrapper.

3. **Image size limits.** No max file size or dimension constraints specified for new upload surfaces. `uploadChefLogo()` uses 5MB max. `uploadReceipt()` uses 10MB. What should client avatars, vendor logos, etc. use?

4. **Ingredient reference card interaction.** Phase 4A says "click to expand" for recipe ingredient thumbnails. Is this a modal? A drawer? An inline expand? The ingredient detail page layout ("hero photo at top, facts below") is described in prose but not as a component tree.

5. **Phase 3D scope.** The culinary board and `culinary_terms` table don't exist in production. The spec doesn't acknowledge this. Builder will waste time looking for them.

6. **Which storage buckets for new uploads.** The spec names bucket patterns (`client-avatars`, etc.) but doesn't list them explicitly. Buckets are created on demand so this isn't a blocker, but naming should be consistent with existing buckets (`chef-logos`, `dish-photos`, `event-photos`, `receipts`).

---

### 6. What dependencies or prerequisites exist?

| Dependency                                    | Status                                      | Required before                               |
| --------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Migration `20260401000121` applied            | DONE                                        | All phases                                    |
| `types/database.ts` regenerated               | **NOT DONE**                                | Any TypeScript referencing new columns        |
| `showcase-image-upload.md` spec               | Verified                                    | Phase 1 (listed dependency)                   |
| `portfolio-upload-fix.md` spec                | Verified                                    | Phase 1 (listed dependency)                   |
| OpenClaw Pi running on 10.0.0.177:8081        | Required                                    | Phase 1A enrichment, Phase 3                  |
| `openclaw-directory-images-cartridge.md` spec | Ready (separate)                            | Phase 3A                                      |
| `culinary_terms` table + culinary board page  | **DOES NOT EXIST**                          | Phase 3D (BLOCKED)                            |
| `equipment_inventory` table                   | **DOES NOT EXIST** (it's `equipment_items`) | Phase 2D (migration col added to wrong table) |

---

### 7. What existing logic could this conflict with?

1. **`ImageWithFallback` component** (`components/pricing/image-with-fallback.tsx`) is the standard. Any new image display MUST use it, not a custom component. Conflict risk: builder creates a second image component.

2. **Cloudinary optimization** via `getOptimizedGalleryImage()` and `getOptimizedAvatar()`. The `Avatar` component (`components/ui/avatar.tsx:18-53`) already uses Cloudinary. New avatar/photo surfaces must use the same optimization path, not raw URLs.

3. **Signed URLs for private storage.** `event_photos` and `receipts` buckets use signed URLs (1-hour expiry via `getReceiptUrl()` at `lib/expenses/receipt-upload.ts:80-107`). If the builder uses public URLs for private data, it's a security issue.

4. **`DishPhotoUpload`** (`components/dishes/dish-photo-upload.tsx`) calls either `uploadRecipePhoto()` or `uploadDishPhoto()` based on `entityType`. New upload surfaces need new server actions, not overloading these existing ones.

5. **`getMenuQuickViewData()`** (`lib/menus/actions.ts:1602-1683`) already fetches dish data for modals. Phase 1D must use a lighter query for list cards (just first dish photo), not reuse the full quick view query.

---

### 8. What is the end-to-end data flow?

**Phase 1A (ingredient images, BUILT):**
User clicks "Find Images" -> `enrichIngredientImages()` -> fetches ingredients where `image_url IS NULL` -> for each, `lookupCatalogImage(name)` hits `http://10.0.0.177:8081/api/ingredients?search={name}&limit=1` -> validates name match -> caches URL in `ingredients.image_url` -> `revalidatePath('/culinary/ingredients')` + `revalidatePath('/recipes/ingredients')` -> UI re-renders with `ImageWithFallback`

**Phase 1B (expense thumbnails):**
Page loads -> `getExpenses()` query includes `receipt_photo_url` -> expense table renders thumbnail column -> if `receipt_photo_url` exists, call `getReceiptUrl()` for signed URL -> render 40x40 thumbnail -> click opens detail page with full receipt view

**Phase 1C (event photos):**
Page loads -> `getEvents()` needs new join: LEFT JOIN `event_photos` (first by display_order) OR subquery for first dish photo via menus -> dishes -> render 48x48 thumbnail in event row -> no photo = existing status dot behavior

**Phase 1D (menu dish photos):**
Page loads -> `getMenus()` needs new subquery: first dish with non-null `photo_url` per menu -> `MenuCard` renders dish photo as 200px hero banner -> no dish photo = existing card design unchanged

**Phase 2 (uploads, any entity):**
User clicks upload on entity detail page -> file picker -> `FormData` sent to server action (e.g., `uploadClientAvatar()`) -> validate MIME type + size -> `sharp()` for EXIF strip -> `storage.upload()` to bucket -> update entity column -> cleanup previous file -> `revalidatePath()` -> UI shows uploaded image

**Phase 3A (directory images):**
Pi scraper runs nightly -> sources images (og:image, favicon, optionally Google Places) -> stores locally -> sync cron fires every 6h -> ChefFlow handler fetches from `http://10.0.0.177:8085/api/images/unsynced` -> downloads images to `./storage/directory-images/` -> updates `directory_listings.photo_urls` -> `revalidatePath('/discover')` -> listing cards auto-show images via existing `photo_urls[0]` display

---

### 9. What is the correct implementation order?

1. **Regenerate `types/database.ts`** (unblocks all TypeScript work)
2. **Phase 1B** (expense thumbnails - signed URL pattern, uses existing `receipt_photo_url`)
3. **Phase 1C** (event card photos - requires query join to `event_photos` or dishes)
4. **Phase 1D** (menu card dish photos - requires `getMenus()` query change)
5. **Phase 2A-2E** (upload surfaces, each independent, follow `uploadChefLogo()` pattern)
6. **Phase 3B** (store logos - static map, ~39 PNGs, no external dependency)
7. **Phase 3A** (directory images cartridge - separate spec, OpenClaw Pi work)
8. **Phase 3C** (catalog enrichment - OpenClaw scraper extension)
9. **Phase 4A** (ingredient reference card - the capstone, needs `image_url` in detail page select)
10. **Phase 4B-4D** (dashboard photos, palettes, partner covers - polish)

**Skip Phase 3D** until culinary board is production-ready.

---

### 10. What are the exact success criteria?

| Phase | Criterion                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1A    | Ingredient list at `/culinary/ingredients` shows 32x32 thumbnails for ingredients matched to catalog. "Find Images" button works end-to-end. (DONE)                      |
| 1B    | Expense list at `/expenses` shows 40x40 receipt thumbnail when `receipt_photo_url` exists. Click navigates to detail. No broken images for expenses without receipts.    |
| 1C    | Event list at `/events` shows 48x48 thumbnail when gallery or dish photos exist. Events without photos show existing status dot.                                         |
| 1D    | Menu cards at `/menus` show dish photo hero when any dish has `photo_url`. Cards without dish photos render unchanged.                                                   |
| 1E    | Nav and page title say "Food Catalog" everywhere. Route stays `/culinary/price-catalog`. (DONE)                                                                          |
| 2A-2E | Each entity detail page has upload UI. Upload -> refresh -> image persists. Previous image cleaned up on re-upload. EXIF stripped. Initials/icon fallback when no image. |
| 3A    | After OpenClaw sync, `/discover` listing cards show business photos. Listings with existing photos not overwritten.                                                      |
| 3B    | Store names in food catalog show 16x16 logo inline. Missing logos show name-only (no broken image).                                                                      |
| 4A    | `/inventory/ingredients/[id]` shows hero image, seasonal info, "your recipes using this" list. Price chart and vendor panel still work.                                  |
| ALL   | `npx tsc --noEmit --skipLibCheck` exits 0. `npx next build --no-lint` exits 0.                                                                                           |

---

### 11. What are the non-negotiable constraints?

1. **Auth:** Every server action starts with `requireChef()` (`lib/auth/get-user.ts`)
2. **Tenant scoping:** Every query includes `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.entityId)`
3. **Privacy:** Receipt photos use signed URLs (private bucket). Client photos are private. Never expose private storage paths as public URLs
4. **EXIF stripping:** All uploads must call `sharp(buffer).rotate().toBuffer()` to strip GPS metadata
5. **No AI image generation:** No DALL-E, Midjourney, or any AI-generated photos (spec "Out of Scope")
6. **Chef upload priority:** Chef-uploaded images always override catalog-sourced images
7. **Non-invasive rule:** No images on dense trees, forms, financial tables, settings pages
8. **Nullable columns:** App must work perfectly with zero images. Images are enhancement, never requirement
9. **No em dashes** in any UI copy or error messages

---

### 12. What should NOT be touched?

- `types/database.ts` (regenerate only, never manually edit)
- `components/pricing/image-with-fallback.tsx` existing API (extend if needed, don't break)
- `lib/events/transitions.ts` (event FSM, unrelated)
- `lib/ledger/` (financial system, unrelated)
- Recipe creation flow (recipes are chef IP, no AI)
- Financial tables, ledger views, invoice displays (no decorative images)
- Settings pages (except `/settings/repertoire` for Phase 4C)
- Route paths (keep `/culinary/price-catalog`, don't rename to `/food-catalog`)
- `app/(chef)/culinary/menus/page.tsx` (it's a redirect; modify `app/(chef)/menus/` instead)

---

### 13. Is this the simplest complete version?

Phase 1 is minimal and correct. Each subsequent phase is independently useful and can ship alone.

**Simplification opportunities:**

- Phase 3D (culinary board) should be **removed** from this spec entirely. The table and page don't exist.
- Phase 2D (equipment photos) should reference `equipment_items` table, not `equipment_inventory`.
- Phase 4B (dashboard widget photos) is questionable. The schedule widget (`schedule-cards.tsx:44-160`) is already compact. Adding images may violate the non-invasive rule. Consider making this optional/deferred.

**Recommendation:** Split into 4 separate builder specs (one per phase) for clearer scope. Phase 1 is ready now. Phase 2-4 each need a focused spec.

---

### 14. If implemented exactly as written, what would still be wrong?

**8 things a builder WILL get wrong:**

1. **Ingredient detail page will be missed.** It queries `'id, name, category, unit, last_price_cents'` at `app/(chef)/inventory/ingredients/[id]/page.tsx:33`. Builder must add `image_url` to this explicit select. Every other ingredient query uses `select('*')` and works automatically, which makes this one easy to miss.

2. **Expense column name is wrong in spec.** Phase 1B says "receipt_url." The column is `receipt_photo_url` (`types/database.ts:20812`). Builder will write code referencing a non-existent column.

3. **Menu list file is at the wrong path.** Spec says `/culinary/menus`. That's a redirect (`app/(chef)/culinary/menus/page.tsx:5-6`). Real file is `app/(chef)/menus/menus-client-wrapper.tsx:114-200`.

4. **Event and menu photo queries don't exist yet.** The spec implies photos are "just there" to wire up. In reality, `getEvents()` and `getMenus()` do NOT join photo tables. Builder must write new multi-table queries (events -> event_photos, menus -> dishes) that don't exist today.

5. **Equipment table name is wrong.** Spec says `equipment_inventory`. Real table is `equipment_items` (`types/database.ts:15668`). The migration wrapped the ALTER in IF EXISTS so it silently did nothing. The column was NOT added.

6. **Phase 3D is unbuildable.** `culinary_terms` table and culinary board page don't exist in production. Builder will search, find nothing, and waste time.

7. **TypeScript types will fail until regenerated.** `types/database.ts` doesn't have the new columns yet. Builder's first `tsc` run will fail on every file referencing `image_url`, `avatar_url`, `photo_url`, or `logo_url`.

8. **Signed URL requirement for receipts.** Receipt photos are in a private `receipts` bucket. The expense list thumbnail needs `getReceiptUrl()` (`lib/expenses/receipt-upload.ts:80-107`) to generate a signed URL with 1-hour expiry. If the builder uses the raw `receipt_photo_url` value directly, the image won't load.

---

### Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

**Production-ready for Phases 1-2 with corrections applied above.** The 8 builder traps are now documented.

**Uncertain on:**

- **Phase 3D** (culinary board): Remove from spec. Table and page don't exist.
- **Phase 2D** (equipment): Migration added column to `equipment_inventory` which doesn't exist. Must re-migrate targeting `equipment_items`.
- **Phase 4B** (dashboard photos): May violate non-invasive rule on the compact schedule widget. Needs design review.

**What would resolve it:**

1. Remove Phase 3D from spec or mark as "deferred until culinary board ships"
2. Create new migration adding `photo_url` to `equipment_items` (the real table)
3. Developer decision on whether dashboard schedule widget should have images
