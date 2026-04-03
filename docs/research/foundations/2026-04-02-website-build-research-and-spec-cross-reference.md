# Website Build Research and Spec Cross-Reference

Date: 2026-04-02
Status: foundational, canonical builder-facing synthesis
Purpose: synthesize the current research library and active specs into one cross-reference document for any work that changes ChefFlow's website, chef-facing product surfaces, or website-fed data experiences

Tags: `#website` `#research` `#spec-cross-reference` `#builder-handoff` `#competitive-intelligence` `#platform-intelligence` `#openclaw` `#trust` `#conversion`

---

## Why This Exists

ChefFlow now has enough research, enough active specs, and enough parallel product lanes that a future builder can easily make the wrong move even while reading the right files.

The most common failure modes now are:

1. starting from one narrow doc and missing the rest of the system context
2. treating research conclusions like implementation instructions
3. improving a website surface while ignoring the runtime, trust, or boundary rules that make that surface truthful
4. adding OpenClaw-powered UX without keeping the OpenClaw and ChefFlow ownership split clean
5. building the wrong lane first because the repo-wide next task and the website-wide next task are not always the same thing

This file fixes that.

It is the canonical cross-reference for website-build work and website-adjacent product-surface work.

It tells the next builder:

- what is already true in the repo
- which research streams materially change website decisions
- which specs already govern those streams
- which gaps are still only research-backed and need a narrow spec before code
- what order implementation should happen in
- what must not be broken, restarted, exposed, or fabricated

---

## Scope Boundary

This document covers website-build-relevant work only.

That includes:

- public conversion, discovery, trust, and booking surfaces
- chef-facing product surfaces when better UX or better data changes real usefulness
- founder or admin surfaces when they control the truth later consumed elsewhere
- the OpenClaw and ChefFlow handshake when website behavior depends on data quality, coverage, freshness, or compliance posture
- platform-intelligence surfaces when they change the operator workflow inside the product
- operator-facing costing or pricing surfaces when they change the website or product experience directly

This document does not replace:

- narrow implementation specs
- runtime-only implementation docs that do not materially change website behavior
- survey launch operations as the immediate repo-wide next task
- scratch notes or one-off investigative memos

### What "all research" means here

It does not mean every file in `docs/research/`.

It means every research stream that materially changes website implementation decisions, user experience, trust posture, or builder sequencing.

---

## Current Repo Posture

These truths matter before any builder starts.

### 1. The recorded baseline is green, but the checkout is intentionally dirty

The current recorded baseline says:

- `npm run typecheck:app` is green
- `npm run build -- --no-lint` is green

But that verified state is on a dirty checkout, not a clean branch.

Primary references:

- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`

### 2. The repo-wide next task is not the same thing as the website-wide cross-reference

The current builder-start handoff is still steering the repo-wide execution lane around survey deploy verification.

That is still true.

This document does not replace that handoff. It is the canonical entrypoint when the assigned task is website build, product-surface build, or website-adjacent system work.

Use the current builder-start handoff to understand repo posture.
Use this document to understand website and product-surface sequencing.

### 3. ChefFlow is not a thin marketing site

ChefFlow is a broad operator platform with attached public surfaces, not a standalone brochure site.

That means website work must compose with:

- public conversion
- chef workflows
- trust and safety behavior
- platform intelligence
- pricing and catalog intelligence
- admin and founder truth surfaces

Primary references:

- `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
- `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`

### 4. OpenClaw is internal infrastructure, not a public product lane

OpenClaw may increasingly power price, catalog, metadata, and completeness improvements that show up in the product.

But it must remain:

- internal
- debranded externally
- consumed through ChefFlow-owned presentation rules

Primary references:

- `docs/specs/openclaw-internal-only-boundary-and-debranding.md`
- `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`
- `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`

### 5. The website already has meaningful foundations

The current website is not empty. It already has:

- public chef profiles
- public proof surfaces
- structured inquiry and booking
- trust, FAQ, contact, and gift paths
- public discovery
- a chef-facing pricing and catalog layer
- a founder-only OpenClaw admin route

The problem is not "build a website from zero."
The problem is "use the existing research and specs to build the next layers in the correct order."

---

## Canonical Read Order

Read these in this exact order for website-build or website-adjacent product work.

### Layer 0: Repo and system constraints

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
4. `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`
5. this file

### Layer 1: Current research truths that change build decisions

