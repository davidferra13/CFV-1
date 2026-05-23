# ChefFlow `/eat` Persistent Food Near Me Master Spec

Status: product/spec artifact only. Not implemented. Not queued.

Evidence pack: `.evidence/live-browser/2026-05-20-15-31-58-google-food-near-me-to-chefflow-eat`

Primary research source: live Google `food near me` study, Playwright screenshots, codebase inspection of `/eat`, discovery, nearby saved search, location cookie, and public consumer discovery modules.

## 1. Raw User Intent To Preserve

"I want you to go to Google, type `food near me`, and study absolutely everything the page does while typing, after submitting, and on the results page. I want to understand how Google already knows where I am, uses my zip/location, and automatically shows food near me. I want ChefFlow `/eat` to make this unnecessary: when a person goes to ChefFlow Eat, their food-near-me world should already be there, saved and localized, so they do not have to go to Google and type `food near me`."

## 2. Product Thesis

`/eat` should become the user's persistent, saved, localized food home.

It should not behave like a blank search page. On first load, it should already know the best allowed location context, show nearby food, preserve recent food intent, surface saved chefs/places/meals/events, and make refinement controls immediately available.

The user promise:

> "I do not need to go to Google and type food near me. ChefFlow Eat already has my food-near-me world ready."

## 3. Research Facts

Observed from Google in this session:

- Google autocomplete surfaced `food near me` by the `f` prefix.
- By `foo` and `food`, autocomplete included local city/state, open-now, delivery, places, and radius variants.
- Google inferred a local city/ZIP from IP address without the user typing a location.
- Google offered precise location as an optional upgrade, not a hard gate.
- Google exposed an update-location control from the footer location label and showed status feedback while updating.
- The SERP showed Places and a map above normal web results.
- The local pack exposed place title, image, rating, review count, price, category, address, review snippet, and map marker.
- Google refinement chips included Open now, Top rated, Cheap, Upscale, Accepts reservations, Recently opened, Vibe, Cuisine, and Price.
- The Cuisine dropdown exposed common cuisine shortcuts.
- The Price dropdown exposed price-range controls.
- The Vibe dropdown exposed mood/occasion style controls.
- Clicking a place expanded a local-place detail view with richer decision and action surfaces.
- Clicking Maps handed off the same intent into a map-first local discovery workspace.

Constraints:

- Logged-out Google context only.
- Precise browser geolocation was not granted.
- Saved Google places, account history, and account personalization were not observed.
- Mobile behavior remains under-studied because the scripted mobile context hit Google's unusual-traffic page and the MCP resize was not a reliable mobile app/browser run.

## 4. Existing ChefFlow Implementation Map

Verified code surfaces:

- `app/(public)/eat/page.tsx`
  - Parses `intent`, `craving`, `location`, `budget`, `dietary`, `dateWindow`, `partySize`, `eventStyle`, `useCase`, and `visual`.
  - Calls `getConsumerDiscoveryFeed(filters)`.
  - Builds a discovery runtime plan for the `eat` surface.
  - Emits JSON-LD for public discoverability.

- `app/(public)/eat/_components/consumer-intent-filters.tsx`
  - Has intent chips: Tonight, This Weekend, Dinner Party, Meal Prep, Private Chef, Going Out, Team Dinner, Work Lunch, Surprise Me.
  - Has Budget, Dietary, Event Style, Location, Party Size, Visual toggle, and a craving search field.

- `app/(public)/eat/_components/consumer-intent-shell.tsx`
  - Shows Discovery brief, Local context, Best matches, result sections, Compare, Collections, Templates, Try next, and empty-state recovery.
  - Supports comparison inside a session.
  - Builds local signals from `buildLocalFoodIntelligence(filters.location)`.

- `lib/public-consumer/discovery-actions.ts`
  - Defines `ConsumerDiscoveryFilters`.
  - Converts chefs, listings, and spotlights into consumer result cards.
  - Includes `locationLabel`, `priceLabel`, `rating`, `reviewCount`, `isAvailable`, `dietaryTags`, and `serviceModes`.
  - Applies location filters from text input.

- `lib/discovery/consumer-discovery-model.ts`
  - Builds discovery brief, match reasons, proof signals, local food intelligence, public collections, recovery actions, compare candidates, and "Search without location".

- `lib/discover/nearby-saved-search.ts`
  - Normalizes saved nearby searches with query, business type, cuisine, city/state, price, location, radius, coordinates, baseline match count, and search key.

- `lib/location/public-location-cookie.ts`
  - Provides public pre-auth default location cookie helpers using `cf_default_zip`.

- `components/discovery/save-chef-button.tsx`
  - Existing save-chef affordance.

- `lib/discovery/action-shareable-link.ts`
  - Supports shareable discovery state, including filters and shortlist IDs.

- `lib/discovery/registries/client-rail-registry.ts`
  - Contains client rail concepts for cuisine, location, saved items, "What to Eat Now", shortlist compare/share/stale, recent search, and other discovery states.

Current implementation status:

- `/eat` is partially product-shaped for public discovery.
- It does not yet fully behave as a persistent saved local food home.
- The main gap is orchestration of location, persistence, saved context, first-viewport rails, live local affordances, and trust-state labeling.

## 5. Core Product Requirements

### R1. First Load Must Not Be Blank

When a user opens `/eat`, ChefFlow must render a useful food-near-me surface before the user types.

Required behavior:

- If a saved/default location exists, show localized rails immediately.
- If only approximate location is available, show localized rails with an "Approximate" label.
- If no location is available, show a location bootstrap panel plus non-local fallback rails.
- If recent food intent exists, show it as resumable context.
- If saved food entities exist, show them in a saved local food world surface.

Acceptance criteria:

- `/eat` with saved location shows nearby results or a valid loading/empty state without typing.
- `/eat` without saved location shows clear next actions: Set location, Use current location, Browse without location.
- No screen claims "near you" unless a location source exists and is labeled.

### R2. Location Confidence Model

ChefFlow must distinguish location source and confidence.

Location states:

- `unknown`: no usable location.
- `user_entered`: user typed city, state, or ZIP.
- `public_saved`: public pre-auth cookie location.
- `account_saved`: authenticated account default location.
- `approximate_ip`: coarse inferred location, if implemented and legally acceptable.
- `browser_precise`: browser geolocation permission granted.
- `stale`: saved location exists but is old or unverified.

Required controls:

- Use current location.
- Set location manually.
- Update location.
- Show updating-location status.
- Continue with approximate location.
- Clear saved location.
- Explain location source.
- Report wrong location.

Acceptance criteria:

- Every localized view displays source/confidence.
- User can change or clear location.
- Location update shows loading/status feedback.
- Precise location is never collected without explicit permission.
- Denied precise location does not block discovery.

### R3. Persistent Food Context

ChefFlow must preserve a user's food-near-me world across sessions.

Persistent objects:

- Saved location.
- Recent searches.
- Saved search snapshots.
- Saved chefs.
- Saved places.
- Saved menus/packages.
- Saved meals.
- Saved events/popups.
- Saved shortlists.
- Taste and dietary profile.
- Budget comfort.
- Preferred fulfillment modes.
- Hidden/disliked results.

Acceptance criteria:

- User can save a search and see it after reload.
- User can save a chef/place/menu and see it in the saved local food world.
- User can remove saved context.
- Public/pre-auth persistence is scoped and privacy-labeled.
- Authenticated persistence follows auth and user/tenant scoping rules.

