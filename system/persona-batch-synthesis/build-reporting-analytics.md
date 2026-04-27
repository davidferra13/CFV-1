# Consolidated Build: Reporting Analytics

**Priority rank:** 4 of 20
**Personas affected:** 3 (Maya Rios, Rina Solis, Emma Chamberlain)
**Average severity:** HIGH

## The Pattern

3 persona(s) surfaced 4 related gaps in reporting analytics. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **Sales Channel Tracking** - from Maya Rios - HIGH
   \*\* ChefFlow only tracks event sales (dinners), not product sales through pop-ups, drops, or direct channels. Maya's multi-channel sales require movement tracking across channels, but ChefFlow has no...
   > Search hints: sales.channel, channel.tracking, sales, channel, tracking
2. **No explicit outcome-based reaction log as first-class feedback** - from Rina Solis - HIGH
   Feedback surfaces are broad, but this persona requires structured outcomes such as tolerated, mild reaction, severe reaction, and clinician follow-up.
   > Search hints: outcome-based.reaction, reaction.log, log.feedback, outcome-based, reaction, feedback
3. **No dedicated safety command center view** - from Rina Solis - HIGH
   Dashboard has strong operational cards, but no focused safety board summarizing blocked items, unresolved risks, and per-client verification state.
   > Search hints: safety.command, command.center, center.view, safety, command, center
4. **Implement a "Single Source of Truth" Dashboard:** - from Emma Chamberlain - MEDIUM
   This gap may reduce confidence in pricing, planning, communication, or execution for the persona.
   > Search hints: implement.single, single.source, source.truth, truth.dashboard, implement, single, source, truth

## Recommended Build Scope

A single consolidated build addressing all reporting analytics gaps should cover:

- Sales Channel Tracking
- No explicit outcome-based reaction log as first-class feedback
- No dedicated safety command center view
- Implement a "Single Source of Truth" Dashboard:

## Existing Build Tasks

- `system/persona-build-plans/emma-chamberlain/task-1.md`
- `system/persona-build-plans/emma-chamberlain/task-2.md`
- `system/persona-build-plans/emma-chamberlain/task-3.md`
- `system/persona-build-plans/emma-chamberlain/task-4.md`

## Acceptance Criteria (merged from all personas)

1. Maya Rios: Sales Channel Tracking is addressed
2. Rina Solis: No explicit outcome-based reaction log as first-class feedback is addressed
3. Rina Solis: No dedicated safety command center view is addressed
4. Emma Chamberlain: Implement a "Single Source of Truth" Dashboard: is addressed
