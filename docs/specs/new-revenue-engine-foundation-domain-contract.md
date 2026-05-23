# New Revenue Engine Foundation Domain Contract

Date: 2026-05-21

Program queue item: `BQ-20260520T183000Z-chef-life-new-revenue-engine-program`

Foundation queue item: `BQ-20260520T183100Z-chef-life-new-revenue-engine-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later New Revenue Engine slices.

## Goal

Define the smallest compatible New Revenue Engine contract without creating a duplicate commerce, menu, retainer, meal prep, gift card, loyalty, public profile, communication, pricing, or capacity system. The contract composes existing ChefFlow revenue surfaces into one chef-owned offer strategy, launch, economics, audience-fit, and public promotion model that later slices can implement.

## Fire-Time Inspection

Inspected existing new-revenue-adjacent files and modules:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 11 source thesis, domain model, swarm prompt, acceptance criteria, and shared cross-program architecture contracts.
- `lib/commerce/product-actions.ts`, `lib/commerce/promotion-actions.ts`, and `lib/commerce/promotion-engine.ts`: current product projection, promotion CRUD/evaluation, `requireChef()` pattern, `requirePro('commerce')`, and tenant scoping with `user.tenantId!`.
- `app/(chef)/commerce/products/*`, `app/(chef)/commerce/promotions/*`, `app/(public)/chef/[slug]/store/*`, and `app/api/v2/commerce/*`: existing product, store, promotion, checkout, and API surfaces that should remain commerce owners.
- `lib/menus/fixed-offering-types.ts`, `lib/menus/fixed-offering-actions.ts`, `app/(public)/chef/[slug]/page.tsx`, and `app/(public)/chef/[slug]/store/page.tsx`: current public menu/package offering and chef storefront lanes.
- `lib/retainers/actions.ts` and `app/(chef)/finance/retainers/*`: current recurring retainer source of truth, chef-gated server actions, and tenant-owned retainer reads/writes.
- `lib/meal-prep/program-actions.ts`, `lib/meal-prep/*`, and `app/(chef)/meal-prep/*`: current meal prep program, recurring service, delivery, batch, and status lanes.
- `lib/loyalty/voucher-actions.ts`, `lib/loyalty/actions.ts`, `lib/gifts/gift-certificate-actions.ts`, `lib/loyalty/gift-card-purchase-actions.ts`, `app/(chef)/clients/gift-cards/*`, and `app/(public)/gift-cards/page.tsx`: existing gift card, voucher, certificate, loyalty, and client incentive lanes.
- `lib/monetization/offers.ts`: platform-support offers; not a chef revenue-offer source of truth.
- `lib/pricing/*`, especially PIE and menu economics modules: existing price, cost, margin, and confidence inputs for offer economics.
- `lib/intelligence/chef-capacity-twin-contract.ts`, `lib/intelligence/chef-life-strategy-map-contract.ts`, `lib/intelligence/craft-evolution-lab-contract.ts`, and `lib/client-contribution/*`: adjacent private strategy, capacity, craft proof, and client portfolio signals that New Revenue Engine should consume rather than duplicate.
- `lib/profile/actions.ts`, `lib/showcase/*`, `components/settings/public-profile-settings.tsx`, `lib/discovery/*`, and public profile routes: current public identity, showcase, and discovery approval lanes.
- `lib/communication/*`, communication drafts, scheduled messages, and Remy approval guardrails: current outreach, spam-prevention, and approval surfaces.
- `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, and `lib/api/v2/middleware.ts`: current route, action, and API auth/tenant boundary patterns.

## No-Duplicate-System Decision

Do not add new persistence in this foundation slice. The initial New Revenue Engine is a synthesis contract over existing source systems:

- Classes and premium experiences start from `menu_offerings`, menus, tasting/menu package modules, craft proof, capacity, and public profile approvals.
- Retainers remain owned by `retainers` and finance retainer actions.
- Meal prep remains owned by `recurring_services`, `meal_prep_programs`, delivery, and batch modules.
- Products remain owned by `product_projections`, product checkout, inventory, pricing, and promotion modules.
- Gift cards remain owned by `client_incentives`, `gift_cards`, `gift_certificates`, loyalty, and gift-card checkout modules.
- Memberships start from loyalty, client incentives, billing/feature-gate concepts, and future explicitly tenant-owned membership tables only if the existing model cannot represent the offer.
- Content offers start from public profile, showcase, communications, and future explicit content product surfaces.
- Partnerships start from client contribution, communications, public profile proof, network/collaboration modules, and future partner contracts only when needed.
- Promotion remains a derived approval/read-model layer. Public display is not allowed until promotion copy is explicitly approved.

Later slices may add dedicated offer tables only if existing systems cannot represent launch state, audience fit, or cross-source offer strategy. Any new tables must be additive, tenant-owned, RLS-protected, indexed by tenant/status/kind, and must not replace existing commerce, retainer, meal prep, gift card, loyalty, public profile, or communication systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/commerce/new-revenue-engine-contract.ts`.

It defines:

- `NewRevenueOfferContract`: chef-owned offer strategy aggregate for classes, retainers, meal prep, products, gift cards, memberships, content, partnerships, and premium experiences.
- `OfferEconomicsContract`: price, known cost, estimated margin, capacity impact, fulfillment complexity, missing inputs, confidence, source refs, and chef-only visibility.
- `OfferAudienceFitContract`: audience segment, fit state, reasons, outreach permission state, visibility, and source refs.
- `OfferPromotionApprovalContract`: public promotion approval state, public copy, approval actor/time, expiry, visibility, and evidence source refs.
- `PublicOfferPromotionReadModel`: public-safe card projection that drops private, unapproved, paused, or economically incomplete offers.
- `ClientSafeOfferSummary`: redacted client-safe summary that never exposes private strategy or revenue-pressure reasons.

States and helpers:

- `OfferLaunchState`: `unknown`, `idea`, `validate`, `draft`, `ready_for_review`, `live`, `paused`, `retired`.
- `OfferVisibilityLevel`: `private_only`, `chef_internal`, `client_safe_summary`, `public_safe_summary`, `requires_approval`, `never_publish`.
- `deriveMostRestrictiveLaunchState()`: combines launch states for aggregate rollout decisions.
- `isPrivateOfferVisibility()` and `isPublicOfferVisibility()`: visibility guards.
- `canPublishOfferPromotion()`: requires `live` state, approved public copy, public-safe visibility, public audience permission, and complete economics.
- `buildPublicOfferPromotionReadModel()`: creates public-safe cards and redaction count.
- `buildClientSafeOfferSummary()`: exposes only client-safe/public-safe audience reasons.
- `getRequiredOfferSourceSystems()`: maps each offer kind to existing source systems to prevent duplicate ownership.

## Extracted Build Family

The umbrella program item coordinates this extracted New Revenue Engine family and should not be treated as an instruction to build every surface at once:

| Queue item                                                              | Slice                                           | Depends on          | Ownership                                                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `BQ-20260520T183000Z-chef-life-new-revenue-engine-program`              | Program architecture and swarm-ready build path | None                | Source preservation, family map, ownership boundaries, proof contract                                                                |
| `BQ-20260520T183100Z-chef-life-new-revenue-engine-foundation`           | Foundation/domain contract                      | Program             | `docs/specs/new-revenue-engine-foundation-domain-contract.md`, `lib/commerce/new-revenue-engine-contract.ts`, focused contract tests |
| `BQ-20260520T183100Z-chef-life-new-revenue-engine-surface`              | First chef-owned surface                        | Program, foundation | Future offer studio route/component, navigation entry, mobile states, chef read model                                                |
| `BQ-20260520T183100Z-chef-life-new-revenue-engine-decision-integration` | Decision integration                            | Program, foundation | Dashboard/event/client/quote/calendar/Remy/communications/rail/action-center prompts and derived DTOs                                |
| `BQ-20260520T183100Z-chef-life-new-revenue-engine-proof-security`       | Proof/security/regression pack                  | Program, foundation | Security tests, public/client/staff filtering checks, mobile/runtime/wiring proof requirements                                       |

The program item is complete when the source spec is preserved, the build family is linked, ownership and role/privacy rules are explicit, and later slices inherit auth, tenant, public-approval, and proof requirements. User-facing UI, server actions, public cards, outreach sending, or new persistence belong to the narrower fired slices above.

## Swarm-Ready Execution Path

Wave 0 - Program coordination:

- Preserve Program 11 in `docs/specs/chef-life-expansion-swarm-spec-pack.md` as the source of truth.
- Use this document as the current implementation contract and family map.
- Keep all New Revenue Engine work behind fired queue items with non-overlapping file ownership.

Wave 1 - Foundation/domain:

- Implement and test `lib/commerce/new-revenue-engine-contract.ts`.
- Reuse existing systems for classes, retainers, meal prep, products, gift cards, memberships, content, partnerships, pricing, capacity, public profile, discovery, communications, and client contribution.
- Do not add tables until a later slice proves existing source systems cannot represent launch state, audience fit, approval, or economics.

Wave 2 - Chef surface:

- Add the first chef-owned offer studio/read-model surface only after foundation is green.
- Gate server reads with `requireChef()` and derive tenant ownership from `user.entityId` or `user.tenantId!`.
- Include loading, empty, error, 390px, and 430px states before completion.

Wave 3 - Decision integration:

- Wire one high-leverage decision point first, such as dashboard action, quote review, client follow-up, or public-profile publishing review.
- Convert unknown price, cost, capacity, audience permission, and approval state into actionable prompts.
- Return client/public/staff-safe DTOs rather than private offer strategy records.

Wave 4 - Public promotion and outreach:

- Publish only offers where `canPublishOfferPromotion()` or an equivalent server-side guard passes.
- Require explicit approval, public-safe copy, complete economics, public-safe visibility, and allowed audience permissions.
- Keep outreach opt-in, policy, and Remy approval checks in the existing communications ownership lane.

Wave 5 - Proof/security:

- Test route guessing, param tampering, cross-tenant access, private fact leakage, public approval gates, missing-input blocking, empty/error states, and mobile regressions.
- Verify `http://localhost:3100` only for runtime-impacting slices.
- Keep a proof pack for each item before `finish-check`.

## Ownership Boundaries

- Owning domain for the deterministic contract: `lib/commerce`.
- Existing product, checkout, POS, and promotion ownership stays in `lib/commerce` and `app/(chef)/commerce/*`.
- Existing menu package/class/premium-experience ownership stays in menu/offering modules and public profile/storefront modules.
- Existing retainer ownership stays in `lib/retainers` and finance retainer routes.
- Existing meal prep ownership stays in `lib/meal-prep`, recurring service modules, and meal prep routes.
- Existing gift card, voucher, certificate, and loyalty ownership stays in `lib/loyalty`, `lib/gifts`, and related client/chef/public gift-card routes.
- Existing pricing and margin ownership stays in PIE, pricing, and menu economics modules.
- Existing capacity ownership stays in the Capacity Twin and scheduling/calendar modules.
- Existing public identity ownership stays in profile, showcase, discovery, and public profile modules.
- Existing outreach ownership stays in communications and Remy approval modules.

The New Revenue Engine is an offer orchestration and approval contract. It may read existing systems, but it must not become a second product catalog, second retainer ledger, second meal prep engine, second gift-card system, second loyalty engine, second public profile editor, second pricing engine, or second communication sender.

## Visibility Rules

- Default visibility is `private_only`.
- Offer strategy, revenue pressure, margin concerns, capacity constraints, client list selection, audience scoring, launch uncertainty, and draft copy are chef-only until explicitly approved.
- Public promotion requires `OfferPromotionApprovalContract.state === 'approved'`, non-empty public copy, `public_safe_summary` visibility, public audience permission, and complete economics.
- Client outreach may use only `ClientSafeOfferSummary` or equivalent safe DTOs.
- Public/client/staff surfaces may not infer private reasons such as slow season, cash pressure, client concentration, burnout, schedule strain, or private client names.
- Offer cards may show public-safe title, copy, price, and availability only when source facts are approved for publication.
- Retired, paused, draft, private, unapproved, expired, revoked, and economically incomplete offers must not render on public surfaces.

## Role Boundaries

- Chef: can create and manage private offer strategy, launch state, economics, audience fit, approval, and outreach plans.
- Client: may receive only client-safe invitation, availability, benefit, price, and scope information for offers they are allowed to see.
- Public anonymous user: may see only explicitly approved public offer cards on public profile, discovery, gift card, store, or service surfaces.
- Staff/vendor/partner: no default access to raw offer strategy or economics. Future access must be least-privilege and limited to fulfillment or approved partnership summaries.
- Admin: no routine access to tenant private offer strategy. Admin diagnostics must be `requireAdmin()`-gated and avoid raw private strategy by default.
- Developer/build agents: can edit this contract and future implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API route, server action, migration, or DB query.

All future chef-side New Revenue Engine server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when a justified multi-role action exists.
- Derive ownership from `user.entityId` or `user.tenantId!`, never a route param, slug, request body field, or client-submitted tenant id.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `offer_id`, `menu_offering_id`, `retainer_id`, `meal_prep_program_id`, `recurring_service_id`, `product_id`, `gift_card_id`, `incentive_id`, `promotion_id`, `client_id`, `message_id`, and `public_profile_asset_id` belong to the same tenant before using them.
- Check feature gates such as `requirePro('commerce')` where the existing owning module already requires it.
- Revalidate only affected chef routes such as `/commerce/products`, `/commerce/promotions`, `/finance/retainers`, `/meal-prep`, `/clients/gift-cards`, `/settings/public-profile`, `/dashboard`, and future offer studio routes.

All future public/client APIs must:

- Resolve an approved public slug/token first and query only the resolved chef/public object.
- Return only public-safe or client-safe DTOs.
- Avoid exposing tenant ids, private launch notes, private audience reasons, unapproved offer copy, margin/cost data, client lists, outreach strategy, or capacity reasons.
- Never rely on UI hiding as the security boundary.

If a future page route is added, register it in `lib/auth/route-policy.ts` under the correct public, chef, client, staff, partner, or admin array.

## Integration Points

- Classes: derive from menu offerings, tasting/class menu packages, calendar capacity, pricing, public profile proof, and promotion approval before public display.
- Retainers: compose `retainers`, retainer billing periods, finance revenue summaries, contract scope, client fit, and launch state without changing retainer ownership.
- Meal prep: compose `recurring_services`, `meal_prep_programs`, delivery capacity, menu rotation, container/deposit economics, and client-safe availability.
- Products: compose `product_projections`, checkout, inventory, tax class, modifiers, cost, PIE pricing, promotion codes, and storefront publishing.
- Gift cards: compose `client_incentives`, `gift_cards`, `gift_certificates`, loyalty redemptions, checkout, and public gift-card pages.
- Memberships: compose loyalty tiers, client incentives, billing/feature gates, recurring service fit, and explicit consent before adding any dedicated membership persistence.
- Content: compose public profile, showcase, media/assets, communication history, and explicit approved copy; do not publish draft/private creator notes.
- Partnerships: compose client contribution, network/collaboration records, partner communications, public proof, and approved partnership copy.
- Offer economics: use existing pricing, PIE, menu economics, product cost, retainer rate, meal prep delivery cost, gift-card liability, promotion discount, tax, and capacity inputs. Missing inputs must remain explicit.
- Launch states: use `idea`, `validate`, `draft`, `ready_for_review`, `live`, `paused`, `retired`, and `unknown` rather than boolean active flags alone.
- Public-approved promotion: only approved public copy reaches profile, discovery, store, services, gift-card, communications, or public rail surfaces.
- Outreach: client invitations must honor consent, client relationship context, communication channel policy, and Remy approval guardrails.
- Dashboard/rail: later UI may show an offer pipeline pulse, but it should derive from this contract and existing source systems.

## Unknown And Incomplete-State Rules

Unknowns are first-class:

- Missing price means public launch is blocked.
- Missing cost or margin means economics confidence is low and public launch is blocked until explicitly reviewed.
- Missing capacity impact means launch state cannot be treated as fully safe.
- Missing audience permission means outreach is `unknown` or `needs_consent`.
- Missing promotion approval means public display is blocked.
- Missing source ownership means the offer must remain private until a source system is assigned.

Later UI should show missing inputs as launch checklist items rather than silently publishing or pretending an offer is complete.

## Likely Files For Later Slices

- Contract and orchestration: `lib/commerce/new-revenue-engine-contract.ts`, future `lib/commerce/new-revenue-engine.ts`, future `lib/commerce/offer-studio-actions.ts`.
- Products/promotions: `lib/commerce/product-actions.ts`, `lib/commerce/promotion-actions.ts`, `lib/commerce/promotion-engine.ts`, `components/commerce/*`, `app/(chef)/commerce/*`, `app/api/v2/commerce/*`.
- Public store/profile: `app/(public)/chef/[slug]/*`, public store routes, public gift-card routes, discovery/profile components, showcase modules.
- Classes/packages/premium experiences: `lib/menus/fixed-offering-types.ts`, `lib/menus/fixed-offering-actions.ts`, menu/tasting/showcase modules.
- Retainers: `lib/retainers/actions.ts`, retainer components, finance retainer routes.
- Meal prep: `lib/meal-prep/*`, recurring service modules, meal prep routes and widgets.
- Gift cards/memberships: `lib/loyalty/*`, `lib/gifts/*`, gift-card purchase actions, client incentives, loyalty views, billing feature gate modules.
- Economics: PIE, pricing, menu economics, product cost sync, event/menu cost modules, finance summaries.
- Capacity: Capacity Twin, scheduling, calendar, operational load, dashboard sections.
- Outreach: communication drafts, scheduled messages, Remy approval guardrails, SMS/email policy.
- Future chef surfaces: offer studio, launch checklist, public promotion approval, client-safe outreach planner, dashboard offer pulse.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 11 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether an existing source system already owns the offer kind before adding tables or actions.
- If adding persistence, add `tenant_id` or `chef_id`, RLS, tenant/status/kind indexes, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant-data query scopes through `user.entityId` or `user.tenantId!`.
- Confirm every public/client output uses `PublicOfferPromotionReadModel`, `ClientSafeOfferSummary`, or equivalent safe DTOs.
- Confirm every public offer has explicit approval, source refs, complete economics, and non-private visibility.
- Confirm route registration in `lib/auth/route-policy.ts` when routes are added.
- Add tests for launch-state gating, public promotion approval, client-safe redaction, tenant isolation, source-system reuse, and missing-input blocking.

## Acceptance Mapping

- Domain objects: defined in `lib/commerce/new-revenue-engine-contract.ts`.
- States: offer kinds, launch states, visibility levels, audience fit states, outreach permission states, economics confidence, capacity impact, and promotion approval states are explicit.
- Ownership: this document assigns the New Revenue Engine contract to `lib/commerce` while preserving commerce, menus, retainers, meal prep, gift cards, loyalty, pricing, capacity, profile, discovery, and communication ownership.
- Visibility: private/default, chef-internal, client-safe, public-safe, approval-required, and never-publish boundaries are explicit.
- Build family link: the umbrella program, foundation, surface, decision-integration, and proof/security queue items are linked in the extracted build-family table.
- Swarm-ready build path: wave sequencing, file ownership lanes, auth/tenant gates, public approval gates, mobile proof, runtime proof, and finish-check expectations are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-vendor-partner/admin/developer boundaries are explicit.
- Route/API/server-action implications: future actions require `requireChef()` or justified `requireAuth()`, tenant scoping via `user.entityId` or `user.tenantId!`, linked-record ownership checks, route-policy registration, and safe DTOs.
- Fire-time inspection checklist: included above.
- No duplicate system: existing revenue, commerce, public profile, pricing, outreach, and capacity lanes remain authoritative for the foundation slice.
