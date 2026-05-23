# Google `food near me` To ChefFlow `/eat` Research Pack

## 1. Executive Takeaway

Google turns `food near me` into a localized decision surface before the user has to explain much. In this session, Google inferred an approximate local ZIP/city from IP, showed `food near me` autocomplete by the third typed character, pushed "open now", "top rated", "cheap", "accepts reservations", cuisine, vibe, and price filters, and placed a local/map pack above ordinary web results.

ChefFlow `/eat` should copy the job, not the SERP. The opportunity is an always-ready food home that opens with saved location, recent intent, preferred cuisines, saved chefs/places/meals, local operators, and fast refinement controls already present. The user should not have to start with a blank search box.

## 2. Browser Context Used And Confidence Impact

- Primary context: Playwright-controlled Chromium script for Google start state and autocomplete.
- Secondary context: Playwright MCP browser for the actual SERP/local pack after the scripted Chromium context hit Google's unusual-traffic page.
- Auth/session: logged out Google; no private Google account pages opened.
- Location context: no precise browser geolocation granted. Google inferred approximate location from IP and offered a "Use precise location" prompt.
- Confidence impact: high for autocomplete, local pack structure, filters, visible action surfaces, and IP-location behavior in this session. Lower for saved places, Google account personalization, search history, real mobile behavior, and anything requiring a logged-in profile.
- Mobile: a scripted mobile context was blocked by Google's unusual-traffic page. MCP viewport resizing did not provide a distinct mobile SERP, so mobile-specific conclusions are limited.

## 3. Evidence Pack Path

`.evidence/live-browser/2026-05-20-15-31-58-google-food-near-me-to-chefflow-eat`

Key files:

- `observations.json`
- `notes.md`
- `redactions.md`
- `questions.md`
- `screenshots/`

## 4. User Need Learned

Visible evidence says the `food near me` user wants immediate local answers, not a general recipe or food article search. Google satisfies:

- "Where am I?" through IP-derived city/ZIP and a precise-location prompt.
- "What is nearby?" through Places, a map, place cards, and local web results.
- "What should I pick?" through ratings, review counts, price ranges, cuisine/business type, images, snippets, and local result ordering.
- "What can I do next?" through Maps, More places, Open now, Top rated, reservation/delivery/refinement filters, and organic links to Yelp, Uber Eats, Grubhub, OpenTable, and restaurant sites.

ChefFlow `/eat` should treat the first page load as the moment to answer this same intent, not as the moment to ask the user to start from zero.

## 5. Step-By-Step Google Observations

