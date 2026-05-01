---
name: improve-codebase-architecture
description: Use when building ChefFlow code, implementing features, refactoring, reviewing module organization, or checking that changes keep interfaces, seams, locality, and test surfaces organized. No ChefFlow build proceeds until the work has a module owner.
---

# Improve Codebase Architecture

This project wrapper makes the global Codex architecture skill part of ChefFlow routing.

## Source Skill

Load and follow the canonical skill at:

`C:/Users/david/.codex/skills/improve-codebase-architecture/SKILL.md`

## ChefFlow Build Use

1. Use this as a sidecar for any non-trivial build or implementation work.
2. Read `docs/architecture/v1-module-primer.md` when the task is a build, build triage, queue selection, or new feature.
3. Before editing, identify the module owner and the interface the change should attach to.
4. During implementation, watch for repeated logic, tangled state, fuzzy domain behavior, or hidden invariants leaking across files.
5. Deepen modules only when it improves locality, leverage, and testability for the current task.
6. Do not run broad architecture sweeps during unrelated builds.
7. Before closeout, record whether module deepening happened, was unnecessary, or should be deferred.

## Module Gate

Nothing gets built if it does not get moduled.

Before selecting, claiming, or implementing a ChefFlow build, classify the work into a concrete module owner. A module owner can be an existing domain module, route family, queue module, runtime module, or a newly planned module named in the spec. The owner must include:

1. Module name.
2. Canonical files or route family.
3. Interface the change attaches to or creates.
4. Invariants the module owns.
5. Test surface for the module.

If the source item is `unassigned`, cross-module, or too fuzzy to name a module owner, do not build it. Reclassify it as planning or module-review work, update the source queue or spec if that is in scope, and stop before code edits.

Allowed exception: emergency repair for production breakage, security, money, or data safety can start with a temporary incident module owner, but the repair must still name that owner and record the follow-up module deepening needed.

## Module Sources

Use these sources in order:

1. `system/unified-build-queue/candidates.json`
2. `system/unified-build-queue/module-batches.json`
3. `system/unified-build-queue/approved-batches.json`
4. `system/v1-builder/approved-queue.jsonl`
5. `docs/architecture/v1-module-primer.md`
6. Code truth in `app/`, `components/`, `lib/`, `database/`, `scripts/`, and `public/embed/chefflow-widget.js`

The generated queue taxonomy is build-backlog truth. It does not prove every code file has an owner yet. If code truth contradicts the queue module, treat that as a module-review finding before implementation.
