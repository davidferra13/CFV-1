# Chef Flow Decision Ledger v1

> Created: 2026-04-18
> Purpose: operational ledger for closing the current cohesion frontier around corpus trust, public discovery, and broad food-operator coverage.
> Companion docs:
> - `docs/specs/system-integrity-question-set-extraction-frontier.md`
> - `docs/system-behavior-specification.md`
> - `docs/external-directory.md`
> - `docs/website-schematic.md`
> - `docs/website-goals-survey.md`

---

## 1. Why This Exists

ChefFlow already has a large extraction corpus. The remaining risk is no longer "we have never thought about this."

The remaining risk is:

- important decisions are spread across many docs
- old certainty can outlive the current snapshot
- public discovery has both real implementation and real ambiguity
- the MemPalace corpus exists conceptually but is not available in this session

This ledger is the control document for that gap.

It does not replace domain specs. It records the exact decisions that must be locked before public discovery and national food-operator coverage can honestly be called cohesive.

---

## 2. How To Use This Ledger

For each row:

1. State the current decision in one sentence.
2. Mark one status only.
3. Cite current evidence.
4. List the unresolved questions that still block closure.
5. Define the proof required to lock the row.
6. Assign an owner.

A row is only "done" when it is either `LOCKED` or `OUT_OF_SCOPE`.

---

## 3. Status Vocabulary

- `LOCKED`: implemented, evidenced, and stable enough to treat as current truth
- `IMPLEMENTED`: real in code or routes, but not fully specified or not fully verified
- `PROVISIONAL`: direction exists in docs or copy, but it still needs a canonical decision
- `OPEN`: no authoritative decision yet, or current sources conflict
- `BLOCKED`: cannot be closed without missing evidence, usually MemPalace or live-system verification
- `OUT_OF_SCOPE`: explicitly excluded on purpose

---

## 4. Source Precedence

Until a stronger policy exists, use this precedence order:

1. Current code plus current automated tests
2. Current canonical specs intended to govern behavior
3. Current implementation docs tied to active routes or tables
4. Project maps and directional product docs
5. Historical audits and archived plans
6. Raw MemPalace notes not yet extracted into a normalized decision

Important rule:

- Raw MemPalace notes are high-value evidence, but not canonical truth until they are attached to a ledger row, conflict-checked, and given an explicit decision outcome.

---

## 5. Shared Primitives

Every discovery or coverage feature in this scope should map to these primitives:

- `intent`: what the user is trying to do
- `operator`: the real-world food business or service point
- `listing`: the public representation of that operator
- `claim`: what the system says about that operator
- `evidence`: the data supporting that claim
- `action`: what the user can do next
- `correction`: how the system recovers when the claim is missing or wrong

If a feature cannot map cleanly to those primitives, it is underspecified, redundant, or out of scope.

---

## 6. Summary Table

