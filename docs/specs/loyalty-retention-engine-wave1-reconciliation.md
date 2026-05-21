# Loyalty Retention Engine Wave 1 Reconciliation

Date: 2026-05-21
Queue item: BQ-20260520T174848Z-loyalty-retention-engine-reconciliation-and-foundation
Run: RUN-20260521T082803Z

## Fire-Time Matrix

| Spec or Area                                      | Current                | Built                                                                                                                                                                                                | Missing                                                                                                                                  | Stale or Duplicate Risk                                                                                                                    |
| ------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/specs/loyalty-program-perfection.md`        | Partly current roadmap | Points, tiers, rewards, raffles, vouchers, client rewards, chef dashboard, settings, backfill, invoice adjustments, trigger registry                                                                 | Action Bar Rewards shortcut, Deal of the Month / featured offer surface, full Dinner Circle loyalty loop, client milestone notifications | Roadmap says referral points are manual and client progress nudges missing; current code has automatic referral award and `NextRewardCard` |
| Phase 1 visibility and perks                      | Built                  | `components/loyalty/next-reward-card.tsx`, `components/loyalty/tier-perks-display.tsx`, settings editor, client rewards display                                                                      | Daily Action Bar still has no `/loyalty` Rewards shortcut                                                                                | Spec migration filename `20260401000123` is stale; actual migration is `20260401000126_loyalty_tier_perks.sql`                             |
| Phase 2 auto referrals and guest milestones       | Built                  | `lib/clients/referral-actions.ts` awards referral points on completed referral; `guest_milestones` are in event award and backfill paths                                                             | Guest-to-client Dinner Circle network bonus is not present as a distinct loop                                                            | Build note migration filename `20260401000124` is stale; actual migration is `20260415000005_loyalty_guest_milestones.sql`                 |
| Phase 3 SSE, base event points, presets, progress | Built                  | SSE broadcasts in loyalty actions/store, `base_points_per_event`, expanded default rewards in `lib/loyalty/actions.ts`, setup presets, milestone progress                                            | Store/API default rewards still seed a smaller catalog than `actions.ts`                                                                 | Duplicate config/reward logic in `lib/loyalty/actions.ts` and `lib/loyalty/store.ts` can drift                                             |
| Loyalty trigger expansion                         | Mostly built           | `lib/loyalty/trigger-registry.ts`, `lib/loyalty/triggers.ts`, `trigger_config`, fire callsites for RSVP, review, chat, payment, tip, profile, feedback, menu approval, hub actions, quote acceptance | Trigger health/observability and admin-facing trigger failure diagnostics are thin                                                       | Some roadmap language treats RSVP points as missing; trigger-based RSVP points now exist through `fireTrigger('rsvp_collected')`           |
| Client experience spec                            | Built                  | SSE toast, live balance, quest board, mobile Rewards tab                                                                                                                                             | No push notifications or sound effects, as deferred                                                                                      | No stale implementation issue found                                                                                                        |
| Commerce promotions                               | Separate system        | `/commerce/promotions`, `lib/commerce/promotion-engine.ts`, API v2 promotions route                                                                                                                  | No client-facing monthly deal/featured offer bridge into `/my-rewards`                                                                   | Do not merge commerce promotions into loyalty rewards without a thin display/eligibility bridge                                            |
| Vouchers / gift cards / incentives                | Built                  | `lib/loyalty/voucher-actions.ts`, public gift card purchase flow, client gift card pages, incentive redemption                                                                                       | Public lookup and purchase surfaces need explicit proof in future waves                                                                  | Public gift certificate lookup is code-only by design; document risk before expanding                                                      |
| Referrals                                         | Built                  | Chef referral panel, client referrals page, automatic award on completed referral                                                                                                                    | Referral attribution from every guest/signup source is not fully unified                                                                 | Client referral read paths needed tenant scoping; fixed in this wave                                                                       |
| Routes and navigation                             | Mostly built           | Chef `/loyalty` and subroutes; client `/my-rewards`, `/my-referrals`, `/my-gift-cards`; public gift-card routes                                                                                      | `actionBarItems` lacks Rewards after Store Prices because Store Prices is not in the current Action Bar array                            | Loyalty exists both under `/loyalty` and `/clients/loyalty`; keep `/loyalty` as canonical chef module                                      |

## Migration Decision

No Wave 1 migration is needed. The inspected schema already has loyalty base tables plus `tier_perks`, `guest_milestones`, `base_points_per_event`, `trigger_config`, gift card/voucher, referral, and commerce promotion migrations.

Future migration needed for the roadmap featured offer slice:

- Add `loyalty_featured_offers` for Deal of the Month / featured offer if Wave 4 does not intentionally reuse commerce promotions as read-only source material.
- Keep it additive and tenant-scoped with `tenant_id`.
- Do not add `clients.loyalty_guests_served`; existing `clients.total_guests_served` is already the live field.

## Route, Nav, And Module Placement

Canonical chef module: `/loyalty`.

Supporting chef routes:

- `/loyalty/settings`, `/loyalty/rewards/new`, `/loyalty/raffle`, `/loyalty/learn`
- `/clients/loyalty`, `/clients/loyalty/points`, `/clients/loyalty/referrals`, `/clients/loyalty/rewards` stay as client-management secondary views
- `/clients/gift-cards` owns gift card and incentive management
- `/commerce/promotions` owns commerce promotions, not loyalty rewards

Client routes:

- `/my-rewards` owns points, rewards, quests, raffle, tier benefits, and future featured offer display
- `/my-referrals` owns client referral status
- `/my-gift-cards` owns received/purchased gift cards

Public routes:

- `/gift-cards`
- `/chef/[slug]/gift-cards`
- `/chef/[slug]/gift-cards/success`

Navigation decision:

- Add a future Action Bar item `{ href: '/loyalty', label: 'Rewards', icon: Gift }`.
- Place it after Money/finance or after a future Store Prices shortcut if Store Prices is reintroduced to Action Bar.
- Do not create a new module; loyalty remains its own canonical module with client and commerce bridges.

## Security And Tenant Inventory

Fixed in Wave 1:

- `lib/loyalty/actions.ts`: exported tenant-explicit server actions now call `requireChef()` and reject tenant mismatches.
- Internal event/invoice readers now use `lib/loyalty/store.ts` tenant-explicit helpers instead of ungated server-action exports.
- `lib/gift-cards/client-gift-card-actions.ts`: client gift-card reads now scope client and gift-card queries by tenant.
- `lib/referrals/client-referral-actions.ts`: client referral reads and stats now scope by tenant.

Current auth gates:

| Surface                                                 | Gate                                                                                        | Tenant Scope                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/loyalty/actions.ts` chef actions                   | `requireChef()`                                                                             | `.eq('tenant_id', user.tenantId!)`                                                            |
| `lib/loyalty/actions.ts` client actions                 | `requireClient()`                                                                           | client entity plus tenant/config lookup                                                       |
| `lib/loyalty/store.ts`                                  | API/internal tenant-explicit helper                                                         | caller passes verified `tenantId`; every DB query is tenant-scoped                            |
| `app/api/v2/loyalty/**`                                 | `withApiAuth`                                                                               | `ctx.tenantId`                                                                                |
| `app/api/scheduled/loyalty-expiry` and `rsvp-retention` | `verifyCronAuth`                                                                            | scheduled global maintenance; no user PII response                                            |
| `lib/loyalty/voucher-actions.ts`                        | `requireAuth()` for mixed chef/client create/list; `requireChef()` for chef-only management | resolved tenant plus `.eq('tenant_id', tenantId)`                                             |
| `lib/gifts/gift-certificate-actions.ts`                 | `requireChef()` except public lookup                                                        | chef actions tenant-scoped; public lookup returns limited fields                              |
| `lib/loyalty/gift-card-purchase-actions.ts`             | public purchase/session lookup by design                                                    | tenant validated on purchase; Stripe session id lookup is unguessable but should be monitored |
| `lib/clients/referral-actions.ts`                       | `requireChef()`                                                                             | `.eq('tenant_id', user.tenantId!)`                                                            |
| `lib/referrals/client-referral-actions.ts`              | `requireClient()`                                                                           | fixed with `.eq('tenant_id', user.tenantId!)`                                                 |

