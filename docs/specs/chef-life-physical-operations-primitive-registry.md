# Chef Life Physical Operations Primitive Registry

Date: 2026-05-21

Queue item: `BQ-20260520T183200Z-chef-life-physical-operations-primitive-registry`

Typed registry: `lib/operations/physical-operations-primitive-registry.ts`

## Goal

Prevent loadout, sustainability, household memory, staff delegation, vendor trust, and event execution from each inventing separate physical-world models. The registry gives those programs a shared vocabulary for equipment, venue capability, station, loadout, transport, storage, cleanup, waste, and staff task concepts.

## Registry Contract

The typed registry defines these canonical primitives:

| Primitive               | Kind             | Reuse guidance                                                                                                        |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `equipment_item`        | equipment        | Physical item identity and ownership. Event-specific demand and pack state belong on requirements or loadout custody. |
| `equipment_requirement` | equipment        | Event, menu, recipe, station, weather, venue, staff, or workflow-derived equipment demand.                            |
| `venue_capability`      | venue capability | Confirmed, limited, unavailable, unknown, or not-applicable physical capability of a service location.                |
| `work_station`          | station          | Physical or operational work area. Do not use stations as inventory stores or staff identities.                       |
| `station_assignment`    | station          | Connection between a dish, task, person, equipment requirement, and station for a service window.                     |
| `loadout_container`     | loadout          | Box, bin, bag, cooler, hot box, crate, vehicle zone, or folder that groups items through custody.                     |
| `transport_leg`         | transport        | Planned movement of items, food, staff, or documents between physical locations.                                      |
| `transport_condition`   | transport        | Temperature, access, route, timing, vehicle, weather, fragility, or cold-chain constraint.                            |
| `storage_zone`          | storage          | Refrigerator, freezer, dry area, shelf, client storage, venue hold, cooler, hot hold, or staging zone.                |
| `cleanup_step`          | cleanup          | Service-close, dish, packing, sanitation, leftover, venue reset, trash, rental-return, or return-home action.         |
| `waste_stream`          | waste            | Food waste, trim, packaging, compost, donation, discard, reusable packaging return, or blocked leftover path.         |
| `staff_task`            | staff task       | Least-privilege assignment for staff, vendors, delegates, or collaborators.                                           |

Each primitive carries:

- `ownerModule`: the module that owns the noun.
- `canonicalStateFields`: one or more shared state groups.
- `allowedOwnershipKinds`: the permitted ownership/custody source language.
- `defaultVisibility`: the safe default data boundary.
- `sourceModules`: existing code families to reuse before adding new persistence.
- `reusableBy`: Chef Life program families expected to depend on it.
- `integrationPoints`: likely places the primitive should connect.
- `reuseGuidance`: implementation guidance for later builders.
- `doNotDuplicateAs`: aliases that should map back to the canonical primitive.

## Shared States

The registry defines shared state vocabularies:

- Ownership: `chef_owned`, `tenant_owned`, `client_owned`, `venue_provided`, `vendor_provided`, `rental`, `borrowed`, `staff_assigned`, `disposable`, `consumable`, `unknown`.
- Capability: `confirmed_available`, `limited`, `unavailable`, `unknown`, `not_applicable`.
- Custody: `needed`, `staged`, `packed`, `loaded`, `onsite`, `deployed`, `used`, `cleaned`, `returned`, `damaged`, `missing`.
- Task: `planned`, `assigned`, `in_progress`, `blocked`, `complete`, `skipped`, `archived`.
- Readiness: `ready`, `in_progress`, `at_risk`, `blocked`, `unknown`.
- Visibility: `private_only`, `chef_internal`, `staff_safe_task`, `vendor_safe_task`, `client_safe_summary`, `public_none`.

Unknown physical facts must stay unknown until verified. Missing venue power, storage, access, staff ownership, equipment ownership, route viability, or waste safety must not silently become available, complete, or client-safe.

## Ownership Boundaries

- Equipment ownership stays in `lib/equipment`.
- Packing and container ownership stays in `lib/packing` and existing equipment packing list types.
- Venue capability ownership stays in `lib/venues` and event location truth modules.
- Station ownership stays in `lib/stations`.
- Storage ownership composes `lib/inventory`, `lib/venues`, and household memory sources.
- Cleanup ownership composes service-day, event, staff, sustainability, and return-home flows.
- Waste ownership stays in `lib/sustainability`, `lib/waste`, inventory, and event waste flows.
- Staff task ownership stays in `lib/staff`, `lib/tasks`, and delegation modules.
- `lib/operations/physical-operations-primitive-registry.ts` owns only shared vocabulary, duplicate-prevention guidance, and deterministic helper functions.

## Security And Tenant Rules

This slice adds no route, API route, server action, migration, or DB query.

All future server actions using these primitives must:

- Start with `requireChef()` for chef-only physical operations, or `requireAuth()` only for a justified multi-role boundary.
- Derive ownership from `user.entityId` or `user.tenantId`, not from request body, route params, or client-provided tenant ids.
- Scope every tenant-data query with `tenant_id`, `chef_id`, or table-specific owner checks derived from `user.entityId` or `user.tenantId`.
- Combine every route param ID with tenant ownership before reading or mutating event, venue, equipment, station, staff, storage, transport, cleanup, or waste records.
- Return only `staff_safe_task`, `vendor_safe_task`, or `client_safe_summary` DTOs outside chef-internal surfaces.

## Acceptance Mapping

- Clear primitive registry: implemented in `lib/operations/physical-operations-primitive-registry.ts`.
- Equipment, venue capability, station, storage, transport, cleanup, and waste concepts: all are first-class primitive kinds.
- Loadout and staff task planning: represented by `loadout_container`, `equipment_requirement`, `station_assignment`, `transport_leg`, `cleanup_step`, and `staff_task`.
- Reuse guidance: each primitive includes owner module, source modules, integration points, duplicate aliases, and guidance.
- No duplicate model audit: the registry points future builders back to equipment, venue, station, inventory, sustainability, staff, event, packing, weather, vendor, and travel owners instead of creating new domain copies.
- Runtime impact: none. No app routes, APIs, server actions, DB queries, background jobs, or user-visible surfaces were changed.
