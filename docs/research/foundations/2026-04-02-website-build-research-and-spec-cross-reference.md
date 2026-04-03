# Website Build Research and Spec Cross-Reference

Date: 2026-04-02
Status: foundational, builder-facing reference
Purpose: give future builder work one canonical website-build context document that synthesizes the most relevant research, current ChefFlow website reality, and active specs into a dependency-ordered execution map

Tags: `#website` `#research` `#spec-cross-reference` `#builder-handoff` `#competitive-intelligence` `#trust` `#conversion`

---

## Why This Exists

ChefFlow now has enough website-facing research and enough active public/product specs that a future builder could easily make one of three mistakes:

1. start from the wrong document and build the wrong thing
2. restart already-verified work instead of composing with it
3. treat research conclusions as if they are already implementation specs

This file fixes that.

It is the canonical cross-reference for website-build work only.

It does **not** replace:

- narrow implementation specs
- the survey-specific builder handoff
- the competitor baseline report
- the ChefFlow implication memo

Instead, it tells the builder:

- what is already true in the repo
- which research conclusions matter most for the website
- which specs already govern those areas
- which gaps are still only research-backed and need a narrow spec before code
- what order the work should happen in

---

## Scope Boundary

This document covers website-build-relevant work only:

- homepage and top-level public conversion paths
- public chef profiles, proof, and public credibility
- public inquiry and booking trust
- public trust, FAQ, contact, and support visibility
- public discovery and search-intent expansion
- dietary trust where it changes the website experience
- post-event trust only where it feeds public proof and repeat trust

This document does **not** try to absorb every research stream in `docs/research/`.

Out of scope here unless the assigned task explicitly requires it:

- survey launch operations
- OpenClaw internals not tied to website UX
- internal infrastructure/runtime studies
- authenticated competitor-product interiors
- exact competitor APIs, schemas, or private operations
- broad platform-intelligence work outside website and public-trust decisions

---

## Current Repo Posture

These truths matter before any builder starts website work.

### 1. The recorded baseline is green, but the checkout is intentionally dirty

The current recorded baseline says:

- `npm run typecheck:app` is green
- `npm run build -- --no-lint` is green

But that verified state is on a dirty checkout, not a clean branch.

Primary references:

- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`

### 2. The current builder-start handoff is not the canonical website entrypoint

`docs/research/current-builder-start-handoff-2026-04-02.md` remains useful, but it is not the canonical read-start for this website synthesis thread.

Use this cross-reference when the work is about:

- public conversion
- public trust
- discovery
- chef profile quality
- public booking or inquiry continuity

### 3. ChefFlow is not a thin marketing site

The current-state baseline is explicit: ChefFlow is a broad operator platform with attached public surfaces, not a standalone brochure site.

That means website work must compose with existing chef/operator systems instead of pretending the public site is a separate product.

Primary references:

- `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
- `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`

---

## Canonical Read Order

Read these in this exact order for website-build work.

### Layer 0: Repo and system constraints

1. `docs/build-state.md`
2. `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
3. `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`
4. this file

### Layer 1: Current website research truths

5. `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
6. `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`
7. `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`
8. `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`

### Layer 2: Existing website implementation specs

9. `docs/specs/featured-chef-public-proof-and-booking.md`
10. `docs/specs/public-chef-credentials-showcase.md`
11. `docs/specs/smart-input-autocomplete.md`
12. `docs/specs/discover-state-normalization-hardening.md`
13. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
14. `docs/specs/directory-post-claim-enhancement-flow.md`
15. `docs/specs/post-event-trust-loop-consolidation.md`
16. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

### Layer 3: Use only if the assigned task requires deeper competitor work

17. `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`

Read this only if the assigned task resumes:

- authenticated competitor testing
- support-response validation
- longitudinal competitor monitoring
- competitor parity work beyond the current website thread

---

## Verified Current Website State

The builder should treat these as already true in the repo today.

### 1. The homepage already sells a clear direct-booking promise

Verified in `app/(public)/page.tsx`:

- public search/discovery promise exists
- direct inquiry/no-middleman/no-commission positioning exists
- featured-chef trust surfaces already exist

This means the problem is not "the homepage says nothing." The problem is continuity, depth, and downstream reinforcement.

### 2. Public proof already exists as real product infrastructure

Verified in:

- `app/(public)/chef/[slug]/page.tsx`
- `components/public/chef-proof-summary.tsx`
- `components/public/review-showcase.tsx`
- `docs/specs/featured-chef-public-proof-and-booking.md`
- `docs/specs/public-chef-credentials-showcase.md`

