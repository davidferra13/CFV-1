# Homepage Horizontal Discovery Scroll: Click-Action Contract

**Produced by Agent 5 (Reconnaissance)**  
**Date:** 2026-05-11  
**Status:** Authoritative. Agents 1, 2, 3, and 4 must follow this document for all routing decisions.

---

## 1. What the Scroll Is Today

The homepage horizontal discovery scroll is the `CuisineMarquee` component at:

```
app/(public)/_components/cuisine-marquee.tsx
```

It renders two auto-scrolling rows of cuisine pills. The pills are **entirely decorative today**: `cursor-default select-none`, no `href`, no `onClick`, no routing. The component has `role="marquee"` and `aria-label="Cuisine types available"`.

The scroll is mounted on the homepage at `app/(public)/page.tsx` (line 190), inside the consumer hero section, below the `HomepageSearch` form.

---

## 2. What "The Scroll" Will Become

Agent 1 will redesign this marquee into a proper horizontal discovery scroll with real item types beyond cuisine. Before that work begins, every item type needs a known destination or a confirmed non-clickable state.

This document defines that. No item type is left ambiguous.

---

## 3. Existing Route Infrastructure (Verified)

These routes exist and are built. All query parameters are confirmed from code inspection.

### 3.1 Chef/Operator Discovery

**Route:** `/chefs`  
**File:** `app/(public)/chefs/page.tsx`

Accepted query parameters (confirmed in `DirectoryFiltersForm`):

| Parameter        | Values                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `cuisine`        | See `DISCOVERY_CUISINE_OPTIONS` in `lib/discovery/constants.ts` (canonical values below)      |
| `serviceType`    | See `DISCOVERY_SERVICE_TYPE_OPTIONS` in `lib/discovery/constants.ts` (canonical values below) |
| `location`       | Free text city/location string                                                                |
| `locationSource` | `manual` \| `current` \| `approximate`                                                        |
| `lat` / `lng`    | Numeric coordinates from `LocationAutocomplete`                                               |
| `dietary`        | Free text dietary filter                                                                      |
| `priceRange`     | `budget` \| `mid` \| `premium` \| `luxury`                                                    |
| `partnerType`    | Facet-driven, from directory data                                                             |
| `accepting`      | `1` (accepting inquiries only)                                                                |
| `sort`           | `featured` \| `availability` \| `partners` \| `alpha`                                         |
| `q`              | Free text search query (max 80 chars)                                                         |

**Canonical cuisine values** (`DISCOVERY_CUISINE_OPTIONS`):

```
american, italian, french, japanese, mexican, thai, indian, mediterranean,
chinese, korean, caribbean, southern, bbq, seafood, vegan, farm_to_table,
latin, middle_eastern
```

**Canonical service type values** (`DISCOVERY_SERVICE_TYPE_OPTIONS`):

```
private_dinner, meal_prep, catering, cooking_class, event_chef,
personal_chef, corporate, retreat, popup, wedding
```

### 3.2 Food Operator Directory (Restaurants, Caterers, Food Trucks, etc.)

**Route:** `/nearby`  
**File:** `app/(public)/nearby/page.tsx`

Accepted query parameters (confirmed in `NearbyFilters`):

| Parameter     | Values                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| `cuisine`     | See `CUISINE_CATEGORIES` in `lib/discover/constants.ts` (canonical values below) |
| `type`        | See `BUSINESS_TYPES` in `lib/discover/constants.ts` (canonical values below)     |
| `state`       | Two-letter US state code                                                         |
| `city`        | City name (used with `state`)                                                    |
| `location`    | Free text location string                                                        |
| `radius`      | Radius in miles (used with `lat`/`lon`)                                          |
| `lat` / `lon` | Numeric coordinates from browser geolocation                                     |
| `priceRange`  | `$` \| `$$` \| `$$$` \| `$$$$`                                                   |
| `q`           | Free text search query                                                           |
| `page`        | Pagination                                                                       |

**Canonical cuisine values** (`CUISINE_CATEGORIES` in `lib/discover/constants.ts`):

