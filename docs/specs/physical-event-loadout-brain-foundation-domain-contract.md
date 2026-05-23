# Physical Event Loadout Brain Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-physical-event-loadout-brain-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Physical Event Loadout Brain slices.

## Goal

Define the smallest compatible Physical Event Loadout Brain contract without creating a duplicate inventory, venue, checklist, station, workflow, weather, or event execution system. The contract composes current ChefFlow menu, event, equipment, venue, packing, station, weather, staff, and checklist sources into one chef-owned execution model for menu-to-equipment-to-venue planning.

## Parent Program Coordination

Parent queue item: `BQ-20260520T183000Z-chef-life-physical-event-loadout-brain-program`.

This document now carries the parent program architecture and swarm-ready build path for Physical Event Loadout Brain. The parent source remains `docs/specs/chef-life-expansion-swarm-spec-pack.md`, Program 3 - Physical Event Loadout Brain; that source must not be overwritten by later slices. The program outcome is a chef-owned synthesis layer for equipment requirements, venue capabilities, pack states, station plans, staff-safe task exports, and service-day checklists.

Physical Event Loadout Brain is not a new inventory, venue profile, station planner, checklist engine, workflow engine, weather module, or staff portal. Later slices must reuse current modules first and add persistence only after proving existing storage cannot represent the required execution state.

## Linked Build Family

This umbrella program coordinates these narrower slices:

- `BQ-20260520T183100Z-chef-life-physical-event-loadout-brain-foundation`: this contract, typed domain model, ownership boundaries, privacy rules, route/API/server-action/DB implications, and no-duplicate-system decision.
- `BQ-20260520T183100Z-chef-life-physical-event-loadout-brain-surface`: first chef-owned surface for loadout requirements, venue capability risks, pack/checklist state, station plan, and staff-safe export review.
- `BQ-20260520T183100Z-chef-life-physical-event-loadout-brain-decision-integration`: dashboard, event, client, quote, calendar, Remy, rail, communication, or action-center integration where loadout output changes a decision, warning, next action, or safe alternative.
- `BQ-20260520T183100Z-chef-life-physical-event-loadout-brain-proof-security`: route guessing, param tampering, frontend-only security, cross-tenant leakage, private-fact leakage, empty/error states, mobile proof, runtime proof, wiring proof, and finish-check readiness.

Adjacent Chef Life primitives must be reused instead of forked when present: physical operations primitive registry, event readiness bus, mobile field capture shell, staff trust/delegation, role-safe read models, safe briefing composer, source confidence/freshness, unknown-first decision state, and Remy sensitive boundary broker.

## Explicit Multi-Wave Plan

Lead rule: one lead owns dependency order, shared-file merges, proof packs, finish-check, and lifecycle moves. Workers may only edit files in their assigned lane and must not revert existing dirty work.

Wave 0 - Lead preflight and ownership:

- Re-read the parent program item, Program 3 in the swarm spec, and this contract.
- Refresh `git status --short`; classify dirty files as preexisting, owned-by-run, generated, queue-system, or unknown.
- Confirm canonical runtime target `http://localhost:3100` before any runtime-impacting slice.
- Confirm no dependent slice starts by adding duplicate inventory, venue, station, checklist, workflow, weather, or staff task persistence.

Wave 1 - Foundation/data/security lane:

- Owned files: `docs/specs/physical-event-loadout-brain-foundation-domain-contract.md`, `lib/intelligence/physical-event-loadout-brain-contract.ts`, `tests/unit/physical-event-loadout-brain-contract.test.ts`.
- Define and test equipment requirement, venue capability, pack state, station plan, staff-safe task export, service-day checklist, readiness, visibility, source refs, and unknown-state rules.
- Preserve existing systems as authoritative sources.

Wave 2 - Read model and derivation lane:

- Likely owned file: future `lib/intelligence/physical-event-loadout-brain.ts`; existing event/menu/equipment/venue/station/checklist/weather helpers stay in their owning modules unless a narrow adapter is required.
- Derive real event loadout plans from existing event/menu/location data.
- Treat missing venue, guest count, recipe/menu, station, weather, ownership, rental, or return-home facts as explicit unknowns or risks.
- If persistence is required, add only additive tenant-owned tables with RLS and indexes after proving existing storage cannot represent the needed state.

Wave 3 - Chef surface lane:

