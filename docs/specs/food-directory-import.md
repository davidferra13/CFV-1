# Spec: Food Directory Import (OpenClaw Crawler Data)

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-7 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)

---

## What This Does (Plain English)

Imports ~200K enriched US food business records from the OpenClaw crawler archive into the existing `directory_listings` table, then upgrades the `/discover` page to handle 200K+ records with server-side pagination, state/city drill-down navigation, and full-text search. The empty directory becomes a comprehensive US food business directory overnight.

---

## Why It Matters

The `/discover` page exists but has zero listings. Meanwhile, 15,856 city-level JSON files with enriched food business data (names, addresses, phones, websites, emails, hours, GPS coordinates, cuisine types, lead scores) are sitting in a tar.gz archive. This connects the data to the UI.

---

## Files to Create

| File                                                            | Purpose                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `scripts/import-crawler-data.mjs`                               | One-time import script: extracts enriched_findings from tar.gz, maps fields, bulk inserts into directory_listings       |
| `database/migrations/20260401000116_directory_listings_geo.sql` | Adds lat, lon, postcode, lead_score, osm_id columns to directory_listings + full-text search index + pagination indexes |

---

## Files to Modify

| File                                                     | What to Change                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/discover/actions.ts`                                | Replace `getDirectoryListings` with paginated server-side query. Add `getDirectoryListingsByState`, `getDirectoryListingsByCity`, `getDirectoryStats`. Remove client-side text filtering. Add LIMIT/OFFSET pagination. Add full-text search via tsvector. |
| `lib/discover/constants.ts`                              | Add US_STATES constant (50 states + DC with labels), add ITEMS_PER_PAGE constant (24), add OSM cuisine-to-ChefFlow cuisine mapping                                                                                                                        |
| `app/(public)/discover/page.tsx`                         | Add state grid/list on landing when no filters active. Add pagination controls. Update results count to show "page X of Y".                                                                                                                               |
| `app/(public)/discover/_components/discover-filters.tsx` | Add state dropdown populated from DB facets. Add city autocomplete when state selected. Replace client-side filtering with URL param updates that trigger server queries.                                                                                 |
| `app/(public)/discover/_components/listing-card.tsx`     | Add phone (clickable tel: link), address line, Google Maps link from lat/lon, lead score indicator                                                                                                                                                        |
| `app/(public)/discover/[slug]/page.tsx`                  | Add full address display, clickable phone, Google Maps embed/link from lat/lon, hours display, email (if available)                                                                                                                                       |
| `components/navigation/public-header.tsx`                | No change needed ("Discover" link already exists in nav)                                                                                                                                                                                                  |
| `components/navigation/public-footer.tsx`                | No change needed ("Directory" link already exists in footer)                                                                                                                                                                                              |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Add geo, search, and source columns to directory_listings
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS lon double precision;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS lead_score integer;
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS osm_id text;

-- Full-text search vector (auto-updated)
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION directory_listings_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.state, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.cuisine_types, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_directory_listings_search ON directory_listings;
CREATE TRIGGER trg_directory_listings_search
  BEFORE INSERT OR UPDATE ON directory_listings
  FOR EACH ROW
  EXECUTE FUNCTION directory_listings_search_trigger();

-- Indexes for the new columns and pagination
CREATE INDEX IF NOT EXISTS idx_directory_listings_search_vector
  ON directory_listings USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_directory_listings_geo
  ON directory_listings(lat, lon) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_directory_listings_osm_id
  ON directory_listings(osm_id) WHERE osm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_directory_listings_lead_score
  ON directory_listings(lead_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_directory_listings_state_city
  ON directory_listings(state, city) WHERE status != 'removed';
CREATE INDEX IF NOT EXISTS idx_directory_listings_postcode
  ON directory_listings(postcode) WHERE postcode IS NOT NULL;

-- Composite index for paginated browsing (state + lead_score + name)
CREATE INDEX IF NOT EXISTS idx_directory_listings_browse
  ON directory_listings(state, lead_score DESC NULLS LAST, name)
  WHERE status != 'removed';
```

### Migration Notes

- Migration filename: `20260401000116_directory_listings_geo.sql` (checked: highest existing is `20260401000115`)
- All changes are additive (ALTER TABLE ADD COLUMN, CREATE INDEX, CREATE FUNCTION)
- No existing data is modified
- search_vector will be NULL for existing rows until updated; the import script handles new rows automatically via the trigger

---

## Data Model

### Crawler Record -> directory_listings Mapping

