# Chef Life Strategy Map Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-chef-life-strategy-map-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Chef Life Strategy Map slices.

## Goal

Define the smallest compatible Chef Life Strategy Map contract without creating a duplicate goals, profile, client intelligence, finance, capacity, notes, or Remy system. The contract composes current ChefFlow data into a private long-range chef business and life strategy model that later slices can implement.

## Fire-Time Inspection

Inspected existing strategy-adjacent files and modules:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 10 source thesis, domain model, swarm prompt, and cross-program privacy contracts.
- `docs/specs/chef-capacity-twin-foundation-domain-contract.md` and `lib/intelligence/chef-capacity-twin-contract.ts`: closest matching foundation pattern and private-life boundary precedent.
- `lib/goals/types.ts`, `lib/goals/actions.ts`, `lib/goals/check-in-actions.ts`, `lib/goals/signal-fetchers.ts`, and `components/goals/*`: existing chef-owned goals, goal categories, check-ins, revenue enrichment, service mix planning, and life balance wheel.
- `app/(chef)/analytics/goals/*`: existing chef goals routes; pages call `requireChef()` through the goals action layer or page gate.
- `lib/client-contribution/actions.ts`, `lib/client-contribution/scoring.ts`, `lib/client-contribution/strategy.ts`, and `components/clients/client-contribution-panel.tsx`: current client portfolio, contribution, dependency, capacity-fit, referral, seasonality, and expectation-risk signals. Actions call `requireChef()` and scope reads/writes with `user.tenantId!`.
- `lib/intelligence/client-lifetime-journey.ts`, `client-intelligence-context.ts`, `inquiry-conversion-context.ts`, `pipeline-summary.ts`, `revenue-forecast.ts`, `capacity-ceiling.ts`, and `business-health-summary.ts`: deterministic intelligence sources that can provide strategy evidence without storing new private strategy facts.
- `lib/ai/remy-context.ts`: Remy chef context loader calls `requireChef()`, scopes tenant data with `tenantId`, and already aggregates profile, goals, client, event, finance, CIL, and pipeline context.
- `lib/remy/memory-consent-contracts.ts`: Remy memory proposals require confirmation and support redaction of private facts.
- `app/(chef)/settings/my-profile/*`, `app/(chef)/settings/public-profile/*`, `components/settings/public-profile-settings.tsx`, `lib/profile/actions.ts`, and `lib/discovery/*`: public/profile/discovery identity sources that must remain separate from private strategy unless facts are explicitly approved.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: route/action auth and role-boundary patterns for future implementation.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Strategy Map must treat existing systems as source inputs:

- `chef_goals`, `goal_snapshots`, and `goal_client_suggestions`: measurable goals, progress, goal categories, review history, and revenue-path suggestions.
- `chef_preferences`: category settings and private chef preferences where already present.
- `clients`, `events`, `inquiries`, `quotes`, `event_financial_summary`, and client contribution read models: current work, client mix, revenue concentration, relationship fit, and seasonality.
- `chefs`, public profile fields, discovery profile fields, and portfolio/showcase assets: public identity facts that are explicitly present today.
- `chef_capacity_settings`, scheduling rules, and the Capacity Twin contract: capacity boundaries and workload state when that program is implemented.
- `client_notes` and existing notes/ChefTips lanes: chef-only narrative memory where strategy review state can be referenced later.
- Remy context and memory contracts: private summaries and suggestion text, never direct public/client publication.