Remaining security watchpoints:

- Public gift certificate lookup is code-only and returns limited fields; do not expand returned fields without a token/tenant proof.
- `lib/loyalty/actions.ts` and `lib/loyalty/store.ts` still duplicate business logic. Future backend work should consolidate to store/core helpers so API and server-action behavior cannot drift.
- Store/API default reward seeding is stale compared with the richer action default catalog.

## Wave Ownership Boundaries

Wave 2, backend and data:

- Owns `lib/loyalty/store.ts`, `lib/loyalty/actions.ts`, `lib/loyalty/triggers.ts`, `lib/loyalty/trigger-registry.ts`, `lib/loyalty/auto-award.ts`, `lib/clients/referral-actions.ts`, `lib/sharing/actions.ts`, and loyalty migrations.
- Must not edit chef/client UI files in the same wave.

Wave 3, chef command center and nav:

- Owns `app/(chef)/loyalty/**`, `components/navigation/nav-config.tsx`, loyalty chef dashboard components, and `/clients/loyalty/**`.
- Must not edit backend award logic except typed imports.

Wave 4, client experience and offers:

- Owns `app/(client)/my-rewards/**`, `app/(client)/my-referrals/**`, `app/(client)/my-gift-cards/**`, `components/loyalty/**`, `components/referrals/**`, public gift-card display components, and any new featured offer display.
- Must not edit migrations or API routes unless the feature requires a narrow data contract.

