# Consolidated Build: Reporting Analytics

**Priority rank:** 8 of 18
**Personas affected:** 2 (Maya Rios, Rina Solis)
**Average severity:** HIGH

## The Pattern

2 persona(s) surfaced 3 related gaps in reporting analytics. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **Sales Channel Tracking** - from Maya Rios - HIGH
   \*\* ChefFlow only tracks event sales (dinners), not product sales through pop-ups, drops, or direct channels. Maya's multi-channel sales require movement tracking across channels, but ChefFlow has no p...
2. **No explicit outcome-based reaction log as first-class feedback** - from Rina Solis - HIGH
   Feedback surfaces are broad, but this persona requires structured outcomes such as tolerated, mild reaction, severe reaction, and clinician follow-up.
3. **No dedicated safety command center view** - from Rina Solis - HIGH
   Dashboard has strong operational cards, but no focused safety board summarizing blocked items, unresolved risks, and per-client verification state.

## Recommended Build Scope

A single consolidated build addressing all reporting analytics gaps should cover:

- Sales Channel Tracking
- No explicit outcome-based reaction log as first-class feedback
- No dedicated safety command center view

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`
- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-2.md`

## Acceptance Criteria (merged from all personas)

1. Maya Rios: Sales Channel Tracking is addressed
2. Rina Solis: No explicit outcome-based reaction log as first-class feedback is addressed
3. Rina Solis: No dedicated safety command center view is addressed