Later slices may add dedicated tables only if existing systems cannot represent private strategy capture. Any new tables must be additive, tenant-owned, RLS-protected, and must not replace goals, profile, client contribution, capacity, finance, or notes systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/chef-life-strategy-map-contract.ts`.

It defines:

- `LifeStrategyContract`: tenant-owned private long-range strategy aggregate.
- `StrategyGoalContract`: private goals across client mix, cuisine identity, income, capacity boundaries, family constraints, reputation, geography, new revenue, values, and exit/legacy.
- `StrategicConstraintContract`: private boundaries such as family, caregiving, geography, capacity, health, identity, faith, sobriety, travel, schedule, cash runway, and exit timeline.
- `ClientMixTargetContract`: desired and current portfolio mix targets.
- `StrategySignalContract`: alignment/misalignment signal for clients, inquiries, events, quotes, public profile, pricing, capacity, craft, and queue decisions.
- `StrategyReviewRitualContract`: monthly, quarterly, seasonal, annual, or ad hoc review prompts.
- `PrivateRemyStrategySummary`: chef-only Remy summary with explicit client redaction.
- `ClientSafeStrategySummary`: narrow external copy that may describe fit or timing without exposing family, identity, value, health, or legacy details.

States and helper functions:

- `StrategySignalState`: `aligned`, `neutral`, `misaligned`, `risky`, `unknown`.
- `StrategyReviewCadence`: `monthly`, `quarterly`, `seasonal`, `annual`, `ad_hoc`.
- `deriveMostRestrictiveStrategySignal()`: combines strategy states for a subject.
- `isPrivateStrategyVisibility()`: guards private and chef-internal visibility.
- `buildClientSafeStrategySummary()`: redacts private factors and exposes only client-safe reasons.

## Ownership Boundaries

- Owning domain for the deterministic contract: `lib/intelligence`.
- Existing goals ownership stays in `lib/goals` and `app/(chef)/analytics/goals`.
- Existing client-mix and portfolio-fit ownership stays in `lib/client-contribution` and client intelligence modules.
- Existing capacity ownership stays in the Capacity Twin contract and scheduling/calendar modules.
- Existing public identity ownership stays in profile, discovery, showcase, and public profile modules.
- Existing Remy ownership stays in `lib/ai/remy-context.ts`, `lib/remy/*`, and Remy API routes.
- No public, client, staff, or vendor module owns raw life strategy data.

The Strategy Map is a synthesis layer. It may read from existing systems, but it must not become a second goals engine, a second public profile editor, a second client scoring system, or a second capacity/finance source of truth.

## Visibility Rules

- Default visibility is `private_only`.
- Private facts include family constraints, caregiving windows, health/capacity limits, identity, faith, sobriety, values, exit planning, debt/cash pressure, burnout-adjacent concerns, and legacy notes.
- Chef-authenticated surfaces may display private strategy facts.
- Client/public/staff surfaces may receive only explicit `client_safe_summary` or `public_safe_summary` fields.
- Public profile and discovery can consume only already-approved public identity facts; they must not infer or publish private strategy goals.
- Remy chef mode may summarize private strategy for the chef. Remy client/public mode may not expose private factors and must use redacted summaries only.

## Role Boundaries

- Chef: can read and manage private strategy, goals, constraints, review cadence, signals, and private Remy summaries.
- Client: no access to private strategy. May receive only client-safe fit, timing, scope, or priority language.
- Public anonymous user: no access to private strategy. May see only explicitly approved public profile/discovery facts.
- Staff/vendor/partner: no default access to private strategy. Any future access must be explicit, role-scoped, and limited to operational summaries.
- Admin: no routine access to tenant private strategy. Admin tooling may inspect operational health only through admin-gated diagnostics, never raw strategy notes by default.
- Developer/build agents: can edit the contract and later implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API, server action, migration, or DB query.

All future Chef Life Strategy Map chef-side server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when a justified multi-role action exists.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `client_id`, `event_id`, `inquiry_id`, `quote_id`, `goal_id`, `profile_asset_id`, and `queue_item_id` belong to the same tenant before they influence strategy.
- Revalidate only affected chef routes such as `/goals`, `/dashboard`, `/clients`, `/clients/contribution`, `/settings/my-profile`, `/settings/public-profile`, and future Strategy Map routes.

All future public/client APIs must:

- Avoid raw private strategy reads.
- Return only explicit safe DTOs such as `ClientSafeStrategySummary`.
- Avoid exposing tenant ids, private notes, values/family/identity details, private Remy summaries, or strategy source refs.

## Integration Points

- Strategy goals: compose existing `chef_goals`, goal check-ins, goal snapshots, and category settings before adding new goal persistence.
- Personal constraints: read only chef-owned private inputs; later persistence must distinguish hard boundaries, soft boundaries, review-required items, and unknowns.
- Values and identity: stay private unless the chef explicitly turns a fact into public profile copy.
- Client mix targets: compare targets against client contribution portfolio, events, revenue summaries, referrals, recurring service state, and seasonality.
- Strategic fit signals: compute fit for clients, inquiries, events, quotes, pricing plans, public profile edits, capacity plans, and queue decisions with source refs and confidence.
- Seasonal review rituals: create review prompts from stale goals, seasonality, revenue progress, client mix drift, capacity state, reputation, and public identity changes.
- Private Remy summaries: allow Remy to synthesize chef-only strategy context with redaction counts and source refs. Never feed private summaries into public/client Remy responses.
- Dashboard pulse: later UI may show a compact private strategy pulse, but it should derive from the contract rather than introducing another dashboard system.
- Public profile guardrails: future profile recommendations may say a public bio no longer matches goals, but publishing remains explicit chef action.
- Queue governance: future build/queue decisions may attach strategic fit labels for developer use, but must not leak tenant facts into public docs or unrelated queue items.

## Unknown And Stale-State Rules

Unknowns are first-class:

- Missing strategy goals means strategic fit is `unknown`, not neutral.
- Missing client source or financial data means client mix confidence is low.
- Missing public identity facts means profile fit cannot be inferred.
- Missing capacity/craft/finance program data means those factors remain `unknown` until their source systems exist.
- Old strategy goals become stale rather than silently authoritative.

Later UI should display missing inputs and stale strategy dates as review prompts, not fake precision.

## Likely Files For Later Slices

- Contract and deterministic signal model: `lib/intelligence/chef-life-strategy-map-contract.ts`, future `lib/intelligence/chef-life-strategy-map.ts`.
- Goals inputs: `lib/goals/types.ts`, `lib/goals/actions.ts`, `lib/goals/signal-fetchers.ts`, `components/goals/*`, `app/(chef)/analytics/goals/*`.
- Client mix and fit inputs: `lib/client-contribution/*`, `components/clients/client-contribution-panel.tsx`, `app/(chef)/clients/contribution/*`, `lib/intelligence/client-intelligence-context.ts`.
- Capacity inputs: `lib/intelligence/chef-capacity-twin-contract.ts`, `lib/intelligence/capacity-ceiling.ts`, scheduling and calendar modules.
- Finance inputs: `lib/intelligence/revenue-forecast.ts`, `lib/intelligence/business-health-summary.ts`, finance reporting and event financial summary modules.
- Public identity inputs: profile, discovery, showcase, and public profile settings modules.
- Remy integration: `lib/ai/remy-context.ts`, `lib/remy/memory-consent-contracts.ts`, Remy guardrails and output filtering.
- Future chef surfaces: dashboard sections, future `/strategy` or `/goals/strategy` route, clients/inquiries/quotes strategic fit cards, public profile settings review cards.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 10 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing goals, client contribution, capacity, public profile, finance, notes, or Remy modules already satisfy the requested data need.
- If adding private persistence, add `tenant_id` or `chef_id`, RLS, indexes by tenant/status/review cadence, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm every route is registered in `lib/auth/route-policy.ts` when a page route is added.
- Confirm public/client/staff outputs use only safe summaries and never raw private strategy facts.
- Add tests for signal derivation, stale goals, unknown factors, tenant isolation, and private-to-client filtering when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/chef-life-strategy-map-contract.ts`.
- States: strategy signal states, review cadences, goal states, visibility levels, and constraint effects are explicit.
- Ownership: this document assigns Strategy Map to `lib/intelligence` as a synthesis contract while preserving goals, client contribution, capacity, public profile, Remy, and finance ownership.
- Visibility: private/default, chef-only, client-safe, and public-safe boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-vendor-partner/admin/developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.
