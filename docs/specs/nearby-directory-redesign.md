# Spec: Nearby - Directory Redesign

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-06 20:00 | Planner (Opus 4.6) |        |
| Status: ready         | 2026-04-06 20:00 | Planner (Opus 4.6) |        |
| Claimed (in-progress) | 2026-04-30 20:19 | Codex V1 Builder   | 4185aa260 |
| Build completed       | 2026-04-30 20:29 | Codex V1 Builder   | 4185aa260 |
| Type check passed     | 2026-04-30 20:29 | Codex V1 Builder   | 4185aa260 |
| Build check skipped   | 2026-04-30 20:29 | User scoped validation, no next build | 4185aa260 |
| Status: built         | 2026-04-30 20:29 | Codex V1 Builder   | 4185aa260 |

---

## Developer Notes

### Raw Signal

The developer has been deeply unsatisfied with the Discover tab for weeks. Multiple research sessions (April 2 and April 5) produced five reports totaling ~25 pages of analysis. The core frustration: "It feels like a creepy scraped database. No pictures. Stagnant. No one opted in." The developer wants it to feel like "a slick consumer app (Airbnb, DoorDash level)" that replaces the "food near me" Google search. The data is solid (millions of nationwide operators from OpenStreetMap), but the presentation makes it feel dead.

The developer rejected "The Menu" as the new name and chose **"Nearby"** with route `/nearby`. The previous name "Discover" communicates nothing and must be eliminated from all user-facing surfaces.

Key quotes from research discussions:

- "Every place you can eat in America, in one ungated spot"
- "The opposite of Google's gatekept 'food near me' results"
- "No pictures = dead page. This is the #1 visual gap"
- "Replace the single-letter placeholder with gradient + category icon system"
- "Horizontal scrollable pills (like Airbnb categories). Dropdowns as secondary 'More filters'"
- "Reframe from 'we scraped you' to 'your business is already getting visibility, take control'"

### Developer Intent

- **Core goal:** Transform the food operator directory from a database-feeling page into a consumer-first discovery experience called "Nearby"
- **Key constraints:** No database changes. No new server actions. Purely a UI/routing/copy overhaul. Keep all existing functionality (claim, remove, submit, enhance, outreach, nomination). No "OpenClaw" or internal system references in user-facing copy.
- **Motivation:** The directory has solid data but a presentation crisis. It needs to look and feel like a product consumers want to use, not a data dump they stumble into.
- **Success from the developer's perspective:** A consumer lands on `/nearby` and immediately understands what it is, sees visual richness (gradients/icons instead of gray boxes), can filter with pills instead of dropdowns, and feels like they're using a polished food discovery app.

---

## What This Does (Plain English)

Renames "Discover" to "Nearby" across the entire app. Moves all routes from `/discover/*` to `/nearby/*`. Redesigns the landing page to be search-bar-first with category pills and icons (instead of a state grid). Replaces dropdown filters with horizontal scrollable pills. Replaces the gray single-letter card placeholder with gradient + category icon system (8 business types, each with a unique gradient and SVG icon). Changes the "Discovered" badge to "Listed". Adds "Claim for free" CTAs to listing cards. Creates visual hierarchy between Verified, Claimed, and Listed cards.

---

## Why It Matters

The directory has millions of real listings but looks and feels like a scraped database. This redesign is the difference between "what is this?" and "oh cool, food near me." Consumer-first presentation is the prerequisite for any future growth on the public side (market intelligence, operator claims, SEO traffic).

---

## Files to Create

