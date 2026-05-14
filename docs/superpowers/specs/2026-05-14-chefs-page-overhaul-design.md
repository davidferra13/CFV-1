# /chefs Page Overhaul - Search Engine Design

**Date:** 2026-05-14
**Status:** Approved
**Goal:** Transform /chefs from a content magazine into a search engine for hiring private chefs.

---

## Core Principle

Consumer arrives wanting to hire a chef. They should see a search bar and results. Nothing else matters until they find the right chef.

**Mental model:** Google for private chefs. Not a brochure. Not a content page.

---

## Page Structure (Top to Bottom)

```
[Compact header: icon + "Find a Chef" + result count + info popover]
[Filter bar: search | location | service type | more filters | sort]
[Quick chips: Dinner Tonight | Catering | Meal Prep | Accepting Now]
[Chef grid: image-dominant cards, 3 columns desktop, 2 tablet, 1 mobile]
[Zero results: recovery CTA + waitlist + suggestions]
[Minimal footer: secondary entry links, trust line]
```

---

## What STAYS

| Element                     | Treatment                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| Search/filter functionality | Total redesign as horizontal filter bar                          |
| Chef result grid (ChefTile) | Redesigned: image-dominant, icon-forward                         |
| Active filter chips         | Dismissable chips below filter bar                               |
| Zero-results recovery       | Waitlist capture, broader suggestions, "describe your event" CTA |
| Visual/compact toggle       | Integrated into sort/view controls                               |
| Structured data (JSON-LD)   | Unchanged, invisible                                             |
| DirectoryResultsTracker     | Unchanged, invisible                                             |

## What LEAVES

| Element                                        | Destination                                            |
| ---------------------------------------------- | ------------------------------------------------------ |
| ChefHero (full hero)                           | Replace with compact 1-line header                     |
| "Browse the live marketplace" + HomepageSearch | Delete (duplicate of homepage)                         |
| "Popular starting points" (4 cards)            | Become quick-filter chips in filter bar                |
| "How booking works" (3 steps)                  | Delete (lives on /how-it-works)                        |
| "Describe your event once" section             | Collapse into zero-results state + persistent mini CTA |
| "Directory shape today" stats                  | Info popover on results count                          |
| PublicSeasonalMarketPulse                      | Remove from /chefs (homepage/eat owns this)            |
| Featured chefs preview (3 cards)               | Delete (grid already sorts by featured)                |
| "Every profile is reviewed" trust box          | Inline verified badge above results                    |
| HomepageLiveSignal                             | Delete from /chefs                                     |

---

## Component Design

### 1. Compact Page Header

Replaces ChefHero. One line.

```
[ChefHat icon] Find a Chef    5 chefs live  [i] info popover
```

- Left: Phosphor ChefHat icon + "Find a Chef" in display font
- Right: live count + info icon that opens popover with directory stats (accepting count, top states, coverage)
- No gradient, no background image, no CTAs, no trust checkmarks
- Height: ~60px. Not a section, just a header bar.

### 2. Filter Bar (DirectorySearchBar)

Replaces DirectoryFiltersForm. Horizontal, compact, instant-apply.

**Primary row (always visible):**

- Search input (full-width on mobile, 40% on desktop)
- Location input with "Use current" button
- Service type dropdown
- "More filters" button with active count badge
- Sort dropdown (right-aligned)

**"More filters" expandable panel:**

- Cuisine, Dietary, Price range, Partner type, Setting vibe, Best for
- "Accepting inquiries only" toggle
- Compact 3-column grid of dropdowns
- Apply/Reset buttons only in expanded panel

**Quick-filter chips (below filter bar):**

- Dinner Tonight, Catering, Meal Prep, Event Chef, Accepting Now
- Each chip has a Phosphor icon + label
- Clicking applies that filter (acts as URL link like current MARKETPLACE_COLLECTIONS)
- Active chip gets brand-colored fill

**Behavior:**

