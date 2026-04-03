# Website Build Research and Spec Cross-Reference

Date: 2026-04-02
Status: foundational, builder-facing reference
Purpose: give future builder work one canonical website-build context document that synthesizes the most relevant research, current ChefFlow website reality, and active specs into a dependency-ordered execution map for website implementation and modification work

Tags: `#website` `#research` `#spec-cross-reference` `#builder-handoff` `#competitive-intelligence` `#trust` `#conversion`

---

## Update Note

2026-04-03:

- Added the `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md` dependency for website-to-operator continuity work.
- Added the builder-ready `docs/specs/p1-demo-continuity-and-portal-proof.md` branch so public-to-portal proof no longer sits in a research-only bucket.
- Added the builder-ready `docs/specs/p1-buyer-education-and-pre-decision-guidance.md` branch so buyer education no longer sits in a research-only bucket.
- Added the builder-ready `docs/specs/p1-operational-reassurance-and-what-happens-next.md` branch so booking-process reassurance no longer sits in a research-only bucket.
- Added the builder-ready `docs/specs/p1-navigation-and-cta-continuity.md` branch so navigation continuity no longer sits in a research-only bucket.
- Added the builder-ready `docs/specs/p1-alternate-entry-points-and-support-visibility.md` branch so public support and alternate-entry visibility no longer sits in a research-only bucket.
- Added the companion `docs/research/website-performance-hardening-handoff-2026-04-03.md` for explicitly assigned render-path, resource-loading, caching, and build-tooling performance work.

---

## Why This Exists

ChefFlow now has enough website-facing research and enough active public/product specs that a future builder could easily make one of four mistakes:

1. start from the wrong document and build the wrong thing
2. restart already-verified work instead of composing with it
3. treat research conclusions as if they are already implementation specs
4. make website promises that drift away from the real product posture

This file fixes that.

It is the canonical cross-reference for website-build work only.

It does **not** replace:

- narrow implementation specs
- the competitor baseline report
- the ChefFlow implication memo
- the platform-intelligence product spec

Instead, it tells the builder:

- what is already true in the repo
- which research conclusions matter most for the website
- which specs already govern those areas
- which gaps are still only research-backed and need a narrow spec before code
- what order the work should happen in
- how to translate those findings into website workstreams that improve decision speed, trust, perceived performance, and conversion continuity

---

## Scope Boundary

This document covers website-build-relevant work only:

- homepage and top-level public conversion paths
- public chef profiles, proof, and public credibility
- public inquiry and booking trust
- public-to-operator continuity where it affects the website experience
- website-adjacent channel capture, source visibility, and "what happens next" messaging
- public trust, FAQ, contact, and support visibility
- public discovery and search-intent expansion
- dietary trust where it changes the website experience
- post-event trust only where it feeds public proof and repeat trust

This document does **not** try to absorb every research stream in `docs/research/`.

Out of scope here unless the assigned task explicitly requires it:

- survey launch operations
- OpenClaw internals not tied to website UX
- internal infrastructure/runtime studies
- Core Web Vitals or low-level frontend performance profiling as a standalone thread
- authenticated competitor-product interiors
- exact competitor APIs, schemas, or private operations
- broad platform-intelligence work outside website and public-trust decisions

This file is about website and UX performance in the broader product sense:

- faster path to decision
- lower trust friction
- clearer next steps
- cleaner public-to-product continuity

It is not a substitute for a dedicated rendering, bundle, or page-speed audit.

If the assigned work is explicitly public-shell or runtime performance hardening, use the dedicated companion handoff instead of stretching this file into a low-level bundle audit:

- `docs/research/website-performance-hardening-handoff-2026-04-03.md`

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

### 2. ChefFlow is not a thin marketing site

The current-state baseline is explicit: ChefFlow is a broad operator platform with attached public surfaces, not a standalone brochure site.

That means website work must compose with existing chef/operator systems instead of pretending the public site is a separate product.

Primary references:

- `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
- `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`

### 3. The website already sits on top of real product workflows

Public website actions do not end in a static contact inbox. They already create:

- matched-chef booking attempts
- inquiries
- clients
- draft events
- state transitions

That is a major strength, and it means website copy and routing should explain and reinforce real continuity instead of inventing a parallel marketing flow.

Primary code references:

- `app/api/book/route.ts`
- `lib/inquiries/public-actions.ts`
- `lib/booking/match-chefs.ts`

---

## Canonical Read Order

Read these in this exact order for website-build work.

### Layer 0: Repo and system constraints

1. `docs/build-state.md`
2. `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
3. `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`
4. this file

If the assigned website task is specifically render-path or loading performance work, read next:

5. `docs/research/website-performance-hardening-handoff-2026-04-03.md`

### Layer 1: Current website research truths

6. `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
7. `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`
8. `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`
9. `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`
10. `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
11. `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`

### Layer 2: Existing website implementation specs

12. `docs/specs/featured-chef-public-proof-and-booking.md`
13. `docs/specs/public-chef-credentials-showcase.md`
14. `docs/specs/smart-input-autocomplete.md`
15. `docs/specs/discover-state-normalization-hardening.md`
16. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
17. `docs/specs/directory-post-claim-enhancement-flow.md`
18. `docs/specs/post-event-trust-loop-consolidation.md`
19. `docs/specs/p1-search-intent-landing-architecture.md`
20. `docs/specs/p1-buyer-education-and-pre-decision-guidance.md`
21. `docs/specs/p0-public-booking-routing-and-source-truth.md`
22. `docs/specs/p1-operational-reassurance-and-what-happens-next.md`
23. `docs/specs/p1-navigation-and-cta-continuity.md`
24. `docs/specs/p1-alternate-entry-points-and-support-visibility.md`
25. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

### Layer 3: Website-adjacent continuity and product specs only when the task crosses that boundary

26. `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
27. `docs/specs/p1-demo-continuity-and-portal-proof.md`
28. `docs/specs/platform-intelligence-hub.md`
29. `docs/specs/openclaw-non-goals-and-never-do-rules.md`

Use this only if the assigned website task directly touches:

- inquiry capture continuity
- public-to-client or public-to-chef handoff behavior
- public-proof or demo-showcase continuity across public, client, and chef surfaces
- source tracking and channel attribution
- website-to-inbox or website-to-operator handoff behavior
- public promises about response speed, capture coverage, or channel management
- OpenClaw-fed pricing, catalog, metadata, freshness, or derived product facts

Use the source-to-close truth map any time a website task could flatten materially different intake lanes into one generic "website lead."

Use the demo continuity spec when the assigned website/public task is really about believable public-to-portal proof or showcase continuity rather than a net-new live-site expansion pass.

Use the OpenClaw guardrail doc any time the assigned website task could drift into:

- leaking OpenClaw branding
- overclaiming completeness or certainty
- exposing scraped-source mechanics
- confusing runtime ownership with presentation ownership

### Layer 4: Use only if the assigned task requires deeper competitor work

29. `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`

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
- direct inquiry / no-middleman / no-commission positioning exists
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

### 8. The public website already hands off into real operator workflows

Verified in:

- `app/api/book/route.ts`
- `lib/inquiries/public-actions.ts`
- `app/(public)/chef/[slug]/inquire/page.tsx`

This matters because the website can honestly explain what happens after a user clicks. The system already has real continuity. The current issue is that this continuity is not surfaced clearly enough in the public experience.

### 9. The public-to-portal proof lane is now spec-backed

Verified in:

- `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
- `docs/specs/p1-demo-continuity-and-portal-proof.md`

That means a builder no longer needs to write a fresh continuity memo if the assigned website/public task is actually "make the product feel believable end-to-end." There is now a concrete packet for that lane.

---

## What The Research Actually Means For The Website

The public research is no longer just "interesting competitor notes." It points to a stable set of website conclusions.

### Stable research conclusions