| Step | Action                                 | Screenshot                                                                                                                                       | Visible Result                                                                                                                             | User Need Satisfied                                              | ChefFlow Learning                                                                           | What Not To Conclude                                                  |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | Opened Google home                     | `screenshots/01-desktop-google-start.png`                                                                                                        | Minimal home page, search box, Sign in, standard footer links.                                                                             | Gives one obvious entry point.                                   | `/eat` should not start with marketing if the user intent is food discovery.                | Does not prove personalization; logged out context.                   |
| 2    | Focused input                          | `screenshots/02-desktop-input-focus.png`                                                                                                         | Trending searches appeared before typing.                                                                                                  | Offers low-effort paths even before intent is typed.             | `/eat` should show saved/recent/default rails before query.                                 | Trending items were generic, not food-specific.                       |
| 3    | Typed `f`                              | `screenshots/03-desktop-autocomplete-f.png`                                                                                                      | `food near me` appeared as a suggestion among broad `f` searches.                                                                          | Recognizes high-frequency local food intent early.               | `/eat` should infer "nearby food" from very short food signals and past behavior.           | Ranking of suggestions may vary by user/time.                         |
| 4    | Typed `fo`                             | `screenshots/04-desktop-autocomplete-fo.png`                                                                                                     | `food near me`, `Food`, and a hyperlocal-distance variant appeared.                                                                        | Narrows from broad text to food/local intent.                    | Add proactive nearby suggestions, not only exact typed matches.                             | The exact distance suggestion should not be generalized.              |
| 5    | Typed `foo`                            | `screenshots/05-desktop-autocomplete-foo.png`                                                                                                    | Local city/state suggestions, `food open near me`, `food delivery near me`, and "within" variants appeared.                                | Adds location, open-now, and fulfillment intent.                 | `/eat` should combine location, availability, delivery/pickup, and cuisine refinements.     | City names reflect this session's inferred location.                  |
| 6    | Typed `food`                           | `screenshots/06-desktop-autocomplete-food.png`                                                                                                   | `food near me` stayed first; open-now, distance, delivery, places remained.                                                                | Confirms "food" means immediate local discovery for many users.  | Use default local rails for generic "food" visits.                                          | Does not prove all users see the same order.                          |
| 7    | Typed `food near`                      | `screenshots/07-desktop-autocomplete-food-near.png`                                                                                              | `food near me`, local city/state, `open now`, radius variants.                                                                             | Converts partial phrase into local intent.                       | `/eat` should understand "near" and saved location before full query.                       | Radius chips were Google-generated suggestions, not user preferences. |
| 8    | Typed `food near me`                   | `screenshots/08-desktop-autocomplete-food-near-me.png`                                                                                           | Suggestion list included local city/state, open-now, radius, and delivery variants.                                                        | Helps user refine urgency and fulfillment before submit.         | Put "Open now", "Delivery", "Dine in", "Pickup", "Within X miles" near the main input.      | Does not show actual results yet.                                     |
| 9    | Submitted in scripted context          | `screenshots/09-desktop-results-above-fold.png`                                                                                                  | Google unusual-traffic page.                                                                                                               | N/A; blocked automation.                                         | Browser context matters for evidence.                                                       | Do not use the blocked page as SERP evidence.                         |
| 10   | Opened actual SERP through MCP browser | `screenshots/16-mcp-desktop-results-above-fold.png`                                                                                              | Places/map pack, filters, approximate local ZIP/city, precise-location modal, web results.                                                 | Immediate local answer with a consent path for better precision. | `/eat` needs saved location plus a clear "use precise location" consent step.               | No logged-in personalization observed.                                |
| 11   | Dismissed precise-location prompt      | `screenshots/17-mcp-desktop-results-no-location-modal.png`                                                                                       | Local pack remained usable with approximate IP location.                                                                                   | Lets user continue without precise location.                     | `/eat` should work with approximate/default location and offer upgrade to precise location. | Approximate location may be wrong for some users.                     |
| 12   | Clicked More places                    | `screenshots/18-mcp-desktop-more-places.png`                                                                                                     | Dedicated Places view with long list, sticky map, images, ratings, review counts, price, category, address, hours/fulfillment signals.     | Turns answer page into a browseable local directory.             | `/eat` should have list plus map/list mode and persistent local browse state.               | Place ranking reasons were not transparent.                           |
| 13   | Opened Cuisine filter                  | `screenshots/19-mcp-cuisine-filter-expanded.png`                                                                                                 | Cuisine menu: Any, American, Barbecue, Chinese, French, Hamburger, Indian, Italian, Japanese, Mexican, Pizza, Seafood, Steak, Sushi, Thai. | Lets user refine without retyping.                               | `/eat` needs a cuisine picker close to local results.                                       | Cuisine set may vary by market.                                       |
| 14   | Attempted mobile                       | `screenshots/13-mobile-results-above-fold.png`, `screenshots/14-mobile-one-scroll-depth.png`, `screenshots/20-mcp-mobile-results-above-fold.png` | Scripted mobile was blocked; MCP resize showed no reliable mobile-specific layout.                                                         | Inconclusive.                                                    | Run a real mobile/profile pass later.                                                       | Do not claim mobile behavior from this run.                           |

## 6. Autocomplete Behavior Breakdown

Visible progression:

- Before typing: generic trending searches.
- `f`: `food near me` appears early.
- `fo`: `food near me`, broad `Food`, a named local venue, and a very-near radius suggestion.
- `foo`: local city/state suggestions, open-now, delivery, places, and radius variants dominate.
- `food`: local food suggestions remain prominent.
- `food near`: Google adds `open now`, multiple radius suggestions, and `food nearby`.
- `food near me`: Google keeps local city/state, open-now, radius, and delivery refinements.

