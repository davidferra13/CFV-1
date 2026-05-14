# Spec: Homepage Discovery Rail Completion

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `homepage-scroll-click-contract.md`, `consumer-first-discovery-and-dinner-planning-expansion.md`, existing `/`, `/chefs`, `/eat`, `/nearby`, `/ingredients`, `/chef/[slug]`, `/api/discovery/*`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                   | Agent/Session          | Commit |
| ------------- | ---------------------- | ---------------------- | ------ |
| Created       | 2026-05-12 16:40 -0400 | Codex planning session |        |
| Status: ready | 2026-05-12 16:40 -0400 | Codex planning session |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete._

### Raw Signal

The developer wants massive expansion ideas for the homepage discovery rail, but first wants all current features brought to 100%.

Key phrases from the session:

- "we need to talk about massive expansion ideas for the homepage discovery rail"
- "lets start bringing all current features we have to 100%"
- "tell me what we need to build"
- "MAKE a build queue for 5/12/26 add this full spec to it"
- "a later agent will build this"

The important product direction is not "make the rail prettier." The homepage discovery rail should become a complete consumer discovery system: taste, occasion, saved chefs, learned preferences, location, seasonal context, planning, and conversion into inquiry/booking.

### Developer Intent

- **Core goal:** Turn the homepage discovery rail into a finished consumer decision engine before adding more public discovery expansion.
- **Key constraints:** Build on existing public routes and discovery infrastructure. Do not invent fake destinations. Do not expose private recipes, private menus, costs, internal notes, client data, invoices, quotes, or event internals.
- **Motivation:** The product already has many discovery primitives, but they are fragmented. The rail should compose them into a clear, useful, measurable path from homepage curiosity to chef discovery, `/eat`, planning, inquiry, or booking.
- **Success from the developer's perspective:** A later builder can pick this up and know exactly what to build, in what order, without re-litigating the strategy.

---

## What This Does (Plain English)

This build turns the homepage discovery rail from an enhanced marquee into a complete consumer discovery system. The user can start from taste, occasion, or ChefFlow picks; see relevant suggestions based on location, saved chefs, recent activity, seasonal context, and explicit feedback; move into `/eat`, `/chefs`, `/nearby`, `/ingredients`, or a public chef profile; and eventually continue into a planning shortlist, inquiry, or booking flow.

---

## Why It Matters

ChefFlow has public discovery surfaces, saved chef primitives, location context, seasonal ingredient signals, interaction tracking, and Dinner Circle planning infrastructure. The gap is product completion: those pieces need to feel intentional, reliable, and measurable on the homepage.

This follows the `CONTEXT.md` rule: infrastructure first, expansion second. Finish the rail loop before adding larger discovery/social surfaces.

---

## Current State

Already present or recently added in the codebase:

- Homepage server composition in `app/(public)/page.tsx`
- Discovery wrapper in `app/(public)/_components/homepage-discovery.tsx`
- Rail UI in `app/(public)/_components/cuisine-marquee.tsx`
- Search/location handoff in `app/(public)/_components/homepage-search.tsx`
- Rail item and lane contracts in `lib/discovery/homepage-discovery-rail.ts`
- Preference scoring in `lib/discovery/discovery-rail-scoring.ts`
- Click, impression, recents, pending outcome, anonymous IDs, long dwell, and quick back tracking in `lib/discovery/track-discovery-click.ts`
- Persistent authenticated discovery profile in `app/api/discovery/profile/route.ts` and `lib/discovery/persistent-profile.ts`
- Discovery click persistence in `app/api/discovery/click/route.ts`
- Anonymous-to-auth history merge in `app/api/discovery/identify/route.ts`
- Saved chef helpers in `lib/discovery/saved-chefs.ts`
- Tests in `tests/unit/homepage-discovery-rail.test.ts`, `tests/unit/discovery-rail-scoring.test.ts`, `tests/unit/discovery-persistent-profile.test.ts`, and `tests/e2e/15-homepage-discovery-marquee.spec.ts`

Important existing specs to obey:

- `docs/specs/homepage-scroll-click-contract.md`
- `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

---

## Build Queue

### Build 1: Rail Contract Cleanup

Make every rail item obey one routing contract.

Rules:

- `Taste` items route to cuisine, dish, craving, dietary, or ingredient discovery.
- `Occasion` items route to `/eat` or filtered `/chefs`.
- `ChefFlow Picks` items route to real chefs, saved chefs, stories, seasonal signals, planning starts, or proven public routes.
- Remove, fix, or intentionally disable any item that routes vaguely.
- No fake routes. No placeholder links.

Required output:

- A single helper or testable mapping layer for rail item destinations.
- Tests proving all visible non-duplicate rail links point to allowed public paths.
- Tests proving location is attached only to supported routes.

### Build 2: Personalization Completion

Make current personalization signals visibly matter.

Requirements:

- Saved chefs appear near the front of ChefFlow Picks.
- Recent clicks reappear as a "pick up where you left off" style shortcut set.
- Pinned items become durable shortcuts across reloads.
- Hidden/dismissed items stay hidden.
- More-like-this changes future ordering.
- Anonymous history merges after login.
- Authenticated server profile and local anonymous state reconcile without duplicates.

Required output:

- Unit coverage for saved, recent, pinned, hidden, location, seasonal, and preference inputs.
- E2E coverage for at least one anonymous-to-auth or local-to-server profile hydration path if practical.

### Build 3: Better Feedback UX

The existing pin/hide/more-like controls need to feel complete.

Requirements:

- Clear hover and keyboard focus controls.
- Visible pinned state.
- Toast or inline undo after hide/dismiss.
- Clear accessible labels for "More like this", "Pin shortcut", "Unpin shortcut", and "Hide this".
- Feedback controls must not steal drag gestures.
- Duplicate marquee clones must remain hidden from keyboard focus.
- "Why am I seeing this?" or score debug must remain dev/admin only, never public production copy.

Required output:

- Keyboard and pointer interaction tests.
- No text overlap on mobile and desktop.

### Build 4: Mobile-First Rail

Mobile must have its own product logic, not just a compressed desktop rail.

Build one fast-decision mobile row centered on:

- Dinner tonight
- Private dinner
- Meal prep
- Catering
- Date night
- Birthday dinner
- Saved chefs
- Near me
- Surprise me

Requirements:

- Fits on 390px mobile without text overlap.
- Prioritizes current location and saved/recent signals.
- Keeps row count and visual density under control.
- Uses large enough touch targets.

### Build 5: Discovery Copy Cleanup

Stop exposing implementation language to consumers.

Replace public-facing "Discovery rail" style wording with copy like:

- "Start with taste, occasion, or a chef worth remembering"
- "Browse by craving, plan, or chef"
- "What are you in the mood for?"

Requirements:

- Do not use in-app text to explain mechanics, shortcuts, keyboard behavior, or internal feature names.
- Keep copy short and action-oriented.
- Preserve SEO and accessibility labels where useful.

### Build 6: `/eat` as the Deeper Consumer Destination

The homepage rail should feed `/eat` for consumer intent instead of trying to solve every decision on the homepage.

`/eat` should support:

- cravings
- occasions
- visual browsing
- dietary needs
- group size
- budget
- date window
- planning with friends

Requirements:

- Rail links into `/eat` must preconfigure intent or filters.
- `/eat` should preserve incoming query context.
- `/eat` should clearly bridge into `/chefs`, `/nearby`, public chef pages, planning, inquiry, or booking.
- No new booking write path. Keep existing booking/inquiry semantics.

### Build 7: Planning Shortlist

This is the main expansion feature after current rail behavior is complete.

From discovery, users should be able to:

- save a chef, listing, menu idea, or discovery item
- start a planning group
- share it with friends
- keep a structured brief: date, headcount, budget, dietary, occasion
- later convert that into an inquiry or booking

Requirements:

- Reuse Dinner Circles / Hub. Do not build a separate social system.
- Planning groups must not pretend to be event groups.
- Shortlist cards need stable snapshots so shared planning pages survive source changes.
- No automatic inquiry or event creation until the user explicitly chooses to book or inquire.

Notes:

- This likely overlaps `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`.
- If shortlist persistence is not already built, follow that spec's `hub_group_candidates` and `planning_brief` model.

### Build 8: Chef/Menu Proof in Discovery

Discovery needs more decision proof than names and cuisine chips.

Public-safe preview data can include:

- chef specialty
- city or service area
- public menu/package spotlight
- review snippet
- accepting inquiries status
- price tier when available
- dietary confidence signals

Forbidden:

- private recipes
- private menus
- event menus not intentionally public
- ingredient costs
- internal notes
- client data
- quotes, invoices, or event IDs

Requirements:

- Degrade cleanly when no public menu/package data exists.
- Do not render fake proof placeholders.
- Keep public chef page as canonical detailed proof.

### Build 9: Analytics Readout

The app already tracks discovery interactions. Add a read layer that makes the signal usable.

Inspect:

- rail item impressions
- clicks by lane
- clicks by item type
- quick backs
- long dwell
- search submits
- inquiry starts
- inquiry submits
- booking starts

Requirements:

- Build a small admin/internal readout or query helper.
- Show which lane and item types actually move users deeper.
- Include algorithm version so future rail changes can be compared.
- Do not expose anonymous IDs or raw user tracking details in public UI.

---

## Files to Create

The builder may adjust exact file names to match current code shape, but these are expected candidates.

| File                                                    | Purpose                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lib/discovery/homepage-discovery-destinations.ts`      | Central contract for allowed rail destinations and item-to-route validation if not already centralized |
| `lib/discovery/homepage-discovery-analytics.ts`         | Read helpers for lane CTR, quick-back rate, long-dwell rate, and item performance                      |
| `components/discovery/discovery-feedback-toast.tsx`     | Undo/confirmation UI for hide/pin/more-like actions if no existing toast pattern fits                  |
| `tests/unit/homepage-discovery-destinations.test.ts`    | Contract tests for item routing and public-only destinations                                           |
| `tests/unit/homepage-discovery-personalization.test.ts` | Saved/recent/pinned/hidden/seasonal/location ordering tests                                            |
| `tests/e2e/homepage-discovery-feedback.spec.ts`         | Keyboard/pointer feedback and undo coverage                                                            |