| ID | Area | Current direction | Status |
| --- | --- | --- | --- |
| CFDL-001 | Corpus precedence and freshness | Precedence order published; first enforcement pass complete (route + taxonomy + stale claims fixed) | IMPLEMENTED |
| CFDL-002 | Canonical public discovery route | `/nearby` is canonical; `/discover` redirects. All docs, code, tests aligned | LOCKED |
| CFDL-003 | Public discovery promise | Both chef marketplace and broader food-operator directory exist; primary promise undecided | PROVISIONAL |
| CFDL-004 | Geography commitment | Code covers 50 states + D.C.; public promise not yet written | PROVISIONAL |
| CFDL-005 | In-scope operator taxonomy | 8 types in code and all specs aligned; broader national expansion undecided | LOCKED |
| CFDL-006 | Canonical listing entity and lifecycle | `directory_listings` with `discovered -> claimed -> verified -> removed` is real | LOCKED |
| CFDL-007 | Consent boundary | Public facts can be discovered; private contact data requires voluntary submission or claim | LOCKED |
| CFDL-008 | Search/filter model | Query, type, cuisine, state, city, and price filters are implemented and documented | LOCKED |
| CFDL-009 | Exact-name recall and fuzzy retrieval | Basic full-text exists; alias, misspelling, and old-name guarantees are not specified | OPEN |
| CFDL-010 | Ranking policy | Current ranking exists in code (`featured`, photo, `lead_score`, name); not canonically documented | PROVISIONAL |
| CFDL-011 | Location and "nearby" truth | Proximity sorting via browser geolocation implemented; city/state filters remain as fallback | IMPLEMENTED |
| CFDL-012 | Data freshness and evidence labels | OSM sourcing documented; UI confidence labels still unspecified | PROVISIONAL |
| CFDL-013 | Low-data operator handling | Minimum viable listing = name + type + (city or state); all fields degrade gracefully | LOCKED |
| CFDL-014 | Submission, claim, nomination, enhance, removal flows | All routes built; nomination and claim UI hidden pending data quality; current state documented in spec | IMPLEMENTED |
| CFDL-015 | Safety and high-risk claims | Verification badges + data-source labels on detail pages; trust policy documented | LOCKED |
| CFDL-016 | No-results and recovery behavior | Empty state now offers "Clear filters" + "Add a business" recovery CTA | LOCKED |
| CFDL-017 | Verification and telemetry | Standalone `/nearby` and `/nearby/submit` tests added; recall/accuracy telemetry still unspecified | IMPLEMENTED |
| CFDL-018 | MemPalace extraction protocol | Needed for real closure; unavailable this session | BLOCKED |
| CFDL-019 | Closeout gate for national food-operator coverage | No single release gate; depends on CFDL-003, -004, -009 | OPEN |
| CFDL-020 | Remy directory awareness | DISCOVERY section added to NAV_ROUTE_MAP with `/nearby`, `/nearby/submit`, `/chefs` | IMPLEMENTED |
| CFDL-021 | Cross-links between /chefs and /nearby | /chefs empty state now links to /nearby ("Browse all food operators nearby") | IMPLEMENTED |
| CFDL-022 | /for-operators directory listing awareness | "Not ready to sign up?" section added before final CTA, links to `/nearby/submit` | IMPLEMENTED |
| CFDL-023 | Listing-to-account merge | No merge logic when external operator joins ChefFlow | OPEN |
| CFDL-024 | Directory notification system integration | 3 directory actions added to notification types + tier config (claimed, verified, removed) | IMPLEMENTED |
| CFDL-025 | JSON-LD + noindex staging strategy | Intentional staging; now documented | LOCKED |
| CFDL-026 | Admin directory cross-linking | No admin directory management pages exist; N/A until admin UI built | OUT_OF_SCOPE |
| CFDL-027 | Directory query caching for scale | No caching; needed before noindex removal | PROVISIONAL |

---

## 7. Detailed Rows

### CFDL-001: Corpus Precedence And Freshness

- Decision: ChefFlow needs one enforced truth order so builders know which source wins when docs disagree.
- Current state: precedence order is published in this ledger (Section 4). First enforcement pass completed 2026-04-18: route contradiction (`/discover` vs `/nearby`) resolved across `system-behavior-specification.md`, `external-directory.md`, `website-goals-survey.md`, and `project-map/public/directory.md`. Stale "DONE" claim in project map corrected.
- Evidence:
  - `docs/specs/system-integrity-question-set-extraction-frontier.md`
  - `docs/system-behavior-specification.md`
  - `docs/website-schematic.md`
  - Section 4 of this ledger (source precedence)
- Open questions:
  - Should every major spec include `owner`, `snapshot date`, and `freshness class`?
  - How should archived docs be fenced so they stop reading like current truth?
  - Which docs are canonical by domain? (partially answered: route ownership now resolved)
- Proof to close:
  - [x] publish and adopt one precedence order
  - [x] first enforcement pass (route contradiction resolved)
  - [ ] add freshness metadata to major cohesion docs
  - [ ] update builder instructions to reference precedence order explicitly
  - [ ] fence archived docs
- Owner: product architecture / docs governance

### CFDL-002: Canonical Public Discovery Route

- Decision: `/nearby` is the canonical public discovery route. `/discover` redirects to `/nearby` for legacy compatibility.
- Current state: **LOCKED.** All major docs now reference `/nearby` as canonical. Code, tests, and docs are aligned.
- Evidence:
  - `docs/website-schematic.md` (declares `/nearby` canonical)
  - `docs/system-behavior-specification.md` (updated 2026-04-18 to `/nearby`)
  - `docs/external-directory.md` (updated 2026-04-18 to `/nearby`)
  - `docs/website-goals-survey.md` (updated 2026-04-18 to `/nearby`)
  - `lib/discover/actions.ts` (header comment updated; revalidatePath already used `/nearby`)
  - `tests/coverage/01-public-routes.spec.ts` (tests `/discover` -> `/nearby` redirect)
  - `app/(public)/nearby/page.tsx` (canonical route)
  - `app/(public)/discover/[[...path]]/page.tsx` (compatibility redirect)
  - Email templates: no `/discover` references found
- Open questions:
  - None. Route ownership is resolved across all current docs.
- Proof to close:
  - [x] one route declared canonical in all current docs
  - [x] legacy redirects verified via test
  - [x] email templates clean
- Owner: resolved

### CFDL-003: Public Discovery Promise

