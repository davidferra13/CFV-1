# Chef Capacity Twin Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-chef-capacity-twin-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Chef Capacity Twin slices.

## Goal

Define the smallest compatible Chef Capacity Twin contract without creating a duplicate scheduling system. The contract composes current ChefFlow capacity, calendar, scheduling, inquiry, quote, event, dashboard, and Remy surfaces into one private decision model that later slices can implement.

## Fire-Time Inspection

Inspected existing capacity and scheduling files:

- `lib/intelligence/capacity-ceiling.ts`: chef-only historical capacity ceiling from `events`, scoped by `tenant_id`.
- `lib/intelligence/operational-load.ts` and `lib/intelligence/operational-load-actions.ts`: deterministic load scoring from events, prep blocks, menus, staff, travel, shopping, and weather; action wrappers call `requireChef()`.
- `lib/scheduling/capacity-planning-actions.ts`: chef-only `chef_capacity_settings` reads/writes and date/week/month availability checks, scoped by `tenant_id`.
- `lib/scheduling/capacity-actions.ts`: legacy workload limits on `chefs`, scoped by chef id/tenant id.
- `lib/availability/rules-actions.ts`: chef-only `chef_scheduling_rules`, scoped by `tenant_id`.
- `lib/availability/actions.ts`: manual and event-auto availability blocks, scoped by `chef_id`.
- `lib/calendar/actions.ts`: unified chef calendar aggregator across events, prep blocks, calls, availability, waitlist, entries, and inquiries, scoped by `tenant_id` or `chef_id`.
- `app/book/[chefSlug]/availability/route.ts`: public availability API, no auth by design, resolves public chef slug then exposes only date-level availability.
- `lib/inquiries/actions.ts`: chef-only inquiry actions, existing `requireChef()` pattern and tenant ownership checks.
- `lib/quotes/actions.ts`: chef-only quote actions, existing `requireChef()` pattern and tenant ownership checks.
- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: source program and swarm prompt.
- `database/migrations/20260401000010_chef_capacity_planning.sql`, `20260322000012_capacity_protection.sql`, and `20260307000010_chef_scheduling_rules.sql`: existing persistence lanes.

## No-Duplicate-System Decision

Do not add a new persistence system in this foundation slice. The initial Chef Capacity Twin must treat existing storage as source inputs:

- `chef_capacity_settings`: operational time-block defaults, daily/weekly event limits, blocked days.
- `chefs`: legacy max weekly/monthly events, max consecutive days, minimum rest days, max hours, off-hours.
- `chef_scheduling_rules`: hard/soft scheduling rules, lead time, buffer days, preferred days.
- `events`: committed work, service date/time, guest count, service style, travel/shopping/reset fields, status.
- `event_prep_blocks`: prep load.
- `chef_availability_blocks`: manual and event-auto blocks.
- `scheduled_calls`: communication/admin load.
- `inquiries` and `quotes`: proposed work before commitment.

