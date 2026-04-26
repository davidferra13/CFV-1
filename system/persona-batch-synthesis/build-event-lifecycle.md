# Consolidated Build: Event Lifecycle

**Priority rank:** 12 of 21
**Personas affected:** 2 (Kai Donovan, Maya Rios)
**Average severity:** HIGH

## The Pattern

2 persona(s) surfaced 2 related gaps in event lifecycle. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **Ephemeral Event Lifecycle Management** - from Kai Donovan - HIGH
   ChefFlow lacks a dedicated workflow for one-night events from concept to archive. Kai's model requires rapid setup (24h max) and immediate post-event analysis, but ChefFlow's event system is designed ...
   > Search hints: ephemeral.event, event.lifecycle, lifecycle.management, ephemeral, event, lifecycle, management
2. **Sales Channel Tracking** - from Maya Rios - HIGH
   \*\* ChefFlow only tracks event sales (dinners), not product sales through pop-ups, drops, or direct channels. Maya's multi-channel sales require movement tracking across channels, but ChefFlow has no...
   > Search hints: sales.channel, channel.tracking, sales, channel, tracking

## Recommended Build Scope

A single consolidated build addressing all event lifecycle gaps should cover:

- Ephemeral Event Lifecycle Management
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

1. Kai Donovan: Ephemeral Event Lifecycle Management is addressed
2. Maya Rios: Sales Channel Tracking is addressed
