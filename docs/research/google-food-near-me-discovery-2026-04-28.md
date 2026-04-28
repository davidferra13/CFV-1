# Research: Google Food Near Me Discovery

> **Date:** 2026-04-28
> **Question:** What does the real Google `food near me` discovery flow expose, and what should ChefFlow build from it?
> **Status:** partial, Google Search and Maps were captured through Playwright, but application code was not changed because the worktree already contains unrelated pending changes.

## Origin Context

The developer asked to search Google for `food near me`, spoof a location if needed, use Playwright screenshots, scroll and test the visible controls, then turn the findings into a build direction for ChefFlow. The goal is to understand the default consumer behavior: most internet users looking for food start at Google with a local search.

## Summary

Google's local food flow is not a simple search result page. It is a persistent decision surface with a sticky search header, location context, fast local-intent chips, a Places pack, map handoff, independent Maps list scrolling, direct order/reserve/directions actions, and rich place detail panels.

ChefFlow already has the correct foundation in `/nearby`. The missing build is an interactive public map/list discovery layer on top of existing nearby listing data, not a new data model or a separate marketplace.

## Captured Google Surfaces

Screenshots are stored locally under:

- `.codex-temp/google-food-near-me-deep/`
- `.codex-temp/google-food-near-me-controls/`
- `.codex-temp/google-food-near-me-place-details/`
- `.codex-temp/google-maps-food-near-me-wheel/`

The direct Google Search flow initially triggered reCAPTCHA. After manual human clearance, Playwright captured the real SERP. The spoofed location was New York, NY.

## Google Search Findings

The top SERP includes:

- Sticky search header with query, clear button, voice, image search, search icon, settings, apps, and sign in.
- Navigation tabs: AI Mode, All, Maps, Short videos, Shopping, Forums, Images, More, Tools.
- Local-intent chips: Within 0.2 mi, Open now, Top rated, Cheap, Upscale, Delivery, Good for kids, Beer, Accepts reservations.
- Location context: `Results for New York, NY 10007`, with a `Choose area` action.
- Places pack with three primary results, photos, ratings, price range, cuisine, distance, address, hours, review quote, and embedded map.
- `More places` action that switches to a fuller Places surface.
- Organic results, local news cards, people-also-search chips, and pagination.

Control behavior:

- `Top rated`, `Cheap`, `Upscale`, `Delivery`, `Good for kids`, `Beer`, and `Accepts reservations` rewrite the query and add a selected filter chip.
- `Choose area` opens a modal with home address, popular neighborhoods, and precise location.
- `Tools` opens a dropdown with time, result type, advanced search, and result count.
- `More places` switches to a Places tab with a larger map and list.
- `Open in Maps` moves the user into Google Maps.
- Clicking a result or map marker opens an in-page place detail panel.

## Google Maps Findings

Maps uses a fixed two-pane layout:

- Left rail with menu, Saved, Recents, and Get app.
- Search box fixed at the top of the list area.
- Filter chips fixed across the top: Price, Rating, Cuisine, Hours, All filters.
- Left results list scrolls independently.
- Main map remains visible, pannable, zoomable, and marker-driven.
- `Search this area` appears after map movement.
- Sign in, Google apps, layers, zoom, Street View, scale, footer links, and map attribution stay anchored.

Result cards include name, rating, category, address, description, open/closed state, photo, and inline actions such as `Order online` and `Reserve a table`.

## Place Detail Findings

Clicking a place opens a right-side detail panel without losing the result list or map context. The panel includes:

- Title, rating, review count, price range, and cuisine.
- Tabs: Overview, Menu, Reviews, Photos.
- Large photo/video carousel.
- Primary actions: Order pickup, Order delivery, Directions.
- Secondary actions: Save, Share, Call.
- Structured facts: dietary/service attribute, hours, address, rating summary, menu link, price per person, phone.
- Close and overflow controls.

This is the highest-value interaction to mirror: selecting a listing should open a detail drawer while keeping the search context visible.

## ChefFlow Fit

The best implementation target is `/nearby`:

- Main public route: `app/(public)/nearby/page.tsx`.
- Nearby filters already parse query, type, cuisine, state, city, price, location, radius, latitude, longitude, page, and visual mode.
- Browser geolocation already writes `lat` and `lon` query params in `app/(public)/nearby/_components/nearby-filters.tsx`.
- Listing cards already show location, distance, website, Google Maps directions, and review links in `app/(public)/nearby/_components/listing-card.tsx`.
- Public listing detail pages already emit LocalBusiness and FoodEstablishment JSON-LD with address and geo data in `app/(public)/nearby/[slug]/page.tsx`.
- Search logic already supports PostGIS or Haversine distance, radius filters, bounding boxes, and distance ordering in `lib/discover/actions.ts`.
- Existing reusable map infrastructure exists in `components/ui/location-map.tsx`.
- The closest multi-marker precedent is `components/vendors/vendor-map.tsx`.

Auth and trust boundaries:

- `/nearby` is public read.
- Favorites require client auth.
- Admin listing mutations require admin auth.
- New public map UI must not expose hidden or removed listings.
- New server actions must preserve existing public-read filtering and client-only favorite scoping.

## Build Recommendation

Build a `/nearby` visual mode that behaves like Google local discovery:

1. Sticky search and filter band.
2. Split list/map layout on desktop.
3. Results list with independent scrolling.
4. Interactive marker map with selected listing highlight.
5. Detail drawer for selected listing.
6. Query-rewriter chips for common intent filters.
7. Choose-area modal with current location, typed location, and suggested popular areas.
8. Map movement affordance with `Search this area`.
9. Direct actions on cards and detail drawer: directions, website, favorite, share, call when phone exists, inquiry/book when ChefFlow has a valid path.
10. Mobile layout that toggles between list, map, and detail drawer.

## Gaps and Unknowns

- The current worktree is dirty with unrelated changes, so implementation was intentionally not started.
- I did not verify current `/nearby` visual behavior in a running app because the instructions prohibit starting dev servers without explicit permission.
- I did not run typecheck or build for this research-only pass.
- Google's exact result ordering and available buttons vary by account, location, time, device, and anti-abuse state.

## Recommended Next Build Spec

**Spec name:** `p1-nearby-google-local-discovery-map`

**Target files likely affected:**

- `app/(public)/nearby/page.tsx`
- `app/(public)/nearby/_components/nearby-filters.tsx`
- `app/(public)/nearby/_components/listing-card.tsx`
- New `app/(public)/nearby/_components/nearby-map-view.tsx`
- New `app/(public)/nearby/_components/nearby-place-drawer.tsx`
- New `app/(public)/nearby/_components/nearby-area-picker.tsx`
- Potential shared map helper based on `components/vendors/vendor-map.tsx`

**Acceptance criteria:**

- Public `/nearby` can render a Google-like list/map mode from real directory listing data.
- Results without coordinates still render in the list and do not break the map.
- Selecting a card or marker opens a detail drawer and keeps list/map context visible.
- Search, location, radius, price, cuisine, and intent chips remain URL-driven.
- `Search this area` updates lat/lon/radius only after explicit user action.
- Favorites still require client auth.
- Failures show explicit error states, not empty or misleading results.
- No AI generates recipes or food suggestions.
