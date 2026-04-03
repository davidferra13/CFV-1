# Spec: Allergy and Dietary Trust Alignment

> **Status:** built (typecheck + build verified, Playwright blocked on Docker/DB)
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                           | Agent/Session         | Commit    |
| --------------------- | ------------------------------ | --------------------- | --------- |
| Created               | 2026-04-02 22:27 EDT           | Planner (Codex)       |           |
| Status: ready         | 2026-04-02 22:27 EDT           | Planner (Codex)       |           |
| Claimed (in-progress) | 2026-04-03 14:30 EDT           | Builder (Claude Code) |           |
| Spike completed       | 2026-04-03 14:30 EDT           | Builder (Claude Code) |           |
| Pre-flight passed     | 2026-04-03 14:30 EDT           | Builder (Claude Code) |           |
| Build completed       | 2026-04-03 15:45 EDT           | Builder (Claude Code) |           |
| Type check passed     | 2026-04-03 15:45 EDT           | Builder (Claude Code) |           |
| Build check passed    | 2026-04-03 15:45 EDT           | Builder (Claude Code) |           |
| Build commit          | 2026-04-03 ~18:00 EDT          | Builder (Claude Code) | 41d574be7 |
| Playwright verified   | BLOCKED: Docker/DB not running |                       |           |
| Status: built         | 2026-04-03 15:45 EDT           | Builder (Claude Code) |           |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer has already built serious infrastructure around allergies and dietary handling, and does not want that work bulldozed. The ask is to align the website around that reality so the public product behaves like the internal system already does.

The website should take allergies seriously across the board. A consumer should be able to look up a place to eat, a chef, or a service and know whether vegan, gluten-free, or allergy-safe needs are handled without having to interrogate the platform. The reassurance should be obvious, but not invasive or alarmist.

If a client hires a private chef and needs everything gluten-free, they should feel extremely reassured that the system has that covered without the platform screaming it at them. If a chef or operator is handling a lot of business at once, the system should still make it easy to monitor and address allergies correctly. The site should know what an allergy is, what to do when something goes wrong, and whether there is a real base truth behind any of this.

Going forward, the developer wants research-led progression across the website. Research should always look at how chefs currently solve this problem, how consumers currently solve it, where those workflows break, and what is still missing. That research should feed directly back into the product plan.

### Developer Intent

- **Core goal:** Turn allergies and dietary handling into a first-class trust system across discovery, profile, inquiry, booking, onboarding, planning, and incident response without rebuilding the product from scratch.
- **Key constraints:** Reuse the existing structured safety model, avoid destructive schema work, avoid loud or invasive UI, distinguish reassuring signals from medical guarantees, and preserve the developer's original reasoning in the permanent artifact.
- **Motivation:** The internal product already has stronger allergy infrastructure than most competitors, but the public website still behaves like allergy handling is mostly a free-text note plus follow-up conversation.
- **Success from the developer's perspective:** Consumers can search and trust; chefs can manage and confirm; operators can monitor and escalate; the public product feels calm and reassuring; and the system has one coherent allergy truth instead of scattered, drifting implementations.

### Transcript Capture

- The website should take allergies seriously across the board.
- Consumers should be able to find vegan, gluten-free, and allergy-safe options with confidence instead of guesswork.
- Clients hiring a private chef should feel reassured that dietary needs are handled without having to ask multiple times.
- Chefs and operators need an adaptable system that can handle lots of business and still monitor allergies correctly.
- The website should know what an allergy is, what to do when something goes wrong, and whether there is a real base truth behind those decisions.
- The visual treatment must reassure without becoming invasive or heavy-handed.
- Research must stay thorough, multi-source, cross-checked, and directly useful to product progression.
- The plan must build on what already exists instead of destroying prior infrastructure.

---

## What This Does (Plain English)

This plan upgrades ChefFlow from "allergies are mentioned somewhere in the flow" to "allergies and dietary fit are visible, structured, and operationally reliable everywhere they matter." Consumers can discover chefs by dietary fit, see calm trust signals on public pages, and submit structured dietary needs during inquiry, instant-book, and onboarding. Chefs keep using the existing confirmation, conflict, and readiness systems, but the data feeding those systems becomes cleaner and more consistent, and safety incidents get a clearer allergy-aware path when something goes wrong.

---

## Why It Matters

The codebase already has meaningful allergy safety infrastructure, including structured records, event readiness blocks, conflict alerts, and immutable post-acceptance event allergy protection, but the public website still relies too heavily on free text and manual clarification. This spec closes the gap between "we have safety logic" and "the platform visibly behaves like a safe, trustworthy system."

---

## Research Synthesis

### Chef-side and consumer-side market pattern

