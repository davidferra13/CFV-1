# Website Build Cross-Reference and Builder Handoff

> **Date:** 2026-04-02
> **Status:** ready for builder context
> **Purpose:** unify the website-build research and active specs into one cross-reference so a builder can work on the public discovery, chef-profile, trust, booking, and planning path in the correct order without re-reading the entire research library.

---

## Executive Summary

ChefFlow already has real public website primitives:

- homepage search and category routing into chef discovery (`docs/app-complete-audit.md:1931-1934`)
- public chef profiles (`docs/app-complete-audit.md:1160-1164`)
- a live chef directory and broad food directory (`docs/app-complete-audit.md:1969-1972`)
- an existing booking flow that creates inquiries and draft events (`docs/app-complete-audit.md:1937-1952`)
- existing public and client hub flows for post-inquiry or shared planning behavior (`docs/app-complete-audit.md:1821-1837`)

The research converges on one website-level conclusion: the system is stronger at "find a chef and inquire" than "help me decide what I want, trust it quickly, share it, and move into planning without friction" (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:401-486`, `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md:422-468`).

The correct builder posture is therefore:

1. preserve the verified public proof and booking surfaces already in place (`docs/specs/featured-chef-public-proof-and-booking.md:1-5`, `docs/specs/public-chef-credentials-showcase.md:1-5`)
2. tighten trust and intake on the existing booking/inquiry path before widening the top-of-funnel (`docs/specs/p1-allergy-and-dietary-trust-alignment.md:1-5`)
3. then build the consumer-first discovery and planning layer on top of those existing surfaces (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:1-5`)

This document is not a replacement for the specs. It is the map that tells the builder which research matters, which specs govern the build, what is already true, and what order to execute in.

---

## Scope

This synthesis covers only the current website-build path:

- homepage and public navigation
- `/chefs`
- `/chef/[slug]`
- `/discover`
- `/book`
- public trust and inquiry surfaces
- public and client planning / hub handoff

It does **not** try to fold in unrelated research streams such as surveys, OpenClaw, charity, or other non-website work. The research library is broader by design, but this handoff is intentionally narrow and builder-usable (`docs/research/README.md:1-8`, `docs/research/README.md:50-55`).

---

## Current Verified System State

### Repo and builder reality

- The last recorded repo-wide baseline is green for `npm run typecheck:app` and `npm run build -- --no-lint`, but that verification lives on a dirty checkout, not a clean commit (`docs/build-state.md:18-29`).
- A strict builder following the launcher rules is expected to stop on `git status` under the current dirty-worktree condition, and should treat that as a workflow constraint rather than proof of a broken build (`docs/build-state.md:29`, `docs/research/current-builder-start-handoff-2026-04-02.md:11-24`, `docs/research/current-builder-start-handoff-2026-04-02.md:101-113`).

### Current public website surfaces

- The homepage currently sends buyers into chef search through a location + service-type search bar, service-category cards, and featured-chef cards (`docs/app-complete-audit.md:1931-1935`).
- Public chef profiles already exist and include bio, tags, service types, and tracked social links (`docs/app-complete-audit.md:1160-1164`).
- The public booking route already exists and is backed by a real booking API that matches chefs and creates inquiry + draft-event records (`docs/app-complete-audit.md:1937-1952`).
- Public hub routes already exist for shared group experiences, and client hub routes already exist for group planning and chef sharing (`docs/app-complete-audit.md:1821-1837`).

### Current upstream spec state

