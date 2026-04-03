# Spec: Website Build Research-Spec-Code Cross-Reference Upgrade

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `consumer-first-discovery-and-dinner-planning-expansion.md`, `p1-allergy-and-dietary-trust-alignment.md`, `takeachef-privatechefmanager-parity-doc-program.md`, `platform-intelligence-hub.md`
> **Estimated complexity:** small (1-2 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-02 23:59 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-02 23:59 EDT | Planner (Codex) |        |
| Claimed (in-progress) |                      |                 |        |
| Spike completed       |                      |                 |        |
| Pre-flight passed     |                      |                 |        |
| Build completed       |                      |                 |        |
| Type check passed     |                      |                 |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

- We need to synthesize all research into a cross-reference document.
- This should let us leverage the findings together with the existing specification documents.
- The purpose is to guide implementation or modification of the current website build.
- The end goal is better website performance and better user experience.
- Answer every Spec Validation question from the Planner Gate with cited file paths and line numbers.
- Tell me what a builder would get wrong building this as written.
- Tell me if anything is assumed but not verified.

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** upgrade ChefFlow's existing website research synthesis into one implementation-facing cross-reference that maps research, specs, live code, and data touchpoints in a way a builder can execute without guessing.
- **Key constraints:** do not create a second canonical handoff; preserve current website reality; distinguish verified behavior from research-backed priorities; cite exact repo evidence; flag uncertainty instead of smoothing over it.
- **Motivation:** the repo already contains significant website research and several active public-surface specs, but the current guidance is still too distributed for fast, safe website iteration.
- **Success from the developer's perspective:** a builder can open one canonical document, understand what exists today, know which spec governs each website theme, see the live route/action/schema anchors, and know what not to touch.

---

## What This Does (Plain English)

This spec upgrades the existing canonical website-build cross-reference so it becomes a builder-grade research-to-spec-to-code guide. After it is implemented, a website builder should be able to open one document and see, for every meaningful public-site theme, the research source, the governing spec or lack of one, the live route/component/server-action anchors, the tables involved, the build priority, and the guardrails that keep claims honest.

---

## Why It Matters

ChefFlow already has a real website and real public-to-ops continuity. The risk is no longer "we have no website plan"; the risk is builders duplicating docs, overclaiming what the product does, or editing the website without understanding which research conclusions are already captured by specs and which still need a narrower spec first.

---

## Files to Create

None. This feature upgrades the existing canonical website-build cross-reference instead of creating a new parallel document family.

---

## Files to Modify

| File                                                                                      | What to Change                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` | Keep the same canonical path, but restructure it into an implementation-facing matrix that maps research -> governing spec -> live code/actions -> schema touchpoints -> build priority -> guardrails -> uncertainty. |

---

## Database Changes

None.

---

## Data Model

This is a documentation feature, so it does not add or change schema. It must, however, accurately map the existing website-facing runtime model:

- `chefs` is the public identity root for chef slugs, display info, website visibility, booking settings, and inquiry routing (`lib/db/schema/schema.ts:19666-19701`).
- `chef_marketplace_profiles` holds public discovery traits such as cuisine, service type, price range, service area, inquiry availability, and next availability (`lib/db/migrations/schema.ts:4904-4923`).
- `chef_directory_listings` provides published directory-facing cuisine/service/location/price/review fields that backfill discovery surfaces (`lib/db/schema/schema.ts:21842-21876`).
- `directory_listings` and `directory_nominations` back `/discover` search, listing integrity, and community nomination workflows (`lib/db/schema/schema.ts:23737-23808`).
- `clients`, `inquiries`, `events`, and `event_state_transitions` form the continuity layer behind both open booking and chef-specific inquiry flows (`lib/db/schema/schema.ts:22367-22402`, `lib/db/schema/schema.ts:22482-22517`, `lib/db/schema/schema.ts:22673-22708`, `lib/db/schema/schema.ts:854-884`).

The upgraded cross-reference must explicitly tie each public website surface to the tables it reads or writes. It must not hand-wave these relationships away.

---

## Server Actions

No new server actions are introduced. The cross-reference document must explicitly index the existing actions and routes that shape website behavior.

| Action / Route                  | Auth   | Input                       | Output                                  | Side Effects                                                                                                                                                                                 |
| ------------------------------- | ------ | --------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getDiscoverableChefs()`        | none   | none                        | homepage and `/chefs` chef card data    | reads `chefs`, discovery profile sources, and partner showcase data (`lib/directory/actions.ts:73-104`, `lib/directory/actions.ts:206-216`)                                                  |
| `getPublicChefProfile(slug)`    | none   | `slug: string`              | public chef profile and inquiry context | reads `chefs`, `chef_marketplace_profiles`, `chef_directory_listings`, and partner data (`lib/profile/actions.ts:156-217`, `lib/profile/actions.ts:240-246`)                                 |
| `submitPublicInquiry(input)`    | none   | public chef inquiry payload | success / failure payload               | creates client, inquiry, event, and event transition records (`lib/inquiries/public-actions.ts:22-43`, `lib/inquiries/public-actions.ts:212-220`, `lib/inquiries/public-actions.ts:272-280`) |
| `POST /api/book`                | none   | open-booking form payload   | success / failure payload               | matches chefs, then creates client, inquiry, and draft event records per matched chef (`app/api/book/route.ts:106-145`, `app/api/book/route.ts:168-231`)                                     |
| `getDirectoryListings(filters)` | none   | directory filters           | paginated `/discover` results           | reads `directory_listings` with filter/state normalization (`lib/discover/actions.ts:97-166`)                                                                                                |
| `getDirectoryStats()`           | none   | none                        | landing-state stats for `/discover`     | reads aggregate `directory_listings` stats (`lib/discover/actions.ts:274-320`)                                                                                                               |
| `submitNomination(input)`       | public | discover nomination input   | `{ success, error? }`                   | inserts `directory_nominations` (`lib/discover/actions.ts:388-419`)                                                                                                                          |

---

## UI / Component Spec

### Page Layout

The deliverable is an upgraded canonical research document, not a runtime page. Its structure should be explicit and execution-first:

1. **Scope + canonical-use warning**
   - State that this is the only canonical website-build cross-reference.
   - State that the superseded top-level handoff remains a redirect only.
2. **Current website surface map**
   - Cover `/`, `/book`, `/chefs`, `/chef/[slug]`, `/chef/[slug]/inquire`, `/discover`, `/faq`, `/trust`, and `/for-operators`.
   - Call out mixed-audience navigation/header/footer as current reality, not solved state.
3. **Research -> spec -> code -> data matrix**
   - Required columns:
     - website theme / user job
     - research source
     - governing spec or status (`verified`, `ready`, `research-backed`, `unspecced`, `blocked`)
     - live routes/components/actions
     - tables or schema touchpoints
     - builder instruction
     - non-negotiable guardrail
     - verified vs unverified note
4. **Runtime seam section**
   - Separate:
     - open booking (`/book` -> `POST /api/book`)
     - chef-specific inquiry (`/chef/[slug]/inquire` -> `submitPublicInquiry()`)
     - directory discovery (`/discover` -> `getDirectoryListings()` / `submitNomination()`)
5. **Dependency-ordered builder sequence**
   - Preserve the current idea of build order, but make it route- and implementation-facing.
6. **No-touch boundaries**
   - Explicitly fence off runtime areas the builder must not rewrite under the banner of "website cleanup."
7. **Verified vs unverified**
   - Keep a hard boundary between code-verified truth and research-backed opportunity.
8. **Builder kickoff checklist**
   - Give a short list of what to read and in what order before any website implementation begins.

### States

- **Loading:** not applicable. This is a static repo document.
- **Empty:** not allowed. If any major public surface or theme lacks a row, the document is incomplete.
- **Error:** broken links, uncited claims, or missing runtime anchors count as documentation bugs and must be fixed before the document is treated as canonical.
- **Populated:** every major public website surface and website-relevant research theme is mapped to live code, specs, and data touchpoints with explicit certainty labels.

### Interactions

- A builder should be able to open the canonical cross-reference first, then click outward to the governing spec, the runtime files, and the schema anchors without opening a second handoff.
- The document should never force the builder to infer whether a research finding is already specced or still needs a new narrow spec.
- If a theme is only research-backed, the doc must say "write a narrow spec before code" rather than implying direct build readiness.

---

## Edge Cases and Error Handling

| Scenario                                                     | Correct Behavior                                                                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder is tempted to create a new cross-reference doc       | Do not create a second canonical file. Upgrade the existing canonical file at the same path.                                                        |
| Current website behavior differs from older research wording | Code and audit win. The document should cite the live route/component/action and mark the research implication as needing update if there is drift. |
| A research theme has no governing spec yet                   | Keep the row, mark it as `research-backed, unspecced`, and instruct the builder to write a narrow spec before code.                                 |
| A public claim is not supported by current code              | Mark it unverified or blocked. Do not translate it into website truth.                                                                              |
| A route is mixed-audience today                              | Describe the current seam honestly instead of pretending the website is already unified.                                                            |

---

## Verification Steps

1. Open `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` and confirm it still presents itself as the canonical website-build entrypoint, not one of several competing handoffs.
2. Confirm the upgraded document explicitly covers the currently live public surfaces already documented in the audit: homepage, `/book`, `/chefs`, `/chef/[slug]`, `/chef/[slug]/inquire`, `/discover`, `/faq`, `/trust`, and `/for-operators` (`docs/app-complete-audit.md:1930-1978`).
3. Confirm every major website-facing theme in the current spec coverage map has a row that includes research source, governing spec status, live code anchors, and builder instruction (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`).
4. Confirm the document separates the two booking/intake pipelines:
   - `/book` -> `POST /api/book` -> `clients` / `inquiries` / `events`
   - `/chef/[slug]/inquire` -> `submitPublicInquiry()` -> `clients` / `inquiries` / `events`
5. Confirm `/discover` is mapped separately from chef discovery, including `directory_listings` and `directory_nominations` touchpoints (`app/(public)/discover/page.tsx:248-364`, `lib/discover/actions.ts:97-166`, `lib/db/schema/schema.ts:23737-23808`).
6. Confirm the upgraded document preserves honesty around AI, trust, and operational continuity by referencing only the public claims actually present on the live site (`app/(public)/for-operators/page.tsx:44-46`, `app/(public)/trust/page.tsx:9-34`, `app/(public)/faq/page.tsx:11-18`).
7. Confirm the superseded top-level handoff still points to the canonical foundational doc and is not rewritten into a competing version (`docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).

---

## Out of Scope

- Not rewriting the public website itself.
- Not changing any runtime route, server action, or schema in this planning slice.
- Not merging all product research into one mega-document that replaces narrower specs.
- Not redefining AI policy, billing policy, or broader platform-intelligence architecture in this pass.
- Not turning research-backed gaps into implementation-ready specs unless they already have a governing spec.

---

## Notes for Builder Agent

- The repo already has a canonical website-build cross-reference. The job is to sharpen it, not replace it.
- Start from current website reality, not from competitor memory. Use `docs/app-complete-audit.md` to confirm route existence, then open runtime files for exact behavior.
- Prefer path-stable references in the upgraded document: file paths, function names, route names, and table names. Do not freeze fragile line numbers into the canonical research doc unless they materially improve clarity.
- Preserve the distinction between code-verified truth, spec-backed direction, and research-backed but unspecced opportunity.
- If a theme touches buyer trust, intake continuity, response expectations, or AI claims, be conservative. This repo already warns against implying capabilities the product has not verified (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:362-368`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:546-551`).

---

## Spec Validation (Planner Gate)

### 1. What exists today that this touches?

- The repo already has a canonical website-build research handoff at `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`, and it is explicitly described as the canonical website-build context document with a fixed read order and spec coverage map (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:5-22`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:128-140`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`).
- The older top-level handoff is already marked superseded and points builders back to the foundational doc, so duplicate-document drift is a known risk today (`docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).
- The research README already treats the foundational website-build cross-reference as the canonical entrypoint for website-specific work (`docs/research/README.md:21-27`, `docs/research/README.md:45-49`, `docs/research/README.md:66-72`, `docs/research/README.md:121-125`).
- The live public website already spans the homepage, open booking, chef directory, public chef profile, public chef inquiry page, discover directory, operator page, FAQ, trust center, and mixed public navigation/footer (`docs/app-complete-audit.md:1930-1978`, `app/(public)/page.tsx:367-376`, `app/(public)/page.tsx:449-524`, `components/navigation/public-header.tsx:11-15`, `components/navigation/public-header.tsx:70-85`, `components/navigation/public-footer.tsx:12-27`, `components/navigation/public-footer.tsx:46-50`, `app/(public)/for-operators/page.tsx:11-20`, `app/(public)/faq/page.tsx:11-18`, `app/(public)/trust/page.tsx:9-34`).
- Open booking is already a real public-to-ops pipeline, not marketing copy only: `/book` collects structured event/admin data, posts to `/api/book`, matches chefs, and creates client/inquiry/event records (`app/(public)/book/_components/book-dinner-form.tsx:67-104`, `app/(public)/book/_components/book-dinner-form.tsx:224-345`, `app/api/book/route.ts:106-145`, `app/api/book/route.ts:168-231`).
- Chef-specific inquiry is already a separate public-to-ops pipeline with a proof-heavy right rail, a form component, and a write path into client/inquiry/event creation (`app/(public)/chef/[slug]/inquire/page.tsx:1-15`, `app/(public)/chef/[slug]/inquire/page.tsx:126-137`, `app/(public)/chef/[slug]/inquire/page.tsx:223-232`, `components/public/public-inquiry-form.tsx:98-130`, `components/public/public-inquiry-form.tsx:321-342`, `lib/inquiries/public-actions.ts:22-43`, `lib/inquiries/public-actions.ts:212-220`, `lib/inquiries/public-actions.ts:272-280`).
- `/discover` is already a separate food-business directory with search/filter/state logic, listing cards, stats, and nomination workflow backed by `directory_listings` and `directory_nominations` (`app/(public)/discover/page.tsx:16-20`, `app/(public)/discover/page.tsx:248-364`, `lib/discover/actions.ts:97-166`, `lib/discover/actions.ts:274-320`, `lib/discover/actions.ts:388-419`, `lib/db/schema/schema.ts:23737-23808`).
- Public chef identity and discovery truth already come from a merged model across `chefs`, `chef_marketplace_profiles`, and `chef_directory_listings` (`lib/profile/actions.ts:156-217`, `lib/profile/actions.ts:240-246`, `lib/directory/actions.ts:73-104`, `lib/db/schema/schema.ts:19666-19701`, `lib/db/migrations/schema.ts:4904-4923`, `lib/db/schema/schema.ts:21842-21876`).
- The continuity layer behind public intake is already the shared operational model of `clients`, `inquiries`, `events`, and `event_state_transitions` (`lib/db/schema/schema.ts:22367-22402`, `lib/db/schema/schema.ts:22482-22517`, `lib/db/schema/schema.ts:22673-22708`, `lib/db/schema/schema.ts:854-884`).

### 2. What exactly changes?

- Upgrade the existing canonical website-build cross-reference in place, rather than creating a new handoff file, so README links and the superseded redirect do not drift (`docs/research/README.md:45-49`, `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).
- Reframe the canonical doc from "research/context document" into a sharper builder matrix that, for each website theme, includes research source, governing spec, live code anchors, schema touchpoints, builder instruction, and uncertainty status. The current doc already has a coverage map and builder sequence, so this is a structural upgrade, not a reset (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:410-451`).
- Make the runtime seams explicit instead of implied:
  - homepage and chef discovery read from `getDiscoverableChefs()` / `getPublicChefProfile()`
  - open booking writes through `POST /api/book`
  - chef-specific inquiry writes through `submitPublicInquiry()`
  - `/discover` reads and writes through `lib/discover/actions.ts`
    Evidence: `app/(public)/page.tsx:367-376`, `lib/directory/actions.ts:73-104`, `lib/profile/actions.ts:156-246`, `app/api/book/route.ts:106-231`, `lib/inquiries/public-actions.ts:212-280`, `app/(public)/discover/page.tsx:248-364`.
- Add no-touch and uncertainty sections that explicitly fence off truth inflation around AI, response expectations, and unverified website promises. The current canonical doc warns about this, but the upgraded document should tie those warnings directly to the relevant surfaces (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:362-368`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:546-551`, `app/(public)/for-operators/page.tsx:44-46`, `app/(public)/trust/page.tsx:29-34`).

### 3. What assumptions are you making?

- **Verified:** the canonical file path should stay the same because the README and the superseded handoff already point to it (`docs/research/README.md:45-49`, `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).
- **Verified:** the current website already has the live public surfaces the upgraded document needs to map (`docs/app-complete-audit.md:1930-1978`, `app/(public)/page.tsx:367-376`, `app/(public)/discover/page.tsx:248-364`, `app/(public)/for-operators/page.tsx:57-90`).
- **Verified:** there are two distinct public intake/write paths today, and collapsing them into one narrative would be inaccurate (`app/api/book/route.ts:106-231`, `lib/inquiries/public-actions.ts:212-280`).
- **Verified:** the current canonical doc intentionally scopes itself to website-build-relevant research only, not all research in the repo (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:22-34`).
- **Unverified, explicitly flagged:** whether the developer wants "performance" in this document to mean conversion/decision performance, frontend runtime performance, or both. The prompt says "performance and user experience," but the current website docs and code reviewed here do not define a technical performance workstream. This spec resolves that by keeping the cross-reference implementation-facing and route/theme oriented instead of inventing a perf-engineering backlog.
- **Unverified, explicitly flagged:** whether the final upgraded cross-reference should embed line-level citations inside the research doc itself. Current canonical research docs use durable path-level references and section structure, not frozen line numbers (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:128-140`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`). This spec resolves that by requiring exact file paths, route names, action names, and table names inside the doc rather than brittle line citations.

### 4. Where will this most likely break?

1. **Duplicate-document drift.** A builder could create a brand-new cross-reference file and leave the existing canonical file stale, which would immediately conflict with the README and the superseded redirect (`docs/research/README.md:45-49`, `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).
2. **Runtime-seam flattening.** A builder could describe "the booking flow" as one thing and miss that open booking and chef-specific inquiry have different entry surfaces, different matching behavior, and different trust context (`app/(public)/book/_components/book-dinner-form.tsx:67-104`, `app/api/book/route.ts:106-231`, `app/(public)/chef/[slug]/inquire/page.tsx:126-137`, `lib/inquiries/public-actions.ts:212-280`).
3. **Truth inflation.** A builder could convert research aspirations into present-tense website truth, especially around AI, response expectations, capture coverage, and operator continuity, even though the current repo explicitly warns against that (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:362-368`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:403-404`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:546-551`, `app/(public)/for-operators/page.tsx:44-46`).

### 5. What is underspecified?

These are the only areas that still require explicit builder judgment:

- The exact final table shape of the upgraded cross-reference. This spec resolves the ambiguity by requiring the matrix columns listed in `## UI / Component Spec`, but the builder still needs to choose the final markdown presentation.
- Whether FAQ/trust/operator-marketing pages get their own standalone rows or are grouped under "supporting trust and operator surfaces." The runtime and audit evidence for those surfaces is clear (`docs/app-complete-audit.md:1954-1978`, `app/(public)/faq/page.tsx:36-45`, `app/(public)/trust/page.tsx:29-34`, `app/(public)/for-operators/page.tsx:11-20`); the only choice is presentation density.
- Whether the builder should touch the superseded redirect or README at all. This spec resolves that conservatively: do not touch them unless the canonical path or title materially changes.

Everything else is intentionally specified as an in-place upgrade of the existing canonical document.

### 6. What dependencies or prerequisites exist?

- The repo baseline is green, but the checkout is intentionally dirty, so this planning slice should avoid pretending the implementation is happening on a clean branch (`docs/build-state.md:13-31`).
- The current canonical website-build cross-reference already contains the initial read order, coverage map, builder sequence, and verified/unverified split that this spec is upgrading rather than replacing (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:128-140`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:410-451`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:555-567`).
- Several active specs already govern major website themes and should be linked instead of rewritten: `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:1-6`, `docs/specs/p1-allergy-and-dietary-trust-alignment.md:1-6`, `docs/specs/takeachef-privatechefmanager-parity-doc-program.md:1-6`, `docs/specs/platform-intelligence-hub.md:10-15`.
- The app audit is already the route/surface index that the cross-reference should reuse instead of duplicating from memory (`docs/app-complete-audit.md:1930-1978`).

### 7. What existing logic could this conflict with?

- The existing canonical cross-reference itself, if the builder rewrites it in a way that loses verified-vs-unverified discipline or breaks its current coverage map (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:555-567`).
- The superseded top-level redirect and research README, if a builder moves the canonical source of truth without updating both (`docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`, `docs/research/README.md:45-49`, `docs/research/README.md:121-125`).
- The real website runtime story, if the builder simplifies or editorializes away the distinct public surfaces, mixed navigation, and split audience entry points (`components/navigation/public-header.tsx:11-15`, `components/navigation/public-header.tsx:70-85`, `components/navigation/public-footer.tsx:12-27`, `components/navigation/public-footer.tsx:70-90`, `app/(public)/page.tsx:520-524`, `app/(public)/for-operators/page.tsx:57-90`).

### 8. What is the end-to-end data flow?

This feature adds no new runtime flow. The upgraded document must accurately map the existing ones:

1. **Homepage and chef discovery read flow**
   - User lands on `/` or `/chefs`
   - server reads `getDiscoverableChefs()`
   - merged discovery state comes from `chefs`, `chef_marketplace_profiles`, and `chef_directory_listings`
   - UI renders featured chefs, directory filters, and profile entry points
     Evidence: `app/(public)/page.tsx:338-340`, `app/(public)/page.tsx:449-524`, `app/(public)/chefs/page.tsx:347-442`, `lib/directory/actions.ts:73-104`, `lib/profile/actions.ts:156-246`, `lib/db/schema/schema.ts:19666-19701`, `lib/db/migrations/schema.ts:4904-4923`, `lib/db/schema/schema.ts:21842-21876`
2. **Open-booking write flow**
   - user submits `/book`
   - form posts to `POST /api/book`
   - route calls `matchChefsForBooking()`, then writes `clients`, `inquiries`, `events`, and `event_state_transitions`
   - success UI reports matched count and location
     Evidence: `app/(public)/book/_components/book-dinner-form.tsx:67-104`, `app/(public)/book/_components/book-dinner-form.tsx:171-345`, `app/api/book/route.ts:106-145`, `app/api/book/route.ts:168-231`, `lib/booking/match-chefs.ts:15-21`, `lib/booking/match-chefs.ts:31-82`, `lib/db/schema/schema.ts:22367-22402`, `lib/db/schema/schema.ts:22482-22517`, `lib/db/schema/schema.ts:22673-22708`, `lib/db/schema/schema.ts:854-884`
3. **Chef-specific inquiry write flow**
   - user opens `/chef/[slug]/inquire`
   - proof-heavy right rail is loaded from `getPublicChefProfile()`, reviews, availability, and credentials
   - user submits `PublicInquiryForm`
   - `submitPublicInquiry()` writes `clients`, `inquiries`, `events`, and `event_state_transitions`
   - UI flips to inquiry success state
     Evidence: `app/(public)/chef/[slug]/inquire/page.tsx:61-75`, `app/(public)/chef/[slug]/inquire/page.tsx:126-232`, `components/public/public-inquiry-form.tsx:98-130`, `components/public/public-inquiry-form.tsx:321-342`, `lib/inquiries/public-actions.ts:127-163`, `lib/inquiries/public-actions.ts:212-280`, `lib/db/schema/schema.ts:22367-22402`, `lib/db/schema/schema.ts:22482-22517`, `lib/db/schema/schema.ts:22673-22708`, `lib/db/schema/schema.ts:854-884`
4. **Discover directory flow**
   - user lands on `/discover`
   - page reads `getDirectoryStats()` and, when filtered, `getDirectoryListings(filters)`
   - listing cards render from `directory_listings`
   - nomination CTA writes `directory_nominations`
     Evidence: `app/(public)/discover/page.tsx:248-364`, `lib/discover/actions.ts:97-166`, `lib/discover/actions.ts:274-320`, `lib/discover/actions.ts:388-419`, `lib/db/schema/schema.ts:23737-23808`

### 9. What is the correct implementation order?

1. Preserve the existing canonical path and scope statement instead of creating a new file.
2. Rebuild the current-surface section from the audit plus live route/component reads for homepage, nav/footer, booking, chef discovery, public profile/inquiry, discover, FAQ, trust, and operator marketing.
3. Upgrade the current spec coverage map into the fuller research -> spec -> code -> data matrix.
4. Add an explicit runtime seam section for open booking, chef inquiry, and discover so builders stop treating them as one generic "website funnel."
5. Add verified/unverified and no-touch sections that tie directly to current public claims and current guardrails.
6. Review whether the superseded redirect or README need wording updates only after the canonical file is done. If the path stays the same, leave them alone.

This order is correct because the largest risk is builder drift, not lack of another document. The canonical doc must be strengthened first, then only the pointers around it should be touched if strictly necessary (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:22-34`, `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`, `docs/research/README.md:121-125`).

### 10. What are the exact success criteria?

- The website-build cross-reference still lives at `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` and still reads as the one canonical entrypoint (`docs/research/README.md:45-49`, `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).
- Every live public surface named in the audit is represented in the upgraded document (`docs/app-complete-audit.md:1930-1978`).
- Every major website-facing theme has a row that includes:
  - research source
  - governing spec or unspecced status
  - live route/component/action anchors
  - table/schema touchpoints
  - builder instruction
  - guardrail / certainty note
- The document explicitly distinguishes:
  - homepage and chef discovery
  - open booking
  - chef-specific inquiry
  - discover directory
    Evidence: `app/(public)/page.tsx:367-376`, `app/api/book/route.ts:106-231`, `app/(public)/chef/[slug]/inquire/page.tsx:126-232`, `app/(public)/discover/page.tsx:248-364`
- The document preserves honesty around AI, trust, response expectations, and site-level proof freshness instead of translating research aspiration into live-product truth (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:362-368`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:401-405`, `app/(public)/for-operators/page.tsx:44-46`, `app/(public)/trust/page.tsx:29-34`).

### 11. What are the non-negotiable constraints?

- No runtime code changes, no schema changes, and no migration work in this planning slice. This is a documentation upgrade only.
- No second canonical website-build cross-reference. The existing foundational file remains the source of truth (`docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`, `docs/research/README.md:45-49`).
- No truth inflation around AI, capture breadth, response expectations, or site-wide proof freshness (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:362-368`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:401-405`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:546-551`, `app/(public)/for-operators/page.tsx:44-46`).
- No collapsing of consumer and operator surfaces into a fake unified website story. Mixed-audience nav and operator entry points are current reality and must be documented honestly (`components/navigation/public-header.tsx:11-15`, `components/navigation/public-footer.tsx:12-27`, `app/(public)/page.tsx:520-524`, `app/(public)/for-operators/page.tsx:57-90`).
- No rewriting or superseding active narrow specs from inside the cross-reference doc. The cross-reference should point to them, not absorb them (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:1-6`, `docs/specs/p1-allergy-and-dietary-trust-alignment.md:1-6`, `docs/specs/takeachef-privatechefmanager-parity-doc-program.md:1-6`).

### 12. What should NOT be touched?

- Do not rewrite `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md` into a second full handoff unless the canonical file path changes (`docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`).
- Do not rewrite the app audit. It remains the route inventory, not the implementation-facing synthesis (`docs/app-complete-audit.md:1930-1978`).
- Do not modify the public runtime files under the banner of this planning task:
  - `app/(public)/page.tsx`
  - `app/(public)/book/_components/book-dinner-form.tsx`
  - `app/api/book/route.ts`
  - `app/(public)/chef/[slug]/inquire/page.tsx`
  - `components/public/public-inquiry-form.tsx`
  - `app/(public)/discover/page.tsx`
  - `lib/discover/actions.ts`
  - `lib/inquiries/public-actions.ts`
  - `lib/directory/actions.ts`
  - `lib/profile/actions.ts`
- Do not alter any schema files. They are documentation anchors here, not implementation targets (`lib/db/schema/schema.ts:19666-19701`, `lib/db/schema/schema.ts:22367-22402`, `lib/db/schema/schema.ts:22673-22708`, `lib/db/schema/schema.ts:23737-23808`, `lib/db/migrations/schema.ts:4904-4923`).

### 13. Is this the simplest complete version?

Yes.

This is the smallest complete version because it:

- upgrades the canonical document already in circulation instead of starting another document family (`docs/research/README.md:45-49`, `docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`)
- reuses the existing audit and existing narrow specs instead of duplicating their content (`docs/app-complete-audit.md:1930-1978`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:1-6`, `docs/specs/p1-allergy-and-dietary-trust-alignment.md:1-6`)
- focuses on builder execution clarity rather than pretending this pass should also redesign the website

### 14. If implemented exactly as written, what would still be wrong?

- The website itself would still have mixed CTA continuity and split-audience navigation until separate implementation specs and builds address that (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:401-404`, `components/navigation/public-header.tsx:11-15`, `components/navigation/public-footer.tsx:12-27`).
- The public site would still have thin buyer reassurance and under-promoted support/trust entry points until narrower website specs land (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:401-406`, `app/(public)/faq/page.tsx:36-45`, `app/(public)/trust/page.tsx:97-109`).
- This would still be documentation, not implementation. It would make the next website changes safer and faster, but it would not itself improve conversion, performance, or UX until builders execute against it.

### What would a builder get wrong building this as written?

- Creating a brand-new cross-reference doc and leaving the existing canonical file stale (`docs/research/website-build-cross-reference-and-builder-handoff-2026-04-02.md:6-16`, `docs/research/README.md:45-49`).
- Treating research-backed rows as code-ready specs instead of flagging them as "write a narrow spec before code" (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:399-405`).
- Documenting "the booking flow" as one generic funnel and losing the distinction between `/book` and `/chef/[slug]/inquire` (`app/api/book/route.ts:106-231`, `lib/inquiries/public-actions.ts:212-280`).
- Writing public-site truth that exceeds what the repo currently verifies around AI, response expectations, or trust (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:362-368`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:546-551`, `app/(public)/for-operators/page.tsx:44-46`).
- Trying to "clean up" by editing runtime routes or schemas in the same pass instead of keeping this as a docs-only upgrade.

### Is anything assumed but not verified?

Yes.

- It is not verified from code whether the developer wants this cross-reference to include a technical web-performance backlog or only the research/spec/runtime mapping needed to guide implementation. The prompt says "performance and user experience," but the reviewed website artifacts do not define a specific performance program.
- It is not verified whether the final canonical doc should include line-level evidence inside the markdown itself. Current canonical docs rely on file-path-level references and section structure, not frozen line citations (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:128-140`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:385-405`).
- It is not verified whether every research thread currently listed in `docs/research/README.md:66-72` deserves a first-class row in the website document, or whether some should stay as linked supporting sources only. This spec resolves the risk by keeping the upgraded document website-relevant and execution-facing, not exhaustive for its own sake.

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the documentation upgrade.

The remaining uncertainty is about presentation width, not correctness:

- how broad the final matrix should be per theme
- whether the final doc should use path-only references or heavier inline evidence
- whether "performance" later expands into a separate website-performance spec

Those are not blockers to upgrading the canonical cross-reference correctly.