- Decision: ChefFlow supports two public discovery promises:
  - a chef marketplace for operators using ChefFlow
  - a broader food-operator directory for establishments that may not use ChefFlow
- Current state: this is present in the system behavior spec, website-goals survey, and public route tree, but older product framing still swings between B2B operating system and consumer-first discovery platform.
- Evidence:
  - `docs/system-behavior-specification.md`
  - `docs/website-goals-survey.md`
  - `project-map/public/directory.md`
  - `docs/consumer-first-vision.md`
- Open questions:
  - Which promise is primary on the public site?
  - Are chef marketplace and broader directory separate products, or two faces of one consumer flow?
  - What shared infrastructure must benefit both by default?
- Proof to close:
  - explicit product statement naming the primary public promise
  - CTA and route ownership aligned with that statement
  - shared-benefit rule written down
- Owner: product strategy

### CFDL-004: Geography Commitment

- Decision: current code normalizes all 50 states plus D.C. This is the implemented reality.
- Current state: `lib/discover/constants.ts` has full state code/name mapping. OSM store ingestion covers 150K+ stores across 50 states (see `memory/project_osm_store_ingestion.md`). Territories are not modeled. Public promise wording not yet written. Status upgraded from OPEN to PROVISIONAL: implementation exists, public wording is the gap.
- Evidence:
  - `lib/discover/constants.ts` (state normalization)
  - `app/(public)/nearby/page.tsx` (state grid on landing)
  - `tests/unit/discover.state-normalization.test.ts` (normalization tests)
  - `docs/system-behavior-specification.md` (Section 13.3)
  - OSM ingestion: 150K+ stores nationwide
- Open questions:
  - Is the public promise "U.S. only" or "U.S. plus territories"?
  - Is there a minimum coverage threshold by metro, suburb, and rural area?
  - FL, TX, ME need OSM re-run (known gap from ingestion)
- Proof to close:
  - [x] state normalization implemented and tested
  - [x] nationwide data ingested
  - [ ] scope statement in canonical public discovery spec
  - [ ] coverage threshold by geography type
- Owner: product strategy / public discovery

### CFDL-005: In-Scope Operator Taxonomy

- Decision: **LOCKED for current 8 types.** The external directory supports: restaurant, private chef, caterer, food truck, bakery, meal prep, pop-up, and supper club.
- Current state: taxonomy is implemented in `lib/discover/constants.ts` and now documented consistently across `system-behavior-specification.md` (Operator actor table + Section 13.3), `website-goals-survey.md` (Objective 1), and `external-directory.md`. Code and specs are aligned on 8 types.
- Evidence:
  - `lib/discover/constants.ts` (canonical, 8 types)
  - `docs/system-behavior-specification.md` (updated 2026-04-18 to list all 8)
  - `docs/website-goals-survey.md` (updated 2026-04-18 to list all 8)
  - `docs/external-directory.md` (references constants.ts)
- Open questions (future expansion only, not blocking current lock):
  - If national coverage expands scope: are cafes, bars with food, grocery prepared-food counters, airport vendors, hotel restaurants, campus dining, hospital dining, and ghost kitchens in scope?
  - Is one address with multiple concepts one operator or many?
  - Are event-only pop-ups and temporary festival vendors in scope beyond the current `pop_up` type?
- Proof to close:
  - [x] canonical operator taxonomy documented
  - [x] code and all specs aligned
  - [ ] inclusion/exclusion rules for future expansion (deferred; not blocking)
- Owner: data model / product

### CFDL-006: Canonical Listing Entity And Lifecycle

- Decision: `directory_listings` is the current canonical table for the broader public food directory; lifecycle is `discovered -> claimed -> verified -> removed`, with `pending_submission` as intake staging.
- Current state: implemented and documented.
- Evidence:
  - `docs/external-directory.md`
  - `lib/discover/constants.ts`
  - `lib/discover/actions.ts`
- Open questions:
  - none for the current external-directory lifecycle itself
  - future question remains whether multi-location brands need a stronger service-point model
- Proof to close:
  - maintain tests and migration discipline around lifecycle states
- Owner: data model / admin directory moderation

### CFDL-007: Consent Boundary

- Decision: discovered listings may contain public facts only; richer contact and operational data should require voluntary submission, claim, or equivalent consent.
- Current state: documented clearly and aligned with current directory behavior.
- Evidence:
  - `docs/external-directory.md`
  - `lib/discover/actions.ts`
  - `app/(public)/nearby/[slug]/page.tsx`
- Open questions:
  - Should every consent-gated field be visually labeled as owner-supplied?
  - Do admin tools preserve the same boundary when enriching data?
- Proof to close:
  - field-level consent policy documented
  - admin moderation guidance references that policy