### R4. First Viewport Surfaces

The first viewport of `/eat` should prioritize immediate action, not marketing copy.

Required first-viewport modules:

- Location chip and confidence label.
- "Near you now" rail.
- "Saved around here" rail.
- "Recent food searches" rail.
- Search/autocomplete input.
- Refinement chip row.
- Map/List toggle when local listings exist.

Fallback first viewport if no location:

- Set location manually.
- Use current location.
- Continue without location.
- Popular cuisines.
- ChefFlow picks.
- Dinner/meal-prep intent chips.

Acceptance criteria:

- The user sees a concrete food option or a concrete setup action above the fold.
- Search is present but not the only path forward.

### R5. Search And Autocomplete

ChefFlow should infer food intent early, like Google does.

Autocomplete should support:

- Prefixes: `f`, `fo`, `foo`, `food`.
- Local intent: near me, open now, delivery, pickup, dine in, within radius.
- Cuisine: Italian, Mexican, Chinese, pizza, sushi, Thai, seafood, vegetarian.
- Occasion: date night, team dinner, dinner party, work lunch, family meal.
- ChefFlow-native options: private chef, meal prep, tasting menu, pop-up, gift card.
- Recent searches.
- Saved searches.
- Saved places/chefs.

Acceptance criteria:

- Typing `food` offers local food suggestions when a location exists.
- Typing cuisine names offers local and chef-led suggestions.
- Selecting an autocomplete item updates URL state and result rails.
- Suggestions are labeled by source: recent, saved, nearby, cuisine, chef, place, event.

### R6. Refinement Chips

Google's chips become ChefFlow refinement controls.

Required primary chips:

- Open now.
- Top rated.
- Price.
- Cuisine.
- Vibe.
- Radius.
- Delivery.
- Pickup.
- Dine in.
- Private chef.
- Meal prep.
- Accepting inquiries.
- Available this week.

Optional chips:

- Recently opened.
- Family friendly.
- Date night.
- Healthy.
- Late night.
- Vegetarian.
- Gluten-free.
- Good for groups.
- Reservations.
- Chef-led.

Acceptance criteria:

- Every chip has active, inactive, disabled, loading, and clear states.
- Every chip is URL-addressable.
- Unsupported chips are hidden or labeled as unavailable, not fake.
- Chip changes do not lose saved/compare state unless intentionally reset.

### R7. Local Results List

Local results should support fast comparison.

Card requirements:

- Title.
- Image.
- Type: chef, place, menu, package, event, meal prep.
- Location/distance when known.
- Location source/confidence.
- Rating/review count when available.
- Price/range.
- Cuisine/category.
- Open/closed/availability.
- Fulfillment modes.
- Trust/source label.
- Why shown.
- Primary action.
- Save action.
- Compare action.
- Hide/not for me.

Acceptance criteria:

- Every result card shows enough information to compare without opening detail.
- Every result has a next action or an explicit reason action is unavailable.
- Cards do not imply open-now/rating/distance unless data exists.

### R8. Map/List Mode

ChefFlow should support map-assisted local browsing without trying to clone Google Maps.

Required behavior:

- List-first default on desktop unless map mode is selected.
- Map/list split when local results have coordinates.
- Map markers correspond to visible local results.
- Selecting a marker highlights the list card.
- Selecting a card highlights the marker.
- No map shown when coordinates are missing; show "list only" reason.

Acceptance criteria:

- Map mode is available only when coordinate data supports it.
- Map does not block result browsing.
- Mobile map mode uses a sheet/drawer, not a cramped split screen.

### R9. Place/Chef/Menu Detail Drawer

Clicking a result should open a detail view without forcing navigation away.

Detail drawer content:

- Photos.
- Title and type.
- Location and confidence.
- Hours/availability.
- Price.
- Cuisine/tags.
- Rating/review count where available.
- Source freshness.
- Description or review snippets.
- Related chefs/menus/events.
- Saved status.
- Compare status.
- Actions.

Allowed action tiers:

- Primary: View, inquire, book/request, save, compare.
- Secondary: directions/map, share, add to shortlist, see menus, see similar.
- Protected/final: call, reserve, order, review, message, final submit. These require explicit product decision, integration, and safety gates.

Acceptance criteria:

- Detail drawer can be opened and closed without losing search context.
- Final actions are clearly separated from informational actions.
- If external actions exist, source and handoff are explicit.

### R10. Saved Food World

Saved context is the core product differentiator.

Saved entities:

- Search.
- Place.
- Chef.
- Menu.
- Package.
- Meal prep item.
- Event/pop-up.
- Shortlist.
- Cuisine.
- Location.
- Circle-shared item.

Saved surfaces:

- Saved around here.
- Recently saved.
- Saved searches.
- Shortlists.
- Circle saves.
- Revisit this.
- Similar to saved.

Acceptance criteria:

- Save actions exist in result cards and detail drawers.
- Saved items are visible on `/eat` without needing to search.
- Unsaving is reversible or clearly confirmed.
- Share links do not include private saved context by default.

### R11. Compare And Shortlist

ChefFlow should turn food-near-me browsing into planning.

Required behavior:

- Add to compare.
- Compare within same entity type by default.
- Create shortlist from compare.
- Save shortlist.
- Share shortlist with circle or link.
- Show stale shortlist warning.
- Resume shortlist from recent context.

Acceptance criteria:

- User can compare at least two compatible results.
- User can clear compare.
- User can save a shortlist.
- User can reload and resume saved shortlist.
- Sharing requires preview of included data.

### R12. Chef-Led Alternative Rail

ChefFlow should not only copy restaurant discovery. It should answer: "What is the ChefFlow-native way to satisfy this craving?"

Required rail examples:

- Instead of restaurant delivery: meal prep or chef-cooked drop-off.
- Instead of date-night restaurant: private chef/date-night package.
- Instead of team lunch: catered work lunch.
- Instead of open-now dinner: available chef or nearby partner.
- Instead of generic Italian near me: saved Italian chef, Italian menu, Italian place.

Acceptance criteria:

- Restaurant/place results and chef-led options appear together but are visually distinct.
- ChefFlow explains the alternative: "Chef-led option for this craving."
- Chef-led results do not bury actual nearby places when user intent is clearly immediate.

### R13. Privacy And Consent

Location and food preferences are sensitive.

Rules:

- Precise location requires explicit consent.
- Approximate/user-entered/saved location must be labeled.
- User can clear public saved location.
- User can browse without location.
- Public share links must not include exact location or private saved entities by default.
- Authenticated saved preferences must use server-side guards and user/tenant scoping.
- Do not expose account identifiers in public views.

Acceptance criteria:

- Every saved or inferred location has a clear source label.
- Every permission request explains benefit and fallback.
- Every share action previews included filters, location, and shortlist items.

### R14. Empty, Loading, Error, And Stale States

Required states:

- No location.
- Location denied.
- Wrong approximate location.
- No local results.
- Local source unavailable.
- Saved search stale.
- Result no longer available.
- Map unavailable.
- Coordinates missing.
- Authentication needed for saving.
- Public save unavailable or limited.

Acceptance criteria:

- Every state has a useful recovery action.
- No state leaves the user on a dead end.
- Errors do not erase existing saved context.

### R15. Analytics And Learning Loop

Events to track:

- `/eat` loaded with location state.
- Location set/updated/cleared.
- Precise location requested/allowed/denied.
- Search typed.
- Autocomplete selected.
- Chip applied/removed.
- Result viewed.
- Save/unsave.
- Compare add/remove.
- Shortlist created/shared.
- Detail opened.
- Map/list toggled.
- External handoff.
- Hide/not for me.
- Empty-state recovery selected.