Inference: Google treats food intent as a high-frequency local discovery job almost immediately. ChefFlow should not wait for exact text. It should convert weak signals like "food", "tonight", "near", recent searches, saved ZIP, and current time into prefilled rails.

## 7. Location/ZIP/Personalization Behavior Breakdown

Visible evidence:

- Google displayed an approximate local city/ZIP and explicitly labeled it as from IP address in the footer.
- The SERP header showed a local city/ZIP near the Places pack.
- Google displayed "Use precise location" and a modal asking whether to use the device's precise location.
- The page remained functional after "Not now."

Inferences:

- Google can provide a usable first answer with approximate IP location.
- Precise location is treated as an optional quality upgrade, not a hard gate.
- The session was logged out, so saved places, Google account history, and personal history were not observed.

ChefFlow implication:

- `/eat` should support three location confidence states: saved/default, approximate/inferred, and precise/permissioned.
- It should display location confidence and let the user update it.
- It should not block discovery when precise geolocation is denied.

## 8. SERP/Local/Map Pack/Action-Surface Inventory

Observed controls and affordances:

- Search box with clear, voice search, image search, submit.
- Navigation tabs: AI Mode, All, Maps, Short videos, Shopping, Forums, Images/Places depending state, More, Tools.
- Local refinement chips: Open now, Top rated, Cheap, Upscale, Accepts reservations, Recently opened, Vibe, Cuisine, Price.
- Places pack: place cards with image, title, star rating, review count, price, category, address, review snippet.
- Map pack: map markers, zoom controls, move-to-location control, "Open in Maps."
- Location controls: current approximate location, how-location-is-used/help, update location, use precise location, not-now.
- Result expansion: More places.
- Web results: Yelp, Uber Eats, Reddit, Tripadvisor, 99 Restaurants, Grubhub, OpenTable, restaurant site.
- Result controls: About this result, Read more, Show more images, People also ask, People also search for, pagination.
- Fulfillment signals: delivery, takeout, curbside pickup, no-contact delivery, reservations, open/closed/opening time, price.

Observed Google pressure:

- It nudges users into Maps, local place expansion, precise location, and third-party transaction surfaces.
- It gives immediate relevance but does not preserve a user's food world as a first-party owned context inside the page.

## 9. What Google Is Optimizing For

Visible evidence suggests Google optimizes for:

- Immediate local relevance.
- Reducing typing through autocomplete and chips.
- Ranking confidence through reviews, price, category, snippets, and maps.
- Keeping the user inside Google/Maps long enough to choose.
- Moving high-intent users toward actions supplied by third parties: delivery, booking, restaurant pages, and map navigation.

## 10. What Users Are Being Pushed To Do

Users are pushed to:

- Accept or decline precise location.
- Use Maps or More places.
- Refine by open now, top rated, price, cuisine, vibe, reservation.
- Compare visually with ratings, images, map position, snippets.
- Leave Google through Yelp/Uber Eats/Grubhub/OpenTable/restaurant websites when ready.

## 11. What ChefFlow `/eat` Should Copy

- Immediate local context on first load.
- Query autocomplete that understands local food intent.
- Filter chips for open now, top rated, price, cuisine, vibe, reservations, pickup/delivery/dine-in.
- List plus map mode for local operators.
- Strong trust signals on every card: rating/review count where available, price, cuisine, location, availability, source freshness.
- "More places" style expansion into a persistent local directory.
- Location confidence and a non-blocking precise-location prompt.
- Recovery when location is weak: update location, use current location, continue approximate, browse without location.

## 12. What ChefFlow `/eat` Should Avoid

- Starting with only a generic search bar.
- Hiding location setup behind settings.
- Requiring precise location before showing value.
- Sending users away before ChefFlow captures their intent, saves context, or builds a persistent food profile.
- Copying opaque ranking. ChefFlow should explain "why this is here."
- Over-indexing on restaurant transaction CTAs if the strategic product is saved food context plus chefs, places, meals, circles, and events.