```
american, italian, mexican, japanese, chinese, thai, indian, french,
mediterranean, korean, vietnamese, caribbean, middle_eastern, southern,
bbq, seafood, vegan, fusion, farm_to_table, desserts, other
```

**Canonical business type values** (`BUSINESS_TYPES`):

```
restaurant, private_chef, caterer, food_truck, bakery, meal_prep, pop_up, supper_club
```

### 3.3 Consumer Intent Discovery

**Route:** `/eat`  
**File:** `app/(public)/eat/page.tsx`

Accepted query parameters:

| Parameter    | Values                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `intent`     | `tonight` \| `dinner_party` \| `meal_prep` \| `private_chef` \| `going_out` \| `team_dinner` \| `work_lunch` \| `visual` |
| `craving`    | Free text                                                                                                                |
| `location`   | Free text                                                                                                                |
| `budget`     | Free text                                                                                                                |
| `dietary`    | Free text                                                                                                                |
| `visual`     | `1` (picture-first mode)                                                                                                 |
| `dateWindow` | Free text                                                                                                                |
| `partySize`  | Integer                                                                                                                  |
| `eventStyle` | Free text                                                                                                                |
| `useCase`    | Free text                                                                                                                |

### 3.4 Public Chef Profile

**Route:** `/chef/{slug}`  
**File:** `app/(public)/chef/[slug]/page.tsx`

Dynamic route. Requires a known, live `slug`. Links to a full public operator profile. Sub-routes:

- `/chef/{slug}/inquire` - send inquiry
- `/chef/{slug}/store` - chef's product store
- `/chef/{slug}/gift-cards` - chef gift cards
- `/chef/{slug}/locations/{locationId}` - specific location page

### 3.5 Services Overview

**Route:** `/services`  
**File:** `app/(public)/services/page.tsx`

Static page listing 6 service categories. Each category card links to `/chefs?serviceType={value}`. This is a valid destination for a `service_type` overview item.

### 3.6 Ingredient Encyclopedia

**Route:** `/ingredients`  
**File:** `app/(public)/ingredients/page.tsx`

Public ingredient knowledge browse page. Grouped by category. Each card links to `/ingredient/{id}`.

Sub-routes:

- `/ingredients/{category}` - category landing pages (produce, protein, pantry, baking, dairy, etc.)
- `/ingredient/{id}` - individual ingredient detail (confirmed in `surface-registry.json`)

This page renders seasonal context via `getPublicSeasonalMarketPulse`.

### 3.7 Booking Request Flow

**Route:** `/book`  
**File:** `app/(public)/book/page.tsx`

The primary consumer CTA (`PUBLIC_PRIMARY_CONSUMER_CTA`). Accepts a planning brief. Also accepts `intent` and seasonal pulse context.

---

## 4. Infrastructure That Does NOT Exist

Do not wire scroll items to these. They must remain non-clickable.

| Item Type                         | Status             | Evidence                                                                                                   |
| --------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `culinary_news`                   | **DOES NOT EXIST** | `app/(public)/blog/` directory not found on disk. Referenced in tsconfig only as a planned file.           |
| `culinary_event`                  | **DOES NOT EXIST** | System integrity spec explicitly confirmed: "No `app/(public)/events/page.tsx`. No aggregate events view." |
| `market` (standalone market page) | **DOES NOT EXIST** | No `/market`, `/news`, `/market-intelligence`, or `/food-market` page exists.                              |

The `PublicSeasonalMarketPulse` function exists (`lib/public/public-seasonal-market-pulse.ts`) and is used as a **component embedded in `/chefs`** and `/book`, but it has no standalone public route of its own.

---

## 5. Scroll Item Destination Contract

This is the authoritative mapping. Every item type that appears in the scroll must follow this contract.

### 5.1 `cuisine`

**Destination:** `/chefs?cuisine={canonicalValue}`

Use the canonical value from `DISCOVERY_CUISINE_OPTIONS` in `lib/discovery/constants.ts`. If a display label does not map to a canonical value, use the `canonicalizeDiscoveryCuisine()` function from the same file.

**Mapping for current CuisineMarquee pills:**