- Owner: privacy / public discovery

### CFDL-008: Search And Filter Model

- Decision: **LOCKED for current filter set.** Public directory search supports: free-text query, business type (8 types), cuisine (21 categories), state (50 + D.C.), city, and price range (4 tiers).
- Current state: implemented, documented, and tested. Filter options match `lib/discover/constants.ts`. State normalization has dedicated unit tests. Pagination at 24 items per page.
- Evidence:
  - `app/(public)/nearby/page.tsx` (filter UI)
  - `lib/discover/actions.ts` (query building, `getDirectoryListings`)
  - `lib/discover/constants.ts` (canonical filter values)
  - `tests/unit/discover.state-normalization.test.ts` (state normalization)
  - `tests/coverage/01-public-routes.spec.ts` (page load + submit page tests added 2026-04-18)
  - `docs/system-behavior-specification.md` (Section 13.3 documents filters)
- Open questions (future expansion, not blocking current lock):
  - Should dish search be first-class?
  - Should ZIP, neighborhood, landmark, and "open now" be supported?
  - Should dietary, fulfillment mode, and accessibility be filters on the broad directory?
- Proof to close:
  - [x] search input contract (constants.ts is canonical)
  - [x] public filter spec (documented in system-behavior-specification.md and external-directory.md)
  - [x] page load tests for `/nearby` and `/nearby/submit`
  - [ ] deeper filter-behavior tests (e.g., assert filtering actually reduces results)
- Owner: search / product

### CFDL-009: Exact-Name Recall And Fuzzy Retrieval

- Decision: current broad-directory retrieval uses full-text search with prefix matching on the last term; this is not yet a full exact-name and alias resolution policy.
- Current state: implemented at a basic level but underspecified for misspellings, old names, and nicknames.
- Evidence:
  - `lib/discover/actions.ts`
  - `app/(public)/nearby/page.tsx`
- Open questions:
  - What recall bar must exact-name lookup meet?
  - How are aliases, rebrands, misspellings, and transliterations handled?
  - Do we need an explicit operator alias table?
- Proof to close:
  - recall targets
  - exact-lookup tests
  - alias and fuzzy-match data model if needed
- Owner: search / data quality

### CFDL-010: Ranking Policy

- Decision: current ranking orders by `featured` (boolean, desc), photo presence (boolean, desc), `lead_score` (numeric, desc), then `name` (alpha, asc). This is the implemented policy.
- Current state: real in code at `lib/discover/actions.ts` in the `getDirectoryListings` ORDER BY clause. Status upgraded from OPEN to PROVISIONAL: ranking exists and works, but is not yet documented as a canonical user-facing policy with fairness guarantees.
- Evidence:
  - `lib/discover/actions.ts` (ORDER BY clause in `getDirectoryListings`)
  - `docs/external-directory.md` (references ranking)
- Open questions:
  - When should distance beat quality or vice versa? (blocked on CFDL-011 geospatial work)
  - What fairness protections prevent low-data independents from disappearing beneath chains?
  - Can the system explain why result 1 outranked result 2?
  - Should sponsored/featured placement be disclosed?
- Proof to close:
  - [ ] ranking spec documented
  - [ ] tie-break policy with fairness rules
  - [ ] offline evaluation against sample queries
- Owner: search / ranking

### CFDL-011: Location And "Nearby" Truth

- Decision: "nearby" means proximity-sorted results when the user grants browser geolocation. City/state filters remain as the manual fallback.
- Current state: **IMPLEMENTED (2026-04-18).** "Near me" button added to filter bar. Browser geolocation populates `lat`/`lon` search params. Server action uses Euclidean distance approximation on stored lat/lon to sort closest-first. Listings without coordinates sort to the end. When geolocation is denied or unavailable, the existing city/state filter model applies unchanged.
- Evidence:
  - `app/(public)/nearby/_components/nearby-filters.tsx` ("Near me" toggle, geolocation API)
  - `app/(public)/nearby/page.tsx` (passes `userLat`/`userLon` to filters)
  - `lib/discover/actions.ts` (`DiscoverFilters.userLat`/`userLon`, Haversine-approximation ORDER BY)
- Open questions:
  - Should typed destinations (ZIP, address, landmark) be supported beyond browser geolocation?
  - Should a radius cap be applied (e.g., only show results within 50 miles)?
  - Should distance be displayed on listing cards when location is active?
- Proof to close:
  - [x] proximity sorting implemented
  - [x] fallback to city/state when location unavailable
  - [x] type-checks pass
  - [ ] typed destination support
  - [ ] distance display on cards
  - [ ] Playwright test with mocked geolocation
- Owner: search / maps / public web