## 13. `/eat` Product Concept: Persistent "Food Near Me" Home

Proposed concept:

`/eat` opens as the user's saved local food world. It should know the best available location context, show nearby food immediately, and preserve intent across visits.

First viewport should include:

- Location chip: saved city/ZIP, approximate, or precise, with "Update" and "Use current location."
- Now rail: open or available food/chef options for the current time.
- Nearby places rail: local restaurants/operators from directory/listing sources.
- ChefFlow picks rail: chefs, menus, meal prep, events, and packages matching taste and location.
- Recent intent rail: last searches, saved filters, "food near me", "open now", "delivery", "date night", etc.
- Saved food world: saved chefs, places, meals, menus, events, and shortlists.
- Refinement chips: Open now, Top rated, Cheap, Upscale, Delivery, Pickup, Dine in, Reservations, Cuisine, Vibe, Price, Radius.

## 14. Suggested `/eat` Surfaces, Rails, Controls, And Personalization Model

Surfaces:

- "Near you now" rail: location-bound, time-aware, open/available options.
- "Saved around here" rail: saved chefs/places/meals connected to the current location.
- "Recent searches" rail: persistent local food searches and their filters.
- "Cuisine shortcuts" rail: personalized cuisines plus local cuisines observed in results.
- "Dinner Circles nearby" rail: shared saved places/meals from circles when consented.
- "Chef-led alternatives" rail: private chefs and meal prep that satisfy the same local craving.
- "Map/List" toggle: local place browsing without leaving `/eat`.
- "Food passport" panel: cuisines, dietary rules, budget comfort, disliked items, preferred fulfillment.

Controls:

- Use current location.
- Update saved location.
- Continue with approximate location.
- Open now.
- Within X miles.
- Delivery, pickup, dine-in, reserve, private chef, meal prep.
- Price.
- Cuisine.
- Vibe.
- Save place/chef/menu.
- Compare.
- Hide/not for me.
- Share shortlist.
- Reset.
- Explain why shown.
- Report wrong location.

Personalization model:

- Public/pre-auth: cookie-backed default location, recent searches, shortlist in local/session storage or server cookie where appropriate.
- Authenticated client: account location defaults, saved chefs/places/meals, taste passport, dietary constraints, budget, event/circle history, recent searches.
- Privacy states: unknown, approximate/IP, user-entered, browser precise, account saved.

## 15. Relevant Existing ChefFlow Files/Routes/Modules Found

- `app/(public)/eat/page.tsx`: parses `/eat` search params, including `location`, `craving`, `budget`, `dietary`, `dateWindow`, `partySize`, and calls `getConsumerDiscoveryFeed`.
- `app/(public)/eat/_components/consumer-intent-filters.tsx`: has intent chips for Tonight, This Weekend, Dinner Party, Meal Prep, Private Chef, Going Out, Team Dinner, Work Lunch, Surprise Me; also budget, dietary, event style, location input, party size, visual toggle, and craving search.
- `app/(public)/eat/_components/consumer-intent-shell.tsx`: has Discovery brief, Local context, Best matches, Compare, Collections, Templates, Try next, empty-state recovery, and result sections for Private Chefs, Nearby Places, Menus & Spotlights.
- `lib/public-consumer/discovery-actions.ts`: defines `ConsumerDiscoveryFilters`, maps chefs/listings/spotlights to cards with location, price, rating/review, availability, cuisine/service modes, and applies location filters from search.
- `lib/discovery/consumer-discovery-model.ts`: builds proof signals, match reasons, local food intelligence, public collections, recovery actions, and compare candidates.
- `lib/discover/nearby-saved-search.ts`: normalizes a saved nearby search with query, business type, cuisine, state/city, price, radius, coordinates, baseline count, and search key.
- `lib/location/public-location-cookie.ts`: has `cf_default_zip` cookie helpers for a public default location.
- `components/discovery/save-chef-button.tsx`: existing save-chef action surface.
- `lib/discovery/action-shareable-link.ts`: supports shareable discovery state including mode, filters, and shortlist IDs.
- `lib/discovery/registries/client-rail-registry.ts`: already contains client rail definitions for cuisine, location, saved items, nearby meals, "What to Eat Now", shortlist compare/share/stale, and recent search style items.