Later slices may add dedicated private tables only when the existing columns cannot express the needed private facts. If added, those tables must be additive, tenant-owned, RLS-protected, and must not replace the existing settings/rules tables.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/chef-capacity-twin-contract.ts`.

It defines:

- `CapacityProfileContract`: chef-owned private capacity profile assembled from existing settings/rules/legacy columns.
- `WorkloadEstimateContract`: explainable workload factors for events, inquiries, quotes, proposals, or calendar dates.
- `CapacityState`: `available`, `tight`, `overloaded`, `unsafe`, `recovery_required`, `unknown`.
- `PrivateCapacityConstraintContract`: private constraints such as injury, sleep debt, recovery need, caregiving window, travel strain, burnout risk, no-lift limits, cognitive load limits, rest days, medical appointments, blackouts, and weather sensitivity.
- `CapacityOverrideRecordContract`: chef-only override reason, expiry, previous state, subject, actor, and tenant.
- `ClientSafeCapacityAlternative`: date/scope/staffing/price/decline alternatives that disclose scheduling feasibility without exposing private causes.
- Helper functions for most-restrictive state derivation, private constraint checks, and client-safe state copy.

## Ownership Boundaries

- Owning domain: `lib/intelligence` for deterministic capacity state and workload contracts.
- Existing action owners remain in place: scheduling under `lib/scheduling`, availability under `lib/availability`, calendar under `lib/calendar`, inquiry under `lib/inquiries`, quotes under `lib/quotes`, event detail under `lib/events`.
- No public or client module owns private capacity data.
- Remy may consume a chef-only capacity summary, but client/public Remy responses may use only `ClientSafeCapacityAlternative` and `toClientSafeCapacityHeadline()`.
- UI surfaces may display state and safe alternatives; they must not infer or render private constraint records unless the route is chef-authenticated.

## Visibility Rules

- Default visibility is `private_only`.
- Private facts include health, injury, sleep, family/caregiving, burnout, recovery, medical, addiction-risk-adjacent, and no-lift/cognitive limits.
- Chef-authenticated surfaces may show private facts when needed for decision-making.
- Client/public/staff-lite surfaces may receive only date, scope, staffing, price, or decline alternatives.
- Public availability may expose `available`, `blocked`, or `unavailable` style date outcomes only, never private reasons.
- Client-safe copy must use operational language such as "earliest realistic date" or "different scope" rather than "injury", "sleep debt", "burnout", "family", or "recovery".

## Role Boundaries

- Chef: can read and manage private profile, private constraints, capacity warnings, and overrides.
- Client: can receive only client-safe alternatives and public-safe availability outcomes.
- Public anonymous user: can receive only public availability and booking page outcomes.
- Staff/partner/admin: no default private-capacity access. Any future access must be explicit, runtime-gated, and least-privilege.
- Developer/build agents: can edit the contract and future implementation only through fired queue/growth work.

## Server Action And DB Contract

All future Chef Capacity Twin server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when the action truly supports multiple authenticated roles.
- Use `user.tenantId!` or `user.entityId` as the tenant owner, never a route param as sole authority.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent owner check for the table.
- Verify linked `event_id`, `inquiry_id`, `quote_id`, `client_id`, and `calendar_entry_id` belong to the same tenant before using them in estimates or overrides.
- Revalidate only affected chef routes such as `/dashboard`, `/calendar`, `/inquiries`, `/quotes`, and event detail routes.

Public APIs may exist only for public-safe availability and must:

- Resolve a public slug or public token first.
- Query only data for the resolved chef id.
- Return safe date/scope outcomes without private constraint source details.
- Avoid exposing tenant ids, private notes, health/family/recovery facts, or override reasons.

## Integration Points

- Dashboard capacity strip: read a chef-only `CapacityDecisionContract` summary for the current week.
- Calendar capacity overlay: compose `getUnifiedCalendar()`, `getMonthCapacity()`, and future workload estimates into date-level state.
- Inquiry gate: before accepting or converting inquiry work, estimate impact from preferred/confirmed date, guest count, location, service expectations, and schedule request.
- Quote gate: before sending or accepting a quote, estimate impact from quote event/inquiry linkage, guest count, menu/proposal complexity, prep, travel, and staff plan.
- Event detail panel: show workload factors, unknown factors, private constraints, and override state for the event.
- Public availability and inquiry pages: continue exposing only public-safe date availability and client-safe alternatives.
- Remy: chef mode may explain private constraints; client/public mode may only use client-safe alternatives.

## Unknown-State Rules

Unknown workload factors are first-class, not silently treated as zero. Examples:

- Missing serve time: service/travel/loadout estimate is `unknown`.
- Missing menu: prep/menu-development estimate is `unknown`.
- Missing venue location: travel estimate is `unknown`.
- Missing guest count: service/staffing/loadout estimate is `unknown`.
- Missing staff plan: staff coordination estimate is `unknown`.

Unknowns can produce `unknown` or `tight` state depending on committed work already present. Later UI slices should render actionable missing inputs rather than fake precision.

## Override Rules

Overrides are chef-only, explicit, expirable, and private. They must record:

- tenant id and subject id/type,
- previous state,
- human reason,
- actor id,
- creation time,
- optional expiry,
- `private_only` visibility.

Overrides do not delete warnings. They allow a chef to proceed with an auditable reason.

## Likely Files For Later Slices

- Contract and estimation: `lib/intelligence/chef-capacity-twin-contract.ts`, future `lib/intelligence/chef-capacity-twin.ts`.
- Existing load inputs: `lib/intelligence/operational-load.ts`, `lib/intelligence/capacity-ceiling.ts`.
- Settings/rules inputs: `lib/scheduling/capacity-planning-actions.ts`, `lib/scheduling/capacity-actions.ts`, `lib/availability/rules-actions.ts`.
- Calendar input: `lib/calendar/actions.ts`.
- Gates: `lib/inquiries/actions.ts`, `lib/quotes/actions.ts`, relevant event transition/actions files.
- Chef surfaces: dashboard sections, calendar components, event detail sections, quote/inquiry components.
- Public-safe surfaces: `app/book/[chefSlug]/availability/route.ts`, public inquiry/profile components, Remy boundary code.

## Fire-Time Checklist For Later Build Slices

- Re-read the queue item and this foundation contract.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether `chef_capacity_settings`, `chefs` legacy capacity columns, or `chef_scheduling_rules` already satisfy the requested data need.
- If adding private persistence, add RLS, tenant ownership columns, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query has `tenant_id` or `chef_id` scoping from `user.tenantId!` or `user.entityId`.
- Confirm public/client outputs use only `ClientSafeCapacityAlternative` or equivalent safe DTOs.
- Add tests for state derivation, unknown factors, tenant isolation, and private-to-client filtering when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/chef-capacity-twin-contract.ts`.
- States: `CapacityState` and `CAPACITY_STATES`.
- Ownership: this document keeps ownership in `lib/intelligence` while composing existing scheduling, availability, calendar, inquiry, quote, and event modules.
- Visibility: private/default, chef-only, client-safe, and public-safe boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-partner-admin/developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage lanes remain authoritative for the foundation slice.
