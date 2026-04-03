# Spec: Consumer-First Discovery and Dinner Planning Expansion

> **Status:** ready
> **Priority:** P1 (strategic)
> **Depends on:** `featured-chef-public-proof-and-booking.md` (verified 2026-04-02), live `/discover`, `/chefs`, `/book`, and Dinner Circle stack
> **Estimated complexity:** large (12+ files, 1 migration, staged rollout)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-02 22:14 EDT | Codex         |        |
| Status: ready | 2026-04-02 22:14 EDT | Codex         |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A builder reading a spec without this section is building blind._

### Raw Signal

The developer's ask is consumer-first and blunt:

"If I'm hungry and I don't cook, but I love food, love spending money, love hiring a private chef, love finding chefs, love learning about chefs, and love sharing the chef who cooked for me, I should not have to fight the product to figure out what I want to eat."

The current pain is not lack of product surface. It is fragmentation. The developer described the familiar "food near me" problem where even after searching, the person still cannot decide because the right options are not put directly in front of them. They want the website to feel less gatekept, more obvious, more visual, and more immediately useful.

The developer also cares about the social side of food. They want people to be able to plan dinner parties with friends whether the food comes from a restaurant, a private chef, or another hospitality path. The system should support inspiration, sharing, and group planning instead of only acting like a booking form.

The developer explicitly raised recipes and post-meal curiosity. Some clients want recipes, want to know more about what they ate, or want a chef to share some version of the recipe. That should be handled intentionally, not as an afterthought.

The developer also explicitly raised visual access. For a visually impaired or low-vision person, the site should make it easy to use pictures, large targets, and obvious next actions to get to food quickly without unnecessary hunting.

The broader instruction from the developer is that forward motion should be additive, research-backed, and expansion-oriented. We should not destroy existing work. We should build on what already exists and turn it into a more complete consumer experience.

### Developer Intent

- **Core goal:** Add a consumer-native discovery layer on top of the current public marketplace so a hungry person can decide what to eat, browse visually, learn about chefs, share options, and plan with others without replacing the existing booking and marketplace foundations.
- **Key constraints:** Keep the current `/discover`, `/chefs`, `/book`, guest portal, and Dinner Circle systems intact. Expand by composition, not by rewrite. Reuse current public proof, booking, hub, and menu data where possible.
- **Product principle:** The first consumer surface should be craving-led and occasion-led, not schema-led. Users should not need to know whether they want a directory listing, a chef profile, a booking form, or a hub group before the system helps them.
- **Trust requirement:** Public chef discovery must become more menu-aware and more visual, but the product must not expose private or unintended recipe detail just to feel richer.
- **Accessibility requirement:** The public experience must gain an image-forward, low-friction mode with stronger visual hierarchy and better low-vision support. This is additive hardening, not a marketing-only refresh.
- **Social requirement:** Group planning should reuse the existing Dinner Circle / hub stack instead of inventing an entirely separate collaboration product.
- **Data requirement:** Use existing data first. Only add new schema where the current model has a real structural gap.

---

## What This Does (Plain English)

This spec adds a new consumer-first entry layer to the public website, makes public chef discovery more menu- and photo-aware, and turns the existing hub stack into a pre-booking planning surface.

The result is a simpler public journey:

1. "What should I eat?" entry point
2. visual discovery across chefs, food listings, and relevant package/menu surfaces
3. richer public chef pages with menu/package spotlighting
4. optional planning group for shortlisting and sharing with friends
5. existing booking and event flows reused once the user is ready to act

This is not a rewrite of the current marketplace. It is a consumer-intent layer and planning layer added on top of the current system.

---

## Why It Matters

The repo already has strong public primitives, but they live in separate routes:

- `/discover` is a broad food directory
- `/chefs` is a chef marketplace
- `/book` is the public matching funnel
- guest portal and Dinner Circle flows exist after a booking or inquiry

That is useful infrastructure, but it is not yet a consumer-native "help me decide" product.