| Crawler Field                                 | Column            | Mapping Logic                                                                  |
| --------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `name`                                        | `name`            | Direct                                                                         |
| `name` + `city`                               | `slug`            | `slugify(name-city)` with dedup suffix                                         |
| `address.city`                                | `city`            | Direct                                                                         |
| `address.state`                               | `state`           | Direct (2-letter code)                                                         |
| `address.street` + `housenumber`              | `address`         | Concatenate: `"6 Moulton Way"`                                                 |
| `address.postcode`                            | `postcode`        | Direct                                                                         |
| `phone`                                       | `phone`           | Direct                                                                         |
| `website`                                     | `website_url`     | Direct                                                                         |
| `email`                                       | `email`           | Direct                                                                         |
| `opening_hours`                               | `hours`           | Store as jsonb `{ "raw": "Mo-Sa 16:00-21:00..." }`                             |
| `cuisine` + `categories`                      | `cuisine_types[]` | Map OSM values to CUISINE_CATEGORIES values                                    |
| `amenity` + `ai_classification.business_type` | `business_type`   | Map: restaurant, cafe -> restaurant; fast_food -> food_truck; bakery -> bakery |
| `lat`                                         | `lat`             | Direct                                                                         |
| `lon`                                         | `lon`             | Direct                                                                         |
| `lead_score`                                  | `lead_score`      | Direct (0-100)                                                                 |
| `osm_id`                                      | `osm_id`          | Direct (for dedup on re-import)                                                |
| N/A                                           | `status`          | `'discovered'`                                                                 |
| N/A                                           | `source`          | `'openstreetmap'`                                                              |
| N/A                                           | `source_id`       | Same as osm_id                                                                 |
| N/A                                           | `price_range`     | Map from cuisine/business_type heuristic or NULL                               |
| N/A                                           | `description`     | `ai_classification.ai_notes` if available                                      |
| N/A                                           | `photo_urls`      | Empty array (no photos from OSM)                                               |

### Cuisine Mapping (OSM -> ChefFlow)

| OSM cuisine value                     | ChefFlow cuisine_types value |
| ------------------------------------- | ---------------------------- |
| italian                               | italian                      |
| mexican, tex-mex                      | mexican                      |
| japanese, sushi                       | japanese                     |
| chinese                               | chinese                      |
| thai                                  | thai                         |
| indian                                | indian                       |
| french                                | french                       |
| mediterranean, greek, turkish         | mediterranean                |
| korean                                | korean                       |
| vietnamese, pho                       | vietnamese                   |
| caribbean, jamaican, cuban            | caribbean                    |
| middle_eastern, lebanese, persian     | middle_eastern               |
| southern, soul_food                   | southern                     |
| barbecue, bbq                         | bbq                          |
| seafood, fish                         | seafood                      |
| vegan, vegetarian                     | vegan                        |
| american, burger, diner, pizza, steak | american                     |
| bakery, pastry, ice_cream, donut      | desserts                     |
| fusion, international, regional       | fusion                       |
| Everything else                       | other                        |

### Business Type Mapping (OSM -> ChefFlow)

| OSM amenity/shop                   | ChefFlow business_type |
| ---------------------------------- | ---------------------- |
| restaurant, cafe, pub, bar         | restaurant             |
| fast_food                          | restaurant             |
| bakery, pastry_shop, confectionery | bakery                 |
| catering                           | caterer                |
| ice_cream, deli, greengrocer       | restaurant             |
| Default                            | restaurant             |

---

## Server Actions

| Action                                     | Auth          | Input                                 | Output                                                                                                                               | Side Effects |
| ------------------------------------------ | ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `getDirectoryListings(filters, page)`      | None (public) | `DiscoverFilters & { page?: number }` | `{ listings: DirectoryListingSummary[], total: number, page: number, totalPages: number }`                                           | None         |
| `getDirectoryListingsByState(state, page)` | None (public) | `{ state: string, page?: number }`    | Same paginated response                                                                                                              | None         |
| `getDirectoryStats()`                      | None (public) | None                                  | `{ totalListings: number, states: { state: string, count: number }[], topCities: { city: string, state: string, count: number }[] }` | None         |
| `searchDirectoryListings(query, page)`     | None (public) | `{ query: string, page?: number }`    | Same paginated response (uses tsvector)                                                                                              | None         |

Existing actions (`submitDirectoryListing`, `requestListingClaim`, `requestListingRemoval`, admin actions) remain unchanged.

---

## UI / Component Spec

### `/discover` Landing Page (No Filters Active)

**New:** When no filters are active and no query is provided, show a state-level browse experience:

1. **Hero** (existing, unchanged)
2. **Search bar** (prominent, full-width text input with "Search 200,000+ food businesses..." placeholder)
3. **State grid:** 50 states + DC displayed as a grid of clickable cards. Each shows state abbreviation, state name, and listing count. Sorted alphabetically. Clicking navigates to `/discover?state=MA` (same page with state filter applied).
4. **Top cities section:** Show top 10 cities by listing count as quick links
5. **"Add your business" and nomination CTA** (existing, unchanged)

### `/discover` with Filters Active (e.g., `?state=MA`)

1. **Hero** with contextual title: "Food in Massachusetts" (or whichever state/filter)
2. **Filter bar** (existing, enhanced with state dropdown and city input)
3. **Results grid** with pagination: 24 per page, "Showing 1-24 of 7,618" with prev/next buttons
4. **Each listing card** shows: name, business type badge, cuisine tags, city + state, phone (if available), website link