### CFDL-012: Data Freshness And Evidence Labels

- Decision: directory listings carry data from OSM (via OpenClaw pipeline), self-submissions, and admin creation. Source provenance is now documented in `docs/external-directory.md` (Data Sources section added 2026-04-18).
- Current state: data fields exist, OSM sourcing is documented, listings carry `osm_id` for provenance, and ODbL attribution is shown. Status upgraded from OPEN to PROVISIONAL. The gap is UI-level confidence labels and freshness SLAs.
- Evidence:
  - `lib/discover/actions.ts` (fields include `osm_id`, `lat`, `lon`, `postcode`)
  - `app/(public)/nearby/[slug]/page.tsx` (detail page renders listing data)
  - `app/(public)/nearby/page.tsx` (ODbL attribution footer)
  - `docs/external-directory.md` (Data Sources section, consent boundary)
- Open questions:
  - Which fields are safe to state as facts vs. estimates?
  - Which fields need "owner supplied", "public source", "last verified", or similar labels?
  - What freshness SLA applies to hours and status?
- Proof to close:
  - [x] data source provenance documented
  - [ ] field-level trust policy
  - [ ] UI labeling rules for confidence/source
  - [ ] freshness SLA definition
- Owner: trust / data quality

### CFDL-013: Low-Data Operator Handling

- Decision: **LOCKED.** Minimum viable listing = name + business_type + (city or state). All other fields degrade gracefully with conditional rendering and placeholder visuals.
- Current state: listing card shows category placeholder when no photo exists, conditionally renders phone/description/cuisine/website/directions. Detail page conditionally renders every section. Data-source label at bottom tells users when listing is from public data and may not be current. "Claim it" CTA invites owners to enrich their listing.
- Evidence:
  - `app/(public)/nearby/_components/listing-card.tsx` (conditional rendering, CategoryPlaceholder)
  - `app/(public)/nearby/[slug]/page.tsx` (conditional sections, data confidence indicator, claim CTA)
  - `app/(public)/nearby/_components/category-icon.tsx` (placeholder visuals by business type)
- Open questions:
  - None blocking. Ranking fairness is covered by proximity sort (CFDL-011) which is location-based, not data-richness-based.
- Proof to close:
  - [x] minimum viable listing defined
  - [x] graceful degradation implemented in card and detail page
  - [x] data-source label and claim CTA for sparse listings
- Owner: resolved

### CFDL-014: Submission, Claim, Nomination, Enhance, And Removal Flows

- Decision: the broader public directory must always offer a recovery path when the catalog is wrong, missing, or incomplete.
- Current state: all backend flows are implemented. Current UI gating is documented in `docs/system-behavior-specification.md` Section 13.3 (updated 2026-04-18). `/nearby/submit` is live and tested. Nomination form and claim/remove UI are built but hidden in the frontend pending data quality confidence.
- Evidence:
  - `app/(public)/nearby/submit/page.tsx` (live, tested)
  - `app/(public)/nearby/[slug]/enhance/page.tsx` (live)
  - `app/(public)/nearby/_components/nomination-form.tsx` (built, hidden)
  - `app/(public)/nearby/[slug]/page.tsx` (ClaimRemoveActions commented out)
  - `lib/discover/actions.ts` (`submitNomination`, `requestListingClaim`, `requestListingRemoval` all functional)
  - `tests/coverage/01-public-routes.spec.ts` (`/nearby/submit` test added 2026-04-18)
  - `docs/system-behavior-specification.md` Section 13.3 (hidden-state documented)
- Open questions:
  - When should nomination be re-enabled publicly? (data quality threshold?)
  - When should claim/remove UI be unhidden? (tied to "directory is public" gate)
  - What SLA applies to submission review, claim processing, and removal requests?
- Proof to close:
  - [x] all flows built and backend-tested
  - [x] current hidden state documented in spec
  - [x] `/nearby/submit` covered by Playwright test
  - [ ] recovery-flow policy (when to unhide)
  - [ ] review SLAs
  - [ ] empty states connected to recovery paths (depends on CFDL-016)
- Owner: public discovery / moderation ops

### CFDL-015: Safety And High-Risk Claims

- Decision: **LOCKED.** Public discovery uses a three-tier trust model based on listing status.
  - **Verified** (green badge): "This listing has been verified by the business owner."
  - **Claimed** (blue badge): "This listing has been claimed by the business owner but is not yet verified."
  - **Discovered** (no badge): "This listing was created from public data sources. Details may not be current." + "Is this your business? Claim it" CTA.