6. `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
7. `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`
8. `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
9. `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`
10. `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`
11. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`
12. `docs/research/restaurant-costing-platform-landscape-2026-04-02.md`

### Layer 2: Governing specs and build lanes

13. `docs/specs/featured-chef-public-proof-and-booking.md`
14. `docs/specs/public-chef-credentials-showcase.md`
15. `docs/specs/smart-input-autocomplete.md`
16. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
17. `docs/specs/platform-intelligence-hub.md`
18. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`
19. `docs/specs/catalog-store-selection-and-image-delivery-contract.md`
20. `docs/specs/openclaw-internal-only-boundary-and-debranding.md`
21. `docs/specs/openclaw-canonical-scope-and-sequence.md`
22. `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`

### Layer 3: Use only if the assigned task needs deeper follow-through

23. `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`
24. `docs/research/openclaw-open-questions-decision-log-2026-04-02.md`
25. `docs/research/restaurant-costing-platform-parity-handoff-2026-04-02.md`

---

## Stable System-Level Conclusions

These are the main research conclusions that should now be treated as stable.

1. ChefFlow's public website is part of the product, not a wrapper around it.
2. Public proof, public profile quality, and structured inquiry context are product infrastructure, not optional polish.
3. The next public-site gains come from continuity, reassurance, education, and stronger intent architecture, not another generic homepage redesign.
4. Response speed, source attribution, message-state trust, and proposal velocity are central operator workflow problems and belong in the product lane.
5. OpenClaw should enrich price, product, and metadata truth, but it should stay internal and debranded externally.
6. Website presentation risk and runtime acquisition logic are not the same thing. Both matter, and both must be kept in the right owner lane.
7. Better data does not justify worse boundaries. Direct observations, inferred values, dietary signals, images, and stock assertions must be surfaced carefully.
8. Catalog and pricing work is now a real website lane, not a side utility, because chefs already consume it through the product.
9. Existing restaurant costing platforms already solve meaningful workflow problems. ChefFlow should not assume it already exceeds them.
10. Research-backed themes that still do not have narrow specs should be specced before code instead of improvised in implementation.

---

## Cross-Reference Matrix