Acceptance criteria:

- Events do not log precise location unless permitted and necessary.
- Analytics distinguishes public/anonymous from authenticated.
- Events support measuring whether users search less over time because `/eat` is already ready.

## 6. Data Model Requirements

Proposed conceptual entities:

### `FoodLocationContext`

Fields:

- `id`
- `user_id` nullable for public session bridge
- `session_id` nullable hashed/opaque
- `label`
- `city`
- `state`
- `zip`
- `lat` nullable
- `lng` nullable
- `source`: unknown, user_entered, public_saved, account_saved, approximate_ip, browser_precise
- `confidence`: low, medium, high
- `is_default`
- `last_confirmed_at`
- `created_at`
- `updated_at`

### `SavedFoodSearch`

Fields:

- `id`
- `user_id` or public/session owner key
- `query`
- `intent`
- `filters_json`
- `location_context_id`
- `result_count_at_save`
- `last_seen_result_count`
- `search_key`
- `label`
- `created_at`
- `updated_at`
- `last_used_at`

Existing support: `lib/discover/nearby-saved-search.ts` already models a nearby saved search state and key.

### `SavedFoodEntity`

Fields:

- `id`
- `user_id`
- `entity_type`: chef, place, menu, package, meal, event, cuisine, search
- `entity_id`
- `source`
- `location_context_id`
- `label`
- `notes`
- `visibility`: private, circle, shared_link
- `created_at`
- `updated_at`

### `FoodIntentSession`

Fields:

- `id`
- `user_id` nullable
- `session_id` nullable
- `entry_source`
- `initial_query`
- `normalized_intent`
- `location_context_id`
- `filters_json`
- `compare_ids`
- `shortlist_id`
- `started_at`
- `last_activity_at`

### `FoodResultSnapshot`

Fields:

- `id`
- `saved_search_id`
- `entity_type`
- `entity_id`
- `rank`
- `title`
- `location_label`
- `price_label`
- `rating`
- `review_count`
- `availability_label`
- `source_freshness`
- `captured_at`

## 7. URL And State Contract

Existing `/eat` params should remain supported:

- `intent`
- `craving`
- `location`
- `budget`
- `dietary`
- `dateWindow`
- `partySize`
- `eventStyle`
- `useCase`
- `visual`

Proposed additions:

- `q`
- `mode`: browse, map, compare, shortlist, plan
- `radius`
- `openNow`
- `fulfillment`: delivery, pickup, dine_in, private_chef, meal_prep, catering
- `cuisine`
- `vibe`
- `price`
- `rating`
- `sort`
- `savedSearch`
- `shortlist`
- `source`

Rules:

- URL state should be shareable without leaking private saved context.
- Private saved IDs require auth or signed/share-token flow.
- Clearing a filter must be visible and reversible.

## 8. Ranking And Personalization

Inputs:

- Location match.
- Location confidence.
- Open/availability fit.
- Cuisine match.
- Craving text match.
- Dietary safety.
- Budget fit.
- Fulfillment fit.
- Saved/recent affinity.
- Circle/social signal with consent.
- Chef availability.
- Review/rating trust.
- Source freshness.
- Novelty/diversity.

Ranking output must expose:

- `whyShown` labels.
- `confidence` labels where relevant.
- `source` labels.
- `freshness` labels where relevant.

No opaque "best" claim without evidence.

## 9. Action-Surface Requirements

Primary actions:

- Use current location.
- Set/update location.
- Search.
- Apply chip.
- Save result.
- Save search.
- Open detail.
- Compare.
- View map/list.

Secondary actions:

- Clear location.
- Clear filter.
- Reset search.
- Share.
- Add to shortlist.
- See similar.
- Hide/not for me.
- Explain why shown.
- Report wrong location.
- Browse without location.

Grouped/advanced actions:

- Manage saved searches.
- Manage privacy.
- Export/share shortlist.
- Tune food passport.
- Notification preferences.
- Source/freshness details.

Final/consequential actions, not in initial build unless separately specified:

- Order.
- Reserve.
- Call.
- Message.
- Review.
- Final purchase.
- Final submit.

## 10. Build Candidate Pack

These are not queued. They are queue-ready drafts once the user asks to queue or fire them.

### Candidate A: Location Bootstrap And Confidence Chip

Goal:

Make `/eat` open with a clear location source and next action.

Scope:

- Read public location cookie and account default location where available.
- Add location chip with source/confidence label.
- Add Use current location, Update location, Continue without location, Clear location.
- Do not infer precise location without consent.

Likely files:

- `app/(public)/eat/page.tsx`
- `app/(public)/eat/_components/consumer-intent-shell.tsx`
- `app/(public)/eat/_components/consumer-intent-filters.tsx`
- `lib/location/public-location-cookie.ts`
- `lib/location/*`
- `lib/discovery/consumer-discovery-model.ts`

Acceptance:

- With saved location, `/eat` shows localized state on first load.
- Without location, `/eat` shows setup actions.
- Denied geolocation has recovery.
- Location source is always labeled.

Verification:

- Playwright tests for no location, cookie location, updated location, denied geolocation.
- Unit tests for location state normalization.

### Candidate B: Persistent Saved Food Search

Goal:

Let users save and resume a food-near-me search.

Scope:

- Save current filters, query, location, and result count.
- Show saved searches rail on `/eat`.
- Let user rename, rerun, and delete saved searches.
- Public session support can be limited; authenticated support should persist server-side.

Likely files:

- `lib/discover/nearby-saved-search.ts`
- `lib/discovery/action-shareable-link.ts`
- `app/(public)/eat/_components/consumer-intent-shell.tsx`
- new server action/API depending auth model

Acceptance:

- Save search appears after reload.
- Saved search can be rerun.
- Saved search can be removed.
- Share URL excludes private saved state unless explicitly shared.

Verification:

- Unit tests for saved search key and summary.
- E2E save/reload/delete path.

### Candidate C: Food Near Me First-Viewport Rails

Goal:

Replace blank-start `/eat` behavior with immediate local food rails.

Scope:

- Add Near you now.
- Add Saved around here.
- Add Recent food searches.
- Add Chef-led alternatives.
- Add Popular cuisines fallback.

Likely files:

- `app/(public)/eat/_components/consumer-intent-shell.tsx`
- `lib/discovery/consumer-discovery-model.ts`
- `lib/public-consumer/discovery-actions.ts`
- `lib/discovery/registries/client-rail-registry.ts`

Acceptance:

- First viewport shows at least one actionable rail.
- Empty states show recovery.
- Rails do not fabricate local data.

Verification:

- Screenshots for empty, saved-location, authenticated, and sparse market states.

### Candidate D: Google-Class Refinement Chips

Goal:

Make `/eat` refinement as fast as Google local search while staying ChefFlow-native.

Scope:

- Open now.
- Top rated.
- Price.
- Cuisine.
- Vibe.
- Radius.
- Delivery/Pickup/Dine-in.
- Private chef/Meal prep.
- Accepting inquiries/Available this week.

Likely files:

- `app/(public)/eat/_components/consumer-intent-filters.tsx`
- `app/(public)/eat/page.tsx`
- `lib/public-consumer/discovery-actions.ts`
- `lib/discovery/consumer-discovery-model.ts`

Acceptance:

- Every chip maps to URL state.
- Active chip can be removed.
- Unsupported data is not claimed.
- Empty result recovery appears.

Verification:

- Unit tests for filter parsing.
- E2E tests for each chip state and reset.

### Candidate E: Result Detail Drawer

Goal:

Let users inspect a chef/place/menu without losing `/eat` context.

Scope:

- Detail drawer/card expansion.
- Photos, location, source, price, availability, tags, proof labels.
- Save, compare, shortlist, view, inquire where appropriate.
- No final call/order/reserve actions in initial pass.

Likely files:

- `app/(public)/eat/_components/consumer-result-card.tsx`
- `app/(public)/eat/_components/consumer-intent-shell.tsx`
- `lib/public-consumer/discovery-actions.ts`
- `lib/discovery/consumer-discovery-model.ts`

Acceptance:

- Detail opens/closes without navigation loss.
- Actions are correctly tiered.
- Detail shows source/freshness/confidence.

Verification:

- E2E open/close/detail actions.
- Accessibility checks for drawer focus.

### Candidate F: Map/List Discovery Mode

Goal:

Support local spatial browsing without cloning Google Maps.

Scope:

- Map/list toggle.
- Coordinates-backed markers.
- Highlight marker/card.
- Fallback when coordinates unavailable.

Likely files:

- `components/ui/location-map.tsx`
- `app/(public)/eat/_components/*`
- `lib/public-consumer/discovery-actions.ts`
- directory/listing coordinate sources

Acceptance:

- Map mode only appears with coordinate data.
- List remains usable without map.
- Mobile map uses a drawer/sheet.

Verification:

- Map available/unavailable tests.
- Screenshot proof desktop/mobile.

### Candidate G: Saved Food World

Goal:

Unify saved chefs, places, menus, meals, searches, and shortlists into a persistent `/eat` home.

Scope:

- Saved around here rail.
- Saved search rail.
- Saved entity rendering.
- Shortlist persistence.
- Share preview.

Likely files:

- `components/discovery/save-chef-button.tsx`
- `app/(public)/eat/_components/shortlist-button.tsx`
- `lib/discovery/action-shareable-link.ts`
- `lib/discovery/consumer-discovery-model.ts`
- saved entity data layer to be specified

Acceptance:

- Save from card and detail.
- Saved item appears on first load.
- Unsaved item disappears with undo or confirmation.
- Share preview shows included data.

Verification:

- E2E save/reload/unsave/share preview.

### Candidate H: Privacy And Permission Contract

Goal:

Make location and saved food context trustworthy.

Scope:

- Location source labels.
- Permission prompt copy.
- Clear location.
- Clear saved local context.
- Share preview.
- Analytics redaction rules.

Likely files:

- `lib/location/*`
- `lib/discovery/*privacy*`
- `app/(public)/eat/_components/*`
- tests for public/auth states

Acceptance:

- No precise location without permission.
- No private saved context in public link by default.
- User can clear saved location.

Verification:

- Permission denied/allowed tests.
- Share URL tests.
- Unit tests for privacy state.

## 11. Recommended Sequence

Phase 0: Spec decisions

- Decide public anonymous persistence rules.
- Decide canonical local listing source.
- Decide whether map is MVP or phase 2.
- Decide if open-now is real data or a hidden/disabled chip until data exists.

Phase 1: Location and first-load value

- Candidate A: Location Bootstrap And Confidence Chip.
- Candidate C partial: Near you now and fallback rails.

Phase 2: Persistence

- Candidate B: Persistent Saved Food Search.
- Candidate G partial: saved search and saved entity rails.

Phase 3: Refinement and decision speed

- Candidate D: Refinement Chips.
- Candidate E: Result Detail Drawer.

Phase 4: Spatial browsing and richer planning

- Candidate F: Map/List Discovery Mode.
- Candidate G full: shortlists and sharing.

Phase 5: Privacy, analytics, and growth loops

- Candidate H: Privacy And Permission Contract.
- Analytics and opt-in notifications/digests.

## 12. Parallelization Boundaries

Do not have multiple agents edit the same files in the same wave.

Possible non-overlapping lanes:

- Lane 1: location state/model and cookie/account source.
- Lane 2: saved search model and tests.
- Lane 3: UI rails and result card composition.
- Lane 4: filter parsing and discovery feed query support.
- Lane 5: privacy/share contract and tests.

High-conflict files:

- `app/(public)/eat/_components/consumer-intent-shell.tsx`
- `app/(public)/eat/_components/consumer-intent-filters.tsx`
- `app/(public)/eat/page.tsx`
- `lib/public-consumer/discovery-actions.ts`
- `lib/discovery/consumer-discovery-model.ts`

These should be owned by one lead in a given wave.

## 13. Test And Verification Plan

Unit tests:

- filter parsing.
- location state normalization.
- saved search key generation.
- shareable discovery link serialization.
- ranking/match reason output.
- privacy source labels.

Integration tests:

- public `/eat` with no location.
- public `/eat` with saved cookie location.
- authenticated `/eat` with account location.
- saved search save/reload/delete.
- chip application and active token removal.
- no-results recovery.

E2E/browser:

- first viewport with saved location.
- first viewport with no location.
- geolocation allowed.
- geolocation denied.
- card detail open/close.
- compare and clear compare.
- save result and reload.
- map/list toggle where coordinates exist.
- mobile chip drawer and location controls.

Manual proof:

- screenshots for desktop and mobile.
- browser console clean for `/eat`.
- network failures handled.
- no private location in public URL unless explicitly shared.

## 14. Security And Auth Requirements

If implementation adds server actions or API routes:

- Server actions must call `requireChef()`, `requireClient()`, `requireAuth()`, `requireAdmin()`, `requireStaff()`, or `requirePartner()` before data access when authenticated data is involved.
- API routes must self-authenticate or pass through middleware auth unless intentionally public and PII-free.
- Tenant/user data must be scoped.
- Admin routes must call `requireAdmin()`.
- Public anonymous saved context must avoid exposing PII or account data.

Specific privacy checks:

- Public saved location cookie must not include unnecessary precise coordinates.
- Exact location should not appear in share URLs by default.
- Saved preferences should not leak between users/sessions.
- Analytics must avoid logging precise coordinates unless explicitly permitted and needed.

## 15. What Is Already Built, Partially Built, Missing