## 16. Build/Spec Candidates

These are not queued. They are build/spec candidates for later review.

### Candidate 1: `/eat` Saved Location Bootstrap

- Goal: make `/eat` open with a usable local context without requiring a search.
- Scope: read public default location cookie and authenticated account location; show confidence chip; support update/use-current-location/continue-approximate.
- Acceptance criteria: first load shows local context when saved; no exact-location claim without consent; location can be changed; no results are blocked when precise location is denied.
- Risks: privacy, wrong IP/location inference, stale saved location.
- Dependencies: `lib/location/public-location-cookie.ts`, account location model, `/eat` server page.
- Verification: load `/eat` with no cookie, with saved cookie, and with changed location; inspect visible chip and result filtering.

### Candidate 2: Persistent "Food Near Me" Rails

- Goal: replace blank-start discovery with immediate local rails.
- Scope: add near-you-now, saved-around-here, recent-searches, cuisine-shortcuts, and chef-led alternatives rails.
- Acceptance criteria: user sees at least one relevant rail without typing when location or history exists; rails degrade to editorial/location prompt when no data exists.
- Risks: fake/local claims without data, overcrowding first viewport.
- Dependencies: public discovery feed, nearby saved search model, rail registry, saved/shortlist state.
- Verification: screenshot `/eat` in empty, saved-location, and authenticated client states.

### Candidate 3: Local Refinement Chip Set

- Goal: bring Google-like refinement speed into `/eat`.
- Scope: chips for open now, top rated, cheap/upscale, accepts reservations, delivery, pickup, dine-in, cuisine, vibe, price, radius.
- Acceptance criteria: each chip has a URL/query state, visible active state, clear/remove path, and no destructive behavior.
- Risks: backend may not support every filter initially; chips may imply unavailable data.
- Dependencies: discovery filter state, listing schema, availability/open-hours data.
- Verification: Playwright route checks for each chip state and active-token removal.

### Candidate 4: Save And Resume Local Food World

- Goal: make `/eat` remember the user's local food world.
- Scope: save searches, save places/chefs/menus, persist shortlists, restore recent intent, and expose compare/share.
- Acceptance criteria: user can save a search, reload `/eat`, see it in recents/saved, compare saved items, and clear it.
- Risks: public user identity/session storage, stale data, privacy disclosures.
- Dependencies: `lib/discover/nearby-saved-search.ts`, shareable discovery links, saved chef/place models.
- Verification: save/reload/clear smoke, privacy copy check, no account leak in public mode.

### Candidate 5: Location Consent And Privacy Contract

- Goal: make location use legible and trustable.
- Scope: UI and data contract for unknown, approximate, user-entered, precise, and account-saved location states.
- Acceptance criteria: every state has label, source, update path, opt-out path, and no hidden precise collection.
- Risks: privacy/legal trust, browser permission behavior.
- Dependencies: account location, cookie helper, geolocation API wrapper.
- Verification: mocked browser geolocation allowed/denied, cookie absent/present, account default present.

## 17. Privacy/Security Considerations

- Do not store precise location without explicit user permission.
- Distinguish approximate/IP, user-entered, browser precise, and account-saved location.
- Let users update, clear, or browse without location.
- Avoid leaking saved food preferences or location into public share links unless intentionally included.
- For authenticated data, maintain tenant/user scoping and server-side auth gates if new server actions or API routes are added.
- Avoid claiming "near you" when the location source is stale, unknown, or approximate.

## 18. What Not To Conclude

- Do not conclude what a logged-in Google account would show. This run was logged out.
- Do not conclude saved Google places or search history behavior. Not observed.
- Do not conclude precise geolocation behavior after permission grant. Permission was not granted.
- Do not conclude exact mobile behavior. Mobile was blocked or inconclusive.
- Do not conclude stable ranking. Local results can vary by location, time, ads auction, A/B test, device, and session.
- Do not conclude ChefFlow currently lacks all pieces. The codebase already contains several relevant primitives; the gap is product assembly and persistence.

