# Spec: Visual Representation Strategy (Images Across ChefFlow)

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** showcase-image-upload.md (verified), portfolio-upload-fix.md (verified)
> **Estimated complexity:** large (30+ files across 4 phases)
> **Created:** 2026-03-29
> **Built by:** not started

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
| Expense row/card component | Render receipt thumbnail if `receipt_url` exists |

### 1C. Event Card Photos

**Problem:** The events list (`/events`) is a text-only table. Completed events may have gallery photos. Events with menus have dish photos. None are shown.

**Solution:** Add a small thumbnail (48x48, rounded) to event list rows:

- Completed events: first photo from `event_photos` gallery
- Events with menu: first dish photo from the menu's dishes
- No photo available: colored dot with event status (existing behavior, no change)

**Files to modify:**
| File | Change |
|------|--------|
| Events list page/component | Add thumbnail column to table |
| Server action for events list | Include first gallery/dish photo URL in query |

### 1D. Menu Card Dish Photos

**Problem:** Menu cards on `/menus` don't show food visuals. Each menu has courses with dishes that may have `photo_url`.

**Solution:** Menu cards show the first available dish photo as a small hero banner (16:9, 200px wide) at the top of the card. If no dish has a photo, show the existing card design (no change).

**Files to modify:**
| File | Change |
|------|--------|
| Menu list page/component | Add dish photo hero to card |
| Server action for menus list | Include first dish photo URL in query |

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

1. Add `photo_url TEXT` column to `equipment_inventory` table (migration)
2. Equipment list: show 48x48 thumbnail
3. Equipment detail: show larger photo
4. Upload via equipment edit form

**Database Change:**

```sql
ALTER TABLE equipment_inventory ADD COLUMN photo_url TEXT;
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

### 3D. Culinary Board Technique Photos

**Problem:** The culinary board (`/culinary-board`) displays culinary vocabulary terms (chiffonade, brunoise, etc.) as text. Reference photos showing the technique or result would be educational.

**Solution:**

1. Add `image_url TEXT` column to `culinary_terms` table (or equivalent)
2. Source: curated stock photos or creative commons images for each technique
3. Display: thumbnail on each term card, larger image in detail/expanded view
4. This is a manual curation job (finite set of culinary terms), not a scraping job

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

### 4B. Dashboard Widget Photos

**Problem:** "Today's Schedule" and "Week Strip" widgets are pure text/color. A small dish photo from the event's menu adds visual context.

**Solution:**

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

-- Phase 2D: Equipment photos
ALTER TABLE equipment_inventory ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Phase 3D: Culinary board technique photos (if table exists)
-- ALTER TABLE culinary_terms ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### Migration Notes

- All columns are nullable TEXT (URLs), no constraints
- All additive, no data loss risk
- Migration filename must be checked against existing files in `database/migrations/` (timestamp collision rule)
- The `directory_listings.photo_urls` and `referral_partners.cover_image_url` columns already exist; no migration needed for those

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