| Marquee Display Label | Canonical Value        | Route                           |
| --------------------- | ---------------------- | ------------------------------- |
| Italian               | `italian`              | `/chefs?cuisine=italian`        |
| Japanese              | `japanese`             | `/chefs?cuisine=japanese`       |
| Mediterranean         | `mediterranean`        | `/chefs?cuisine=mediterranean`  |
| Mexican               | `mexican`              | `/chefs?cuisine=mexican`        |
| French Bistro         | `french`               | `/chefs?cuisine=french`         |
| Southern BBQ          | `bbq`                  | `/chefs?cuisine=bbq`            |
| Modern American       | `american`             | `/chefs?cuisine=american`       |
| Thai                  | `thai`                 | `/chefs?cuisine=thai`           |
| Indian                | `indian`               | `/chefs?cuisine=indian`         |
| Greek                 | **no canonical match** | **non-clickable**               |
| Korean                | `korean`               | `/chefs?cuisine=korean`         |
| Farm-to-Table         | `farm_to_table`        | `/chefs?cuisine=farm_to_table`  |
| Vegan                 | `vegan`                | `/chefs?cuisine=vegan`          |
| Seafood               | `seafood`              | `/chefs?cuisine=seafood`        |
| Cajun                 | **no canonical match** | **non-clickable**               |
| Middle Eastern        | `middle_eastern`       | `/chefs?cuisine=middle_eastern` |
| Spanish Tapas         | **no canonical match** | **non-clickable**               |
| New American          | `american`             | `/chefs?cuisine=american`       |
| Plant-Based           | `vegan`                | `/chefs?cuisine=vegan`          |
| Omakase               | `japanese`             | `/chefs?cuisine=japanese`       |

**Important:** `latin` exists in `DISCOVERY_CUISINE_OPTIONS` but not in `CUISINE_CATEGORIES` for `/nearby`. Cuisine routing goes to `/chefs`, not `/nearby`, unless the scroll is explicitly presenting "food places" context (e.g., a restaurant-focused variant). For the main cuisine items, `/chefs` is the primary destination.

**Non-clickable rule:** Pills without a canonical cuisine match are rendered visually but are `cursor-default` with no `href`. Do not fabricate routes for Greek, Cajun, or Spanish Tapas.

---

### 5.2 `food_type`

**Destination:** Same as `cuisine`. Food type items are cuisine-category items.

Use `/chefs?cuisine={canonicalValue}` for food-type filter items. There is no separate food type system in ChefFlow. Food types are represented through cuisine categories.

---

### 5.3 `meal_type`

**Destination:** `/eat?intent={intent}`

Use `ConsumerIntent` values from `lib/public-consumer/discovery-actions.ts`.

| Meal Type Label | Intent Value   | Route                      |
| --------------- | -------------- | -------------------------- |
| Tonight         | `tonight`      | `/eat?intent=tonight`      |
| Dinner party    | `dinner_party` | `/eat?intent=dinner_party` |
| Meal prep       | `meal_prep`    | `/eat?intent=meal_prep`    |
| Private chef    | `private_chef` | `/eat?intent=private_chef` |
| Going out       | `going_out`    | `/eat?intent=going_out`    |
| Team dinner     | `team_dinner`  | `/eat?intent=team_dinner`  |
| Work lunch      | `work_lunch`   | `/eat?intent=work_lunch`   |

---

### 5.4 `service_type`

**Destination:** `/chefs?serviceType={value}`

Use `DISCOVERY_SERVICE_TYPE_OPTIONS` canonical values.

| Service Label    | Canonical Value  | Route                               |
| ---------------- | ---------------- | ----------------------------------- |
| Private dinner   | `private_dinner` | `/chefs?serviceType=private_dinner` |
| Meal prep        | `meal_prep`      | `/chefs?serviceType=meal_prep`      |
| Catering         | `catering`       | `/chefs?serviceType=catering`       |
| Cooking class    | `cooking_class`  | `/chefs?serviceType=cooking_class`  |
| Event chef       | `event_chef`     | `/chefs?serviceType=event_chef`     |
| Personal chef    | `personal_chef`  | `/chefs?serviceType=personal_chef`  |
| Corporate dining | `corporate`      | `/chefs?serviceType=corporate`      |
| Wedding          | `wedding`        | `/chefs?serviceType=wedding`        |
| Pop-up           | `popup`          | `/chefs?serviceType=popup`          |
| Retreat          | `retreat`        | `/chefs?serviceType=retreat`        |