## 19. Open Questions For Next Research/Build Pass

1. Should `/eat` support anonymous saved local context before sign-in, and what data is acceptable in a cookie/local session?
2. What should count as a "place" in ChefFlow: restaurants only, chefs, pop-ups, markets, meal prep, events, private dining, or all food operators?
3. Does ChefFlow want a map-first experience, a rail-first experience, or an adaptive layout based on user intent?
4. Which availability signals are real today: open hours, accepting inquiries, next available chef date, delivery/pickup, reservations?
5. What is the minimum viable "I do not need Google" first viewport for `/eat`?

## 20. Continued Study Addendum

Additional safe live observations captured after the initial report:

| Step | Action                                             | Screenshot                                                                                   | Visible Result                                                                                                                                                                           | ChefFlow Learning                                                                                                                    |
| ---- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 15   | Opened Google's "How location is used" explanation | `screenshots/21-location-used-popover.png`                                                   | Google opened an "About this location" dialog explaining the local area was estimated from IP address and that specific-area results can be requested by including a location in search. | `/eat` needs an explicit location-source explainer, not just a location label.                                                       |
| 16   | Applied Open now chip                              | `screenshots/22-open-now-filter-results.png`                                                 | Google changed the query/state to `food near me open now` and rerendered local results for that urgency.                                                                                 | `/eat` chips should produce URL-addressable state, active state, and result changes.                                                 |
| 17   | Opened Price dropdown                              | `screenshots/23-price-filter-expanded.png`                                                   | Google showed price-range refinement controls near the top chip row.                                                                                                                     | Price should be a grouped chip/menu, not buried in advanced filters.                                                                 |
| 18   | Opened Vibe dropdown                               | `screenshots/24-vibe-filter-expanded.png`                                                    | Google exposed mood/occasion style controls as a top-level local refinement.                                                                                                             | ChefFlow can differentiate with richer vibe controls tied to dinner context: date night, family, team, casual, upscale, adventurous. |
| 19   | Clicked a local place card                         | `screenshots/25-place-detail-expanded.png`                                                   | Google expanded a local-place detail state without triggering a final transaction.                                                                                                       | `/eat` should support an in-context detail drawer for chefs, places, menus, events, and packages.                                    |
| 20   | Clicked Maps tab                                   | `screenshots/26-google-maps-handoff.png`                                                     | Google moved the same `food near me` intent into a map-first workspace.                                                                                                                  | `/eat` should support a map/list mode where data exists, but avoid becoming a full maps clone.                                       |
| 21   | Clicked footer Update location                     | `screenshots/27-update-location-dialog.png`, `screenshots/28-update-location-after-wait.png` | Google exposed an update-location state/status from the footer location control.                                                                                                         | `/eat` needs an always-available update-location path, including loading/status feedback.                                            |

Spec output generated from this research:

- `chefflow-eat-food-near-me-master-spec.md`

## Action-Surface Audit Summary

### Quick Wins

- `Use current location`: show near the location chip; public and authenticated users; requests browser location after consent. Tier: primary/contextual. Acceptance: denied permission leaves approximate/saved results intact.
- `Update location`: show beside location chip and in empty state; lets user set city/ZIP manually. Tier: primary. Acceptance: URL/state updates and local results refresh.
- `Continue with approximate location`: show in consent prompt; user can keep browsing. Tier: secondary. Acceptance: no hard block on denied precise location.
- `Save this search`: show on active result sets; persists filters, location, and count. Tier: secondary. Acceptance: appears in recent/saved rail after reload.
- `Open now`: top refinement chip. Tier: primary. Acceptance: active chip and clear path.
- `Cuisine`: grouped chip/menu. Tier: primary/grouped. Acceptance: cuisine choices persist in URL and result rationale.

### High-Impact Product Improvements