- Likely owned files: event-detail loadout panel or tab, dashboard prep card, station/loadout components, and route registration only if a new page route is created.
- Show equipment requirements, venue capability risks, pack/checklist state, station plan, staff-safe export preview, and mobile packing mode.
- Include empty, loading, error, mobile, accessibility, and privacy states.
- Verify 390px and 430px widths without horizontal overflow, clipped controls, or overlapping text.

Wave 4 - Staff/client/Remy safe output lane:

- Staff/vendor output must be assignment scoped and may return only staff-safe task DTOs.
- Client/public output must be explicit client-safe summary copy only.
- Remy chef mode may explain private loadout risks; Remy client/public/staff modes must use safe DTOs or client-safe summaries.
- No staff/vendor/client surface may expose private client memory, household details, pricing, full inventory, access details, internal inventory gaps, or private notes.

Wave 5 - Decision integration lane:

- Wire readiness signals into the highest-leverage event/dashboard/quote/calendar/rail/action-center workflow.
- Unknowns must become prompts or next actions, not silent blanks.
- Rental pickup, vendor handoff, damaged/missing equipment, and return-home follow-up should route through existing workflow, equipment, event, communication, or checklist owners.

Wave 6 - Proof/security/hardening lane:

- Test tenant scoping, staff scoped access, pack-state transitions, missing-equipment warnings, unknown venue data, mobile checklist usability, route guessing, param tampering, public/client non-access, and private-fact leakage.
- Verify runtime-impacting work at `http://localhost:3100` with route proof, console/network/server-log checks, and mobile proof.
- Produce proof packs before finish-check and do not move slices to done with partial runtime or security proof.

## Fire-Time Inspection

Inspected existing loadout-adjacent files and modules:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 3 source thesis, domain model, swarm prompt, and acceptance criteria.
- `lib/equipment/packing-list-types.ts` and `lib/equipment/packing-list-actions.ts`: existing event packing lists, packing items, source sections, registry items, technique-derived equipment, guest-scale equipment, and chef-only server actions.
- `lib/equipment/actions.ts`, `lib/equipment/maintenance-actions.ts`, `lib/equipment/depreciation-actions.ts`, and `lib/equipment/constants.ts`: owned equipment, rentals, maintenance, and equipment categories.
- `lib/equipment/technique-equipment-map.ts`: current menu/recipe text-to-equipment derivation map.
- `lib/venues/recon-types.ts` and `lib/venues/recon-actions.ts`: venue profiles and capability fields for ovens, burners, refrigeration, water, access, parking, power, quirks, and photos.
- `lib/stations/event-station-actions.ts` and `lib/stations/actions.ts`: event station dish assignments and chef-owned station definitions.
- `lib/events/day-of-checklist-actions.ts`: event day-of checklist storage and collaborator-aware checklist reads/toggles.
- `lib/events/equipment-checklist-actions.ts`: equipment redundancy checklist stored inside event safety checklist JSON.
- `lib/events/venue-details-actions.ts`, `lib/events/location-truth.ts`, and `lib/events/shared-event-query.ts`: event location, venue, and tenant-scoped event access patterns.
- `lib/workflow/stage-definitions.ts`, `lib/workflow/types.ts`, and `lib/workflows/definitions/event-prep-countdown.ts`: existing equipment planning, packing, and event prep countdown work stages.
- `lib/weather/weather-checklist-actions.ts`, `lib/weather/weather-checklist.ts`, and `lib/weather/weather-alert-enrichment.ts`: weather-derived equipment, safety, logistics, and cold-chain checklist signals.
- `lib/menus/intelligence/assembly.ts`, `cross-reference.ts`, and `scaling-init.ts`: menu/event/recipe intelligence inputs already scoped by `tenant_id`.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: route/action auth and role-boundary patterns for future implementation.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Loadout Brain must treat existing storage as source inputs:

- `event_packing_lists` and `event_packing_items`: event-specific packing plan and pack item state.
- `chef_equipment_registry`: portable chef equipment registry already used for generated packing lists.
- `equipment_items` and `equipment_rentals`: owned equipment, maintenance, value, rental costs, and event-linked rental records.
- `venue_profiles`: venue capability source for kitchen equipment, burners, ovens, refrigeration, counter space, water, parking, load-in/access, power, and quirks.
- `event_station_dishes` and `stations`: station assignments and station names.
- `event_day_of_checklist`: service-day checklist items and completion state.
- `event_safety_checklists`: existing equipment redundancy checklist lane.
- `events`, `menus`, `dishes`, `menu_items`, and `recipes`: event, menu, dish, service style, guest count, and recipe equipment sources.
- `weather_snapshots` and weather checklist helpers: weather-derived equipment and cold-chain risk inputs.
- `event_collaborators`: staff/collaborator access boundary for task-level exposure.

