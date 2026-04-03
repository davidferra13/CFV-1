# Current OpenClaw Builder Start Handoff

> **Date:** 2026-04-03
> **Status:** active runtime-owned builder-start context
> **Purpose:** give the next builder one canonical starting document when the developer explicitly assigns OpenClaw runtime work, so the runtime lane can be entered cleanly without guessing, mixing it with the default website lane, or choosing the wrong spec out of order

---

## Executive Summary

This document is the branch entrypoint for **explicitly assigned OpenClaw runtime work**.

It does **not** replace the general builder-start handoff.

The correct model is:

- the general builder-start handoff remains the default repo entrypoint
- the default concrete execution lane is still website-owned survey deploy verification
- this document becomes the queue-order authority only when the developer explicitly redirects the builder into the `runtime-owned` OpenClaw lane

The current runtime lane should be interpreted like this:

- OpenClaw is still internal infrastructure, not a public feature
- the current P0 mission is still grocery, ingredient, store, and price-data foundation
- the current runtime lane already has one partially built implementation thread (`openclaw-scraper-enrichment.md`)
- the next fresh runtime work should not jump straight into sidecar cartridges or broad public-facing expansion
- preserved-dirty-checkout mode is allowed for this explicitly assigned runtime lane too, but only under the same narrow rules as the website lane: capture `git status`, use the canonical pre-flight commands, do not clean/reset unrelated work, and keep edits tightly scoped

The most important practical distinction is:

- if the developer says "continue the OpenClaw build already underway," the builder should continue the active runtime implementation debt first
- if the developer says "pick the next OpenClaw spec," the builder should start with the current runtime guardrail and KPI-gate sequence before larger expansion slices

---

## Canonical Read Order

Read these in this exact order before this document becomes the queue-order authority for the runtime lane:

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`
4. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`
5. `docs/specs/openclaw-canonical-scope-and-sequence.md`
6. `docs/specs/openclaw-non-goals-and-never-do-rules.md`
7. `docs/specs/openclaw-goal-governor-and-kpi-contract.md`

Then branch by assigned work type:

### If continuing the active runtime implementation thread

8. `docs/specs/openclaw-scraper-enrichment.md`
9. `docs/specs/openclaw-total-capture.md`

### If choosing the next fresh OpenClaw spec from the queue

8. `docs/specs/openclaw-non-goals-and-never-do-rules.md`
9. `docs/specs/openclaw-goal-governor-and-kpi-contract.md`
10. `docs/specs/openclaw-total-capture.md`
11. `docs/specs/openclaw-capture-countdown-and-pixel-schedule.md`

Only after those should a builder consider:

- `docs/specs/openclaw-archive-digester.md`
- `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`

---

## Current Runtime Truth

### 1. This is not the default repo lane

The repo's default execution lane is still website-owned and survey-first.

OpenClaw runtime work is a **separate explicitly assigned lane**.

### 2. The runtime mission is still narrow on purpose

The current approved OpenClaw mission is still:

- grocery capture
- ingredient/store/price foundation
- cleanup and normalization
- sync truth
- coverage and freshness visibility

This is not yet:

- a public OpenClaw product
- a broad growth or outreach engine
- a license-agnostic external data republication platform
- a reason to reopen chef-facing workflow UX ownership

### 3. There is already one live runtime continuation thread

`docs/specs/openclaw-scraper-enrichment.md` is already `in-progress`, and its own status says substantial Pi-side work is complete while several remaining phases are still open.

That means a builder must not casually act as if the runtime queue is a fresh blank slate.

### 4. Governance still matters before major expansion

Two ready P0 runtime specs exist specifically to stop drift before larger slices:

- `openclaw-non-goals-and-never-do-rules.md`
- `openclaw-goal-governor-and-kpi-contract.md`

The runtime handoff and ideal-runtime planning stack both treat those as pre-implementation guardrails for meaningful runtime expansion.

### 5. Some OpenClaw work is separate from the core price-data lane

These are real OpenClaw specs, but they are not the correct first move for the current runtime lane:

- `openclaw-archive-digester.md`
- `openclaw-directory-images-cartridge.md`
- `openclaw-food-price-intelligence.md`

They are not false work. They are just not the first priority while the core grocery data foundation and runtime control rules still need closure.

---

## Runtime Queue Interpretation

Use this order when the developer explicitly assigns OpenClaw runtime work.

### Track A: Continuation of already-started runtime implementation

Start here when the ask is effectively "keep pushing the core OpenClaw build."

1. `openclaw-scraper-enrichment.md`
   Current interpretation: active continuation work, not a new claim. Remaining work already documented in-spec.
