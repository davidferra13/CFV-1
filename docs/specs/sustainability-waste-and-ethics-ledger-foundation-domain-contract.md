# Sustainability Waste And Ethics Ledger Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-sustainability-waste-and-ethics-ledger-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Sustainability Waste And Ethics Ledger slices.

## Goal

Define the smallest compatible Sustainability Waste And Ethics Ledger contract without creating a duplicate waste, leftover, sourcing, vendor, client preference, event, public profile, evidence, or recommendation system. The contract composes current ChefFlow waste, leftover, sourcing, procurement, client preference, event, and public profile data into one chef-owned ledger for food waste, leftover plans, packaging, ethical sourcing, evidence-backed public claims, and safe waste-reduction recommendations.

## Fire-Time Inspection

Inspected existing waste, sourcing, leftover, client preference, and public-claim-adjacent files:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 12 thesis, domain model, swarm prompt, safety rule, public claim requirement, and acceptance criteria.
- `docs/specs/chef-capacity-twin-foundation-domain-contract.md`, `docs/specs/private-chef-financial-cockpit-foundation-domain-contract.md`, and `docs/specs/craft-evolution-lab-foundation-domain-contract.md`: nearest foundation contract patterns.
- `lib/events/waste-tracking-actions.ts`: event-scoped food waste actions over `event_waste_logs`; existing server actions call `requireChef()` and scope reads/writes by `tenant_id`.
- `components/events/waste-log-panel.tsx`: current event detail waste capture surface.
- `lib/inventory/waste-actions.ts`: inventory waste dashboard and event waste actions over `waste_logs`; existing server actions call `requireChef()` and scope by `chef_id`.
- `lib/waste/actions.ts` and `lib/waste/constants.ts`: deferred generic waste lane; must not be revived as a duplicate system without schema ownership.
- `lib/events/leftover-actions.ts`: event leftover packaging, labeling, and distribution actions over `event_leftovers`; existing server actions call `requireChef()` and scope by tenant owner.
- `components/clients/service-defaults-panel.tsx`: current client leftovers preference input.
- `lib/sustainability/sourcing-actions.ts` and `lib/sustainability/sourcing-constants.ts`: quality sourcing tracker over `sourcing_entries`; existing server actions call `requireChef()` and scope by `chef_id`.
- `components/dashboard/sourcing-widget.tsx`: current sourcing scorecard consumer.
- `lib/ingredients/sourcing-actions.ts` and `lib/ingredients/sourcing-types.ts`: ingredient vendor options, preferred vendor, purchase logs, event sourcing report, and seasonal availability.
- `lib/vendors/sourcing-actions.ts`: vendor call queue over saved and national vendors.
- `lib/dinner-circles/sourcing-actions.ts`: event sourcing status, substitution proposals, and client/circle response flow.
- `database/migrations/20260401000011_event_waste_logs.sql`, `20260312000003_food_cost_intelligence.sql`, `20260401000037_carbon_sourcing.sql`, `20260517100068_ingredient_sourcing.sql`, and `20260517300001_lifecycle_coverage_gaps.sql`: existing persistence lanes for event waste, inventory waste, sourcing entries, ingredient purchase logs, and event leftovers.
- `lib/discovery/source-policy.ts` and `lib/web-research/policy.ts`: existing public-claim and citation-policy precedent.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: required auth and route classification patterns for future routes/actions.

## No-Duplicate-System Decision

Do not add persistence, routes, APIs, server actions, or migrations in this foundation slice. The initial ledger is a synthesis contract over existing source systems:

- Event waste should start from `event_waste_logs` for event detail capture and from `waste_logs` for inventory/food-cost waste capture.
- Leftover plans should start from `event_leftovers` plus client service defaults such as `leftovers_preference`.
- Sourcing and ethics signals should start from `sourcing_entries`, ingredient purchase logs, ingredient vendor preferences, saved vendors, national vendors, event menus, recipes, and sourcing reports.
- Packaging facts should start from `event_leftovers.packaging_type`, post-event notes, sourcing entries, and future additive packaging records only if existing columns cannot express the fact.
- Public claims should start as evidence-gated DTOs over sourcing entries, vendor records, purchase logs, media, donation/compost receipts, and public profile systems. Unsupported claims must not reach public profile, discovery, website, client, or Remy public outputs.
- Recommendations should be deterministic and source-backed, not a second procurement, menu, PIE, vendor, event, or public-profile engine.