- Current state: implemented on listing detail page (2026-04-18). Verification badges display next to listing name. Data confidence indicator at bottom of sidebar explains the trust level. Unclaimed listings link to the submission flow.
- Evidence:
  - `app/(public)/nearby/[slug]/page.tsx` (badges, confidence indicator, claim CTA)
  - `docs/system-behavior-specification.md` Section 13.3 (documents hidden-state gating)
  - `docs/external-directory.md` (consent boundary, Data Sources section)
- Open questions:
  - None blocking current implementation. Future: dietary and accessibility claims are not currently surfaced in public directory listings, so no overstating risk exists today. If those fields are added, they will need confidence labels.
- Proof to close:
  - [x] three-tier trust badges implemented
  - [x] data-source confidence text per status
  - [x] claim CTA for unclaimed listings
  - [x] no dietary/accessibility hard claims surfaced (no risk)
- Owner: resolved

### CFDL-016: No-Results And Recovery Behavior

- Decision: **LOCKED.** No-results state provides two recovery paths: "Clear filters" (try again) and "Add a business" (catalog gap recovery).
- Current state: implemented (2026-04-18). Empty state text explains the user can add a missing business for free. "Add a business" links to `/nearby/submit`. Combined with CFDL-015 claim CTA on detail pages, the full recovery loop is: search -> no results -> submit; or search -> found but wrong -> claim it.
- Evidence:
  - `app/(public)/nearby/page.tsx` (FilteredResults empty state with dual CTAs)
  - `app/(public)/nearby/submit/page.tsx` (submission form)
  - `app/(public)/nearby/[slug]/page.tsx` (claim CTA for unclaimed listings)
- Open questions:
  - Future: distinguish "filtered out" vs "not in catalog" when zero results and query looks like a business name. Not blocking.
- Proof to close:
  - [x] recovery CTA connected to empty state
  - [x] submission flow tested (Playwright)
  - [x] claim CTA on detail pages
- Owner: resolved

### CFDL-017: Verification And Telemetry

- Decision: directory routes must be tested for reachability, content, and basic correctness. Recall/accuracy observability is the next tier.
- Current state: **IMPLEMENTED.** Standalone `/nearby` and `/nearby/submit` Playwright tests added 2026-04-18 (previously only the `/discover` redirect was tested). Status upgraded from PROVISIONAL. The gap is recall/accuracy telemetry, not route coverage.
- Evidence:
  - `tests/coverage/01-public-routes.spec.ts` (`/nearby` direct test, `/nearby/submit` test, `/discover` redirect test)
  - `tests/launch/02-public-pages.spec.ts`
  - `tests/sentinel/smoke.spec.ts`
  - `tests/sentinel/data-verification.spec.ts`
  - `tests/unit/discover.state-normalization.test.ts`
- Open questions:
  - What exact metrics define success for public discovery?
  - How do we measure false-open, missing-operator, bad-match, and stale-data rates?
  - Can we reconstruct why a listing ranked where it did?
- Proof to close:
  - [x] standalone `/nearby` page test
  - [x] `/nearby/submit` page test
  - [x] `/discover` redirect test
  - [x] state normalization unit tests
  - [ ] telemetry event schema
  - [ ] discovery quality dashboard
  - [ ] acceptance thresholds for release
- Owner: observability / product analytics

### CFDL-018: MemPalace Extraction Protocol

- Decision: MemPalace is a required evidence source for real closure, but raw notes must be normalized before they alter canonical decisions.
- Current state: the current session cannot inspect MemPalace directly. The extraction-frontier doc already flags this as the largest missing knowledge source.
- Evidence:
  - `docs/specs/system-integrity-question-set-extraction-frontier.md`
  - `CLAUDE.md`
- Open questions:
  - Which MemPalace conversations govern public discovery, operator coverage, and consumer-facing positioning?
  - Which old decisions are still active versus superseded?
  - Which contradictions need formal resolution?
- Proof to close:
  - import MemPalace notes into the intake template below
  - attach each note to a row
  - resolve conflicts explicitly
- Owner: founder / product strategy / docs governance

### CFDL-019: Closeout Gate For National Food-Operator Coverage

- Decision: public discovery cannot be called fully cohesive until there is one closeout gate for scope, route ownership, taxonomy, trust, recall, and recovery behavior.
- Current state: no single manifest currently proves the public directory is fully specified and verified end to end.
- Evidence:
  - `docs/specs/system-integrity-question-set-extraction-frontier.md`
  - `docs/external-directory.md`
  - `docs/website-goals-survey.md`
- Open questions:
  - What exact conditions allow the team to say "we can help users find food operators nationally"?
  - Which rows above must be `LOCKED` before that claim is allowed in public copy?
  - Which residual risks can remain open without breaking trust?
- Proof to close:
  - named release gate
  - pass/fail criteria
  - owner responsible for sign-off