Competitive research points in the same direction. The strongest marketplace lesson is that menus, chef bios, chat, and trust proof are decision inputs before booking, not optional extras (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:109`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:341`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:349`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:356`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:367`).

---

## Current-State Summary

### What already exists

1. Public food directory
   - `/discover` already supports query, business type, cuisine, state, city, and price filters, and renders either a landing grid or filtered results (`app/(public)/discover/page.tsx:248-355`).
   - Directory cards already show photos and website/map actions when present (`app/(public)/discover/_components/listing-card.tsx:32-47`, `app/(public)/discover/_components/listing-card.tsx:141-159`).
   - Directory detail pages already expose website, menu, photos, and hours when data exists (`app/(public)/discover/[slug]/page.tsx:137-169`, `app/(public)/discover/[slug]/page.tsx:273-295`).
   - The underlying listing model already stores `business_type`, `website_url`, `hours`, `photo_urls`, and `menu_url` (`lib/db/schema/schema.ts:23737-23755`).

2. Public chef marketplace
   - `/chefs` already loads discoverable chefs, supports search, location, cuisine, service type, price range, partner type, and accepting-only filters, and renders result cards (`app/(public)/chefs/page.tsx:341-419`, `app/(public)/chefs/page.tsx:481-519`, `app/(public)/chefs/page.tsx:586-599`).
   - Public chef discovery data already includes cuisines, dietary specialties, service types, price, and reviews in `chef_directory_listings` (`lib/db/schema/schema.ts:21842-21864`).
   - Marketplace profile fields already exist for service area, accepting inquiries, price tier, and service types in `chef_marketplace_profiles` via migration and generated schema artifacts (`database/migrations/20260401000108_onboarding_overhaul.sql:17-19`, `clean-schema.sql:7461`, `types/database.ts:6615`).

3. Public chef profile and proof
   - Public chef pages currently fetch review feed, availability signals, work history, achievements, charity impact, portfolio, and credential fields (`app/(public)/chef/[slug]/page.tsx:161-185`).
   - The rendered page already centers proof, credentials, partner venues, reviews, and availability (`app/(public)/chef/[slug]/page.tsx:419-545`).
   - `getPublicChefProfile()` currently returns brand, public-link, marketplace, and directory data, but not menu/package spotlight data (`lib/profile/actions.ts:102-128`, `lib/profile/actions.ts:156-216`, `lib/profile/actions.ts:260-274`).

4. Public booking flow
   - `/book` is already a dedicated public route wrapping `BookDinnerForm` (`app/(public)/book/page.tsx:2`, `app/(public)/book/page.tsx:21`, `app/(public)/book/page.tsx:40`).
   - `POST /api/book` already rate limits, runs Turnstile when configured, matches chefs, and creates inquiry plus draft event records (`app/api/book/route.ts:75-107`, `app/api/book/route.ts:246`, `docs/app-complete-audit.md:1937`, `docs/app-complete-audit.md:1952`).
   - `submitPublicInquiry()` already creates the client, inquiry, Dinner Circle, and draft event on the public inquiry path (`lib/inquiries/public-actions.ts:57-72`, `lib/inquiries/public-actions.ts:182-205`, `lib/inquiries/public-actions.ts:250-285`, `lib/inquiries/public-actions.ts:287-325`).

5. Guest, share, and social follow-on
   - The guest portal already shows menu details, dietary input, accessibility needs, message-the-chef, about-me, and who's-coming sections (`app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:397-421`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:521-544`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:984-1008`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:1190-1214`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:1258-1282`).
   - Event share and guest models already support visibility settings, pre-event content, guest dietary info, and guest documents including `recipe_card` (`lib/db/schema/schema.ts:14172-14205`, `lib/db/schema/schema.ts:14207-14229`, `lib/db/schema/schema.ts:15170-15202`).
   - There is already a post-event guest QR lead flow at `/g/[code]` (`app/(public)/g/[code]/page.tsx:76-85`, `lib/guest-leads/actions.ts:57-104`).

6. Dinner Circles / hub
   - The hub system is already a first-class feature in the inventory and includes public hub routes and client hub routes (`docs/feature-inventory.md:86`, `app/(client)/my-hub/page.tsx:16-18`).
   - Public hub groups already render chat, weekly meals, photos, schedule, notes, members, search, and settings (`app/(public)/hub/g/[groupToken]/hub-group-view.tsx:346-360`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:389-434`).
   - `hub_groups.group_type` already supports `planning` in addition to `circle`, `dinner_club`, and `bridge`, and group creation already accepts it (`lib/db/schema/schema.ts:14718-14750`, `lib/hub/group-actions.ts:11-30`, `lib/hub/types.ts:61`).
   - Public hub guest profiles can already be created without auth and deduplicated by email (`lib/hub/profile-actions.ts:17-72`).

