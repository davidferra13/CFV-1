# Consolidated Build: Ticketing Drops

**Priority rank:** 12 of 18
**Personas affected:** 2 (Kai Donovan, Maya Rios)
**Average severity:** HIGH

## The Pattern

2 persona(s) surfaced 2 related gaps in ticketing drops. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **Drop Engine for High-Demand Releases** - from Kai Donovan - HIGH
   ChefFlow has no mechanism for handling sell-out flow during high-demand events. When Kai releases an event, the system would require manual intervention to manage 200+ people, causing first-come chaos...
2. **Sales Channel Tracking** - from Maya Rios - HIGH
   \*\* ChefFlow only tracks event sales (dinners), not product sales through pop-ups, drops, or direct channels. Maya's multi-channel sales require movement tracking across channels, but ChefFlow has no p...

## Recommended Build Scope

A single consolidated build addressing all ticketing drops gaps should cover:

- Drop Engine for High-Demand Releases
- Sales Channel Tracking

## Existing Build Tasks

- `system/persona-build-plans/kai-donovan/task-1.md`
- `system/persona-build-plans/kai-donovan/task-2.md`
- `system/persona-build-plans/kai-donovan/task-3.md`
- `system/persona-build-plans/kai-donovan/task-4.md`
- `system/persona-build-plans/kai-donovan/task-5.md`
- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`
- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-2.md`

## Acceptance Criteria (merged from all personas)

1. Kai Donovan: Drop Engine for High-Demand Releases is addressed
2. Maya Rios: Sales Channel Tracking is addressed
