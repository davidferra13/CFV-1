# Spec: Surface Grammar Governance

> **Status:** ready
> **Priority:** P0
> **Depends on:** `docs/specs/universal-interface-philosophy.md`

## Purpose

This spec defines the mode taxonomy that sits between the universal interface philosophy and any page-level UI work. Every surface must declare its mode before layout, component, or polish decisions are made.

Without this layer, different jobs collapse into the same shell, heading, card, and panel treatment even when the product claims context-first focus.

## Required Mode Declaration

Every user-facing surface must map to one of these modes:

- `triage`
- `planning`
- `editing`
- `reviewing`
- `monitoring`
- `configuring`
- `browsing`

If a builder cannot name the mode, the surface is not ready to build.

## Mode Rules

### `triage`

- Purpose: decide what needs attention now
- Shell budget: only urgent status, current work, and one clear next action
- Allowed primitives: prioritized lists, queues, alerts, small decision cards
- Forbidden defaults: surveys, promotional banners, dense settings directories, multi-section dashboards with equal visual weight

### `planning`

- Purpose: sequence future work and choose a path
- Shell budget: current plan, stage progress, dependencies, and one planning action
- Allowed primitives: timelines, step maps, schedule boards, split workspaces
- Forbidden defaults: stacked generic widgets, ambient prompts unrelated to the plan

### `editing`

- Purpose: change one thing with concentration
- Shell budget: object context, field groups, save state, and recovery affordances
- Allowed primitives: focused forms, editors, side-by-side previews when needed
- Forbidden defaults: marketing banners, discovery modules, unrelated analytics

### `reviewing`

- Purpose: compare, judge, approve, or reject
- Shell budget: evidence, comparison context, decision outcome
- Allowed primitives: comparison tables, diff views, approval panels, history with context
- Forbidden defaults: dashboard-style metric mosaics that compete with the decision

### `monitoring`

- Purpose: watch live status and trends
- Shell budget: active signals, thresholds, recent change, drill-down path
- Allowed primitives: status boards, alert streams, time-series summaries
- Forbidden defaults: setup debt, empty promo space, unrelated creation affordances

### `configuring`

- Purpose: change system behavior safely
- Shell budget: current state, effect of the change, save or revert path
- Allowed primitives: targeted settings groups, guided setup blocks, scoped advanced sections
- Forbidden defaults: giant category directories presented as the primary experience

### `browsing`

- Purpose: explore supply, content, or options
- Shell budget: orientation, filters, results, trust cues, clear fallback
- Allowed primitives: editorial hero, search, filter rails, result lists, comparison aids
- Forbidden defaults: operator shell chrome, internal status utilities, control-surface framing

## Shell Budget Rules

- Persistent shell elements must be justified by the current mode.
- Command palette and direct routes are the universal access layer.
- Secondary discovery does not justify persistent shell clutter.
- Non-essential shell elements must be suppressible at the layout level.
- Ambient prompts such as surveys or feedback nudges default off outside `triage`.

## Primitive Governance

- Shared primitives are allowed only when they preserve the mode grammar.
- A generic card shell cannot be the default answer for every mode.
- If a primitive makes triage, planning, configuring, and review look interchangeable, it fails this spec.

## Enforcement

Every UI spec and implementation must answer these questions:

1. What mode is this surface?
2. What shell elements are persistent here, and why?
3. Which primitive family is allowed for this mode?
4. What has been explicitly suppressed because it is irrelevant here?

If those answers are missing, the work is not ready for release.