- `featured-chef-public-proof-and-booking.md` is already `verified` and should be treated as upstream truth for public chef proof + booking improvements (`docs/specs/featured-chef-public-proof-and-booking.md:1-5`).
- `public-chef-credentials-showcase.md` is already `verified` and should be treated as upstream truth for public credential visibility (`docs/specs/public-chef-credentials-showcase.md:1-5`).
- `p1-allergy-and-dietary-trust-alignment.md` is `ready` and has no dependencies, so it is available as a trust/intake hardening step before larger funnel expansion (`docs/specs/p1-allergy-and-dietary-trust-alignment.md:1-5`).
- `consumer-first-discovery-and-dinner-planning-expansion.md` is `ready`, depends on the featured-chef proof work and the live public discovery/booking/hub stack, and already contains a validated current-state section plus builder-facing constraints (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:1-5`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:84-176`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:462-660`).

---

## Canonical Source Set

Use this source set for the website-build path. Do not widen it unless the scope changes.

### Baseline and navigation context

1. `docs/build-state.md`
   - build truth and dirty-worktree caveat (`docs/build-state.md:18-29`)
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
   - how to interpret the dirty checkout without destructive cleanup (`docs/research/current-builder-start-handoff-2026-04-02.md:11-24`, `docs/research/current-builder-start-handoff-2026-04-02.md:101-113`, `docs/research/current-builder-start-handoff-2026-04-02.md:117-156`)
3. `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
   - system-level baseline and current repository state (`docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md:36-83`, `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md:369-416`)
4. `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`
   - where to read for product source, routes, business logic, and research material (`docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md:176-221`, `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md:314-323`)

### Current public-surface evidence

5. `docs/app-complete-audit.md`
   - current public route and behavior evidence for homepage, chef profile, booking, and hub (`docs/app-complete-audit.md:1160-1164`, `docs/app-complete-audit.md:1821-1837`, `docs/app-complete-audit.md:1931-1952`, `docs/app-complete-audit.md:1969-1972`)

### Competitive and website-improvement evidence

6. `docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md`
   - public competitor baseline and comparative synthesis (`docs/research/competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md:272-628`)
7. `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
   - ChefFlow-specific website recommendations and current alignment (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:401-486`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:486-536`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:936-955`)
8. `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`
   - what is already proven in the competitor thread and what not to redo (`docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:47-76`, `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:127-299`)

### Cross-persona interpretation

9. `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
   - cross-surface workflow patterns, builder order, and continuity logic (`docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md:431-639`)
10. `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`

- website-facing multi-persona refinement for visual discovery, structure, planning, and durable shortlist state (`docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md:422-468`)

### Governing specs

11. `docs/specs/featured-chef-public-proof-and-booking.md`
12. `docs/specs/public-chef-credentials-showcase.md`
13. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
14. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

---

## Recommended Read Order For A Builder

Read in this exact order:

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. this document
4. `docs/app-complete-audit.md` for current website surfaces
5. `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md`
6. `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
7. `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md`
8. `docs/specs/featured-chef-public-proof-and-booking.md`
9. `docs/specs/public-chef-credentials-showcase.md`
10. `docs/specs/p1-allergy-and-dietary-trust-alignment.md`
11. `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md`

Reason: this order moves from current build truth -> current route truth -> external market truth -> cross-persona interpretation -> governing build instructions. It prevents the builder from starting inside a spec without understanding the public surfaces or the dirty-worktree constraint first (`docs/specs/README.md:34`, `docs/research/current-builder-start-handoff-2026-04-02.md:117-156`).

---

## Cross-Reference Matrix