| Theme                                                     | What research proves                                                                                                                                | Current reality in ChefFlow                                                                                            | Governing specs and docs                                                                                                                                          | Builder instruction                                                                                                                                      | Status                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Public proof and chef credibility                         | Buyers need dense proof, credentials, menus, and confidence before inquiry                                                                          | Public profiles, review surfaces, and inquiry trust context already exist                                              | `docs/specs/featured-chef-public-proof-and-booking.md`, `docs/specs/public-chef-credentials-showcase.md`                                                          | Treat these as baseline. Extend, do not restart.                                                                                                         | verified                    |
| Structured intake and conversion trust                    | Structured intake, fast context capture, and clear next steps increase conversion                                                                   | Public booking and inquiry flows already capture meaningful structure                                                  | `docs/specs/smart-input-autocomplete.md`, `docs/specs/featured-chef-public-proof-and-booking.md`                                                                  | Reuse the existing intake path whenever touching public booking or inquiry quality.                                                                      | verified                    |
| Buyer education, landing architecture, and CTA continuity | The biggest website gaps are intent pages, pre-decision education, operational reassurance, and cleaner CTA continuity                              | Public routes exist, but the public system is still flatter and more mixed-audience than it should be                  | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md` | Use the strategic consumer-first spec where it fits. Write narrow follow-up specs before code for landing architecture, buyer education, or nav cleanup. | partly specced              |
| Dietary trust and safety reassurance                      | Calm, visible allergy and dietary trust should exist across discovery, inquiry, and execution                                                       | Internal safety backbone exists, but public reassurance still lags                                                     | `docs/specs/p1-allergy-and-dietary-trust-alignment.md`                                                                                                            | This is the next cross-cutting trust slice when the task is trust and discovery quality.                                                                 | ready                       |
| Platform intelligence and operator response control       | Email-first capture, source tracking, response speed, and reconciliation are the real workflow foundation                                           | Platform-intelligence lane exists and Phase 1 is already built                                                         | `docs/specs/platform-intelligence-hub.md`, `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`                                         | Build this as the operator workflow lane, not as website copy work. Keep it honest about hybrid capture and advisory sync.                               | in progress                 |
| OpenClaw-powered pricing, metadata, and completeness      | Better pricing usefulness requires stronger coverage, inference, enrichment, and quality loops, but the runtime must stay internal                  | Chef-facing price and catalog surfaces already exist, and app-side enrichment is still partly bridging the runtime gap | `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`, `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`                                  | Build the runtime control plane first, then expand website usefulness through the handshake. Do not expose OpenClaw directly.                            | ready for builder execution |
| Catalog store selection and image delivery                | Catalog UX depends on truthful store selection and reliable image delivery, not guessed pipeline rewrites                                           | The image path is proven; store selection truthfulness is the remaining contract bug                                   | `docs/specs/catalog-store-selection-and-image-delivery-contract.md`                                                                                               | Treat this as a narrow blocking contract, not a product-expansion brainstorm.                                                                            | ready                       |
| Website presentation boundary and debranding              | Public or chef-facing presentation can create risk even when the runtime is technically correct                                                     | OpenClaw must remain internal and debranded; presentation review belongs on the ChefFlow side                          | `docs/specs/openclaw-internal-only-boundary-and-debranding.md`                                                                                                    | Keep external surfaces outcome-focused and neutral. Flag rights, compliance, and substantiation issues early.                                            | verified                    |
| Operator costing parity and recipe operations             | Existing products already do strong invoice, recipe, menu, and back-office workflows                                                                | ChefFlow's differentiator is not "recipe costing exists," but how pricing intelligence and workflows are combined      | `docs/research/restaurant-costing-platform-landscape-2026-04-02.md`, `docs/research/restaurant-costing-platform-parity-handoff-2026-04-02.md`                     | Treat this as a separate ChefFlow product lane from OpenClaw runtime work.                                                                               | research-backed             |
| Open questions and future spec writing                    | Some important build decisions are still open: frontier scoring, inference thresholds, freshness SLAs, handshake rules, public-readiness thresholds | The questions are now captured instead of floating in chat                                                             | `docs/research/openclaw-open-questions-decision-log-2026-04-02.md`                                                                                                | Use the decision log to drive the next narrow specs instead of making hidden assumptions.                                                                | open                        |

---

## Current Surface Anchors

Use this map when a builder needs to translate the synthesis into actual files.

| Website or product theme                                 | Current local surface anchors                                                                                                                                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage promise and top-level CTA                       | `app/(public)/page.tsx`, `components/navigation/public-header.tsx`, `components/navigation/public-footer.tsx`                                                                                                        |
| Public chef trust, proof, and booking confidence         | `app/(public)/chef/[slug]/page.tsx`, `components/public/chef-proof-summary.tsx`, `components/public/review-showcase.tsx`, `app/(public)/book/page.tsx`, `components/public/public-inquiry-form.tsx`                  |
| Trust, contact, FAQ, compare, and alternate public entry | `app/(public)/trust/page.tsx`, `app/(public)/contact/page.tsx`, `app/(public)/faq/page.tsx`, `app/(public)/compare/page.tsx`, `app/(public)/compare/[slug]/page.tsx`, `app/(public)/chef/[slug]/gift-cards/page.tsx` |
| Public discovery and consumer-first expansion            | `app/(public)/discover/**`, `app/(public)/chefs/**`, `app/sitemap.ts`                                                                                                                                                |
| Chef-facing pricing and catalog surfaces                 | `app/(chef)/prices/page.tsx`, `app/(chef)/prices/prices-client.tsx`, `app/(chef)/culinary/price-catalog/**`, `lib/openclaw/store-catalog-actions.ts`, `lib/openclaw/catalog-actions.ts`                              |
| Catalog imagery and store-selection truth                | `components/pricing/image-with-fallback.tsx`, `lib/openclaw/image-proxy.ts`, `app/api/openclaw/image/route.ts`, `components/pricing/catalog-store-picker.tsx`                                                        |
| Founder-only runtime visibility                          | `app/(admin)/admin/openclaw/page.tsx`, `components/admin/openclaw-usage-page.tsx`                                                                                                                                    |
| Platform-intelligence build lane                         | use `docs/specs/platform-intelligence-hub.md` first, then inspect the files it names for the assigned phase                                                                                                          |

This is not a full repo inventory. It is the fastest correct local map for the work covered by this synthesis.

---

## Dependency-Ordered Builder Sequence

This is the correct build order across the current website and website-adjacent lanes.

### Phase 0: Pre-flight and boundary check

Do first:

1. read `docs/build-state.md`
2. confirm the worktree is dirty and do not normalize it by force
3. confirm whether the assignment is website build, platform workflow build, OpenClaw handshake work, or a different lane entirely
4. read the relevant verified and ready specs before opening implementation files

### Phase 1: Preserve the verified public baseline

Treat these as already-built foundations:

1. `docs/specs/featured-chef-public-proof-and-booking.md`
2. `docs/specs/public-chef-credentials-showcase.md`
3. `docs/specs/smart-input-autocomplete.md`

Why first:

- this protects existing trust and proof infrastructure
- it prevents rebuilding already-verified public layers
- later website work should compose with these surfaces, not replace them

### Phase 2: Close the next ready trust gap

Next priority when the task is trust and public usefulness:

1. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`

Why next:

- it is cross-cutting
- it tightens trust without requiring a full public rewrite
- it aligns the website with the stronger internal safety model that already exists

### Phase 3: Strengthen the public decision system

Use this phase when the task is broader public acquisition, discovery, or planning:

1. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`
2. competitor and cross-persona research docs from Layer 1

This phase covers:

- intent architecture
- buyer education
- operational reassurance
- CTA continuity
- alternate entry-point visibility
- planning-friendly public flows

Important rule:

- if the assigned task is narrower than the full strategic consumer-first spec, write or use a narrower spec before code

### Phase 4: Build operator response and workflow surfaces in the right lane

Use:

1. `docs/specs/platform-intelligence-hub.md`
2. `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`

Why here:

- this is the operator workflow lane
- it improves response speed, capture reliability, source attribution, and reconciliation
- it should not be confused with public-site copy work even though it materially changes the product experience

### Phase 5: Improve price, catalog, and product completeness through the OpenClaw handshake

Use:

1. `docs/specs/openclaw-internal-only-boundary-and-debranding.md`
2. `docs/specs/openclaw-canonical-scope-and-sequence.md`
3. `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`
4. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`
5. `docs/specs/catalog-store-selection-and-image-delivery-contract.md`

Why this comes after the public and workflow baselines:

- data quality improvements are most useful when the presentation and trust boundaries are already understood
- the runtime must improve first, then website value expands through the handshake
- narrow contract bugs such as catalog store selection should still be fixed directly when assigned

### Phase 6: Treat operator costing parity as its own ChefFlow lane

Use:

1. `docs/research/restaurant-costing-platform-landscape-2026-04-02.md`
2. `docs/research/restaurant-costing-platform-parity-handoff-2026-04-02.md`

Why separate:

- this is not the same thing as OpenClaw runtime work
- it is about operator workflows, recipe systems, inventory, purchasing, and costing parity
- it should be planned deliberately rather than leaking into the runtime or public-site lanes by accident

### Phase 7: Convert remaining research-backed themes into narrow specs before code

Use the decision log and the research-backed unspecced themes when:

- the task touches frontier scoring
- the task needs handshake rules
- the task needs public-readiness thresholds
- the task needs a new landing architecture or buyer education system not yet fully specced

Use:

- `docs/research/openclaw-open-questions-decision-log-2026-04-02.md`

---

## What The Builder Must Not Change By Accident

- Do not reset or clean the worktree just to satisfy pre-flight.
- Do not restart the public-proof stack from scratch.
- Do not treat platform-intelligence research as permission to overpromise impossible integrations.
- Do not expose OpenClaw branding, runtime internals, or raw scraper identity on chef-facing or public-facing surfaces.
- Do not make website presentation decisions as if runtime ownership and presentation ownership were the same thing.
- Do not fabricate reviews, customer stories, freshness signals, allergy trust signals, or metadata completeness.
- Do not let inferred pricing quietly replace direct observed pricing.
- Do not let ChefFlow become the hidden owner of runtime acquisition or inference logic.
- Do not let OpenClaw become the hidden owner of recipe scaling, chef workflow UX, or public presentation.
- Do not pull the restaurant-costing parity lane into OpenClaw runtime architecture by default.
- Do not broaden a narrow website task into survey operations or unrelated infrastructure unless the assignment explicitly shifts scope.

---

## Verified vs Unverified

### Verified

- The repo-wide baseline is currently green on a dirty checkout.
- ChefFlow already has meaningful public trust and proof infrastructure in code.
- Verified or ready specs already exist for public proof, credentials, structured intake, dietary trust, consumer-first expansion, platform intelligence, OpenClaw boundary, OpenClaw runtime, and catalog store-selection truth.
- The OpenClaw handshake is now explicitly a website-build concern when data quality affects chef-facing usefulness.
- Existing operator costing products already solve many workflow problems ChefFlow should learn from.

### Unverified or intentionally not assumed

- Which single research-backed unspecced website theme should be built first if only one more spec is authorized
- The exact public-readiness threshold for broader OpenClaw-fed product exposure
- The final frontier-scoring weights, inference thresholds, and metadata freshness SLAs
- Whether ChefFlow should enter the full recipe-costing parity lane immediately or after the current pricing and workflow foundations are stronger

Those are not reasons to block work that is already covered by verified or ready specs.
They are reasons to write the next narrow spec instead of guessing.

---

## Completion Condition

This cross-reference is doing its job when a future builder can answer these questions without rereading the whole research library:

1. What is already true in the repo today?
2. Which research streams materially change website and product-surface decisions?
3. Which themes are already covered by verified or ready specs?
4. Which themes still need a narrow spec before code?
5. What order should the website and adjacent product lanes happen in?
6. What boundaries must not be broken while implementing them?

If those answers are clear, the builder has enough context to execute cleanly, in order, and without creating architecture drift.