| Area                   | Status                                 | Evidence                                                                                           |
| ---------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/eat` route           | Partially implemented                  | `app/(public)/eat/page.tsx` exists and calls discovery feed.                                       |
| Intent chips           | Implemented but needs refinement       | Existing chips cover occasion/service, not full Google local filters.                              |
| Location input         | Implemented but weak                   | Manual Location input exists; saved/default/permission state is not fully assembled.               |
| Local context panel    | Partially implemented                  | `buildLocalFoodIntelligence` exists but is not a full persistent local home.                       |
| Nearby places          | Partially implemented                  | `feed.listings` and `Nearby Places` section exist.                                                 |
| Saved searches         | Partially implemented/underused        | `nearby-saved-search.ts` exists, but `/eat` first-load saved search rail is not verified.          |
| Saved chefs            | Partially implemented                  | `save-chef-button` exists; unified saved food world not complete.                                  |
| Compare                | Partially implemented                  | In-session compare exists; persistence/shortlist needs work.                                       |
| Refinement chips       | Partially implemented                  | Budget/dietary/event style/location/craving exist; open-now/radius/vibe/local fulfillment missing. |
| Map/list               | Not verified/likely missing for `/eat` | `components/ui/location-map.tsx` exists, but `/eat` map/list mode not verified.                    |
| Location confidence    | Missing                                | Need explicit source/confidence contract.                                                          |
| Detail drawer          | Missing or not verified                | Result cards exist; Google-like in-context detail drawer not verified.                             |
| Privacy/share contract | Partially implemented                  | `action-shareable-link.ts` exists; full location/saved context privacy contract needed.            |

## 16. Items Needing More Spec Before Queueing

1. Anonymous persistence policy
   - Can public users save searches/places without signing in?
   - Cookie vs localStorage vs temporary server session?
   - Expiration?

2. Local data source policy
   - Which local place source is authoritative?
   - Do we have hours/open-now?
   - Do we have coordinates?
   - What data can legally be displayed?

3. Map MVP
   - Is map/list required for initial "Google replacement" proof?
   - Or should first MVP be rail/list only?

4. Final action policy
   - Are order/reserve/call external handoffs in scope?
   - If not, which read-only actions are allowed?

5. Authenticated client relationship
   - Should `/eat` behave differently for clients with Dinner Circles, prior bookings, saved chefs, and preferences?

## 17. Follow-Up Research Tasks

### Research Task 1: Real mobile Google flow

Why:

Mobile local discovery likely differs materially.

Decision unblocked:

Mobile first viewport and filter drawer design.

Evidence needed:

Screenshots from a real mobile browser or reliable mobile emulation that does not trigger bot blocking.

Connected build items:

First-viewport rails, chip drawer, map/list mode.

### Research Task 2: Google Maps place detail depth

Why:

The detail surface defines many expected controls: directions, save, share, menu, hours, busy times, reviews, photos.

Decision unblocked:

ChefFlow detail drawer scope and action tiers.

Evidence needed:

Safe read-only inspection of one or two place detail panels without final actions.

Connected build items:

Result detail drawer, saved food world, action-surface hierarchy.

### Research Task 3: Competitor local food homes

Targets:

Yelp, DoorDash, Uber Eats, Apple Maps, OpenTable, Resy, Toast/restaurant direct pages.

Why:

Google is discovery; competitors reveal transaction and saved-context expectations.

Decision unblocked:

Whether ChefFlow should route to restaurants, chef-led alternatives, or saved planning first.

### Research Task 4: Current ChefFlow `/eat` live route study

Why:

We inspected code, not the running app.

Decision unblocked:

What the current UI visibly lacks versus the spec.

Evidence needed:

Canonical `http://localhost:3100/eat` screenshot, console/network check, no implementation.

Connected build items:

All UI candidates.

## 18. Definition Of Done For The Whole Product Direction

The product direction is proven when:

- A user can open `/eat` and see useful local food options without typing.
- The page clearly knows or asks for location in a consent-respecting way.
- Recent searches and saved food context survive reload.
- A user can save, compare, and resume food options.
- Local filters work without misleading claims.
- Chef-led alternatives appear naturally beside restaurant/place discovery.
- The user can update, clear, or withhold location.
- The UI explains why results appear.
- The page has mobile-ready controls.
- Verification includes screenshots, tests, and privacy checks.

## 19. Non-Goals For Initial Build

- Do not clone Google Maps.
- Do not implement final ordering/reservation/calling without separate integration spec.
- Do not collect precise location silently.
- Do not claim open-now/rating/distance without data.
- Do not make `/eat` a marketing landing page.
- Do not bury saved context behind search.

## 20. Strongest Initial Build Batch

Smallest batch that would make `/eat` feel like a real Google replacement:

1. Location confidence chip plus set/update/use-current/clear controls.
2. First-load local rails: Near you now, Saved around here, Recent food searches.
3. Save search and resume search.
4. Refinement chips: Open now, Cuisine, Price, Radius, Delivery/Pickup/Dine-in, Private chef/Meal prep.
5. Result card proof labels: location, source, price, availability, why shown.
6. Detail drawer with save, compare, shortlist, view/inquire, and no final external actions.

## 21. Feature Deepener Pass

Date: 2026-05-20

Skill: `feature-deepener`

Scope:

This pass deepens the active feature only: ChefFlow `/eat` as the user's persistent, saved, localized "food near me" home. It does not queue work and does not authorize app-code implementation.

### Feature Read

What exists now:

- Route: `app/(public)/eat/page.tsx`
- Main shell: `app/(public)/eat/_components/consumer-intent-shell.tsx`
- Filters: `app/(public)/eat/_components/consumer-intent-filters.tsx`
- Result cards: `app/(public)/eat/_components/consumer-result-card.tsx`
- Shortlist action: `app/(public)/eat/_components/shortlist-button.tsx`
- Feed action/model: `lib/public-consumer/discovery-actions.ts`
- Discovery model: `lib/discovery/consumer-discovery-model.ts`
- Saved nearby-search utilities: `lib/discover/nearby-saved-search.ts`
- Public location primitives: `lib/location/use-user-location.ts`, `lib/location/user-location.ts`, `lib/location/public-location-cookie.ts`

Current capability:

- `/eat` already supports intent chips, craving search, budget, dietary, event style, location, party size, visual mode, active filter tokens, reset, discovery brief, local context, sectioned results, compare, collections, recovery actions, and shortlist creation.
- The feed already mixes chefs, local listings, menus, packages, and meal prep items.
- The codebase already has primitives for user location persistence and saved nearby-search normalization.

Current gap:

- The page is still user-initiated discovery. It does not yet behave like an always-ready food-near-me home because location confidence, saved local context, recent intent, and near-me default rails are not first-class on initial load.

### Verdict

Useful but partial.

The current `/eat` surface has enough foundation to deepen. The most important missing product behavior is not another generic search field. It is a persistent local food context that appears immediately, explains its location basis, and lets the user update or save that context without starting over.

### Best Improvements

1. First-load local context band

   Why it matters:

   Google makes the first result page useful because it already has a location basis. `/eat` needs the same first-load confidence, but with clearer consent and saved context.

   Where it belongs:

   Top of `ConsumerIntentShell`, before or beside existing filters.

   Implementation shape:
   - Read saved public/account location if available.
   - Derive `FoodLocationContext` with source, confidence, label, freshness, and permission state.
   - Render a compact chip/control group: "Near [label]", "Update", "Use current location", "Clear".
   - If no location is known, show a useful non-blocking prompt plus national/default discovery.

2. Saved local food home rails

   Why it matters:

   The Google replacement promise depends on return visits. A user should come back to `/eat` and see their local food world without typing.

   Where it belongs:

   First viewport after the location band, before generic "Best matches".

   Implementation shape:
   - "Near you now": derived from current/saved location and current time.
   - "Saved around here": saved chefs, places, searches, and shortlist candidates tied to location.
   - "Recent food intents": recent cravings, cuisine chips, and dinner-planning contexts.
   - "Chef-led alternatives nearby": private chefs, meal prep, menus, and packages matching the same local context.

3. Google-class refinement chips without unsupported claims

   Why it matters:

   Google gives the user fast filters: Open now, Top rated, Cheap, Upscale, Reservations, Cuisine, Price, Vibe. ChefFlow should copy the speed, not the exact claims, unless data supports them.

   Where it belongs:

   `ConsumerIntentFilters` and active-token row.

   Implementation shape:
   - Promote common chips above selects.
   - Add a disabled or "needs data" state for unsupported chips such as Open now until hours exist.
   - Store chip state in URL params.
   - Make filters removable and resumable.