- `Near you now` rail: first viewport rail for nearby/open/available options. Tier: primary rail. Complexity: medium-high.
- `Saved around here` rail: combines saved chefs, places, meals, and menus near current location. Tier: primary rail. Complexity: medium.
- `Recent food searches` rail: persistent restart path. Tier: secondary rail. Complexity: medium.
- `Map/List toggle`: local browsing mode. Tier: primary/segmented. Complexity: high if map data is not mature.
- `Compare shortlist`: existing compare can become persistent and shareable. Tier: contextual. Complexity: medium.
- `Why this is here`: explain ranking with location, taste, budget, availability, saved/circle signal. Tier: contextual. Complexity: medium.

### Structural Or Platform-Level Improvements

- Location confidence model: unknown, approximate, user-entered, precise, account-saved.
- Local result freshness model: source, last verified, open-hours confidence, stale warning.
- Saved food graph: saved chef/place/menu/meal/event/search/shortlist with unified `/eat` rendering.
- Discovery source policy: what third-party local listings can be used, displayed, ranked, and refreshed.

### Mobile-Specific Improvements

- Sticky bottom controls: location, filters, map/list, saved.
- Thumb-friendly chip drawer for cuisine/price/vibe/radius.
- "Use current location" as a single clear action, with fallback if denied.
- Compact saved/recent rail above results.

### Security, Trust, And Permission Improvements

- Always label location source.
- Clear location and clear saved search actions.
- Private/public mode label for saved context.
- Share-link preview that shows exactly what location/filters/shortlist will be included.

### Workflow, Recovery, And Status Improvements

- Wrong location recovery.
- No local results recovery.
- Stale saved search recovery.
- Results changed since last saved status.
- Loading skeleton that shows which source is being fetched.

### Business Growth, Retention, And Conversion Improvements

- Convert local food intent into ChefFlow-owned saved context before sending users out.
- Promote chef-led alternatives beside restaurants.
- Turn repeat searches into notifications or weekly local food digest, only with opt-in.
- Capture "not for me" feedback to improve taste profile.

### Ideas Not To Build Yet

- Final order/reservation/call actions before data and partner contracts are clear.
- Hidden precise geolocation collection.
- Full Google Maps clone.
- Opaque AI ranking without evidence labels.
- Public sharing of exact location by default.

### Top Recommended Batch

Smallest high-leverage batch:

1. Saved/default location chip with update/use-current-location/continue-approximate.
2. First-load "Near you now" and "Recent food searches" rails.
3. Refinement chips: Open now, Cuisine, Price, Delivery/Pickup/Dine-in, Radius.
4. Save this search plus saved search rail.
5. "Why shown" proof labels on cards.

## 21. Completion Follow-Up Evidence

Date: 2026-05-20

Additional artifacts:

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

ChefFlow `/eat` baseline:

- Canonical `http://localhost:3100` was stale and was restarted through the repo runtime script.
- `/eat` rendered on desktop and mobile after restart.
- Current `/eat` is a broad food discovery/planning surface, not yet a persistent localized food-near-me home.
- The page shows location as a filter/context prompt: "Add a location to prioritize nearby chefs and operators."
- Without a location, default results are national/broad rather than local-first.
- Existing visible actions include intent chips, budget/dietary/event-style filters, visual mode, reset, describe request, view result, start shortlist, and compare.
- Runtime diagnostics found a desktop hydration warning and two mobile 404 image responses. No page crash was observed.

Mobile Google follow-up:

- Mobile autocomplete was captured successfully.
- Typing `f` surfaced `food near me`.
- Typing `food near me` surfaced local/refinement suggestions including nearby towns, open-now intent, 0.5-mile radius, now, and delivery.
- Submitting still triggered Google's unusual-traffic page, so mobile SERP/local-pack evidence remains incomplete.

MVP boundary after completion gate:

- MVP 1 should be location confidence + first-load local rails from existing data + save/resume search + result proof labels + unsupported-signal guardrails.
- Defer map/list mode, full detail drawer, external provider integrations, live open-now, live distance, reservation/call/order/delivery handoffs, and listing ratings until data authority exists.