- **Take a Chef** asks guests to share cuisine preferences and intolerances up front, then relies on proposals and direct chef chat to finalize the menu and clarify edge cases. The public flow says "Share with us the details of your dream meal, including type of cuisine, preferences, and intolerances," then "Get chatty with your chefs," and later says booking requires "dietary preferences and any allergies" before menus arrive. Source: [Take a Chef private chef page](https://www.takeachef.com/en-us/private-chef/green), accessed April 2, 2026.
- **Take a Chef Help Center** still pushes allergy nuance into manual follow-up. Their official article says prep may happen in advance "depending on the menu, allergies, or dietary restrictions" and tells guests to "Message your Chef" for details. Source: [Take a Chef Help Center](https://helpcenter.takeachef.com/does-the-chef-cook-everything-at-your-home), accessed April 2, 2026.
- **OpenTable diner research** shows diners want both control and direct communication: 75% want to share dietary restrictions, and 85% want direct communication with the restaurant. Source: [OpenTable Diner Insights PDF](https://www.opentable.com/restaurant-solutions/wp-content/uploads/sites/156/2022/02/q122-diner-insights_b2b_us_opentable.pdf), accessed April 2, 2026.
- **FDA 2022 Food Code guidance** requires written allergen notification for unpackaged foods in adopting jurisdictions and says training programs must include awareness of the 9 major allergens. Source: [FDA sesame / 2022 Food Code guidance](https://www.fda.gov/food/retail-food-industryregulatory-assistance-training/addition-2022-food-code-sesame-added-major-food-allergen), accessed April 2, 2026.
- **Food Allergy Research & Education / food-safety guidance** consistently treats cross-contact prevention and emergency documentation as core operational practice, not optional polish. Source: [FoodAllergy.org resources](https://www.foodallergy.org/resources/securing-safe-food), accessed April 2, 2026.

### Product takeaway

The market standard is still: collect a note, then clarify later. ChefFlow can differentiate by keeping that human conversation where it belongs while making the structured safety truth visible earlier and feeding it into an already stronger internal safety model.

---

## Rollout Sequence

### Phase 1: Canonical truth and safety repair

Ship the additive safety fixes first.

- Fix the instant-book allergy data loss.
- Introduce one canonical dietary normalization layer used by inquiry, booking, onboarding, and public trust copy.
- Normalize legacy severity/source drift into the existing schema instead of adding a second allergy model.
- Keep all current structured safety tables; do not replace them.

### Phase 2: Quiet public trust signals

Project existing safety capability into the public layer.

- Reuse `chef_service_config` and `chef_directory_listings.dietary_specialties`.
- Add calm trust chips and explanatory copy on `/chefs`, public chef profile, and public inquiry pages.
- Do not present any badge as a medical certification or universal guarantee.

### Phase 3: Discovery and intake alignment

Make the public website searchable and structured.

- Add dietary-fit filters to the main `/chefs` marketplace.
- Replace free-text-only public dietary capture with a shared structured intake block.
- Persist intake into `client_allergy_records` and normalized inquiry/event snapshots.

### Phase 4: Operator visibility and confirmation

Tighten the operational loop using the structures that already exist.

- Move chef/client allergy management surfaces onto `client_allergy_records` instead of legacy flat arrays.
- Preserve readiness gates and conflict alerts, but feed them cleaner data.
- Ensure severe public inputs route toward confirmation-first behavior rather than pretending instant automation is enough.

### Phase 5: Incident and reassurance loop

Connect allergy handling to the operational response path.

- Add allergy-aware helper copy to the incident workflow under existing `food_safety` handling.
- Keep the emergency/incident path inside the current safety module.
- Reinforce menu approval and confirmation as the visible end of the trust loop.

---

## Files to Create

| File                                         | Purpose                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/dietary/catalog.ts`                     | Canonical allergen/diet registry, alias map, severity normalization          |
| `lib/dietary/intake.ts`                      | Shared parsing and persistence helpers for inquiry, instant-book, onboarding |
| `lib/dietary/public-trust.ts`                | Derives public trust chips and marketplace filter facets                     |
| `components/forms/dietary-intake-fields.tsx` | Shared structured dietary/allergy intake UI for public flows                 |
| `components/public/dietary-trust-strip.tsx`  | Reusable calm trust chip strip for cards, profiles, and inquiry pages        |

---

## Files to Modify

| File                                                        | What to Change                                                                                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/booking/booking-form.tsx`                       | Replace the single free-text dietary field with the shared structured intake block while preserving existing booking fields and layout        |
| `lib/booking/instant-book-actions.ts`                       | Persist dietary data instead of dropping it; if anaphylaxis-level input is present, route to inquiry-first instead of silent instant checkout |
| `components/public/public-inquiry-form.tsx`                 | Replace `allergy_flag` + free text with structured intake fields and calmer reassurance copy                                                  |
| `lib/inquiries/public-actions.ts`                           | Normalize dietary data, write `client_allergy_records`, keep inquiry snapshots aligned, and reduce raw allergy text dependence                |
| `lib/directory/actions.ts`                                  | Pull `dietary_specialties` and `chef_service_config`-derived trust data into public directory results                                         |
| `lib/discovery/profile.ts`                                  | Extend discovery shape to support dietary specialties and public trust summary without replacing current discovery fields                     |
| `app/(public)/chefs/page.tsx`                               | Add dietary filter params, facet handling, active-filter chips, and result rendering support                                                  |
| `app/(public)/chefs/_components/directory-filters-form.tsx` | Add dietary-fit filters to the main marketplace UI                                                                                            |
| `lib/profile/actions.ts`                                    | Fetch `chef_service_config` alongside current public profile data and expose dietary trust summary                                            |
| `app/(public)/chef/[slug]/page.tsx`                         | Render a public dietary trust section near planning details, not as an alarm banner                                                           |
| `app/(public)/chef/[slug]/inquire/page.tsx`                 | Render the trust strip and menu-approval / allergy-handling context in the right rail                                                         |
| `lib/ai/remy-public-context.ts`                             | Stop returning empty dietary arrays; ground public AI answers in actual service config and specialties                                        |
| `components/clients/onboarding-form.tsx`                    | Use canonical severity values and shared intake concepts instead of legacy severity labels                                                    |
| `lib/clients/onboarding-actions.ts`                         | Normalize onboarding allergy source/severity to the existing schema                                                                           |
| `app/(chef)/clients/preferences/allergies/page.tsx`         | Migrate this view from legacy flat `clients.allergies` arrays to structured allergy records                                                   |
| `app/api/clients/preferences/route.ts`                      | Stop treating allergies as only flat string arrays; use normalization helpers or explicitly bridge them                                       |
| `components/safety/incident-form.tsx`                       | Add allergy-reaction helper copy and quick guidance inside the existing `food_safety` incident flow                                           |

---

## Database Changes

None.

This slice should stabilize around the existing safety schema rather than introducing another allergy data model. The current structured tables already exist:

- `client_allergy_records`
- `dietary_confirmations`
- `dietary_conflict_alerts`
- `event_guest_dietary_items`
- `chef_incidents`

### Migration Notes

- Do not add a new allergy table for this slice.
- Do not drop or rewrite legacy array columns in this slice.
- If a later follow-up needs stricter cross-contact structure, that is a separate additive migration, not part of this alignment pass.

---

## Data Model

### Canonical code-layer dietary catalog

Create a code-first dietary catalog instead of a new DB table.

Recommended shape:

- `kind`: `allergen` | `diet`
- `id`: stable slug such as `sesame`, `tree_nuts`, `gluten_free`, `vegan`
- `label`: public display label
- `aliases`: array used by parsers and conflict matching
- `classification`: `fda_major` | `common_allergen` | `dietary_pattern` | `custom`
- `defaultSeverity`: fallback only; never override explicit user input
- `publicFilterable`: whether it appears in `/chefs` filters
- `notes`: internal guidance for copy and incident prompts

This catalog becomes the shared source for:

- public intake options
- onboarding intake options
- public trust chips
- severity/source normalization
- deterministic alias matching fallback

### Canonical structured allergy record

Continue using `client_allergy_records` as the client-level source of truth.

Required semantics:

- `allergen`: normalized catalog label or explicit custom label
- `severity`: canonical values only: `preference`, `intolerance`, `allergy`, `anaphylaxis`
- `source`: canonical values only: `chef_entered`, `ai_detected`, `intake_form`, `client_stated`
- `confirmed_by_chef`: remains the signal for operational readiness
- `notes`: absorbs extra context such as cross-contact instructions or uncertainty

### Public dietary trust summary

Derive a reusable public summary from existing fields:

- `chef_directory_listings.dietary_specialties`
- `chef_service_config.handles_allergies`
- `chef_service_config.handles_medical_diets`
- `chef_service_config.handles_religious_diets`
- `chef_service_config.shares_menu_for_approval`
- optional chef-written `custom_dietary_note`

Output shape:

- `specialties: string[]`
- `trustChips: Array<{ id, label, tone }>`
- `hasAllergyHandling: boolean`
- `hasMenuApproval: boolean`
- `hasMedicalDietHandling: boolean`
- `hasReligiousDietHandling: boolean`
- `plainEnglishSummary: string | null`

### Inquiry and booking snapshot behavior

- The public intake writes normalized structured records to `client_allergy_records`.
- The inquiry continues storing a coarse snapshot in `confirmed_dietary_restrictions` plus safer normalized `unknown_fields`.
- Events continue using existing allergy/dietary snapshot fields and readiness gates.
- Severe inputs do not bypass confirmation just because the flow started publicly.

---

## Server Actions

| Action                                           | Auth                      | Input                                                           | Output                                                        | Side Effects                                                                                                          |
| ------------------------------------------------ | ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `submitPublicInquiry(input)` (modified)          | none                      | existing public inquiry payload plus structured dietary input   | existing success payload                                      | creates client/inquiry/event, writes structured allergy records, reuses normalized snapshots                          |
| `createInstantBookingCheckout(input)` (modified) | none                      | existing instant-book payload plus structured dietary input     | existing checkout payload or actionable safety redirect error | creates client/inquiry/event records with structured dietary data; blocks direct checkout for anaphylaxis-level cases |
| `saveClientOnboarding(input)` (modified)         | token-auth client context | onboarding payload with canonical severity/source normalization | existing onboarding success payload                           | upserts normalized `client_allergy_records`                                                                           |
| `getDiscoverableChefs()` (modified)              | none                      | none                                                            | public chef cards plus dietary specialties and trust summary  | none                                                                                                                  |
| `getPublicChefProfile(slug)` (modified)          | none                      | `slug: string`                                                  | public profile with dietary trust summary                     | none                                                                                                                  |
| `loadRemyPublicContext(tenantId)` (modified)     | none                      | `tenantId: string`                                              | populated dietary/service capability context                  | none                                                                                                                  |

### Shared helper layer

`lib/dietary/intake.ts` should provide pure helpers, not a second server-action layer:

- `normalizeDietarySelections(input)`
- `normalizeAllergyRecords(input)`
- `upsertClientAllergyRecordsFromIntake(db, tenantId, clientId, records)`
- `derivePublicTrustSummary(config, specialties)`

---

## UI / Component Spec

### Page Layout

#### A. Main `/chefs` marketplace

Add one new filter group: `Dietary fit`.

Behavior:

- Show common consumer-relevant options only:
  - `Vegan`
  - `Vegetarian`
  - `Gluten-free`
  - `Dairy-free`
  - `Allergy-aware`
  - `Medical diets`
  - `Religious diets`
- Use existing filter language and styling; do not create a second filter sidebar pattern.
- On result cards, show up to 4 quiet trust chips below the existing discovery details.
- Do not render an empty trust section when no data exists.

#### B. Public chef profile

Add a `Dietary Fit` / `Food Safety and Dietary Handling` block near the current planning details, not buried in a footer and not above the hero.

Contents:

- specialties chips from `dietary_specialties`
- capability chips from `chef_service_config`
- short explanatory sentence when `shares_menu_for_approval` is on
- optional chef-written `custom_dietary_note` if present and concise

Rules:

- calm surface only; no red error treatments on public marketing pages
- no fake certification language
- distinguish between `handles allergies` and `offers vegan/gluten-free menus`

#### C. Public inquiry and instant-book flows

Replace the current single free-text pattern with a shared `DietaryIntakeFields` block.

Fields:

- `Do any guests need accommodations?` with `No`, `Yes`, `Not sure yet`
- `Dietary preferences` multi-select
- `Allergies` chip picker from catalog plus `Custom`
- severity selector per allergy record:
  - `Preference / avoid if possible`
  - `Intolerance`
  - `Allergy`
  - `Anaphylaxis / severe`
- `Additional context` text area for cross-contact or preparation notes

Reassurance copy:

- one short supporting line under the section
- reference menu approval when the chef has it enabled
- do not add oversized warnings unless the user selects severe input

#### D. Chef/client allergy management

Move the chef-side allergy preferences page and onboarding write path onto the structured model.

Requirements:

- severity labels must match schema values
- source labels must match schema values
- legacy array data can still be displayed as a fallback, but structured records become primary

#### E. Safety incident form

Keep the incident form inside the existing `food_safety` incident type.

Add:

- helper text for allergy reactions / cross-contact incidents
- suggested prompts:
  - what allergen was involved
  - who was affected
  - what immediate action was taken
  - whether emergency services or epinephrine were involved

### States

- **Loading:** use existing page skeletons and card shells; never show fake trust chips before data exists
- **Empty:** no dietary section or filters selected means no visual noise; show nothing instead of placeholder zeros
- **Error:** if dietary trust data fails to load, keep the page functional and omit the trust strip rather than inventing defaults
- **Populated:** show short, readable chips and a single explanatory sentence; severe public intake adds inline caution, not a modal barrage

### Interactions

- Marketplace dietary filters behave like existing filters and remain URL-driven.
- Public intake updates chips and severity selectors inline; custom allergen entry is allowed.
- Instant-book with `anaphylaxis` severity does not continue to checkout; the user gets a clear message that chef confirmation is required first.
- Standard dietary requests like vegan or gluten-free can still proceed normally when the chef advertises support.
- Chef-side structured allergy edits remain confirmation-aware and should not auto-confirm public intake records.

---

## Edge Cases and Error Handling

| Scenario                                                                        | Correct Behavior                                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Instant-book receives allergy input but does not support structured persistence | Do not ship; this is the exact bug this spec closes                                           |
| User selects `Anaphylaxis` during instant-book                                  | Stop checkout and route to inquiry-first confirmation flow                                    |
| Chef has `handles_allergies = false` but public user enters allergy needs       | Show inline mismatch guidance and block direct booking submission                             |
| User enters custom allergen not in catalog                                      | Preserve the custom label, normalize spacing/case, and store it as a structured custom record |
| `dietary_specialties` is empty but service config exists                        | Show only capability chips derived from service config                                        |
| Structured records exist but legacy `clients.allergies` arrays are stale        | Structured records win; legacy arrays are fallback only                                       |
| Public trust data fails to load                                                 | Omit the trust strip and keep the primary flow working                                        |
| Menu approval is off                                                            | Do not promise menu approval in reassurance copy                                              |
| Existing onboarding severity/source values are invalid for schema               | Normalize before write; never insert raw legacy values                                        |

---

## Verification Steps

1. Open `/chefs` and filter for `Gluten-free`; verify only chefs with matching specialties or trust data remain visible.
2. Open a public chef profile with dietary specialties and service config enabled; verify the trust strip renders calm chips and menu-approval language.
3. Open the inquiry page for the same chef; verify the right rail repeats trust context without alarm styling.
4. Submit a public inquiry with `vegan` plus a custom `sesame` allergy marked `allergy`; verify `client_allergy_records` receives normalized rows with `source = intake_form`.
5. Submit an instant-book request with `gluten-free` only; verify checkout still proceeds and the inquiry/event records include normalized dietary data.
6. Submit an instant-book request with `peanut` marked `anaphylaxis`; verify checkout is blocked and the flow requires inquiry-first confirmation.
7. Complete client onboarding with structured allergies; verify writes use canonical severity and source values accepted by the schema.
8. Open the chef-side allergy preferences view; verify it reads structured records rather than only `clients.allergies`.
9. Open a draft event linked to a client with unconfirmed anaphylaxis; verify readiness still hard-blocks until confirmation.
10. Open the safety incident form and choose `Food Safety`; verify allergy-specific helper guidance is present.

---

## Out of Scope

- Building a new certification or compliance marketplace
- Replacing every legacy dietary/allergy array field in one migration
- Adding a database-managed taxonomy CMS
- Building restaurant-level menu labeling across external partner venues
- Medical diagnosis, legal advice, or jurisdiction-specific compliance automation beyond current guidance copy

---

## Notes for Builder Agent

- Reuse the existing safety schema first. The biggest mistake here would be creating a new public-only allergy model.
- `handles_allergies` is a capability flag, not a blanket guarantee for every case.
- Keep the UI calm. This spec wants visible reassurance, not red-warning marketing pages.
- The public trust layer and the operational confirmation layer are different things. Do not collapse them into one badge.
- Preserve compatibility with existing inquiry/event flows; the additive goal is better data and better trust, not a second booking system.

---

## Spec Validation (Planner Gate)

### 1. What exists today that this touches?

- Public booking currently sends a single free-text `allergies_food_restrictions` field into both inquiry and instant-book flows: `components/booking/booking-form.tsx:304-315`, `components/booking/booking-form.tsx:725-731`
- Public inquiry currently collects a binary allergy flag and optional free text only: `components/public/public-inquiry-form.tsx:69-73`, `components/public/public-inquiry-form.tsx:521-539`
- Public inquiry currently stores a split string array into `confirmed_dietary_restrictions` and copies the raw text into `unknown_fields`: `lib/inquiries/public-actions.ts:75-80`, `lib/inquiries/public-actions.ts:217-239`
- Instant-book currently validates the allergy field but never uses it afterward: `lib/booking/instant-book-actions.ts:30-47`, `lib/booking/instant-book-actions.ts:77-84`
- Main `/chefs` discovery only supports query, location, cuisine, service type, price, partner type, accepting, and sort: `app/(public)/chefs/page.tsx:79-91`, `app/(public)/chefs/page.tsx:347-418`
- Main marketplace filters currently have no dietary control: `app/(public)/chefs/_components/directory-filters-form.tsx:277-340`
- Discovery profile has no dietary field today: `lib/discovery/profile.ts:9-29`, `lib/discovery/profile.ts:135-150`
- Public profile data currently fetches marketplace and directory data, but not service config: `lib/profile/actions.ts:156-217`
- Public chef profile currently shows planning details, credentials, partners, reviews, and availability, but not dietary trust: `app/(public)/chef/[slug]/page.tsx:458-575`
- Public inquiry page already has a right rail with reviews and dates, which is the right place for dietary reassurance: `app/(public)/chef/[slug]/inquire/page.tsx:61-220`
- Chef-side service config already tracks allergy handling, medical diets, religious diets, custom dietary notes, and menu approval: `database/migrations/20260330000056_chef_service_config.sql:34-38`, `database/migrations/20260330000056_chef_service_config.sql:58-69`, `lib/chef-services/service-config-actions.ts:34-38`, `lib/chef-services/service-config-actions.ts:61-67`
- Chef settings already expose those service-config controls in UI: `app/(chef)/settings/my-services/page.tsx:397-415`, `app/(chef)/settings/my-services/page.tsx:626-635`
- The structured allergy model already exists in the schema: `clean-schema.sql:8438-8458`, `clean-schema.sql:10641-10667`, `clean-schema.sql:11853-11867`
- Readiness already hard-blocks unconfirmed anaphylaxis: `lib/events/readiness.ts:341-390`
- Event allergy mutation is already protected post-acceptance: `clean-schema.sql:3266-3288`
- Structured allergy records already have a severity-aware UI surface: `components/clients/allergy-records-panel.tsx:29-87`, `components/clients/allergy-records-panel.tsx:143-153`, `components/clients/allergy-records-panel.tsx:228-250`
- Deterministic cross-contamination/conflict logic already exists: `lib/dietary/cross-contamination-check.ts:52-99`, `lib/dietary/cross-contamination-check.ts:103-251`
- The app audit already confirms safety, menu allergen, client-preferences, and onboarding surfaces exist: `docs/app-complete-audit.md:550-552`, `docs/app-complete-audit.md:584`, `docs/app-complete-audit.md:736-737`, `docs/app-complete-audit.md:1465-1477`, `docs/app-complete-audit.md:1697-1709`

### 2. What exactly changes?

- Add a canonical code-layer dietary catalog and normalization helper so the same allergen/diet language can feed booking, inquiry, onboarding, and public trust surfaces instead of today's scattered constants and legacy labels: `lib/constants/allergens.ts:1-39`, `lib/menus/allergen-check.ts:238-280`, `components/clients/onboarding-form.tsx:51-89`
- Replace free-text-only public dietary capture with a shared structured intake block across the two public entry points that currently depend on free text: `components/booking/booking-form.tsx:304-315`, `components/booking/booking-form.tsx:725-731`, `components/public/public-inquiry-form.tsx:521-539`
- Fix instant-book so dietary data is persisted and severe cases are not silently instant-booked: `lib/booking/instant-book-actions.ts:30-47`, `lib/events/readiness.ts:378-389`
- Project existing `chef_service_config` and `chef_directory_listings.dietary_specialties` into public discovery and profile trust signals: `database/migrations/20260330000056_chef_service_config.sql:34-38`, `database/migrations/20260330000056_chef_service_config.sql:58-69`, `clean-schema.sql:6915-6937`, `lib/profile/actions.ts:156-217`
- Move chef/client allergy preference surfaces toward `client_allergy_records` instead of legacy arrays: `clean-schema.sql:8438-8458`, `app/(chef)/clients/preferences/allergies/page.tsx:21-109`, `app/api/clients/preferences/route.ts:7-48`
- Add allergy-aware helper guidance to the existing `food_safety` incident workflow rather than building a new safety subsystem: `components/safety/incident-form.tsx:10-17`, `app/api/v2/safety/incidents/route.ts:24-41`

### 3. What assumptions are you making?

- **Verified:** structured client allergy records already exist and support canonical severity/source values: `clean-schema.sql:8438-8452`
- **Verified:** public marketplace data already has a `dietary_specialties` source field in `chef_directory_listings`, but the main marketplace does not use it yet: `clean-schema.sql:6915-6937`, `lib/discovery/profile.ts:135-150`
- **Verified:** service-config already contains the right public trust primitives: `database/migrations/20260330000056_chef_service_config.sql:34-38`, `database/migrations/20260330000056_chef_service_config.sql:58-69`
- **Unverified by code, explicitly specified here:** `dietary_specialties` is populated consistently enough across real chef records to drive useful public filtering on day one; the field exists but there is no evidence in current marketplace logic about population quality: `clean-schema.sql:6920-6922`, `app/(public)/chefs/page.tsx:347-418`
- **Unverified by code, explicitly specified here:** anaphylaxis-level public instant-book requests should convert to inquiry-first instead of checkout; current public intake does not even capture severity in the booking flow, while readiness already treats anaphylaxis as a hard block: `components/booking/booking-form.tsx:725-731`, `lib/events/readiness.ts:378-389`
- **Unverified by code, explicitly specified here:** a code-first catalog is sufficient for this slice and does not yet need DB administration; current truth is still split across code constants and matchers: `lib/constants/allergens.ts:1-39`, `lib/menus/allergen-check.ts:238-280`

### 4. Where will this most likely break?

1. **Instant-book persistence.** A builder could patch the UI but forget the server path, leaving `allergies_food_restrictions` still unused in `lib/booking/instant-book-actions.ts:30-47`.
2. **Schema normalization drift.** Onboarding currently uses `life_threatening` severity and `source: onboarding`, which do not match the canonical schema checks shown in `clean-schema.sql:8451-8452`; see `components/clients/onboarding-form.tsx:51-89` and `lib/clients/onboarding-actions.ts:146-159`.
3. **Legacy-array fallback confusion.** The current allergy preferences page still reads `clients.allergies`, so a builder could patch public intake but leave chef-side visibility stale: `app/(chef)/clients/preferences/allergies/page.tsx:21-109`, `app/api/clients/preferences/route.ts:7-48`.
4. **False guarantees in public copy.** `handles_allergies` is a boolean capability, not a clinical certification. Builders could overstate what the flag means if they do not distinguish capability vs guarantee in copy: `database/migrations/20260330000056_chef_service_config.sql:34-38`, `app/(chef)/settings/my-services/page.tsx:397-415`.
5. **Public AI grounding.** `loadRemyPublicContext()` currently returns empty dietary arrays even though service config exists, so a builder could update pages but forget the visitor-facing AI layer: `lib/ai/remy-public-context.ts:11-21`, `lib/ai/remy-public-context.ts:70-80`.

### 5. What is underspecified?

These are the only areas that still require explicit builder judgment:

- The exact chip vocabulary for `Dietary fit` filters should be finalized against real production data population, not invented in isolation: `clean-schema.sql:6920-6922`, `lib/discovery/profile.ts:135-150`
- The exact UX wording for blocking instant-book on anaphylaxis needs final copy review, even though the hard-block logic already exists downstream: `lib/events/readiness.ts:378-389`
- The fallback behavior for partially migrated legacy client allergy arrays needs a final implementation choice:
  - read structured first, arrays second
  - or backfill arrays from structured records temporarily
    Evidence: `app/(chef)/clients/preferences/allergies/page.tsx:21-109`, `app/api/clients/preferences/route.ts:7-48`

Everything else is intentionally specified as additive reuse of existing systems.

### 6. What dependencies or prerequisites exist?

- The app baseline is green on the current intentionally dirty checkout: `docs/build-state.md:13-31`
- Public safety and incident pages already exist and should be reused, not recreated: `docs/app-complete-audit.md:1465-1477`, `components/safety/incident-form.tsx:10-17`, `app/api/v2/safety/incidents/route.ts:24-41`
- Service config already exists in a migration file even though `clean-schema.sql` does not currently show it, which means builders must respect current migration reality and not rely on only one schema artifact: `database/migrations/20260330000056_chef_service_config.sql:5-85`

### 7. What existing logic could this conflict with?

- Public booking/inquiry submission logic in `components/booking/booking-form.tsx:302-355`
- Inquiry persistence and event creation in `lib/inquiries/public-actions.ts:210-245`
- Readiness hard-block behavior in `lib/events/readiness.ts:360-390`
- Cross-contamination/conflict logic that still reads flat event/client arrays in `lib/dietary/cross-contamination-check.ts:111-186`
- Client preference APIs that still treat allergies as flat string arrays: `app/api/clients/preferences/route.ts:7-48`

### 8. What is the end-to-end data flow?

1. Consumer filters `/chefs` by dietary fit using trust data derived from `chef_directory_listings` and `chef_service_config`: `clean-schema.sql:6915-6937`, `database/migrations/20260330000056_chef_service_config.sql:34-69`, `app/(public)/chefs/page.tsx:347-418`
2. Consumer opens public profile or inquiry page and sees calm trust signals plus menu-approval context: `app/(public)/chef/[slug]/page.tsx:458-575`, `app/(public)/chef/[slug]/inquire/page.tsx:123-220`
3. Consumer submits structured dietary input through inquiry, instant-book, or onboarding: `components/booking/booking-form.tsx:304-315`, `components/public/public-inquiry-form.tsx:521-539`, `components/clients/onboarding-form.tsx:51-89`
4. Intake normalization writes `client_allergy_records` with canonical severity/source values and keeps inquiry/event snapshots aligned: `clean-schema.sql:8438-8452`, `lib/inquiries/public-actions.ts:217-239`, `lib/clients/onboarding-actions.ts:146-159`
5. Chef sees structured allergy records and confirmation state: `components/clients/allergy-records-panel.tsx:29-87`, `components/clients/allergy-records-panel.tsx:228-250`
6. Event readiness and allergen conflict checks continue to operate using the existing safety logic: `lib/events/readiness.ts:360-390`, `lib/dietary/cross-contamination-check.ts:147-251`
7. If something goes wrong, the chef documents it through the existing `food_safety` incident path with allergy-aware helper guidance: `components/safety/incident-form.tsx:10-17`, `app/api/v2/safety/incidents/route.ts:24-41`

### 9. What is the correct implementation order?

1. Create the canonical dietary helper layer (`catalog.ts`, `intake.ts`, `public-trust.ts`)
2. Fix onboarding severity/source normalization so new writes match schema
3. Fix instant-book persistence and severe-case behavior
4. Swap public inquiry and booking forms to the shared intake block
5. Extend public discovery/profile loaders with dietary trust data
6. Add `/chefs` filters and trust chips
7. Move chef/client allergy views toward structured records
8. Add incident-form helper guidance last

This order is correct because the trust UI should not ship before the data path is canonical and safe.
Supporting evidence: `lib/booking/instant-book-actions.ts:30-47`, `lib/inquiries/public-actions.ts:217-239`, `lib/events/readiness.ts:378-389`, `app/(public)/chefs/page.tsx:347-418`, `app/(chef)/clients/preferences/allergies/page.tsx:21-109`.

### 10. What are the exact success criteria?

- The main `/chefs` marketplace exposes dietary-fit filtering: `app/(public)/chefs/page.tsx:79-91`, `app/(public)/chefs/_components/directory-filters-form.tsx:277-340`
- Public profiles and inquiry pages show calm dietary trust signals when real data exists: `app/(public)/chef/[slug]/page.tsx:458-575`, `app/(public)/chef/[slug]/inquire/page.tsx:123-220`
- Public inquiry writes structured allergy records with canonical severity/source values: `clean-schema.sql:8438-8452`, `lib/inquiries/public-actions.ts:217-239`
- Instant-book no longer drops dietary data: `lib/booking/instant-book-actions.ts:30-47`
- Instant-book does not silently auto-book anaphylaxis-level input: `lib/events/readiness.ts:378-389`
- Chef-side allergy preference views can see structured allergy records: `components/clients/allergy-records-panel.tsx:29-87`, `app/(chef)/clients/preferences/allergies/page.tsx:21-109`
- Existing readiness hard-blocks and conflict logic still work: `lib/events/readiness.ts:341-390`, `lib/dietary/cross-contamination-check.ts:103-251`
- Incident reporting remains inside the existing safety system: `components/safety/incident-form.tsx:10-17`, `app/api/v2/safety/incidents/route.ts:24-41`

### 11. What are the non-negotiable constraints?

- No new allergy table for this slice; structured storage already exists in `client_allergy_records`: `clean-schema.sql:8438-8458`
- No destructive migration or legacy-column drop; this repo's migration guidance is additive and the current build state is a dirty-but-intentional baseline: `docs/build-state.md:27-31`
- No fake medical-certification language on public surfaces; the existing data only expresses capabilities and preferences: `database/migrations/20260330000056_chef_service_config.sql:34-38`, `app/(chef)/settings/my-services/page.tsx:397-415`
- No red-warning marketing treatment on public profile pages; current public profile uses calm planning cards and proof/context shells, not alert banners: `app/(public)/chef/[slug]/page.tsx:458-575`, `app/(public)/chef/[slug]/inquire/page.tsx:123-220`
- No silent continuation of severe instant-book cases; readiness already treats unconfirmed anaphylaxis as a hard block: `lib/events/readiness.ts:378-389`
- No second allergy model that competes with `client_allergy_records`: `clean-schema.sql:8438-8458`, `components/clients/allergy-records-panel.tsx:29-87`

### 12. What should NOT be touched?

- Do not rewrite the whole event/readiness system: `lib/events/readiness.ts:341-390`, `clean-schema.sql:3266-3288`
- Do not replace the existing safety incident module: `components/safety/incident-form.tsx:10-17`, `app/api/v2/safety/incidents/route.ts:24-41`
- Do not build a restaurant-wide allergen labeling program for referral partners; partner/public directory data is chef/venue showcase data, not menu-label infrastructure: `lib/directory/actions.ts:130-195`, `lib/profile/actions.ts:156-217`
- Do not treat this slice as a greenfield public-booking rebuild: `components/booking/booking-form.tsx:302-355`, `components/public/public-inquiry-form.tsx:521-539`
- Do not create a new DB-managed taxonomy admin system in this pass; the existing problem is drift across code paths, not lack of another table: `lib/constants/allergens.ts:1-39`, `lib/menus/allergen-check.ts:238-280`

### 13. Is this the simplest complete version?

Yes.

This is the smallest complete version because it:

- reuses existing safety infrastructure instead of replacing it: `clean-schema.sql:8438-8458`, `lib/events/readiness.ts:341-390`
- fixes the real data-loss bug first: `lib/booking/instant-book-actions.ts:30-47`
- surfaces trust where users actually look: `app/(public)/chefs/page.tsx:347-418`, `app/(public)/chef/[slug]/page.tsx:458-575`, `app/(public)/chef/[slug]/inquire/page.tsx:123-220`
- keeps severe-case handling conservative: `lib/events/readiness.ts:378-389`
- avoids a schema-expansion detour unless later evidence proves it is necessary: `clean-schema.sql:8438-8458`, `database/migrations/20260330000056_chef_service_config.sql:34-69`

### 14. If implemented exactly as written, what would still be wrong?

- The system would still rely on code-managed taxonomy rather than an admin-managed dietary taxonomy CMS: `lib/constants/allergens.ts:1-39`, `lib/menus/allergen-check.ts:238-280`
- Legacy flat allergy arrays would still exist as compatibility baggage even if they are no longer primary: `app/(chef)/clients/preferences/allergies/page.tsx:21-109`, `app/api/clients/preferences/route.ts:7-48`
- The cross-contamination checker would still carry some legacy-array reads until a follow-up refactor fully points it at structured records: `lib/dietary/cross-contamination-check.ts:147-186`
- This would still not make ChefFlow a legal compliance engine or medical guarantor; the current system is operational tooling, not a statutory certification layer: `database/migrations/20260330000056_chef_service_config.sql:34-69`, `components/safety/incident-form.tsx:10-17`

### What would a builder get wrong building this as written?

- Creating a new `public_allergy_profiles` table or similar instead of using `client_allergy_records`: `clean-schema.sql:8438-8458`
- Treating `vegan` and `gluten-free` as the same thing as allergy-safe even though the current system already distinguishes capabilities from conflicts and severity: `lib/chef-services/service-config-actions.ts:253-258`, `lib/dietary/cross-contamination-check.ts:147-251`
- Rendering loud warning blocks on public profiles instead of quiet trust chips, despite the current public pages using calm planning/proof layouts: `app/(public)/chef/[slug]/page.tsx:458-575`, `app/(public)/chef/[slug]/inquire/page.tsx:123-220`
- Fixing inquiry intake but forgetting the instant-book path: `components/booking/booking-form.tsx:302-315`, `lib/booking/instant-book-actions.ts:30-47`
- Leaving onboarding and client-preferences on invalid schema values: `components/clients/onboarding-form.tsx:51-89`, `lib/clients/onboarding-actions.ts:146-159`, `app/api/clients/preferences/route.ts:7-48`
- Assuming `clean-schema.sql` alone is the complete source of truth when the current migration set already includes `chef_service_config`: `database/migrations/20260330000056_chef_service_config.sql:5-85`

### Is anything assumed but not verified?

Yes.

- It is not verified from code whether enough chefs already populate `dietary_specialties` for day-one filter usefulness, even though the field exists: `clean-schema.sql:6920-6922`
- It is not verified from code whether the business wants anaphylaxis-level instant-book cases blocked outright or converted into an inquiry handoff, though the current readiness model strongly supports confirmation-first behavior: `lib/events/readiness.ts:378-389`
- It is not verified whether every runtime path already tolerates the structured-record-first / array-fallback transition on client preferences: `app/(chef)/clients/preferences/allergies/page.tsx:21-109`, `app/api/clients/preferences/route.ts:7-48`

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the alignment slice.

The remaining uncertainty is not about the core direction; it is about rollout details:

- how populated real-world dietary specialties are
- the exact wording for severe-case instant-book behavior
- how aggressively to backfill or de-emphasize legacy allergy arrays

Those are rollout choices, not blockers to implementing the architecture correctly.