| Website Area                | What is verified in ChefFlow now                                                                                                                                                                                                                         | What the research says                                                                                                                                                                                                                                                                                                                                                | Build implication                                                                                                                              | Governing doc                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Homepage and entry intent   | Homepage routes buyers into `/chefs` via location/service search, service categories, and featured chefs; operator CTA still shares the same surface (`docs/app-complete-audit.md:1931-1935`)                                                            | Buyer-facing websites should behave like guided trust funnels with stronger consumer CTA continuity and cleaner operator separation (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:367-486`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:755-886`)                            | Preserve the current routes, but strengthen one primary consumer path and reduce mixed-audience confusion before or alongside funnel expansion | improvement-opportunities memo + consumer-first spec            |
| Public chef discovery       | `/chefs` is already a real public directory entry point and homepage cards already route into public chef pages (`docs/app-complete-audit.md:1931-1934`, `docs/app-complete-audit.md:1970`)                                                              | Public profile quality, proof density, and menu/menu-like evidence are conversion surfaces, not optional marketing extras (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:164-178`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:430-474`)                                      | Do not rebuild the directory from scratch. Extend it with stronger trust and menu-aware presentation                                           | featured-chef proof spec, credentials spec, consumer-first spec |
| Public chef profile         | `/chef/[slug]` already exists with profile header, social links, bio, cuisines, and service types (`docs/app-complete-audit.md:1160-1164`)                                                                                                               | Buyers need richer proof, sample-menu confidence, and clearer trust cues before inquiry (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:430-474`, `docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md:241-252`)                                                       | Treat public chef pages as the canonical trust page and extend them additively, not as a marketing shell                                       | featured-chef proof spec, credentials spec, consumer-first spec |
| Broad discovery             | `/discover` already exists as a broad food-directory entry point (`docs/app-complete-audit.md:1971`)                                                                                                                                                     | Consumers discover visually first and often struggle because menus, photos, price shape, and fit are fragmented across surfaces (`docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md:96-168`)                                                                                                                   | Keep `/discover`, but make it part of a broader consumer-intent layer rather than a dead-end sibling surface                                   | consumer-first spec                                             |
| Booking and inquiry trust   | `/book` is already live and `POST /api/book` already creates inquiry + draft-event records (`docs/app-complete-audit.md:1937-1952`)                                                                                                                      | Structured intake, trust visibility, and clarity around change/cancellation/dietary handling should happen before or during inquiry, not after trust collapses (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:118-150`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:414-457`) | Harden the current intake and trust surfaces before widening the top-of-funnel so the new traffic lands on stronger semantics                  | allergy and dietary trust spec                                  |
| Planning and social handoff | Public and client hub routes already exist, including shared group, join, profile, plan-a-dinner, and share-a-chef flows (`docs/app-complete-audit.md:1821-1837`)                                                                                        | Group planning exists, but most products split discovery from collaborative shortlisting; durable planning context is missing in many systems (`docs/research/multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md:436-468`)                                                                                                    | Reuse hub as the planning container instead of creating a second collaboration system                                                          | consumer-first spec                                             |
| Surface continuity          | The public website already has the core routes it needs: `/book`, `/chefs`, `/discover`, public chef profiles, and hub surfaces (`docs/app-complete-audit.md:1160-1164`, `docs/app-complete-audit.md:1821-1837`, `docs/app-complete-audit.md:1931-1972`) | Buyers trust continuity more than feature count, and progressive intake beats front-loaded intake (`docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md:446-464`, `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md:511-639`)                                                                                      | Compose existing surfaces into one clearer path. Do not add disconnected feature islands                                                       | cross-persona memo + consumer-first spec                        |

---

## What Is Already Done And Should Not Be Rebuilt

Treat these as upstream truth unless a regression is found:

- public chef proof + booking upgrade is already verified (`docs/specs/featured-chef-public-proof-and-booking.md:1-5`)
- public chef credentials showcase is already verified (`docs/specs/public-chef-credentials-showcase.md:1-5`)
- competitor public-surface baseline is already done; the gap-closure handoff explicitly says not to restart that work from scratch (`docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:47-76`)
- current public route inventory is already captured in `docs/app-complete-audit.md` for chef profiles, booking, and hub (`docs/app-complete-audit.md:1160-1164`, `docs/app-complete-audit.md:1821-1837`, `docs/app-complete-audit.md:1937-1952`)

---

## Recommended Implementation Order

This is the most intelligent builder sequence for the current website path.

### Phase 0. Respect the current builder constraints

1. Read `docs/build-state.md`
2. Read `docs/research/current-builder-start-handoff-2026-04-02.md`
3. Stop on `git status` if the launcher requires it; do not clean the tree destructively (`docs/research/current-builder-start-handoff-2026-04-02.md:101-113`, `docs/research/current-builder-start-handoff-2026-04-02.md:146-156`)

### Phase 1. Preserve the verified public-proof baseline

Treat the existing public chef proof + credential work as upstream and confirm those surfaces are not being silently regressed by later work (`docs/specs/featured-chef-public-proof-and-booking.md:1-5`, `docs/specs/public-chef-credentials-showcase.md:1-5`).

### Phase 2. Harden trust and structured intake on existing booking surfaces

Build `p1-allergy-and-dietary-trust-alignment.md` before widening discovery. Reason:

- it is `ready` and has no dependencies (`docs/specs/p1-allergy-and-dietary-trust-alignment.md:1-5`)
- it strengthens the trust semantics of the existing booking/inquiry path
- competitive and website research both say structured intake and trust visibility must appear earlier, not later (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:414-457`)