**Overview destination (if item is a "services" category card rather than a filter pill):** `/services`

---

### 5.5 `occasion`

**Destination:** `/eat?intent={intent}` (consumer framing) OR `/chefs?serviceType={value}` (supply framing)

Use `/eat?intent=...` when the occasion framing is consumer-first ("I want to do X"). Use `/chefs?serviceType=...` when the framing is supply-first ("Find chefs who do X").

For a scroll pill labeled with an occasion:

- "Dinner party" → `/eat?intent=dinner_party`
- "Private dinner" → `/chefs?serviceType=private_dinner`
- "Wedding" → `/chefs?serviceType=wedding`
- "Team event" → `/eat?intent=team_dinner`
- "Meal prep" → `/eat?intent=meal_prep`

The choice of route depends on scroll item context. Agent 1 chooses the framing; the routes above are the valid options.

---

### 5.6 `featured_chef`

**Destination:** `/chef/{slug}` (specific chef profile)

Requires a live chef slug from the directory. Use `getDiscoverableChefs()` from `lib/directory/actions.ts` to retrieve featured chefs.

**Fallback if slug is unavailable:** `/chefs` (full directory)

**Do not render a featured chef item without a confirmed live slug.** Non-clickable featured chef items are not allowed; they must either have a real destination or be omitted from the scroll.

---

### 5.7 `location`

**Destination:** `/nearby?state={state}&city={city}` OR `/chefs?location={location}`

Two valid patterns:

1. **Food operator directory by location:** `/nearby?state=CA&city=Los+Angeles` (restaurants, caterers, food trucks)
2. **Chef discovery by location:** `/chefs?location=Los+Angeles,+CA` (private chefs)

Use `/nearby` when the item is framed as "food near X" (restaurant/local food context). Use `/chefs` when the item is framed as "hire a chef in X" (private chef context).

---

### 5.8 `market`

**Destination:** **NON-CLICKABLE**

No standalone market intelligence page exists. The `PublicSeasonalMarketPulse` is a server-side data source embedded in `/chefs` and `/book`, not a public route.

**Until a `/market` or `/ingredients?season=...` page is built, `market` items must be non-clickable.** Do not route to `/ingredients` as a substitute; the ingredients page is a food encyclopedia, not a market intelligence surface.

**If Agent 3 creates market content, the destination route must be confirmed before wiring.**

---

### 5.9 `culinary_news`

**Destination:** **NON-CLICKABLE**

`app/(public)/blog/` does not exist on disk. It is referenced in tsconfig as a planned file but has not been built.

**Until the blog is built and live, `culinary_news` items must be non-clickable.** Do not route to any placeholder.

---

### 5.10 `culinary_event`

**Destination:** **NON-CLICKABLE**

No `app/(public)/events/page.tsx` exists. Confirmed missing in the system integrity audit.

**Until an events page is built, `culinary_event` items must be non-clickable.**

---

### 5.11 `seasonal_signal`

**Destination:** `/ingredients` OR `/ingredients/{category}`

The `/ingredients` page is the closest real surface to seasonal food intelligence. It:

- Renders seasonal highlights via `getPublicSeasonalMarketPulse`
- Groups ingredients by category (produce, protein, pantry, etc.)
- Links through to `/ingredient/{id}` detail pages

**Valid routes:**

- Generic seasonal signal → `/ingredients`
- Produce-specific seasonal signal → `/ingredients/produce`
- Category-specific signal → `/ingredients/{categorySlug}`

**Category slugs** (from `INGREDIENT_CATEGORIES` in `lib/openclaw/ingredient-knowledge-queries.ts`): produce, protein, pantry, baking, dairy, beverage, oil, canned, specialty, frozen, alcohol, condiment, spice, fresh_herb, other

---

## 6. Summary Table