Later slices may add dedicated tables only if the existing systems cannot represent required pack transitions, station-level loadout state, or staff-safe task exports. Any new table must be additive, tenant-owned, RLS-protected, indexed by tenant/event/state, and must not replace the existing packing list, equipment registry, venue profile, station plan, or checklist systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/physical-event-loadout-brain-contract.ts`.

It defines:

- `LoadoutEquipmentItemContract`: equipment identity, ownership source, quantity, portability, maintenance check need, visibility, and source refs.
- `VenueCapabilityContract`: burners, ovens, refrigeration, freezer, counter space, sink, parking, load-in, power, elevator, service path, storage, water, and waste capability state.
- `LoadoutRequirementContract`: menu/dish/station/event-derived item requirement with required and fulfilled quantities, ownership plan, pack state, fulfillment state, confidence, risk labels, and source refs.
- `StationPlanContract`: event station plan with station kind, capability needs, dish assignments, and visibility.
- `StaffSafeLoadoutTaskContract` and `StaffSafeLoadoutTaskExport`: least-privilege task export that strips private notes and excludes private tasks.
- `ServiceDayChecklistItemContract`: mode-aware checklist item for planning, packing, vehicle load, on-site setup, service, cleanup, and return-home checks.
- `LoadoutPlanContract`: aggregate chef-internal event loadout plan.

States and helper functions:

- `PackState`: `needed`, `packed`, `staged`, `loaded`, `used`, `returned`, `damaged`, `missing`.
- `VenueCapabilityState`: `available`, `limited`, `unavailable`, `unknown`, `not_applicable`.
- `LoadoutFulfillmentState`: `fulfilled`, `needs_rental`, `needs_borrow`, `needs_purchase`, `venue_confirm_pending`, `missing`.
- `LoadoutReadinessState`: `ready`, `in_progress`, `at_risk`, `blocked`, `unknown`.
- `deriveMostRestrictiveLoadoutReadinessState()`: combines readiness states.
- `hasVenueCapabilityRisk()`: treats needed unknown, limited, or unavailable venue capabilities as first-class risks.
- `deriveLoadoutPlanReadiness()`: derives aggregate readiness from requirements, pack states, fulfillment state, and venue capability risk.
- `buildStaffSafeLoadoutTaskExport()`: filters to staff-safe tasks and redacts private notes.

## Ownership Boundaries

- Owning domain for the deterministic contract: `lib/intelligence`.
- Existing packing ownership stays in `lib/equipment/packing-list-*`.
- Existing equipment ownership stays in `lib/equipment/*`.
- Existing venue ownership stays in `lib/venues/*` and event venue/location modules.
- Existing station ownership stays in `lib/stations/*`.
- Existing checklist ownership stays in `lib/events/day-of-checklist-actions.ts`, `lib/events/equipment-checklist-actions.ts`, and relevant event checklist modules.
- Existing workflow ownership stays in `lib/workflow/*` and `lib/workflows/*`.
- Existing weather-derived checklist ownership stays in `lib/weather/*`.
- Staff/collaborator access remains task-scoped and event-scoped. Staff exports must not become a second event portal, client memory surface, or full packing-plan API.

The Loadout Brain is a synthesis layer. It may read from existing systems and later persist only missing event execution state, but it must not become a second inventory system, second venue profile system, second station planner, second day-of checklist, or second workflow engine.

## Visibility Rules

- Default visibility is `chef_internal`.
- Private facts include client household memory, private access notes, building security details, allergies tied to named guests, staff issues, vendor reliability concerns, private event notes, and any exact residential access details not needed by staff.
- Chef-authenticated surfaces may display full loadout context.
- Staff/vendor surfaces may receive only `staff_safe_task` exports: task label, mode, station, safe instructions, due time, and non-sensitive source refs.
- Client surfaces may receive only explicit `client_safe_summary` copy such as "we are confirming venue equipment" or "we are bringing backup refrigeration," never full inventory, staff, private notes, or household memory.
- Public anonymous surfaces have no loadout access.
- Remy chef mode may summarize private loadout risks. Remy client/public/staff mode must use staff-safe or client-safe DTOs only.

## Role Boundaries

- Chef: can read and manage loadout requirements, venue capability risks, pack states, station plans, checklist modes, private notes, and staff-safe exports.
- Client: no access to raw loadout plan, private event notes, inventory, station assignments, staff notes, or household memory. May receive explicit client-safe status copy.
- Public anonymous user: no access to loadout data.
- Staff/vendor/collaborator: no default full loadout access. May receive only event-assigned, least-privilege staff-safe tasks after ownership checks.
- Admin/partner: no routine tenant loadout access. Admin diagnostics must be admin-gated and avoid raw tenant operational details by default.
- Developer/build agents: can edit the contract and later implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API, server action, migration, or DB query.

All future chef-side Loadout Brain server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when a justified multi-role action exists.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant owner check.
- Verify linked `event_id`, `menu_id`, `dish_id`, `recipe_id`, `venue_profile_id`, `packing_list_id`, `equipment_item_id`, `rental_id`, `station_id`, `client_id`, and collaborator IDs belong to the same tenant before using them in loadout derivation or mutation.
- Revalidate only affected chef routes such as `/events/[id]`, `/ops/equipment`, `/ops/stations`, `/venues`, dashboard/event prep widgets, and future loadout routes.

All future staff/vendor APIs must:

- Authenticate with an explicit staff/collaborator/token boundary before reading anything.
- Resolve the assigned event first, then verify that the staff member or vendor is assigned to that event.
- Return only `StaffSafeLoadoutTaskExport` or equivalent safe DTOs.
- Avoid exposing tenant ids, client household memory, private notes, residential access details beyond task need, full menu strategy, guest-level dietary records, equipment value, vendor reliability notes, or internal risk labels.

All future client/public APIs must:

- Avoid raw loadout reads.
- Return only explicit client-safe status copy.
- Never expose staff tasks, pack states, venue vulnerabilities, or internal inventory gaps.

## Integration Points

- Event detail: future loadout panel should compose event facts, menu linkage, venue capability, weather, packing list, stations, and checklist state through the contract.
- Packing list: reuse `event_packing_lists`, `event_packing_items`, `chef_equipment_registry`, `TECHNIQUE_EQUIPMENT_MAP`, guest-scale equipment, and universal equipment rules before adding new data.
- Equipment inventory: reuse owned equipment, maintenance state, and rentals for fulfillment decisions and rental pickup/return reminders.
- Venue recon: reuse `venue_profiles` for capability state and treat unknown fields as risks rather than as available.
- Station plan: reuse `event_station_dishes` and `stations` for prep/hot/cold/plating/beverage/dishwashing/storage/waste station plans.
- Day-of checklist: map loadout states into planning, packing, vehicle load, on-site setup, service, cleanup, and return-home modes.
- Weather: feed rain, wind, heat, cold, snow, and outdoor exposure into equipment and station risk decisions.
- Workflow: connect equipment planning and packing stages to readiness state instead of adding a separate task engine.
- Staff export: derive least-privilege task lists from checklist and station tasks while stripping private notes and client memory.
- Remy: chef mode can explain missing equipment, unknown venue data, and backup options; staff/client modes must use safe DTOs only.
- Capacity Twin and Strategy Map: later loadout work may feed capacity/workload and strategy fit signals, but it must not leak private loadout details across boundaries.

## Unknown-State Rules

Unknowns are first-class:

- Missing venue power, water, refrigeration, burners, oven, counter space, parking, load-in, elevator, service path, or storage is `unknown`, not available.
- Missing guest count makes scale-dependent equipment `unknown` or `at_risk`.
- Missing menu or recipes means menu-derived equipment is `unknown`.
- Missing station plan means station capability needs are `unknown`.
- Missing weather for outdoor events means outdoor equipment and cold-chain risk are `unknown`.
- Missing equipment ownership means fulfillment is `needs_rental`, `needs_borrow`, `needs_purchase`, or `missing`, never silently fulfilled.
- Missing return-home confirmation keeps the plan unfinished after service.

Later UI should show unknowns as actionable missing inputs and risk cards, not as fake precision.

## Pack State Rules

Pack state is event-specific and must not mutate the chef's inventory ownership by itself:

- `needed`: item is required but not yet packed.
- `packed`: item is confirmed in a pack container or checklist.
- `staged`: item is staged for vehicle or on-site load-in.
- `loaded`: item is loaded into vehicle or venue.
- `used`: item was used during service.
- `returned`: item returned home or to rental/vendor owner.
- `damaged`: item needs maintenance, replacement, reimbursement, or incident tracking.
- `missing`: item is not available or not returned and blocks future confidence until resolved.

Damaged and missing states may create equipment maintenance, rental, incident, or follow-up work, but later slices must route that work through existing equipment, event, incident, or checklist owners where possible.

## Likely Files For Later Slices

- Contract and deterministic model: `lib/intelligence/physical-event-loadout-brain-contract.ts`, future `lib/intelligence/physical-event-loadout-brain.ts`.
- Existing packing inputs: `lib/equipment/packing-list-actions.ts`, `lib/equipment/packing-list-types.ts`, `lib/equipment/technique-equipment-map.ts`.
- Equipment inputs: `lib/equipment/actions.ts`, maintenance/depreciation/rental helpers, and equipment constants.
- Venue inputs: `lib/venues/recon-actions.ts`, `lib/venues/recon-types.ts`, event venue/location modules.
- Station inputs: `lib/stations/event-station-actions.ts`, `lib/stations/actions.ts`, station UI components.
- Checklist inputs: `lib/events/day-of-checklist-actions.ts`, `lib/events/equipment-checklist-actions.ts`, safety/pre-event/service-day checklist modules.
- Event/menu inputs: `lib/events/*`, `lib/menus/intelligence/*`, recipes/dishes/menu item modules.
- Weather inputs: `lib/weather/weather-checklist-actions.ts`, `lib/weather/weather-checklist.ts`, `lib/weather/weather-alert-enrichment.ts`.
- Workflow inputs: `lib/workflow/stage-definitions.ts`, `lib/workflows/definitions/event-prep-countdown.ts`.
- Future chef surfaces: event detail loadout tab/panel, dashboard prep cards, mobile packing mode, station map/list, venues and equipment cross-links.
- Future staff-safe surfaces: assigned event task export route/action and staff checklist component.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 3 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing packing list, equipment registry, equipment inventory, venue profile, station plan, event checklist, workflow, or weather modules already satisfy the requested data need.
- If adding private persistence, add `tenant_id` or `chef_id`, RLS, indexes by tenant/event/state, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm route additions are registered in `lib/auth/route-policy.ts`.
- Confirm every route param ID is combined with tenant ownership before data is read or mutated.
- Confirm staff/vendor outputs use only `StaffSafeLoadoutTaskExport` or equivalent safe DTOs and never raw private notes or client household memory.
- Add tests for loadout readiness, venue unknowns, pack-state transitions, tenant isolation, staff-safe export redaction, and client/public non-access when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/physical-event-loadout-brain-contract.ts`.
- States: pack states, venue capability states, fulfillment states, checklist modes, station kinds, ownership types, visibility levels, and readiness states are explicit.
- Ownership: this document assigns Loadout Brain to `lib/intelligence` as a synthesis contract while preserving equipment, packing, venue, stations, checklist, workflow, weather, event, and menu ownership.
- Visibility: chef-internal/default, private-only, staff-safe task, client-safe summary, and public non-access boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-vendor-collaborator/admin-partner/developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.

## Parent Program Acceptance Mapping

- Program source spec is preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the Program 3 source of truth.
- Product domain is explicit: Event Execution / Loadout / Stations, home Private Chef Operating Loop, category Kitchen / Stations / Packing.
- Program outcomes are mapped: equipment requirements, venue capabilities, pack states, station plans, staff-safe task exports, and service-day checklists each have source modules, contracts, and future slice ownership.
- Data ownership is explicit: existing event, menu, equipment, packing, venue, station, checklist, workflow, weather, and collaborator modules remain authoritative; Loadout Brain is a synthesis/read-model layer.
- User roles are explicit: chef full access, staff/vendor assignment-scoped DTOs only, client/public no raw access, admin/partner no routine tenant access, Remy mode-specific safe summaries.
- Security/privacy boundaries are explicit: all future server actions must start with `requireChef()` or justified `requireAuth()`, all tenant-data queries must scope by `user.entityId` or `user.tenantId!`, and route params must never be the sole data filter.
- Integration points are carried into fired slices through the linked build family and multi-wave plan.
- Proof expectations are explicit: focused tests, runtime proof when behavior changes, mobile proof for UI, wiring/security proof, proof pack, and finish-check before done.