### Phase 3. Build the consumer-first discovery and planning layer

Then build `consumer-first-discovery-and-dinner-planning-expansion.md`, which already assumes the public proof stack is present and reuses `/discover`, `/chefs`, `/book`, and hub rather than replacing them (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:1-5`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:475-660`).

### Phase 4. Verify cross-surface continuity

After implementation, verify:

- homepage -> discovery path
- `/eat` or other new discovery entry -> public chef profile
- public chef profile -> inquiry/booking
- discovery/planning -> hub
- hub/planning -> booking handoff

That continuity requirement is consistent with the cross-persona research and the active consumer-first spec (`docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md:511-639`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:446-660`).

---

## What Must Not Be Changed

- Do not replace `/discover`, `/chefs`, or `/book`; the current strategy is additive (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:475-486`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:587-596`).
- Do not introduce a second booking write path; existing booking/inquiry semantics stay canonical (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:310-327`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:587-596`).
- Do not create a second collaboration or social model; planning should reuse hub (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:310-327`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:587-596`).
- Do not expose non-showcase menus, private recipes, cost data, or internal notes on the public website (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:287-306`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:425-443`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:587-596`).
- Do not silently widen the scope into procurement, approvals, invoices, surveys, OpenClaw, or unrelated dirty-worktree streams (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:587-596`, `docs/research/current-builder-start-handoff-2026-04-02.md:146-156`).

---

## Verified Vs Unverified

### Verified

- The public website already has the core routes and handoff surfaces needed for the next phase (`docs/app-complete-audit.md:1160-1164`, `docs/app-complete-audit.md:1821-1837`, `docs/app-complete-audit.md:1931-1972`)
- The public chef proof and credentials specs are already upstream verified (`docs/specs/featured-chef-public-proof-and-booking.md:1-5`, `docs/specs/public-chef-credentials-showcase.md:1-5`)
- The current consumer-first spec already formalizes current-state evidence, dependencies, build order, and non-negotiable constraints (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:84-176`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:462-660`)

### Unverified or explicitly incomplete

- live density of showcase menu/package data across chefs is not runtime-verified in this session (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:488-498`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:660-666`)
- accessibility quality has not been screen-reader audited in this session (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:488-498`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:660-666`)
- real work/corporate intent mix is supported by research, but not quantified from ChefFlow runtime data (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:488-498`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:660-666`)
- competitor operator-side internals remain partially unresolved; the gap-closure handoff already defines the right future research order, but those unknowns are not blockers for current website work (`docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:78-123`, `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md:127-299`)

---

## Builder Deliverable From This Handoff

After reading this document, the builder should be able to answer:

1. what public website surfaces already exist
2. which research documents actually matter for the current website-build path
3. which specs are already upstream truth
4. what order the remaining website work should follow
5. what not to touch while implementing

If the builder cannot answer those five questions, they have not read the right documents yet.

---

## Final Read

The website does not need a new product identity. It needs a cleaner cross-surface path:

- stronger trust and intake on the current booking path
- a more consumer-native discovery layer on top of the current routes
- richer public chef proof and sample-menu confidence
- a planning handoff that reuses hub instead of inventing a second system

This is the narrow, dependency-aware build story the current research supports.