Later slices may add dedicated ledger tables only when existing storage cannot represent claim approval state, evidence review, packaging review, or recommendation lifecycle. Any new persistence must be additive, tenant-owned, RLS-protected, indexed by tenant/status/date/visibility, and must not replace existing waste, leftover, sourcing, vendor, ingredient, menu, event, client preference, or public profile systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/sustainability/sustainability-waste-ethics-ledger-contract.ts`.

It defines:

- `SustainabilityWasteEthicsLedgerContract`: tenant-owned private aggregate for waste events, leftover plans, preferences, sourcing claims, evidence, and recommendations.
- `WasteEventContract`: ingredient/dish/event waste facts with amount, cause, preventability, disposal path, safety state, cost, visibility, and source refs.
- `LeftoverPlanContract`: event leftover disposition plan with item-level packaging, labels, storage instructions, safety state, client preference ref, and client-safe summary.
- `SustainabilityPreferenceContract`: chef/client/event values that can inform planning but cannot override safety.
- `SourcingClaimContract`: local, organic, regenerative, fair-trade, foraged, seasonal, low-waste, composted, donated, reusable-packaging, humane, and reduced-food-miles claims with state, approval, evidence, expiry, and visibility.
- `ClaimEvidenceContract`: invoice, vendor record, certification, photo, event note, donation receipt, compost receipt, client approval, ingredient origin, and manual attestation evidence.
- `WasteReductionRecommendationContract`: source-backed menu, portion, procurement, packaging, leftover, donation/compost, and evidence-gap recommendations.
- `PublicSustainabilityClaimOutput`: filtered public profile output that includes only approved, evidenced, public claims.

States and helpers:

- `WastePreventabilityState`: `avoidable`, `partially_avoidable`, `unavoidable`, `unknown`.
- `LeftoverSafetyState`: `safe`, `needs_review`, `time_temperature_unknown`, `allergen_unknown`, `client_declined`, `safety_blocked`, `unknown`.
- `LeftoverDisposalPath`: `client_keeps`, `staff_meal`, `donation`, `compost`, `discard`, `return_to_vendor`, `safety_blocked`, `unknown`.
- `SourcingClaimState`: `draft`, `needs_evidence`, `ready_for_review`, `approved`, `published`, `rejected`, `expired`, `archived`.
- `SustainabilityVisibilityLevel`: `private_only`, `chef_internal`, `client_safe`, `public_candidate`, `public_profile`, `never_publish`.
- `WasteRecommendationState`: `candidate`, `accepted`, `dismissed`, `blocked_for_safety`, `implemented`, `archived`, `unknown`.
- `canUseLeftoverPath()`: blocks unsafe leftover and donation paths while allowing discard/compost for unknown or blocked safety states.
- `canPublishSustainabilityClaim()`: requires public visibility, approved or published state, evidence refs, and non-empty claim copy.
- `buildPublicSustainabilityClaimOutput()`: redacts private, unapproved, unevidenced, or empty claims.
- `deriveMostRestrictiveWasteRecommendationState()` and `isPrivateSustainabilityVisibility()`: lifecycle and visibility helpers.

## Ownership Boundaries

- Owning deterministic contract: `lib/sustainability`.
- Event-level waste ownership stays in `lib/events/waste-tracking-actions.ts`, event detail components, and `event_waste_logs`.
- Inventory/food-cost waste ownership stays in `lib/inventory/waste-actions.ts`, inventory waste components, and `waste_logs`.
- Leftover packaging and distribution ownership stays in `lib/events/leftover-actions.ts`, event departure/closeout surfaces, and `event_leftovers`.
- Quality sourcing ownership stays in `lib/sustainability/sourcing-actions.ts` and `sourcing_entries`.
- Ingredient/vendor sourcing ownership stays in `lib/ingredients/sourcing-actions.ts`, `lib/vendors/sourcing-actions.ts`, ingredient purchase logs, vendor preferences, vendors, and event sourcing reports.
- Dinner Circles sourcing ownership stays in `lib/dinner-circles/sourcing-actions.ts`; the ledger may consume sourced status and substitutions but must not own circle communication state.
- Client sustainability values remain client/service default facts until promoted into a tenant-owned preference contract.
- Public profile, discovery, showcase, media, and Remy public output may consume only safe DTOs such as `PublicSustainabilityClaimOutput`.

The ledger is a synthesis, evidence, safety, and visibility layer. It may read and summarize existing systems, but it must not become a second waste log, leftover tracker, sourcing tracker, vendor database, event system, client preference system, public profile editor, or recommendation engine disconnected from source evidence.

## Visibility And Privacy Rules

- Default visibility is `private_only`.
- Private facts include raw waste costs, overproduction mistakes, rejected quality notes, client-specific dietary values, client-specific leftover preferences, vendor trust concerns, failed sustainability attempts, private sourcing notes, and unsupported claims.
- `chef_internal` may appear only on authenticated chef routes and chef-mode Remy context.
- `client_safe` may include only scoped leftover instructions, approved value preferences, and operationally safe alternatives for that client/event.
- `public_candidate` is not public. It marks a claim being reviewed for evidence and approval.
- `public_profile` requires approval, evidence refs, non-empty public copy, and source rights.
- `never_publish` must never be emitted to public profile, website, discovery, client, staff, vendor, partner, or public Remy surfaces.
- Public sustainability claims must use `PublicSustainabilityClaimOutput` or an equivalent safe DTO.

## Role Boundaries

- Chef: can read and manage private waste, leftover, preference, evidence, recommendation, and public-claim review state.
- Client: can receive only client-safe leftover instructions, client-specific value acknowledgements, and approved event-specific sustainability summaries. Client values can inform planning but cannot override safety.
- Public anonymous user: can see only approved, evidenced, non-expired public claims.
- Staff/vendor/partner: no default raw ledger access. Future access must be explicit, least-privilege, and limited to operational execution facts.
- Admin: no routine access to raw tenant sustainability data. Admin diagnostics must be `requireAdmin()` gated and should inspect system health, not tenant content.
- Developer/build agents: can edit this contract and later implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API route, server action, migration, or DB query.

All future chef-side Sustainability Waste And Ethics Ledger server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when the action is explicitly multi-role.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields, route params, client-submitted tenant ids, slugs, or tokens alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `event_id`, `client_id`, `ingredient_id`, `vendor_id`, `menu_id`, `recipe_id`, `waste_log_id`, `leftover_id`, `sourcing_entry_id`, `purchase_log_id`, `media_asset_id`, `claim_id`, and `evidence_id` belong to the same tenant before reading, writing, linking, recommending, approving, or publishing.
- Treat route params such as `params.eventId`, `params.clientId`, `params.claimId`, or `params.evidenceId` as selectors only after tenant ownership is proven.
- Revalidate only affected chef routes such as `/events/[id]`, `/inventory/waste`, `/inventory/procurement`, `/dashboard`, `/clients/[id]`, public profile settings routes, and future ledger routes.

All future public/client APIs must:

- Avoid raw private ledger reads.
- Return only explicit safe DTOs such as `PublicSustainabilityClaimOutput` or event-scoped client-safe leftover summaries.
- Require approved claim state, public visibility, evidence refs, non-empty public copy, and unexpired evidence before publication.
- Avoid exposing tenant ids, client ids, private notes, unsupported claims, raw waste costs, vendor trust concerns, evidence rows that disclose private data, or rejected recommendations.
- Never rely on UI hiding as the security boundary.

When future routes are added, register them in `lib/auth/route-policy.ts` under the correct chef, client, staff, partner, admin, or public bucket.

## Integration Points

- Waste events: compose event waste logs, inventory waste logs, event financial summaries, event plans, menus, recipes, ingredients, and post-event notes before adding new persistence.
- Leftover plans: compose `event_leftovers`, client leftovers preferences, cleanup expectations, event closeout, dietary/allergen facts, packaging, labels, and storage instructions.
- Sustainability preferences: compose chef defaults, client service defaults, event requirements, dietary respect, packaging expectations, donation/compost preferences, and explicit safety blockers.
- Sourcing claims: compose sourcing entries, ingredient purchase logs, vendor records, vendor policies, ingredient preferences, seasonality data, event sourcing reports, media/evidence, and public profile review.
- Claim evidence: attach source refs, confidence, expiry, and visibility to every public-facing claim. Manual attestation is weak evidence unless corroborated.
- Recommendations: derive from repeated overproduction, repeated spoilage, no-shows, high waste-to-food-cost ratio, packaging issues, unsafe leftover paths, sourcing data gaps, claim evidence gaps, and client preference conflicts.
- Public claim approval: hold claims at `public_candidate` or `needs_evidence` until evidence and chef approval are present.
- Remy: chef mode may summarize private ledger signals; client/public mode may only emit client-safe leftovers or approved public claims.
- PIE/menu planning/vendor trust: later slices may feed waste and sourcing patterns into planning, pricing, and vendor choices, but source ownership stays in those modules.

## Safety Rules

- Safety beats preference. A chef, client, or public value preference cannot force donation, staff meal, client takeaway, reuse, or compost when the safety state blocks it.
- Unknown time/temperature, allergen, storage, labeling, or chain-of-custody state must block donation, client-keeps, and staff-meal recommendations.
- Unknown safety may still recommend discard or compost when local rules allow it, but must not frame the action as edible recovery.
- Public claims cannot be inferred from private notes alone. Evidence and approval are mandatory.
- Expired evidence must downgrade the claim to `needs_evidence` or `expired` before any public output.

## Likely Files For Later Slices

- Contract and deterministic filtering: `lib/sustainability/sustainability-waste-ethics-ledger-contract.ts`, future `lib/sustainability/sustainability-waste-ethics-ledger.ts`.
- Future chef actions: future `lib/sustainability/waste-ethics-ledger-actions.ts` or scoped additions to existing waste/sourcing actions after ownership is proven.
- Event waste input: `lib/events/waste-tracking-actions.ts`, `components/events/waste-log-panel.tsx`, event detail routes/components.
- Inventory waste input: `lib/inventory/waste-actions.ts`, inventory waste route/components.
- Leftover input: `lib/events/leftover-actions.ts`, departure/closeout components, client service defaults.
- Sourcing input: `lib/sustainability/sourcing-actions.ts`, `lib/ingredients/sourcing-actions.ts`, `lib/vendors/sourcing-actions.ts`, `lib/dinner-circles/sourcing-actions.ts`.
- Public-safe output: public profile, discovery, showcase, media, review/testimonial, and Remy output filtering modules.
- Security registration: `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, route/API files added by later slices.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 12 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing event waste, inventory waste, event leftovers, sourcing entries, purchase logs, vendors, clients, menus, recipes, public profile, media, Remy, or discovery modules already satisfy the requested data need.
- If adding persistence, add `tenant_id` or `chef_id`, RLS, tenant/status/date/visibility indexes, source refs, evidence refs, approval fields, expiry fields, and explicit privacy comments.
- Confirm every server action starts with `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm linked route params and foreign keys are always paired with tenant ownership checks.
- Confirm every new page route is classified in `lib/auth/route-policy.ts`.
- Confirm client/public/staff/vendor outputs use only safe DTOs and never raw private ledger data.
- Test safety blocking, public claim filtering, evidence requirements, tenant isolation, route param tampering, mobile post-event capture, empty/error/loading states, and private-to-public leakage.

## Acceptance Mapping

- Domain objects: defined in `lib/sustainability/sustainability-waste-ethics-ledger-contract.ts`.
- States: preventability, leftover safety, disposal path, claim state, visibility, recommendation state, evidence kind, and claim kind are explicit.
- Ownership: this document assigns deterministic synthesis to `lib/sustainability` while preserving existing waste, leftover, sourcing, vendor, ingredient, event, client, public profile, media, and Remy ownership.
- Visibility: private-only, chef-internal, client-safe, public-candidate, public-profile, and never-publish boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-vendor-partner/admin/developer boundaries are explicit.
- Route/API/server-action implications: future actions require `requireChef()` or justified `requireAuth()`, tenant scoping via `user.entityId` or `user.tenantId!`, linked-record ownership checks, route-policy registration, and safe DTOs.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for this foundation slice.