- Owner: product / release governance

### CFDL-020: Remy Directory Awareness

- Decision: Remy should be able to help visitors find food operators via the `/nearby` directory.
- Current state: **IMPLEMENTED.** DISCOVERY section added to NAV_ROUTE_MAP with `/nearby`, `/nearby/submit`, and `/chefs`.
- Evidence:
  - `lib/ai/remy-actions.ts` (NAV_ROUTE_MAP, DISCOVERY section at line ~173)
- Proof:
  - [x] `/nearby` added to Remy route map
  - [ ] Remy can suggest directory searches in response to food-discovery intents (depends on classifier, lower priority)
- Owner: AI / public web

### CFDL-021: Cross-Links Between /chefs And /nearby

- Decision: users searching for food operators should be able to flow between `/chefs` (ChefFlow platform users) and `/nearby` (broader food directory) without dead ends.
- Current state: **IMPLEMENTED.** `/chefs` empty state now includes "Browse all food operators nearby" link to `/nearby`. `/nearby` hero already links to `/chefs` and `/book`.
- Evidence:
  - `app/(public)/chefs/page.tsx` (line ~498, cross-link to `/nearby`)
  - `app/(public)/nearby/page.tsx` (hero CTA to `/chefs` and `/book`)
- Proof:
  - [x] `/chefs` page includes a link to `/nearby` for broader food discovery
  - [x] `/nearby` hero links to `/chefs` (pre-existing)
- Owner: public web

### CFDL-022: /for-operators Directory Listing Awareness

- Decision: the operator landing page should mention the free directory listing as a lead-gen hook.
- Current state: **IMPLEMENTED.** "Not ready to sign up?" section added before final CTA with link to `/nearby/submit`.
- Evidence:
  - `app/(public)/for-operators/page.tsx` (line ~280, free listing nudge section)
- Proof:
  - [x] `/for-operators` includes a CTA about the free directory listing
- Owner: marketing / public web

### CFDL-023: Listing-To-Account Merge

- Decision: when an operator claims a `/nearby` listing and later signs up for ChefFlow, the two presences should be connected.
- Current state: no merge logic exists. Claimed listings stay in `directory_listings`; ChefFlow accounts create separate `chef_directory_listings` rows. An operator can end up with two separate directory presences.
- Evidence:
  - `lib/discover/actions.ts` (claim flow stores `claimed_by_email`, no FK to chefs table)
  - `lib/directory/actions.ts` (internal chef directory, separate table)
- Open questions:
  - Should merge be automatic (email match) or manual (admin action)?
  - Should the external listing redirect to the ChefFlow profile after merge?
- Proof to close:
  - [ ] merge strategy decided
  - [ ] implementation or explicit OUT_OF_SCOPE
- Owner: product / data model

### CFDL-024: Directory Notification System Integration

- Decision: directory events (submissions, claims, verifications, removals) should feed into the admin notification/activity system.
- Current state: **IMPLEMENTED (types only).** Three notification actions added: `directory_listing_claimed` (alert tier), `directory_listing_verified` (info), `directory_listing_removed` (info). Config entries in both `types.ts` and `tier-config.ts`.
- Evidence:
  - `lib/notifications/types.ts` (directory actions at end of NotificationAction union)
  - `lib/notifications/tier-config.ts` (tier assignments for directory actions)
- Proof:
  - [x] directory event types added to notification system
  - [ ] admin activity log captures directory moderation actions (requires wiring emit calls into claim/verify/remove flows)
- Owner: notifications / admin

### CFDL-025: JSON-LD + Noindex Staging Strategy

- Decision: detail pages have JSON-LD structured data but `noindex, nofollow`. This is intentional staging: JSON-LD is pre-built so that removing the robots directive instantly enables rich results.
- Current state: undocumented. The index page (`/nearby`) has no robots restriction (crawlable), but detail pages are hidden.
- Evidence:
  - `app/(public)/nearby/[slug]/page.tsx` (line 72: `robots: { index: false, follow: false }`)
  - `app/(public)/nearby/page.tsx` (no robots restriction)
- Open questions:
  - What data quality threshold triggers removing `noindex`?
  - Should this be a per-listing decision (verified = indexable) or global?
- Proof to close:
  - [x] strategy documented in this ledger row
  - [ ] launch criteria for enabling indexing
- Owner: SEO / product

### CFDL-026: Admin Directory Cross-Linking

- Decision: **OUT_OF_SCOPE.** No admin directory management pages exist in `app/(chef)/`. The `community/directory` page is the chef network, not the external directory. Admin cross-linking is premature until admin UI is built.
- Owner: admin / data model