| Item Type         | Has Destination      | Primary Route                                         | Secondary/Fallback        | Non-Clickable Until                         |
| ----------------- | -------------------- | ----------------------------------------------------- | ------------------------- | ------------------------------------------- |
| `cuisine`         | YES (with mapping)   | `/chefs?cuisine={value}`                              | `/nearby?cuisine={value}` | No canonical match                          |
| `food_type`       | YES                  | `/chefs?cuisine={value}`                              | —                         | No canonical match                          |
| `meal_type`       | YES                  | `/eat?intent={value}`                                 | —                         | —                                           |
| `service_type`    | YES                  | `/chefs?serviceType={value}`                          | `/services`               | —                                           |
| `occasion`        | YES                  | `/eat?intent={value}` OR `/chefs?serviceType={value}` | —                         | —                                           |
| `featured_chef`   | YES (with live slug) | `/chef/{slug}`                                        | `/chefs`                  | No live slug available                      |
| `location`        | YES                  | `/nearby?state=X&city=Y` OR `/chefs?location=Z`       | —                         | —                                           |
| `market`          | **NO**               | —                                                     | —                         | Until `/market` or equivalent page is built |
| `culinary_news`   | **NO**               | —                                                     | —                         | Until `app/(public)/blog/` is built         |
| `culinary_event`  | **NO**               | —                                                     | —                         | Until `app/(public)/events/` is built       |
| `seasonal_signal` | YES                  | `/ingredients`                                        | `/ingredients/{category}` | —                                           |

---

## 7. Query Parameter Conventions (Agent 2 Reference)

All routing to existing pages must use these confirmed parameter names. Do not invent new parameter names.

### `/chefs` parameters:

- Cuisine: `cuisine` (e.g., `?cuisine=italian`)
- Service type: `serviceType` (e.g., `?serviceType=private_dinner`)
- Location: `location` (e.g., `?location=New+York%2C+NY`)
- Dietary: `dietary`
- Price: `priceRange`
- Text search: `q`

### `/nearby` parameters:

- Business type: `type` (e.g., `?type=restaurant`)
- Cuisine: `cuisine` (e.g., `?cuisine=italian`)
- State: `state` (e.g., `?state=CA`)
- City: `city` (e.g., `?city=Los+Angeles`)
- Location text: `location`
- Radius: `radius`
- Coordinates: `lat`, `lon`
- Price: `priceRange`
- Text search: `q`

### `/eat` parameters:

- Intent: `intent` (e.g., `?intent=dinner_party`)
- Craving/cuisine: `craving`
- Location: `location`
- Dietary: `dietary`
- Party size: `partySize`
- Visual mode: `visual=1`

---

## 8. Route Helper Location

Navigation utilities are at:

- `lib/public/public-surface-config.ts` - canonical CTAs (`PUBLIC_CONSUMER_DISCOVERY_ENTRY`, `PUBLIC_PRIMARY_CONSUMER_CTA`, etc.)
- `lib/public/public-secondary-entry-config.ts` - secondary entry cluster links
- `lib/marketing/source-links.ts` - marketing source-tagged hrefs
- `lib/discovery/constants.ts` - `canonicalizeDiscoveryCuisine()`, `canonicalizeDiscoveryServiceType()`

Agent 2 must use `canonicalizeDiscoveryCuisine()` and `canonicalizeDiscoveryServiceType()` when building route hrefs from raw label strings to ensure valid query parameter values.

---

## 9. Rules for All Agents

1. **No invented routes.** Every destination in this document is verified to exist in the file system. Every absent route is confirmed absent.
2. **No placeholder links.** Items in the scroll either link to a real route from section 3 or are `cursor-default` with no `href`.
3. **`market`, `culinary_news`, and `culinary_event` are non-clickable** until the corresponding pages are built and merged. Agent 3 (content) or Agent 4 (market ingestion) may propose new pages, but Agent 2 may not wire those items until the destination file exists.
4. **`featured_chef` requires a live slug.** Items of this type must be generated from the live directory, not hardcoded.
5. **`cuisine` items without a canonical match are non-clickable.** Greek, Cajun, and Spanish Tapas do not have entries in `DISCOVERY_CUISINE_OPTIONS`. They render visually but do not route.
6. **Use `canonicalizeDiscoveryCuisine()` for all cuisine value normalization.** Do not hand-construct cuisine query strings from display labels.