### Listing Card Enhancements

Current card: name, cuisine, business type, city, website link
Add: phone number (clickable), full address line, Google Maps link icon (if lat/lon available), lead score as subtle quality dot (green/yellow/gray)

### Detail Page Enhancements (`/discover/[slug]`)

Add to existing layout:

- Full address with Google Maps link
- Phone number (clickable tel: link)
- Email (if available, with mailto: link)
- Hours (formatted from raw OSM string)
- Map pin or "View on Google Maps" button using lat/lon
- Lead score badge

### States

- **Loading:** Skeleton cards (3x3 grid of gray placeholders)
- **Empty (no results for filter):** "No listings match these filters" with clear filters button (existing behavior)
- **Empty (state with no data):** "No listings in [State] yet. Know a great food business? Add it."
- **Error:** "Could not load directory. Please try again." (never show zero as if real data)
- **Populated:** Grid of listing cards with pagination

---

## Edge Cases and Error Handling

| Scenario                         | Correct Behavior                                                           |
| -------------------------------- | -------------------------------------------------------------------------- |
| Import finds duplicate osm_id    | Skip (ON CONFLICT DO NOTHING on osm_id)                                    |
| Slug collision during import     | Append numeric suffix (-2, -3, etc.)                                       |
| Business has no city             | Set city to 'Unknown', still import                                        |
| Business has no name             | Skip record entirely                                                       |
| Cuisine value not in mapping     | Map to 'other'                                                             |
| 200K+ records pagination         | Server-side LIMIT/OFFSET with total count. Never load all records at once. |
| Search query returns 0 results   | Show empty state with "try different keywords" suggestion                  |
| Full-text search on partial word | Use prefix matching (`:*` on last term) for autocomplete-like behavior     |
| Import script interrupted        | Idempotent via osm_id; safe to re-run. Existing records untouched.         |
| State filter with no listings    | Show empty state specific to that state                                    |

---

## Verification Steps

1. Run the migration: `20260401000116_directory_listings_geo.sql`
2. Run the import script: `node scripts/import-crawler-data.mjs`
3. Verify import count: `SELECT count(*) FROM directory_listings WHERE source = 'openstreetmap'` should be ~200K
4. Verify state distribution: `SELECT state, count(*) FROM directory_listings WHERE source = 'openstreetmap' GROUP BY state ORDER BY count(*) DESC LIMIT 10`
5. Navigate to `/discover` (no auth required, public page)
6. Verify: state grid appears with counts
7. Click a state (e.g., MA): verify filtered results with pagination
8. Search for "pizza": verify full-text search returns results
9. Click a listing: verify detail page shows address, phone, hours, map link
10. Verify pagination: click next/prev, confirm different results appear
11. Verify performance: page load under 2 seconds with 200K records

---

## Out of Scope

- Photos/images for listings (OSM doesn't have them; future Google Places integration)
- International data (only importing US enriched findings)
- Automatic refresh/re-crawl from OSM (one-time import for now)
- Chef-to-directory linking (connecting ChefFlow chefs to directory businesses)
- SEO pages per state/city (future: `/discover/massachusetts/boston` static routes)
- Mobile app/PWA-specific directory views
- Claiming workflow changes (existing claim/enhance flow remains as-is)

---

## Notes for Builder Agent

1. **Archive location:** `F:/Pi-Backup/home/archive/openclaw-crawler-era/openclaw-workspace.tar.gz`
2. **File structure inside archive:** `openclaw/enriched_findings/US/{STATE}/{city}.json` (15,856 files)
3. **Each JSON file is an array of business objects.** See the Joseph's Trattoria example in the spec for exact field structure.
4. **The import script runs on the PC** (where the archive lives), not on the Pi. It connects to the same PostgreSQL database the app uses.
5. **Batch inserts:** Use batches of 500-1000 records per INSERT to avoid memory issues and timeouts. The import script should show progress (e.g., "Imported 50,000 / 200,000...").
6. **The `source` column** already has a CHECK constraint that includes 'openstreetmap'. All imported records use this source.
7. **The `business_type` column** has a CHECK constraint. Map all OSM types to one of: restaurant, private_chef, caterer, food_truck, bakery, meal_prep, pop_up, supper_club. Default to 'restaurant'.
8. **Existing actions/UI** should continue working for manually-added and submitted listings. The import is additive.
9. **Client-side text search** in `getDirectoryListings` (lines 117-127 of `lib/discover/actions.ts`) must be replaced with server-side full-text search. The current approach loads all records into memory, which will crash with 200K rows.
10. **Pagination pattern:** Use `LIMIT $1 OFFSET $2` with a separate `SELECT count(*)` for total. Return `{ listings, total, page, totalPages }`.
11. **The `getDirectoryFacets` function** also loads all records into memory (line 157-163). Replace with `SELECT state, count(*) ... GROUP BY state` SQL queries.
12. **Do NOT modify** the existing submission, claim, enhance, or admin flows. They work fine for manually-managed listings.