The public-proof stack is not backlog vapor. It already exists and already has verified spec coverage.

### 3. The public inquiry and booking surfaces already carry trust signals

Verified in:

- `app/(public)/book/page.tsx`
- `app/(public)/book/_components/book-dinner-form.tsx`
- `components/public/public-inquiry-form.tsx`
- `docs/specs/smart-input-autocomplete.md`

ChefFlow already says useful buyer-facing things such as:

- free to browse
- no obligation
- chefs contact directly
- reply expectations
- data-sharing boundaries

The gap is not total absence. The gap is stronger structure, reassurance, and pre-decision explanation.

### 4. Trust, contact, and gift routes exist, but they are quieter than the main booking flow

Verified in:

- `app/(public)/trust/page.tsx`
- `app/(public)/contact/layout.tsx`
- `app/(public)/contact/page.tsx`
- `app/(public)/chef/[slug]/gift-cards/page.tsx`
- `app/(public)/chef/[slug]/page.tsx`

These routes already exist. The remaining issue is visibility and integration into the buyer journey.

### 5. Navigation and FAQ still skew mixed-audience

Verified in:

- `components/navigation/public-header.tsx`
- `components/navigation/public-footer.tsx`
- `app/(public)/faq/page.tsx`
- `app/(public)/compare/page.tsx`
- `app/(public)/compare/[slug]/page.tsx`

ChefFlow currently mixes:

- buyer booking/discovery
- operator adoption
- partner paths
- comparison content

That is workable, but it weakens a single clean buyer journey.

### 6. The site already has a hard anti-fabrication guardrail

Verified in `app/(public)/customers/page.tsx`.

ChefFlow intentionally refuses to invent customer stories, fabricated outcomes, or synthetic testimonials.

That is a hard guardrail. Future proof-density work must expand only with real approved proof.

### 7. Discover integrity already has a verified hardening baseline

Verified in:

- `docs/specs/discover-state-normalization-hardening.md`

If a builder touches `/discover`, they should preserve that hardening and not reopen solved normalization issues.

---

## What The Research Actually Means For The Website

The public research is no longer just "interesting competitor notes." It points to a stable set of website conclusions.

### Stable research conclusions

1. ChefFlow should win by reducing friction and increasing clarity, not by copying marketplace opacity.
2. Public proof, public profile quality, and structured inquiry context are part of the product, not just marketing polish.
3. Take a Chef is strongest on conversion architecture: trust framing, segmented landing routes, FAQ/process clarity, and repeated CTA continuity.
4. ChefFlow already has stronger anti-commission and direct-booking positioning than the competitor, but it does not yet reinforce that advantage at every layer.
5. The next high-value website gains are not "another homepage redesign." They are:
   - better search-intent landing architecture
   - stronger buyer education content
   - stronger operational reassurance and expectation-setting
   - tighter navigation and CTA continuity
   - broader site-level proof density once real approved proof exists
   - stronger visibility for alternate entry points such as contact, support, and gift

Primary supporting references:

- `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
- `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`

---

## Spec Coverage Map

This is the most important section for builder sequencing.

| Theme                                                 | Current reality in ChefFlow                                                                  | Research driver                                                                                     | Governing spec or source                                                                                                     | Builder instruction                                                                   | Status                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Public proof and reviews                              | Real profile proof, review summary, and inquiry-context proof already exist                  | competitors convert with dense public proof                                                         | `docs/specs/featured-chef-public-proof-and-booking.md`                                                                       | treat as baseline; do not rebuild from scratch                                        | verified                                          |
| Public chef credibility and career story              | Credentials, achievements, portfolio, and cause-driven story have a real implementation path | premium clients need more than ratings alone                                                        | `docs/specs/public-chef-credentials-showcase.md`                                                                             | preserve and extend only through the existing spec path                               | verified                                          |
| Structured public intake and autocomplete             | Booking/inquiry surfaces already exist; structured-input upgrade path already exists         | lower friction and cleaner data improve conversion                                                  | `docs/specs/smart-input-autocomplete.md`                                                                                     | reuse this whenever touching public search, booking, or inquiry input quality         | verified                                          |
| Discover integrity and state handling                 | `/discover` state behavior already has a verified fix                                        | trust collapses if directory data looks broken                                                      | `docs/specs/discover-state-normalization-hardening.md`                                                                       | preserve the hardening baseline if touching discover                                  | verified                                          |
| Dietary trust and allergy reassurance                 | internal safety backbone exists; public alignment is not done yet                            | research shows buyers want quiet but credible dietary trust                                         | `docs/specs/p1-allergy-and-dietary-trust-alignment.md`                                                                       | next cross-cutting trust spec to build before broader public expansion                | ready                                             |
| Post-claim listing enhancement                        | discover claim route exists but is underpowered                                              | operators care about correcting high-value public listing fields fast                               | `docs/specs/directory-post-claim-enhancement-flow.md`                                                                        | build only if assigned to discover claim/correction work                              | ready                                             |
| Post-event trust loop                                 | review/follow-up systems are fragmented                                                      | repeat trust and public proof are a loop, not isolated features                                     | `docs/specs/post-event-trust-loop-consolidation.md`                                                                          | build after the public proof baseline is preserved and if lifecycle trust is in scope | ready                                             |
| Larger consumer-first discovery and planning          | strategic direction exists but is broader than narrow website fixes                          | public site should support deciding, comparing, and planning, not only booking                      | `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`                                                       | use as the larger public-expansion map, not as a substitute for narrow fixes          | ready                                             |
| Search-intent landing architecture                    | public site is still comparatively flat by city/service/occasion                             | Take a Chef wins with segmented intent pages and internal linking                                   | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                    | write a narrow spec before code                                                       | research-backed, unspecced                        |
| Buyer education content                               | FAQ and compare content skew operator-heavy                                                  | buyers need help understanding service formats, process, and expectations                           | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                    | write a narrow spec before code                                                       | research-backed, unspecced                        |
| Operational reassurance and “what happens next” layer | useful trust copy exists, but reassurance is still thin and scattered                        | competitor trust is strongest when booking, payment, cancellation, and fallback are explained early | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                    | write a narrow spec before code                                                       | research-backed, unspecced                        |
| Navigation and CTA continuity                         | homepage is strong, but header/footer still split attention across multiple audiences        | repeated CTA continuity is part of conversion architecture                                          | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                    | write a narrow spec before code                                                       | research-backed, unspecced                        |
| Site-level proof freshness                            | profile proof exists, but broader site-level freshness proof is intentionally limited today  | Take a Chef spreads proof across more surfaces                                                      | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`, `app/(public)/customers/page.tsx` | do not fake this; expand only once real approved proof exists                         | research-backed, blocked by evidence availability |
| Alternate entry points and support visibility         | contact, trust, and gift routes exist but are under-promoted                                 | edge-intent paths improve trust and completeness                                                    | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                    | can be paired with CTA continuity/reassurance work after a narrow spec                | research-backed, unspecced                        |

---

## Recommended Builder Sequence

This is the correct dependency-aware order for website-build work.

### Phase 0: Pre-flight and boundary check

Do first:

1. read `docs/build-state.md`
2. confirm the worktree is dirty and do **not** normalize it by force
3. confirm the assigned task is actually website/public-surface work
4. read the verified/ready specs that intersect the requested surface before opening runtime files

### Phase 1: Preserve the verified public baseline

Treat these as existing foundations, not open design debates:

1. `docs/specs/featured-chef-public-proof-and-booking.md`
2. `docs/specs/public-chef-credentials-showcase.md`
3. `docs/specs/smart-input-autocomplete.md`
4. `docs/specs/discover-state-normalization-hardening.md`

Why first:

- this avoids rebuilding solved layers
- it protects existing trust and data-quality infrastructure
- later work should compose with these surfaces, not restart them

### Phase 2: Build the next ready cross-cutting trust slice

Next priority when the task is website trust and conversion:

1. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`

Why next:

- it closes a real public trust gap
- it aligns the website with the already-existing internal safety model
- larger public expansion should inherit the right dietary/safety posture

### Phase 3: Use the larger public-expansion spec when the task truly broadens

Then use:

1. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

Why here:

- it is strategic and broader than the narrow trust fixes
- it should build on preserved proof/credentials and clearer trust inputs

### Phase 4: If the task touches discover claim/correction flows, use the dedicated ready spec

Use only when assigned:

1. `docs/specs/directory-post-claim-enhancement-flow.md`

Why separate:

- it is public/discover-adjacent, but not part of the main buyer acquisition path
- it should not distract from the higher-value consumer trust work unless specifically scoped

### Phase 5: If the task extends beyond acquisition into repeat trust, use the lifecycle spec

Use only when assigned:

1. `docs/specs/post-event-trust-loop-consolidation.md`

Why after the public baseline:

- it depends on the public proof stack staying canonical
- it closes the loop after booking and service, not before

### Phase 6: For the remaining research-backed website gaps, spec before code

These are real conclusions, but they are not yet implementation-ready specs.

Draft narrow specs in this order before runtime changes:

1. search-intent landing architecture by city, service type, and occasion
2. buyer education content and pre-decision guidance
3. operational reassurance and “what happens next” content architecture
4. navigation and CTA continuity
5. alternate entry points and support visibility
6. site-level proof freshness once real approved proof exists

Why this order:

- acquisition architecture comes before copy polish
- buyer education and reassurance reduce friction before major nav changes
- CTA continuity should be shaped after the primary path is clear
- site-level proof expansion should wait for real evidence instead of forcing synthetic content

---

## Research-To-Code Mapping

Use this section when a builder needs to understand which local files are likely to move.

| Website theme                            | Current local surface anchors                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Homepage promise and top-level CTA       | `app/(public)/page.tsx`, `components/navigation/public-header.tsx`, `components/navigation/public-footer.tsx`                   |
| Public chef trust and profile proof      | `app/(public)/chef/[slug]/page.tsx`, `components/public/chef-proof-summary.tsx`, `components/public/review-showcase.tsx`        |
| Public inquiry and booking trust         | `app/(public)/book/page.tsx`, `app/(public)/book/_components/book-dinner-form.tsx`, `components/public/public-inquiry-form.tsx` |
| Trust, contact, and support visibility   | `app/(public)/trust/page.tsx`, `app/(public)/contact/layout.tsx`, `app/(public)/contact/page.tsx`                               |
| Gift-card edge entry point               | `app/(public)/chef/[slug]/gift-cards/page.tsx`, `app/(public)/chef/[slug]/page.tsx`                                             |
| Buyer FAQ and comparison education       | `app/(public)/faq/page.tsx`, `app/(public)/compare/page.tsx`, `app/(public)/compare/[slug]/page.tsx`                            |
| Discover and segmented landing expansion | `app/(public)/discover/**`, `app/(public)/chefs/**`, `app/sitemap.ts`                                                           |
| Site-level proof and customer stories    | `app/(public)/customers/page.tsx`, homepage proof modules, public chef proof components                                         |

This is not an exhaustive file inventory. It is the fastest correct map for public website work in this thread.

---

## What The Builder Must Not Change By Accident

- Do not reset or clean the worktree just to satisfy a pre-flight heuristic.
- Do not restart the public-proof stack from scratch.
- Do not create a second public review or testimonial source of truth.
- Do not fabricate customer stories, outcomes, or freshness signals to make the site look more mature.
- Do not weaken the anti-fabrication guardrail in `app/(public)/customers/page.tsx`.
- Do not create a new public-only allergy model when the product already has a structured safety backbone.
- Do not let buyer-path improvements accidentally bury or break operator/partner entry points unless the task explicitly includes navigation restructuring.
- Do not treat competitor public research as permission to copy marketplace opacity, artificial urgency, or commission-heavy positioning.
- Do not broaden a narrow website task into platform-intelligence or survey work unless the assignment explicitly shifts scope.

---

## Verified vs Unverified

### Verified

- ChefFlow already has a meaningful public trust baseline in code.
- Verified public-proof and credentials specs already exist.
- Verified discover-state hardening already exists.
- Verified smart-input/autocomplete spec already exists for structured public intake.
- Ready allergy/dietary, directory post-claim, post-event trust-loop, and consumer-first expansion specs already exist.
- The competitor research is strong on public-surface behavior, conversion structure, content architecture, and positioning.

### Unverified or intentionally not assumed

- competitor authenticated interiors
- competitor internal metrics, CAC, LTV, churn, or staffing counts
- competitor private APIs, schemas, or exact cloud topology
- whether ChefFlow already has enough approved customer proof to power site-level freshness expansion
- which unspecced website theme the product team wants first if only one additional spec is authorized

Those are not reasons to block work that is already covered by verified or ready specs.

---

## Completion Condition

This cross-reference is doing its job when a future builder can answer these questions without rereading the entire research library:

1. What is already true in the repo today?
2. Which website-facing areas are already covered by verified or ready specs?
3. Which competitor-driven conclusions are only research-backed and still need a narrow spec?
4. What order should website work happen in?
5. What must not be broken, restarted, fabricated, or unnecessarily expanded?

If those answers are clear, the builder has enough context to execute cleanly and in order.