| File                                                                      | Purpose                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/(public)/nearby/page.tsx`                                            | Main landing + filtered results (replaces `discover/page.tsx`)    |
| `app/(public)/nearby/[slug]/page.tsx`                                     | Listing detail (replaces `discover/[slug]/page.tsx`)              |
| `app/(public)/nearby/[slug]/enhance/page.tsx`                             | Profile enhancement (replaces `discover/[slug]/enhance/page.tsx`) |
| `app/(public)/nearby/[slug]/enhance/_components/enhance-profile-form.tsx` | Copy from discover                                                |
| `app/(public)/nearby/[slug]/_components/claim-remove-actions.tsx`         | Copy from discover                                                |
| `app/(public)/nearby/submit/page.tsx`                                     | Add your business (replaces `discover/submit/page.tsx`)           |
| `app/(public)/nearby/submit/_components/submit-listing-form.tsx`          | Copy from discover                                                |
| `app/(public)/nearby/unsubscribe/page.tsx`                                | Email opt-out (replaces `discover/unsubscribe/page.tsx`)          |
| `app/(public)/nearby/unsubscribe/_components/unsubscribe-form.tsx`        | Copy from discover                                                |
| `app/(public)/nearby/_components/nearby-filters.tsx`                      | Redesigned filters (pills, not dropdowns)                         |
| `app/(public)/nearby/_components/listing-card.tsx`                        | Redesigned card with gradient placeholders                        |
| `app/(public)/nearby/_components/nomination-form.tsx`                     | Copy from discover                                                |
| `app/(public)/nearby/_components/category-icon.tsx`                       | SVG icon + gradient system for 8 business types                   |
| `app/(bare)/nearby/join/page.tsx`                                         | Outreach join page (replaces `discover/join/page.tsx`)            |
| `app/(bare)/nearby/join/_components/join-form.tsx`                        | Copy from discover                                                |

Note: After all `/nearby` routes work, the old `/discover` directory will be replaced with a single redirect file (`app/(public)/discover/[[...path]]/page.tsx`) that sends all traffic to `/nearby`. This preserves any existing links/bookmarks.

---

## Files to Modify

| File                                         | What to Change                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `components/navigation/public-nav-config.ts` | Change `/discover` to `/nearby`, label "Discover" to "Nearby", footer heading and links |
| `lib/auth/route-policy.ts`                   | Add `/nearby` to public route whitelist (keep `/discover` for redirect)                 |
| `app/robots.ts`                              | Change `/discover` allow rules to `/nearby`                                             |
| `features/registry.ts`                       | Update `entryPoint` from `/discover` to `/nearby`                                       |
| `lib/discover/actions.ts`                    | Change all `revalidatePath('/discover')` to `revalidatePath('/nearby')`                 |
| `lib/discover/outreach.ts`                   | Update email URLs from `/discover/` to `/nearby/`                                       |
| `lib/discover/constants.ts`                  | Change `LISTING_STATUSES` "Discovered" label to "Listed"                                |

---

## Database Changes

None. No schema changes. The `directory_listings` table, `directory_nominations` table, and `directory_email_preferences` table remain untouched.

---

## Server Actions

No new server actions. All existing actions in `lib/discover/actions.ts` are reused. The only change is `revalidatePath` calls updating from `/discover` to `/nearby`.

---

## UI / Component Spec

### Phase 1: Landing Page Redesign (`app/(public)/nearby/page.tsx`)

**Hero Section (search-first):**

- Remove the "Food Directory" label
- New title: "Nearby" (large, bold)
- New subtitle: "Find food near you. Restaurants, private chefs, caterers, food trucks, bakeries, and more."
- Big search input with rotating placeholder text that cycles every 3 seconds:
  - "Thai food in Boston..."
  - "Caterers near Austin..."
  - "Bakeries in Portland..."
  - "Private chefs in Miami..."
  - "Food trucks in Denver..."
- Search input is the dominant visual element (tall, prominent, full-width within max-w-6xl)

**Category Pills (below search, landing only):**

- Horizontal scrollable row of the 8 business types
- Each pill has a small SVG icon + label
- Click a pill = filters by that business type
- Active pill gets brand-600 background
- Layout: `flex gap-3 overflow-x-auto` with no scrollbar visible (hide-scrollbar utility)

**State Grid (below categories, collapsible):**

- Moved below the fold, wrapped in a collapsible `<details>` element
- Summary text: "Browse by location (X states)"
- Same grid content as current, just collapsed by default
- Popular cities section below the state grid (unchanged)

**Stats banner:**

- Stays, but moves into the hero section as a subtle line: "X food businesses across Y states"

### Phase 2: Filter Redesign (`_components/nearby-filters.tsx`)

**Search bar:** Same as current but with rotating placeholder.

**Filter pills (replace all dropdowns):**

- Business type: horizontal scrollable pills with icons (replaces `<select>`)
- Cuisine: horizontal scrollable pills (replaces `<select>`). Show top 8 by default, "More cuisines" button expands all 21
- State: Keep as `<select>` dropdown (50 states don't fit in pills). Move to secondary "More filters" row
- City: text input, shown only when state is selected (same as current)
- Price range: 4 horizontal pills ($, $$, $$$, $$$$) replacing `<select>`

**Filter layout:**

```
Row 1: [Search bar ........................] [Search btn]
Row 2: [Restaurant] [Private Chef] [Caterer] [Food Truck] [Bakery] [Meal Prep] [Pop-Up] [Supper Club]
Row 3: [American] [Italian] [Mexican] [Japanese] [Chinese] [Thai] [Indian] [French] [+ More]
Row 4: [$] [$$] [$$$] [$$$$]   |   State: [dropdown]  City: [input]   |   [Clear all]
```

Row 3 and Row 4 only visible when any filter is active OR user clicks a "Filters" toggle. Progressive disclosure.

### Phase 3: Card Redesign (`_components/listing-card.tsx`)

**Gradient + Icon Placeholder (replaces single-letter gray box):**

Each business type gets a unique gradient + SVG icon:

| Business Type | Gradient (from -> to)    | Icon                                           |
| ------------- | ------------------------ | ---------------------------------------------- |
| Restaurant    | amber-700 -> orange-600  | Plate + utensils (UtensilsCrossed from lucide) |
| Private Chef  | rose-800 -> rose-600     | ChefHat from lucide                            |
| Caterer       | teal-700 -> emerald-600  | Serving platter (ConciergeBell from lucide)    |
| Food Truck    | yellow-600 -> lime-500   | Truck from lucide                              |
| Bakery        | pink-600 -> rose-400     | Croissant from lucide                          |
| Meal Prep     | blue-700 -> cyan-500     | Package from lucide                            |
| Pop-Up        | purple-700 -> violet-500 | Sparkles from lucide                           |
| Supper Club   | amber-700 -> yellow-500  | Flame from lucide                              |

Implementation: `_components/category-icon.tsx` exports `getCategoryGradient(businessType)` and `getCategoryIcon(businessType)`.

When a listing has no photo, instead of a single gray letter, the card shows:

- The gradient as background of the image area
- The icon centered, white, ~40px, with slight opacity (opacity-80)
- Still shows the business name initial as smaller text below the icon (text-lg, not text-6xl)

**Badge changes:**

- "Discovered" badge renamed to "Listed" (neutral, not surveillance-sounding)
- Badge styling remains the same (stone-800 background for Listed, brand for Claimed, emerald for Verified)

**Claim CTA on cards:**

- Unclaimed ("listed") cards get a subtle footer line: "Is this your business? Claim for free" as a link to the detail page
- This appears below the action buttons, text-xs, stone-500 color, brand-400 on hover

**Visual hierarchy (card treatment by status):**

- **Verified**: Full card with subtle emerald ring on hover (`hover:ring-emerald-600`)
- **Claimed**: Full card with brand ring on hover (current behavior)
- **Listed**: Slightly muted card - photo area uses gradient placeholder, no ring enhancement on hover

### Phase 4: Detail Page Updates (`app/(public)/nearby/[slug]/page.tsx`)

- Back link: "Back to Nearby" instead of "Back to directory"
- "Discovered" badge changed to "Listed"
- JSON-LD `url` field: `/nearby/` instead of `/discover/`
- Metadata title: "| Nearby" instead of "| ChefFlow Directory"
- If unclaimed: add a prominent banner at the top of the page:
  "Is this your business? Claim your free listing to add photos, update your hours, and control how you appear."
  [Claim this business] button

### States

- **Loading:** Skeleton grid (current behavior, unchanged)
- **Empty (no filters):** Show the hero + category pills + collapsible state grid
- **Empty (with filters):** "No listings match these filters" with clear filters CTA (current behavior)
- **Error:** Show error state if `getDirectoryStats` or `getDirectoryListings` throws (currently returns empty array on error, which shows as empty state - acceptable for now)
- **Populated:** Grid of cards with gradient placeholders for listings without photos

---

## Edge Cases and Error Handling

| Scenario                                    | Correct Behavior                                                   |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Old `/discover` URLs                        | Redirect to `/nearby` equivalent (preserve query params and slug)  |
| Old `/discover/[slug]`                      | Redirect to `/nearby/[slug]`                                       |
| Old `/discover/submit`                      | Redirect to `/nearby/submit`                                       |
| Outreach emails with `/discover/join` links | Redirect to `/nearby/join`                                         |
| Business type not in gradient map           | Default gradient (stone-700 -> stone-600) with a generic food icon |
| Search with no results                      | Same empty state as current with "Clear filters" CTA               |
| Page load while state grid is collapsed     | No layout shift - details element is collapsed by default          |

---

## Verification Steps

1. Sign in with agent account or visit as unauthenticated user
2. Navigate to `/nearby` - verify: hero with big search bar, rotating placeholder, category pills with icons, stats line, collapsible state grid
3. Click a category pill - verify: filters by business type, pill highlights
4. Click a cuisine pill - verify: filters by cuisine
5. Click a price pill - verify: filters by price range
6. Verify listing cards show gradient + icon placeholder for listings without photos
7. Verify "Listed" badge (not "Discovered") on unclaimed cards
8. Verify "Is this your business? Claim for free" text on unclaimed cards
9. Navigate to `/nearby/[slug]` - verify: "Back to Nearby" link, "Listed" badge, claim banner for unclaimed
10. Navigate to `/discover` - verify: redirects to `/nearby`
11. Navigate to `/discover/submit` - verify: redirects to `/nearby/submit`
12. Navigate to `/nearby/submit` - verify: form works, submission succeeds
13. Screenshot the landing page, a filtered results view, and a detail page

---

## Out of Scope

- **No database schema changes.** The `directory_listings` table is unchanged.
- **No new server actions.** All queries reuse existing `lib/discover/actions.ts`.
- **No real photo scraping or AI image generation.** Gradient + icon is the image strategy.
- **No operator outreach changes.** Email templates get URL updates only.
- **No claim flow changes.** The existing claim/removal/enhance flows remain the same, just at new URLs.
- **No SEO or sitemap changes beyond robots.ts.** Dynamic sitemap generation is a separate task.
- **Not building rating/review system.**
- **Not building automated outreach to unclaimed businesses.**
- **Not renaming the `lib/discover/` directory.** Internal code paths stay as-is. Only user-facing URLs and copy change.
- **Not renaming the `directory_listings` database table.**

---

## Implementation Order

1. **Create `_components/category-icon.tsx`** - the gradient + icon system (standalone, no dependencies)
2. **Create `_components/listing-card.tsx`** - new card component using category icons
3. **Create `_components/nearby-filters.tsx`** - redesigned filters with pills
4. **Create `_components/nomination-form.tsx`** - copy from discover, update links
5. **Create `app/(public)/nearby/page.tsx`** - main landing page with new layout
6. **Create `app/(public)/nearby/[slug]/page.tsx`** and sub-components - detail page
7. **Create remaining sub-routes** - submit, enhance, unsubscribe, join (copy + update links)
8. **Update cross-references** - nav config, route policy, robots, registry, actions revalidatePath, outreach URLs
9. **Create redirect catch-all** - `app/(public)/discover/[[...path]]/page.tsx` redirecting to `/nearby`
10. **Delete old discover route files** (after redirect is in place)
11. **Verify end-to-end** with Playwright

---

## Notes for Builder Agent

- **Do NOT rename `lib/discover/`.** The lib directory is internal code, not user-facing. Renaming it would touch 15+ import paths for zero user benefit.
- **The `lib/discovery/` directory is a DIFFERENT thing.** It's for chef discovery profiles, not the food directory. Don't confuse them.
- **The `(bare)` route group** has no public layout wrapper. The join page specifically uses this for a clean outreach landing. Preserve this.
- **Rotating placeholder text** can use a simple `useEffect` interval with `useState` cycling through an array.
- **Hide scrollbar utility:** Add `className="scrollbar-hide"` and ensure `globals.css` has `.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }` if not already present.
- **Lucide icons** are already used throughout the app (`lucide-react` is installed). No new dependency needed.
- **`revalidatePath` calls** in `lib/discover/actions.ts` must update to `/nearby`. Also check `adminUpdateListingStatus` which revalidates both `/discover` and `/admin/directory-listings`.
- **Outreach emails** in `lib/discover/outreach.ts` build URLs with `SITE_URL + '/discover/'`. These must change to `/nearby/`.
- The **old `/discover` routes** should remain temporarily as redirects (using `redirect()` from `next/navigation`) to avoid breaking existing bookmarks, outreach email links, and any indexed URLs. Use a catch-all `[[...path]]` route.