If Build 7 is included in this pass and not already implemented:

| File                                          | Purpose                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `lib/hub/planning-brief.ts`                   | Planning brief normalization and types          |
| `lib/hub/planning-candidate-actions.ts`       | Shortlist candidate read/write actions          |
| `components/hub/planning-candidate-board.tsx` | Planning shortlist UI in the existing hub shell |
| `components/hub/planning-brief-summary.tsx`   | Planning brief display/edit shell               |

---

## Files to Modify

| File                                                     | What to Change                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                                  | Keep homepage rail data composition coherent: featured chefs, saved chefs, seasonal pulse, user signals, saved location |
| `app/(public)/_components/homepage-discovery.tsx`        | Preserve shared location context between homepage search and rail                                                       |
| `app/(public)/_components/homepage-search.tsx`           | Ensure submitted search and selected location update rail context and tracking                                          |
| `app/(public)/_components/cuisine-marquee.tsx`           | Complete rail UX, mobile row, copy, feedback controls, and item grouping                                                |
| `lib/discovery/homepage-discovery-rail.ts`               | Tighten lane/item contracts, href building, dedupe, interleaving, and public route inference                            |
| `lib/discovery/discovery-rail-scoring.ts`                | Finish personalization scoring and suppression behavior                                                                 |
| `lib/discovery/track-discovery-click.ts`                 | Ensure all relevant interactions and outcomes are tracked consistently                                                  |
| `lib/discovery/user-scroll-signals.ts`                   | Ensure authenticated preferences, saved location, and suppressed items hydrate reliably                                 |
| `lib/discovery/saved-chefs.ts`                           | Ensure saved chefs feed the rail in stable user save order                                                              |
| `app/api/discovery/click/route.ts`                       | Keep interaction persistence best-effort, bounded, and privacy-safe                                                     |
| `app/api/discovery/profile/route.ts`                     | Keep authenticated profile hydration and mutations aligned with local rail actions                                      |
| `app/api/discovery/identify/route.ts`                    | Preserve anonymous-to-auth merge behavior                                                                               |
| `app/(public)/eat/page.tsx`                              | Make incoming rail query params useful as consumer intent                                                               |
| `app/(public)/eat/_components/consumer-intent-shell.tsx` | Strengthen deeper discovery destination and planning handoff                                                            |
| `app/(public)/chefs/page.tsx`                            | Ensure rail links and proof data land cleanly in directory filters                                                      |
| `app/(public)/nearby/page.tsx`                           | Ensure rail links with location/search context are supported                                                            |
| `app/(public)/chef/[slug]/page.tsx`                      | Surface public-safe proof from rail/profile paths without exposing private data                                         |

