# Spec: Discover Directory Polish

> **Status:** built
> **Priority:** P2 (queued)
> **Depends on:** food-directory-import.md (built)
> **Estimated complexity:** small (5 files modified, 0 files created)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)

---

## What This Does (Plain English)

Six surgical fixes to the `/discover` directory that was just shipped. Removes a dead import, pipes the total listing count to the search placeholder on landing, makes the "discovered listing" banner context-aware (hides it when OSM data is rich), adds JSON-LD structured data to listing detail pages for SEO, and adds a loading skeleton for filtered results. No new files, no database changes, no new dependencies.

---

## Why It Matters

The directory import shipped functional but has rough edges: a misleading banner on data-rich listings, a missed SEO opportunity on 200K+ indexable pages, and a landing search bar that doesn't tell users how many businesses are searchable. These are all 1-10 line changes that compound into a noticeably more polished product.

---

## Files to Create

None.

---

## Files to Modify

| File                                                     | What to Change                                                                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/discover/_components/discover-filters.tsx` | Remove unused `getStateName` import (line 11)                                                                                                                                |
| `app/(public)/discover/page.tsx`                         | Fetch `getDirectoryStats` at page level, pass `totalListings` to filters on landing. Add `Suspense` skeleton fallback for filtered results section.                          |
| `app/(public)/discover/[slug]/page.tsx`                  | Replace static `isEnriched` banner with context-aware check (hide when listing has address OR phone OR hours). Add JSON-LD `Restaurant`/`FoodEstablishment` structured data. |

---

## Database Changes

None.

---

## Data Model

No changes. All fixes use existing data from `directory_listings`.

---

## Server Actions

No changes. Existing `getDirectoryStats()` and `getDirectoryListingBySlug()` already return all needed data.

---

## UI / Component Spec

### Fix 1: Remove dead import (discover-filters.tsx)

**Current:** Line 11 imports `getStateName` from constants. It is never called anywhere in the file.

**Change:** Remove `getStateName` from the import statement. Nothing else changes.

**Evidence:** `getStateName` appears only on line 11 of discover-filters.tsx. Grep confirms zero usages in the file body.

### Fix 2: Landing search placeholder shows total count (page.tsx)

**Current:** On landing (no filters active), `result` is `null` so `totalListings={result?.total}` passes `undefined` to the filters component. The search placeholder shows generic text: "Search by name, city, or cuisine...".

The total count IS already fetched by the `StateGrid` async component via `getDirectoryStats()`, but it's trapped inside that component scope.

**Change:** Call `getDirectoryStats()` at the page level (outside `StateGrid`). Pass `stats.totalListings` to the filters component when on landing. Pass `result?.total` when filters are active (existing behavior).

The `StateGrid` component already calls `getDirectoryStats()` too, but Next.js deduplicates identical server-side fetch calls within a single render, so there is no double query. However, to be explicit and avoid any ambiguity: extract the stats fetch to the page level and pass `stats` as a prop to `StateGrid` instead of having it fetch independently. This eliminates the duplicate call entirely.

**Concrete change to page.tsx:**

```tsx
// At the top of DiscoverPage, before the isLanding check:
const stats = await getDirectoryStats()

// Pass to filters:
totalListings={isLanding ? stats.totalListings : result?.total}