1. ChefFlow should win by reducing friction and increasing clarity, not by copying marketplace opacity.
2. Public proof, public profile quality, and structured inquiry context are part of the product, not just marketing polish.
3. Take a Chef is strongest on conversion architecture: trust framing, segmented landing routes, FAQ/process clarity, and repeated CTA continuity.
4. ChefFlow already has stronger anti-commission and direct-booking positioning than the competitor, but it does not yet reinforce that advantage at every layer.
5. The public website should explain continuity, not just attraction. Buyers trust systems that make inquiry, response, approval, booking, and follow-up feel connected.
6. Website promises around organization, response speed, and intake should stay aligned with the actual product posture: email-first, form-first, source-aware, and honest about what is or is not automated.
7. The next high-value website gains are not "another homepage redesign." They are:
   - better search-intent landing architecture
   - stronger buyer education content
   - stronger operational reassurance and expectation-setting
   - tighter navigation and CTA continuity
   - broader site-level proof density once real approved proof exists
   - stronger visibility for alternate entry points such as contact, support, and gift

### Fresh validation added on 2026-04-03

The newest multi-persona pass reinforces four website decisions that should now be treated as explicit guardrails:

1. Optional portal behavior is normal. Do not add an early login gate to public planning or inquiry flows.
2. Public flows should gather more structure earlier, especially date, headcount, dietary context, budget shape, and event type.
3. The website should acknowledge complexity. Simpler requests and more complex planning should not be presented as the same path.
4. Public AI language should stay inside the operations lane: admin help, lead handling, follow-up, and workflow support, not recipe creation or culinary replacement.

Primary supporting references:

- `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
- `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`
- `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`
- `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`
- `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`

---

## Website Build Principles

Use these as decision rules when moving from research into implementation.

### 1. Compose with the product, do not fork the website away from it

Website work should reuse:

- existing public proof infrastructure
- existing public inquiry and booking actions
- existing chef and discovery read models
- existing guest / hub / follow-on surfaces when they are the real continuity path

The website should feel like the front door to the product, not a marketing shell glued onto a different system.

### 2. Optimize for decision speed before adding surface breadth

The strongest research-backed gains are:

- clearer CTA hierarchy
- earlier structured inputs
- better menu and proof visibility
- fewer moments where the buyer has to guess what happens next

This is perceived performance and conversion performance. It is more urgent than adding more isolated routes.

### 3. Trust density beats feature density

Public pages should answer:

- who this chef is
- what they can actually do
- what the experience looks like
- what happens after inquiry
- what happens if plans change

That is stronger than packing the page with loosely related features.

### 4. Capture and continuity claims must stay honest

The platform-intelligence research sharpens one important website rule:

- public promises about "we catch everything" or "we keep this organized" must be grounded in the existing email-first, form-first, source-aware system reality

Do not imply deep, real-time integration breadth the product has not verified.

### 5. Never solve a website gap by inventing fake proof

The anti-fabrication guardrail remains absolute.

If a desired website section needs:

- testimonials
- freshness signals
- customer stories
- counts

it must be sourced from approved evidence or not shipped yet.

### 6. Keep public AI claims within the product-truth boundary

The current research supports AI as an operations helper in this category:

- lead organization
- inbox and follow-up support
- customer-service support
- workflow acceleration

It does not support broad public claims about AI-driven culinary creativity or recipe generation.

If the website touches AI messaging, keep it aligned to the admin and operating layer and cross-check against:

- `docs/ai-model-governance.md`
- `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`

---

## Spec Coverage Map

This is the most important section for builder sequencing.

| Theme                                                         | Current reality in ChefFlow                                                                                                                                                                      | Research driver                                                                                                                      | Governing spec or source                                                                                                                                                                                                                                                   | Builder instruction                                                                                                                                                                       | Status                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Public proof and reviews                                      | Real profile proof, review summary, and inquiry-context proof already exist                                                                                                                      | competitors convert with dense public proof                                                                                          | `docs/specs/featured-chef-public-proof-and-booking.md`                                                                                                                                                                                                                     | treat as baseline; do not rebuild from scratch                                                                                                                                            | verified                                          |
| Public chef credibility and career story                      | Credentials, achievements, portfolio, and cause-driven story have a real implementation path                                                                                                     | premium clients need more than ratings alone                                                                                         | `docs/specs/public-chef-credentials-showcase.md`                                                                                                                                                                                                                           | preserve and extend only through the existing spec path                                                                                                                                   | verified                                          |
| Structured public intake and autocomplete                     | Booking/inquiry surfaces already exist; structured-input upgrade path already exists                                                                                                             | lower friction and cleaner data improve conversion                                                                                   | `docs/specs/smart-input-autocomplete.md`                                                                                                                                                                                                                                   | reuse this whenever touching public search, booking, or inquiry input quality                                                                                                             | verified                                          |
| Discover integrity and state handling                         | `/discover` state behavior already has a verified fix                                                                                                                                            | trust collapses if directory data looks broken                                                                                       | `docs/specs/discover-state-normalization-hardening.md`                                                                                                                                                                                                                     | preserve the hardening baseline if touching discover                                                                                                                                      | verified                                          |
| Dietary trust and allergy reassurance                         | internal safety backbone exists; public alignment is not done yet                                                                                                                                | buyers want quiet but credible dietary trust and the research says this context often arrives too late                               | `docs/specs/p1-allergy-and-dietary-trust-alignment.md`, `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`                                                                                                         | next cross-cutting trust spec to build before broader public expansion                                                                                                                    | ready                                             |
| Post-claim listing enhancement                                | discover claim route exists but is underpowered                                                                                                                                                  | operators care about correcting high-value public listing fields fast                                                                | `docs/specs/directory-post-claim-enhancement-flow.md`                                                                                                                                                                                                                      | build only if assigned to discover claim/correction work                                                                                                                                  | ready                                             |
| Post-event trust loop                                         | review/follow-up systems are fragmented                                                                                                                                                          | repeat trust and public proof are a loop, not isolated features                                                                      | `docs/specs/post-event-trust-loop-consolidation.md`                                                                                                                                                                                                                        | build after the public proof baseline is preserved and if lifecycle trust is in scope                                                                                                     | ready                                             |
| Larger consumer-first discovery and planning                  | strategic direction exists but is broader than narrow website fixes                                                                                                                              | public site should support deciding, comparing, and planning, not only booking                                                       | `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`                                                                                                                                                                                                     | use as the larger public-expansion map, not as a substitute for narrow fixes                                                                                                              | ready                                             |
| Structured planning brief and complexity split                | homepage and booking flow already capture some structure, but the public story still flattens simple and complex requests                                                                        | chefs, consumers, and business planners all need earlier structure and a clearer split between quick request and planning-heavy work | `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`                                                                                                                | when touching `/`, `/book`, or public inquiry routing, bias toward earlier structure and a clearer request-versus-planning distinction                                                    | research-backed, partially spec-backed            |
| Search-intent landing architecture                            | public site is still comparatively flat by city/service/occasion, but there is now a narrow implementation slice for curated landing pages and internal-linking around the existing route system | Take a Chef wins with segmented intent pages and internal linking                                                                    | `docs/specs/p1-search-intent-landing-architecture.md`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                                                                                                           | use the narrow landing-architecture spec for city, service, and occasion landing work instead of inventing a broad SEO or `/eat` rewrite                                                  | ready                                             |
| Buyer education content                                       | FAQ and compare content skew operator-heavy, but there is now a narrow buyer-guide implementation slice on a dedicated public route family                                                       | buyers need help understanding service formats, process, and expectations                                                            | `docs/specs/p1-buyer-education-and-pre-decision-guidance.md`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                                                                                                    | use the narrow buyer-education spec for pre-decision guidance instead of mixing buyer learning into operator FAQ or compare surfaces                                                      | ready                                             |
| Public booking routing and source truth                       | public site still needs a canonical lane model for matched-chef booking, direct chef inquiry, embed, kiosk, Wix, and instant book provenance                                                     | the source-to-close map warns builders not to design around one generic website lead                                                 | `docs/specs/p0-public-booking-routing-and-source-truth.md`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`                                                                                                                                     | use the P0 routing/source-truth spec whenever the work touches intake lane labels, provenance, or shared expectations UI                                                                  | ready                                             |
| Operational reassurance and "what happens next" layer         | useful trust copy exists, but reassurance is still thin and scattered; there is now a narrow lane-specific implementation slice for public booking and inquiry reassurance                       | competitor trust is strongest when booking, payment, cancellation, fallback, and follow-up are explained early                       | `docs/specs/p1-operational-reassurance-and-what-happens-next.md`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`                                    | use the route-aware reassurance spec instead of flattening `/book`, `/chef/[slug]/inquire`, and instant booking into one generic process story                                            | ready                                             |
| Public AI positioning and copy guardrail                      | operator-facing AI exists, but website copy can still drift into broad or misleading claims                                                                                                      | current accepted AI value in adjacent products is operational, not recipe generation                                                 | `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`, `docs/ai-model-governance.md`                                                                                                                                                         | if touching public AI language, keep it grounded in admin, workflow, and follow-up help; do not imply recipe generation                                                                   | research-backed, unspecced                        |
| Navigation and CTA continuity                                 | homepage is strong, but header/footer still split attention across multiple audiences; there is now a narrow continuity slice for public CTA hierarchy and route-role clarity                    | repeated CTA continuity is part of conversion architecture                                                                           | `docs/specs/p1-navigation-and-cta-continuity.md`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                                                                                                                | use the continuity spec to align header, footer, homepage, `/chefs`, `/discover`, and public chef-profile CTA hierarchy                                                                   | ready                                             |
| Alternate entry points and support visibility                 | contact, trust, and gift routes exist but are under-promoted; there is now a narrow visibility slice for truthful support and secondary public entry paths                                       | edge-intent paths improve trust and completeness                                                                                     | `docs/specs/p1-alternate-entry-points-and-support-visibility.md`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`                                                                                                                | use the alternate-entry spec to connect trust, contact, and gift routes into the public booking journey without cluttering the main CTA                                                   | ready                                             |
| Website-to-operator continuity                                | public forms create real inquiries and draft events, and the repo now has a concrete proof-first packet for making that continuity legible across public, client, and chef surfaces              | buyers trust complete operating flows more than isolated landing pages                                                               | `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`, `docs/specs/p1-demo-continuity-and-portal-proof.md`, `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`, `app/api/book/route.ts`, `lib/inquiries/public-actions.ts` | if touching booking or inquiry trust, route through the truth map first; if the task is proof/showcase continuity, use the demo-continuity spec instead of drafting a new continuity memo | spec-backed, partially implemented                |
| Channel capture, source visibility, and response expectations | public site already routes inquiries, but website-adjacent capture strategy is not yet part of the website decision model                                                                        | adjacent tools win with email-first, form-first, source-aware capture and honest reconciliation, not speculative deep integrations   | `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`, `docs/specs/platform-intelligence-hub.md`                                                                                                                                                  | if the website task touches intake promises, source tracking, or response-speed claims, consult the product spec before code                                                              | research-backed, spec-backed but website-adjacent |
| Site-level proof freshness                                    | profile proof exists, but broader site-level freshness proof is intentionally limited today                                                                                                      | Take a Chef spreads proof across more surfaces                                                                                       | `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`, `app/(public)/customers/page.tsx`                                                                                                                                               | do not fake this; expand only once real approved proof exists                                                                                                                             | research-backed, blocked by evidence availability |

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

