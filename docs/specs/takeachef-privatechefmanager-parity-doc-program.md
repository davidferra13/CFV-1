# Spec: Take a Chef + Private Chef Manager Parity Doc Program

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`, `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`, `docs/specs/platform-intelligence-hub.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session   | Commit |
| --------------------- | ---------------- | --------------- | ------ |
| Created               | 2026-04-02 23:09 | Planner (Codex) |        |
| Status: ready         | 2026-04-02 23:16 | Planner (Codex) |        |
| Claimed (in-progress) |                  |                 |        |
| Spike completed       |                  |                 |        |
| Pre-flight passed     |                  |                 |        |
| Build completed       |                  |                 |        |
| Type check passed     |                  |                 |        |
| Build check passed    |                  |                 |        |
| Playwright verified   |                  |                 |        |
| Status: verified      |                  |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

"We need to do very in-depth research and clone exactly every single tool and function and functionality that these websites have. It is extremely important that we have a program that can surpass all of these. We need to do intense, thorough research to get there and plan out documents. We need to learn exactly what they are, how their programs work, and everything about them."

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** Produce an evidence-backed parity document system for Take a Chef and Private Chef Manager so ChefFlow can match their verified surfaces and then surpass them deliberately.
- **Key constraints:** No guessing, no fake parity claims, no conflation of public evidence with authenticated unknowns, and no redoing research that is already complete in the repo.
- **Motivation:** The developer wants ChefFlow to beat these competitors feature-for-feature and workflow-for-workflow, but only after the repo clearly shows what already exists, what is missing, and what still requires controlled research.
- **Success from the developer's perspective:** A builder can open a small set of docs and know exactly what Take a Chef and Private Chef Manager publicly do, what ChefFlow already has, what must be hardened or built, and which claims still need legitimate authenticated validation before implementation.

---

## What This Does (Plain English)

This spec creates the document program that turns the current Take a Chef and Private Chef Manager research into a usable parity system. Instead of one giant hand-wavy "copy the competitor" brief, the repo will get a route-by-route public-surface matrix, an operator-tool matrix, a ChefFlow gap register tied to existing code, and a phased build-sequence document. The result is that future builders can work from verified evidence, not memory or guesswork.

---

## Why It Matters

ChefFlow already has real public marketplace, profile, inquiry, and matching infrastructure. The risk now is not "we forgot to build a marketplace"; the risk is builders guessing at competitor behavior, duplicating current code, or planning against unverified operator workflows.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                                                             | Purpose                                                                                                                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/research/takeachef-privatechefmanager-public-surface-matrix-2026-04-02.md` | Route-by-route parity matrix for all publicly visible customer and marketing surfaces across Take a Chef, Private Chef Manager, and ChefFlow. |
| `docs/research/takeachef-privatechefmanager-chef-os-matrix-2026-04-02.md`        | Tool-by-tool matrix for chef-side and authenticated surfaces, with explicit verification status for each claim.                               |
| `docs/research/takeachef-privatechefmanager-gap-register-2026-04-02.md`          | Maps every verified competitor capability to existing ChefFlow code, missing pieces, and required follow-on specs.                            |
| `docs/research/takeachef-privatechefmanager-build-sequence-2026-04-02.md`        | Converts parity findings into phased implementation order and separates public-verified work from authenticated-research blockers.            |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                                                               | What to Change                                                                                                                                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md` | Update the canonical read order so future builders land on the new matrices before doing new parity or authenticated research.                                   |
| `docs/specs/platform-intelligence-hub.md`                                          | Replace unsupported parity assumptions with references to the new doc pack and split public-verified findings from authenticated or speculative platform claims. |
| `docs/research/README.md`                                                          | Add the new parity docs to the research index so the repo has a single canonical entry point.                                                                    |
| `docs/session-log.md`                                                              | Record planner arrival and departure for this doc-program pass.                                                                                                  |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is part of this spec.
- Later feature specs may touch existing public marketplace tables, but this planning spec must not add schema until the parity docs are complete.

---

## Data Model

This is a docs-first parity program, so the data model is the existing ChefFlow product surface being audited, not a new schema.