4. Result card proof upgrade

   Why it matters:

   Food discovery is trust-heavy. Google cards show rating, reviews, distance, hours, price, and source-like clues. ChefFlow cards need explicit proof without inventing missing values.

   Where it belongs:

   `ConsumerResultCard` plus the proof-signal wrapper currently in `ConsumerIntentShell`.

   Implementation shape:
   - Show "why shown" reasons from `buildChefMatchReasons`.
   - Show source type: chef profile, nearby listing, menu, package, meal prep.
   - Show confidence/freshness where available.
   - Show missing-state labels instead of blank omissions for key fields like location or price.

5. Detail drawer before destination handoff

   Why it matters:

   Google lets users inspect a place without leaving the result context. ChefFlow currently sends users into destination pages early.

   Where it belongs:

   New `/eat` client component owned by the `/eat` surface, using existing card data first.

   Implementation shape:
   - Non-final drawer: photos, description, location, price, tags, source, match reasons, available actions.
   - Actions: save, compare, shortlist, view page, inquire/book when applicable.
   - No call/order/reserve/final external action in the initial version.

6. Saved-search bridge

   Why it matters:

   Existing `nearby-saved-search` logic is close to the desired product behavior, but `/eat` needs it integrated into the page experience.

   Where it belongs:

   Shared discovery/save module plus `/eat` shell.

   Implementation shape:
   - Normalize current `/eat` filters into a saved-search snapshot.
   - Show "Save this food search" when filters/location are meaningful.
   - Show saved searches on return and let users restore them.
   - Track baseline match count and last-seen result count for "new near you" language only when supported.

### Action Surface

Must-have actions:

- Set location
- Update location
- Use current location
- Clear location
- Save this search
- Resume saved search
- Save result
- Add to shortlist
- Compare
- Clear compare
- Inspect detail
- View chef/place
- Send open request
- Reset filters
- Remove one filter token
- Broaden search

Weak or partial actions today:

- Location can be typed as a filter, but there is no first-class confidence or permission surface.
- Shortlist exists, but saved food context is not yet a visible home object.
- Compare exists, but it is session-local and not part of a persistent food world.
- Result cards can be opened, but there is no in-place detail state.
- Recovery actions exist for empty results, but stale, permission-blocked, and unsupported-filter states need explicit UI.

Actions to avoid in the first build:

- Call restaurant
- Place order
- Reserve table
- Send final booking without review
- Claim live open-now, distance, or rating unless data is available and fresh

### Product Polish

Hierarchy:

- The first viewport should lead with local context and saved food world, not a marketing-style explanation.
- Existing "What should we eat?" copy can remain, but the main proof should be visible local results and saved context.
- Intent chips should remain compact and operational.

States:

- No saved location: show useful discovery plus a location prompt.
- Approximate location: show confidence and update controls.
- Precise location allowed: show near-me rails and clear privacy controls.
- Location denied: continue with typed city/ZIP and saved searches.
- Unsupported filter: keep the chip visible but explain what data is missing.
- Empty results: show broaden-location, remove-filter, save-intent, and open-request paths.
- Stale saved context: show "last updated" and refresh/update controls.

Mobile:

- Chips should collapse into horizontally scrollable groups or a compact filter drawer.
- Location chip must remain visible above results.
- Detail drawer should become a bottom sheet.
- Compare should not consume first viewport until at least two items are selected.

Accessibility:

- Chips must use `aria-pressed` where toggleable.
- Icon-only controls need labels.
- Location permission status must be text-visible, not color-only.

### Data And Logic

Canonical state:

- Location state should be represented as a typed object, not only a string filter.
- Saved searches should store normalized filters, location context, baseline match count, and freshness timestamps.
- Result cards should carry enough metadata for proof labels and detail drawer rendering.

Persistence:

- Anonymous users: local storage plus existing public cookie pattern.
- Authenticated users: account-level saved food context where available.
- Shared shortlist: continue using existing planning group token/profile token flow.

Deterministic logic:

- Ranking should remain deterministic: location fit, intent fit, availability, media completeness, saved/preferred cuisine, recent intent, and source confidence.
- Remy/AI should only explain or draft requests, not own location, ranking, saved search state, or canonical results.

Privacy:

- Do not silently collect precise location.
- Always expose source: typed, saved, IP-derived approximate, browser precise, account default.
- Store coarse location by default; store precise coordinates only with explicit consent and a clear use.
- Provide clear/update/delete controls.

### Implementation Batch

Smallest high-leverage batch:

1. Add a `/eat` location-context model that wraps existing `SavedLocation`, public location cookie, and URL `location` param into one `FoodLocationContext`.
2. Add a first-viewport location confidence chip/control group.
3. Add "Save this search" and "Recent food searches" using the existing nearby saved-search normalization shape.
4. Add first-load rails for "Near you now", "Saved around here", and "Chef-led alternatives nearby" using current feed data before introducing external providers.
5. Add proof labels and "why shown" reasons to result cards.

Likely file ownership:

- `/eat` UI owner: `app/(public)/eat/_components/consumer-intent-shell.tsx`
- Filter owner: `app/(public)/eat/_components/consumer-intent-filters.tsx`
- Result card owner: `app/(public)/eat/_components/consumer-result-card.tsx`
- Discovery data owner: `lib/public-consumer/discovery-actions.ts`
- Product logic owner: `lib/discovery/consumer-discovery-model.ts`
- Location owner: `lib/location/*`
- Saved-search owner: `lib/discover/nearby-saved-search.ts`
- Tests: existing nearby saved-search, discovery model, consumer discovery feed, and targeted `/eat` UI smoke tests

This batch should not touch unrelated dashboard, chef, client, rail, navigation, pricing, or admin files.

### Acceptance Criteria

- Opening `/eat` with a saved location shows a first-viewport "Near [label]" context without requiring a search.
- Opening `/eat` without a saved location still shows useful discovery and a non-blocking location prompt.
- User can update, clear, and manually type location.
- User can save the current food search and see it again after reload.
- User can resume a saved food search from `/eat`.
- Result cards show source, location/price/status when available, and a "why shown" explanation.
- Unsupported signals are not claimed. If hours are unavailable, "Open now" is not presented as a real filter.
- Compare and shortlist still work after the new first-viewport rails are added.
- Mobile viewport keeps location, chips, and first results usable without overlap.
- No private account identifiers or precise coordinates are exposed in screenshots, logs, or public markup.

### Cut List

Skip for the first build:

- Full Google Maps clone
- External restaurant ordering
- Final reservation/call actions
- Live traffic/busy-times
- Review scraping
- AI-generated canonical restaurant/place records
- Whole-dashboard integration
- Broad ChefFlow navigation redesign

Reason:

These do not prove the core promise. The first proof is that `/eat` opens into the user's saved/local food world and lets them act without going to Google first.

## 22. Completion Gate

Date: 2026-05-20

Skill: `completion-gate`

### Scope Contract

Scoped promise:

- Evidence-first study of Google's `food near me` journey.
- Extraction of product/spec recommendations for ChefFlow `/eat`.
- Grounding against existing ChefFlow `/eat`, discovery, location, saved-search, shortlist, and result-card code surfaces.
- A buildable product/spec package for making `/eat` the user's persistent, saved, localized food-near-me home.

Explicitly out of scope:

- Editing ChefFlow app code.
- Queueing build items.
- Proving the current `/eat` route in a running browser.
- Shipping the `/eat` feature itself.
- Clicking or executing final Google actions such as call, order, reserve, review, message, purchase, or final submit.