2. `openclaw-total-capture.md`
   Current interpretation: next major expansion slice for breadth-first national capture after the current runtime lane is stabilized enough to justify it.
3. `openclaw-capture-countdown-and-pixel-schedule.md`
   Current interpretation: tracking/progress surface that depends on total-capture truth rather than preceding it.

### Track B: Fresh claim order for runtime governance and sequencing

Start here when the developer says "pick the next OpenClaw spec" rather than "continue the active runtime build."

1. `openclaw-non-goals-and-never-do-rules.md`
   Why first: it locks the stop-sign boundaries before more expansion.
2. `openclaw-goal-governor-and-kpi-contract.md`
   Why second: it makes KPI truth and slice-gating explicit before a major runtime slice starts.
3. `openclaw-total-capture.md`
   Why third: it is the main ready P0 data-foundation expansion spec after guardrails are locked.
4. `openclaw-capture-countdown-and-pixel-schedule.md`
   Why fourth: it depends on total-capture and should follow real capture planning rather than pretending the runtime is already there.

### Track C: Later and non-blocking runtime work

Only pick these when the developer explicitly wants them, or once the core price-data lane is no longer the main bottleneck.

1. `openclaw-archive-digester.md`
2. `openclaw-directory-images-cartridge.md` continuation on the Pi side
3. `openclaw-ideal-runtime-and-national-intelligence.md`
4. `openclaw-food-price-intelligence.md`

---

## What Not To Pick First

Do **not** start with these unless the developer explicitly overrides the order:

- `openclaw-archive-digester.md`
  It is high-value, but its own spec says it is not blocking current work.
- `openclaw-directory-images-cartridge.md`
  ChefFlow-side work is already complete and the remaining work is Pi-side sidecar value, not core runtime truth.
- `openclaw-ideal-runtime-and-national-intelligence.md`
  It is a large future-state runtime plan and depends on earlier foundation specs.
- `openclaw-food-price-intelligence.md`
  It is still `draft`.

Do **not** let the runtime lane drift into:

- public website work
- chef-facing OpenClaw branding
- Raspberry Pi host/ops changes without classifying the work as `host-owned`
- mixed producer/consumer changes without splitting out the `bridge-owned` portion

---

## Pre-Flight Interpretation For This Lane

The canonical pre-flight commands for this repo are still:

- `npm run typecheck:app`
- `npm run build -- --no-lint`

Do not treat ad hoc raw `npx next build --no-lint` output as the queue-order authority when `docs/build-state.md` and the canonical launcher docs already define the build command differently.

For this runtime lane:

- capture `git status --short`
- preserve unrelated diffs
- use the canonical builder prompt in `docs/specs/README.md`
- do not clean/reset the worktree
- do not claim a spec until the lane classification and read order above are satisfied

If the current runtime task also touches:

- Pi process management, cron, systemd, SSH deploy, or capacity setup, classify the host portion as `host-owned`
- app routes, admin screens, or chef-safe representation of runtime output, classify the website/admin portion as `bridge-owned`

---

## Verification Surfaces For Runtime-Owned Work

Runtime-owned OpenClaw work does not always verify the same way as a website feature.

Primary verification surfaces for this lane are:

- Pi service boot and health
- Pi endpoint responses
- SQLite schema and runtime behavior
- founder-only runtime/admin reads when the slice exposes them
- sync behavior into ChefFlow when the slice is a bridge

Playwright is still required whenever a real app surface changes.

If a slice is genuinely Pi-runtime-only, the builder should say exactly why Playwright is not the primary verification surface instead of faking browser proof.

---

## No-Touch Boundaries

While executing the runtime lane, do not:

- restart the public website execution order from zero
- expose OpenClaw on chef/public surfaces
- rewrite ChefFlow workflow UX ownership
- delete or wipe the current Pi runtime without verified replacement
- treat OpenClaw runtime work as permission to rewrite Raspberry Pi host operations casually

The core rule still stands:

- additive before substitutive

---

## Completion Condition

This handoff is doing its job when the next builder can answer these questions without guessing:

1. When does this document apply instead of the default website handoff?
2. What exact read order governs explicit OpenClaw runtime work?
3. What is the difference between continuing the active runtime thread and claiming a fresh runtime spec?
4. Which OpenClaw specs are first, later, or explicitly not-first?
5. How should pre-flight and verification be interpreted for this lane?
6. Which boundaries must remain intact while the runtime expands?

If those answers are clear, the next OpenClaw builder can start cleanly and in order.