- Primary filters apply on change (no submit button for main row)
- "More filters" panel uses Apply button (too many fields for instant-apply)
- Mobile: search input visible, everything else behind "Filters (3)" sheet button
- Sticky on scroll (below site nav)

### 3. Chef Card (ChefTile) Redesign

**Image-dominant layout:**

- Aspect ratio: 3/4 (portrait, taller images)
- Full-bleed Cloudinary image with bottom gradient overlay
- No-photo fallback: large initial letter + branded gradient (keep existing pattern)

**Overlay content (on image):**

- Top-left: availability dot (green/amber) + short label
- Top-right: "Instant Book" badge if applicable
- Bottom: chef name (bold white) + tagline (1 line, truncated)

**Below-image content (minimal):**

- Row 1: service icons (Phosphor) + location with MapPin icon + distance if available
- Row 2: price tier ($ symbols) + guest count range
- Row 3: single primary CTA button

**CTA logic (unchanged):**

- Instant book available -> "Book Instantly" (brand fill)
- Accepting inquiries -> "Inquire" (brand fill)
- Neither -> "View Profile" (outline)

**Removed from card:**

- Partner venue list (move to profile page)
- "Published setting" location sub-card (move to profile page)
- Secondary CTA button (one action per card)
- Discovery chips for services (replaced by icons)

### 4. Results Section

**Header line:**

```
5 chefs found   Sorted by: [Featured v]   [Grid|List toggle]
```

**Active filters (dismissable chips):**

```
[x Location: Boston] [x Cuisine: Italian] [x Accepting only]  Clear all
```

**Grid:**

- Desktop: 3 columns, gap-6
- Tablet: 2 columns
- Mobile: 1 column (full-width cards)

**Zero results:**

- Centered message: "No chefs match these filters"
- Primary CTA: "Describe your event instead" -> /book
- Secondary: "Reset filters" -> /chefs
- Waitlist capture (existing WaitlistCapture component)
- Quick-filter chips for common service types
- Remove /nearby cross-promo (per memory: /nearby is hidden)

### 5. Page Footer

- Thin trust line: "Every chef profile is reviewed before listing" (one line, not a card)
- PublicSecondaryEntryCluster (existing, keep minimal)

---

## Icon Usage (Phosphor via components/ui/icons.ts)

| Concept        | Icon                 |
| -------------- | -------------------- |
| Private dinner | ForkKnife or ChefHat |
| Catering       | CookingPot           |
| Meal prep      | BowlFood             |
| Event chef     | Sparkle or Star      |
| Location       | MapPin               |
| Price          | CurrencyDollar       |
| Guest count    | Users                |
| Dietary        | Leaf                 |
| Accepting      | CheckCircle          |
| Search         | MagnifyingGlass      |
| Filter         | Funnel               |
| Sort           | SortAscending        |
| Info           | Info                 |

---

## Files to Create/Modify

| File                                                           | Action                                  |
| -------------------------------------------------------------- | --------------------------------------- |
| `app/(public)/chefs/_components/directory-search-bar.tsx`      | CREATE - new filter bar                 |
| `app/(public)/chefs/_components/chef-card.tsx`                 | CREATE - redesigned chef tile           |
| `app/(public)/chefs/_components/chef-hero.tsx`                 | REWRITE - compact header                |
| `app/(public)/chefs/_components/results-header.tsx`            | CREATE - count + sort + view toggle     |
| `app/(public)/chefs/page.tsx`                                  | REWRITE - remove all editorial sections |
| `app/(public)/chefs/loading.tsx`                               | UPDATE - match new layout skeleton      |
| `app/(public)/chefs/_components/directory-filters-form.tsx`    | DELETE after migration                  |
| `app/(public)/chefs/_components/directory-results-tracker.tsx` | KEEP unchanged                          |

---

## What This Does NOT Change

- Data fetching (getDiscoverableChefs, all filter/sort logic in lib/directory/)
- URL search params contract (all existing ?params still work)
- Analytics tracking (DirectoryResultsTracker stays)
- SEO structured data
- Authentication or access control
- Any other page in the app
