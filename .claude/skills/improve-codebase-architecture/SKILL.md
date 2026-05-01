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
2. Before editing, identify the module owner and the interface the change should attach to.
3. During implementation, watch for repeated logic, tangled state, fuzzy domain behavior, or hidden invariants leaking across files.
4. Deepen modules only when it improves locality, leverage, and testability for the current task.
5. Do not run broad architecture sweeps during unrelated builds.
6. Before closeout, record whether module deepening happened, was unnecessary, or should be deferred.

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