### Phase 3: If the task is demo readiness or public-to-portal proof, use the continuity packet instead of inventing a new website brief

Use only when assigned:

1. `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
2. `docs/specs/p1-demo-continuity-and-portal-proof.md`

Why here:

- this lane is now spec-backed, not just research-backed
- it is the right packet when the website/public task crosses into client and chef proof continuity
- it prevents a builder from flattening multiple real intake lanes into one fake marketing story

Execution guardrail:

- this is not the default next move while the active survey deploy-verification lane is still open; use it after that lane closes or when the developer explicitly redirects the work

### Phase 4: If the task is public acquisition architecture on the current route system, use the narrow landing spec first

Use only when assigned:

1. `docs/specs/p1-search-intent-landing-architecture.md`

Why here:

- it is the first formerly unspecced website gap now converted into a narrow implementation slice
- it improves demand capture and internal-linking on the current public route system
- it is intentionally smaller than the `/eat` expansion and should land first when the task is acquisition architecture rather than a broader consumer-product build

### Phase 5: If the task is buyer-facing education on the current public route system, use the narrow guide spec next

Use only when assigned:

1. `docs/specs/p1-buyer-education-and-pre-decision-guidance.md`

Why here:

- it converts the strongest remaining pre-decision content gap into a narrow implementation slice
- it gives buyers category and process education without forcing operator FAQ or software-comparison content into the booking path
- it should happen before broader public expansion or navigation rewrite work when the task is decision-stage trust and education

### Phase 6: If the task touches public booking lane labels, provenance, or shared intake expectations, use the P0 route-truth spec first

Use only when assigned:

1. `docs/specs/p0-public-booking-routing-and-source-truth.md`

Why here:

- it is the parent packet for public booking lane truth
- it keeps matched-chef booking, direct-chef inquiry, embed, kiosk, Wix, and instant book distinct at the config and provenance level
- the narrower reassurance slice should build on this instead of recreating lane ids or shared expectations UI

### Phase 7: If the task is route-aware booking reassurance, use the narrower reassurance spec next

Use only when assigned:

1. `docs/specs/p1-operational-reassurance-and-what-happens-next.md`

Why here:

- it converts the next booking-trust gap into a narrow implementation slice
- it explains public booking and inquiry behavior without pretending all website intake routes are one shared flow
- it assumes the shared lane model from the P0 routing/source-truth spec already exists in the branch or lands first
- it should happen before broader public expansion or navigation rewrite work when the task is buyer anxiety reduction and conversion continuity

### Phase 8: If the task is public navigation and CTA continuity, use the narrow continuity spec next

Use only when assigned:

1. `docs/specs/p1-navigation-and-cta-continuity.md`

Why here:

- it converts the next unspecced buyer-path gap into a narrow implementation slice
- it should happen after acquisition architecture, buyer education, route truth, and reassurance are already defined
- it keeps operator entry visible while making the consumer booking lane easier to decode

### Phase 9: If the task is public support visibility or alternate entry paths, use the narrow alternate-entry spec next

Use only when assigned:

1. `docs/specs/p1-alternate-entry-points-and-support-visibility.md`

Why here:

- it converts the next remaining buyer-support gap into a narrow implementation slice
- it should build on the continuity hierarchy instead of preceding it
- it makes trust, contact, and gift routes legible without weakening the main booking path

### Phase 10: Use the larger public-expansion spec when the task truly broadens

Then use:

1. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

Why here:

- it is strategic and broader than the narrow trust fixes
- it should build on preserved proof/credentials and clearer trust inputs

### Phase 11: If the task touches discover claim/correction flows, use the dedicated ready spec

Use only when assigned:

1. `docs/specs/directory-post-claim-enhancement-flow.md`

Why separate:

- it is public/discover-adjacent, but not part of the main buyer acquisition path
- it should not distract from the higher-value consumer trust work unless specifically scoped

### Phase 12: If the task extends beyond acquisition into repeat trust, use the lifecycle spec

Use only when assigned:

1. `docs/specs/post-event-trust-loop-consolidation.md`

Why after the public baseline:

- it depends on the public proof stack staying canonical
- it closes the loop after booking and service, not before

### Phase 13: If the website task crosses into intake continuity, use the website-adjacent platform research before code

Use only when assigned:

1. `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`
2. `docs/specs/platform-intelligence-hub.md`

Why here:

- website promises about response speed, capture coverage, and "we keep this organized" must match the real product posture
- the research says the honest starting point is email-first, form-first, source-aware continuity
- this prevents a website task from promising deep integration behavior the product has not actually verified

### Phase 14: For the remaining research-backed website gaps, spec before code

These are real conclusions, but they are not yet implementation-ready specs.

Draft narrow specs in this order before runtime changes:

1. site-level proof freshness once real approved proof exists

Why this order:

- acquisition architecture comes before copy polish
- buyer education, route truth, reassurance, CTA continuity, and alternate entry visibility are now spec-backed
- site-level proof expansion should wait for real evidence instead of forcing synthetic content

---

## Research-To-Code Mapping

Use this section when a builder needs to understand which local files are likely to move.

| Website theme                                 | Current local surface anchors                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage promise and top-level CTA            | `app/(public)/page.tsx`, `components/navigation/public-header.tsx`, `components/navigation/public-footer.tsx`                                             |
| Public chef trust and profile proof           | `app/(public)/chef/[slug]/page.tsx`, `components/public/chef-proof-summary.tsx`, `components/public/review-showcase.tsx`                                  |
| Public inquiry and booking trust              | `app/(public)/book/page.tsx`, `app/(public)/book/_components/book-dinner-form.tsx`, `components/public/public-inquiry-form.tsx`, `app/book/[chefSlug]/**` |
| Public-to-operator continuity                 | `app/api/book/route.ts`, `lib/inquiries/public-actions.ts`, `lib/booking/match-chefs.ts`, `app/(public)/chef/[slug]/inquire/page.tsx`                     |
| Trust, contact, and support visibility        | `app/(public)/trust/page.tsx`, `app/(public)/contact/layout.tsx`, `app/(public)/contact/page.tsx`                                                         |
| Gift-card edge entry point                    | `app/(public)/chef/[slug]/gift-cards/page.tsx`, `app/(public)/chef/[slug]/page.tsx`                                                                       |
| Buyer education, FAQ, and comparison surfaces | `app/(public)/how-it-works/**`, `app/(public)/faq/page.tsx`, `app/(public)/compare/page.tsx`, `app/(public)/compare/[slug]/page.tsx`                      |
| Discover and segmented landing expansion      | `app/(public)/discover/**`, `app/(public)/chefs/**`, `app/sitemap.ts`                                                                                     |
| Consumer-first discovery and planning         | `app/(public)/discover/**`, `app/(public)/chefs/**`, `app/(public)/book/**`, `app/(public)/hub/g/[groupToken]/**`, `lib/public-consumer/**`               |
| Website-adjacent capture and source posture   | public forms plus any future source-tracking, response-promise, or "how we keep this organized" copy touching `/book`, inquiry, or contact flows          |
| Site-level proof and customer stories         | `app/(public)/customers/page.tsx`, homepage proof modules, public chef proof components                                                                   |

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
- Do not make website claims about capture coverage, response speed, or channel automation that the product has not actually verified.

---

## Verified vs Unverified

### Verified

- ChefFlow already has a meaningful public trust baseline in code.
- Verified public-proof and credentials specs already exist.
- Verified discover-state hardening already exists.
- Verified smart-input/autocomplete spec already exists for structured public intake.
- Ready allergy/dietary, directory post-claim, post-event trust-loop, and consumer-first expansion specs already exist.
- The competitor research is strong on public-surface behavior, conversion structure, content architecture, and positioning.
- The platform-intelligence research is strong enough to guide website promises around capture continuity, source tracking, and response expectations.

### Unverified or intentionally not assumed

- competitor authenticated interiors
- competitor internal metrics, CAC, LTV, churn, or staffing counts
- competitor private APIs, schemas, or exact cloud topology
- whether ChefFlow already has enough approved customer proof to power site-level freshness expansion
- the exact future scope of website-adjacent channel tracking or deep integrations
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
6. When does a website task need to pull in source-to-close or other website-adjacent platform context before code?

If those answers are clear, the builder has enough context to execute cleanly and in order.