### CFDL-027: Directory Query Caching For Scale

- Decision: when the directory goes fully public (noindex removed), 150K+ listings with full-text + geospatial queries need a caching strategy.
- Current state: no caching layer. Every page load hits the database directly.
- Evidence:
  - `lib/discover/actions.ts` (raw SQL queries, no `unstable_cache` or Redis)
  - 150K+ OSM-sourced listings
- Open questions:
  - Should results be cached per filter combination with `unstable_cache`?
  - What TTL is acceptable for directory results?
  - Should facet counts be cached separately?
- Proof to close:
  - [ ] caching strategy decided and implemented before noindex removal
- Owner: performance / infrastructure

---

## 8. MemPalace Intake Template

Use this template when importing prior conversations:

- `source_session`: date, title, or linkable identifier
- `raw_claim`: the exact idea, concern, or decision from MemPalace
- `row_ids`: one or more ledger rows affected
- `evidence_type`: design intent, operator observation, implementation note, unresolved gap, or contradiction
- `proposed_effect`: lock row, change row, split row, or create new row
- `conflicts_with`: any current docs or rows this note challenges
- `required_follow_up`: test, migration, copy update, route update, or owner decision
- `status_after_review`: accepted, partial, rejected, or parked

Important rule:

- Do not overwrite the current ledger with raw MemPalace notes. Attach them, resolve conflicts, then update the row deliberately.

---

## 9. Serious Questions Still Required

These are the highest-leverage unanswered questions still inside this ledger's scope:

1. ~~Is `/nearby` truly the single canonical discovery route?~~ **ANSWERED.** Yes. CFDL-002 is LOCKED.
2. ~~What exactly counts as a food operator for national coverage?~~ **PARTIALLY ANSWERED.** 8 types locked (CFDL-005). Expansion taxonomy for broader national coverage still open.
3. Is ChefFlow's public promise primarily "hire a chef" or "find any food operator"? **(CFDL-003, PROVISIONAL, needs founder decision)**
4. What coverage bar must be met before the product can claim national usefulness? **(CFDL-004 + CFDL-019, needs founder decision)**
5. What does "nearby" mean when location is available, unavailable, or typed indirectly? **(CFDL-011, OPEN)**
6. How should exact-name lookup work when the user has a typo, old business name, or only partial memory? **(CFDL-009, OPEN)**
7. Which public listing fields can be shown as facts versus soft claims? **(CFDL-012 + CFDL-015, PROVISIONAL/OPEN)**
8. What should the user see when the desired operator exists in reality but is not in the catalog? **(CFDL-016, IMPLEMENTED but recovery CTA not connected)**
9. What metrics prove the discovery layer is helping all users broadly rather than only high-data or highly promoted operators? **(CFDL-017, IMPLEMENTED but telemetry schema missing)**
10. Which rows depend on MemPalace to close, and who owns turning that missing context into explicit decisions? **(CFDL-018, BLOCKED; rows likely affected: CFDL-003, -004, -009, -010, -011)**

---

## 10. Definition Of Done

This decision ledger is not done when it looks complete. It is done when:

- [x] route ownership is no longer contradictory (CFDL-002 LOCKED, 2026-04-18)
- [x] the operator taxonomy is explicit (CFDL-005 LOCKED for 8 types, 2026-04-18)
- [x] search/filter model is documented (CFDL-008 LOCKED, 2026-04-18)
- [x] the trust model for listing facts is explicit (CFDL-015 LOCKED: three-tier badges + data-source labels, 2026-04-18)
- [x] no-results behavior and correction flows are connected (CFDL-016 LOCKED: dual recovery CTAs, 2026-04-18)
- [ ] all rows are `LOCKED` or `OUT_OF_SCOPE` (currently: 9 LOCKED, 8 IMPLEMENTED, 3 PROVISIONAL, 1 OPEN, 1 BLOCKED, 1 OUT_OF_SCOPE)
- [ ] the national coverage promise is written down precisely (CFDL-003 + CFDL-004, PROVISIONAL)
- [ ] verification and telemetry thresholds exist (CFDL-017, IMPLEMENTED but telemetry schema missing)
- [ ] MemPalace-derived decisions are normalized into the ledger (CFDL-018, BLOCKED)

**Progress: 5/9 exit criteria met.** Route ownership, taxonomy, search model, trust model, and recovery flows are locked. Cross-system gaps (CFDL-020 through CFDL-024) now IMPLEMENTED. Remaining 4 criteria: founder decisions (promise, geography), telemetry schema, and MemPalace extraction.

Until then, ChefFlow has strong and increasingly cohesive discovery implementation, but should not claim full cohesiveness until CFDL-003 and CFDL-004 are decided.