### Verdict

Cannot prove complete.

The research/spec pack is useful, coherent, and strong enough for initial product intake. It cannot honestly be called complete for the full `/eat` product direction because several promised proof surfaces remain unverified: real mobile behavior, live ChefFlow `/eat` runtime behavior, local data-source authority, and persistence/auth decisions.

### Mandatory Gaps

1. Real mobile Google evidence is not complete.

   Why mandatory:

   The scope explicitly required mobile view if tooling supports it and it materially changes the experience. The captured mobile pass was inconclusive because the controlled browser did not reliably emulate a true mobile Google SERP.

   Completion requirement:

   A follow-up real mobile or reliable mobile-emulation pass must capture the mobile first viewport, autocomplete, local pack, filter/chip behavior, place detail behavior, and map handoff.

2. Current ChefFlow `/eat` runtime was not proven.

   Why mandatory:

   The spec claims grounding in current `/eat`, but only code inspection was performed. A completion gate for the buildable spec needs a visible baseline of the actual route.

   Completion requirement:

   Run or reuse the canonical app at `http://localhost:3100`, open `/eat`, capture screenshot(s), and record console/network/server-log status without modifying app code.

3. Local data-source authority is unresolved.

   Why mandatory:

   The spec includes local places, open-now-like filters, distance/radius, map/list, ratings, and saved local context. Those cannot be truthfully built until the authoritative source for places, hours, coordinates, price, rating, and availability is named.

   Completion requirement:

   Decide which data comes from existing ChefFlow directory/listings, external providers, chef profiles, saved user context, or unsupported placeholders. Unsupported claims must be removed or marked disabled.

4. Persistence contract is incomplete across anonymous and authenticated users.

   Why mandatory:

   The core promise is persistent saved local food context. The current spec names local storage, cookies, and account state, but does not close the exact state transition between anonymous browsing, login, shared shortlist, account defaults, and saved searches.

   Completion requirement:

   Define source precedence, merge rules, retention, deletion, and migration for anonymous-to-authenticated saved food context.

5. Final first-build boundary needs one hard MVP line.

   Why mandatory:

   The spec lists a strongest batch and multiple candidates. A build agent still needs one unambiguous first slice to avoid mixing location, saved search, map, drawer, and external-provider concerns.

   Completion requirement:

   Mark exactly which candidate(s) are in MVP 1 and which are deferred. The completion gate recommends MVP 1 = location confidence chip, first-load rails from existing feed data, save/resume current search, and proof labels. Map/list, external providers, and full detail drawer should be deferred unless explicitly selected.

### Wiring Gaps

- `/eat` route to location context: current code accepts a `location` search param, but the scoped product needs a first-class `FoodLocationContext` with source, confidence, freshness, and controls.
- Location primitives to `/eat`: `lib/location/use-user-location.ts`, `lib/location/user-location.ts`, and `lib/location/public-location-cookie.ts` exist, but the spec has not proven they are wired into `/eat`.
- Saved nearby-search to `/eat`: `lib/discover/nearby-saved-search.ts` exists, but current `/eat` saved/resume UI is not proven.
- Shortlist to saved food world: shortlist exists, but the saved food world contract is broader than planning-group candidates and needs explicit relationship rules.
- Compare to persistence: compare appears session-local; persistent food-world compare/resume behavior is not proven.
- Result-card proof to ranking: result cards show some proof signals, but "why shown", source confidence, freshness, and unsupported-signal handling are not proven in UI.
- Filter chips to data authority: Google-like chips are specified, but open-now/rating/distance/reservation chips need data-source gating before being wired.

### Cohesion Gaps

- "Food discovery", "nearby places", "saved search", "shortlist", "saved chefs", and "food world" are adjacent concepts but not yet reconciled into one user-facing model.
- The current `/eat` concept mixes planning an event with immediate food-near-me discovery. That can work, but the first viewport must decide whether the user is in "eat now", "plan soon", or "save for later" mode.
- Chef-led alternatives are a differentiator, but they must appear as alternatives to the same local intent, not as a separate marketing rail.
- Privacy language must match behavior. If location is inferred from IP, typed ZIP, browser permission, cookie, or account default, the UI must not blur those sources together.

### Proof Gaps

- No live screenshot of current ChefFlow `/eat`.
- No browser-console, network, or server-log check for `/eat`.
- No runtime proof that saved location appears on `/eat`.
- No runtime proof that saved search survives reload.
- No runtime proof that compare and shortlist still work after proposed additions.
- No mobile proof for ChefFlow `/eat`.
- No focused tests for `FoodLocationContext`, saved-search restore, or first-load rail assembly because implementation has not started.
- No wiring-audit or finish-check output because no queue item was fired.

### Rejected Expansion

These are useful but not mandatory to close the current spec gate:

- Full Google Maps clone.
- DoorDash/Uber Eats/Yelp/OpenTable competitor audit before MVP 1.
- Final ordering, calling, reservation, purchase, or messaging actions.
- Review scraping or live rating aggregation.
- Busy-times, wait-times, or live open-now claims without a provider.
- Whole-dashboard, rail, Remy, CIL, lifecycle, ledger, communications, Dinner Circles, PIE, or client-intelligence integration.
- AI-owned canonical place, menu, or recipe state.

### Smallest Completion Batch

Minimum work to close this research/spec scope before queueing or building:

1. Capture real/current ChefFlow `/eat` baseline.
   - Use canonical `http://localhost:3100`.
   - Screenshot desktop and mobile widths.
   - Record console/network/server-log status.
   - Do not edit app code.

2. Complete mobile Google evidence.
   - Use a reliable mobile browser context.
   - Capture mobile autocomplete, SERP/local pack, filters, place detail, and map handoff.

3. Close the MVP 1 boundary.
   - Select exactly one first build slice.
   - Recommended slice: location confidence + first-load rails + save/resume search + proof labels from existing data only.

4. Close data-source authority.
   - Mark every proposed signal as supported now, supported later, or unsupported.
   - Disable or omit unsupported claims in MVP 1.

5. Close persistence contract.
   - Define anonymous storage, account storage, merge rules, deletion, and source precedence.

### Acceptance Proof

The spec/research package can be called complete for queue/build intake when:

- The evidence folder contains current ChefFlow `/eat` screenshots and notes.
- The evidence folder contains reliable mobile Google screenshots and notes.
- The master spec identifies one MVP 1 build slice.
- Each MVP 1 signal has a declared source of truth or is explicitly omitted.
- Anonymous and authenticated persistence behavior is specified.
- Privacy controls are specified for every location source.
- The report separates observed evidence from inference.
- No private Google/account identifiers or precise coordinates are exposed in final prose.

## 23. Proceed Pass: Completion Evidence And Hardened MVP

Date: 2026-05-20

Browser context:

- ChefFlow `/eat`: Playwright Chromium desktop and iPhone 13 emulation against canonical `http://localhost:3100`.
- Google mobile: Playwright Chromium Pixel 5 emulation.
- Server note: the existing canonical server on port `3100` was stale and timed out for `/`, `/eat`, `/api/health`, and `dev:status`. It was restarted via the repo runtime script. Final runtime status: canonical server healthy, no duplicate runtimes.

New evidence files:

- `completion-observations.json`
- `screenshots/29-chefflow-eat-desktop-baseline.png`
- `screenshots/30-chefflow-eat-mobile-baseline.png`
- `screenshots/31-mobile-google-start.png`
- `screenshots/32-mobile-google-input-focus.png`
- `screenshots/33-mobile-google-autocomplete-f.png`
- `screenshots/34-mobile-google-autocomplete-food-near-me.png`
- `screenshots/35-mobile-google-results-above-fold.png`
- `screenshots/36-mobile-google-safe-expansion.png`
- `screenshots/37-mobile-google-one-scroll-depth.png`

### What The ChefFlow Baseline Proves

Observed on `/eat` desktop and mobile:

- The route renders at `http://localhost:3100/eat`.
- Page title: `Find Food, Chefs, and Dinner Ideas | ChefFlow`.
- First viewport is still a food discovery/search/planning surface, not yet a persistent local food home.
- Visible controls include intent chips, budget select, dietary select, event style select, visual mode, reset, location-related local context text, "Describe a request", result cards, `View chef`/`View place`, `Start shortlist`, and `Compare`.
- Local context currently says: "Add a location to prioritize nearby chefs and operators."
- Results can appear without a location, but they are broad/national rather than a localized near-me world.
- Example visible result spread included Haverhill, New York, Tampa, Lava Hot Springs, Las Vegas, Cambridge, Northborough, and other locations, proving the default state is not yet local-first.
- Mobile renders the same functional surface and actions, but the first viewport still leads with generic discovery rather than a local confidence chip or saved-context rail.

Runtime observations:

- Desktop capture reported a React hydration warning about extra server attributes around an input in `consumer-intent-filters.tsx`.
- Mobile capture reported two 404 image responses for directory photo URLs.
- No page crash was observed in the captured `/eat` baseline.

What this does not prove:

- It does not prove saved location state.
- It does not prove saved search resume behavior.
- It does not prove authenticated/account persistence.
- It does not prove compare or shortlist after future changes.
- It does not prove exact mobile layout quality beyond the screenshot.

### What The Mobile Google Follow-Up Proves

Observed in Pixel 5 emulation:

- Google mobile home loaded in a mobile layout.
- On input focus, Google showed trending/search suggestions.
- Typing `f` produced `food near me` as a visible autocomplete suggestion.
- Typing `food near me` produced localized/refinement suggestions including:
  - `food near me`
  - `food haverhill ma`
  - `food salem nh`
  - `food near me open now`
  - `food near me open`
  - `food near me within 0.5 mi`
  - `food near me now`
  - `food near me delivery`

Inference from visible evidence:

- Mobile Google autocomplete localizes before submit.
- It blends current-place suggestions, adjacent-location suggestions, urgency, distance radius, and delivery intent directly into autocomplete.

What remains blocked:

- Submitting the mobile search triggered Google's unusual-traffic page again.
- Therefore this pass does not prove mobile SERP/local-pack layout, mobile filters, mobile place detail, or mobile map handoff.

### Hardened MVP 1 Boundary

MVP 1 should be exactly:

1. Location confidence and controls.
2. First-load local rails from existing ChefFlow data only.
3. Save and resume current food search.
4. Result proof labels and why-shown explanations.
5. Unsupported-signal guardrails.

MVP 1 should not include:

- Full map/list mode.
- Full detail drawer.
- External restaurant provider integration.
- Live open-now claims.
- Live distance claims.
- Reservation, call, order, or delivery handoffs.
- Ratings for listings unless ChefFlow has a trusted source.

Why:

This is the smallest slice that proves the core promise: `/eat` opens into a saved/local food context instead of requiring a Google search.

### Data-Source Authority Matrix

Supported now from observed code or runtime:

| Signal                             | Source                                                    | MVP 1 status               |
| ---------------------------------- | --------------------------------------------------------- | -------------------------- |
| Typed location text                | `/eat?location=` filter and current filter UI             | Supported                  |
| Chef service area                  | discoverable chef/directory listing data                  | Supported                  |
| Listing city/state                 | directory listing summary                                 | Supported                  |
| Cuisine/business type              | directory listing and chef discovery fields               | Supported                  |
| Chef accepting inquiries           | chef discovery fields                                     | Supported                  |
| Chef/menu/package/meal-prep prices | existing public consumer discovery feed rows              | Supported where present    |
| Shortlist candidate creation       | existing `ShortlistButton` and planning candidate actions | Supported                  |
| Compare selected items             | current `ConsumerIntentShell` client state                | Supported as session-local |

Partially supported:

| Signal                | Current state                                                     | MVP 1 rule                                         |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| Saved public location | location local storage/cookie primitives exist                    | Wire only after source precedence is defined       |
| Saved nearby search   | normalization utilities and tests exist                           | Add `/eat` UI only for normalized filter snapshots |
| Result images         | image URLs exist, but mobile baseline saw 404s                    | Show fallback and do not treat image as proof      |
| Ratings/reviews       | chef cards may have ratings; listings do not show trusted ratings | Show only when present per source                  |
| Local-first ranking   | feed can filter by typed location, but default is broad           | Rank by saved/typed location when context exists   |

Unsupported for MVP 1:

| Signal                            | Reason                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| Open now                          | No verified hours source in scoped `/eat` evidence                                   |
| Live distance                     | No verified coordinates/current-location distance pipeline in scoped `/eat` evidence |
| Delivery/pickup availability      | No verified provider/source                                                          |
| Reservations accepted             | No verified provider/source for listings                                             |
| Busy times/wait times             | No verified source                                                                   |
| Google/Yelp-style listing ratings | No verified source for local listings                                                |

MVP 1 rule:

If a signal is unsupported, omit it or render it as disabled/coming-later in internal specs. Do not expose it as a working filter.

### Persistence Contract

State sources, strongest to weakest:

1. Explicit URL params from current user action.
2. Browser precise location only after permission.
3. Authenticated account default location, if user is signed in.
4. Saved public location cookie/local storage.
5. Saved food search snapshot.
6. Typed city/ZIP from prior anonymous session.
7. No location; show non-local defaults and ask for location.

Do not use silent precise location.

Anonymous user behavior:

- Store coarse location label/city/state/ZIP in public-safe local storage or cookie when the user explicitly sets it.
- Store saved food search snapshots locally with normalized filters, location context, timestamp, and baseline result count.
- Allow clear location and clear saved searches.
- Do not require email/name to save a search; shortlist can keep its current planning-group flow.

Authenticated user behavior:

- Account default location can become the preferred source after sign-in.
- Anonymous saved searches should not silently merge into the account. Ask or present a visible "keep these searches" step.
- If account default and anonymous location conflict, prefer the current explicit URL/action, then ask before replacing account default.
- Saved food entities should be deletable and exportable enough for privacy compliance.

Source labels:

- `typed`
- `browser_precise`
- `account_default`
- `public_saved`
- `saved_search`
- `none`

Required user controls:

- Set location
- Use current location
- Update location
- Clear location
- Save this search
- Remove saved search
- Resume saved search

### Completion Recheck

Closed from prior gate:

- Current ChefFlow `/eat` baseline evidence now exists.
- Google mobile autocomplete evidence now exists.
- MVP 1 boundary is now hardened.
- Data-source authority is now declared for MVP 1.
- Persistence source precedence is now specified.

Still not fully closed:

- Mobile Google submitted SERP/local-pack evidence remains blocked by Google's unusual-traffic page.
- `/eat` saved location/search behavior is specified but not implemented or runtime-proven.
- No code tests were run for new behavior because no app code was changed.

Revised verdict:

Ready for an MVP 1 build-intake discussion. Not ready to call the product complete. Not queued.