Wave 5, integration hardening and proof:

- Owns focused tests, proof packs, route/browser verification, `scripts/wiring-audit-results.json`, and final queue lifecycle movement.
- Does not add product behavior except direct regression fixes found during proof.

## Chosen Implementation Slice

Wave 1 is now a reconciliation plus security foundation slice. The next safest build slice is Wave 2 backend consolidation: remove duplication between `actions.ts` and `store.ts`, align default rewards, add focused tests for tenant-gated wrappers, and prepare featured-offer data contracts without touching UI.

## Verification Plan For Later Waves

- Typecheck touched loyalty/referral/gift-card files.
- Test automatic referral award idempotency, event point idempotency, guest milestones, trigger fire idempotency, client gift-card tenant scoping, and client referral tenant scoping.
- Verify canonical routes at `http://localhost:3100`: `/loyalty`, `/loyalty/settings`, `/my-rewards`, `/my-referrals`, `/my-gift-cards`, `/commerce/promotions`.
- Run `/wiring-audit` after each wave and document affected domains.

## Wave 1 Verification Output

- `npm.cmd run typecheck:app`: PASS.
- `node scripts/wiring-audit.mjs`: PASS command exit. It extracted 954 routes, found 934 wired routes, 15 weak routes, 2 orphans, and 3 skipped routes. The orphans were pre-existing `/settings/fee-schedule` and `/my-hub/activity`.
- `npm.cmd run dev:verify`: blocked by sandbox/OS `spawn EPERM`.
- `node .agents/skills/build-queue/scripts/build-queue.mjs proof-pack ...`: blocked by `EPERM` creating `.agents/build-queue/.lifecycle.lock`.
- `node .agents/skills/build-queue/scripts/build-queue.mjs finish-check --skip-runtime ...`: failed because git status was unavailable to the script and the canonical proof pack could not be created under `.agents/build-queue/proof-packs/`.