// Pass to StateGrid as prop instead of fetching internally:
<StateGrid stats={stats} />
```

Update `StateGrid` to accept `stats` as a prop instead of calling `getDirectoryStats()` internally.

### Fix 3: Context-aware "discovered listing" banner (detail page)

**Current:** `[slug]/page.tsx` line 150 shows the amber "This is a discovered listing / Basic information only" banner for ALL listings where `status !== 'claimed' && status !== 'verified'`. But OSM-imported listings with status `'discovered'` often have full address, phone, hours, and email. The banner says "basic information only" when the page is showing rich data. This is misleading.

**Change:** Show the banner only when the listing genuinely has sparse data. Replace:

```tsx
{!isEnriched && (
```

With:

```tsx
{!isEnriched && !listing.address && !listing.phone && !listing.hours && (
```

This way the banner only appears on truly sparse discovered listings (no address, no phone, no hours). If a discovered listing has any of those fields from OSM data, the banner is hidden because the data isn't "basic" anymore.

### Fix 4: JSON-LD structured data on detail pages

**Current:** No structured data on `/discover/[slug]` pages. Nine other public pages in the app use `application/ld+json` (e.g., `chef/[slug]/page.tsx:80-99` uses `LocalBusiness` type).

**Change:** Add a `ListingJsonLd` component to the detail page, rendered below the back nav. Schema type: `Restaurant` (or `FoodEstablishment` for non-restaurant types). Fields mapped:

| Schema.org field          | Source                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@type`                   | `'Restaurant'` for business_type `restaurant`, `'Bakery'` for `bakery`, `'FoodEstablishment'` for everything else |
| `name`                    | `listing.name`                                                                                                    |
| `url`                     | `${APP_URL}/discover/${listing.slug}`                                                                             |
| `address.streetAddress`   | `listing.address` (if available)                                                                                  |
| `address.addressLocality` | `listing.city` (if available)                                                                                     |
| `address.addressRegion`   | `listing.state` (if available)                                                                                    |
| `address.postalCode`      | `listing.postcode` (if available)                                                                                 |
| `telephone`               | `listing.phone` (if available)                                                                                    |
| `email`                   | `listing.email` (if available)                                                                                    |
| `geo.latitude`            | `listing.lat` (if available)                                                                                      |
| `geo.longitude`           | `listing.lon` (if available)                                                                                      |
| `servesCuisine`           | `listing.cuisine_types` mapped through `getCuisineLabel()`                                                        |
| `priceRange`              | `listing.price_range` (if available)                                                                              |

Only include fields that have non-null values. The component renders a `<script type="application/ld+json">` tag following the exact same pattern as `chef/[slug]/page.tsx:94-99`.

### Fix 5: Loading skeleton for filtered results (page.tsx)

**Current:** Landing view has a `Suspense` with skeleton fallback (lines 256-266). But the filtered results branch (lines 267-330) renders synchronously after the `await getDirectoryListings(filters)` call on line 209. There's no loading skeleton because the entire page is server-rendered and the data fetch blocks the render.

**Analysis:** Since this is a server component and the data fetch happens before render, a client-side skeleton wouldn't help. The real solution is to wrap the filtered results in a `Suspense` boundary so Next.js can stream the shell first and fill in results after the query completes.

**Change:** Wrap the filtered results section in a `Suspense` with a skeleton fallback. Move the `getDirectoryListings` call into an async child component (like `StateGrid` pattern) so the Suspense boundary can catch the pending promise.

```tsx
// New async component:
async function FilteredResults({
  filters,
  activeFilterLabels,
  currentParams,
}: {
  filters: DiscoverFilters
  activeFilterLabels: string[]
  currentParams: URLSearchParams
}) {
  const result = await getDirectoryListings(filters)
  // ... render the results grid, pagination, empty state (existing lines 269-330)
}

// In the page JSX, replace the inline filtered results with:
;<Suspense
  fallback={
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-800/50" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl bg-stone-800/50" />
        ))}
      </div>
    </div>
  }
>
  <FilteredResults
    filters={filters}
    activeFilterLabels={activeFilterLabels}
    currentParams={currentParams}
  />
</Suspense>
```

---

## Edge Cases and Error Handling

| Scenario                                                    | Correct Behavior                                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getDirectoryStats` fails on landing                        | Filters show generic placeholder (existing fallback: `totalListings` will be 0, placeholder shows "Search by name, city, or cuisine..."). State grid shows nothing (existing empty check on line 54). |
| Listing has `hours` but no `address` or `phone`             | Banner still hidden (hours alone means the data isn't "basic"). Correct.                                                                                                                              |
| Listing has no OSM data at all (manually submitted, sparse) | Banner shows. Correct, the listing genuinely has basic info only.                                                                                                                                     |
| JSON-LD on a listing with no address/phone/geo              | Only populated fields are included. Schema is still valid (name is the only required field).                                                                                                          |
| `business_type` is `food_truck`, `caterer`, etc.            | JSON-LD uses `FoodEstablishment` as the schema type. Valid and correct.                                                                                                                               |

---

## Verification Steps

1. Navigate to `/discover` (no filters). Verify search placeholder shows "Search 200,000+ food businesses..." (or whatever the actual count is).
2. Verify state grid still renders correctly (no regression from prop extraction).
3. Click a state (e.g., MA). Verify loading skeleton appears briefly before results load.
4. View page source on a listing detail page. Verify `<script type="application/ld+json">` is present with correct schema.org fields.
5. Find a discovered listing that has address + phone (OSM data). Verify the amber "Basic information only" banner does NOT show.
6. Find or simulate a discovered listing with no address, no phone, no hours. Verify the amber banner DOES show.
7. Run `npx tsc --noEmit --skipLibCheck` - must exit 0 with no new errors.

---

## Out of Scope

- Keyset pagination (OFFSET replacement) - separate spec, larger refactor, only matters at very high page numbers
- SEO routes (`/discover/massachusetts/boston`) - future spec
- Photos from Google Places API - future spec
- Chef-to-directory linking - future spec
- Mobile-specific directory views - future spec

---

## Notes for Builder Agent

1. **Dead import removal** is a one-line change. Do it first as a warm-up.
2. **The JSON-LD pattern** is already established in `app/(public)/chef/[slug]/page.tsx:80-99`. Follow that exact pattern (component with `dangerouslySetInnerHTML`).
3. **`getDirectoryStats` deduplication**: Next.js deduplicates `fetch()` calls but NOT arbitrary async function calls. The refactor to pass `stats` as a prop to `StateGrid` is necessary to avoid a real duplicate DB query.
4. **The `Suspense` streaming approach** for filtered results requires moving the data fetch into a child async component. The page component itself becomes synchronous (no `await` on `getDirectoryListings`). This is the same pattern already used for `StateGrid`.
5. **Do NOT touch** any of the existing server actions (submit, claim, enhance, admin). They are out of scope.
6. **Do NOT modify** `lib/discover/actions.ts` or `lib/discover/constants.ts`. All changes are in the page/component layer.
7. **The `APP_URL` constant** for JSON-LD URLs is already defined at the top of `page.tsx` (line 14). Import it or define it similarly in `[slug]/page.tsx`.