7. Menu and package data that can be reused publicly
   - Menus already support public showcase reads (`lib/db/schema/schema.ts:11764`, `lib/db/schema/schema.ts:11799`).
   - Dishes already support public showcase reads and `dish_index_summary` exists as a rich aggregate (`lib/db/schema/schema.ts:1107`, `lib/db/schema/schema.ts:24865-24889`).
   - `chefs.featured_booking_menu_id` already exists (`lib/db/schema/schema.ts:19748-19773`).
   - Public package/item candidates already exist in `experience_packages` and `meal_prep_items` (`lib/db/schema/schema.ts:20408-20450`, `lib/db/schema/schema.ts:21429-21453`).

### What does not yet exist

- There is no single public "what should I eat?" route that unifies craving, occasion, fulfillment mode, and visual discovery.
- Public chef pages are proof-first but not yet menu/package-first.
- The planning capability exists after an inquiry or inside the hub, but not yet as a clean pre-booking shortlist flow from public discovery.
- Recipes exist in the platform and guest document model, but there is no intentional public consumer recipe-share path. That must stay controlled.

---

## Files to Create

| File                                                            | Purpose                                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `app/(public)/eat/page.tsx`                                     | New consumer-first public route for craving-led and occasion-led discovery                                         |
| `app/(public)/eat/_components/consumer-intent-shell.tsx`        | Main `/eat` shell with intent chips, result sections, and fallback routing                                         |
| `app/(public)/eat/_components/consumer-intent-filters.tsx`      | Mood, occasion, fulfillment, budget, dietary, and visual-mode filters                                              |
| `app/(public)/eat/_components/consumer-result-card.tsx`         | Unified image-first card that can represent a chef, listing, menu/package, or planning CTA                         |
| `app/(public)/eat/_components/discovery-view-mode-toggle.tsx`   | Picture-first / low-vision-friendly public browsing toggle                                                         |
| `components/public/chef-menu-spotlight.tsx`                     | Public chef-page component for featured menu / package / item spotlight                                            |
| `components/hub/planning-candidate-board.tsx`                   | Planning-group shortlist board rendered inside the existing hub shell                                              |
| `lib/public-consumer/discovery-actions.ts`                      | Public read layer that merges directory listings, chef discovery, and menu/package spotlights into one intent feed |
| `lib/public-consumer/menu-actions.ts`                           | Public read helpers for featured booking menu, showcase menus, package spotlights, and meal prep items             |
| `lib/hub/planning-candidate-actions.ts`                         | Read/write actions for planning-group shortlist candidates                                                         |
| `database/migrations/[next-timestamp]_hub_group_candidates.sql` | Add shortlist candidate storage for planning-mode Dinner Circles                                                   |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                              | Add a primary public CTA into `/eat` so the homepage can route users into the new intent-led experience without removing `/book`, `/chefs`, or `/discover` |
| `app/(public)/discover/page.tsx`                     | Add entry points to `/eat`, preserve current filters, and support an optional visual-mode query param or cookie                                            |
| `app/(public)/discover/_components/listing-card.tsx` | Support picture-first mode, stronger action hierarchy, and intent handoff into planning or booking                                                         |
| `app/(public)/chefs/page.tsx`                        | Add entry points from intent-led discovery, visual-mode support, and optional surfaced menu/package highlights in result cards                             |
| `app/(public)/chef/[slug]/page.tsx`                  | Insert menu/package spotlighting below the proof/hero area while preserving current proof, credentials, reviews, and availability sections                 |
| `app/(public)/book/page.tsx`                         | Accept optional prefill/query params from `/eat` and planning groups without changing booking semantics                                                    |
| `app/(public)/hub/g/[groupToken]/page.tsx`           | Distinguish `planning` groups from the current default circle view where needed                                                                            |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Add a shortlist tab / default tab behavior for planning groups while preserving current meals/events/chat behavior for circles                             |
| `lib/discover/actions.ts`                            | Expose any additional public fields required for unified discovery cards without changing the current directory contract                                   |
| `lib/discovery/actions.ts`                           | Expose any additional public chef fields needed by the unified feed and keep location filtering logic canonical                                            |
| `lib/profile/actions.ts`                             | Extend `getPublicChefProfile()` with menu/package spotlight data lookups                                                                                   |
| `lib/hub/group-actions.ts`                           | Add a thin helper for planning-group creation that reuses `createHubGroup()` and existing membership behavior                                              |
| `lib/hub/profile-actions.ts`                         | Reuse `getOrCreateProfile()` for public planning-group creation from `/eat`                                                                                |
| `lib/db/schema/schema.ts`                            | Add generated schema definitions for `hub_group_candidates` after migration generation                                                                     |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_group_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  added_by_profile_id uuid NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,
  candidate_type text NOT NULL CHECK (
    candidate_type IN ('chef', 'listing', 'menu', 'package', 'meal_prep_item')
  ),
  chef_id uuid REFERENCES chefs(id) ON DELETE CASCADE,
  directory_listing_id uuid REFERENCES directory_listings(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES menus(id) ON DELETE CASCADE,
  experience_package_id uuid REFERENCES experience_packages(id) ON DELETE CASCADE,
  meal_prep_item_id uuid REFERENCES meal_prep_items(id) ON DELETE CASCADE,
  notes text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_hub_group_candidates_group ON hub_group_candidates(group_id, sort_order);
CREATE INDEX idx_hub_group_candidates_type ON hub_group_candidates(candidate_type);
```

### New Columns on Existing Tables

None.

### Migration Notes

- This is intentionally narrow. Do not add a new consumer account system or a second social graph.
- The planning container should be `hub_groups` with `group_type = 'planning'`. The new table only stores candidate entities.
- The builder must check the current highest migration before choosing the real timestamp.
- The builder must update generated schema artifacts after the migration. Note the existing repo mismatch where `chef_marketplace_profiles` exists in migration and generated outputs but not in `lib/db/schema/schema.ts`; do not repeat that inconsistency.

---

## Data Model

### Existing read models to reuse

1. `directory_listings`
   - Broad food/place discovery, including photo, menu, website, and hours (`lib/db/schema/schema.ts:23737-23755`)
2. `chef_directory_listings`
   - Public chef-card summary fields such as cuisines, dietary specialties, service types, price, and reviews (`lib/db/schema/schema.ts:21842-21864`)
3. `chef_marketplace_profiles`
   - Public chef discovery profile fields used in `/chefs` and inquiry acceptance (`database/migrations/20260401000108_onboarding_overhaul.sql:17-19`, `types/database.ts:6615`)
4. `chefs`
   - Public link controls and `featured_booking_menu_id` (`lib/db/schema/schema.ts:19674-19692`, `lib/db/schema/schema.ts:19748-19773`)
5. `menus` / `dishes` / `dish_index_summary`
   - Showcase menu and dish content that can be surfaced publicly when intentionally selected (`lib/db/schema/schema.ts:11764`, `lib/db/schema/schema.ts:11799`, `lib/db/schema/schema.ts:24865-24889`)
6. `experience_packages`
   - Active public package objects that can enrich chef discovery (`lib/db/schema/schema.ts:20408-20450`)
7. `meal_prep_items`
   - Public read meal-prep catalog objects (`lib/db/schema/schema.ts:21429-21453`)
8. `hub_groups`, `hub_guest_profiles`
   - Existing collaboration container and public profile model, including support for `planning` group type (`lib/db/schema/schema.ts:14718-14750`, `lib/hub/group-actions.ts:11-30`, `lib/hub/profile-actions.ts:17-72`)

### New model introduced by this spec

`hub_group_candidates` becomes the canonical pre-booking shortlist model.

It exists for one reason: the hub already handles people, sharing, notes, photos, chat, and schedule, but it does not currently have a first-class model for "these are the options we are deciding between."

### Public menu/package spotlight selection rules

When rendering a public chef-page spotlight or `/eat` result enrichment, the selection order is:

1. `chefs.featured_booking_menu_id` when present
2. first `menus.is_showcase = true` menu for that chef
3. active `experience_packages` linked to a public menu
4. public `meal_prep_items` when the current intent is meal prep

### Recipe boundary

This spec does **not** create a public recipe directory.

Recipe sharing remains controlled and post-service by design:

- existing guest documents already support `recipe_card`
- existing guest portals already support published documents

This spec only prepares the consumer journey for intentional chef-controlled recipe sharing later. It does not expose full recipes in public discovery.

---

## Server Actions

| Action                                    | Auth              | Input                                                                              | Output                                                                                    | Side Effects                                                                                                                  |
| ----------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `getConsumerDiscoveryFeed(filters)`       | none              | `{ craving?, occasion?, fulfillment?, location?, budget?, dietary?, visualMode? }` | grouped, intent-scored public results combining chefs, listings, and spotlight candidates | none                                                                                                                          |
| `getChefMenuSpotlight(slug)`              | none              | `{ slug }`                                                                         | `{ featuredMenu?, showcaseMenus?, packages?, mealPrepItems? }`                            | none                                                                                                                          |
| `createPlanningGroupFromDiscovery(input)` | none              | `{ displayName, email?, name, description?, seedCandidates[] }`                    | `{ groupToken, profileToken }`                                                            | creates or reuses `hub_guest_profiles`, creates `hub_groups` row with `group_type = 'planning'`, inserts shortlist candidates |
| `addPlanningCandidate(input)`             | public link-based | `{ groupToken, profileToken, candidate }`                                          | `{ success, candidate }`                                                                  | writes `hub_group_candidates`                                                                                                 |
| `removePlanningCandidate(input)`          | public link-based | `{ groupToken, profileToken, candidateId }`                                        | `{ success }`                                                                             | deletes `hub_group_candidates`                                                                                                |
| `reorderPlanningCandidates(input)`        | public link-based | `{ groupToken, profileToken, orderedIds[] }`                                       | `{ success }`                                                                             | updates `sort_order`                                                                                                          |
| `submitPublicInquiry(input)`              | none              | existing inquiry payload                                                           | existing response                                                                         | unchanged; remains the write path into inquiry/event creation (`lib/inquiries/public-actions.ts:57-325`)                      |

### Important reuse rules

- Do not create a second booking write path.
- Do not create a second social membership model.
- Do not create a second recipe publication model.

---

## UI / Component Spec

### Page Layout

#### A. New `/eat` route

The new route is the consumer-first front door.

Required sections:

1. Intent header
   - question-led copy such as "What should I eat?"
   - quick-select chips for `Tonight`, `Dinner Party`, `Meal Prep`, `Private Chef`, `Going Out`, `Something Visual`
2. Guided filter row
   - mood / craving
   - fulfillment mode
   - group size
   - budget
   - dietary needs
   - location
   - visual mode toggle
3. Result groups
   - top chef matches
   - top places/listings
   - spotlight menus/packages when available
4. Planning CTA
   - "Start a shortlist with friends"
5. Booking CTA
   - "Book a chef" when intent clearly indicates hosted/private service

#### B. Public chef page

Keep the current proof-first structure intact.

Insert one new spotlight block between proof and credentials:

- featured booking menu or showcase menu
- package highlight if no menu exists
- meal-prep items when meal-prep is the dominant service type

The public chef page must still remain the canonical proof page.

#### C. Planning-mode hub group

Do not create a new route family if the existing hub route can be reused.

For `group_type = 'planning'`, use the current hub shell but change the default tab order:

1. shortlist
2. chat
3. schedule
4. notes
5. members
6. photos

Keep meals/events tabs available only when they are relevant. Planning groups should not pretend to already be event groups.

### States

- **No results:** Preserve current zero-result behavior and add clearer rerouting suggestions into `/book`, `/chefs`, or `/discover`
- **Sparse data:** If a chef has no showcase menu/package data, keep the current proof/portfolio layout and show no fake placeholder menu
- **No photos:** fall back cleanly to branded placeholders instead of broken image boxes
- **Low-vision mode:** larger cards, larger text, stronger contrast, fewer competing secondary actions, and image-first arrangement
- **Anonymous planning:** allow creation through `getOrCreateProfile()` using name and optional email; do not force auth

### Interactions

- Clicking an intent chip should preconfigure filters, not hard-navigate unless the user chooses a deeper route
- The result card primary CTA should vary by type:
  - chef -> `View chef` or `Book chef`
  - listing -> `View place`
  - menu/package -> `View chef`
  - planning CTA -> `Add to shortlist`
- Adding to shortlist from `/eat` should either:
  - create a planning group if none exists yet, or
  - add into the current planning group context
- Planning-group discussion should happen through the existing hub feed, not a new comment system

---

## Edge Cases and Error Handling

1. Missing menu/package data
   - Many chefs will not yet have showcase menus or active packages. The UI must degrade to proof + portfolio without implying missing content is an error.
2. Mixed result types
   - `/eat` will merge chefs, places, and menu/package items. Cards must be clearly labeled so the user understands whether they are looking at a person, a place, or a package.
3. Privacy boundary
   - Only intentionally public menu/package data may be shown. Do not surface internal recipes, internal cost data, or non-showcase menus.
4. Planning-group misuse
   - Planning groups are pre-booking collaboration spaces. Do not automatically create inquiries or events until the user explicitly chooses to book.
5. Data incompleteness
   - The feed must tolerate missing images, missing websites, missing menus, missing geo details, and missing review counts.
6. Existing hub assumptions
   - Circle and bridge behaviors already exist. Planning behavior must branch explicitly and not silently alter event-linked groups.

---

## Verification Steps

1. Open `/eat` and confirm the page renders guided intent chips and a mixed result feed without breaking `/discover`, `/chefs`, or `/book`.
2. Toggle visual mode and confirm card density, text sizing, and action hierarchy change on `/eat`, `/discover`, and `/chefs`.
3. From `/eat`, create a planning group as an unauthenticated user with only name and optional email. Confirm a `hub_guest_profiles` row is created/reused and a `hub_groups` row is created with `group_type = 'planning'`.
4. Add at least one chef and one directory listing into the planning shortlist. Confirm `hub_group_candidates` rows are created and render in the planning-group shortlist tab.
5. Open an existing non-planning circle and confirm nothing about meals/events/chat regresses.
6. Open a public chef page with a featured booking menu or showcase menu and confirm the menu/package spotlight renders below the proof section without disrupting reviews, credentials, or partner showcase.
7. Open a public chef page without any menu/package spotlight data and confirm the page still renders correctly with no fake menu block.
8. Route from `/eat` to `/book` and confirm booking still uses the existing public booking flow and creates inquiry + draft event through current server logic.
9. Confirm that no public recipe directory is exposed and that recipe sharing remains limited to existing controlled document paths.

---

## Spec Validation

### 1. What exists today that this touches?

- Public food directory: `app/(public)/discover/page.tsx:248-355`, `app/(public)/discover/_components/listing-card.tsx:32-47`, `app/(public)/discover/_components/listing-card.tsx:141-159`, `app/(public)/discover/[slug]/page.tsx:137-169`, `app/(public)/discover/[slug]/page.tsx:273-295`, `lib/db/schema/schema.ts:23737-23755`
- Public chef marketplace: `app/(public)/chefs/page.tsx:341-419`, `app/(public)/chefs/page.tsx:481-519`, `app/(public)/chefs/page.tsx:586-599`, `lib/db/schema/schema.ts:21842-21864`
- Public chef profile: `app/(public)/chef/[slug]/page.tsx:161-185`, `app/(public)/chef/[slug]/page.tsx:419-545`, `lib/profile/actions.ts:102-128`, `lib/profile/actions.ts:156-216`, `lib/profile/actions.ts:260-274`
- Public booking: `app/(public)/book/page.tsx:21-40`, `app/api/book/route.ts:75-107`, `app/api/book/route.ts:246`, `docs/app-complete-audit.md:1937`, `docs/app-complete-audit.md:1952`
- Public inquiry + auto Dinner Circle: `lib/inquiries/public-actions.ts:57-72`, `lib/inquiries/public-actions.ts:182-205`, `lib/inquiries/public-actions.ts:250-285`, `lib/inquiries/public-actions.ts:287-325`
- Guest portal and controlled recipe/doc path: `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:397-421`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:521-544`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:984-1008`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:1190-1214`, `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:1258-1282`, `lib/db/schema/schema.ts:14172-14229`, `lib/db/schema/schema.ts:15170-15202`
- Hub / Dinner Circle system: `docs/feature-inventory.md:86`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:346-360`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:389-434`, `lib/db/schema/schema.ts:14718-14750`, `lib/hub/group-actions.ts:11-30`, `lib/hub/types.ts:61`, `lib/hub/profile-actions.ts:17-72`
- Existing public menu/package-capable tables: `lib/db/schema/schema.ts:11764`, `lib/db/schema/schema.ts:11799`, `lib/db/schema/schema.ts:19748-19773`, `lib/db/schema/schema.ts:20408-20450`, `lib/db/schema/schema.ts:21429-21453`, `lib/db/schema/schema.ts:24865-24889`

### 2. What exactly changes?

- Add a new public route `/eat` and its supporting components for intent-led mixed discovery
- Add a new read layer that merges current directory and chef data rather than replacing either source
- Add menu/package spotlighting to the public chef page using existing showcase/public data
- Add planning-group shortlist storage via one new table and render that inside the existing hub shell
- Add visual-mode support to public discovery surfaces
- Keep `submitPublicInquiry()` and `POST /api/book` as the only booking write paths

Nothing in this spec removes `/discover`, `/chefs`, `/book`, guest portal routes, or current Dinner Circle routes.

### 3. What assumptions are you making?

- **Verified:** `hub_groups` already supports `planning` group type (`lib/db/schema/schema.ts:14740`, `lib/hub/group-actions.ts:20`, `lib/hub/types.ts:61`)
- **Verified:** public hub guest profiles can be created without auth (`lib/hub/profile-actions.ts:17-72`)
- **Verified:** public showcase menus and dishes already have public-read capability (`lib/db/schema/schema.ts:11799`, `lib/db/schema/schema.ts:1107`)
- **Verified:** public meal-prep items and experience packages already have public-read capability (`lib/db/schema/schema.ts:20449`, `lib/db/schema/schema.ts:21453`)
- **Verified:** current public chef page does not yet fetch or render menu/package spotlight data; it focuses on proof, credentials, partners, reviews, and availability (`app/(public)/chef/[slug]/page.tsx:161-185`, `app/(public)/chef/[slug]/page.tsx:419-545`, `lib/profile/actions.ts:102-128`, `lib/profile/actions.ts:156-216`)
- **Unverified but flagged:** the density and quality of showcase menu/package data across live chefs is not yet measured from runtime. The UI must therefore degrade cleanly when data is absent.
- **Unverified but flagged:** accessibility quality has not been screen-reader audited in this session. This spec only claims concrete UI hardening, not full WCAG verification.

### 4. Where will this most likely break?

1. Mixed-result feed normalization
   - The new `/eat` route merges heterogeneous data sources. Incorrect ranking or missing type labels will confuse users fast.
2. Public menu/privacy boundary
   - It is easy for a builder to accidentally expose internal menu or recipe data instead of only showcase/public content.
3. Hub behavior collision
   - The hub already has `circle` and `bridge` behaviors. A sloppy `planning` branch could unintentionally change event-linked hub experiences.

### 5. What is underspecified?

Two areas would cause builder guessing if not pinned down:

1. Planning-group storage
   - Without `hub_group_candidates`, a builder will be tempted to overload notes/messages for shortlist storage. This spec forbids that.
2. Menu spotlight source order
   - Without explicit selection rules, builders will guess between `featured_booking_menu_id`, showcase menus, packages, and meal-prep items. This spec defines the order in `## Data Model`.

### 6. What dependencies or prerequisites exist?

- Current public marketplace routes must remain healthy: `/discover`, `/chefs`, `/book` (`docs/app-complete-audit.md:1920-1976`)
- Existing public proof work should already be in place because chef-page spotlighting depends on the current proof-first page structure (`app/(public)/chef/[slug]/page.tsx:419-545`)
- A new migration is required for `hub_group_candidates`
- Generated schema artifacts must be updated after the migration

### 7. What existing logic could this conflict with?

- Shared public discovery services in `lib/discover/actions.ts` and `lib/discovery/actions.ts`
- Shared hub route behavior in `app/(public)/hub/g/[groupToken]/page.tsx` and `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`
- Shared public inquiry/booking logic in `lib/inquiries/public-actions.ts:57-325` and `app/api/book/route.ts:75-246`
- Existing guest-portal recipe/document logic in `lib/db/schema/schema.ts:14172-14229`

### 8. What is the end-to-end data flow?

1. User opens `/eat`
2. `getConsumerDiscoveryFeed(filters)` reads from:
   - `directory_listings`
   - chef discovery data
   - public menu/package/item sources
3. User either:
   - clicks through to an existing chef/listing detail route, or
   - starts a planning group
4. Planning path:
   - `getOrCreateProfile()` creates/reuses `hub_guest_profiles` (`lib/hub/profile-actions.ts:17-72`)
   - `createHubGroup()` creates `hub_groups` with `group_type = 'planning'` (`lib/hub/group-actions.ts:26-53`)
   - shortlist items are written to `hub_group_candidates`
   - user shares `/hub/g/[groupToken]`
5. Booking path:
   - user routes to `/book` or public chef inquiry
   - current booking logic writes inquiry, Dinner Circle, and draft event (`lib/inquiries/public-actions.ts:182-325` or `app/api/book/route.ts:107-246`)

### 9. What is the correct implementation order?

1. Add migration for `hub_group_candidates`
2. Update generated schema artifacts
3. Build `lib/public-consumer/*` read layer
4. Build `/eat` route and unified result cards
5. Add public chef menu/package spotlighting
6. Add planning-group shortlist actions and hub rendering
7. Add visual-mode hardening across `/eat`, `/discover`, and `/chefs`
8. Add optional `/book` prefill from planning/intent context

### 10. What are the exact success criteria?

- `/eat` exists and helps a user browse food/service options by intent instead of forcing them to start from a schema-specific route
- Public chef pages surface at least one intentional menu/package spotlight when eligible public data exists
- Planning groups can be created publicly and shared without requiring an inquiry first
- Existing `/discover`, `/chefs`, `/book`, guest portal, and current Dinner Circle flows still behave correctly
- No internal/private recipe data becomes publicly visible
- Visual-mode improvements are real across the touched public surfaces

### 11. What are the non-negotiable constraints?

- No rewrite of `/discover`, `/chefs`, `/book`, or hub core
- No second booking write path
- No public recipe library in this spec
- No exposure of non-showcase menus, private recipes, cost data, or internal notes
- Keep planning collaboration inside the existing hub membership/profile model

### 12. What should NOT be touched?

- `submitPublicInquiry()` semantics (`lib/inquiries/public-actions.ts:57-325`)
- `POST /api/book` booking semantics (`app/api/book/route.ts:75-246`)
- Guest portal RSVP/document messaging flow (`app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx:397-1282`)
- Existing event-linked circle behavior unless the group is explicitly `planning`

### 13. Is this the simplest complete version?

Yes.

The spec intentionally avoids:

- a second social system
- a second booking flow
- a public recipe marketplace
- a chef-follow graph
- a voting system for shortlists in phase one

It uses the current public marketplace, current hub stack, and current menu/package data instead of inventing new product categories.

### 14. If implemented exactly as written, what would still be wrong?

- It would still not fully solve follow/save/repeat chef relationships outside planning groups
- It would still rely on chefs having enough public menu/package/photo data for discovery richness
- It would improve low-vision usability but would not by itself certify complete accessibility compliance

---

## Out of Scope

- Public recipe marketplace or public recipe library
- Replacing `/discover` with `/eat`
- Replacing `/chefs` with `/eat`
- New chef-follow / consumer-account system
- Real-time group voting or ranking mechanics
- Payments, checkout, or instant booking redesign
- Reworking guest portals, review flows, or post-event trust logic beyond preserving compatibility

---

## Notes for Builder Agent

Build this in phases. Do not try to land it as one giant PR.

Recommended PR order:

1. migration + schema + read layer
2. `/eat` route and unified result cards
3. chef menu/package spotlighting
4. planning-group shortlist board
5. visual-mode hardening and booking prefill polish

The two biggest builder mistakes would be:

1. trying to replace the current public routes instead of composing them
2. exposing too much menu/recipe detail because the public experience feels sparse

The correct posture is additive, strict about privacy, and disciplined about reusing the systems that already exist.

---

## Final Check

This spec is production-ready for planning and builder handoff, with two explicit non-blocking uncertainties:

1. live showcase menu/package density per chef is not runtime-verified in this session
2. accessibility quality is not screen-reader-audited in this session

Neither uncertainty affects the structural correctness of the build plan because the spec already requires clean empty states and forbids overclaiming accessibility completeness.