If Build 7 is included in this pass:

| File                                                 | What to Change                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Add planning-mode shortlist/brief branch without changing event-linked circles |
| `lib/hub/group-actions.ts`                           | Add or reuse planning-group creation helper                                    |
| `lib/hub/types.ts`                                   | Add planning brief and planning candidate snapshot types                       |

---

## Database Changes

No new database changes are required for Builds 1-6 and Build 9 if the existing discovery tables are present:

- `discovery_interactions`
- `discovery_profile_items`
- `consumer_saved_chefs`

Build 7 may require the database changes specified in `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md` if they are not already present:

- `hub_groups.planning_brief`
- `hub_group_candidates`

Migration rule:

- Additive only.
- No drops or destructive rewrites.
- Do not add a second booking write path.

---

## Data Model

Core rail concepts:

- **Lane:** `taste`, `occasion`, `chefflow_picks`
- **Row role:** `cuisine`, `craving`, `intent`, `mobile`
- **Item type:** cuisine, food_type, craving, service, occasion, dietary, featured_chef, chef_pick, combo, story, surprise, seasonal, location, mood, price, time, group_size, saved, special_dining, circle, culinary_signal
- **Location context:** text location plus optional lat/lng, only attached to routes that support it
- **Interaction:** impression, click, love, hide/dismiss, pin/unpin, long_dwell, quick_back, search_submit, inquiry_started, inquiry_submitted, booking
- **Profile item:** durable authenticated state for pinned, dismissed, liked, disliked rail items
- **Recent item:** local and/or server interaction-derived shortcut

Privacy boundary:

- Public discovery can use public chef/listing/menu/package proof.
- Public discovery cannot use private client, quote, invoice, event, cost, or internal recipe data.

---

## Server Actions and APIs