- **Public discovery and exposure:** `chefs`, `chef_preferences`, `chef_marketplace_profiles`, and `chef_directory_listings` together control whether a chef is discoverable, what public slug resolves, what services/cuisines/pricing/availability are shown, and whether the chef accepts inquiries.
- **Marketplace proof and trust:** `client_reviews`, `chef_feedback`, `external_reviews`, `guest_testimonials`, `chef_calendar_entries`, `chef_work_history_entries`, `professional_achievements`, `charity_hours`, `community_organizations`, and `event_photos` power public trust, credentials, and availability.
- **Partner and destination surfaces:** `referral_partners`, `partner_locations`, and `partner_images` support venue, destination, and partner showcase behavior.
- **Booking and inquiry pipeline:** `clients`, `inquiries`, `events`, and `event_state_transitions` underpin both the open `/book` funnel and chef-specific inquiry submission.
- **Location intelligence:** `public_location_references` supports location resolution and caching used by public search and matching.

The parity docs created from this spec must always map competitor functionality back to one of three states:

1. already exists in ChefFlow today
2. partially exists and needs hardening or restructuring
3. does not exist and needs a dedicated implementation spec

If a competitor behavior cannot be traced to public evidence or authenticated proof, it must be labeled `unverified`, not silently placed into state 2 or 3.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

No new runtime server actions are added in this spec. The doc program audits these existing touchpoints and uses them as the canonical ChefFlow baseline:

| Action                                 | Auth   | Input                                     | Output                                          | Side Effects                                                                                                                                     |
| -------------------------------------- | ------ | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getDiscoverableChefs()`               | none   | none                                      | `DirectoryChef[]`                               | Reads discoverable chef, marketplace-profile, listing, and partner data for homepage/directory/matching surfaces.                                |
| `getPublicChefProfile(slug)`           | none   | `slug: string`                            | public chef + partner payload or `null`         | Resolves public profile and inquiry slugs, merges legacy/listing/marketplace discovery data.                                                     |
| `getPublicChefReviewFeed(tenantId)`    | none   | `tenantId: string`                        | unified review feed + stats                     | Aggregates consented internal reviews, logged feedback, external reviews, and guest testimonials.                                                |
| `getPublicAvailabilitySignals(chefId)` | none   | `chefId: string`                          | public target-booking dates                     | Exposes only public availability entries for profile/inquiry trust context.                                                                      |
| `submitPublicInquiry(input)`           | public | `PublicInquiryInput`                      | `{ success, inquiryCreated, eventCreated }`     | Creates or reuses client, creates inquiry, creates draft event, logs event transition, triggers automations, notifications, and circle creation. |
| `POST /api/book`                       | public | open booking JSON payload                 | `{ success, matched_count, location, message }` | Validates, rate limits, matches chefs, creates inquiries and draft events per chef, and sends emails.                                            |
| `matchChefsForBooking(options)`        | none   | `{ location, serviceType?, guestCount? }` | matched chefs + resolved location               | Filters public chef inventory by location, radius, service type, and guest count.                                                                |

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

This spec does not add product UI. The visible deliverable is a linked document system for future builders.

### Page Layout

Each new document must have a rigid structure so builders can scan them quickly:

- **Public Surface Matrix**
  One row per competitor route or visible module.
  Required columns: product, route/page, audience, user goal, visible inputs, visible outputs, trust elements, monetization hook, support/policy surface, official evidence source, ChefFlow equivalent file(s), parity status, notes.
  Minimum scope:
  Take a Chef homepage, experience/how-it-works flow, private-chef search and location pages, chef profile pages, proposal/review help content, support/help-center surfaces, pricing/commission/legal signals, and any public gift or trust flows that affect conversion.
  Private Chef Manager homepage, pricing, features, testimonials, login/signup entry points, help-center chef articles, support/SLA surfaces, and website/custom-domain marketing.
  ChefFlow `/`, `/book`, `/chefs`, `/chef/[slug]`, `/chef/[slug]/inquire`, `/discover`, `/for-operators`, plus public header/footer and trust surfaces.
- **Chef OS Matrix**
  One row per authenticated or chef-side tool/workflow.
  Required columns: product, workflow/tool, verification status (`public`, `authenticated`, `unverified`), observed behavior, monetization gate, required research method, ChefFlow equivalent file(s), gap status, notes.
  Minimum scope:
  onboarding, profile setup, inbox, calendar, proposals/quotes, pricing, websites/widgets, partner channels, analytics, billing/fees, support, and upgrade gates.
- **Gap Register**
  One row per capability.
  Required columns: capability, competitor source, ChefFlow current state, exact local files/actions/tables touched, action (`reuse`, `harden`, `build`, `research-first`, `defer`), follow-on spec needed, risk.
- **Build Sequence**
  Phase-by-phase execution order.
  Each phase must list prerequisites, what is safe to build from public evidence, what is blocked on authenticated research, and what implementation specs must come next.

### States

- **Loading:** None. These are static repo documents.
- **Empty:** Never ship empty sections. If evidence is missing, the row must exist and be labeled `unverified`.
- **Error:** If a claim cannot be sourced to a live official URL, a saved repo artifact, or local code, remove the claim or mark it `unverified`.
- **Populated:** Every row must connect competitor evidence to exact ChefFlow code or explicitly state that no current equivalent exists.

### Interactions

- Every competitor claim must include a source URL and access date.
- Every ChefFlow parity claim must include exact local file references.
- If a feature appears only in authenticated flows, the builder must not convert it into a build task unless the verification status is `authenticated`.
- If a feature is already present in ChefFlow but branded or arranged differently, the gap register must mark it `harden` or `restructure`, not `build from scratch`.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                                                                 | Correct Behavior                                                                              |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Competitor behavior is only inferred from public marketing copy                          | Mark it `unverified` or `public-claimed`, never treat it as a proven workflow.                |
| Existing ChefFlow code partially matches a competitor surface                            | Record the exact existing files and mark the gap as `harden` or `restructure`, not `missing`. |
| Pricing, SLA, or policy language changes over time                                       | Add access date and source URL, and treat the claim as time-sensitive.                        |
| Locale-specific pages disagree                                                           | Record the locale and do not generalize global behavior without support.                      |
| Existing parity assumptions in `platform-intelligence-hub.md` conflict with new evidence | Update the spec reference and note the superseded assumption explicitly.                      |
| A later authenticated research phase would create production burden or require payment   | Stop and flag for explicit human approval per the existing handoff.                           |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Create the four parity documents listed in this spec and add them to `docs/research/README.md`.
2. Confirm the public matrix includes every currently researched public Take a Chef / Private Chef Manager surface that materially affects booking, quoting, trust, pricing, support, SEO, partner distribution, or chef acquisition.
3. Confirm every row in the public matrix has both an official source URL and at least one exact ChefFlow file or table reference.
4. Confirm the chef-OS matrix clearly separates `public`, `authenticated`, and `unverified` claims, with no authenticated claim presented as fact without proof.
5. Confirm the gap register maps each capability to one of `reuse`, `harden`, `build`, `research-first`, or `defer`.
6. Confirm the build-sequence doc does not create one mega-phase called "clone competitor"; it must split work into specific, dependency-ordered slices.
7. Update `docs/specs/platform-intelligence-hub.md` so it references the new parity docs instead of carrying unsupported assumptions inline.
8. Re-read the full doc pack and verify a builder could answer "what exists, what is missing, what is unverified, and what comes next" without opening chat history.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Not building the actual runtime parity features in ChefFlow.
- Not performing credential abuse, paywalled exploration, support manipulation, or deceptive bookings.
- Not rewriting the public marketplace from scratch when equivalent functionality already exists.
- Not producing a single mega-spec that claims to implement every competitor tool in one pass.
- Not treating authenticated Private Chef Manager or Take a Chef interiors as verified unless they are actually tested.

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._

- Start from current ChefFlow reality, not competitor screenshots. The homepage, `/book`, `/chefs`, public chef profile, public chef inquiry page, and public inquiry/event creation pipeline already exist and must be treated as baseline, not wishlist.
- Use `docs/app-complete-audit.md` as the local route and surface index before opening code files. The parity docs should reference the audit where it already names a public surface accurately, then drill into source files for exact behavior.
- The parity program is only useful if it distinguishes verified public behavior from unverified operator behavior. Do not blur that line.
- The existing `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md` already defines the guardrails for authenticated research and explicitly reserves anything involving real money, real bookings, or real support burden for human approval.
- `docs/specs/platform-intelligence-hub.md` remains useful, but it currently mixes verified platform generalization with assumptions about still-unverified competitor interiors. This spec is the cleanup pass that should make later implementation specs safer.
- Use official/public sources first. For this planning pass, the highest-value official sources already confirmed include:
  - `https://www.takeachef.com/en-us/private-chef/near-you`
  - `https://www.takeachef.com/en-us/experience`
  - `https://helpcenter.takeachef.com/can-i-see-reviews-before-booking-a-chef`
  - `https://helpcenter.takeachef.com/how-to-join-take-a-chef-and-private-chef-manager-a-guide-for-chefs`
  - `https://www.privatechefmanager.com/en-us`
- If a later builder wants to write implementation specs from this doc pack, they should create separate specs for:
  - public marketplace parity
  - proposal and quote acceleration
  - chef website / widget / direct-booking parity
  - inbox / calendar / response-SLA parity
  - support / trust / dispute-operating surfaces