| Action/API                     | Auth          | Input                           | Output                                       | Side Effects                                                                         |
| ------------------------------ | ------------- | ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /api/discovery/click`    | Optional      | bounded discovery event payload | `{ ok: true }`                               | Inserts `discovery_interactions`; may mutate authenticated `discovery_profile_items` |
| `GET /api/discovery/profile`   | Auth optional | none                            | authenticated profile state or empty profile | Reads discovery profile and recent interactions                                      |
| `POST /api/discovery/profile`  | Auth required | item + action                   | `{ ok: true, authenticated: true }`          | Upserts explicit profile state                                                       |
| `POST /api/discovery/identify` | Auth required | anonymous id                    | `{ ok: true }`                               | Merges anonymous interactions to auth user                                           |
| `toggleSaveChef(chefId)`       | Auth required | chef id                         | `{ saved: boolean }`                         | Toggles `consumer_saved_chefs`; revalidates `/`                                      |

New read helper expected in Build 9:

| Helper                                 | Auth           | Input                                  | Output            | Side Effects |
| -------------------------------------- | -------------- | -------------------------------------- | ----------------- | ------------ |
| `getHomepageDiscoveryAnalytics(range)` | Admin/internal | date range, optional algorithm version | lane/item metrics | none         |

---

## UI / Component Spec

### Page Layout

On the homepage, the discovery area should have:

- Search form first.
- Short consumer-facing rail heading.
- Rail rows grouped by taste, occasion, and ChefFlow picks.
- Mobile-specific row for fast decision actions.
- Primary CTA remains available and clear.

### States

- **Anonymous:** show editorial rail plus local recents/pins/hides from browser storage.
- **Authenticated:** hydrate server profile and merge with local state.
- **Saved location:** homepage headline, search form, and location-aware rail links reflect saved location.
- **No location:** all rail items remain useful without location.
- **No featured chefs:** omit chef items rather than fake them.
- **No seasonal pulse:** omit seasonal inserts rather than fail the page.
- **Reduced motion:** rail must remain usable with static horizontal scroll.
- **Network/API failure:** tracking/profile hydration is best-effort and must not break browsing.

### Interactions

- Click pill: tracks click, remembers recent, navigates to real public route.
- Hover/focus pill: feedback controls appear without layout shift.
- More-like-this: tracks `love`, updates future scoring.
- Pin: tracks `pin`, adds durable shortcut.
- Unpin: tracks `unpin`, removes shortcut.
- Hide: tracks `dismiss`, removes item, offers undo.
- Drag/scroll: must not trigger navigation accidentally.
- Horizontal wheel: scrolls row and resumes marquee momentum.
- Keyboard focus: pauses row, allows links and controls to be operated.

---

## Edge Cases and Error Handling

| Scenario                                       | Correct Behavior                               |
| ---------------------------------------------- | ---------------------------------------------- |
| Rail item has no valid destination             | Do not render it as a link, or omit it         |
| Featured chef has no live slug                 | Omit featured chef item                        |
| Location has text but no coordinates           | Attach location text only                      |
| `/nearby` needs `lon` but `/chefs` needs `lng` | Use route-specific coordinate names            |
| Duplicate marquee clone                        | `aria-hidden=true`, `tabIndex=-1`, no tracking |
| Tracking request fails                         | Ignore; browsing continues                     |
| Profile API fails                              | Use local/anonymous state                      |
| User hides a pinned item                       | Remove from pinned and hidden-state wins       |
| Saved chef no longer discoverable              | Omit from rail                                 |
| Public menu/package data missing               | Do not show fake proof                         |
| User starts planning but does not book         | No inquiry/event is created                    |

---

## Verification Steps

1. Run unit tests for rail href construction, lane grouping, dedupe, and destination contract.
2. Run unit tests for scoring: positive learned signals promote, hard negatives suppress, location boosts location items.
3. Run unit tests for persistent profile sanitization and mutation mapping.
4. Open `/` desktop and verify taste, occasion, and ChefFlow Picks render.
5. Open `/` mobile at 390x844 and verify mobile row renders without text overlap.
6. Enter or seed a saved location and verify `/chefs`, `/nearby`, and `/eat` rail links attach location correctly.
7. Verify duplicate marquee clones are not keyboard-focusable.
8. Verify drag does not navigate and click does navigate.
9. Verify pin/hide/more-like controls are keyboard accessible.
10. Verify hidden item disappears and undo restores it if undo is implemented.
11. Verify saved chefs appear in ChefFlow Picks for an authenticated user with saved chefs.
12. Verify seasonal signals appear only when seasonal pulse data exists.
13. Verify `/eat` receives rail intent/query context and presents relevant filters/results.
14. Verify no public rail item exposes internal terms like invoice, quote, event id, client note, cost, or private recipe.
15. Run Playwright coverage for homepage discovery marquee.

Suggested commands:

```bash
npm test -- tests/unit/homepage-discovery-rail.test.ts
npm test -- tests/unit/discovery-rail-scoring.test.ts
npm test -- tests/unit/discovery-persistent-profile.test.ts
npx playwright test tests/e2e/15-homepage-discovery-marquee.spec.ts
```

Adjust commands to the repo's current test runner if needed.

---

## Out of Scope

- No public recipe marketplace.
- No replacement of `/chefs`, `/nearby`, `/eat`, `/book`, or public chef profile routes.
- No second booking or inquiry write path.
- No procurement, approvals, PO capture, or corporate policy engine.
- No exposure of non-public menus, internal recipes, costs, notes, quotes, invoices, or event/client data.
- No rewrite of Dinner Circles / Hub core.

---

## Notes for Builder Agent

Build in order. Do not start with the planning shortlist if the current rail contract and personalization are still loose.

Recommended implementation order:

1. Rail destination contract and tests.
2. Personalization state reconciliation and tests.
3. Feedback UX completion.
4. Mobile rail pass.
5. Copy cleanup.
6. `/eat` query/intent handoff strengthening.
7. Planning shortlist only after the above works.
8. Chef/menu proof enrichment.
9. Analytics readout.

Use existing patterns and helpers first. This is a completion pass, not a rewrite.
